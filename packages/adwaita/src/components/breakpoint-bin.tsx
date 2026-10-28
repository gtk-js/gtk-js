import { observeSize, scheduleLayout } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useLayoutEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { lengthUnitToPx } from "../length-unit.ts";

export interface AdwBreakpointCondition {
  /**
   * Condition string, as adw_breakpoint_condition_parse() reads it:
   * "max-width: 500px", "min-height: 300pt", "max-aspect-ratio: 3/2",
   * combined with `and` / `or` and parentheses.
   */
  condition: string;
}

export interface AdwBreakpoint {
  /** Condition that triggers this breakpoint. */
  condition: AdwBreakpointCondition;
  /** Callback when breakpoint becomes active. */
  onApply?: () => void;
  /** Callback when breakpoint becomes inactive. */
  onUnapply?: () => void;
}

export interface AdwBreakpointBinProps extends HTMLAttributes<HTMLDivElement> {
  /** Breakpoint definitions (last matching wins). */
  breakpoints?: AdwBreakpoint[];
  children?: ReactNode;
}

type ConditionCheck = (width: number, height: number) => boolean;

class ConditionError extends Error {
  position: number;
  constructor(message: string, position: number) {
    super(message);
    this.position = position;
  }
}

/**
 * adw_breakpoint_condition_parse(): `min-width`, `max-width`, `min-height` or
 * `max-height: <number>[px|pt|sp]` and `min-aspect-ratio` or
 * `max-aspect-ratio: <width>[/<height>]`, joined by `and` / `or` from left to
 * right and grouped with parentheses. A condition that can't be parsed is
 * logged like GTK's g_critical() and gives null: its breakpoint never applies.
 */
export function parseBreakpointCondition(condition: string): ConditionCheck | null {
  const str = condition.replace(/^ +/, "");
  let pos = 0;
  const fail = (message: string, at = pos): never => {
    throw new ConditionError(message, at);
  };
  const skipSpaces = () => {
    while (str[pos] === " ") pos++;
  };
  const atEnd = () => pos === str.length || str[pos] === " " || str[pos] === ")";
  const read = (re: RegExp) => {
    const match = re.exec(str.slice(pos))?.[0];
    if (match) pos += match.length;
    return match;
  };

  // parse_single()
  const parseSingle = (): ConditionCheck => {
    const type = read(/^(min|max)-(width|height|aspect-ratio)/) ?? fail("unknown type");
    const isMin = type.startsWith("min");
    skipSpaces();
    if (str[pos] !== ":") fail("unexpected character");
    pos++;
    skipSpaces();
    const start = pos;

    if (type.endsWith("aspect-ratio")) {
      const width = Number(read(/^[+-]?\d+/) ?? fail("unable to parse value"));
      if (width < 0) fail("value is out of range", start);
      skipSpaces();
      let height = 1;
      if (str[pos] === "/") {
        pos++;
        skipSpaces();
        const heightStart = pos;
        height = Number(read(/^[+-]?\d+/) ?? fail("unable to parse value"));
        if (height < 1) fail("value is out of range", heightStart);
      }
      if (!atEnd()) fail("unexpected character");
      const ratio = width / height;
      return (w, h) => (isMin ? w / h >= ratio : w / h <= ratio);
    }

    const value = Number(
      read(/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i) ?? fail("unable to parse value"),
    );
    if (value < 0) fail("value is out of range", start);
    skipSpaces();
    const unit = read(/^(px|pt|sp)/) as "px" | "pt" | "sp" | undefined;
    if (!unit && !atEnd()) fail("unknown unit");
    if (!atEnd()) fail("unexpected character");
    const px = lengthUnitToPx(value, unit ?? "px");
    const isWidth = type.endsWith("width");
    return (w, h) => {
      const size = isWidth ? w : h;
      return isMin ? size >= px : size <= px;
    };
  };

  const parseOperand = (): ConditionCheck => {
    if (str[pos] !== "(") return parseSingle();
    pos++;
    const check = parseMulti();
    if (str[pos] !== ")") fail("unexpected character");
    pos++;
    return check;
  };

  // parse_multi(): without parentheses, the first operator takes priority.
  const parseMulti = (): ConditionCheck => {
    skipSpaces();
    let check = parseOperand();
    while (str[pos] === " ") {
      skipSpaces();
      if (atEnd()) return check;
      const operator = read(/^(and|or)/) ?? fail("unknown operator");
      if (str[pos] !== " ") fail("unexpected character");
      skipSpaces();
      const left = check;
      const right = parseOperand();
      check =
        operator === "and"
          ? (w, h) => left(w, h) && right(w, h)
          : (w, h) => left(w, h) || right(w, h);
    }
    return check;
  };

  try {
    const check = parseMulti();
    if (pos !== str.length) fail("unexpected character");
    return check;
  } catch (error) {
    if (!(error instanceof ConditionError)) throw error;
    console.error(
      `Unable to parse condition: ${error.message}\n${str}\n${"-".repeat(error.position)}^`,
    );
    return null;
  }
}

/**
 * AdwBreakpointBin — A container that applies breakpoints based on its own size.
 *
 * Like CSS container queries, but evaluates the bin's own width/height.
 * Last matching breakpoint wins.
 *
 * CSS node:
 *   widget
 *     └── [child]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.BreakpointBin.html
 * @see upstream/libadwaita/src/adw-breakpoint-bin.c
 */
export const AdwBreakpointBin = forwardRef<HTMLDivElement, AdwBreakpointBinProps>(
  function AdwBreakpointBin({ breakpoints = [], children, className, style, ...rest }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const breakpointsRef = useRef(breakpoints);
    breakpointsRef.current = breakpoints;
    const activeRef = useRef(-1);
    // A new array with the same conditions keeps the observer.
    const conditions = JSON.stringify(breakpoints.map((bp) => bp.condition.condition));

    // A layout effect, so that the observer reports the first size before
    // the first paint.
    useLayoutEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const checks = (JSON.parse(conditions) as string[]).map(parseBreakpointCondition);

      return observeSize(el, (entry) => {
        const { width, height } = entry.contentRect;
        // Like adw_breakpoint_bin_size_allocate(): the last matching
        // breakpoint wins.
        let index = -1;
        checks.forEach((check, i) => {
          if (check?.(width, height)) index = i;
        });
        const previous = activeRef.current;
        if (index === previous) return;
        activeRef.current = index;
        // GTK applies breakpoints while allocating, before anything is drawn
        // at the new size: render the callbacks' updates before this frame
        // is painted, after the layout pass's reads.
        scheduleLayout(
          () => () =>
            flushSync(() => {
              // adw_breakpoint_transition(): unapply, then apply.
              if (previous >= 0) breakpointsRef.current[previous]?.onUnapply?.();
              if (index >= 0) breakpointsRef.current[index]?.onApply?.();
            }),
        );
      });
    }, [conditions]);

    const setRef = (el: HTMLDivElement | null) => {
      containerRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    };

    // The child gets the bin's whole size (allocate_child()).
    const classes = ["gtk-widget", "gtk-bin-layout"];
    if (className) classes.push(className);

    return (
      <div
        ref={setRef}
        className={classes.join(" ")}
        style={{ overflow: "hidden", ...style }}
        {...rest}
      >
        {children}
      </div>
    );
  },
);
