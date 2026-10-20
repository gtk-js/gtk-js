import { AdwaitaProvider, GtkLabel, GtkProvider } from "@gtk-js/adwaita";
import { createRoot, hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

declare global {
  interface Window {
    /** The provider's state in the first frame that has the theme CSS. */
    gateFirstFrame?: { ready: boolean; visibility: string };
    hydrate?: () => void;
  }
}

/** Records the provider's state in the frame where the theme CSS first applies. */
function probeFirstFrame() {
  // Added, or server-rendered and taken over (given its id) on hydration.
  const observer = new MutationObserver(() => {
    if (!document.getElementById("gtk-js-theme")) return;
    observer.disconnect();
    requestAnimationFrame(() => {
      const provider = document.querySelector("[data-gtk-provider]")!;
      window.gateFirstFrame = {
        ready: provider.hasAttribute("data-gtk-ready"),
        visibility: getComputedStyle(provider).visibility,
      };
    });
  });
  observer.observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["id"],
  });
}

export function render(page: string, container: HTMLElement) {
  if (page === "provider-gate-href") {
    // tests/cases/provider-gate.test.ts holds the stylesheet back.
    createRoot(container).render(
      <GtkProvider cssHref="/provider-gate.css">
        <GtkLabel label="Gated" />
      </GtkProvider>,
    );
    return;
  }
  const app = (
    <AdwaitaProvider colorScheme="light">
      <GtkLabel label="Gated" />
    </AdwaitaProvider>
  );
  probeFirstFrame();
  if (page === "provider-gate-ssr") {
    // Server-rendered HTML, hydrated when the test says so.
    container.innerHTML = renderToString(app);
    window.hydrate = () => hydrateRoot(container, app);
  } else {
    createRoot(container).render(app);
  }
}
