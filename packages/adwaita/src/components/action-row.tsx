import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

export interface AdwActionRowProps extends HTMLAttributes<HTMLDivElement> {
  /** Row title text. */
  title: string;
  /** Subtitle text. */
  subtitle?: string;
  /** Maximum lines before title ellipsizes. 0 = unlimited. */
  titleLines?: number;
  /** Maximum lines before subtitle ellipsizes. 0 = unlimited. */
  subtitleLines?: number;
  /** Whether to use Pango markup. Default: true. */
  useMarkup?: boolean;
  /** Prefix widgets (left side). */
  prefixWidget?: ReactNode;
  /** Suffix widgets (right side). */
  suffixWidget?: ReactNode;
  /** Activatable — enables hover/active states. Default: false. */
  activatable?: boolean;
  /** Callback when row is activated. */
  onActivated?: () => void;
  /** Tooltip shown when hovering the row (GtkWidget:tooltip-text). */
  tooltipText?: string;
  children?: ReactNode;
}

/**
 * AdwActionRow — A preferences list row with title, subtitle, prefix, suffix.
 *
 * CSS node:
 *   row
 *     └── box.header
 *         ├── box.prefixes
 *         ├── box.title (vertical)
 *         │   ├── label.title
 *         │   └── label.subtitle
 *         └── box.suffixes
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.ActionRow.html
 */
export const AdwActionRow = forwardRef<HTMLDivElement, AdwActionRowProps>(function AdwActionRow(
  {
    title,
    subtitle,
    titleLines = 0,
    subtitleLines = 0,
    useMarkup = true,
    prefixWidget,
    suffixWidget,
    activatable = false,
    onActivated,
    tooltipText,
    children,
    className,
    onClick,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const classes = ["gtk-row"];
  if (activatable) classes.push("activatable");
  if (className) classes.push(className);

  // The labels wrap, and keep their spaces and line breaks like Pango does.
  const titleStyle: React.CSSProperties =
    titleLines > 0
      ? {
          display: "-webkit-box",
          WebkitLineClamp: titleLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
        }
      : { whiteSpace: "pre-wrap" };

  const subtitleStyle: React.CSSProperties =
    subtitleLines > 0
      ? {
          display: "-webkit-box",
          WebkitLineClamp: subtitleLines,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          whiteSpace: "pre-wrap",
        }
      : { whiteSpace: "pre-wrap" };

  return (
    <div
      ref={ref}
      role="listitem"
      className={classes.join(" ")}
      title={tooltipText}
      // Activatable rows are focusable and activate with Enter/Space, like GtkListBoxRow.
      tabIndex={activatable ? 0 : undefined}
      onClick={(e) => {
        if (activatable) onActivated?.();
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (activatable && e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onActivated?.();
        }
        onKeyDown?.(e);
      }}
      {...rest}
    >
      <div
        className="gtk-box gtk-box-layout horizontal header"
        style={{ gap: 6, alignItems: "center" }}
      >
        {prefixWidget && (
          <div className="gtk-box gtk-box-layout horizontal prefixes" style={{ gap: 6 }}>
            {prefixWidget}
          </div>
        )}
        <div className="gtk-box gtk-box-layout vertical title" style={{ flex: 1, gap: 3 }}>
          <span className="gtk-label title" style={titleStyle}>
            {title}
          </span>
          {subtitle && (
            <span className="gtk-label subtitle" style={subtitleStyle}>
              {subtitle}
            </span>
          )}
        </div>
        {(suffixWidget || children) && (
          <div className="gtk-box gtk-box-layout horizontal suffixes" style={{ gap: 6 }}>
            {suffixWidget}
            {children}
          </div>
        )}
      </div>
    </div>
  );
});
