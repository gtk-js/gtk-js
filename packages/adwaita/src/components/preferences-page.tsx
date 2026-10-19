import { GtkScrolledWindow, labelText, wrapStyle } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useId } from "react";
import { AdwClamp } from "./clamp.tsx";

export interface AdwPreferencesPageProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  iconName?: string;
  name?: string;
  /** The description shown above the groups, as Pango markup. */
  description?: string;
  descriptionCentered?: boolean;
  children?: ReactNode;
}

/**
 * AdwPreferencesPage — A scrollable page of preference groups.
 *
 * CSS node:
 *   preferencespage > scrolledwindow > viewport > clamp > box
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.PreferencesPage.html
 */
export const AdwPreferencesPage = forwardRef<HTMLDivElement, AdwPreferencesPageProps>(
  function AdwPreferencesPage(
    {
      title,
      iconName,
      name,
      description,
      descriptionCentered = false,
      children,
      className,
      style,
      ...rest
    },
    ref,
  ) {
    const classes = ["gtk-preferencespage", "gtk-box-layout", "vertical"];
    if (className) classes.push(className);
    const descriptionId = useId();

    return (
      <div
        ref={ref}
        role="group"
        aria-describedby={description ? descriptionId : undefined}
        className={classes.join(" ")}
        style={{ flex: 1, minHeight: 0, ...style }}
        {...rest}
      >
        <GtkScrolledWindow hscrollbarPolicy="never" style={{ flex: 1, minHeight: 0 }}>
          <div className="gtk-viewport">
            <AdwClamp>
              <div
                className="gtk-box gtk-box-layout vertical"
                style={{ margin: "24px 12px", gap: 24 }}
              >
                {description && (
                  <span
                    id={descriptionId}
                    className="gtk-label body dimmed description"
                    style={{
                      ...wrapStyle("word-char"),
                      textAlign: descriptionCentered ? "center" : "start",
                    }}
                  >
                    {labelText(description, true)}
                  </span>
                )}
                {children}
              </div>
            </AdwClamp>
          </div>
        </GtkScrolledWindow>
      </div>
    );
  },
);
