import { GtkImage, GtkLabel, type GtkOrientation, GtkSeparator, tooltipAttrs } from "@gtk-js/gtk4";
import React, {
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { AdwButtonContent } from "./button-content.tsx";

export interface AdwToggle {
  /** Unique name for this toggle. */
  name: string;
  /** Text label. */
  label?: string;
  /** Icon name. */
  iconName?: string;
  /** Whether this toggle is enabled. Default: true. */
  enabled?: boolean;
  /** Tooltip text. */
  tooltip?: string;
  /** Custom child widget. */
  child?: ReactNode;
}

export interface AdwToggleGroupProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Index of the active toggle. Without `active` and `activeName`, the group
   * keeps its own active toggle, starting with the first enabled one.
   */
  active?: number;
  /** Name of the active toggle. */
  activeName?: string;
  /** All toggles get equal size. Default: false. */
  homogeneous?: boolean;
  /** Labels can ellipsize. Default: true. */
  canShrink?: boolean;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Whether the group is insensitive (GtkWidget:sensitive is false). Default: false. */
  disabled?: boolean;
  /** Toggle definitions. */
  toggles: AdwToggle[];
  /** Callback when the active toggle changes. */
  onToggleChanged?: (index: number, name: string) => void;
}

/** How long a keyboard-activated toggle shows `.keyboard-activating` (GtkButton's ACTIVATE_TIMEOUT). */
const ACTIVATE_TIMEOUT = 250;

/**
 * The index of the active toggle, or -1: `activeName` or `active` when set,
 * otherwise the group's own choice (`own`), which starts at the first enabled
 * toggle like add_toggle(). A disabled toggle is never active
 * (set_active_toggle()).
 */
export function resolveActive(
  toggles: AdwToggle[],
  active: number | undefined,
  activeName: string | undefined,
  own: string | undefined,
): number {
  const name = activeName ?? (active === undefined ? own : undefined);
  const index =
    name !== undefined
      ? toggles.findIndex((t) => t.name === name)
      : (active ?? toggles.findIndex((t) => t.enabled !== false));
  return toggles[index] && toggles[index].enabled !== false ? index : -1;
}

/**
 * The toggle an arrow key moves the focus to from `from`, or -1 at the end:
 * like adw_widget_focus_child(), it skips insensitive toggles and doesn't wrap.
 */
export function nextFocusable(toggles: AdwToggle[], from: number, step: 1 | -1): number {
  for (let i = from + step; i >= 0 && i < toggles.length; i += step) {
    if (toggles[i]?.enabled !== false) return i;
  }
  return -1;
}

/**
 * AdwToggleGroup — A group of mutually exclusive toggle buttons.
 *
 * CSS node:
 *   toggle-group[.horizontal|.vertical]
 *     ├── toggle.toggle[.text-button|.image-button|.image-text-button]
 *     ├── separator.horizontal|.vertical[.hidden] (.gtk-hidden, see gtk-css)
 *     └── toggle.toggle[...]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ToggleGroup.html
 */
export const AdwToggleGroup = forwardRef<HTMLDivElement, AdwToggleGroupProps>(
  function AdwToggleGroup(
    {
      active,
      activeName,
      homogeneous = false,
      canShrink = true,
      orientation = "horizontal",
      disabled = false,
      toggles,
      onToggleChanged,
      className,
      ...rest
    },
    ref,
  ) {
    const [own, setOwn] = useState<string>();
    const [hovered, setHovered] = useState(-1);
    const [focus, setFocus] = useState<{ index: number; visible: boolean } | null>(null);
    const [activating, setActivating] = useState(-1);
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);
    const activation = useRef<{ index: number; timeout: number } | null>(null);

    const controlled = active !== undefined || activeName !== undefined;
    const activeIndex = resolveActive(toggles, active, activeName, controlled ? undefined : own);
    const sensitive = (i: number) => {
      const toggle = toggles[i];
      return !disabled && toggle !== undefined && toggle.enabled !== false;
    };

    // Clicking the active toggle does nothing: a grouped GtkToggleButton can't
    // be unchecked, and set_active_toggle() returns early.
    const select = (i: number) => {
      const toggle = toggles[i];
      if (i === activeIndex || !toggle || !sensitive(i)) return;
      if (!controlled) setOwn(toggle.name);
      onToggleChanged?.(i, toggle.name);
    };
    const selectRef = useRef(select);
    selectRef.current = select;

    // Like gtk_button_finish_activate(): the toggle switches once its key is
    // released or ACTIVATE_TIMEOUT has passed.
    const finishActivate = () => {
      const current = activation.current;
      if (!current) return;
      clearTimeout(current.timeout);
      activation.current = null;
      setActivating(-1);
      selectRef.current(current.index);
    };
    useEffect(() => () => clearTimeout(activation.current?.timeout), []);

    const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === "Enter" || e.key === " ") {
        // Like gtk_real_button_activate(), rather than a click on Enter's
        // keydown and each of its repeats: keys are swallowed while it lasts
        // (key_controller_key_pressed_cb()).
        e.preventDefault();
        if (activation.current) return;
        activation.current = {
          index: i,
          timeout: window.setTimeout(finishActivate, ACTIVATE_TIMEOUT),
        };
        setActivating(i);
        return;
      }
      // adw_toggle_group_focus(): the arrows along the group move the focus
      // between its toggles by position, without activating them.
      const horizontal = orientation === "horizontal";
      const keys = horizontal ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
      if (!keys.includes(e.key) || e.altKey || e.metaKey || e.shiftKey) return;
      const rtl = horizontal && getComputedStyle(e.currentTarget).direction === "rtl";
      const next = nextFocusable(toggles, i, (e.key === keys[1]) !== rtl ? 1 : -1);
      if (next < 0) return;
      e.preventDefault();
      buttons.current[next]?.focus();
    };

    const handleKeyUp = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
      if (e.target !== e.currentTarget) return;
      // A key release ends the activation (key_controller_key_released_cb()),
      // and the <button> mustn't click on Space's keyup as well.
      if (e.key === "Enter" || e.key === " ") e.preventDefault();
      if (activation.current?.index === i) finishActivate();
      // Using the keyboard makes the focus visible.
      setFocus({ index: i, visible: e.currentTarget.matches(":focus-visible") });
    };

    // should_hide_separators(): a hovered, checked or keyboard-focused toggle
    // hides the separators on both sides.
    const hidesSeparators = (i: number) =>
      i === activeIndex || (i === hovered && sensitive(i)) || (focus?.index === i && focus.visible);

    // adw_toggle_group_focus(): Tab enters the group at the active toggle (or
    // the first one that can take focus) and leaves it from any toggle.
    const tabStop =
      focus && sensitive(focus.index)
        ? focus.index
        : sensitive(activeIndex)
          ? activeIndex
          : toggles.findIndex((_, i) => sensitive(i));

    const classes = ["gtk-toggle-group", "gtk-box-layout", orientation];
    if (className) classes.push(className);

    return (
      <div
        ref={ref}
        role="radiogroup"
        className={classes.join(" ")}
        data-homogeneous={homogeneous || undefined}
        data-disabled={disabled || undefined}
        {...rest}
      >
        {toggles.map((toggle, i) => {
          const isActive = i === activeIndex;
          const insensitive = !sensitive(i);
          const hasLabel = !toggle.child && !!toggle.label;
          const hasIcon = !toggle.child && !!toggle.iconName;

          // A GtkToggleButton with the css name "toggle", laid out by
          // GtkButton's BinLayout; its child sets the style class
          // (update_content()).
          const btnClasses = ["gtk-toggle", "toggle", "gtk-bin-layout"];
          if (hasLabel && !hasIcon) btnClasses.push("text-button");
          if (hasIcon && !hasLabel) btnClasses.push("image-button");
          if (hasIcon && hasLabel) btnClasses.push("image-text-button");
          if (i === activating) btnClasses.push("keyboard-activating");

          return (
            <React.Fragment key={toggle.name}>
              {/* Separators take the group's orientation (add_toggle()). */}
              {i > 0 && (
                <GtkSeparator
                  orientation={orientation}
                  className={
                    hidesSeparators(i - 1) || hidesSeparators(i) ? "gtk-hidden" : undefined
                  }
                  data-disabled={disabled || undefined}
                />
              )}
              <button
                ref={(el) => {
                  buttons.current[i] = el;
                }}
                type="button"
                className={btnClasses.join(" ")}
                role="radio"
                aria-checked={isActive}
                data-checked={isActive || undefined}
                // Every toggle expands (add_toggle()).
                data-hexpand="true"
                data-vexpand="true"
                disabled={insensitive}
                tabIndex={i === tabStop ? 0 : -1}
                {...tooltipAttrs(toggle.tooltip)}
                onClick={() => select(i)}
                onKeyDown={(e) => handleKeyDown(e, i)}
                onKeyUp={(e) => handleKeyUp(e, i)}
                onFocus={(e) =>
                  setFocus({ index: i, visible: e.currentTarget.matches(":focus-visible") })
                }
                onBlur={() => setFocus((f) => (f?.index === i ? null : f))}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered((h) => (h === i ? -1 : h))}
              >
                {toggle.child ??
                  (hasIcon && hasLabel ? (
                    <AdwButtonContent
                      iconName={toggle.iconName}
                      label={toggle.label}
                      canShrink={canShrink}
                      disabled={insensitive}
                    />
                  ) : hasLabel ? (
                    // gtk_button_set_label(): can-shrink ellipsizes the label.
                    <GtkLabel
                      label={toggle.label!}
                      ellipsize={canShrink ? "end" : "none"}
                      data-disabled={insensitive || undefined}
                    />
                  ) : hasIcon ? (
                    // gtk_button_set_icon_name() centers its image vertically.
                    <GtkImage
                      iconName={toggle.iconName}
                      valign="center"
                      data-disabled={insensitive || undefined}
                    />
                  ) : null)}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);
