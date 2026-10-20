import { forwardRef, type HTMLAttributes, useCallback, useEffect, useRef, useState } from "react";
import {
  alignAttrs,
  type GtkAlignProps,
  type GtkEllipsizeMode,
  type GtkOrientation,
} from "../types.ts";
import { GtkLabel } from "./label.tsx";

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
  /**
   * Call this function to trigger a pulse animation (activity mode).
   * Pass a ref and call ref.current.pulse() to pulse.
   */
  pulseRef?: React.MutableRefObject<{ pulse: () => void } | null>;
}

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
      fraction = 0,
      pulseStep = 0.1,
      inverted = false,
      text,
      showText = false,
      ellipsize = "none",
      orientation = "horizontal",
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
    const [pulsing, setPulsing] = useState(false);
    const [pulsePos, setPulsePos] = useState(0);
    const [pulseDir, setPulseDir] = useState(1);
    const animRef = useRef<number | undefined>(undefined);

    // Pulse animation
    const pulse = useCallback(() => {
      setPulsing(true);
      setPulsePos((prev) => {
        let next = prev + pulseStep * (pulseDir > 0 ? 1 : -1);
        if (next >= 1) {
          next = 1;
          setPulseDir(-1);
        }
        if (next <= 0) {
          next = 0;
          setPulseDir(1);
        }
        return next;
      });
    }, [pulseStep, pulseDir]);

    // Expose pulse via ref
    useEffect(() => {
      if (pulseRef) pulseRef.current = { pulse };
    }, [pulseRef, pulse]);

    // Auto-animate when pulsing
    useEffect(() => {
      if (!pulsing) return;
      let running = true;
      const animate = () => {
        if (!running) return;
        pulse();
        animRef.current = requestAnimationFrame(animate);
      };
      animRef.current = requestAnimationFrame(animate);
      return () => {
        running = false;
        if (animRef.current) cancelAnimationFrame(animRef.current);
      };
    }, [pulsing, pulse]);

    // Exit pulse mode when fraction is set
    useEffect(() => {
      if (fraction > 0) setPulsing(false);
    }, [fraction]);

    const classes = ["gtk-progressbar", orientation];
    if (className) classes.push(className);

    const isHoriz = orientation === "horizontal";
    const displayFraction = inverted ? 1 - fraction : fraction;

    const progressClasses = ["gtk-progress"];
    if (pulsing) progressClasses.push("pulse");
    if (!pulsing) {
      if (isHoriz) {
        if (displayFraction > 0) progressClasses.push("left");
        if (displayFraction >= 1) progressClasses.push("right");
      } else {
        if (displayFraction > 0) progressClasses.push("top");
        if (displayFraction >= 1) progressClasses.push("bottom");
      }
    }

    const troughClasses = ["gtk-trough"];
    if (!pulsing && fraction <= 0) troughClasses.push("empty");
    if (!pulsing && fraction >= 1) troughClasses.push("full");

    const progressStyle: React.CSSProperties = pulsing
      ? isHoriz
        ? { width: "20%", transform: `translateX(${pulsePos * 400}%)` }
        : { height: "20%", transform: `translateY(${pulsePos * 400}%)` }
      : isHoriz
        ? { width: `${displayFraction * 100}%` }
        : { height: `${displayFraction * 100}%` };

    const displayText = text ?? (showText ? `${Math.round(fraction * 100)} %` : null);

    return (
      <div
        ref={ref}
        role="progressbar"
        aria-valuenow={pulsing ? undefined : fraction}
        aria-valuemin={0}
        aria-valuemax={1}
        aria-busy={pulsing}
        aria-valuetext={showText && displayText ? displayText : undefined}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...rest}
      >
        {/* A label named "text", above the trough (gtk_progress_bar_set_show_text()). */}
        {showText && displayText && (
          <GtkLabel cssName="text" label={displayText} ellipsize={ellipsize} aria-hidden />
        )}
        <div className={troughClasses.join(" ")}>
          <div className={progressClasses.join(" ")} style={progressStyle} />
        </div>
      </div>
    );
  },
);
