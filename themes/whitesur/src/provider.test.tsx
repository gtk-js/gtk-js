import { GtkHeaderBar, GtkImage, GtkWindow } from "@gtk-js/gtk4";
import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { WhiteSurProvider } from "./provider.tsx";

const AppIcon = createGtkIcon("app-icon", [["path", { d: "M 1" }]]);

test("WhiteSurProvider draws the theme's icons, with the app's own over them", () => {
  const html = renderToStaticMarkup(
    <WhiteSurProvider icons={{ AppIcon }}>
      <GtkImage iconName="ProcessWorking" />
      <GtkImage iconName="AppIcon" />
      <GtkImage iconName="NoSuchIcon" />
    </WhiteSurProvider>,
  );
  expect(html).toContain("gtk-icon-process-working");
  expect(html).toContain("gtk-icon-app-icon");
  // GtkIconTheme's full-color image-missing, the theme's own.
  expect(html).toContain("gtk-icon-image-missing");
});

test("WhiteSurProvider puts the window buttons in macOS's order, on the left", () => {
  const html = renderToStaticMarkup(
    <WhiteSurProvider>
      <GtkWindow titlebar={<GtkHeaderBar />} />
    </WhiteSurProvider>,
  );
  expect(html).toContain("gtk-windowcontrols gtk-box-layout horizontal start");
  expect(html).not.toContain("gtk-windowcontrols gtk-box-layout horizontal end");
  expect(html.indexOf('aria-label="Close"')).toBeLessThan(html.indexOf('aria-label="Maximize"'));
});
