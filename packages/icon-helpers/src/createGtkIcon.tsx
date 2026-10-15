import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
  type SVGProps,
  useId,
  useMemo,
} from "react";

export interface GtkIconProps extends SVGProps<SVGSVGElement> {
  /** Icon size in pixels. Default: 16 (matches GTK's default symbolic icon size). */
  size?: number | string;
}

export type GtkIcon = ForwardRefExoticComponent<
  Omit<GtkIconProps, "ref"> & RefAttributes<SVGSVGElement>
>;

/**
 * Factory to create a GTK icon React component from SVG child nodes.
 *
 * GTK symbolic icons use `fill="currentColor"` so they inherit the
 * text color of their parent, matching native GTK behavior.
 */
export function createGtkIcon(
  displayName: string,
  children: [tag: string, attrs: Record<string, string>][],
): GtkIcon {
  const Component = forwardRef<SVGSVGElement, GtkIconProps>(
    ({ size = 16, className, ...props }, ref) => {
      return createElement(
        "svg",
        {
          ref,
          xmlns: "http://www.w3.org/2000/svg",
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          fill: "currentColor",
          className: className
            ? `gtk-icon gtk-icon-${displayName} ${className}`
            : `gtk-icon gtk-icon-${displayName}`,
          "aria-hidden": true,
          ...props,
        },
        ...children.map(([tag, attrs], i) => createElement(tag, { key: i, ...attrs })),
      );
    },
  );

  Component.displayName = displayName;
  return Component;
}

/**
 * Create an icon component from an image URL, for full-color icons such as an
 * application's own icon (an icon theme's `apps` icons): `createGtkIcon`'s
 * symbolic paths can't hold their gradients and layers. The image is scaled
 * to the icon size, like a scalable icon.
 */
export function createGtkIconFromUrl(displayName: string, url: string): GtkIcon {
  const Component = forwardRef<SVGSVGElement, GtkIconProps>(
    ({ size = 16, className, ...props }, ref) => {
      return createElement(
        "svg",
        {
          ref,
          xmlns: "http://www.w3.org/2000/svg",
          width: size,
          height: size,
          viewBox: "0 0 16 16",
          className: className
            ? `gtk-icon gtk-icon-${displayName} ${className}`
            : `gtk-icon gtk-icon-${displayName}`,
          "aria-hidden": true,
          ...props,
        },
        createElement("image", { href: url, width: 16, height: 16 }),
      );
    },
  );

  Component.displayName = displayName;
  return Component;
}

/**
 * Create an icon component from SVG source, for full-color icons such as an
 * application's own icon. Unlike createGtkIconFromUrl(), whose image loads
 * after the page is drawn and pops in, the icon is part of the document and
 * drawn with the widget showing it, as GTK loads an icon before drawing it.
 *
 * Only for trusted SVG, such as the app's own assets: the markup is inserted
 * as is. Its ids are prefixed for each icon drawn, so the gradients of two
 * icons (both often `id="a"`), or of one icon shown twice, don't clash:
 * `url(#a)` picks the first element with that id in the document, which may be
 * in a hidden page that isn't drawn.
 */
export function createGtkIconFromSvg(displayName: string, svg: string): GtkIcon {
  const root = svg.match(/<svg\b([^>]*)>([\s\S]*)<\/svg>/i);
  if (!root) throw new Error(`${displayName}: not an SVG document`);
  const attrs = root[1]!;
  const attr = (name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  const viewBox =
    attr("viewBox") ??
    `0 0 ${parseFloat(attr("width") ?? "16")} ${parseFloat(attr("height") ?? "16")}`;
  const content = root[2]!;
  const withPrefix = (prefix: string) =>
    content
      .replace(/\bid="([^"]+)"/g, `id="${prefix}$1"`)
      .replace(/url\((['"]?)#([^'")]+)\1\)/g, `url(#${prefix}$2)`)
      .replace(/\b((?:xlink:)?href)="#([^"]+)"/g, `$1="#${prefix}$2"`);

  const Component = forwardRef<SVGSVGElement, GtkIconProps>(
    ({ size = 16, className, ...props }, ref) => {
      const id = useId().replace(/[^\w-]/g, "");
      const markup = useMemo(() => withPrefix(`gtk-icon-${displayName}-${id}-`), [id]);
      return createElement("svg", {
        ref,
        xmlns: "http://www.w3.org/2000/svg",
        width: size,
        height: size,
        viewBox,
        className: className
          ? `gtk-icon gtk-icon-${displayName} ${className}`
          : `gtk-icon gtk-icon-${displayName}`,
        "aria-hidden": true,
        ...props,
        dangerouslySetInnerHTML: { __html: markup },
      });
    },
  );

  Component.displayName = displayName;
  return Component;
}
