import React, { type AnchorHTMLAttributes, forwardRef, useCallback, useState } from "react";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

export interface GtkLinkButtonProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">,
    GtkAlignProps {
  /** The URI to open when clicked. */
  uri: string;
  /** Text label. Defaults to the URI if not provided. */
  label?: string;
  /** Whether the link has been visited. */
  visited?: boolean;
  /** Callback before navigation. Return false to prevent default. */
  onActivateLink?: () => boolean | void;
}

/**
 * GtkLinkButton — A button that opens a URI.
 *
 * CSS node: button.link[:visited]
 *
 * @see https://docs.gtk.org/gtk4/class.LinkButton.html
 */
export const GtkLinkButton = forwardRef<HTMLAnchorElement, GtkLinkButtonProps>(
  function GtkLinkButton(
    {
      uri,
      label,
      visited: controlledVisited,
      onActivateLink,
      halign,
      valign,
      hexpand,
      vexpand,
      className,
      onClick,
      ...rest
    },
    ref,
  ) {
    const [internalVisited, setInternalVisited] = useState(false);
    const visited = controlledVisited ?? internalVisited;

    const classes = ["gtk-button", "flat", "text-button", "link"];
    if (className) classes.push(className);

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        const prevented = onActivateLink?.() === false;
        if (prevented) {
          e.preventDefault();
        } else {
          setInternalVisited(true);
        }
        onClick?.(e);
      },
      [onActivateLink, onClick],
    );

    return (
      <a
        ref={ref}
        href={uri}
        target="_blank"
        rel="noopener noreferrer"
        className={classes.join(" ")}
        {...alignAttrs(halign, valign, hexpand, vexpand)}
        data-visited={visited || undefined}
        role="link"
        onClick={handleClick}
        {...rest}
      >
        <span className="gtk-label">{label ?? uri}</span>
      </a>
    );
  },
);
