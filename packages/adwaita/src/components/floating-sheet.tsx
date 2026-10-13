import { useWindowElement } from "@gtk-js/gtk4";
import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  animateSpring,
  DIALOG_SPRING,
  DIALOG_SPRING_EPSILON,
  type SpringAnimationHandle,
} from "../spring.ts";

/** Upstream MIN_SCALE in adw-floating-sheet.c. */
const MIN_SCALE = 0.8;

export interface FloatingSheetProps extends HTMLAttributes<HTMLDivElement> {
  /** Whether the dialog is presented. Closing plays the close animation before unmounting. */
  open: boolean;
  /** CSS classes for the `dialog` node (besides `gtk-dialog`). */
  dialogClasses: string[];
  /** Style for the `sheet` node. */
  sheetStyle?: CSSProperties;
  /** Clicking the dimmed area. */
  onDimmingClick?: () => void;
  /** Called once the close animation finished and the dialog is gone. */
  onCloseAnimationDone?: () => void;
  portal?: boolean | HTMLElement;
  children?: ReactNode;
}

/**
 * Internal: the floating presentation shared by AdwDialog, AdwAlertDialog and
 * AdwAboutDialog, mirroring AdwFloatingSheet. Opening fades the dimming and
 * sheet in while the sheet scales from 0.8 with a spring (damping 0.62,
 * mass 1, stiffness 500); closing runs it backwards, clamped.
 *
 * CSS node:
 *   dialog-host
 *     └── dialog.background.floating
 *         └── floating-sheet
 *             ├── dimming
 *             └── sheet
 *
 * @see upstream/libadwaita/src/adw-floating-sheet.c
 */
export const FloatingSheet = forwardRef<HTMLDivElement, FloatingSheetProps>(function FloatingSheet(
  {
    open,
    dialogClasses,
    sheetStyle,
    onDimmingClick,
    onCloseAnimationDone,
    portal = false,
    children,
    className,
    style,
    ...rest
  },
  ref,
) {
  const windowElement = useWindowElement();
  const [mounted, setMounted] = useState(open);
  const progress = useRef(0);
  const dimmingRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const animation = useRef<SpringAnimationHandle | null>(null);
  const doneRef = useRef(onCloseAnimationDone);
  doneRef.current = onCloseAnimationDone;

  if (open && !mounted) setMounted(true);

  useLayoutEffect(() => {
    if (!mounted) return;
    const apply = (value: number) => {
      progress.current = value;
      const opacity = String(Math.min(1, Math.max(0, value)));
      if (dimmingRef.current) dimmingRef.current.style.opacity = opacity;
      const sheet = sheetRef.current;
      if (sheet) {
        sheet.style.opacity = opacity;
        sheet.style.transform = `scale(${MIN_SCALE + (1 - MIN_SCALE) * value})`;
      }
    };
    apply(progress.current);
    const to = open ? 1 : 0;
    if (progress.current === to) {
      if (!open) {
        setMounted(false);
        doneRef.current?.();
      }
      return;
    }
    animation.current?.cancel();
    animation.current = animateSpring({
      params: DIALOG_SPRING,
      epsilon: DIALOG_SPRING_EPSILON,
      from: progress.current,
      to,
      clamp: !open,
      onValue: apply,
      onDone: () => {
        animation.current = null;
        if (!open) {
          setMounted(false);
          doneRef.current?.();
        }
      },
    });
    return () => animation.current?.cancel();
  }, [open, mounted]);

  if (!mounted) return null;

  const hostInWindow = portal === false && windowElement !== null;
  const classes = ["gtk-dialog", ...dialogClasses];
  if (className) classes.push(className);

  const content = (
    <div className="gtk-dialog-host" style={{ display: "contents" }}>
      <div
        ref={ref}
        className={classes.join(" ")}
        role="dialog"
        aria-modal="true"
        style={{
          // Inside a GtkWindow the dialog covers the window (its dialog host);
          // otherwise the whole viewport.
          position: hostInWindow ? "absolute" : "fixed",
          inset: 0,
          zIndex: 1000,
          // Like gtk_widget_set_can_target (…, FALSE) while closing.
          pointerEvents: open ? undefined : "none",
          ...style,
        }}
        {...rest}
      >
        <div
          className="gtk-floating-sheet"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            ref={dimmingRef}
            className="gtk-dimming"
            style={{ position: "absolute", inset: 0, opacity: 0 }}
            onClick={onDimmingClick}
          />
          <div
            ref={sheetRef}
            className="gtk-sheet"
            style={{
              position: "relative",
              opacity: 0,
              transform: `scale(${MIN_SCALE})`,
              ...sheetStyle,
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );

  if (portal === true) return createPortal(content, document.body);
  if (portal instanceof HTMLElement) return createPortal(content, portal);
  if (hostInWindow) return createPortal(content, windowElement);
  return content;
});
