// Unit tests — no Playwright/cargo preload needed.
import { GtkImage } from "@gtk-js/gtk4";
import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { AdwaitaProvider } from "./provider.tsx";

const AppIcon = createGtkIcon("app-icon", [["path", { d: "M 1" }]]);
const OpenMenu = createGtkIcon("app-open-menu", [["path", { d: "M 2" }]]);

test("the app's icons go over Adwaita's, which it keeps for the rest", () => {
  const html = renderToStaticMarkup(
    <AdwaitaProvider icons={{ AppIcon, OpenMenu }}>
      <GtkImage iconName="AppIcon" />
      <GtkImage iconName="OpenMenu" />
      <GtkImage iconName="SidebarShow" />
    </AdwaitaProvider>,
  );
  expect(html).toContain("gtk-icon-app-icon");
  // An app's icon replaces Adwaita's of the same name.
  expect(html).toContain("gtk-icon-app-open-menu");
  expect(html).not.toContain("gtk-icon-open-menu");
  // Adwaita's own, which GTK's fallback icons don't have.
  expect(html).toContain("gtk-icon-sidebar-show");
});
