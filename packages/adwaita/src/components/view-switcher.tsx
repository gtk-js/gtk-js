import { GtkActionBar, GtkBox, GtkImage, GtkLabel, GtkToggleButton } from "@gtk-js/gtk4";
import {
  type FocusEvent,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { AdwIndicatorBin, badgeText } from "./indicator-bin.tsx";

export interface AdwViewSwitcherPage {
  name: string;
  title: string;
  /** Icon name. Default: the image-missing icon, as every button has an icon. */
  iconName?: string;
  /** Whether the page asks for the user's attention: a dot, or an accent-colored badge. Default: false. */
  needsAttention?: boolean;
  /** A number shown as a badge on the icon; none for 0. Default: 0. */
  badgeNumber?: number;
  /** Whether the page has a button (AdwViewStackPage:visible). Default: true. */
  visible?: boolean;
}

export interface AdwViewSwitcherProps extends HTMLAttributes<HTMLDivElement> {
  pages: AdwViewSwitcherPage[];
  /** Name of the selected page. Uncontrolled when unset: the first visible page, then the clicked one. */
  activePageName?: string;
  /** Icons beside the labels ("wide") or above them ("narrow"). Default: "narrow". */
  policy?: "narrow" | "wide";
  /** Whether the switcher is insensitive (GtkWidget:sensitive=false). Default: false. */
  disabled?: boolean;
  onPageChanged?: (name: string) => void;
}

/**
 * AdwViewSwitcher — Tab buttons for switching views.
 *
 * CSS node:
 *   viewswitcher[.wide|.narrow]
 *   └── button.toggle.flat[.horizontal|.vertical][:checked]
 *       └── stack
 *           └── box.wide|box.narrow
 *               ├── indicatorbin[.needs-attention][.badge]
 *               │   ├── mask
 *               │   ├── indicator
 *               │   │   └── [label.numeric]
 *               │   └── image
 *               └── label
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ViewSwitcher.html
 */
export const AdwViewSwitcher = forwardRef<HTMLDivElement, AdwViewSwitcherProps>(
  function AdwViewSwitcher(
    {
      pages,
      activePageName,
      policy = "narrow",
      disabled = false,
      onPageChanged,
      className,
      onFocus,
      onBlur,
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    // Like update_button(): a page that isn't visible has no button.
    const shown = pages.filter((page) => page.visible !== false);
    const [internalPage, setInternalPage] = useState<string>();
    // Uncontrolled, the first visible page is selected, as in AdwViewStack.
    const selected =
      activePageName ??
      (shown.some((page) => page.name === internalPage) ? internalPage : shown[0]?.name);
    const rootRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);
    const [focusWithin, setFocusWithin] = useState(false);
    // A focused button that is removed or disabled loses the focus without a blur.
    useEffect(() => {
      if (focusWithin && !rootRef.current?.contains(document.activeElement)) setFocusWithin(false);
    });

    const select = (name: string) => {
      if (name === selected) return;
      setInternalPage(name);
      onPageChanged?.(name);
    };

    // Like adw_view_switcher_focus(): Tab enters on the active button and
    // leaves from any of them; the arrow keys move between them.
    const tabStop = shown.some((page) => page.name === selected) ? selected : shown[0]?.name;

    const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      const buttons = [...e.currentTarget.children].filter(
        (el): el is HTMLButtonElement => el instanceof HTMLButtonElement && !el.disabled,
      );
      const index = buttons.indexOf(e.target as HTMLButtonElement);
      if (index < 0) return;
      // Left and right on screen (adw_widget_focus_child()), so swapped in
      // RTL. Focus stops at the ends, and the page doesn't change.
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const next = buttons[index + ((e.key === "ArrowRight") !== rtl ? 1 : -1)];
      if (!next) return;
      e.preventDefault();
      next.focus();
    };

    const classes = ["gtk-viewswitcher", "gtk-box-layout", "horizontal", "homogeneous", policy];
    if (className) classes.push(className);

    return (
      <div
        ref={rootRef}
        role="tablist"
        className={classes.join(" ")}
        data-disabled={disabled || undefined}
        aria-disabled={disabled || undefined}
        onFocus={(e: FocusEvent<HTMLDivElement>) => {
          setFocusWithin(true);
          onFocus?.(e);
        }}
        onBlur={(e: FocusEvent<HTMLDivElement>) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setFocusWithin(false);
          onBlur?.(e);
        }}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {shown.map((page) => (
          <AdwViewSwitcherButton
            key={page.name}
            page={page}
            active={page.name === selected}
            wide={policy === "wide"}
            disabled={disabled}
            tabIndex={!focusWithin && page.name === tabStop ? 0 : -1}
            onActivate={() => select(page.name)}
          />
        ))}
      </div>
    );
  },
);

/** How long a drag stays over a button before its page is selected (TIMEOUT_EXPAND). */
const SWITCH_TIMEOUT = 500;

interface AdwViewSwitcherButtonProps {
  page: AdwViewSwitcherPage;
  active: boolean;
  wide: boolean;
  disabled: boolean;
  tabIndex: number;
  onActivate: () => void;
}

/** AdwViewSwitcherButton: a flat toggle button holding a stack of a wide and a narrow box. */
function AdwViewSwitcherButton({
  page,
  active,
  wide,
  disabled,
  tabIndex,
  onActivate,
}: AdwViewSwitcherButtonProps) {
  // Like drag_enter_cb() / drag_leave_cb(): a drag held over an inactive
  // button selects its page. Counting enters and leaves keeps a drag moving
  // onto the button's children from cancelling it.
  const drag = useRef({ depth: 0, timer: 0 });
  useEffect(() => () => window.clearTimeout(drag.current.timer), []);

  return (
    <GtkToggleButton
      type="button"
      active={active}
      hasFrame={false}
      className={wide ? "horizontal" : "vertical"}
      role="tab"
      aria-selected={active}
      aria-pressed={undefined}
      tabIndex={tabIndex}
      disabled={disabled}
      // focus-on-click is FALSE (adw_view_switcher_button_init()).
      onMouseDown={(e) => e.preventDefault()}
      onToggled={onActivate}
      onDragEnter={() => {
        if (drag.current.depth++ > 0 || active || disabled) return;
        drag.current.timer = window.setTimeout(onActivate, SWITCH_TIMEOUT);
      }}
      onDragLeave={() => {
        if (--drag.current.depth > 0) return;
        drag.current.depth = 0;
        window.clearTimeout(drag.current.timer);
      }}
      onDrop={() => {
        drag.current.depth = 0;
        window.clearTimeout(drag.current.timer);
      }}
    >
      {/* Only the stack's visible child, the box for the policy, is rendered.
          GtkStack allocates it the whole stack, like a BinLayout, and its
          halign and valign center it (adw-view-switcher-button.ui). */}
      <div className="gtk-stack gtk-bin-layout">
        <GtkBox
          orientation={wide ? "horizontal" : "vertical"}
          halign="center"
          valign="center"
          className={wide ? "wide" : "narrow"}
        >
          <AdwIndicatorBin
            needsAttention={page.needsAttention}
            badge={badgeText(page.badgeNumber)}
            halign={wide ? undefined : "center"}
            valign="center"
          >
            {/* Without an icon it's image-missing (adw_view_switcher_button_set_icon_name()). */}
            <GtkImage iconName={page.iconName || "MissingIcon"} />
          </AdwIndicatorBin>
          <GtkLabel label={page.title} ellipsize="end" />
        </GtkBox>
      </div>
    </GtkToggleButton>
  );
}

export interface AdwViewSwitcherBarProps extends HTMLAttributes<HTMLDivElement> {
  pages: AdwViewSwitcherPage[];
  /** Name of the selected page. Uncontrolled when unset, as in AdwViewSwitcher. */
  activePageName?: string;
  /** Whether the bar is shown. It's only shown with two or more visible pages. Default: false. */
  reveal?: boolean;
  onPageChanged?: (name: string) => void;
}

/**
 * AdwViewSwitcherBar — A bottom bar containing a narrow AdwViewSwitcher.
 *
 * CSS node:
 *   viewswitcherbar
 *   └── actionbar
 *       └── revealer
 *           └── box
 *               ├── box.start
 *               ├── viewswitcher.narrow
 *               └── box.end
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ViewSwitcherBar.html
 */
export const AdwViewSwitcherBar = forwardRef<HTMLDivElement, AdwViewSwitcherBarProps>(
  function AdwViewSwitcherBar(
    { pages, activePageName, reveal = false, onPageChanged, className, ...rest },
    ref,
  ) {
    const classes = ["gtk-viewswitcherbar", "gtk-bin-layout"];
    if (className) classes.push(className);

    // Like update_bar_revealed(): only the action bar hides, and it needs two
    // visible pages to show.
    const revealed = reveal && pages.filter((page) => page.visible !== false).length > 1;

    // The switcher is the action bar's center widget, 10px from its sides
    // (adw-view-switcher-bar.ui).
    return (
      <div ref={ref} className={classes.join(" ")} {...rest}>
        <GtkActionBar
          revealed={revealed}
          centerWidget={
            <AdwViewSwitcher
              pages={pages}
              activePageName={activePageName}
              policy="narrow"
              onPageChanged={onPageChanged}
              style={{ marginInline: 10 }}
            />
          }
        />
      </div>
    );
  },
);
