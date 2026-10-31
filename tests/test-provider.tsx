import { AdwaitaProvider, GtkProvider } from "@gtk-js/adwaita";
import * as adwaitaIcons from "@gtk-js/icons-adwaita";
import { FluentTheme } from "@gtk-js/theme-fluent";
import type { ReactNode } from "react";

// $GTK_JS_TEST_THEME (passed on by tests/server.ts): the theme the native
// side loads too (configure_rendering() in tests/native/src/main.rs). Both
// keep Adwaita's icons, which aren't the theme's to style.
const theme =
  import.meta.env.VITE_GTK_JS_TEST_THEME === "fluent"
    ? new FluentTheme({ colorScheme: "light" })
    : null;

/** The cases' provider: Adwaita's, or $GTK_JS_TEST_THEME's. */
export function TestProvider({ children }: { children: ReactNode }) {
  if (!theme) return <AdwaitaProvider colorScheme="light">{children}</AdwaitaProvider>;
  return (
    <GtkProvider theme={theme} icons={adwaitaIcons}>
      {children}
    </GtkProvider>
  );
}
