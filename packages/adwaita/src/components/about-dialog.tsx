import { useEscapeLayer, useIcon } from "@gtk-js/gtk4";
import { forwardRef, type HTMLAttributes, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

export interface AdwAboutDialogProps extends HTMLAttributes<HTMLDivElement> {
  applicationName: string;
  applicationIcon?: string;
  developerName?: string;
  version?: string;
  releaseNotes?: string;
  releaseNotesVersion?: string;
  comments?: string;
  website?: string;
  supportUrl?: string;
  issueUrl?: string;
  debugInfo?: string;
  debugInfoFilename?: string;
  copyright?: string;
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
}

/**
 * AdwAboutDialog — An about dialog for applications.
 *
 * Upstream CSS node: dialog.about (inherits from AdwDialog with css_name "dialog")
 * Upstream UI template sets: content-width=360, width-request=360, height-request=200,
 *   CSS class "about"
 *
 * Native structure inside the dialog sheet:
 *   AdwToastOverlay > AdwNavigationView > AdwNavigationPage > AdwToolbarView
 *     > [top] AdwHeaderBar
 *     > [content] GtkScrolledWindow.main-page
 *       > viewport > AdwClamp > GtkBox(vertical)
 *         > GtkImage.icon-dropshadow (app icon, 128px)
 *         > GtkLabel.title-1 (app name)
 *         > GtkLabel (developer name)
 *         > GtkButton.app-version (version, halign=center)
 *         > GtkBox(vertical) — details/credits/legal groups
 *
 * SCSS targets (from _misc.scss):
 *   dialog.about .main-page > viewport > clamp > box { margin: 12px; border-spacing: 6px; }
 *   dialog.about .main-page > viewport > clamp > box > box { margin-top: 18px; border-spacing: 18px; }
 *   dialog.about .main-page .app-version { padding: 3px 18px; color: accent; border-radius: 999px; }
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.AboutDialog.html
 */
export const AdwAboutDialog = forwardRef<HTMLDivElement, AdwAboutDialogProps>(
  function AdwAboutDialog(
    {
      applicationName,
      applicationIcon,
      developerName,
      version,
      releaseNotes,
      comments,
      website,
      supportUrl,
      issueUrl,
      copyright,
      licenseType,
      license,
      developers,
      designers,
      artists,
      documenters,
      visible = false,
      portal = false,
      onClosed,
      className,
      ...rest
    },
    ref,
  ) {
    const AppIcon = useIcon(applicationIcon ?? "");

    const close = useCallback(() => {
      onClosed?.();
    }, [onClosed]);

    const sheetRef = useRef<HTMLDivElement>(null);
    useEscapeLayer(visible, sheetRef, close);

    if (!visible) return null;

    const dialogClasses = ["gtk-dialog", "about", "background", "floating"];
    if (className) dialogClasses.push(className);

    const dialog = (
      <div
        ref={ref}
        className={dialogClasses.join(" ")}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1000,
        }}
        {...rest}
      >
        <div
          ref={sheetRef}
          className="gtk-floating-sheet"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div className="gtk-dimming" style={{ position: "absolute", inset: 0 }} onClick={close} />
          <div className="gtk-sheet" style={{ position: "relative", width: 360 }}>
            {/* Upstream: AdwToolbarView wrapping headerbar + scrolled content */}
            <div className="gtk-toolbarview">
              <div className="top-bar">
                <div className="gtk-headerbar">
                  <div className="gtk-windowhandle">
                    <div className="gtk-box">
                      <span className="gtk-label title">{/* title shown via window-title */}</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Upstream: GtkScrolledWindow.main-page > viewport > AdwClamp > GtkBox */}
              <div
                className="main-page"
                style={{ overflow: "auto", maxHeight: "80vh", textAlign: "center" }}
              >
                <div className="gtk-viewport">
                  <div className="gtk-clamp">
                    <div className="gtk-box gtk-box-layout vertical">
                      {AppIcon && (
                        <span
                          className="gtk-image icon-dropshadow"
                          style={{ display: "inline-flex" }}
                        >
                          <AppIcon size={128} />
                        </span>
                      )}
                      <span className="gtk-label title-1">{applicationName}</span>
                      {developerName && <span className="gtk-label">{developerName}</span>}
                      {version && (
                        <button
                          type="button"
                          className="gtk-button app-version"
                          style={{ alignSelf: "center" }}
                          onClick={() => navigator.clipboard?.writeText(version)}
                        >
                          <span className="gtk-label">{version}</span>
                        </button>
                      )}
                      {/* Second box: details, links, credits, legal */}
                      <div className="gtk-box gtk-box-layout vertical">
                        {comments && <span className="gtk-label body">{comments}</span>}
                        {website && (
                          <a
                            href={website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gtk-button link"
                          >
                            <span className="gtk-label">{website}</span>
                          </a>
                        )}
                        {(developers?.length ||
                          designers?.length ||
                          artists?.length ||
                          documenters?.length) && (
                          <div className="gtk-preferencesgroup">
                            <span className="gtk-label heading">Credits</span>
                            {developers && (
                              <div>
                                <strong>Developers</strong>: {developers.join(", ")}
                              </div>
                            )}
                            {designers && (
                              <div>
                                <strong>Designers</strong>: {designers.join(", ")}
                              </div>
                            )}
                            {artists && (
                              <div>
                                <strong>Artists</strong>: {artists.join(", ")}
                              </div>
                            )}
                            {documenters && (
                              <div>
                                <strong>Documenters</strong>: {documenters.join(", ")}
                              </div>
                            )}
                          </div>
                        )}
                        {(copyright || license) && (
                          <div className="gtk-preferencesgroup">
                            <span className="gtk-label heading">Legal</span>
                            {copyright && <span className="gtk-label">{copyright}</span>}
                            {license && (
                              <span className="gtk-label body" style={{ whiteSpace: "pre-wrap" }}>
                                {license}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );

    if (portal === true) return createPortal(dialog, document.body);
    if (portal instanceof HTMLElement) return createPortal(dialog, portal);
    return dialog;
  },
);
