import React, {
  forwardRef,
  type InputHTMLAttributes,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkSearchEntryProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "children" | "type">,
    GtkAlignProps {
  /** Placeholder text. */
  placeholderText?: string;
  /** Debounce delay in ms before firing onSearchChanged. Default: 150. */
  searchDelay?: number;
  /** Fired after searchDelay ms of no typing. */
  onSearchChanged?: (text: string) => void;
  /** Fired on Enter key. */
  onActivate?: () => void;
  /** Fired on Escape key. */
  onStopSearch?: () => void;
  /** Fired on Ctrl+G. */
  onNextMatch?: () => void;
  /** Fired on Ctrl+Shift+G. */
  onPreviousMatch?: () => void;
}

/**
 * GtkSearchEntry — A text entry with search functionality.
 *
 * CSS node: entry.search
 *   ├── image (search icon, left)
 *   ├── text
 *   └── image (clear icon, right, visible when non-empty)
 *
 * @see https://docs.gtk.org/gtk4/class.SearchEntry.html
 */
export const GtkSearchEntry = forwardRef<HTMLInputElement, GtkSearchEntryProps>(
  function GtkSearchEntry(
    {
      placeholderText,
      searchDelay = 150,
      onSearchChanged,
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
      ...rest
    },
    ref,
  ) {
    const SearchIcon = useIcon("SystemSearch");
    const ClearIcon = useIcon("EditClear");
    const [value, setValue] = useState("");
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      };
    }, []);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const text = e.target.value;
        setValue(text);
        onChange?.(e);

        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          onSearchChanged?.(text);
        }, searchDelay);
      },
      [onChange, onSearchChanged, searchDelay],
    );

    const handleClear = useCallback(() => {
      setValue("");
      onSearchChanged?.("");
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, [onSearchChanged]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") onActivate?.();
        if (e.key === "Escape") {
          // Bound to stop-search, which consumes it: a dialog around the entry stays open.
          e.preventDefault();
          onStopSearch?.();
        }
        if (e.key === "g" && e.ctrlKey && !e.shiftKey) {
          e.preventDefault();
          onNextMatch?.();
        }
        if (e.key === "g" && e.ctrlKey && e.shiftKey) {
          e.preventDefault();
          onPreviousMatch?.();
        }
        onKeyDown?.(e);
      },
      [onActivate, onStopSearch, onNextMatch, onPreviousMatch, onKeyDown],
    );

    const classes = ["gtk-entry", "search"];
    if (className) classes.push(className);

    return (
      <div
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        role="searchbox"
      >
        <span className="gtk-image left">{SearchIcon && <SearchIcon size={16} />}</span>
        <input
          ref={ref}
          className="gtk-text"
          type="search"
          value={value}
          placeholder={placeholderText}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          {...rest}
        />
        {value.length > 0 && (
          <span className="gtk-image right" onClick={handleClear}>
            {ClearIcon && <ClearIcon size={16} />}
          </span>
        )}
      </div>
    );
  },
);
