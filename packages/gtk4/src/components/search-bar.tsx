import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { GtkButton } from "./button.tsx";
import { GtkCenterBox } from "./center-box.tsx";
import { GtkRevealer } from "./revealer.tsx";
import { SearchBarContext, type SearchEntryConnection } from "./search-entry.tsx";

export interface GtkSearchBarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether search mode is active (bar revealed). Leave unset for an uncontrolled bar, which starts hidden. */
  searchModeEnabled?: boolean;
  /** Whether to show a close button. Default: false. */
  showCloseButton?: boolean;
  /**
   * Element whose key presses reveal the bar and start a search
   * (GtkSearchBar:key-capture-widget): printable keys typed while the focus is
   * elsewhere in it go to the bar's GtkSearchEntry.
   */
  keyCaptureRef?: RefObject<HTMLElement | null>;
  /** The search widget (typically a GtkSearchEntry, which the bar connects to). */
  child?: ReactNode;
  /** Callback when search mode changes: the close button, Escape in the entry or a captured key. */
  onSearchModeChanged?: (enabled: boolean) => void;
}

/**
 * GtkSearchBar — A toolbar for search functionality.
 *
 * Revealing the bar focuses its search entry, hiding it clears the entry, and
 * Escape in the entry hides it (reveal_child_changed_cb(), stop_search_cb()).
 *
 * CSS node:
 *   searchbar
 *     └── revealer
 *         └── box (center box)
 *             ├── [child]
 *             └── [button.image-button.close]
 *
 * @see https://docs.gtk.org/gtk4/class.SearchBar.html
 */
export const GtkSearchBar = forwardRef<HTMLDivElement, GtkSearchBarProps>(function GtkSearchBar(
  {
    searchModeEnabled,
    showCloseButton = false,
    keyCaptureRef,
    child,
    onSearchModeChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

  const isControlled = searchModeEnabled !== undefined;
  const [internalMode, setInternalMode] = useState(false);
  const searchMode = isControlled ? searchModeEnabled : internalMode;

  const setSearchMode = useCallback(
    (enabled: boolean) => {
      if (enabled === searchMode) return;
      if (!isControlled) setInternalMode(enabled);
      onSearchModeChanged?.(enabled);
    },
    [searchMode, isControlled, onSearchModeChanged],
  );

  // The connected search entry (gtk_search_bar_connect_entry()).
  const entry = useRef<SearchEntryConnection | null>(null);
  const setSearchModeRef = useRef(setSearchMode);
  setSearchModeRef.current = setSearchMode;
  const context = useMemo(
    () => ({
      stopSearch: () => setSearchModeRef.current(false),
      connect: (connection: SearchEntryConnection) => {
        entry.current = connection;
        return () => {
          if (entry.current === connection) entry.current = null;
        };
      },
    }),
    [],
  );

  // reveal_child_changed_cb(): revealing focuses the entry, hiding clears it.
  const revealed = useRef(searchMode);
  useLayoutEffect(() => {
    if (revealed.current === searchMode) return;
    revealed.current = searchMode;
    if (searchMode) entry.current?.focus();
    else entry.current?.clear();
  }, [searchMode]);

  // capture_widget_key_handled(): a key the entry takes reveals the hidden bar
  // and is typed into the entry.
  useEffect(() => {
    const widget = keyCaptureRef?.current;
    if (!widget) return;
    const onKey = (e: KeyboardEvent) => {
      if (revealed.current || !rootRef.current?.getClientRects().length) return;
      entry.current?.capture(e, () => flushSync(() => setSearchModeRef.current(true)));
    };
    widget.addEventListener("keydown", onKey);
    return () => widget.removeEventListener("keydown", onKey);
  }, [keyCaptureRef]);

  const classes = ["gtk-searchbar", "gtk-bin-layout"];
  if (className) classes.push(className);

  return (
    <div
      ref={rootRef}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      role="search"
      {...rest}
    >
      <GtkRevealer revealChild={searchMode} hexpand>
        <GtkCenterBox
          hexpand
          centerWidget={
            <SearchBarContext.Provider value={context}>{child}</SearchBarContext.Provider>
          }
          endWidget={
            showCloseButton && (
              // gtk_search_bar_init()
              <GtkButton
                type="button"
                iconName="WindowClose"
                className="close"
                valign="center"
                onClicked={() => setSearchMode(false)}
              />
            )
          }
        />
      </GtkRevealer>
    </div>
  );
});
