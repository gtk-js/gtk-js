import { type ReactNode, useInsertionEffect, useMemo, version } from "react";

/**
 * React 19 hoists `<style href precedence>` into <head>, server HTML included,
 * once per href. React 18 renders it in place, so there it's injected instead.
 */
const HOISTS_STYLESHEETS = Number.parseInt(version, 10) >= 19;

/** How many mounted views use each injected stylesheet (React 18). */
const users = new Map<string, number>();

/**
 * A stylesheet in the document while a view uses it, once however many use
 * it: what the view renders (React 19) or injects (React 18). `getCSS` runs
 * when `href` or `key` changes.
 */
export function useStylesheet(
  href: string | null,
  getCSS: (() => string) | null,
  key: unknown,
): ReactNode {
  const css = useMemo(() => getCSS?.() ?? null, [href, key]);

  useInsertionEffect(() => {
    if (HOISTS_STYLESHEETS || !href || css === null) return;
    const id = href;
    users.set(id, (users.get(id) ?? 0) + 1);
    let style = document.getElementById(id);
    if (!style) {
      style = document.createElement("style");
      style.id = id;
      style.textContent = css;
      document.head.appendChild(style);
    }
    return () => {
      const count = (users.get(id) ?? 1) - 1;
      users.set(id, count);
      if (count === 0) {
        users.delete(id);
        document.getElementById(id)?.remove();
      }
    };
  }, [href, css]);

  if (!HOISTS_STYLESHEETS || !href || css === null) return null;
  return (
    <style href={href} precedence="gtk-js-sourceview">
      {css}
    </style>
  );
}
