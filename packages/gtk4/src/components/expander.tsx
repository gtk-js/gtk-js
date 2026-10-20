import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type SyntheticEvent,
  useCallback,
  useId,
  useState,
} from "react";
import { noFocusOnClick } from "../focus-on-click.ts";
import { useIcon } from "../icon-context.tsx";
import { labelText } from "../markup.tsx";
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
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
}

/** Widgets in a label widget, which take their presses themselves. */
const INTERACTIVE = "button, input, select, textarea, a[href], [tabindex]";

/**
 * Whether a press in the title is on a widget of its own: like a
 * GtkCheckButton in GTK, it claims the press, so the title's click gesture
 * never sees it.
 */
function onInnerWidget(e: SyntheticEvent<HTMLElement>): boolean {
  const widget = (e.target as Element).closest(INTERACTIVE);
  return widget !== null && e.currentTarget.contains(widget);
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
 * The expander-widget itself takes the focus, and Adwaita draws its focus
 * ring on the title.
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
    disabled = false,
    onKeyDown,
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

  const childId = useId();

  const toggle = useCallback(() => {
    if (disabled) return;
    const next = !expanded;
    if (!isControlled) setInternalExpanded(next);
    onExpandedChanged?.(next);
  }, [disabled, expanded, isControlled, onExpandedChanged]);

  const classes = ["gtk-expander-widget"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      // GtkExpander is focusable itself (gtk_expander_init()), an accessible button.
      role="button"
      aria-expanded={expanded}
      aria-controls={expanded && children != null ? childId : undefined}
      aria-disabled={disabled || undefined}
      data-disabled={disabled || undefined}
      inert={disabled || undefined}
      tabIndex={disabled ? undefined : 0}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        // The window's Space and Enter bindings activate the focus widget only,
        // not the expander around a focused label widget or child.
        if (e.target === e.currentTarget && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          toggle();
        }
      }}
      {...rest}
    >
      <div className="gtk-box gtk-box-layout vertical" data-disabled={disabled || undefined}>
        {/* Only the child counts for the expander's expand (gtk_expander_compute_expand()). */}
        <div
          className="gtk-title gtk-box-layout horizontal"
          data-disabled={disabled || undefined}
          data-expand-ignored=""
          // A click activates the expander without focusing it (gesture_click_released_cb()).
          {...noFocusOnClick({}, (e) => !onInnerWidget(e))}
          onClick={(e) => {
            if (!onInnerWidget(e)) toggle();
          }}
        >
          <span
            className="gtk-expander horizontal"
            data-checked={expanded || undefined}
            data-disabled={disabled || undefined}
          >
            {ArrowIcon && <ArrowIcon size={16} />}
          </span>
          {labelWidget ??
            (label && (
              <span className="gtk-label" data-disabled={disabled || undefined}>
                {/* One flex item, or the spaces around markup tags would collapse. */}
                {useMarkup ? (
                  <span>{labelText(label, true, useUnderline)}</span>
                ) : (
                  labelText(label, false, useUnderline)
                )}
              </span>
            ))}
        </div>
        {/* Collapsed, the child stays mounted but hidden, as GTK keeps a reference
            to it (gtk_expander_set_expanded()); expanded, it's laid out like a
            child of the box. */}
        {children != null && (
          <div
            id={childId}
            className={expanded ? "gtk-box-layout vertical" : undefined}
            hidden={!expanded}
          >
            {children}
          </div>
        )}
      </div>
    </div>
  );
});
