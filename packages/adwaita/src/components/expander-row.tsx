import { useIcon, useListBoxRow } from "@gtk-js/gtk4";
import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useState,
} from "react";

export interface AdwExpanderRowProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  expanded?: boolean;
  showEnableSwitch?: boolean;
  enableExpansion?: boolean;
  titleLines?: number;
  subtitleLines?: number;
  prefixWidget?: ReactNode;
  suffixWidget?: ReactNode;
  /** Child rows (shown when expanded). */
  children?: ReactNode;
  onExpandedChanged?: (expanded: boolean) => void;
  onEnableExpansionChanged?: (enabled: boolean) => void;
}

/**
 * AdwExpanderRow — A list row that expands to show child rows.
 *
 * CSS node: row.expander
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ExpanderRow.html
 */
export const AdwExpanderRow = forwardRef<HTMLDivElement, AdwExpanderRowProps>(
  function AdwExpanderRow(
    {
      title,
      subtitle,
      expanded: controlledExpanded,
      showEnableSwitch = false,
      enableExpansion: controlledEnable,
      titleLines = 0,
      subtitleLines = 0,
      prefixWidget,
      suffixWidget,
      children,
      onExpandedChanged,
      onEnableExpansionChanged,
      className,
      ...rest
    },
    ref,
  ) {
    const isControlled = controlledExpanded !== undefined;
    const [internalExpanded, setInternalExpanded] = useState(false);
    const [internalEnable, setInternalEnable] = useState(true);
    const expanded = isControlled ? controlledExpanded : internalExpanded;
    const enableExpansion = controlledEnable ?? internalEnable;

    const ArrowIcon = useIcon("AdwExpanderArrow");

    const toggle = useCallback(() => {
      if (!enableExpansion) return;
      const next = !expanded;
      if (!isControlled) setInternalExpanded(next);
      onExpandedChanged?.(next);
    }, [expanded, enableExpansion, isControlled, onExpandedChanged]);

    const placeRow = useListBoxRow();
    const classes = ["gtk-row", "expander"];
    if (!children || React.Children.count(children) === 0) classes.push("empty");
    if (className) classes.push(className);

    return placeRow(
      <div ref={ref} className={classes.join(" ")} {...rest}>
        <div className="gtk-box gtk-box-layout vertical">
          <div className="gtk-list">
            <div
              className="gtk-row header activatable"
              role="button"
              aria-expanded={expanded}
              tabIndex={0}
              data-checked={expanded || undefined}
              onClick={toggle}
              onKeyDown={(e) => {
                if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  toggle();
                }
              }}
            >
              <div
                className="gtk-box gtk-box-layout horizontal header"
                style={{ alignItems: "center" }}
              >
                {prefixWidget && (
                  <div className="gtk-box gtk-box-layout horizontal prefixes">{prefixWidget}</div>
                )}
                <div className="gtk-box gtk-box-layout vertical title" style={{ flex: 1 }}>
                  <span className="gtk-label title">{title}</span>
                  {subtitle && <span className="gtk-label subtitle">{subtitle}</span>}
                </div>
                {suffixWidget && (
                  <div className="gtk-box gtk-box-layout horizontal suffixes">{suffixWidget}</div>
                )}
                {showEnableSwitch && (
                  <div
                    className="gtk-switch"
                    data-checked={enableExpansion || undefined}
                    onClick={(e) => {
                      e.stopPropagation();
                      const next = !enableExpansion;
                      if (controlledEnable === undefined) setInternalEnable(next);
                      onEnableExpansionChanged?.(next);
                    }}
                  >
                    <span className="gtk-slider" />
                  </div>
                )}
                <span className="gtk-image expander-row-arrow" data-checked={expanded || undefined}>
                  {ArrowIcon && <ArrowIcon size={16} />}
                </span>
              </div>
            </div>
          </div>
          {expanded && enableExpansion && (
            <div className="gtk-revealer">
              <div className="gtk-list nested">{children}</div>
            </div>
          )}
        </div>
      </div>,
    );
  },
);
