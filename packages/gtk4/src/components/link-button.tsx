import {
  type AnchorHTMLAttributes,
  forwardRef,
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";
import { GtkLabel } from "./label.tsx";

/** How long a keyboard activation shows the button pressed at most (gtkbutton.c). */
const ACTIVATE_TIMEOUT = 250;

/** Space and Enter emit GtkButton's activate signal (activate_keyvals, without modifiers). */
function isActivateKey(e: KeyboardEvent) {
  return e.key === " " || e.key === "Enter";
}

export interface GtkLinkButtonProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    GtkAlignProps {
  /** The URI to open when clicked. Changing it unsets the visited state. */
  uri: string;
  /** Text label. Defaults to the URI if not provided. */
  label?: string;
  /** Whether the link has been visited. */
  visited?: boolean;
  /** Whether the link is insensitive (GtkWidget:sensitive = false). Default: false. */
  disabled?: boolean;
  /** Tooltip shown when hovering the link (GtkWidget:tooltip-text). Default: the URI, if the label is another text. */
  tooltipText?: string;
  /**
   * Called when the link is clicked (GtkLinkButton::activate-link). Return true
   * if it handled the link: the URI isn't opened and the link isn't marked visited.
   */
  onActivateLink?: () => boolean | void;
}

/**
 * GtkLinkButton — A button that opens a URI.
 *
 * CSS node:
 *   button.flat.text-button.link[:visited]
 *     └── label
 *
 * @see https://docs.gtk.org/gtk4/class.LinkButton.html
 */
export const GtkLinkButton = forwardRef<HTMLAnchorElement, GtkLinkButtonProps>(
  function GtkLinkButton(
    {
      uri,
      label,
      visited: controlledVisited,
      disabled = false,
      tooltipText,
      onActivateLink,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onClick,
      onAuxClick,
      onKeyDown,
      onKeyUp,
      ...rest
    },
    ref,
  ) {
    const linkRef = useRef<HTMLAnchorElement>(null);
    useImperativeHandle(ref, () => linkRef.current as HTMLAnchorElement);

    const [internalVisited, setInternalVisited] = useState(false);
    // gtk_link_button_set_uri() unsets the visited state.
    const [prevUri, setPrevUri] = useState(uri);
    if (uri !== prevUri) {
      setPrevUri(uri);
      setInternalVisited(false);
    }
    const visited = controlledVisited ?? internalVisited;

    const [keyboardActivating, setKeyboardActivating] = useState(false);
    const activateTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);

    // gtk_button_finish_activate(): the release of a key, or the timeout,
    // clicks the button. That's still within the key press's user activation,
    // so the browser opens the URI.
    const finishActivate = useCallback(() => {
      clearTimeout(activateTimeout.current);
      activateTimeout.current = undefined;
      setKeyboardActivating(false);
      linkRef.current?.click();
    }, []);

    // gtk_real_button_activate(): Space and Enter show the button pressed
    // (.keyboard-activating) until it's clicked.
    const activate = useCallback(() => {
      if (activateTimeout.current !== undefined) return;
      activateTimeout.current = setTimeout(finishActivate, ACTIVATE_TIMEOUT);
      setKeyboardActivating(true);
    }, [finishActivate]);

    // gtk_button_unrealize() drops an activation in progress.
    useEffect(() => () => clearTimeout(activateTimeout.current), []);

    const classes = ["gtk-button", "flat", "text-button", "link"];
    if (keyboardActivating) classes.push("keyboard-activating");
    if (className) classes.push(className);

    const handleKeyDown = (e: KeyboardEvent<HTMLAnchorElement>) => {
      onKeyDown?.(e);
      if (e.defaultPrevented || disabled) return;
      // The button takes every key while it's activating
      // (key_controller_key_pressed_cb()), Enter's repeats too.
      if (activateTimeout.current !== undefined) {
        e.preventDefault();
      } else if (isActivateKey(e)) {
        // Not the browser's: Enter clicks a link and Space scrolls the page.
        e.preventDefault();
        if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) activate();
      }
    };

    const handleKeyUp = (e: KeyboardEvent<HTMLAnchorElement>) => {
      onKeyUp?.(e);
      // key_controller_key_released_cb()
      if (activateTimeout.current !== undefined) finishActivate();
    };

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // An insensitive widget takes no input.
      if (disabled) {
        e.preventDefault();
        return;
      }
      // gtk_link_button_activate_link() opens the URI and marks the link
      // visited, unless a handler returns true first.
      if (onActivateLink?.() === true) {
        e.preventDefault();
      } else {
        setInternalVisited(true);
      }
      onClick?.(e);
    };

    // GtkButton's click gesture only takes the primary button, and
    // gtk_link_button_pressed_cb() only the context menu one: a middle click
    // doesn't open the URI in a new tab.
    const handleAuxClick = (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.button === 1) e.preventDefault();
      onAuxClick?.(e);
    };

    const text = label ?? uri;

    return (
      <a
        ref={linkRef}
        // An insensitive link can't be focused, followed or dragged.
        href={disabled ? undefined : uri}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.join(" ")}
        // gtk_link_button_query_tooltip_cb() shows the URI if the label is another text.
        title={tooltipText ?? (text && text !== uri ? uri : undefined)}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        data-visited={visited || undefined}
        data-disabled={disabled || undefined}
        aria-disabled={disabled || undefined}
        role="link"
        onClick={handleClick}
        onAuxClick={handleAuxClick}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        {...rest}
      >
        {/* gtk_button_set_label(): a label that doesn't wrap */}
        <GtkLabel label={text} />
      </a>
    );
  },
);
