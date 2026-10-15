import {
  GtkActionBar,
  GtkButton,
  GtkImage,
  GtkScrolledWindow,
  GtkWindowTitle,
  useIcon,
  WindowControlsContext,
} from "@gtk-js/gtk4";
import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import { AdwActionRow } from "./action-row.tsx";
import { AdwClamp } from "./clamp.tsx";
import { FloatingSheet } from "./floating-sheet.tsx";
import { AdwHeaderBar } from "./header-bar.tsx";
import { AdwNavigationView } from "./navigation-view.tsx";
import { AdwPreferencesGroup } from "./preferences-group.tsx";
import { AdwToolbarView } from "./toolbar-view.tsx";

/** A titled list of people, for the Credits and Acknowledgements pages. */
export interface AdwAboutDialogCreditSection {
  /** Section title. Untitled when omitted. */
  name?: string;
  /** Names, optionally followed by an email (`Name <email>`) or URL (`Name https://…`). */
  people: string[];
}

/** Copyright and license information of a component, for the Legal page. */
export interface AdwAboutDialogLegalSection {
  title: string;
  copyright?: string;
  /** SPDX identifier of a well known license, or "custom" to show `license`. */
  licenseType?: string;
  /** Custom license text. */
  license?: string;
}

export interface AdwAboutDialogLink {
  title: string;
  url: string;
}

/** Another application by the same developer, shown at the bottom of the main page. */
export interface AdwAboutDialogOtherApp {
  /**
   * Application ID: the app opened in the software center, and its icon
   * (`com.example.App` is looked up as `ComExampleApp`).
   */
  appId: string;
  name: string;
  summary: string;
}

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
  /** Extra Credits sections, after the standard ones (adw_about_dialog_add_credit_section). */
  creditSections?: AdwAboutDialogCreditSection[];
  /** Acknowledgements page sections (adw_about_dialog_add_acknowledgement_section). */
  acknowledgementSections?: AdwAboutDialogCreditSection[];
  /** Legal sections for dependencies or other components (adw_about_dialog_add_legal_section). */
  legalSections?: AdwAboutDialogLegalSection[];
  /** Extra links on the Details page, under the comments and website (adw_about_dialog_add_link). */
  links?: AdwAboutDialogLink[];
  /** The developer's other applications (adw_about_dialog_add_other_app). */
  otherApps?: AdwAboutDialogOtherApp[];
  visible?: boolean;
  portal?: boolean | HTMLElement;
  onClosed?: () => void;
  /** Open external links. Defaults to `window.open(url, "_blank")`. */
  onOpenUrl?: (url: string) => void;
}

/** Well known licenses, by SPDX identifier: gtk_license_info in adw-about-dialog.c. */
const LICENSES: Record<string, { title: string; url: string }> = {
  "GPL-2.0-or-later": {
    title: "GNU General Public License, version 2 or later",
    url: "https://www.gnu.org/licenses/old-licenses/gpl-2.0.html",
  },
  "GPL-3.0-or-later": {
    title: "GNU General Public License, version 3 or later",
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
  "BSD-2-Clause": {
    title: "BSD 2-Clause License",
    url: "https://opensource.org/licenses/bsd-license.php",
  },
  MIT: { title: "The MIT License (MIT)", url: "https://opensource.org/licenses/mit-license.php" },
  "Artistic-2.0": {
    title: "Artistic License 2.0",
    url: "https://opensource.org/licenses/artistic-license-2.0.php",
  },
  "GPL-2.0-only": {
    title: "GNU General Public License, version 2 only",
    url: "https://www.gnu.org/licenses/old-licenses/gpl-2.0.html",
  },
  "GPL-3.0-only": {
    title: "GNU General Public License, version 3 only",
    url: "https://www.gnu.org/licenses/gpl-3.0.html",
  },
  "LGPL-2.1-only": {
    title: "GNU Lesser General Public License, version 2.1 only",
    url: "https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html",
  },
  "LGPL-3.0-only": {
    title: "GNU Lesser General Public License, version 3 only",
    url: "https://www.gnu.org/licenses/lgpl-3.0.html",
  },
  "AGPL-3.0-or-later": {
    title: "GNU Affero General Public License, version 3 or later",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  "AGPL-3.0-only": {
    title: "GNU Affero General Public License, version 3 only",
    url: "https://www.gnu.org/licenses/agpl-3.0.html",
  },
  "BSD-3-Clause": {
    title: "BSD 3-Clause License",
    url: "https://opensource.org/licenses/BSD-3-Clause",
  },
  "Apache-2.0": {
    title: "Apache License, Version 2.0",
    url: "https://opensource.org/licenses/Apache-2.0",
  },
  "MPL-2.0": {
    title: "Mozilla Public License 2.0",
    url: "https://opensource.org/licenses/MPL-2.0",
  },
  "0BSD": { title: "BSD Zero-Clause License", url: "https://opensource.org/license/0bsd" },
};

/** Parse "Name https://url" / "Name <email>" credit entries like upstream's parse_person(). */
function parseCredit(entry: string): { name: string; link?: string; isEmail?: boolean } {
  const email = entry.match(/^(.*?)\s*<([^>]+)>\s*$/);
  if (email) return { name: email[1]!, link: email[2], isEmail: true };
  const url = entry.match(/^(.*?)\s+(https?:\/\/\S+)\s*$/);
  if (url) return { name: url[1]!, link: url[2] };
  return { name: entry };
}

/**
 * The text of a license, like get_license_text(): a custom license as is, a
 * well known one as a preamble linking to it, none otherwise.
 */
function licenseText(
  licenseType: string | undefined,
  license: string | undefined,
  open: (url: string) => void,
): ReactNode {
  if (licenseType === "custom" || (!licenseType && license)) return license || null;
  const known = licenseType ? LICENSES[licenseType] : undefined;
  if (!known) return null;
  return (
    <>
      This application comes with absolutely no warranty. See the{" "}
      <a
        className="gtk-link"
        href={known.url}
        onClick={(e) => {
          e.preventDefault();
          open(known.url);
        }}
      >
        {known.title}
      </a>{" "}
      for details.
    </>
  );
}

/**
 * Render the AppStream description subset used for release notes. Text is
 * produced through React (never as raw HTML), so markup can't inject anything.
 */
/**
 * The release notes, laid out like update_release_notes() fills the What's
 * New GtkTextView: paragraphs and list items are lines of text; items start
 * with "• " (or "1. ") and their "bullet" tag indents the whole paragraph to
 * 24px (from the view's 12px) with 6px above it; each section (paragraph or
 * list) has 12px above it; `code` uses the monospace font.
 */
function ReleaseNotes({ version, markup }: { version?: string; markup: string }) {
  const sections = useMemo(() => {
    if (typeof DOMParser === "undefined") return [<div key="0">{markup}</div>];
    const doc = new DOMParser().parseFromString(`<root>${markup}</root>`, "application/xml");
    if (doc.getElementsByTagName("parsererror").length > 0) {
      return [<div key="0">{markup.replace(/<[^>]+>/g, "")}</div>];
    }
    const inline = (node: Node, key: number): ReactNode => {
      if (node.nodeType === 3) return node.textContent?.replace(/\s+/g, " ");
      if (node.nodeType !== 1) return null;
      const el = node as Element;
      const children = Array.from(el.childNodes).map(inline);
      switch (el.tagName.toLowerCase()) {
        case "em":
          return <em key={key}>{children}</em>;
        case "code":
          // Upstream's code tag uses the monospace font (monospace-font-name).
          return (
            <code key={key} className="monospace">
              {children}
            </code>
          );
        default:
          return <span key={key}>{children}</span>;
      }
    };
    const elements = Array.from(doc.documentElement.children);
    return elements.map((el, i) => {
      const tag = el.tagName.toLowerCase();
      const sectionTop = i > 0 || version ? 12 : 0;
      if (tag === "ul" || tag === "ol") {
        const items = Array.from(el.children).filter((c) => c.tagName.toLowerCase() === "li");
        return items.map((li, n) => (
          <div key={`${i}-${n}`} style={{ marginLeft: 12, marginTop: n === 0 ? sectionTop : 6 }}>
            {tag === "ol" ? `${n + 1}. ` : "• "}
            {Array.from(li.childNodes).map(inline)}
          </div>
        ));
      }
      return (
        <div key={i} style={{ marginTop: sectionTop }}>
          {Array.from(el.childNodes).map(inline)}
        </div>
      );
    });
  }, [markup, version]);
  return (
    <div
      className="gtk-textview body"
      style={{ padding: "18px 12px", whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
    >
      {version && <div style={{ fontWeight: "bold" }}>{`Version ${version}`}</div>}
      {sections}
    </div>
  );
}

/** A subpage: its box gets 18px margins and spacing from the theme (`.subpage`). */
function Subpage({ children }: { children: ReactNode }) {
  return (
    <GtkScrolledWindow className="subpage" hscrollbarPolicy="never" style={{ height: "100%" }}>
      <div className="gtk-viewport">
        <AdwClamp>
          <div className="gtk-box gtk-box-layout vertical">{children}</div>
        </AdwClamp>
      </div>
    </GtkScrolledWindow>
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
  subtitle,
  url,
  tooltip = url,
  icon = "AdwExternalLink",
  prefixWidget,
  open,
}: {
  title: string;
  subtitle?: string;
  url: string;
  tooltip?: string;
  icon?: string;
  prefixWidget?: ReactNode;
  open: (url: string) => void;
}) {
  return (
    <AdwActionRow
      title={title}
      subtitle={subtitle}
      activatable
      tooltipText={tooltip}
      onActivated={() => open(url)}
      prefixWidget={prefixWidget}
      suffixWidget={<GtkImage iconName={icon} />}
    />
  );
}

/**
 * The icon component name for an application ID, as the icon packages name
 * their icons (`org.gnome.Boxes` → `OrgGnomeBoxes`).
 */
function appIconName(appId: string): string {
  return appId
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

/** A section of people, like add_credits_section(); nothing when there's nobody. */
function CreditSection({
  title,
  people,
  open,
}: {
  title?: string;
  people?: string[];
  open: (url: string) => void;
}) {
  if (!people || people.length === 0) return null;
  return (
    <AdwPreferencesGroup title={title}>
      {people.map((entry, i) => {
        const { name, link, isEmail } = parseCredit(entry);
        if (!link) return <AdwActionRow key={i} title={name} />;
        return isEmail ? (
          <LinkRow
            key={i}
            title={name}
            url={`mailto:${encodeURIComponent(link)}`}
            tooltip={link}
            icon="AdwMailSend"
            open={open}
          />
        ) : (
          <LinkRow key={i} title={name} url={link} open={open} />
        );
      })}
    </AdwPreferencesGroup>
  );
}

/** A Legal page section, like append_legal_section(): a heading, then copyright and license. */
function LegalSection({
  title,
  copyright,
  license,
  forceTitle,
}: {
  title?: string;
  copyright?: string;
  license: ReactNode;
  forceTitle: boolean;
}) {
  if (!copyright && !license && !forceTitle) return null;
  return (
    <>
      {title && (
        <span className="gtk-label heading" style={{ whiteSpace: "normal", textAlign: "start" }}>
          {title}
        </span>
      )}
      {(copyright || license) && (
        // A wrapping label: its text and link flow as one paragraph.
        <span
          className="gtk-label body"
          style={{
            display: "block",
            whiteSpace: "pre-wrap",
            textAlign: "start",
            userSelect: "text",
          }}
        >
          {copyright}
          {copyright && license ? "\n\n" : null}
          {license}
        </span>
      )}
    </>
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
      creditSections,
      acknowledgementSections,
      legalSections,
      links,
      otherApps,
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
    const [mainScrolled, setMainScrolled] = useState(false);

    const close = useCallback(() => onClosed?.(), [onClosed]);
    const open = useCallback(
      (url: string) => (onOpenUrl ? onOpenUrl(url) : window.open(url, "_blank", "noopener")),
      [onOpenUrl],
    );
    const push = (tag: string) => setStack((s) => [...s, tag]);

    const controls = useMemo(() => ({ close, decorationLayout: ":close" }), [close]);

    const translators = translatorCredits
      ?.split("\n")
      .filter((line) => line.trim() !== "" && line !== "translator-credits");
    const hasCredits = Boolean(
      developers?.length ||
        designers?.length ||
        artists?.length ||
        documenters?.length ||
        translators?.length ||
        creditSections?.some((section) => section.people.length > 0),
    );
    const hasAcknowledgements = Boolean(
      acknowledgementSections?.some((section) => section.people.length > 0),
    );
    const appLicense = licenseText(licenseType, license, open);
    const hasLegal = Boolean(copyright || appLicense || legalSections?.length);
    // update_details(): extra links move the website from the main page to the
    // Details page.
    const hasLinks = Boolean(links?.length);
    const showDetails = Boolean(comments) || hasLinks;
    const showLinks = (Boolean(website) && Boolean(comments)) || hasLinks;

    // Like the AdwHeaderBars of the navigation pages: subpages show the page
    // title; the main page's (main_headerbar) shows its page's title only
    // while the page is scrolled (update_headerbar_cb).
    const page = (content: ReactNode, title?: string) => (
      <AdwToolbarView
        style={{ height: "100%" }}
        topBars={
          <AdwHeaderBar
            className="flat"
            titleWidget={title ? <GtkWindowTitle title={title} /> : undefined}
            showTitle={Boolean(title) || mainScrolled}
          />
        }
        content={content}
      />
    );

    const mainPage = page(
      <GtkScrolledWindow
        className="main-page"
        hscrollbarPolicy="never"
        style={{ height: "100%" }}
        onScroll={(e) => setMainScrolled(e.currentTarget.scrollTop > 0)}
      >
        <div className="gtk-viewport">
          <AdwClamp>
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
                {(releaseNotes || showDetails || website) && (
                  <AdwPreferencesGroup>
                    {releaseNotes && (
                      <NavRow title="What’s New" onActivated={() => push("whats-new")} />
                    )}
                    {showDetails && <NavRow title="Details" onActivated={() => push("details")} />}
                    {website && !showDetails && (
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
                {(hasCredits || hasLegal || hasAcknowledgements) && (
                  <AdwPreferencesGroup>
                    {hasCredits && <NavRow title="Credits" onActivated={() => push("credits")} />}
                    {hasLegal && <NavRow title="Legal" onActivated={() => push("legal")} />}
                    {hasAcknowledgements && (
                      <NavRow
                        title="Acknowledgements"
                        onActivated={() => push("acknowledgements")}
                      />
                    )}
                  </AdwPreferencesGroup>
                )}
                {otherApps && otherApps.length > 0 && (
                  <AdwPreferencesGroup
                    title={developerName ? `Other Apps by ${developerName}` : "Other Apps"}
                  >
                    {otherApps.map((app) => (
                      <LinkRow
                        key={app.appId}
                        title={app.name}
                        subtitle={app.summary}
                        url={`appstream:${app.appId}`}
                        prefixWidget={
                          <GtkImage
                            iconName={appIconName(app.appId)}
                            pixelSize={32}
                            className="lowres-icon"
                          />
                        }
                        open={open}
                      />
                    ))}
                  </AdwPreferencesGroup>
                )}
              </div>
            </div>
          </AdwClamp>
        </div>
      </GtkScrolledWindow>,
    );

    const pages = [
      { tag: "main", title: "About", children: mainPage },
      {
        tag: "whats-new",
        title: "What’s New",
        // A GtkTextView in an AdwClampScrollable (no viewport).
        children: page(
          <GtkScrolledWindow
            className="subpage"
            hscrollbarPolicy="never"
            style={{ height: "100%" }}
          >
            <AdwClamp>
              <ReleaseNotes version={releaseNotesVersion} markup={releaseNotes ?? ""} />
            </AdwClamp>
          </GtkScrolledWindow>,
          "What’s New",
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
            {showLinks && (
              <AdwPreferencesGroup>
                {website && <LinkRow title="Website" url={website} open={open} />}
                {links?.map((link, i) => (
                  <LinkRow key={i} title={link.title} url={link.url} open={open} />
                ))}
              </AdwPreferencesGroup>
            )}
          </Subpage>,
          "Details",
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
            <AdwPreferencesGroup>
              <NavRow title="Debugging Information" onActivated={() => push("debuginfo")} />
            </AdwPreferencesGroup>
          </Subpage>,
          "Troubleshooting",
        ),
      },
      {
        tag: "debuginfo",
        title: "Debugging Information",
        // A GtkTextView in an AdwClampScrollable, above an action bar.
        children: (
          <AdwToolbarView
            style={{ height: "100%" }}
            topBars={
              <AdwHeaderBar
                className="flat"
                titleWidget={<GtkWindowTitle title="Debugging Information" />}
              />
            }
            content={
              <div
                className="gtk-scrolledwindow subpage"
                style={{ overflow: "auto", height: "100%" }}
              >
                <AdwClamp>
                  <div
                    className="gtk-textview body"
                    style={{
                      padding: "18px 12px",
                      whiteSpace: "pre-wrap",
                      overflowWrap: "anywhere",
                      userSelect: "text",
                    }}
                  >
                    {debugInfo}
                  </div>
                </AdwClamp>
              </div>
            }
            bottomBars={
              <GtkActionBar
                start={
                  <GtkButton
                    label="Copy Text"
                    onClicked={() => void navigator.clipboard?.writeText(debugInfo ?? "")}
                  />
                }
                end={
                  <GtkButton
                    label="Save As…"
                    onClicked={() => {
                      const blob = new Blob([debugInfo ?? ""], { type: "text/plain" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = debugInfoFilename ?? "debug-info.txt";
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }}
                  />
                }
              />
            }
          />
        ),
      },
      {
        tag: "credits",
        title: "Credits",
        children: page(
          <Subpage>
            <CreditSection title="Code by" people={developers} open={open} />
            <CreditSection title="Design by" people={designers} open={open} />
            <CreditSection title="Artwork by" people={artists} open={open} />
            <CreditSection title="Documentation by" people={documenters} open={open} />
            <CreditSection title="Translated by" people={translators} open={open} />
            {creditSections?.map((section, i) => (
              <CreditSection key={i} title={section.name} people={section.people} open={open} />
            ))}
          </Subpage>,
          "Credits",
        ),
      },
      {
        tag: "legal",
        title: "Legal",
        children: page(
          <Subpage>
            {/* update_legal(): the application's own section is titled only
                when there are more. */}
            <LegalSection
              title={legalSections?.length ? "This Application" : undefined}
              copyright={copyright}
              license={appLicense}
              forceTitle={false}
            />
            {legalSections?.map((section, i) => (
              <LegalSection
                key={i}
                title={section.title}
                copyright={section.copyright}
                license={licenseText(section.licenseType, section.license, open)}
                forceTitle
              />
            ))}
          </Subpage>,
          "Legal",
        ),
      },
      {
        tag: "acknowledgements",
        title: "Acknowledgements",
        children: page(
          <Subpage>
            {acknowledgementSections?.map((section, i) => (
              <CreditSection key={i} title={section.name} people={section.people} open={open} />
            ))}
          </Subpage>,
          "Acknowledgements",
        ),
      },
    ];

    return (
      <FloatingSheet
        ref={ref}
        open={visible}
        dialogClasses={["about", "background", "floating"]}
        className={className}
        // Upstream: content-width 360; the height is the main page's natural height.
        sheetStyle={{
          width: 360,
          display: "flex",
          flexDirection: "column",
        }}
        onDimmingClick={close}
        onEscape={close}
        // Like a new dialog each time, it opens on its main page: the stack
        // resets once the dialog has animated out, so it doesn't navigate
        // while closing or opening.
        onCloseAnimationDone={() => setStack(["main"])}
        portal={portal}
        aria-label={`About ${applicationName}`}
        {...rest}
      >
        <WindowControlsContext.Provider value={controls}>
          <AdwNavigationView
            pages={pages}
            stack={stack}
            onStackChange={setStack}
            style={{ flex: "1 1 auto", minHeight: 0 }}
          />
        </WindowControlsContext.Provider>
      </FloatingSheet>
    );
  },
);
