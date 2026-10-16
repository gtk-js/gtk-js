import { useIcon } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, type ReactNode, useMemo } from "react";

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

// 14 color palettes: [font, gradientTop, gradientBottom]
const COLORS: [string, string, string][] = [
  ["#cfe1f5", "#83b6ec", "#337fdc"],
  ["#caeaf2", "#7ad9f1", "#0f9ac8"],
  ["#cef8d8", "#8de6b1", "#29ae74"],
  ["#e6f9d7", "#b5e98a", "#6ab85b"],
  ["#f9f4e1", "#f8e359", "#d29d09"],
  ["#ffead1", "#ffcb62", "#d68400"],
  ["#ffe5c5", "#ffa95a", "#ed5b00"],
  ["#f8d2ce", "#f78773", "#e62d42"],
  ["#fac7de", "#e973ab", "#e33b6a"],
  ["#e7c2e8", "#cb78d4", "#9945b5"],
  ["#d5d2f5", "#9e91e8", "#7a59ca"],
  ["#f2eade", "#e3cf9c", "#b08952"],
  ["#e5d6ca", "#be916d", "#785336"],
  ["#d8d7d3", "#c0bfbc", "#6e6d71"],
];

// Matches GLib's g_str_hash: DJB2-add seeded at 5381, unsigned 32-bit result.
// adw-avatar.c:143 uses g_str_hash(text) % NUMBER_OF_COLORS directly.
function hashString(s: string): number {
  let hash = 5381;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) + hash + s.charCodeAt(i)) >>> 0;
  }
  return hash;
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
  const colorIndex = useMemo(() => {
    if (!text) return Math.floor(Math.random() * 14);
    return hashString(text) % 14;
  }, [text]);

  const [fontColor, gradTop, gradBottom] = COLORS[colorIndex]!;
  const initials = useMemo(() => getInitials(text), [text]);
  const FallbackIcon = useIcon(iconName ?? "AvatarDefault");

  const showIcon = !customImage && (!showInitials || !initials);
  const showText = !customImage && showInitials && !!initials;

  const classes = ["gtk-avatar", `color${colorIndex + 1}`];
  if (size < 25) classes.push("contrasted");
  if (customImage) classes.push("image");

  const avatarStyle: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: "50%",
    overflow: "hidden",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundImage: customImage ? "none" : `linear-gradient(${gradTop}, ${gradBottom})`,
    color: fontColor,
    fontSize: size * 0.4,
    fontWeight: "bold",
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
        {showText && <span className="gtk-label">{initials}</span>}
        {showIcon && FallbackIcon && (
          <span className="gtk-image">
            <FallbackIcon size={Math.round(size * 0.5)} />
          </span>
        )}
      </div>
    </div>
  );
});
