import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemePickerProvider } from "@/components/gtk-demo/theme-picker-provider";
import {
  BASE_PATH,
  DEFAULT_CHOICE,
  themeScript,
  themeStylesheet,
} from "@/components/gtk-demo/theme-stylesheet";
import "./global.css";

export const metadata: Metadata = {
  title: "gtk-js — GTK4 & Adwaita for the Web",
  description: "Bringing the GNOME/GTK desktop UI ecosystem to web browsers via React.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Links the saved theme's stylesheet before the first paint; the
            previews' GtkProviders take it over (theme-stylesheet.ts). */}
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the site's own script */}
        <script dangerouslySetInnerHTML={{ __html: themeScript() }} />
        <noscript>
          <link rel="stylesheet" href={themeStylesheet(DEFAULT_CHOICE, "light", BASE_PATH).href} />
        </noscript>
      </head>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <ThemePickerProvider>{children}</ThemePickerProvider>
        </RootProvider>
      </body>
    </html>
  );
}
