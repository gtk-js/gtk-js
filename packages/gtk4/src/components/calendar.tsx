import {
  Fragment,
  forwardRef,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { GtkButton } from "./button.tsx";
import { GtkLabel } from "./label.tsx";
import { GtkStack, GtkStackPage } from "./stack.tsx";

export interface GtkCalendarProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Selected year (1-9999). Default: current year. */
  year?: number;
  /** Selected month (0-11). Default: current month. */
  month?: number;
  /** Selected day (1-31). Default: current day. */
  day?: number;
  /** Days of the shown month to mark (1-31), like gtk_calendar_mark_day(). */
  markedDays?: number[];
  /** Show month/year navigation header. Default: true. */
  showHeading?: boolean;
  /** Show day-of-week name row. Default: true. */
  showDayNames?: boolean;
  /** Show week number column. Default: false. */
  showWeekNumbers?: boolean;
  /** Whether the calendar is insensitive (disabled). Default: false. */
  disabled?: boolean;
  /**
   * Called when the user selects another day, by pressing it or with Space
   * (GtkCalendar::day-selected). Switching months or years selects no day.
   */
  onDaySelected?: (year: number, month: number, day: number) => void;
  /**
   * Called whenever the date changes, switching months and years too
   * (GtkCalendar:date). A controlled calendar stores this date.
   */
  onDateChanged?: (year: number, month: number, day: number) => void;
  /** Called when the user switches to the previous month (GtkCalendar::prev-month). */
  onPrevMonth?: () => void;
  /** Called when the user switches to the next month (GtkCalendar::next-month). */
  onNextMonth?: () => void;
  /** Called when the user switches to the previous year (GtkCalendar::prev-year). */
  onPrevYear?: () => void;
  /** Called when the user switches to the next year (GtkCalendar::next-year). */
  onNextYear?: () => void;
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

/** GDateTime's years, which GtkCalendar keeps to. */
const YEAR_MIN = 1;
const YEAR_MAX = 9999;

/** Wheel pixels that make a step: a notch is 50-120px, a touchpad's add up. */
const WHEEL_STEP_PIXELS = 50;

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

/** A day of the grid, of the previous (-1), shown (0) or next (1) month. */
export interface CalendarDay {
  day: number;
  month: -1 | 0 | 1;
}

/** A cell of the 6 × 7 days. */
export interface CalendarCell {
  row: number;
  col: number;
}

/** A date at UTC midnight, years 0-99 included (`new Date()` takes them for 1900-1999). */
function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date;
}

function daysInMonth(year: number, month: number): number {
  return utcDate(year, month + 1, 0).getUTCDate();
}

/** The ISO 8601 week, like week_of_year() (1 outside GDateTime's years). */
function weekOfYear(year: number, month: number, day: number): number {
  if (year < YEAR_MIN || year > YEAR_MAX) return 1;
  const date = utcDate(year, month, day);
  // A week belongs to the year of its Thursday.
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = utcDate(date.getUTCFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Some months later (or earlier), keeping the day in the month, like g_date_time_add_months(). */
export function addMonths({ year, month, day }: CalendarDate, months: number): CalendarDate {
  const total = year * 12 + month + months;
  const y = Math.floor(total / 12);
  const m = total - y * 12;
  return { year: y, month: m, day: Math.min(day, daysInMonth(y, m)) };
}

/**
 * The 42 days of the grid, like calendar_compute_days(): weeks start on
 * Sunday, and a month that starts on one has a week of the previous month
 * before it.
 */
export function calendarDays(year: number, month: number): CalendarDay[] {
  const first = utcDate(year, month, 1).getUTCDay() || 7;
  const previous = daysInMonth(year, month - 1);
  const days: CalendarDay[] = [];
  for (let col = 0; col < first; col++) {
    days.push({ day: previous - first + 1 + col, month: -1 });
  }
  for (let day = 1; day <= daysInMonth(year, month); day++) days.push({ day, month: 0 });
  for (let day = 1; days.length < 42; day++) days.push({ day, month: 1 });
  return days;
}

/**
 * Where an arrow key moves the cursor, like move_focus(): up and down stop at
 * the first and last weeks, left and right go on to the previous or next
 * week. Without a cursor, it starts in a corner.
 */
export function moveCursor(
  cursor: CalendarCell | null,
  key: "up" | "down" | "left" | "right",
  rtl = false,
): CalendarCell {
  let row = cursor?.row ?? -1;
  let col = cursor?.col ?? -1;
  if (key === "up") {
    if (row > 0) row--;
    if (row < 0) row = 5;
    if (col < 0) col = 6;
  } else if (key === "down") {
    if (row < 5) row++;
    if (col < 0) col = 0;
  } else if ((key === "left") !== rtl) {
    if (col > 0) col--;
    else if (row > 0) {
      col = 6;
      row--;
    }
    if (col < 0) col = 6;
    if (row < 0) row = 5;
  } else {
    if (col < 6) col++;
    else if (row < 5) {
      col = 0;
      row++;
    }
    if (col < 0) col = 0;
    if (row < 0) row = 0;
  }
  return { row, col };
}

const ARROW_KEYS: Record<string, "up" | "down" | "left" | "right"> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

/**
 * GtkCalendar — A calendar date picker widget.
 *
 * CSS node:
 *   calendar.view
 *     ├── header
 *     │   ├── button
 *     │   ├── stack.month
 *     │   ├── button
 *     │   ├── button
 *     │   ├── label.year
 *     │   ╰── button
 *     ╰── grid
 *         ╰── label[.day-name][.week-number][.day-number][.other-month][.today]
 *
 * @see https://docs.gtk.org/gtk4/class.Calendar.html
 */
export const GtkCalendar = forwardRef<HTMLDivElement, GtkCalendarProps>(function GtkCalendar(
  {
    year: yearProp,
    month: monthProp,
    day: dayProp,
    markedDays,
    showHeading = true,
    showDayNames = true,
    showWeekNumbers = false,
    disabled = false,
    onDaySelected,
    onDateChanged,
    onPrevMonth,
    onNextMonth,
    onPrevYear,
    onNextYear,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    onKeyDown,
    onMouseDown,
    ...rest
  },
  ref,
) {
  const rootRef = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

  const now = new Date();
  const [internal, setInternal] = useState<CalendarDate>(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  }));
  const date: CalendarDate = {
    year: yearProp ?? internal.year,
    month: monthProp ?? internal.month,
    day: dayProp ?? internal.day,
  };
  const { year, month, day } = date;
  // The keyboard cursor (focus_row, focus_col): none until a key or a press
  // puts it on a day. It keeps its cell when the month changes.
  const [cursor, setCursor] = useState<CalendarCell | null>(null);

  const days = calendarDays(year, month);
  // calendar_update_day_labels(): other months' days past GDateTime's years
  // are blank and insensitive.
  const lowerLimit = year === YEAR_MIN && month === 0;
  const upperLimit = year === YEAR_MAX && month === 11;
  const isBlank = (cell: CalendarDay) =>
    (cell.month < 0 && lowerLimit) || (cell.month > 0 && upperLimit);
  const today = now.getFullYear() === year && now.getMonth() === month ? now.getDate() : -1;

  /** calendar_select_day_internal(): reports a new date, and a selected day if the day changed. */
  function select(from: CalendarDate, to: CalendarDate, daySelected: boolean): CalendarDate {
    if (to.year === from.year && to.month === from.month && to.day === from.day) return from;
    setInternal(to);
    if (daySelected && to.day !== from.day) onDaySelected?.(to.year, to.month, to.day);
    onDateChanged?.(to.year, to.month, to.day);
    return to;
  }

  /** calendar_set_month_prev() and the like, never past GDateTime's years. */
  function navigate(from: CalendarDate, months: number, signal?: () => void) {
    const to = addMonths(from, months);
    if (to.year < YEAR_MIN || to.year > YEAR_MAX) return null;
    const next = select(from, to, false);
    signal?.();
    return next;
  }
  const prevMonth = (from = date) => navigate(from, -1, onPrevMonth);
  const nextMonth = (from = date) => navigate(from, 1, onNextMonth);
  const prevYear = (from = date) => navigate(from, -12, onPrevYear);
  const nextYear = (from = date) => navigate(from, 12, onNextYear);

  /**
   * A press or Space on a day: another month's day switches to its month
   * first. Then the day is selected and takes the cursor
   * (calendar_select_and_focus_day()).
   */
  function selectCell({ row, col }: CalendarCell) {
    const cell = days[row * 7 + col];
    if (!cell || isBlank(cell)) return;
    const from = cell.month < 0 ? prevMonth() : cell.month > 0 ? nextMonth() : date;
    if (!from) return;
    const index = calendarDays(from.year, from.month).findIndex(
      (d) => d.month === 0 && d.day === cell.day,
    );
    setCursor({ row: Math.floor(index / 7), col: index % 7 });
    select(from, { ...from, day: cell.day }, true);
  }

  // GtkGestureClick::pressed: the day is selected at the press.
  function handleDayPress(e: PointerEvent, cell: CalendarCell) {
    if (disabled || e.button !== 0) return;
    rootRef.current?.focus({ preventScroll: true }); // gtk_widget_grab_focus()
    selectCell(cell);
  }

  // Only a press on a day takes the focus (gtk_calendar_button_press()), and
  // one on a header button, as buttons do. Elsewhere it stays where it was.
  function handleMouseDown(e: MouseEvent<HTMLDivElement>) {
    onMouseDown?.(e);
    const target = e.target as Element;
    if (disabled || !target.closest(".day-number:not([data-disabled]), button:enabled")) {
      e.preventDefault();
    }
  }

  // gtk_calendar_key_controller_key_pressed(). The header buttons leave arrow
  // keys to it, but take Space themselves.
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(e);
    if (disabled || e.defaultPrevented) return;
    const arrow = ARROW_KEYS[e.key];
    if (arrow) {
      e.preventDefault();
      // With Ctrl (Cmd on macOS), the keys do what the arrow buttons do.
      if (e.ctrlKey || e.metaKey) {
        const buttons = { left: prevMonth, right: nextMonth, up: prevYear, down: nextYear };
        buttons[arrow]();
        return;
      }
      const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
      const next = moveCursor(cursor, arrow, rtl);
      // An insensitive day can't take the cursor.
      if (!isBlank(days[next.row * 7 + next.col]!)) setCursor(next);
    } else if (e.key === " " && e.target === e.currentTarget && cursor) {
      e.preventDefault();
      selectCell(cursor);
    }
  }

  // Scrolling switches months, a step per wheel notch (EventControllerScroll,
  // VERTICAL | DISCRETE). React's wheel listeners can't stop the page scrolling.
  const wheelDelta = useRef(0);
  const handleWheel = useRef<(e: WheelEvent) => void>(() => {});
  handleWheel.current = (e: WheelEvent) => {
    if (disabled || e.deltaY === 0) return;
    e.preventDefault();
    const step = Math.sign(e.deltaY);
    if (e.deltaMode === WheelEvent.DOM_DELTA_PIXEL) {
      if (Math.sign(wheelDelta.current) !== step) wheelDelta.current = 0;
      wheelDelta.current += e.deltaY;
      if (Math.abs(wheelDelta.current) < WHEEL_STEP_PIXELS) return;
      wheelDelta.current = 0;
    }
    rootRef.current?.focus({ preventScroll: true });
    if (step < 0) prevMonth();
    else nextMonth();
  };
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const listener = (e: WheelEvent) => handleWheel.current(e);
    root.addEventListener("wheel", listener, { passive: false });
    return () => root.removeEventListener("wheel", listener);
  }, []);

  const insensitive = disabled || undefined;

  /** The grid's labels. The sizer's copies are only measured: no states or input. */
  const gridLabels = (sizer: boolean) => (
    <>
      {showDayNames &&
        DAY_NAMES.map((name) => (
          <span key={name} className="gtk-label day-name" data-disabled={insensitive}>
            {name}
          </span>
        ))}
      {Array.from({ length: 6 }, (_, row) => {
        // A week's number is its last day's (week_of_year (…, day[i][6])).
        const last = days[row * 7 + 6]!;
        const lastMonth = addMonths({ year, month, day: 1 }, last.month);
        return (
          <Fragment key={row}>
            {showWeekNumbers && (
              <span className="gtk-label week-number" data-disabled={insensitive}>
                {weekOfYear(lastMonth.year, lastMonth.month, last.day)}
              </span>
            )}
            {days.slice(row * 7, row * 7 + 7).map((cell, col) => {
              const current = cell.month === 0;
              const blank = isBlank(cell);
              const classes = ["gtk-label", "day-number"];
              if (!current) classes.push("other-month");
              if (current && cell.day === today) classes.push("today");
              if (sizer) {
                return (
                  <span key={col} className={classes.join(" ")}>
                    {!blank && cell.day}
                  </span>
                );
              }
              return (
                <span
                  key={col}
                  className={classes.join(" ")}
                  role="gridcell"
                  aria-selected={current && cell.day === day}
                  aria-disabled={blank || insensitive}
                  data-checked={(current && markedDays?.includes(cell.day)) || undefined}
                  data-focus={(cursor?.row === row && cursor.col === col) || undefined}
                  data-disabled={blank || insensitive}
                  onPointerDown={(e) => handleDayPress(e, { row, col })}
                >
                  {!blank && cell.day}
                </span>
              );
            })}
          </Fragment>
        );
      })}
    </>
  );

  const classes = ["gtk-calendar", "view", "gtk-box-layout", "vertical"];
  if (className) classes.push(className);

  return (
    <div
      ref={rootRef}
      className={classes.join(" ")}
      tabIndex={disabled ? undefined : 0}
      aria-disabled={insensitive}
      data-disabled={insensitive}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
      {...rest}
    >
      {showHeading && (
        <div className="gtk-header gtk-box-layout horizontal" data-disabled={insensitive}>
          {/* calendar_update_navigation_buttons(): not past GDateTime's years. */}
          <GtkButton
            type="button"
            iconName="PanStart"
            tooltipText="Previous Month"
            disabled={disabled || lowerLimit}
            onClicked={() => prevMonth()}
          />
          <GtkStack
            className="month"
            visibleChildName={MONTH_NAMES[month]}
            data-disabled={insensitive}
          >
            {MONTH_NAMES.map((name) => (
              <GtkStackPage key={name} name={name}>
                <GtkLabel label={name} data-disabled={insensitive} />
              </GtkStackPage>
            ))}
          </GtkStack>
          <GtkButton
            type="button"
            iconName="PanEnd"
            tooltipText="Next Month"
            hexpand
            halign="start"
            disabled={disabled || upperLimit}
            onClicked={() => nextMonth()}
          />
          <GtkButton
            type="button"
            iconName="PanStart"
            tooltipText="Previous Year"
            disabled={disabled || year === YEAR_MIN}
            onClicked={() => prevYear()}
          />
          {/* At least as wide as this year (its text at init) + 10px, see layout.css. */}
          <GtkLabel
            className="year"
            label={String(year)}
            data-init-label={String(now.getFullYear())}
            data-disabled={insensitive}
          />
          <GtkButton
            type="button"
            iconName="PanEnd"
            tooltipText="Next Year"
            disabled={disabled || year === YEAR_MAX}
            onClicked={() => nextYear()}
          />
        </div>
      )}
      <div
        className="gtk-grid"
        role="grid"
        data-disabled={insensitive}
        {...(showWeekNumbers ? { "data-week-numbers": "" } : {})}
      >
        {gridLabels(false)}
      </div>
      {/* GtkGrid's homogeneous request, see layout.css. */}
      <div className="gtk-grid" data-sizer="" aria-hidden>
        {gridLabels(true)}
      </div>
    </div>
  );
});
