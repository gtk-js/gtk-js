"use client";

import { GtkBox, GtkButton, GtkLabel, GtkPopover, tooltipAttrs } from "@gtk-js/gtk4";
import { ApplicationsSystem } from "@gtk-js/icons-adwaita";
import { useRef, useState } from "react";
import {
  ADWAITA_ACCENT_PRESETS,
  FLUENT_ACCENT_PRESETS,
  THEME_LABELS,
  type ThemePickerState,
} from "./use-theme-picker";

type ThemeControlsProps = Omit<ThemePickerState, "cssHref" | "cssText" | "icons" | "restored">;

function AccentPicker({
  presets,
  value,
  onChange,
}: {
  presets: string[];
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <GtkBox spacing={6} style={{ flexWrap: "wrap" }}>
      {presets.map((color) => (
        <button
          key={color}
          type="button"
          // A GTK tooltip, like the widgets' tooltipText.
          {...tooltipAttrs(color)}
          aria-label={color}
          aria-pressed={value === color}
          onClick={() => onChange(color)}
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            border: value === color ? "2px solid white" : "2px solid transparent",
            boxShadow: value === color ? `0 0 0 2px ${color}` : "none",
            background: color,
            cursor: "pointer",
            padding: 0,
            transition: "box-shadow 150ms",
          }}
        />
      ))}
    </GtkBox>
  );
}

export function ThemeControls({
  themeName,
  setThemeName,
  colorScheme,
  setColorScheme,
  adwaitaAccent,
  setAdwaitaAccent,
  fluentAccent,
  setFluentAccent,
  preloadOptions,
}: ThemeControlsProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const themes = [
    { label: "Linux", names: ["adwaita"] as const },
    { label: "macOS", names: ["whitesur", "mactahoe"] as const },
    { label: "Windows", names: ["fluent"] as const },
  ];

  return (
    <div style={{ position: "relative" }}>
      <GtkButton
        ref={btnRef}
        hasFrame={false}
        onClicked={() => {
          if (!open) preloadOptions();
          setOpen(!open);
        }}
      >
        <ApplicationsSystem size={20} />
      </GtkButton>
      <GtkPopover
        visible={open}
        onClosed={() => setOpen(false)}
        anchorRef={btnRef}
        position="bottom"
        style={{ minWidth: 280 }}
      >
        <GtkBox orientation="vertical" spacing={12} style={{ padding: 12 }}>
          {/* Theme picker */}
          <GtkBox orientation="vertical" spacing={6}>
            <GtkLabel label="Theme" className="heading" />
            <GtkBox spacing={12}>
              {themes.map(({ label, names }) => (
                <GtkBox key={label} orientation="vertical" spacing={4}>
                  <GtkLabel label={label} className="caption-heading dimmed" />
                  <GtkBox spacing={4}>
                    {names.map((t) => (
                      <GtkButton
                        key={t}
                        label={THEME_LABELS[t]}
                        className={themeName === t ? "suggested-action" : ""}
                        onClicked={() => setThemeName(t)}
                      />
                    ))}
                  </GtkBox>
                </GtkBox>
              ))}
            </GtkBox>
          </GtkBox>

          {/* Color scheme */}
          <GtkBox orientation="vertical" spacing={6}>
            <GtkLabel label="Mode" className="caption-heading dimmed" />
            <GtkBox spacing={6}>
              {(["auto", "light", "dark"] as const).map((s) => (
                <GtkButton
                  key={s}
                  label={s.charAt(0).toUpperCase() + s.slice(1)}
                  className={colorScheme === s ? "suggested-action" : ""}
                  onClicked={() => setColorScheme(s)}
                />
              ))}
            </GtkBox>
          </GtkBox>

          {/* Accent (Adwaita only) */}
          {themeName === "adwaita" && (
            <GtkBox orientation="vertical" spacing={6}>
              <GtkLabel label="Accent" className="caption-heading dimmed" />
              <AccentPicker
                presets={ADWAITA_ACCENT_PRESETS}
                value={adwaitaAccent}
                onChange={setAdwaitaAccent}
              />
            </GtkBox>
          )}

          {/* Accent (Fluent: Windows' accent color) */}
          {themeName === "fluent" && (
            <GtkBox orientation="vertical" spacing={6}>
              <GtkLabel label="Accent" className="caption-heading dimmed" />
              <AccentPicker
                presets={FLUENT_ACCENT_PRESETS}
                value={fluentAccent}
                onChange={setFluentAccent}
              />
            </GtkBox>
          )}
        </GtkBox>
      </GtkPopover>
    </div>
  );
}
