import { type GtkOrientation, tooltipAttrs, useIcon } from "@gtk-js/gtk4";
import React, { forwardRef, type HTMLAttributes, type ReactNode } from "react";

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
  /** Index of the active toggle. */
  active?: number;
  /** Name of the active toggle. */
  activeName?: string;
  /** All toggles get equal size. Default: false. */
  homogeneous?: boolean;
  /** Labels can ellipsize. Default: true. */
  canShrink?: boolean;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Toggle definitions. */
  toggles: AdwToggle[];
  /** Callback when active toggle changes. */
  onToggleChanged?: (index: number, name: string) => void;
}

/**
 * AdwToggleGroup — A group of mutually exclusive toggle buttons.
 *
 * CSS node:
 *   toggle-group
 *     ├── toggle (button)
 *     ├── separator
 *     └── toggle (button)
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
      toggles,
      onToggleChanged,
      className,
      ...rest
    },
    ref,
  ) {
    const activeIndex = activeName
      ? toggles.findIndex((t) => t.name === activeName)
      : (active ?? -1);

    const classes = ["gtk-toggle-group", "gtk-box-layout", orientation];
    if (className) classes.push(className);

    return (
      <div ref={ref} role="radiogroup" className={classes.join(" ")} {...rest}>
        {toggles.map((toggle, i) => {
          const isActive = i === activeIndex;
          const Icon = toggle.iconName ? useIcon(toggle.iconName) : undefined;

          const btnClasses = ["gtk-toggle"];
          if (toggle.label && !toggle.iconName) btnClasses.push("text-button");
          if (toggle.iconName && !toggle.label) btnClasses.push("image-button");
          if (toggle.iconName && toggle.label) btnClasses.push("image-text-button");

          return (
            <React.Fragment key={toggle.name}>
              {i > 0 && <div className="gtk-separator vertical" />}
              <button
                type="button"
                className={btnClasses.join(" ")}
                role="radio"
                aria-checked={isActive}
                data-checked={isActive || undefined}
                disabled={toggle.enabled === false}
                {...tooltipAttrs(toggle.tooltip)}
                style={homogeneous ? { flex: 1 } : undefined}
                onClick={() => onToggleChanged?.(i, toggle.name)}
              >
                {toggle.child ?? (
                  <>
                    {Icon && (
                      <span className="gtk-image">
                        <Icon size={16} />
                      </span>
                    )}
                    {toggle.label && (
                      <span
                        className="gtk-label"
                        style={
                          canShrink ? { overflow: "hidden", textOverflow: "ellipsis" } : undefined
                        }
                      >
                        {toggle.label}
                      </span>
                    )}
                  </>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    );
  },
);
