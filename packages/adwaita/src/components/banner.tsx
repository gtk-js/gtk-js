import { wrapStyle } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes } from "react";

export interface AdwBannerProps extends HTMLAttributes<HTMLDivElement> {
  /** Banner title text. */
  title: string;
  /** Button label. If empty, button is hidden. */
  buttonLabel?: string;
  /** Whether the banner is visible. Default: false. */
  revealed?: boolean;
  /** Whether to use Pango markup in title. Default: true. */
  useMarkup?: boolean;
  /** Callback when the button is clicked. */
  onButtonClicked?: () => void;
}

/**
 * AdwBanner — A notification bar that slides down from top.
 *
 * CSS node:
 *   banner
 *     └── revealer
 *         └── widget
 *             ├── label.heading
 *             └── button (conditional)
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Banner.html
 */
export const AdwBanner = forwardRef<HTMLDivElement, AdwBannerProps>(function AdwBanner(
  { title, buttonLabel, revealed = false, useMarkup = true, onButtonClicked, className, ...rest },
  ref,
) {
  const classes = ["gtk-banner"];
  if (className) classes.push(className);

  if (!revealed) return null;

  return (
    <div ref={ref} className={classes.join(" ")} {...rest}>
      <div className="gtk-revealer">
        <div>
          <span className="gtk-label heading" style={wrapStyle("word-char")}>
            {title}
          </span>
          {buttonLabel && (
            <button type="button" className="gtk-button" onClick={onButtonClicked}>
              <span className="gtk-label">{buttonLabel}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
