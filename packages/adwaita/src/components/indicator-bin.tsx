import { type GtkAlign, GtkLabel } from "@gtk-js/gtk4";
import { type ReactNode, useLayoutEffect, useRef } from "react";

export interface AdwIndicatorBinProps {
  /** Whether the indicator asks for the user's attention. Default: false. */
  needsAttention?: boolean;
  /** Text of a badge on the child's corner; none when empty. Default: "". */
  badge?: string;
  halign?: GtkAlign;
  valign?: GtkAlign;
  children?: ReactNode;
}

/**
 * AdwIndicatorBin — Shows an unread indicator or a badge over its child's
 * corner, masking the child where they overlap. Private in libadwaita too:
 * AdwViewSwitcher's buttons wrap their icon in it.
 *
 * CSS node:
 *   indicatorbin[.needs-attention][.badge]
 *   ├── mask
 *   ├── indicator
 *   │   └── [label.numeric]
 *   └── [child]
 */
export function AdwIndicatorBin({
  needsAttention = false,
  badge = "",
  halign,
  valign,
  children,
}: AdwIndicatorBinProps) {
  const binRef = useRef<HTMLSpanElement>(null);
  const maskRef = useRef<HTMLSpanElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  // Like adw_indicator_bin_size_allocate(): the mask and the indicator get the
  // larger of their preferred sizes, over the child's top end corner.
  useLayoutEffect(() => {
    const bin = binRef.current;
    const mask = maskRef.current;
    const indicator = indicatorRef.current;
    if (!bin || !mask || !indicator) return;

    const allocate = () => {
      const measure = (el: HTMLElement) => {
        el.style.minWidth = el.style.minHeight = "";
        const cs = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        const marginX = px(cs.marginLeft) + px(cs.marginRight);
        const marginY = px(cs.marginTop) + px(cs.marginBottom);
        // The border box over the content box, for min-width / min-height.
        const extraX = rect.width - px(cs.width) + marginX;
        const extraY = rect.height - px(cs.height) + marginY;
        return {
          el,
          width: rect.width + marginX,
          height: rect.height + marginY,
          extraX,
          extraY,
        };
      };
      const parts = [measure(mask), measure(indicator)];
      const w = Math.max(...parts.map((p) => p.width));
      const h = Math.max(...parts.map((p) => p.height));

      const binStyle = getComputedStyle(bin);
      const width = bin.clientWidth - px(binStyle.paddingLeft) - px(binStyle.paddingRight);
      const x =
        w > width * 2 ? (width - w) / 2 : binStyle.direction === "rtl" ? -h / 2 : width - w + h / 2;
      const y = -h / 2;

      for (const { el, extraX, extraY } of parts) {
        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.minWidth = `${w - extraX}px`;
        el.style.minHeight = `${h - extraY}px`;
      }

      // The child is drawn with the mask's shape cut out of it
      // (gtk_snapshot_push_mask() with GSK_MASK_MODE_INVERTED_ALPHA).
      const child = [...bin.children].find((el) => el !== mask && el !== indicator);
      if (!child) return;
      const childRect = child.getBoundingClientRect();
      const maskRect = mask.getBoundingClientRect();
      const hx = maskRect.left - childRect.left;
      const hy = maskRect.top - childRect.top;
      const hw = maskRect.width;
      const hh = maskRect.height;
      const r = Math.min(px(getComputedStyle(mask).borderTopLeftRadius), hw / 2, hh / 2);
      const hole =
        `M${hx + r} ${hy}H${hx + hw - r}A${r} ${r} 0 0 1 ${hx + hw} ${hy + r}` +
        `V${hy + hh - r}A${r} ${r} 0 0 1 ${hx + hw - r} ${hy + hh}H${hx + r}` +
        `A${r} ${r} 0 0 1 ${hx} ${hy + hh - r}V${hy + r}A${r} ${r} 0 0 1 ${hx + r} ${hy}Z`;
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${childRect.width}" height="${childRect.height}">` +
        `<path fill-rule="evenodd" d="M0 0H${childRect.width}V${childRect.height}H0Z${hole}"/></svg>`;
      bin.style.setProperty(
        "--gtk-indicator-mask",
        `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      );
    };

    allocate();
    const observer = new ResizeObserver(allocate);
    observer.observe(bin);
    observer.observe(indicator);
    document.fonts?.addEventListener("loadingdone", allocate);
    return () => {
      observer.disconnect();
      document.fonts?.removeEventListener("loadingdone", allocate);
    };
  }, [needsAttention, badge]);

  const classes = ["gtk-indicatorbin", "gtk-bin-layout"];
  if (needsAttention) classes.push("needs-attention");
  if (badge) classes.push("badge");

  return (
    <span
      ref={binRef}
      className={classes.join(" ")}
      data-halign={halign && halign !== "fill" ? halign : undefined}
      data-valign={valign && valign !== "fill" ? valign : undefined}
    >
      <span ref={maskRef} className="gtk-mask" aria-hidden />
      <span ref={indicatorRef} className="gtk-indicator gtk-bin-layout">
        {badge && <GtkLabel label={badge} className="numeric" />}
      </span>
      {children}
    </span>
  );
}

function px(value: string): number {
  return parseFloat(value) || 0;
}

/** The badge for a number, like adw_get_badge_text(): none for 0, "999+" above 999. */
export function badgeText(badgeNumber = 0): string {
  if (badgeNumber > 999) return "999+";
  return badgeNumber ? String(badgeNumber) : "";
}
