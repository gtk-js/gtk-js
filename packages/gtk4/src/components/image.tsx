import { forwardRef, type HTMLAttributes } from "react";
import { useIcons } from "../icon-context.tsx";
import { alignAttrs, type GtkAlignProps, type GtkIconSize } from "../types.ts";

export interface GtkImageProps extends HTMLAttributes<HTMLSpanElement>, GtkAlignProps {
  /** Icon name loaded from the provider's icon set. Unknown names show `ImageMissing`, as in GTK. */
  iconName?: string;
  /** Explicit pixel size. Overrides iconSize when >= 0. Default: -1 (use iconSize). */
  pixelSize?: number;
  /** Symbolic size category. Default: "inherit". */
  iconSize?: GtkIconSize;
}

/**
 * GtkImage — A widget that displays an icon.
 *
 * CSS node: image[.normal-icons|.large-icons]
 *
 * @see https://docs.gtk.org/gtk4/class.Image.html
 */
export const GtkImage = forwardRef<HTMLSpanElement, GtkImageProps>(function GtkImage(
  { iconName, pixelSize = -1, iconSize = "inherit", halign, valign, className, ...rest },
  ref,
) {
  const icons = useIcons();
  // Like GtkIconTheme, a name the icon set doesn't have shows image-missing.
  const Icon = iconName ? (icons[iconName] ?? icons.ImageMissing) : undefined;

  const classes = ["gtk-image"];
  if (iconSize === "normal") classes.push("normal-icons");
  else if (iconSize === "large") classes.push("large-icons");
  if (className) classes.push(className);

  const size = pixelSize >= 0 ? pixelSize : iconSize === "large" ? 32 : 16;

  return (
    <span ref={ref} className={classes.join(" ")} {...alignAttrs(halign, valign)} {...rest}>
      {Icon && <Icon size={size} />}
    </span>
  );
});
