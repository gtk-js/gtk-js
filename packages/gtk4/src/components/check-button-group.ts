import { useCallback, useLayoutEffect, useSyncExternalStore } from "react";

/**
 * Check button groups: the GtkCheckButtons sharing a `group` name, like the
 * buttons GTK links with gtk_check_button_set_group(). Only one of them is
 * active at a time, and the keyboard focus enters the group at its active
 * button and moves within it with the arrow keys.
 */

/** A check button in a group. */
export interface GroupMember {
  /** The check button's node. */
  element: HTMLElement | null;
  active: boolean;
  disabled: boolean;
  /** Activates the button, like gtk_widget_activate(). */
  activate(): void;
  /** Deactivates the button, like gtk_check_button_set_active(FALSE). */
  deactivate(): void;
}

interface Group {
  members: Set<GroupMember>;
  listeners: Set<() => void>;
}

const groups = new Map<string, Group>();

function groupNamed(name: string): Group {
  let group = groups.get(name);
  if (!group) {
    group = { members: new Set(), listeners: new Set() };
    groups.set(name, group);
  }
  return group;
}

function prune(name: string, group: Group) {
  if (group.members.size === 0 && group.listeners.size === 0 && groups.get(name) === group) {
    groups.delete(name);
  }
}

function notify(group: Group) {
  for (const listener of group.listeners) listener();
}

/** Adds `member` to the group `name`; returns a function that removes it. */
export function joinGroup(name: string, member: GroupMember): () => void {
  const group = groupNamed(name);
  group.members.add(member);
  notify(group);
  return () => {
    group.members.delete(member);
    notify(group);
    prune(name, group);
  };
}

/** The members of the group `name`. */
export function groupMembers(name: string): GroupMember[] {
  return [...(groups.get(name)?.members ?? [])];
}

/**
 * Deactivates the other members of `member`'s group, as
 * gtk_check_button_set_active(TRUE) does before it activates a grouped button.
 */
export function deactivateOthers(name: string, member: GroupMember) {
  for (const other of groupMembers(name)) {
    if (other !== member && other.active) other.deactivate();
  }
}

/**
 * Makes `member` a member of the group `name` while mounted, with its current
 * `active` and `disabled` state. Returns whether another member is active.
 */
export function useGroupMember(
  name: string | undefined,
  member: GroupMember,
  active: boolean,
  disabled: boolean,
): boolean {
  useLayoutEffect(() => (name == null ? undefined : joinGroup(name, member)), [name, member]);

  useLayoutEffect(() => {
    if (member.active === active && member.disabled === disabled) return;
    member.active = active;
    member.disabled = disabled;
    const group = name == null ? undefined : groups.get(name);
    if (group) notify(group);
  }, [name, member, active, disabled]);

  const subscribe = useCallback(
    (listener: () => void) => {
      if (name == null) return () => {};
      const group = groupNamed(name);
      group.listeners.add(listener);
      return () => {
        group.listeners.delete(listener);
        prune(name, group);
      };
    },
    [name],
  );

  return useSyncExternalStore(
    subscribe,
    () => name != null && groupMembers(name).some((m) => m !== member && m.active),
    () => false,
  );
}

export type FocusDirection = "left" | "right" | "up" | "down";

/** A box in page coordinates, like a DOMRect. */
export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * The member the keyboard focus moves to from `from` in `direction`, like
 * gtk_check_button_focus(): of the members beside `from` on the other axis and
 * not behind it, sorted along `direction` (gtk_widget_focus_sort()), the
 * first one after `from` that can take it. Null when there is none: the
 * focus doesn't wrap around.
 */
export function nextInDirection<T>(
  from: T,
  members: T[],
  direction: FocusDirection,
  box: (member: T) => Box,
  canFocus: (member: T) => boolean,
): T | null {
  const horizontal = direction === "left" || direction === "right";
  const reverse = direction === "left" || direction === "up";
  // [start, size] along the direction, and across it.
  const main = (b: Box): [number, number] => (horizontal ? [b.x, b.width] : [b.y, b.height]);
  const cross = (b: Box): [number, number] => (horizontal ? [b.y, b.height] : [b.x, b.width]);

  const [fromStart, fromSize] = main(box(from));
  const [fromCross, fromCrossSize] = cross(box(from));
  const edge = reverse ? fromStart : fromStart + fromSize;
  const crossCenter = fromCross + fromCrossSize / 2;

  const order = members.filter((m) => {
    if (m === from) return true;
    const [start, size] = main(box(m));
    const [crossStart, crossSize] = cross(box(m));
    if (crossStart + crossSize <= fromCross || crossStart >= fromCross + fromCrossSize)
      return false;
    return reverse ? start <= edge : start + size >= edge;
  });
  const center = (m: T) => {
    const [start, size] = main(box(m));
    return start + size / 2;
  };
  const distance = (m: T) => {
    const [start, size] = cross(box(m));
    return Math.abs(start + size / 2 - crossCenter);
  };
  order.sort((a, b) => (center(a) - center(b)) * (reverse ? -1 : 1) || distance(a) - distance(b));

  // From the one after `from`, or `from` itself when it's the last.
  const index = order.indexOf(from);
  const next = order.slice(Math.min(index + 1, order.length - 1)).find(canFocus);
  return next && next !== from ? next : null;
}
