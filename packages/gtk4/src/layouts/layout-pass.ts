/**
 * One layout pass for the layouts gtk-js works out in JS, like GTK's single
 * measure-then-allocate pass over the widget tree.
 *
 * Each layout that can't be CSS reads sizes and computed styles, then writes
 * styles. Done separately, from several ResizeObservers, every read after
 * another layout's write forces the browser to lay out the page again, so a
 * resize lays it out once per layout. Here, the layouts that need allocating
 * read first, all of them, while the page's layout is still the browser's own,
 * and only then write. A layout's read returns its writes.
 *
 * A pass runs after the shared ResizeObserver has delivered its entries, and
 * after the layout effects of a render (from a microtask), so before paint
 * either way. Writes that resize an observed element are delivered in the same
 * frame, deeper in the tree, for another pass, as ResizeObserver does.
 */

/** Reads what a layout needs, and returns its writes. */
export type LayoutRead = () => (() => void) | void;

type ResizeCallback = (entry: ResizeObserverEntry) => void;

const scheduled = new Set<LayoutRead>();
const callbacks = new Map<Element, Set<ResizeCallback>>();
let observer: ResizeObserver | null = null;
let delivering = false;
let flushQueued = false;

function runPass(): void {
  const reads = [...scheduled];
  scheduled.clear();
  const writes: (() => void)[] = [];
  for (const read of reads) {
    const write = read();
    if (write) writes.push(write);
  }
  for (const write of writes) write();
}

function deliver(entries: ResizeObserverEntry[]): void {
  delivering = true;
  try {
    for (const entry of entries) {
      for (const callback of callbacks.get(entry.target) ?? []) callback(entry);
    }
  } finally {
    delivering = false;
  }
  runPass();
}

/**
 * Runs `read` in the next layout pass, once however often it's scheduled
 * before then: the current one if the shared observer is delivering entries,
 * else one before paint.
 */
export function scheduleLayout(read: LayoutRead): void {
  scheduled.add(read);
  if (delivering || flushQueued) return;
  flushQueued = true;
  queueMicrotask(() => {
    flushQueued = false;
    runPass();
  });
}

/**
 * Calls `onResize` when `element` changes size, from one ResizeObserver for
 * all layouts. It should only note what changed and schedule the layout's
 * read with scheduleLayout(), which then runs in this resize's pass.
 * Returns a function that stops observing.
 */
export function observeSize(element: Element, onResize: ResizeCallback): () => void {
  observer ??= new ResizeObserver(deliver);
  let set = callbacks.get(element);
  if (!set) {
    set = new Set();
    callbacks.set(element, set);
    observer.observe(element);
  }
  set.add(onResize);
  return () => {
    const current = callbacks.get(element);
    if (!current?.delete(onResize) || current.size) return;
    callbacks.delete(element);
    observer?.unobserve(element);
    if (!callbacks.size) {
      observer?.disconnect();
      observer = null;
    }
  };
}
