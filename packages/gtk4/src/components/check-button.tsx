import React, {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import {
  deactivateOthers,
  type FocusDirection,
  type GroupMember,
  groupMembers,
  nextInDirection,
  useGroupMember,
} from "./check-button-group.ts";

export interface GtkCheckButtonProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether the check/radio is active. */
  active?: boolean;
  /** Text label displayed next to the indicator. */
  label?: string;
  /** Whether to show an indeterminate/dash state. */
  inconsistent?: boolean;
  /** Custom child widget (replaces label). */
  children?: ReactNode;
  /**
   * Group name — buttons with the same group act as radio buttons: activating
   * one deactivates the others.
   */
  group?: string;
  /** Whether the check button is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  /** Callback when active state changes. */
  onToggled?: (active: boolean) => void;
}

/** The arrow keys, which move the focus within a group (GtkWindow's move-focus bindings). */
const ARROW_DIRECTIONS: Record<string, FocusDirection> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

/**
 * GtkCheckButton — A checkbox or radio button widget.
 *
 * CSS node:
 *   checkbutton[.text-button][.grouped]
 *     ├── check (or radio if grouped)
 *     └── [label]
 *
 * Uses BoxLayout (horizontal flex with 4px gap).
 *
 * @see https://docs.gtk.org/gtk4/class.CheckButton.html
 */
export const GtkCheckButton = forwardRef<HTMLDivElement, GtkCheckButtonProps>(
  function GtkCheckButton(
    {
      active: controlledActive,
      label,
      inconsistent = false,
      children,
      group,
      disabled = false,
      onToggled,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onClick,
      onKeyDown,
      ...rest
    },
    ref,
  ) {
    const isControlled = controlledActive !== undefined;
    const [internalActive, setInternalActive] = useState(false);
    const active = isControlled ? controlledActive : internalActive;

    const isGrouped = group != null;
    // An empty label is no label (gtk_check_button_set_label()).
    const hasLabel = label != null && label !== "" && children == null;

    const rootRef = useRef<HTMLDivElement>(null);
    useImperativeHandle(ref, () => rootRef.current as HTMLDivElement);

    const [member] = useState<GroupMember>(() => ({
      element: null,
      active: false,
      disabled: false,
      activate() {},
      deactivate() {},
    }));
    const otherActive = useGroupMember(group, member, active, disabled);

    // Like gtk_check_button_set_active(): a grouped button first deactivates
    // the others.
    const setActive = (value: boolean) => {
      if (value === active) return;
      if (value && group != null) deactivateOthers(group, member);
      if (!isControlled) setInternalActive(value);
      onToggled?.(value);
    };

    // Like gtk_check_button_real_activate(): an active radio stays active.
    const activate = () => {
      if (disabled || (isGrouped && active)) return;
      setActive(!active);
    };

    useLayoutEffect(() => {
      member.element = rootRef.current;
      member.activate = activate;
      member.deactivate = () => setActive(false);
    });

    const classes = ["gtk-checkbutton", "gtk-box-layout", "horizontal"];
    if (hasLabel) classes.push("text-button");
    if (isGrouped) classes.push("grouped");
    if (className) classes.push(className);

    const indicatorClass = isGrouped ? "gtk-radio" : "gtk-check";

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // An insensitive widget gets no input (click_released_cb()).
      if (disabled) return;
      activate();
      onClick?.(e);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || disabled) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        activate();
        return;
      }
      // gtk_check_button_focus(): an arrow key focuses and activates the next
      // button of the group in its direction.
      const direction = ARROW_DIRECTIONS[e.key];
      if (group == null || !direction || e.altKey || e.shiftKey || e.metaKey) return;
      const next = nextInDirection(
        member,
        groupMembers(group),
        direction,
        (m) => m.element?.getBoundingClientRect() ?? { x: 0, y: 0, width: 0, height: 0 },
        (m) => !m.disabled && !!m.element?.getClientRects().length,
      );
      if (!next) return;
      e.preventDefault();
      next.element?.focus();
      next.activate();
    };

    // The focus enters a group at its active button (gtk_check_button_focus()),
    // and an insensitive button can't take it.
    const tabIndex = disabled ? undefined : !isGrouped || active || !otherActive ? 0 : -1;

    // The indicator takes the button's state (gtk_check_button_state_flags_changed()),
    // and the label its insensitivity.
    const stateAttrs = {
      "data-checked": active || undefined,
      "data-indeterminate": inconsistent || undefined,
      "data-disabled": disabled || undefined,
    };

    return (
      <div
        ref={rootRef}
        role={isGrouped ? "radio" : "checkbox"}
        aria-checked={inconsistent ? "mixed" : active}
        aria-disabled={disabled || undefined}
        tabIndex={tabIndex}
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        {...stateAttrs}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...rest}
      >
        {/* Centered, as gtk_check_button_init() aligns it. */}
        <span className={indicatorClass} {...alignAttrs("center", "center")} {...stateAttrs} />
        {children ??
          (hasLabel && (
            <span className="gtk-label" data-disabled={disabled || undefined}>
              {label}
            </span>
          ))}
      </div>
    );
  },
);
