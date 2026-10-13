import { GtkImage, useIcon, WindowControlsContext } from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AdwActionRow } from "./action-row.tsx";
import { FloatingSheet } from "./floating-sheet.tsx";
import { AdwHeaderBar } from "./header-bar.tsx";
import { AdwNavigationView } from "./navigation-view.tsx";
import { AdwPreferencesGroup } from "./preferences-group.tsx";
import { AdwToolbarView } from "./toolbar-view.tsx";

export interface AdwAboutDialogProps extends HTMLAttributes<HTMLDivElement> {
  applicationName: string;
  applicationIcon?: string;
  developerName?: string;
  version?: string;
  /** Release notes in AppStream description markup (`<p>`, `<ul>`, `<ol>`, `<li>`, `<em>`, `<code>`). */
  releaseNotes?: string;
  releaseNotesVersion?: string;
  comments?: string;
  website?: string;
  supportUrl?: string;
  issueUrl?: string;
  debugInfo?: string;
  debugInfoFilename?: string;
  copyright?: string;
  /** SPDX identifier of a well known license (e.g. "GPL-3.0-or-later"). */
  licenseType?: string;
  license?: string;
  developers?: string[];
  designers?: string[];
  artists?: string[];
  documenters?: string[];
  translatorCredits?: string;
  visible?: boolean;
  portal?: boolean | HTMLElement;
  onClosed?: () => void;
  /** Open external links. Defaults to `window.open(url, "_blank")`. */
  onOpenUrl?: (url: string) => void;
}

/** Well known licenses, as GtkLicense names them in AdwAboutDialog's legal page. */
const LICENSES: Record<string, { title: string; url: string }> = {
  "GPL-2.0-or-later": {
    title: "GNU General Public License, version 2 or later",
    url: "https://www.gnu.org/licenses/old-licenses/gpl-2.0.html",
  },
  "GPL-3.0-or-later": {
    title: "GNU General Public License, version 3 or later",
    url: "https://www.gnu.org/licenses/gpl-3.0.html",
  },
  "GPL-3.0-only": {
    title: "GNU General Public License, version 3 only",
    url: "https://www.gnu.org/licenses/gpl-3.0.html",
  },
  "LGPL-2.1-or-later": {
    title: "GNU Lesser General Public License, version 2.1 or later",
    url: "https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html",
  },
  "LGPL-3.0-or-later": {
    title: "GNU Lesser General Public License, version 3 or later",
    url: "https://www.gnu.org/licenses/lgpl-3.0.html",
  },
  "AGPL-3.0-or-later": {
    title: "GNU Affero General Public License, version 3 or later",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  "MPL-2.0": {
    title: "Mozilla Public License 2.0",
    url: "https://opensource.org/licenses/MPL-2.0",
  },
  "Apache-2.0": {
    title: "Apache License, Version 2.0",
    url: "https://opensource.org/licenses/Apache-2.0",
  },
  MIT: { title: "MIT License", url: "https://opensource.org/licenses/mit-license.php" },
  "BSD-3-Clause": {
    title: "BSD 3-Clause License",
    url: "https://opensource.org/licenses/BSD-3-Clause",
  },
};

/** Parse "Name https://url" / "Name <email>" credit entries like upstream. */
function parseCredit(entry: string): { name: string; link?: string } {
  const email = entry.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (email) return { name: email[1]!, link: `mailto:${email[2]}` };
  const url = entry.match(/^(.*?)\s+(https?:\/\/\S+)\s*$/);
  if (url) return { name: url[1]!, link: url[2] };
  return { name: entry };
}

/**
 * Render the AppStream description subset used for release notes. Text is
 * produced through React (never as raw HTML), so markup can't inject anything.
 */
function ReleaseNotes({ markup }: { markup: string }) {
  const nodes = useMemo(() => {
    if (typeof DOMParser === "undefined") return [<p key="0">{markup}</p>];
    const doc = new DOMParser().parseFromString(`<root>${markup}</root>`, "application/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return [<p key="0">{markup.replace(/<[^>]+>/g, "")}</p>];
    }
    const render = (node: Node, key: number): ReactNode => {
      if (node.nodeType === 3) return node.textContent;
      if (node.nodeType !== 1) return null;
      const el = node as Element;
      const children = Array.from(el.childNodes).map(render);
      switch (el.tagName.toLowerCase()) {
        case "p":
          return (
            <p key={key} style={{ margin: "0 0 12px" }}>
              {children}
            </p>
          );
        case "ul":
          return (
            <ul key={key} style={{ margin: "0 0 12px", paddingInlineStart: 24, listStyle: "disc" }}>
              {children}
            </ul>
          );
        case "ol":
          return (
            <ol
              key={key}
              style={{ margin: "0 0 12px", paddingInlineStart: 24, listStyle: "decimal" }}
            >
              {children}
            </ol>
          );
        case "li":
          return (
            // listStyle: the reset gives every element `list-style: none`.
            <li key={key} style={{ display: "list-item", listStyle: "inherit", marginBottom: 6 }}>
              {children}
            </li>
          );
        case "em":
          return <em key={key}>{children}</em>;
        case "code":
          return <code key={key}>{children}</code>;
        default:
          return <span key={key}>{children}</span>;
      }
    };
    return Array.from(doc.documentElement.childNodes).map(render);
  }, [markup]);
  return (
    <div className="gtk-label body release-notes" style={{ whiteSpace: "normal", lineHeight: 1.5 }}>
      {nodes}
    </div>
  );
}

function Subpage({ children }: { children: ReactNode }) {
  return (
    <div className="gtk-scrolledwindow subpage" style={{ overflow: "auto", height: "100%" }}>
      <div className="gtk-viewport">
        <div className="gtk-clamp" style={{ maxWidth: 600, margin: "0 auto" }}>
          <div className="gtk-box gtk-box-layout vertical" style={{ gap: 18 }}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function NavRow({ title, onActivated }: { title: string; onActivated: () => void }) {
  return (
    <AdwActionRow
      title={title}
      activatable
      onActivated={onActivated}
      suffixWidget={<GtkImage iconName="GoNext" />}
    />
  );
}

function LinkRow({
  title,
  url,
  open,
}: {
  title: string;
  url: string;
  open: (url: string) => void;
}) {
  return (
    <AdwActionRow
      title={title}
      activatable
      tooltipText={url}
      onActivated={() => open(url)}
      suffixWidget={<GtkImage iconName="AdwExternalLink" />}
    />
  );
}

/**
 * AdwAboutDialog — An about dialog for applications.
 *
 * Mirrors upstream's template: a navigation view whose main page shows the
 * icon, name, developer and version, followed by What's New, Details,
 * Website, Support, Issues, Troubleshooting, Credits and Legal rows that link
 * out or open subpages.
 *
 * CSS node: dialog.about
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.AboutDialog.html
 * @see upstream/libadwaita/src/adw-about-dialog.ui
 */
export const AdwAboutDialog = forwardRef<HTMLDivElement, AdwAboutDialogProps>(
  function AdwAboutDialog(
    {
      applicationName,
      applicationIcon,
      developerName,
      version,
      releaseNotes,
      releaseNotesVersion,
      comments,
      website,
      supportUrl,
      issueUrl,
      debugInfo,
      debugInfoFilename,
      copyright,
      licenseType,
      license,
      developers,
      designers,
      artists,
      documenters,
      translatorCredits,
      visible = false,
      portal = false,
      onClosed,
      onOpenUrl,
      className,
      ...rest
    },
    ref,
  ) {
    const AppIcon = useIcon(applicationIcon ?? "");
    const [stack, setStack] = useState<string[]>(["main"]);
    const [copied, setCopied] = useState(false);

    const close = useCallback(() => onClosed?.(), [onClosed]);
    const open = useCallback(
      (url: string) => (onOpenUrl ? onOpenUrl(url) : window.open(url, "_blank", "noopener")),
      [onOpenUrl],
    );
    const push = (tag: string) => setStack((s) => [...s, tag]);

    // Return to the main page whenever the dialog is presented again.
    useEffect(() => {
      if (visible) setStack(["main"]);
    }, [visible]);

    useEffect(() => {
      if (!visible) return;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !e.defaultPrevented) close();
      };
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }, [visible, close]);

    const controls = useMemo(() => ({ close, decorationLayout: ":close" }), [close]);

    const hasCredits = Boolean(
      developers?.length ||
        designers?.length ||
        artists?.length ||
        documenters?.length ||
        translatorCredits,
    );
    const knownLicense = licenseType ? LICENSES[licenseType] : undefined;
    const hasLegal = Boolean(copyright || license || licenseType);
    const hasDetails = Boolean(comments);

    const header = <AdwHeaderBar className="flat" titleWidget={<span />} />;
    const page = (content: ReactNode) => (
      <AdwToolbarView style={{ height: "100%" }} topBars={header} content={content} />
    );

    const creditSection = (title: string, people?: string[]) =>
      people && people.length > 0 ? (
        <AdwPreferencesGroup title={title}>
          {people.map((entry) => {
            const { name, link } = parseCredit(entry);
            return link ? (
              <LinkRow key={entry} title={name} url={link} open={open} />
            ) : (
              <AdwActionRow key={entry} title={name} />
            );
          })}
        </AdwPreferencesGroup>
      ) : null;

    const mainPage = page(
      <div className="gtk-scrolledwindow main-page" style={{ overflow: "auto", height: "100%" }}>
        <div className="gtk-viewport">
          <div className="gtk-clamp" style={{ maxWidth: 600, margin: "0 auto" }}>
            <div
              className="gtk-box gtk-box-layout vertical"
              style={{ alignItems: "stretch", textAlign: "center" }}
            >
              {AppIcon && (
                <span
                  className="gtk-image icon-dropshadow"
                  style={{ display: "inline-flex", alignSelf: "center" }}
                >
                  <AppIcon size={128} />
                </span>
              )}
              <span
                className="gtk-label title-1"
                style={{ whiteSpace: "normal", justifyContent: "center", textAlign: "center" }}
              >
                {applicationName}
              </span>
              {developerName && (
                <span
                  className="gtk-label"
                  style={{ justifyContent: "center", textAlign: "center" }}
                >
                  {developerName}
                </span>
              )}
              {version && (
                <button
                  type="button"
                  className="gtk-button app-version"
                  style={{ alignSelf: "center" }}
                  title={copied ? "Copied to clipboard" : "Copy version"}
                  onClick={() => {
                    void navigator.clipboard?.writeText(version);
                    setCopied(true);
                  }}
                >
                  <span className="gtk-label">{version}</span>
                </button>
              )}
              <div className="gtk-box gtk-box-layout vertical" style={{ textAlign: "start" }}>
                {(releaseNotes || hasDetails || website) && (
                  <AdwPreferencesGroup>
                    {releaseNotes && (
                      <NavRow title="What’s New" onActivated={() => push("whats-new")} />
                    )}
                    {hasDetails && <NavRow title="Details" onActivated={() => push("details")} />}
                    {website && !hasDetails && (
                      <LinkRow title="Website" url={website} open={open} />
                    )}
                  </AdwPreferencesGroup>
                )}
                {(supportUrl || issueUrl || debugInfo) && (
                  <AdwPreferencesGroup>
                    {supportUrl && (
                      <LinkRow title="Support Questions" url={supportUrl} open={open} />
                    )}
                    {issueUrl && <LinkRow title="Report an Issue" url={issueUrl} open={open} />}
                    {debugInfo && (
                      <NavRow title="Troubleshooting" onActivated={() => push("troubleshooting")} />
                    )}
                  </AdwPreferencesGroup>
                )}
                {(hasCredits || hasLegal) && (
                  <AdwPreferencesGroup>
                    {hasCredits && <NavRow title="Credits" onActivated={() => push("credits")} />}
                    {hasLegal && <NavRow title="Legal" onActivated={() => push("legal")} />}
                  </AdwPreferencesGroup>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>,
    );

    const pages = [
      { tag: "main", title: "About", children: mainPage },
      {
        tag: "whats-new",
        title: "What’s New",
        children: page(
          <Subpage>
            {releaseNotesVersion && (
              <span className="gtk-label heading" style={{ textAlign: "start" }}>
                {`Version ${releaseNotesVersion}`}
              </span>
            )}
            <ReleaseNotes markup={releaseNotes ?? ""} />
          </Subpage>,
        ),
      },
      {
        tag: "details",
        title: "Details",
        children: page(
          <Subpage>
            {comments && (
              <span
                className="gtk-label body"
                style={{ whiteSpace: "pre-wrap", textAlign: "start" }}
              >
                {comments}
              </span>
            )}
            {website && (
              <AdwPreferencesGroup>
                <LinkRow title="Website" url={website} open={open} />
              </AdwPreferencesGroup>
            )}
          </Subpage>,
        ),
      },
      {
        tag: "troubleshooting",
        title: "Troubleshooting",
        children: page(
          <Subpage>
            <span className="gtk-label body" style={{ whiteSpace: "normal", textAlign: "start" }}>
              To assist in troubleshooting, you can view your debugging information. Providing this
              information to the application developers can help diagnose any problems you encounter
              when you report an issue.
            </span>
            <pre
              className="gtk-textview monospace"
              style={{ whiteSpace: "pre-wrap", margin: 0, userSelect: "text" }}
            >
              {debugInfo}
            </pre>
            <div
              className="gtk-box gtk-box-layout horizontal"
              style={{ gap: 6, justifyContent: "center" }}
            >
              <button
                type="button"
                className="gtk-button"
                onClick={() => void navigator.clipboard?.writeText(debugInfo ?? "")}
              >
                <span className="gtk-label">Copy Text</span>
              </button>
              <button
                type="button"
                className="gtk-button"
                onClick={() => {
                  const blob = new Blob([debugInfo ?? ""], { type: "text/plain" });
                  const a = document.createElement("a");
                  a.href = URL.createObjectURL(blob);
                  a.download = debugInfoFilename ?? "debug-info.txt";
                  a.click();
                  URL.revokeObjectURL(a.href);
                }}
              >
                <span className="gtk-label">Save As…</span>
              </button>
            </div>
          </Subpage>,
        ),
      },
      {
        tag: "credits",
        title: "Credits",
        children: page(
          <Subpage>
            {creditSection("Code by", developers)}
            {creditSection("Design by", designers)}
            {creditSection("Artwork by", artists)}
            {creditSection("Documentation by", documenters)}
            {translatorCredits &&
              creditSection(
                "Translated by",
                translatorCredits.split("\n").filter((l) => l.trim() !== ""),
              )}
          </Subpage>,
        ),
      },
      {
        tag: "legal",
        title: "Legal",
        children: page(
          <Subpage>
            <div className="gtk-box gtk-box-layout vertical" style={{ gap: 6, textAlign: "start" }}>
              <span className="gtk-label heading">{applicationName}</span>
              {copyright && <span className="gtk-label body">{copyright}</span>}
              {knownLicense && (
                <span className="gtk-label body" style={{ whiteSpace: "normal" }}>
                  This application comes with absolutely no warranty. See the{" "}
                  <a
                    href={knownLicense.url}
                    onClick={(e) => {
                      e.preventDefault();
                      open(knownLicense.url);
                    }}
                  >
                    {knownLicense.title}
                  </a>{" "}
                  for details.
                </span>
              )}
              {license && (
                <span className="gtk-label body" style={{ whiteSpace: "pre-wrap" }}>
                  {license}
                </span>
              )}
            </div>
          </Subpage>,
        ),
      },
    ];

    return (
      <FloatingSheet
        ref={ref}
        open={visible}
        dialogClasses={["about", "background", "floating"]}
        className={className}
        sheetStyle={{
          width: 360,
          height: 620,
          maxHeight: "calc(100% - 24px)",
          display: "flex",
          flexDirection: "column",
        }}
        onDimmingClick={close}
        portal={portal}
        aria-label={`About ${applicationName}`}
        {...rest}
      >
        <WindowControlsContext.Provider value={controls}>
          <AdwNavigationView
            pages={pages}
            stack={stack}
            onStackChange={setStack}
            style={{ height: "100%" }}
          />
        </WindowControlsContext.Provider>
      </FloatingSheet>
    );
  },
);
