import type { AdwLengthUnit } from "./types.ts";

/**
 * adw_length_unit_to_px() at the default 96 dpi (text scaling factor 1),
 * where `sp` equals `px`.
 */
export function lengthUnitToPx(value: number, unit: AdwLengthUnit): number {
  return unit === "pt" ? (value * 96) / 72 : value;
}
