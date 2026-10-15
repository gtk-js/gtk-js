import React, { forwardRef, type HTMLAttributes, useCallback, useMemo, useState } from "react";
import { useIcon } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkCalendarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Selected year. Default: current year. */
  year?: number;
  /** Selected month (0-11). Default: current month. */
  month?: number;
  /** Selected day (1-31). Default: current day. */
  day?: number;
  /** Show month/year navigation header. Default: true. */
  showHeading?: boolean;
  /** Show day-of-week name row. Default: true. */
  showDayNames?: boolean;
  /** Show week number column. Default: false. */
  showWeekNumbers?: boolean;
  /** Callback when a day is selected. */
  onDaySelected?: (year: number, month: number, day: number) => void;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/**
 * GtkCalendar — A calendar date picker widget.
 *
 * CSS node:
 *   calendar.view
 *     ├── header (nav buttons + month/year labels)
 *     └── grid (7 columns x 7 rows: day names + 6 weeks)
 *
 * @see https://docs.gtk.org/gtk4/class.Calendar.html
 */
export const GtkCalendar = forwardRef<HTMLDivElement, GtkCalendarProps>(function GtkCalendar(
  {
    year: controlledYear,
    month: controlledMonth,
    day: controlledDay,
    showHeading = true,
    showDayNames = true,
    showWeekNumbers = false,
    onDaySelected,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const now = new Date();
  const isControlled = controlledYear !== undefined;

  const [internalYear, setInternalYear] = useState(now.getFullYear());
  const [internalMonth, setInternalMonth] = useState(now.getMonth());
  const [internalDay, setInternalDay] = useState(now.getDate());

  const year = controlledYear ?? internalYear;
  const month = controlledMonth ?? internalMonth;
  const day = controlledDay ?? internalDay;

  const PrevIcon = useIcon("PanStart");
  const NextIcon = useIcon("PanEnd");

  const navigate = useCallback(
    (dy: number, dm: number) => {
      let newMonth = month + dm;
      let newYear = year + dy;
      while (newMonth < 0) {
        newMonth += 12;
        newYear--;
      }
      while (newMonth > 11) {
        newMonth -= 12;
        newYear++;
      }
      newYear = Math.max(1, Math.min(9999, newYear));
      if (!isControlled) {
        setInternalYear(newYear);
        setInternalMonth(newMonth);
      }
      onDaySelected?.(newYear, newMonth, Math.min(day, daysInMonth(newYear, newMonth)));
    },
    [year, month, day, isControlled, onDaySelected],
  );

  const selectDay = useCallback(
    (y: number, m: number, d: number) => {
      if (!isControlled) {
        setInternalYear(y);
        setInternalMonth(m);
        setInternalDay(d);
      }
      onDaySelected?.(y, m, d);
    },
    [isControlled, onDaySelected],
  );

  // Build the 6x7 day grid
  const grid = useMemo(() => {
    const days = daysInMonth(year, month);
    const first = firstDayOfMonth(year, month);
    const prevDays = daysInMonth(year, month === 0 ? 11 : month - 1);
    const cells: Array<{ day: number; month: number; year: number; otherMonth: boolean }> = [];

    // Previous month overflow
    for (let i = first - 1; i >= 0; i--) {
      const py = month === 0 ? year - 1 : year;
      const pm = month === 0 ? 11 : month - 1;
      cells.push({ day: prevDays - i, month: pm, year: py, otherMonth: true });
    }
    // Current month
    for (let d = 1; d <= days; d++) {
      cells.push({ day: d, month, year, otherMonth: false });
    }
    // Next month fill
    let nextDay = 1;
    const ny = month === 11 ? year + 1 : year;
    const nm = month === 11 ? 0 : month + 1;
    while (cells.length < 42) {
      cells.push({ day: nextDay++, month: nm, year: ny, otherMonth: true });
    }
    return cells;
  }, [year, month]);

  const today = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  const classes = ["gtk-calendar", "view", "gtk-box-layout", "vertical"];
  if (className) classes.push(className);

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      {showHeading && (
        <div className="gtk-header gtk-box-layout horizontal">
          <button className="gtk-button flat" type="button" onClick={() => navigate(0, -1)}>
            <span className="gtk-image">{PrevIcon && <PrevIcon size={16} />}</span>
          </button>
          <span className="gtk-label month">{MONTH_NAMES[month]}</span>
          <button
            className="gtk-button flat"
            type="button"
            data-hexpand="true"
            data-halign="start"
            onClick={() => navigate(0, 1)}
          >
            <span className="gtk-image">{NextIcon && <NextIcon size={16} />}</span>
          </button>
          <button className="gtk-button flat" type="button" onClick={() => navigate(-1, 0)}>
            <span className="gtk-image">{PrevIcon && <PrevIcon size={16} />}</span>
          </button>
          <span className="gtk-label year">{year}</span>
          <button className="gtk-button flat" type="button" onClick={() => navigate(1, 0)}>
            <span className="gtk-image">{NextIcon && <NextIcon size={16} />}</span>
          </button>
        </div>
      )}
      <div
        className="gtk-grid"
        role="grid"
        {...(showWeekNumbers ? { "data-week-numbers": "" } : {})}
      >
        {showDayNames && (
          <>
            {showWeekNumbers && <span className="gtk-label week-number" />}
            {DAY_NAMES.map((name) => (
              <span key={name} className="gtk-label day-name">
                {name}
              </span>
            ))}
          </>
        )}
        {Array.from({ length: 6 }, (_, row) => {
          const weekCells = grid.slice(row * 7, row * 7 + 7);
          const weekDate = new Date(weekCells[0]!.year, weekCells[0]!.month, weekCells[0]!.day);
          return (
            <React.Fragment key={row}>
              {showWeekNumbers && (
                <span className="gtk-label week-number">{getWeekNumber(weekDate)}</span>
              )}
              {weekCells.map((cell, col) => {
                const isToday = !cell.otherMonth && cell.day === today;
                const isSelected = !cell.otherMonth && cell.day === day;
                const cellClasses = ["gtk-label", "day-number"];
                if (cell.otherMonth) cellClasses.push("other-month");
                if (isToday) cellClasses.push("today");

                return (
                  <span
                    key={`${row}-${col}`}
                    className={cellClasses.join(" ")}
                    role="gridcell"
                    aria-selected={isSelected}
                    data-checked={isSelected || undefined}
                    onClick={() => selectDay(cell.year, cell.month, cell.day)}
                  >
                    {cell.day}
                  </span>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});
