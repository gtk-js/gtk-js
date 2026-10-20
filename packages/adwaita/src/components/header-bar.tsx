import {
  GtkLabel,
  GtkWindowControls,
  GtkWindowHandle,
  useCenterLayout,
  useIcon,
  useWindowControls,
  windowControlButtons,
} from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  type RefObject,
  useLayoutEffect,
  useRef,
} from "react";
import type { AdwCenteringPolicy } from "../types.ts";
import { AdwBackButton } from "./back-button.tsx";
import { useHeaderBarTitle } from "./header-bar-title.ts";
import { useNavigation } from "./navigation-view.tsx";
import { useSplitViewTitleButtons } from "./split-view-title-buttons.ts";

export interface AdwHeaderBarProps extends HTMLAttributes<HTMLDivElement> {
  titleWidget?: ReactNode;
  showStartTitleButtons?: boolean;
  showEndTitleButtons?: boolean;
  showBackButton?: boolean;
  showTitle?: boolean;
  decorationLayout?: string;
  centeringPolicy?: AdwCenteringPolicy;
  start?: ReactNode;
  end?: ReactNode;
}

/** Whether a start/end prop holds a child. */
function hasChild(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== "";
}

/**
 * centering-policy STRICT puts the start and end bins in a horizontal size
 * group (adw_header_bar_set_centering_policy()): both get the wider one's
 * width, so the title stays centered and is the first to shrink.
 */
function useStrictCentering(centerBox: RefObject<HTMLDivElement | null>, strict: boolean) {
  useLayoutEffect(() => {
    const box = centerBox.current;
    if (!box || !strict) return;
    const sides = () =>
      [...box.children].filter(
        (el): el is HTMLElement =>
          el instanceof HTMLElement &&
          (el.classList.contains("gtk-center-layout-start") ||
            el.classList.contains("gtk-center-layout-end")),
      );
    const update = () => {
      const bins = sides();
      // Each side's own width, then the group's (content-box) minimum.
      for (const bin of bins) bin.style.minWidth = "";
      const widths = bins.map((bin) => bin.getBoundingClientRect().width);
      const width = Math.max(0, ...widths);
      for (const bin of bins) {
        const cs = getComputedStyle(bin);
        const extra =
          parseFloat(cs.paddingLeft) +
          parseFloat(cs.paddingRight) +
          parseFloat(cs.borderLeftWidth) +
          parseFloat(cs.borderRightWidth);
        bin.style.minWidth = `${width - extra}px`;
      }
      // The end box keeps its halign END in the wider bin.
      const end = bins.find((bin) => bin.classList.contains("gtk-center-layout-end"));
      if (end) end.style.justifyContent = "flex-end";
    };
    update();
    // Re-measure when a side's children change size, or come and go. Not
    // within the observer's callback, which the new minimum would re-trigger.
    let frame = 0;
    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        update();
      });
    };
    const resizes = new ResizeObserver(schedule);
    const observe = () => {
      resizes.disconnect();
      for (const bin of sides()) {
        resizes.observe(bin);
        for (const child of bin.children) resizes.observe(child);
      }
    };
    observe();
    const mutations = new MutationObserver(() => {
      observe();
      schedule();
    });
    mutations.observe(box, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      resizes.disconnect();
      mutations.disconnect();
      for (const bin of sides()) {
        bin.style.minWidth = "";
        bin.style.justifyContent = "";
      }
    };
  }, [centerBox, strict]);
}

/**
 * AdwHeaderBar — An adaptive header bar with navigation integration.
 *
 * Window control buttons (close, minimize, maximize) call handlers from
 * WindowControlsContext, which is set up by the parent GtkWindow.
 * Its window handle moves the window, maximizes it on a double click and
 * opens the window menu on a right click (GtkWindowHandle).
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.HeaderBar.html
 */
export const AdwHeaderBar = forwardRef<HTMLDivElement, AdwHeaderBarProps>(function AdwHeaderBar(
  {
    titleWidget,
    showStartTitleButtons: showStartTitleButtonsProp = true,
    showEndTitleButtons: showEndTitleButtonsProp = true,
    showBackButton = true,
    showTitle = true,
    decorationLayout: decorationLayoutProp,
    centeringPolicy = "loose",
    start,
    end,
    className,
    children,
    ...rest
  },
  ref,
) {
  // AdwBackButton shows when it can pop and has its icon; the start box needs
  // to know (update_box_visibility()).
  const BackIcon = useIcon("GoPrevious");
  const controls = useWindowControls();
  const decorationLayout =
    decorationLayoutProp ?? controls?.decorationLayout ?? "appmenu:minimize,maximize,close";
  const nav = useNavigation();
  // AdwHeaderBar and GtkWindowHandle are GtkBinLayout widgets: the window
  // handle and its center box get the bar's full height (adw-header-bar.c).
  const classes = ["gtk-headerbar", "gtk-bin-layout"];
  if (className) classes.push(className);

  // Without a title widget, the title of the page or dialog it's in, or else
  // of its window, like construct_title_label() and update_title().
  const contextTitle = useHeaderBarTitle() ?? controls?.title;

  // Enclosing split views hide the buttons facing their other pane.
  const splitViews = useSplitViewTitleButtons();
  const showStartTitleButtons = showStartTitleButtonsProp && !splitViews.hideStart;
  const showEndTitleButtons = showEndTitleButtonsProp && !splitViews.hideEnd;
  const title =
    titleWidget ??
    children ??
    (contextTitle !== undefined ? (
      <GtkLabel
        label={contextTitle}
        className="title"
        valign="center"
        ellipsize="end"
        widthChars={5}
      />
    ) : undefined);

  const strict = centeringPolicy === "strict";
  const centerBox = useRef<HTMLDivElement>(null);
  useStrictCentering(centerBox, strict);
  useCenterLayout(centerBox);

  // A box with nothing in it is hidden, so its theme margin takes no space,
  // like update_box_visibility(). With the strict policy both sides stay, for
  // the size group that keeps the title centered.
  const showStartBox =
    strict ||
    (showStartTitleButtons && windowControlButtons(decorationLayout, "start").length > 0) ||
    (showBackButton && nav.canPop && BackIcon !== undefined) ||
    hasChild(start);
  const showEndBox =
    strict ||
    (showEndTitleButtons && windowControlButtons(decorationLayout, "end").length > 0) ||
    hasChild(end);

  return (
    <div ref={ref} className={classes.join(" ")} {...rest}>
      <GtkWindowHandle>
        {/* The start and end bins always exist in AdwHeaderBar (their boxes
            hide when empty), and the center box has shrink-center-last FALSE,
            as in adw_header_bar_init(). */}
        <div
          ref={centerBox}
          className="gtk-box gtk-center-layout"
          data-start=""
          data-center={showTitle && title ? "" : undefined}
          data-end=""
          data-shrink-center-last="false"
        >
          {showStartBox && (
            <div className="gtk-box gtk-box-layout horizontal start gtk-center-layout-start">
              {showStartTitleButtons && (
                <GtkWindowControls side="start" decorationLayout={decorationLayout} />
              )}
              {showBackButton && <AdwBackButton />}
              {start}
            </div>
          )}
          <div className="gtk-center-layout-center">{showTitle && title}</div>
          {showEndBox && (
            <div className="gtk-box gtk-box-layout horizontal end gtk-center-layout-end">
              {end}
              {showEndTitleButtons && (
                <GtkWindowControls side="end" decorationLayout={decorationLayout} />
              )}
            </div>
          )}
        </div>
      </GtkWindowHandle>
    </div>
  );
});
