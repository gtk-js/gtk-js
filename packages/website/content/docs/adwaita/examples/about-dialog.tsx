"use client";

import { AdwAboutDialog } from "@gtk-js/adwaita";
import { GtkButton, IconProvider, useIcons } from "@gtk-js/gtk4";
import { useMemo, useState } from "react";

// Modeled on libadwaita's demo (demo/pages/about/adw-demo-page-about.c).
const releaseNotes = `
<p>This release adds the following features:</p>
<ul>
  <li>Added a way to export fonts.</li>
  <li>Better support for <code>monospace</code> fonts.</li>
  <li>Added a way to preview <em>italic</em> text.</li>
  <li>Bug fixes and performance improvements.</li>
  <li>Translation updates.</li>
</ul>`;

const debugInfo = `Typeset 1.2.3 (org.example.Typeset)
Running inside Flatpak: yes
GTK 4.22.4, Libadwaita 1.8.4`;

export default function Example() {
  const [visible, setVisible] = useState(false);
  // App icons are looked up by name in the icon set, like any other icon:
  // register your apps' icons under their IDs (org.gnome.Adwaita1.Demo →
  // OrgGnomeAdwaita1Demo). Here, stand-ins that every icon set has.
  const icons = useIcons();
  const withAppIcons = useMemo(
    () => ({
      ...icons,
      OrgExampleTypeset: icons.AccessoriesTextEditor!,
      OrgGnomeAdwaita1Demo: icons.ApplicationsScience!,
    }),
    [icons],
  );

  return (
    <IconProvider value={withAppIcons}>
      <GtkButton label="About Typeset" onClick={() => setVisible(true)} />
      <AdwAboutDialog
        visible={visible}
        onClosed={() => setVisible(false)}
        applicationIcon="OrgExampleTypeset"
        applicationName="Typeset"
        developerName="Angela Avery"
        version="1.2.3"
        // What's New
        releaseNotesVersion="1.2.0"
        releaseNotes={releaseNotes}
        // Details: comments, website and extra links
        comments="Typeset is an app that doesn’t exist and is used as an example content for this about dialog."
        website="https://example.org"
        links={[{ title: "Documentation", url: "https://example.org/docs" }]}
        // Support Questions, Report an Issue, Troubleshooting
        supportUrl="https://example.org/support"
        issueUrl="https://example.org/issues"
        debugInfo={debugInfo}
        debugInfoFilename="typeset-debug-info.txt"
        // Credits ("Name <email>" or "Name https://…" rows link out)
        developers={["Angela Avery <angela@example.org>", "Ivan Ivanov https://example.org/ivan"]}
        artists={["GNOME Design Team"]}
        translatorCredits="Jane Doe <jane@example.org>"
        acknowledgementSections={[{ name: "Special thanks to", people: ["My cat"] }]}
        // Legal
        copyright="© 2022 Angela Avery"
        licenseType="LGPL-2.1-or-later"
        legalSections={[
          {
            title: "Fonts",
            copyright: "© 2010–2024 The Cantarell Authors",
            licenseType: "custom",
            license: "Licensed under the SIL Open Font License, Version 1.1.",
          },
        ]}
        // Other Apps by Angela Avery
        otherApps={[
          {
            appId: "org.gnome.Adwaita1.Demo",
            name: "Adwaita Demo",
            summary: "Tour of the features in Libadwaita",
          },
        ]}
      />
    </IconProvider>
  );
}
