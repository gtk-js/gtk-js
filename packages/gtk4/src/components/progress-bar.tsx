import { forwardRef, type HTMLAttributes, useCallback, useEffect, useRef, useState } from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkEllipsizeMode,
  type GtkOrientation,
} from "../types.ts";

export interface GtkProgressBarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Fraction completed (0.0 to 1.0). Default: 0. */
  fraction?: number;
  /** Amount to move per pulse() call (0.0 to 1.0). Default: 0.1. */
  pulseStep?: number;
  /** Reverse the fill direction. Default: false. */
  inverted?: boolean;
  /** Custom text to display. */
  text?: string;
  /** Whether to show text (custom or auto-percentage). Default: false. */
  showText?: boolean;
  /** Text ellipsize mode. Default: "none". */
  ellipsize?: GtkEllipsizeMode;
  /** Layout direction. Default: "horizontal". */
  orientation?: GtkOrientation;
  /** Whether the widget is insensitive (disabled). Default: false. */
  disabled?: boolean;
  /**
   * Call this function to trigger a pulse animation (activity mode).
   * Pass a ref and call ref.current.pulse() to pulse.
   */
  pulseRef?: React.MutableRefObject<{ pulse: () => void } | null>;
}

/** g_get_monotonic_time() in ms: far from 0, which stands for "no pulse yet". */
function monotonicTime(): number {
  return performance.timeOrigin + performance.now();
}

/** Activity mode: the block's position (0 to 1), direction and pulse times. */
export interface GtkProgressBarActivity {
  active: boolean;
  pos: number;
  /** 0 towards the end, 1 back. */
  dir: number;
  /** The time of the pulse before the last one, 0 if none. */
  pulse1: number;
  /** The time of the last pulse, 0 if none. */
  pulse2: number;
  /** The time of the last frame. */
  last: number;
}

/**
 * Moves the block for a frame at `now`, like tick_cb(): pulseStep per interval
 * between the last two pulses, slower when the next pulse is late, not at all
 * after three missed ones, bouncing between the ends. Returns whether it moved.
 */
export function advanceActivity(
  a: GtkProgressBarActivity,
  now: number,
  pulseStep: number,
): boolean {
  if (a.pulse1 === 0 && a.pulse2 === 0) return false;
  const pulseInterval = a.pulse2 - a.pulse1;
  const sinceFirst = now - a.pulse1;
  const step = (pulseStep * (now - a.last)) / Math.max(pulseInterval, sinceFirst);
  a.last = now;
  if (sinceFirst > 3 * pulseInterval) return false;
  if (a.dir === 0) {
    a.pos += step;
    if (a.pos > 1) {
      a.pos = 1;
      a.dir = 1;
    }
  } else {
    a.pos -= step;
    if (a.pos <= 0) {
      a.pos = 0;
      a.dir = 0;
    }
  }
  return true;
}

// GtkLabel draws every ellipsis at the end too.
const ELLIPSIZE_STYLE: React.CSSProperties = { overflow: "hidden", textOverflow: "ellipsis" };

/**
 * GtkProgressBar — A widget that shows progress.
 *
 * CSS node:
 *   progressbar[.horizontal|.vertical][.osd]
 *     ├── text (optional)
 *     └── trough[.empty|.full]
 *         └── progress[.pulse][.left|.right|.top|.bottom]
 *
 * @see https://docs.gtk.org/gtk4/class.ProgressBar.html
 */
export const GtkProgressBar = forwardRef<HTMLDivElement, GtkProgressBarProps>(
  function GtkProgressBar(
    {
      fraction: fractionProp = 0,
      pulseStep = 0.1,
      inverted = false,
      text,
      showText = false,
      ellipsize = "none",
      orientation = "horizontal",
      disabled = false,
      pulseRef,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      ...rest
    },
    ref,
  ) {
    // gtk_progress_bar_set_fraction()
    const fraction = Math.min(1, Math.max(0, fractionProp));

    const [activityMode, setActivityMode] = useState(false);
    const [activityPos, setActivityPos] = useState(0);
    const activity = useRef<GtkProgressBarActivity>({
      active: false,
      pos: 0,
      dir: 0,
      pulse1: 0,
      pulse2: 0,
      last: 0,
    });

    // gtk_progress_bar_pulse(): enters activity mode, starting at the start (the
    // end when inverted), and records the time of the last two pulses.
    const pulse = useCallback(() => {
      const a = activity.current;
      const now = monotonicTime();
      if (!a.active) {
        Object.assign(a, {
          active: true,
          pos: inverted ? 1 : 0,
          dir: inverted ? 1 : 0,
          pulse1: 0,
          pulse2: 0,
          last: now,
        });
        setActivityPos(a.pos);
        setActivityMode(true);
      }
      if (a.pulse2 !== now) {
        a.pulse1 = a.pulse2;
        a.pulse2 = now;
      }
    }, [inverted]);

    useEffect(() => {
      if (pulseRef) pulseRef.current = { pulse };
    }, [pulseRef, pulse]);

    useEffect(() => {
      if (!activityMode) return;
      let frame = requestAnimationFrame(function tick() {
        frame = requestAnimationFrame(tick);
        const a = activity.current;
        if (advanceActivity(a, monotonicTime(), pulseStep)) setActivityPos(a.pos);
      });
      return () => cancelAnimationFrame(frame);
    }, [activityMode, pulseStep]);

    // Setting the fraction leaves activity mode.
    const lastFraction = useRef(fraction);
    useEffect(() => {
      if (lastFraction.current === fraction) return;
      lastFraction.current = fraction;
      activity.current.active = false;
      setActivityMode(false);
    }, [fraction]);

    const classes = ["gtk-progressbar", orientation];
    if (className) classes.push(className);

    const isHoriz = orientation === "horizontal";

    // update_node_classes(): the ends the progress touches.
    let start: boolean;
    let end: boolean;
    if (activityMode) {
      start = activityPos <= 0;
      end = activityPos >= 1;
    } else {
      start = !inverted || fraction >= 1;
      end = inverted || fraction >= 1;
    }
    const progressClasses = ["gtk-progress"];
    if (activityMode) progressClasses.push("pulse");
    if (start) progressClasses.push(isHoriz ? "left" : "top");
    if (end) progressClasses.push(isHoriz ? "right" : "bottom");

    // update_fraction_classes()
    const troughClasses = ["gtk-trough"];
    if (!activityMode && fraction <= 0) troughClasses.push("empty");
    else if (!activityMode && fraction >= 1) troughClasses.push("full");

    // allocate_trough(): in activity mode, a fifth of the trough at activityPos
    // of the rest; otherwise the fraction of it, from the end when inverted.
    const progressStyle: React.CSSProperties = activityMode
      ? isHoriz
        ? { width: "20%", transform: `translateX(${activityPos * 400}%)` }
        : { height: "20%", transform: `translateY(${activityPos * 400}%)` }
      : isHoriz
        ? { width: `${fraction * 100}%`, justifySelf: inverted ? "end" : "start" }
        : { height: `${fraction * 100}%`, alignSelf: inverted ? "end" : "start" };

    // get_current_text(): a hair space before the percent sign.
    const displayText = text ?? `${Math.round(fraction * 100)}\u200a%`;

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={activityMode ? undefined : fraction}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-busy={activityMode}
        aria-disabled={disabled || undefined}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        data-disabled={disabled || undefined}
        {...rest}
      >
        {showText && (
          // A GtkLabel with the CSS name text (gtk_progress_bar_set_show_text()).
          <span className="gtk-text" style={ellipsize === "none" ? undefined : ELLIPSIZE_STYLE}>
            {displayText}
          </span>
        )}
        <div className={troughClasses.join(" ")}>
          <div className={progressClasses.join(" ")} style={progressStyle} />
        </div>
      </div>
    );
  },
);
