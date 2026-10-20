import React, {
  createContext,
  forwardRef,
  type InputHTMLAttributes,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useIcon } from "../icon-context.tsx";
import { tooltipAttrs } from "../tooltip.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkSearchEntryProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    GtkAlignProps {
  /** Current text (GtkEditable:text). Leave unset for an uncontrolled entry. */
  text?: string;
  /** Placeholder text. */
  placeholderText?: string;
  /** Debounce delay in ms before firing onSearchChanged. Default: 150. */
  searchDelay?: number;
  /**
   * Element whose key presses start a search (GtkSearchEntry:key-capture-widget):
   * printable keys typed while the focus is elsewhere in it go to the entry.
   */
  keyCaptureRef?: RefObject<HTMLElement | null>;
  /** Callback when the text changes, including when the clear icon empties it. */
  onChanged?: (text: string) => void;
  /** Fired after searchDelay ms of no typing, or at once when the text is emptied. */
  onSearchChanged?: (text: string) => void;
  /** Fired when a key captured from keyCaptureRef starts typing into the empty entry. */
  onSearchStarted?: () => void;
  /** Fired on Enter key. */
  onActivate?: () => void;
  /** Fired on Escape key. */
  onStopSearch?: () => void;
  /** Fired on Ctrl+G (⌘G on macOS). */
  onNextMatch?: () => void;
  /** Fired on Ctrl+Shift+G (⇧⌘G on macOS). */
  onPreviousMatch?: () => void;
}

/** What a GtkSearchBar uses of its entry (gtk_search_bar_connect_entry()). */
export interface SearchEntryConnection {
  focus(): void;
  clear(): void;
  /** Takes a key press from the key capture widget, calling reveal() first; false if it doesn't. */
  capture(e: KeyboardEvent, reveal?: () => void): boolean;
}

/** The GtkSearchBar around an entry, which connects to it and listens to its stop-search. */
export const SearchBarContext = createContext<{
  stopSearch(): void;
  connect(entry: SearchEntryConnection): () => void;
} | null>(null);

const isApple = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

/**
 * Whether a key press can be typed into the entry: no keynav, Space or Enter
 * key, no Ctrl/Alt combination (gtk_search_entry_is_keynav(),
 * capture_widget_key_handled()), and no editable that already took it.
 */
function isSearchKey(e: KeyboardEvent): boolean {
  if (e.defaultPrevented || e.isComposing || e.ctrlKey || e.altKey || e.metaKey) return false;
  // Only keys that type a character.
  if ([...e.key].length !== 1 || e.key === " ") return false;
  const target = e.target instanceof Element ? e.target : null;
  return !target?.closest(
    "input, textarea, select, [contenteditable]:not([contenteditable=false])",
  );
}

/** Sets the text as typing does, so the input's change handlers run (gtk_editable_set_text()). */
function setInputText(input: HTMLInputElement, text: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, text);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * GtkSearchEntry — A text entry with search functionality.
 *
 * CSS node: entry.search
 *   ├── image (search icon, left)
 *   ├── text
 *   └── image (clear icon, right, drawn when non-empty)
 *
 * @see https://docs.gtk.org/gtk4/class.SearchEntry.html
 */
export const GtkSearchEntry = forwardRef<HTMLInputElement, GtkSearchEntryProps>(
  function GtkSearchEntry(
    {
      text,
      value,
      defaultValue,
      placeholderText,
      searchDelay = 150,
      keyCaptureRef,
      disabled = false,
      onChanged,
      onSearchChanged,
      onSearchStarted,
      onActivate,
      onStopSearch,
      onNextMatch,
      onPreviousMatch,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onChange,
      onKeyDown,
      onKeyUp,
      ...rest
    },
    ref,
  ) {
    const SearchIcon = useIcon("SystemSearch");
    const ClearIcon = useIcon("EditClear");
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);
    const bar = useContext(SearchBarContext);

    const controlledText = text ?? value;
    const isControlled = controlledText !== undefined;
    const [internalText, setInternalText] = useState(() => String(defaultValue ?? ""));
    const currentText = isControlled ? String(controlledText) : internalText;

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    // A captured key press is being typed into the empty entry.
    const startingSearch = useRef(false);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    // gtk_search_entry_changed(): emptying the entry emits search-changed at
    // once, other changes after the search delay.
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newText = e.target.value;
        if (!isControlled) setInternalText(newText);
        onChanged?.(newText);
        onChange?.(e);
        if (startingSearch.current && newText !== "") {
          startingSearch.current = false;
          onSearchStarted?.();
        }

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = undefined;
        if (newText === "") {
          onSearchChanged?.("");
        } else {
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = undefined;
            onSearchChanged?.(newText);
          }, searchDelay);
        }
      },
      [isControlled, onChanged, onChange, onSearchStarted, onSearchChanged, searchDelay],
    );

    const clear = useCallback(() => {
      if (inputRef.current) setInputText(inputRef.current, "");
    }, []);

    // capture_widget_key_handled(): focusing the text while the key is
    // pressed lets the browser type it there.
    const capture = useCallback(
      (e: KeyboardEvent, reveal?: () => void) => {
        const input = inputRef.current;
        if (!input || disabled || !isSearchKey(e)) return false;
        reveal?.();
        startingSearch.current = input.value === "";
        input.focus();
        return true;
      },
      [disabled],
    );

    useLayoutEffect(() => {
      return bar?.connect({ focus: () => inputRef.current?.focus(), clear, capture });
    }, [bar, clear, capture]);

    useEffect(() => {
      const widget = keyCaptureRef?.current;
      if (!widget) return;
      const onKey = (e: KeyboardEvent) => void capture(e);
      widget.addEventListener("keydown", onKey);
      return () => widget.removeEventListener("keydown", onKey);
    }, [keyCaptureRef, capture]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") onActivate?.();
        if (e.key === "Escape") {
          // Bound to stop-search, which consumes it: a dialog around the entry stays open.
          e.preventDefault();
          onStopSearch?.();
          bar?.stopSearch();
        }
        // The g bindings match whatever case Shift gives the key.
        if (e.key.toLowerCase() === "g" && (isApple ? e.metaKey : e.ctrlKey) && !e.altKey) {
          e.preventDefault();
          if (e.shiftKey) onPreviousMatch?.();
          else onNextMatch?.();
        }
        onKeyDown?.(e);
      },
      [onActivate, onStopSearch, bar, onNextMatch, onPreviousMatch, onKeyDown],
    );

    const handleKeyUp = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        startingSearch.current = false;
        onKeyUp?.(e);
      },
      [onKeyUp],
    );

    const classes = ["gtk-entry", "search"];
    if (className) classes.push(className);

    return (
      <div
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        data-disabled={disabled || undefined}
        // The icons claim presses without taking the focus (catchall_click_press()).
        onMouseDown={(e) => {
          if (e.target !== inputRef.current) e.preventDefault();
        }}
      >
        <span className="gtk-image left">{SearchIcon && <SearchIcon size={16} />}</span>
        <input
          ref={inputRef}
          className="gtk-text"
          type="search"
          value={currentText}
          placeholder={placeholderText}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          {...rest}
        />
        {/* Measured even while hidden, so the entry keeps its size
            (gtk_search_entry_measure(), gtk_widget_set_child_visible()). */}
        <span
          className="gtk-image right"
          {...tooltipAttrs("Clear Entry")}
          style={currentText === "" ? { visibility: "hidden" } : undefined}
          onClick={disabled ? undefined : clear}
        >
          {ClearIcon && <ClearIcon size={16} />}
        </span>
      </div>
    );
  },
);
