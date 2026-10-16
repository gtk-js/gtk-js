// Unit tests — no Playwright/cargo preload needed.

import { IconProvider } from "@gtk-js/gtk4";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vite-plus/test";
import { AdwDialog } from "./dialog.tsx";
import { AdwHeaderBar } from "./header-bar.tsx";
import { AdwNavigationView } from "./navigation-view.tsx";

const render = (node: React.ReactNode) =>
  renderToStaticMarkup(<IconProvider value={{} as never}>{node}</IconProvider>);
const titles = (html: string) =>
  [...html.matchAll(/class="gtk-label title"[^>]*>(?:<span[^>]*>)?([^<]*)</g)].map((m) => m[1]);

test("without a title widget, a header bar shows its page's title, like update_title()", () => {
  const html = render(
    <AdwNavigationView
      stack={["folders", "folder"]}
      pages={[
        { tag: "folders", title: "Folders", children: <AdwHeaderBar /> },
        { tag: "folder", title: "Documents", children: <AdwHeaderBar /> },
      ]}
    />,
  );
  expect(titles(html)).toEqual(["Folders", "Documents"]);
});

test("a dialog's header bar shows the dialog's title, not the presenting page's", () => {
  const html = render(
    <AdwNavigationView
      pages={[
        {
          tag: "home",
          title: "Home",
          children: (
            <AdwDialog visible portal={false} title="Preferences">
              <AdwHeaderBar />
            </AdwDialog>
          ),
        },
      ]}
    />,
  );
  expect(titles(html)).toEqual(["Preferences"]);
});

test("a title widget replaces the title, and a header bar elsewhere shows none", () => {
  expect(titles(render(<AdwHeaderBar titleWidget={<span>Custom</span>} />))).toEqual([]);
  expect(render(<AdwHeaderBar />)).not.toContain('class="gtk-label title"');
});
