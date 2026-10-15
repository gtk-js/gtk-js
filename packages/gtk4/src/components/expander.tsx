import { forwardRef, type HTMLAttributes, type ReactNode, useCallback, useState } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkExpanderProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether the child is visible. Default: false. */
  expanded?: boolean;
  /** Text label for the header. */
  label?: string;
  /** Custom label widget (replaces label string). */
  labelWidget?: ReactNode;
  /** Whether underscores in label indicate mnemonics. Default: false. */
  useUnderline?: boolean;
  /** Whether to use Pango markup in label. Default: false. */
  useMarkup?: boolean;
  /** Content revealed when expanded. */
  children?: ReactNode;
  /** Callback on expand/collapse. */
  onExpandedChanged?: (expanded: boolean) => void;
}

/**
 * GtkExpander — A collapsible container with a clickable header.
 *
 * CSS node:
 *   expander-widget
 *     └── box (vertical)
 *         ├── title
 *         │   ├── expander (arrow icon)
 *         │   └── <label>
 *         └── <child> (when expanded)
 *
 * @see https://docs.gtk.org/gtk4/class.Expander.html
 */
export const GtkExpander = forwardRef<HTMLDivElement, GtkExpanderProps>(function GtkExpander(
  {
    expanded: controlledExpanded,
    label,
    labelWidget,
    useUnderline = false,
    useMarkup = false,
    children,
    onExpandedChanged,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const isControlled = controlledExpanded !== undefined;
  const [internalExpanded, setInternalExpanded] = useState(false);
  const expanded = isControlled ? controlledExpanded : internalExpanded;

  const PanEndIcon = useIcon("PanEnd");
  const PanDownIcon = useIcon("PanDown");
  const ArrowIcon = expanded ? PanDownIcon : PanEndIcon;

  const toggle = useCallback(() => {
    const next = !expanded;
    if (!isControlled) setInternalExpanded(next);
    onExpandedChanged?.(next);
  }, [expanded, isControlled, onExpandedChanged]);

  const classes = ["gtk-expander-widget"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      <div className="gtk-box gtk-box-layout vertical">
        {/* Only the child counts for the expander's expand (gtk_expander_compute_expand()). */}
        <div
          className="title"
          data-expand-ignored=""
          role="button"
          aria-expanded={expanded}
          tabIndex={0}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              toggle();
            }
          }}
        >
          <span className="gtk-expander horizontal" data-checked={expanded || undefined}>
            {ArrowIcon && <ArrowIcon size={16} />}
          </span>
          {labelWidget ?? (label && <span className="gtk-label">{label}</span>)}
        </div>
        {expanded && children}
      </div>
    </div>
  );
});
