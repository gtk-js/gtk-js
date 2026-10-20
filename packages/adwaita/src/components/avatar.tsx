import { useIcon } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

export interface AdwAvatarProps extends HTMLAttributes<HTMLDivElement> {
  /** Text used to generate initials and color. */
  text?: string;
  /** Whether to show initials instead of icon. Default: false. */
  showInitials?: boolean;
  /** Fallback icon name. Default: "avatar-default-symbolic". */
  iconName?: string;
  /** Custom image element. */
  customImage?: ReactNode;
  /** Size in pixels. Default: 48. */
  size?: number;
}

// Number of avatar palettes in _avatar.scss (NUMBER_OF_COLORS in adw-avatar.c).
const NUMBER_OF_COLORS = 14;

const encoder = new TextEncoder();

// Matches GLib's g_str_hash: DJB2-add seeded at 5381 over the UTF-8 bytes read
// as signed chars, unsigned 32-bit result. adw-avatar.c:143 uses
// g_str_hash(text) % NUMBER_OF_COLORS directly.
function hashString(s: string): number {
  let hash = 5381;
  for (const byte of encoder.encode(s)) {
    hash = (hash * 33 + ((byte << 24) >> 24)) >>> 0;
  }
  return hash;
}

/**
 * The initials' font size in px, like update_font_size(): scales the label's
 * measured size (at its CSS font) to fit the largest square inside the
 * circle, minus a padding that grows with the avatar.
 */
export function initialsFontSize(width: number, height: number, size: number): number {
  const maxSize = size / 1.4142 - Math.max(size * 0.4 - 5, 0);
  return Math.min(Math.max((height * maxSize) / width, 0), maxSize);
}

function getInitials(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0]?.toUpperCase() ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]![0]?.toUpperCase() ?? "") : "";
  return first + second;
}

/**
 * AdwAvatar — A circular avatar widget.
 *
 * CSS nodes (adw-avatar.c): the widget itself (no name, GtkBinLayout), and a
 * child gizmo `avatar[.color1..color14][.contrasted][.image]` of the avatar's
 * size, centered in whatever the widget is allocated.
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.Avatar.html
 */
export const AdwAvatar = forwardRef<HTMLDivElement, AdwAvatarProps>(function AdwAvatar(
  { text = "", showInitials = false, iconName, customImage, size = 48, className, style, ...rest },
  ref,
) {
  // Without a text, upstream picks g_rand_int_range(1, NUMBER_OF_COLORS), i.e.
  // never the last color. Seed it from useId() so server and client agree.
  const id = useId();
  const colorClass = text
    ? (hashString(text) % NUMBER_OF_COLORS) + 1
    : (hashString(id) % (NUMBER_OF_COLORS - 1)) + 1;

  const initials = useMemo(() => getInitials(text), [text]);
  const labelRef = useRef<HTMLSpanElement>(null);
  const FallbackIcon = useIcon(iconName ?? "AvatarDefault");

  const showIcon = !customImage && (!showInitials || !initials);
  const showText = !customImage && showInitials && !!initials;

  // Like update_font_size(), on every text, size or font change.
  useLayoutEffect(() => {
    const label = labelRef.current;
    if (!label) return;
    let live = true;
    const fit = () => {
      if (!live) return;
      label.style.fontSize = "";
      // pango_layout_get_pixel_size() rounds the logical extents out.
      const rect = label.getBoundingClientRect();
      const width = Math.ceil(rect.width);
      const height = Math.ceil(rect.height);
      if (width) label.style.fontSize = `${initialsFontSize(width, height, size)}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    return () => {
      live = false;
    };
  }, [initials, size, showText]);

  const classes = ["gtk-avatar", `color${colorClass}`];
  if (size < 25) classes.push("contrasted");
  if (customImage) classes.push("image");

  // The colors, gradient, radius and weight come from the theme
  // (_avatar.scss), so .contrasted and .image can override the palette.
  const avatarStyle: React.CSSProperties = {
    width: size,
    height: size,
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <div
      ref={ref}
      role="img"
      aria-label={text ? `Avatar of ${text}` : undefined}
      className={className ? `gtk-bin-layout ${className}` : "gtk-bin-layout"}
      style={style}
      {...rest}
    >
      <div
        className={classes.join(" ")}
        data-halign="center"
        data-valign="center"
        style={avatarStyle}
      >
        {customImage}
        {showText && (
          <span ref={labelRef} className="gtk-label">
            {initials}
          </span>
        )}
        {showIcon && FallbackIcon && (
          <span className="gtk-image">
            <FallbackIcon size={Math.floor(size / 2)} />
          </span>
        )}
      </div>
    </div>
  );
});
