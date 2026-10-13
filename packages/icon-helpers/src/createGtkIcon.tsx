import {
  createElement,
  type ForwardRefExoticComponent,
  forwardRef,
  type RefAttributes,
  type SVGProps,
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
