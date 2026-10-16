import { GtkScrolledWindow, useIcon, wrapStyle } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { AdwClamp } from "./clamp.tsx";

export interface AdwStatusPageProps extends HTMLAttributes<HTMLDivElement> {
  /** Icon name displayed at top. */
  iconName?: string;
  /** Main title text. */
  title?: string;
  /** Description text (supports markup). */
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
  // Upstream `statuspage.compact` uses 96px icons (see _misc.scss).
  const compact = classes.some((c) => c.split(" ").includes("compact"));

  return (
    <div ref={ref} className={classes.join(" ")} {...rest}>
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
                    <Icon size={compact ? 96 : 128} />
                  </span>
                )}
                {title && (
                  <span className="gtk-label title" style={wrapStyle("word-char")}>
                    {title}
                  </span>
                )}
                {description && (
                  <span className="gtk-label body description" style={wrapStyle("word-char")}>
                    {description}
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
