import { GtkHeaderBar, GtkImage, GtkWindow } from "@gtk-js/gtk4";
import { createGtkIcon } from "@gtk-js/icon-helpers";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { MacTahoeProvider } from "./provider.tsx";

const AppIcon = createGtkIcon("app-icon", [["path", { d: "M 1" }]]);

test("MacTahoeProvider draws the theme's icons, with the app's own over them", () => {
  const html = renderToStaticMarkup(
    <MacTahoeProvider icons={{ AppIcon }}>
      <GtkImage iconName="ProcessWorking" />
      <GtkImage iconName="AppIcon" />
      <GtkImage iconName="NoSuchIcon" />
    </MacTahoeProvider>,
  );
  expect(html).toContain("gtk-icon-process-working");
  expect(html).toContain("gtk-icon-app-icon");
  // GtkIconTheme's full-color image-missing, the theme's own.
  expect(html).toContain("gtk-icon-image-missing");
});

test("MacTahoeProvider puts the window buttons in macOS's order, on the left", () => {
  const html = renderToStaticMarkup(
    <MacTahoeProvider>
      <GtkWindow titlebar={<GtkHeaderBar />} />
    </MacTahoeProvider>,
  );
  expect(html).toContain("gtk-windowcontrols gtk-box-layout horizontal start");
  expect(html).not.toContain("gtk-windowcontrols gtk-box-layout horizontal end");
  expect(html.indexOf('aria-label="Close"')).toBeLessThan(html.indexOf('aria-label="Maximize"'));
});
