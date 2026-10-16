import { wrapStyle } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AdwResponseAppearance } from "../types.ts";
import { FloatingSheet } from "./floating-sheet.tsx";
import { HeaderBarTitleContext } from "./header-bar-title.ts";

/** BUTTON_SPACING in adw-alert-dialog.c. */
const BUTTON_SPACING = 12;
/** adw-alert-dialog.c sizes (sp, i.e. px at the default text scale). */
const RESPONSE_HORZ_PADDING = 48;
const DIALOG_MIN_WIDTH = 300;
const DIALOG_PREFERRED_WIDTH = 300;
const DIALOG_MAX_WIDTH = 372;
const DIALOG_MAX_WIDE_WIDTH = 600;

/** The heading and body labels: justify center, xalign 0.5. */
const CENTERED: React.CSSProperties = {
  textAlign: "center",
  justifyContent: "center",
  whiteSpace: "pre",
};
/** The small heading and body labels also wrap, word-char. */
const WRAPPING_CENTERED: React.CSSProperties = { ...CENTERED, ...wrapStyle("word-char") };
/** Response labels never wrap (gtk_button_new_with_mnemonic()): the buttons stack instead. */
const RESPONSE_LABEL: React.CSSProperties = { whiteSpace: "pre" };

export interface AdwAlertDialogResponse {
  id: string;
  label: string;
  appearance?: AdwResponseAppearance;
  enabled?: boolean;
}

export interface AdwAlertDialogProps extends HTMLAttributes<HTMLDivElement> {
  heading?: string;
  headingUseMarkup?: boolean;
  body?: string;
  bodyUseMarkup?: boolean;
  extraChild?: ReactNode;
  preferWideLayout?: boolean;
  responses?: AdwAlertDialogResponse[];
  defaultResponse?: string;
  closeResponse?: string;
  visible?: boolean;
  portal?: boolean | HTMLElement;
  onResponse?: (id: string) => void;
  /**
   * Called once the close animation finished and the dialog is gone. Unlike
   * GTK, React can't keep a widget alive on its own: unmount the dialog here,
   * not on response, so it can animate out.
   */
  onHidden?: () => void;
}

/**
 * AdwAlertDialog — A modal alert with heading, body, and response buttons.
 *
 * Upstream CSS node: dialog.alert (inherits from AdwDialog with css_name "dialog")
 * Upstream UI template sets: follows-content-size=true, presentation-mode=floating,
 *   CSS class "alert"
 *
 * Native child structure (inside the dialog's sheet):
 *   AdwGizmo (contents) > GtkWindowHandle > GtkBox(vertical)
 *     > GtkScrolledWindow.body-scrolled-window
 *       > GtkBox.message-area[.has-heading][.has-body](vertical)
 *         > AdwGizmo.heading-bin > GtkLabel.title-2 (heading), or the wrapping
 *           GtkLabel.title-4 when that doesn't fit on one line
 *         > GtkLabel.body (body text)
 *         > AdwBin.child (extra child)
 *     > AdwGizmo.response-area
 *       > button[.suggested-action|.destructive-action]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.AlertDialog.html
 */
export const AdwAlertDialog = forwardRef<HTMLDivElement, AdwAlertDialogProps>(
  function AdwAlertDialog(
    {
      heading,
      headingUseMarkup = false,
      body,
      bodyUseMarkup = false,
      extraChild,
      preferWideLayout = false,
      responses = [],
      defaultResponse,
      closeResponse = "close",
      visible = false,
      portal = false,
      onResponse,
      onHidden,
      className,
      ...rest
    },
    ref,
  ) {
    const handleClose = useCallback(() => onResponse?.(closeResponse), [onResponse, closeResponse]);

    // Upstream measure_contents() picks the width: at least DIALOG_MIN_WIDTH;
    // normally the heading's natural width, clamped between the widths the
    // responses need stacked and side by side (plus RESPONSE_HORZ_PADDING),
    // up to DIALOG_MAX_WIDTH (or the side-by-side width up to
    // DIALOG_MAX_WIDE_WIDTH with preferWideLayout). The body wraps instead of
    // widening the dialog. allocate_responses() then lays the buttons out:
    // sharing the row equally, or stacked ("compact", the first response at
    // the bottom) when side by side doesn't fit.
    const contentsRef = useRef<HTMLDivElement>(null);
    const responseAreaRef = useRef<HTMLDivElement>(null);
    const [compact, setCompact] = useState(false);
    const [width, setWidth] = useState<number | null>(null);
    const [smallHeading, setSmallHeading] = useState(false);
    useLayoutEffect(() => {
      const contents = contentsRef.current;
      const area = responseAreaRef.current;
      if (!contents || !area || !visible) return;
      // Layout sizes only (offset/scroll/computed), unaffected by the opening scale.
      // A label's natural width: its text on one line rounded up to a whole
      // pixel, like gtk_label_measure(), plus its own padding. offsetWidth
      // rounds to the nearest pixel instead, which can fit the responses side
      // by side by a pixel where GTK stacks them.
      const singleLineWidth = (el: Element | null, className?: string) => {
        if (!el?.parentElement) return 0;
        const probe = el.cloneNode(true) as HTMLElement;
        if (className) probe.className = className;
        probe.style.cssText +=
          ";position:absolute;visibility:hidden;white-space:pre;width:max-content";
        el.parentElement.appendChild(probe);
        const cs = getComputedStyle(probe);
        const w =
          Math.ceil(parseFloat(cs.width) - 0.001) +
          parseFloat(cs.paddingLeft) +
          parseFloat(cs.paddingRight);
        probe.remove();
        return w;
      };
      const horizontalPadding = (el: Element | null) => {
        if (!el) return 0;
        const cs = getComputedStyle(el);
        return parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
      };
      const measure = () => {
        const buttons = Array.from(area.children) as HTMLElement[];
        const buttonNat = Math.max(
          0,
          ...buttons.map((b) => {
            const label = b.firstElementChild as HTMLElement | null;
            const bs = getComputedStyle(b);
            const extra =
              parseFloat(bs.paddingLeft) +
              parseFloat(bs.paddingRight) +
              parseFloat(bs.borderLeftWidth) +
              parseFloat(bs.borderRightWidth);
            // The label on its own line: a button's bin layout stretches it.
            return Math.max(parseFloat(bs.minWidth) || 0, singleLineWidth(label) + extra);
          }),
        );
        const n = buttons.length;
        const wideNat = buttonNat * n + BUTTON_SPACING * Math.max(0, n - 1) + RESPONSE_HORZ_PADDING;
        const narrowNat = Math.max(buttonNat + RESPONSE_HORZ_PADDING, DIALOG_PREFERRED_WIDTH);
        // measure_heading(): the larger of the title-2 label on one line and
        // the wrapping title-4 one, whose natural width is also one line.
        const headingBin = contents.querySelector(".heading-bin") as HTMLElement | null;
        const headingEl = headingBin?.firstElementChild ?? null;
        const binPadding = horizontalPadding(headingBin);
        const largeNat = singleLineWidth(headingEl, "gtk-label title-2");
        const headingBinNat = headingBin
          ? Math.max(largeNat, singleLineWidth(headingEl, "gtk-label title-4")) + binPadding
          : 0;
        const headingNat = Math.min(Math.max(headingBinNat, narrowNat), wideNat);
        let maxSize = preferWideLayout
          ? Math.min(DIALOG_MAX_WIDE_WIDTH, wideNat)
          : wideNat > DIALOG_MIN_WIDTH
            ? Math.min(DIALOG_MAX_WIDTH, headingNat)
            : DIALOG_MAX_WIDTH;
        maxSize = Math.max(DIALOG_MIN_WIDTH, maxSize);
        // The contents' natural width: the message area's children (labels on
        // one line) with their padding, or the responses side by side.
        const messageArea = contents.querySelector(".message-area") as HTMLElement | null;
        const messagePadding = horizontalPadding(messageArea);
        const bodyEl = messageArea?.querySelector(":scope > .body") ?? null;
        const extraChild = messageArea?.querySelector(":scope > .child") as HTMLElement | null;
        const baseNat = Math.max(
          wideNat,
          headingBinNat + messagePadding,
          singleLineWidth(bodyEl) + messagePadding,
          extraChild ? extraChild.scrollWidth + horizontalPadding(extraChild) + messagePadding : 0,
        );
        const next = Math.min(Math.max(baseNat, DIALOG_MIN_WIDTH), maxSize);
        setWidth(next);
        const as = getComputedStyle(area);
        const available = next - parseFloat(as.paddingLeft) - parseFloat(as.paddingRight);
        setCompact(n > 1 && wideNat - RESPONSE_HORZ_PADDING > available + 0.5);
        // allocate_heading(): the title-4 label, wrapping, once the title-2
        // one doesn't fit on one line.
        if (headingBin) setSmallHeading(largeNat > headingBin.clientWidth - binPadding + 0.5);
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(contents);
      return () => ro.disconnect();
    }, [visible, responses, heading, body, preferWideLayout]);

    // Upstream: .message-area gets .has-heading / .has-body conditionally,
    // which the SCSS uses for border-spacing (10px when both, 24px otherwise).
    const messageAreaClasses = ["gtk-box", "gtk-box-layout", "vertical", "message-area"];
    if (heading) messageAreaClasses.push("has-heading");
    if (body) messageAreaClasses.push("has-body");

    return (
      <FloatingSheet
        ref={ref}
        open={visible}
        dialogClasses={["alert", "background", "floating"]}
        className={className}
        // Upstream DIALOG_MIN_WIDTH / DIALOG_MAX_WIDTH / DIALOG_MAX_WIDE_WIDTH.
        sheetStyle={{
          width: width ?? undefined,
          minWidth: `min(${DIALOG_MIN_WIDTH}px, 100%)`,
          maxWidth: `min(${preferWideLayout ? DIALOG_MAX_WIDE_WIDTH : DIALOG_MAX_WIDTH}px, 100%)`,
        }}
        // The UI template sets follows-content-size.
        followsContentSize
        onDimmingClick={handleClose}
        onEscape={handleClose}
        onCloseAnimationDone={onHidden}
        portal={portal}
        aria-label={heading}
        {...rest}
      >
        {/* An alert is a dialog: its header bars don't show the presenting page's title. */}
        <HeaderBarTitleContext.Provider value="">
          {/* AdwGizmo "contents" — no CSS class, just a layout container */}
          <div ref={contentsRef}>
            <div className="gtk-windowhandle">
              <div className="gtk-box gtk-box-layout vertical">
                <div
                  className="body-scrolled-window"
                  style={{ overflow: "auto", maxHeight: "70vh" }}
                >
                  <div className={messageAreaClasses.join(" ")}>
                    {heading && (
                      <div className="heading-bin gtk-bin-layout">
                        {smallHeading ? (
                          <span className="gtk-label title-4" style={WRAPPING_CENTERED}>
                            {heading}
                          </span>
                        ) : (
                          <span className="gtk-label title-2" style={CENTERED}>
                            {heading}
                          </span>
                        )}
                      </div>
                    )}
                    {body && (
                      <span className="gtk-label body" style={WRAPPING_CENTERED}>
                        {body}
                      </span>
                    )}
                    {extraChild && <div className="child">{extraChild}</div>}
                  </div>
                </div>
                <div
                  ref={responseAreaRef}
                  className={`response-area${compact ? " compact" : ""}`}
                  style={{
                    display: "flex",
                    flexDirection: compact ? "column-reverse" : "row",
                    gap: BUTTON_SPACING,
                  }}
                >
                  {responses.map((resp) => {
                    const btnClasses = ["gtk-button"];
                    if (resp.appearance === "suggested") btnClasses.push("suggested-action");
                    if (resp.appearance === "destructive") btnClasses.push("destructive-action");
                    if (resp.id === defaultResponse) btnClasses.push("default");
                    return (
                      <button
                        key={resp.id}
                        type="button"
                        className={btnClasses.join(" ")}
                        disabled={resp.enabled === false}
                        autoFocus={resp.id === defaultResponse}
                        style={{
                          flex: compact ? undefined : "1 1 0",
                          minWidth: compact ? undefined : 0,
                        }}
                        data-response={resp.id}
                        onClick={() => onResponse?.(resp.id)}
                      >
                        <span className="gtk-label" style={RESPONSE_LABEL}>
                          {resp.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </HeaderBarTitleContext.Provider>
      </FloatingSheet>
    );
  },
);
