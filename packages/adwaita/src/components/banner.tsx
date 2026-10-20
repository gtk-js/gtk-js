import { GtkButton, GtkLabel, GtkRevealer, noFocusOnClick } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import { animationSlowdown } from "../spring.ts";

export interface AdwBannerProps extends HTMLAttributes<HTMLDivElement> {
  /** Banner title text. */
  title: string;
  /** Button label, with an underscore before its mnemonic. If empty, button is hidden. */
  buttonLabel?: string;
  /** Whether the banner is visible. Default: false. */
  revealed?: boolean;
  /** Whether to use Pango markup in title. Default: true. Not supported yet: the title is plain text. */
  useMarkup?: boolean;
  /** Callback when the button is clicked. */
  onButtonClicked?: () => void;
}

// adw-banner.c
const HORZ_SPACING = 6;
const HORZ_SPACING_CENTERED = 36;
const HORZ_PADDING = 6;
const BUTTON_HORZ_MIN_WIDTH = 84;
const BUTTON_VERT_MIN_WIDTH = 160;

/** GtkRevealer's default transition-duration, which adw-banner.ui keeps. */
const REVEAL_DURATION = 250;

/**
 * How the banner's gizmo places its title and button (layout.css), as
 * allocate_content() picks it from its content width and their natural widths:
 * - "center": the title centered on the whole width, the button at the end;
 * - "start": the same with the title 6px from the start, when centering it
 *   would leave less than 36px around the button;
 * - "stacked": the title, 6px and the button don't fit side by side, so the
 *   title goes above the button;
 * - without a button, "padded" has 6px around the title, which "wrap" wraps
 *   6px from each side and "fill" across the whole width.
 */
export type AdwBannerLayout = "center" | "start" | "stacked" | "padded" | "wrap" | "fill";

export function bannerLayout(
  width: number,
  labelWidth: number,
  buttonWidth: number | null,
): AdwBannerLayout {
  if (buttonWidth === null) {
    if (labelWidth > width) return "fill";
    return labelWidth > width - HORZ_PADDING * 2 ? "wrap" : "padded";
  }
  const label = Math.min(labelWidth, width);
  const button = Math.max(buttonWidth, BUTTON_HORZ_MIN_WIDTH);
  if (HORZ_PADDING + label + HORZ_SPACING + button > width) return "stacked";
  return label + (button + HORZ_SPACING_CENTERED) * 2 > width ? "start" : "center";
}

/** The border-box width of `el` at its min-content or max-content width. */
function intrinsicWidth(el: HTMLElement, size: "min-content" | "max-content"): number {
  const { width, maxWidth } = el.style;
  el.style.width = size;
  el.style.maxWidth = "none";
  const result = el.getBoundingClientRect().width;
  el.style.width = width;
  el.style.maxWidth = maxWidth;
  return result;
}

/**
 * AdwBanner — A bar with contextual information.
 *
 * Its gizmo lays out the title and button like measure_content() and
 * allocate_content() (adw-banner.c): side by side, the title centered and the
 * button, at least 84px wide, at the end; the title at the start when there
 * isn't room to center it; and the title above the button, at least 160px
 * wide, when they don't fit side by side. `revealed` slides the banner down
 * or up with its GtkRevealer (slide-down, 250ms). The button doesn't take the
 * focus when clicked (focus-on-click=False in adw-banner.ui).
 *
 * CSS node:
 *   banner
 *     └── revealer
 *         └── widget
 *             ├── label.heading
 *             └── button.text-button (conditional)
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Banner.html
 * @see upstream/libadwaita/src/adw-banner.c
 */
export const AdwBanner = forwardRef<HTMLDivElement, AdwBannerProps>(function AdwBanner(
  { title, buttonLabel, revealed = false, useMarkup = true, onButtonClicked, className, ...rest },
  ref,
) {
  const titleId = useId();
  const gizmoRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const hasButton = !!buttonLabel;

  // The gizmo's size is measure_content()'s, whichever layout it then has:
  // with inline-size containment the browser doesn't size it from the
  // layout's grid, so the layout only depends on the width it gets.
  const allocate = useCallback(() => {
    const gizmo = gizmoRef.current;
    const label = labelRef.current;
    if (!gizmo || !label) return;
    const button = hasButton ? buttonRef.current : null;
    const labelNat = intrinsicWidth(label, "max-content");
    const buttonNat = button && intrinsicWidth(button, "max-content");
    let min: number;
    let nat: number;
    if (button && buttonNat !== null) {
      const buttonMin = intrinsicWidth(button, "min-content");
      min = HORZ_PADDING * 2 + Math.max(buttonMin, BUTTON_VERT_MIN_WIDTH);
      nat = Math.max(HORZ_PADDING + labelNat + HORZ_SPACING + buttonNat, min);
    } else {
      min = HORZ_PADDING * 2 + intrinsicWidth(label, "min-content");
      nat = HORZ_PADDING * 2 + labelNat;
    }
    gizmo.style.contain = "inline-size";
    gizmo.style.setProperty("contain-intrinsic-inline-size", `${nat}px`);
    gizmo.style.minWidth = `${min}px`;

    const cs = getComputedStyle(gizmo);
    const width =
      gizmo.getBoundingClientRect().width -
      parseFloat(cs.paddingLeft) -
      parseFloat(cs.paddingRight) -
      parseFloat(cs.borderLeftWidth) -
      parseFloat(cs.borderRightWidth);
    gizmo.dataset.layout = bannerLayout(width, labelNat, buttonNat);
  }, [hasButton]);

  // The title and button can change with any render.
  useLayoutEffect(allocate);

  // Resizes and font loads pick the layout again, in the next frame: a new
  // layout changes the gizmo's height, which the observer is reporting.
  useLayoutEffect(() => {
    const gizmo = gizmoRef.current;
    if (!gizmo || typeof ResizeObserver === "undefined") return;
    let frame: number | null = null;
    const observer = new ResizeObserver(() => {
      frame ??= requestAnimationFrame(() => {
        frame = null;
        allocate();
      });
    });
    for (const el of [gizmo, labelRef.current, buttonRef.current]) if (el) observer.observe(el);
    return () => {
      observer.disconnect();
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [allocate]);

  const classes = ["gtk-banner", "gtk-bin-layout"];
  if (className) classes.push(className);

  return (
    <div ref={ref} className={classes.join(" ")} role="group" aria-labelledby={titleId} {...rest}>
      <GtkRevealer
        revealChild={revealed}
        transitionDuration={REVEAL_DURATION * animationSlowdown()}
      >
        <div ref={gizmoRef} className="gtk-widget">
          <GtkLabel
            ref={labelRef}
            id={titleId}
            label={title}
            className="heading"
            justify="center"
            ellipsize="end"
            lines={3}
            wrap
            wrapMode="word-char"
          />
          {hasButton && (
            <GtkButton
              ref={buttonRef}
              type="button"
              label={buttonLabel}
              useUnderline
              canShrink
              valign="center"
              // focus-on-click is FALSE (adw-banner.ui).
              {...noFocusOnClick()}
              onClicked={onButtonClicked}
            />
          )}
        </div>
      </GtkRevealer>
    </div>
  );
});
