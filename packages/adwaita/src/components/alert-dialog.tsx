import {
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { AdwResponseAppearance } from "../types.ts";
import { FloatingSheet } from "./floating-sheet.tsx";

/** BUTTON_SPACING in adw-alert-dialog.c. */
const BUTTON_SPACING = 12;

export interface AdwAlertDialogResponse {
  id: string;
  label: string;
  appearance?: AdwResponseAppearance;
  enabled?: boolean;
}

export interface AdwAlertDialogProps extends HTMLAttributes<HTMLDivElement> {
  heading?: string;
  headingUseMarkup?: boolean;
  body?: string;
  bodyUseMarkup?: boolean;
  extraChild?: ReactNode;
  preferWideLayout?: boolean;
  responses?: AdwAlertDialogResponse[];
  defaultResponse?: string;
  closeResponse?: string;
  visible?: boolean;
  portal?: boolean | HTMLElement;
  onResponse?: (id: string) => void;
  /**
   * Called once the close animation finished and the dialog is gone. Unlike
   * GTK, React can't keep a widget alive on its own: unmount the dialog here,
   * not on response, so it can animate out.
   */
  onHidden?: () => void;
}

/**
 * AdwAlertDialog — A modal alert with heading, body, and response buttons.
 *
 * Upstream CSS node: dialog.alert (inherits from AdwDialog with css_name "dialog")
 * Upstream UI template sets: follows-content-size=true, presentation-mode=floating,
 *   CSS class "alert"
 *
 * Native child structure (inside the dialog's sheet):
 *   AdwGizmo (contents) > GtkWindowHandle > GtkBox(vertical)
 *     > GtkScrolledWindow.body-scrolled-window
 *       > GtkBox.message-area[.has-heading][.has-body](vertical)
 *         > AdwGizmo.heading-bin > GtkLabel.title-2 (heading)
 *         > GtkLabel.body (body text)
 *         > AdwBin.child (extra child)
 *     > AdwGizmo.response-area
 *       > button[.suggested-action|.destructive-action]
 *
 * @see https://gnome.pages.gitlab.gnome.org/libadwaita/doc/1-latest/class.AlertDialog.html
 */
export const AdwAlertDialog = forwardRef<HTMLDivElement, AdwAlertDialogProps>(
  function AdwAlertDialog(
    {
      heading,
      headingUseMarkup = false,
      body,
      bodyUseMarkup = false,
      extraChild,
      preferWideLayout = false,
      responses = [],
      defaultResponse,
      closeResponse = "close",
      visible = false,
      portal = false,
      onResponse,
      onHidden,
      className,
      ...rest
    },
    ref,
  ) {
    const handleClose = useCallback(() => onResponse?.(closeResponse), [onResponse, closeResponse]);

    useEffect(() => {
      if (!visible) return;
      const handleKey = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !e.defaultPrevented) handleClose();
      };
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }, [visible, handleClose]);

    // Upstream allocate_responses(): buttons share the row equally; when their
    // widest natural size doesn't fit, they stack vertically ("compact"),
    // the first response at the bottom.
    const responseAreaRef = useRef<HTMLDivElement>(null);
    const [compact, setCompact] = useState(false);
    useLayoutEffect(() => {
      const area = responseAreaRef.current;
      if (!area || !visible) return;
      const measure = () => {
        const buttons = Array.from(area.children) as HTMLElement[];
        if (buttons.length === 0) return;
        const style = getComputedStyle(area);
        const available =
          area.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
        const widest = Math.max(
          ...buttons.map((b) => {
            const label = b.firstElementChild as HTMLElement | null;
            const bs = getComputedStyle(b);
            const padding = parseFloat(bs.paddingLeft) + parseFloat(bs.paddingRight);
            return Math.max(parseFloat(bs.minWidth) || 0, (label?.scrollWidth ?? 0) + padding);
          }),
        );
        const wide = widest * buttons.length + BUTTON_SPACING * (buttons.length - 1);
        setCompact(wide > available + 0.5);
      };
      measure();
      const ro = new ResizeObserver(measure);
      ro.observe(area);
      return () => ro.disconnect();
    }, [visible, responses]);

    // Upstream: .message-area gets .has-heading / .has-body conditionally,
    // which the SCSS uses for border-spacing (10px when both, 24px otherwise).
    const messageAreaClasses = ["message-area"];
    if (heading) messageAreaClasses.push("has-heading");
    if (body) messageAreaClasses.push("has-body");

    return (
      <FloatingSheet
        ref={ref}
        open={visible}
        dialogClasses={["alert", "background", "floating"]}
        className={className}
        // Upstream DIALOG_MIN_WIDTH / DIALOG_MAX_WIDTH / DIALOG_MAX_WIDE_WIDTH.
        sheetStyle={{ minWidth: "min(300px, 100%)", maxWidth: preferWideLayout ? 600 : 372 }}
        onDimmingClick={handleClose}
        onCloseAnimationDone={onHidden}
        portal={portal}
        aria-label={heading}
        {...rest}
      >
        {/* AdwGizmo "contents" — no CSS class, just a layout container */}
        <div>
          <div className="gtk-windowhandle">
            <div className="gtk-box gtk-box-layout vertical">
              <div className="body-scrolled-window" style={{ overflow: "auto", maxHeight: "70vh" }}>
                <div className={messageAreaClasses.join(" ")}>
                  {heading && (
                    <div className="heading-bin">
                      <span className="gtk-label title-2">{heading}</span>
                    </div>
                  )}
                  {body && <span className="gtk-label body">{body}</span>}
                  {extraChild && <div className="child">{extraChild}</div>}
                </div>
              </div>
              <div
                ref={responseAreaRef}
                className={`response-area${compact ? " compact" : ""}`}
                style={{
                  display: "flex",
                  flexDirection: compact ? "column-reverse" : "row",
                  gap: BUTTON_SPACING,
                }}
              >
                {responses.map((resp) => {
                  const btnClasses = ["gtk-button"];
                  if (resp.appearance === "suggested") btnClasses.push("suggested-action");
                  if (resp.appearance === "destructive") btnClasses.push("destructive-action");
                  if (resp.id === defaultResponse) btnClasses.push("default");
                  return (
                    <button
                      key={resp.id}
                      type="button"
                      className={btnClasses.join(" ")}
                      disabled={resp.enabled === false}
                      autoFocus={resp.id === defaultResponse}
                      style={{
                        flex: compact ? undefined : "1 1 0",
                        minWidth: compact ? undefined : 0,
                      }}
                      data-response={resp.id}
                      onClick={() => onResponse?.(resp.id)}
                    >
                      <span className="gtk-label">{resp.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </FloatingSheet>
    );
  },
);
