import {
  forwardRef,
  type RefObject,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { activateWidget, useMnemonicActivate } from "../mnemonic.tsx";
import { GtkButton, type GtkButtonProps } from "./button.tsx";

export interface GtkToggleButtonProps extends GtkButtonProps {
  /** Whether the button is pressed in. */
  active?: boolean;
  /** Callback when toggle state changes. */
  onToggled?: (active: boolean) => void;
  /**
   * Another GtkToggleButton to form a group with: only one button of a group
   * is active at a time, and clicking the active one leaves it active.
   */
  group?: RefObject<HTMLButtonElement | null>;
}

/** A mounted toggle button, for its group (gtk_toggle_button_set_group()). */
interface Member {
  element: HTMLButtonElement | null;
  group: RefObject<HTMLButtonElement | null> | undefined;
  active: boolean;
  /** gtk_toggle_button_set_active(FALSE) */
  deactivate(): void;
}

const members = new Set<Member>();

/** A group goes by the button the others point at. */
const groupOf = (member: Member) => member.group?.current ?? member.element;

/** The other buttons in `member`'s group. */
function groupMates(member: Member): Member[] {
  const group = groupOf(member);
  return group ? [...members].filter((m) => m !== member && groupOf(m) === group) : [];
}

function deactivateMates(member: Member) {
  for (const mate of groupMates(member)) if (mate.active) mate.deactivate();
}

/**
 * GtkToggleButton — A button that retains its pressed state.
 *
 * CSS node: button.toggle[:checked]
 *
 * @see https://docs.gtk.org/gtk4/class.ToggleButton.html
 */
export const GtkToggleButton = forwardRef<HTMLButtonElement, GtkToggleButtonProps>(
  function GtkToggleButton(
    { active: controlledActive, onToggled, group, onClicked, className, ...rest },
    ref,
  ) {
    const buttonRef = useRef<HTMLButtonElement>(null);
    useImperativeHandle(ref, () => buttonRef.current as HTMLButtonElement);

    const isControlled = controlledActive !== undefined;
    const [internalActive, setInternalActive] = useState(false);
    const active = isControlled ? controlledActive : internalActive;

    const [member] = useState<Member>(() => ({
      element: null,
      group: undefined,
      active: false,
      deactivate() {},
    }));

    // gtk_toggle_button_set_active(): a grouped button deactivates the others
    // before it becomes active.
    const setActive = (value: boolean) => {
      if (value === active) return;
      if (value) deactivateMates(member);
      if (!isControlled) setInternalActive(value);
      onToggled?.(value);
    };

    useLayoutEffect(() => {
      member.element = buttonRef.current;
      member.group = group;
      member.active = active;
      member.deactivate = () => setActive(false);
    });

    useLayoutEffect(() => {
      members.add(member);
      return () => {
        members.delete(member);
      };
    }, [member]);

    // So does an `active` the app sets.
    const wasActive = useRef(active);
    useEffect(() => {
      if (active && !wasActive.current) deactivateMates(member);
      wasActive.current = active;
    }, [active, member]);

    // gtk_toggle_button_mnemonic_activate(): a mnemonic focuses the button
    // too, and activates it unless other widgets share the key.
    useMnemonicActivate(buttonRef, (groupCycling) => {
      buttonRef.current?.focus();
      if (!groupCycling) activateWidget(buttonRef.current);
    });

    // gtk_toggle_button_clicked(): the active button of a group stays active.
    const handleClicked = () => {
      if (!active || groupMates(member).length === 0) setActive(!active);
      onClicked?.();
    };

    return (
      <GtkButton
        ref={buttonRef}
        className={className ? `toggle ${className}` : "toggle"}
        aria-pressed={active}
        data-checked={active || undefined}
        onClicked={handleClicked}
        {...rest}
      />
    );
  },
);
