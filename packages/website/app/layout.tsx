import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ThemePickerProvider } from "@/components/gtk-demo/theme-picker-provider";
import "./global.css";

export const metadata: Metadata = {
  title: "gtk-js — GTK4 & Adwaita for the Web",
  description: "Bringing the GNOME/GTK desktop UI ecosystem to web browsers via React.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>
          <ThemePickerProvider>{children}</ThemePickerProvider>
        </RootProvider>
      </body>
    </html>
  );
}
