import { GtkScrolledWindow, labelText, useIcon, wrapStyle } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react";
import { AdwClamp } from "./clamp.tsx";

export interface AdwStatusPageProps extends HTMLAttributes<HTMLDivElement> {
  /** Icon name displayed at top. */
  iconName?: string;
  /** Main title text. */
  title?: string;
  /** Description text, as Pango markup. */
  description?: string;
  /** Custom content below description. */
  children?: ReactNode;
}

/**
 * AdwStatusPage — A full-page status display (empty states, errors, etc).
 *
 * CSS node:
 *   statuspage
 *     └── scrolledwindow > viewport > box
 *         └── clamp > box
 *             ├── image.icon
 *             ├── label.title
 *             └── label.body.description
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.StatusPage.html
 */
export const AdwStatusPage = forwardRef<HTMLDivElement, AdwStatusPageProps>(function AdwStatusPage(
  { iconName, title, description, children, className, ...rest },
  ref,
) {
  const Icon = useIcon(iconName ?? "");

  const classes = ["gtk-statuspage"];
  if (className) classes.push(className);
  const titleId = useId();
  const descriptionId = useId();

  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={title ? titleId : undefined}
      aria-describedby={description ? descriptionId : undefined}
      className={classes.join(" ")}
      {...rest}
    >
      <GtkScrolledWindow hscrollbarPolicy="never" style={{ height: "100%" }}>
        <div
          className="gtk-viewport"
          style={{ minHeight: "100%", display: "flex", flexDirection: "column" }}
        >
          <div
            className="gtk-box gtk-box-layout vertical"
            style={{ alignItems: "center", justifyContent: "center", flex: 1 }}
          >
            <AdwClamp style={{ alignSelf: "stretch" }}>
              <div
                className="gtk-box gtk-box-layout vertical"
                style={{ alignItems: "center", textAlign: "center" }}
              >
                {Icon && (
                  <span className="gtk-image icon">
                    {/* The theme sizes it: 128px, 96px in .compact (_misc.scss). */}
                    <Icon style={ICON_STYLE} />
                  </span>
                )}
                {title && (
                  <span id={titleId} className="gtk-label title" style={wrapStyle("word-char")}>
                    {title}
                  </span>
                )}
                {description && (
                  <span
                    id={descriptionId}
                    className="gtk-label body description"
                    style={wrapStyle("word-char")}
                  >
                    {labelText(description, true)}
                  </span>
                )}
              </div>
            </AdwClamp>
            {children}
          </div>
        </div>
      </GtkScrolledWindow>
    </div>
  );
});

// The image's -gtk-icon-size, which the style overrides the SVG's size with:
// its width and height attributes can't take var().
const ICON_STYLE = { width: "var(--gtk-icon-size, 16px)", height: "var(--gtk-icon-size, 16px)" };
