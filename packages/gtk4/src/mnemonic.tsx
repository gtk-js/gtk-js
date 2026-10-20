import {
  type CSSProperties,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import { isCoveredByLayer } from "./escape-layers.ts";

/**
 * Mnemonics: a label with use-underline marks a character with an underscore
 * ("_Save"), and Alt with that key activates the label's widget. GTK underlines
 * the character only while the window's mnemonics are visible: from 300 ms
 * after Alt is pressed until it's released (update_mnemonics_visible()).
 */

/** A mnemonic label's text: plain runs and the characters marked with `_`. */
export type MnemonicSegment = string | { mnemonic: string };

/**
 * Parses a label with underscores, like pango_parse_markup() with `_` as the
 * accel marker: `_x` underlines x, the first one is the mnemonic key, and `__`
 * is a literal underscore. A trailing `_` stays, as strip_ulines() keeps it.
 */
export function parseMnemonic(text: string): { segments: MnemonicSegment[]; key: string | null } {
  const segments: MnemonicSegment[] = [];
  let key: string | null = null;
  let run = "";
  const chars = Array.from(text);
  for (let i = 0; i < chars.length; i++) {
    const next = chars[i + 1];
    if (chars[i] !== "_" || next === undefined) {
      run += chars[i];
      continue;
    }
    i++;
    if (next === "_") {
      run += "_";
      continue;
    }
    if (run) segments.push(run);
    run = "";
    segments.push({ mnemonic: next });
    // The mnemonic keyval is lowercase (gtk_label_set_text_with_mnemonic()).
    key ??= next.toLowerCase();
  }
  if (run) segments.push(run);
  return { segments, key };
}

/**
 * A mnemonic label's text as GTK shows it while mnemonics are hidden: the
 * marked characters without their underscores, like strip_ulines() in
 * gtklabel.c.
 */
export function stripMnemonic(text: string): string {
  return parseMnemonic(text)
    .segments.map((segment) => (typeof segment === "string" ? segment : segment.mnemonic))
    .join("");
}

// -- Visibility ----------------------------------------------------------------

/** MNEMONICS_DELAY in gtkwindow.c. */
const MNEMONICS_DELAY = 300;

let mnemonicsVisible = false;
let displayTimeout: ReturnType<typeof setTimeout> | undefined;
const visibilityListeners = new Set<() => void>();

// gtk_window_set_mnemonics_visible()
function setMnemonicsVisible(visible: boolean) {
  clearTimeout(displayTimeout);
  displayTimeout = undefined;
  if (visible === mnemonicsVisible) return;
  mnemonicsVisible = visible;
  for (const listener of visibilityListeners) listener();
}

/** Alt without other modifiers, as update_mnemonics_visible() checks. */
function isLoneAlt(e: KeyboardEvent) {
  return e.key === "Alt" && !e.ctrlKey && !e.shiftKey && !e.metaKey;
}

// _gtk_window_schedule_mnemonics_visible()
function handleVisibilityKeyDown(e: KeyboardEvent) {
  if (!isLoneAlt(e) || mnemonicsVisible || displayTimeout !== undefined) return;
  displayTimeout = setTimeout(() => setMnemonicsVisible(true), MNEMONICS_DELAY);
}

function handleVisibilityKeyUp(e: KeyboardEvent) {
  if (isLoneAlt(e)) setMnemonicsVisible(false);
}

// A window that loses the focus hides them (gtk_window_handle_focus()).
function hideMnemonics() {
  setMnemonicsVisible(false);
}

function subscribeToVisibility(listener: () => void) {
  if (visibilityListeners.size === 0) {
    window.addEventListener("keydown", handleVisibilityKeyDown, true);
    window.addEventListener("keyup", handleVisibilityKeyUp, true);
    window.addEventListener("blur", hideMnemonics);
  }
  visibilityListeners.add(listener);
  return () => {
    visibilityListeners.delete(listener);
    if (visibilityListeners.size > 0) return;
    window.removeEventListener("keydown", handleVisibilityKeyDown, true);
    window.removeEventListener("keyup", handleVisibilityKeyUp, true);
    window.removeEventListener("blur", hideMnemonics);
    hideMnemonics();
  };
}

const noSubscription = () => () => {};

/** Insensitive widgets neither draw nor take mnemonics. */
const INSENSITIVE = ":disabled, [data-disabled]";

// -- Activation ----------------------------------------------------------------

/** gtk_widget_activate() of the widgets that have an activate signal. */
const activateHandlers = new WeakMap<Element, () => void>();
/** Widgets that override GtkWidget's mnemonic_activate. */
const mnemonicActivateHandlers = new WeakMap<Element, (groupCycling: boolean) => void>();

function useElementHandler<T extends (...args: never[]) => void>(
  handlers: WeakMap<Element, T>,
  ref: RefObject<Element | null>,
  handler: T,
) {
  const latest = useRef(handler);
  latest.current = handler;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    handlers.set(element, ((...args) => latest.current(...args)) as T);
    return () => {
      handlers.delete(element);
    };
  }, [handlers, ref]);
}

/** Makes `activate` what activating the widget `ref` does, as its activate signal does. */
export function useWidgetActivate(ref: RefObject<Element | null>, activate: () => void): void {
  useElementHandler(activateHandlers, ref, activate);
}

/** Overrides what the widget `ref` does when a mnemonic activates it. */
export function useMnemonicActivate(
  ref: RefObject<Element | null>,
  mnemonicActivate: (groupCycling: boolean) => void,
): void {
  useElementHandler(mnemonicActivateHandlers, ref, mnemonicActivate);
}

/** gtk_widget_activate(): runs the widget's activate handler; false when it has none. */
export function activateWidget(element: Element | null): boolean {
  const activate = element && activateHandlers.get(element);
  activate?.();
  return !!activate;
}

function isFocusable(element: HTMLElement) {
  return element.tabIndex >= 0;
}

// gtk_widget_mnemonic_activate()
function mnemonicActivate(widget: HTMLElement, groupCycling: boolean) {
  const handler = mnemonicActivateHandlers.get(widget);
  if (handler) handler(groupCycling);
  // gtk_widget_real_mnemonic_activate(): the focus moves between widgets
  // sharing a mnemonic.
  else if (groupCycling || !activateWidget(widget)) widget.focus();
}

// gtk_label_mnemonic_activate(): a label without a mnemonic widget activates
// the first ancestor that can take the focus or be activated.
function labelMnemonicActivate(label: Element, groupCycling: boolean) {
  for (let widget = label.parentElement; widget; widget = widget.parentElement) {
    if (isFocusable(widget) || (!groupCycling && activateHandlers.has(widget))) {
      mnemonicActivate(widget, groupCycling);
      return;
    }
  }
}

interface Mnemonic {
  label: RefObject<HTMLElement | null>;
  key: string;
}

const mnemonics = new Set<Mnemonic>();
let lastActivated: Element | null = null;

/** Whether a label's mnemonic can fire: shown, sensitive, and not under a popover or dialog. */
function canActivate(label: HTMLElement) {
  return (
    label.getClientRects().length > 0 &&
    !label.closest(`${INSENSITIVE}, [inert]`) &&
    !isCoveredByLayer(label)
  );
}

function labelsFor(key: string | undefined): HTMLElement[] {
  const labels: HTMLElement[] = [];
  for (const mnemonic of mnemonics) {
    const label = mnemonic.label.current;
    if (mnemonic.key === key && label && canActivate(label)) labels.push(label);
  }
  return labels.sort((a, b) =>
    a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
  );
}

function handleMnemonicKeyDown(e: KeyboardEvent) {
  // Alt is the mnemonic modifier (GtkShortcutController:mnemonic-modifiers);
  // Shift only picks the character.
  if (e.defaultPrevented || !e.altKey || e.ctrlKey || e.metaKey) return;
  let labels = labelsFor(e.key.toLowerCase());
  // Alt changes the character on some layouts (macOS): fall back to the key's.
  if (labels.length === 0)
    labels = labelsFor(/^(?:Key|Digit)(.)$/.exec(e.code)?.[1]?.toLowerCase());
  const [first] = labels;
  if (!first) return;
  e.preventDefault();
  // Round-robin: the first label after the one activated last. Several labels
  // with the key only move the focus (gtk_shortcut_controller_run_controllers()).
  const last = lastActivated?.isConnected ? lastActivated : null;
  const label =
    (last &&
      labels.find((l) => last.compareDocumentPosition(l) & Node.DOCUMENT_POSITION_FOLLOWING)) ||
    first;
  lastActivated = label;
  labelMnemonicActivate(label, labels.length > 1);
}

/**
 * Registers the mnemonic `key` of the label text in `ref` while mounted.
 * Returns whether to draw it underlined.
 */
function useMnemonic(key: string | null, ref: RefObject<HTMLElement | null>): boolean {
  useLayoutEffect(() => {
    if (key == null) return;
    const mnemonic = { label: ref, key };
    if (mnemonics.size === 0) document.addEventListener("keydown", handleMnemonicKeyDown);
    mnemonics.add(mnemonic);
    return () => {
      mnemonics.delete(mnemonic);
      if (mnemonics.size === 0) document.removeEventListener("keydown", handleMnemonicKeyDown);
    };
  }, [key, ref]);

  // gtk_label_set_markup_internal() underlines while the mnemonics are visible
  // and the label is sensitive.
  return useSyncExternalStore(
    key == null ? noSubscription : subscribeToVisibility,
    () => mnemonicsVisible && !ref.current?.closest(INSENSITIVE),
    () => false,
  );
}

/** PANGO_UNDERLINE_LOW, which GTK draws at the font's underline position, through descenders. */
export const MNEMONIC_UNDERLINE: CSSProperties = {
  textDecorationLine: "underline",
  textDecorationSkipInk: "none",
};

/** The text of a label with use-underline, its mnemonic drawn and active. */
export function MnemonicText({ text }: { text: string }): ReactNode {
  const { segments, key } = useMemo(() => parseMnemonic(text), [text]);
  const ref = useRef<HTMLSpanElement>(null);
  const underline = useMnemonic(key, ref);
  if (key == null) return segments.join("");
  return (
    <span ref={ref}>
      {segments.map((segment, i) =>
        typeof segment === "string" ? (
          segment
        ) : (
          <span key={i} style={underline ? MNEMONIC_UNDERLINE : undefined}>
            {segment.mnemonic}
          </span>
        ),
      )}
    </span>
  );
}
