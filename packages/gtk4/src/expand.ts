/**
 * GtkWidget's computed expand, as gtk_widget_compute_expand() works it out.
 *
 * A widget expands when its hexpand/vexpand is set to true (data-hexpand /
 * data-vexpand). When it isn't set, the widget expands if it computes expand
 * from its children (it has a compute_expand vfunc: boxes, bins, buttons,
 * stacks, windows, …) and one of them expands. A GtkCenterBox, GtkMenuButton
 * or list row has no such vfunc, and a popover is a surface of its own.
 *
 * CSS can't follow that rule up the tree, so this keeps `data-computed-hexpand`
 * and `data-computed-vexpand` on the elements that expand, for layout.css.
 * Elements that aren't widgets (an app's own markup, say) pass their
 * children's expand on.
 *
 * The same pass writes the grid tracks of the boxes flexbox can't lay out
 * (see boxTracks()), from those flags alone: nothing is measured.
 */

/** Widgets without a compute_expand vfunc, in GTK and libadwaita. */
const KEEPS_OWN_EXPAND = [
  ".gtk-actionbar",
  ".gtk-avatar",
  ".gtk-banner",
  ".gtk-buttoncontent",
  ".gtk-calendar",
  ".gtk-center-layout", // GtkCenterBox
  ".gtk-checkbutton",
  ".gtk-dropdown",
  ".gtk-editablelabel",
  ".gtk-entry",
  ".gtk-headerbar",
  ".gtk-menubutton",
  ".gtk-navigation-split-view",
  ".gtk-row", // GtkListBoxRow and the rows built on it
  ".gtk-spinbutton",
  ".gtk-stackswitcher",
  ".gtk-textview",
  ".gtk-toggle-group",
  ".gtk-viewswitcher",
  ".gtk-windowhandle",
  ".gtk-windowtitle",
].join(", ");

/**
 * Children that don't count for their parent: a popover, and the parts of a
 * widget its compute_expand() leaves out, marked data-expand-ignored (a
 * GtkOverlay's overlays, a GtkFrame's or GtkExpander's label).
 */
const NOT_COUNTED = ".gtk-popover, [data-expand-ignored], [hidden]";

/** Elements that never hold widgets. */
const SKIPPED = "svg, template, script, style";

const AXES = [
  { set: "data-hexpand", computed: "data-computed-hexpand" },
  { set: "data-vexpand", computed: "data-computed-vexpand" },
] as const;

function computeExpand(element: Element, axis: (typeof AXES)[number]): boolean {
  const set = element.getAttribute(axis.set);
  if (set !== null) return set === "true";
  if (element.matches(KEEPS_OWN_EXPAND)) return false;
  for (const child of element.children) {
    if (child.hasAttribute(axis.computed) && !child.matches(NOT_COUNTED)) return true;
  }
  return false;
}

const NOT_FILL = ["start", "end", "center"];

/**
 * gtk_box_layout_allocate() gives every visible child its natural size (or
 * shrinks them towards their minimum), then each expanding child an equal
 * share of the extra space, in which the child is placed by its halign/valign.
 * Flexbox can't give a share to a child that doesn't grow, so a box with both
 * a filling and a non-filling expanding child becomes a grid (layout.css):
 * `auto` tracks for the expanding children, which grid stretches by equal
 * amounts, and natural-size tracks for the rest. Other boxes stay flexbox;
 * this returns null for them.
 */
function boxTracks(box: Element): string | null {
  const list = box.classList;
  if (list.contains("homogeneous")) return null;
  const horizontal = list.contains("horizontal");
  if (!horizontal && !list.contains("vertical")) return null;
  const axis = horizontal ? AXES[0] : AXES[1];
  const align = horizontal ? "data-halign" : "data-valign";
  // Most boxes have no expanding child with a non-fill alignment: find that
  // out first, with the cheapest checks.
  let child = box.firstElementChild;
  for (; child; child = child.nextElementSibling) {
    if (child.hasAttribute(axis.computed) && NOT_FILL.includes(child.getAttribute(align) ?? "")) {
      break;
    }
  }
  if (!child) return null;
  let fill = false;
  let notFill = false;
  for (child = box.firstElementChild; child; child = child.nextElementSibling) {
    if (!child.hasAttribute(axis.computed) || child.matches(NOT_COUNTED)) continue;
    if (NOT_FILL.includes(child.getAttribute(align) ?? "")) notFill = true;
    else fill = true;
  }
  if (!fill || !notFill) return null;
  const tracks: string[] = [];
  for (child = box.firstElementChild; child; child = child.nextElementSibling) {
    if (child.matches(NOT_COUNTED)) continue;
    tracks.push(child.hasAttribute(axis.computed) ? "auto" : "minmax(min-content, max-content)");
  }
  return tracks.join(" ");
}

function updateBoxTracks(box: Element): void {
  const tracks = boxTracks(box);
  if (tracks === null && !box.hasAttribute("data-box-tracks")) return;
  const style = (box as HTMLElement).style;
  if (tracks === null) {
    box.removeAttribute("data-box-tracks");
    style.removeProperty("--gtk-box-tracks");
  } else if (style.getPropertyValue("--gtk-box-tracks") !== tracks) {
    style.setProperty("--gtk-box-tracks", tracks);
    box.setAttribute("data-box-tracks", "");
  }
}

/** Updates the element's computed expand; returns whether it changed. */
function update(element: Element): boolean {
  let changed = false;
  for (const axis of AXES) {
    const expands = computeExpand(element, axis);
    if (expands !== element.hasAttribute(axis.computed)) {
      element.toggleAttribute(axis.computed, expands);
      changed = true;
    }
  }
  if (element.classList.contains("gtk-box-layout")) updateBoxTracks(element);
  return changed;
}

function updateTree(element: Element): void {
  if (element.matches(SKIPPED)) return;
  for (const child of element.children) updateTree(child);
  update(element);
}

/** Updates the element and its ancestors, as far as anything changes. */
function updateAncestry(element: Element): void {
  // A change to the element (its class, say) can change whether it counts
  // for its parent even when its own expand stays the same.
  update(element);
  for (let node = element.parentElement; node && update(node); node = node.parentElement);
}

let users = 0;
let observer: MutationObserver | null = null;

/** Keeps computed expand up to date in the document while it's in use; returns the release. */
export function trackExpand(): () => void {
  if (users++ === 0) {
    const root = document.documentElement;
    updateTree(root);
    observer = new MutationObserver((records) => {
      const changed = new Set<Element>();
      for (const record of records) {
        if (record.type === "childList") {
          for (const node of record.addedNodes) if (node instanceof Element) updateTree(node);
        }
        if (record.target instanceof Element) changed.add(record.target);
      }
      for (const element of changed) updateAncestry(element);
    });
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [
        "data-hexpand",
        "data-vexpand",
        "data-halign",
        "data-valign",
        "class",
        "hidden",
      ],
    });
  }
  return () => {
    if (--users === 0) {
      observer?.disconnect();
      observer = null;
    }
  };
}
