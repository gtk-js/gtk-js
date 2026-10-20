import type { CSSProperties, ReactNode } from "react";

/** Layout direction for containers. */
export type GtkOrientation = "horizontal" | "vertical";

/** Text justification. */
export type GtkJustification = "left" | "right" | "center" | "fill";

/** Text ellipsize mode. */
export type GtkEllipsizeMode = "none" | "start" | "middle" | "end";

/** Baseline position within a row. */
export type GtkBaselinePosition = "top" | "center" | "bottom";

/** Text wrapping mode. */
export type GtkWrapMode = "word" | "char" | "word-char";

/** Widget alignment within allocated space. */
export type GtkAlign = "fill" | "start" | "end" | "center" | "baseline-fill" | "baseline-center";

/** Alignment and expansion props available on all GtkWidget subclasses. */
export interface GtkAlignProps {
  /** Horizontal alignment within the parent's allocated space. Default: "fill". */
  halign?: GtkAlign;
  /** Vertical alignment within the parent's allocated space. Default: "fill". */
  valign?: GtkAlign;
  /**
   * Whether the widget takes extra horizontal space its parent box has
   * (GtkWidget:hexpand). A parent also expands when something in it does,
   * unless it sets `hexpand={false}`. Default: unset.
   */
  hexpand?: boolean;
  /** Whether the widget takes extra vertical space (GtkWidget:vexpand). Default: unset. */
  vexpand?: boolean;
}

/** Convert alignment and expansion props to data attributes for layout CSS. */
export function alignAttrs(
  halign?: GtkAlign,
  valign?: GtkAlign,
  hexpand?: boolean,
  vexpand?: boolean,
) {
  return {
    "data-halign": halign && halign !== "fill" ? halign : undefined,
    "data-valign": valign && valign !== "fill" ? valign : undefined,
    "data-hexpand": hexpand === undefined ? undefined : String(hexpand),
    "data-vexpand": vexpand === undefined ? undefined : String(vexpand),
  };
}

/**
 * A box's spacing property as `--gtk-spacing`, which layout.css adds to the
 * theme's border-spacing like gtk_box_layout's get_spacing().
 */
export function spacingStyle(spacing: number): CSSProperties {
  return spacing > 0 ? ({ "--gtk-spacing": `${spacing}px` } as CSSProperties) : {};
}

/**
 * Marks which slots of a center layout hold a child (data-start / data-center /
 * data-end): GtkCenterLayout only puts spacing between children that exist.
 */
export function centerSlotAttrs(start: ReactNode, center: ReactNode, end: ReactNode) {
  const slot = (node: ReactNode) =>
    node === undefined || node === null || node === false || node === "" ? undefined : "";
  return { "data-start": slot(start), "data-center": slot(center), "data-end": slot(end) };
}

/** List selection behavior. */
export type GtkSelectionMode = "none" | "single" | "browse" | "multiple";

/** Edge positioning. */
export type GtkPositionType = "left" | "right" | "top" | "bottom";

/** Scrollbar display policy. */
export type GtkPolicyType = "always" | "automatic" | "never" | "external";

/** Arrow/dropdown direction. */
export type GtkArrowType = "up" | "down" | "left" | "right" | "none";

/** Symbolic icon size. */
export type GtkIconSize = "inherit" | "normal" | "large";

/** Input method purpose hint. */
export type GtkInputPurpose =
  | "free-form"
  | "alpha"
  | "digits"
  | "number"
  | "phone"
  | "url"
  | "email"
  | "name"
  | "password"
  | "pin";

/** Level bar rendering mode. */
export type GtkLevelBarMode = "continuous" | "discrete";

/** Stack child transition animation. */
export type GtkStackTransitionType =
  | "none"
  | "crossfade"
  | "slide-right"
  | "slide-left"
  | "slide-up"
  | "slide-down"
  | "slide-left-right"
  | "slide-up-down"
  | "over-up"
  | "over-down"
  | "over-left"
  | "over-right"
  | "under-up"
  | "under-down"
  | "under-left"
  | "under-right"
  | "over-up-down"
  | "over-down-up"
  | "over-left-right"
  | "over-right-left"
  | "rotate-left"
  | "rotate-right"
  | "rotate-left-right";

/** SpinButton update policy. */
export type GtkSpinButtonUpdatePolicy = "always" | "if-valid";

/** Sort direction. */
export type GtkSortType = "ascending" | "descending";

/**
 * Common window decoration layouts.
 *
 * The format is "start:end" where each side is a comma-separated list of
 * button names (close, minimize, maximize, appmenu, menu).
 * Any custom string in this format also works.
 */
export const DecorationLayout = {
  /** GNOME default — close button only, on the right. */
  GNOME: "appmenu:close",
  /** Full controls — minimize, maximize, close on the right. */
  FULL: "appmenu:minimize,maximize,close",
  /** macOS style — close, minimize, maximize on the left. */
  MACOS: "close,minimize,maximize:",
  /** Elementary OS style — close on left, maximize on right. */
  ELEMENTARY: "close:maximize",
  /** No window controls. */
  NONE: ":",
} as const;
