import React, {
  Children,
  forwardRef,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  useCallback,
  useState,
} from "react";
import { alignAttrs, type GtkAlignProps, type GtkPositionType } from "../types.ts";

export interface GtkNotebookPageProps {
  /** Tab label text. */
  tabLabel: string;
  /** Tab label widget (replaces tabLabel). */
  tabWidget?: ReactNode;
  /** Whether this tab can be reordered. Default: false. */
  reorderable?: boolean;
  children: ReactNode;
}

/**
 * GtkNotebookPage — Declares a page in a GtkNotebook. Not rendered directly.
 */
export function GtkNotebookPage(_props: GtkNotebookPageProps): ReactElement | null {
  return null;
}

export interface GtkNotebookProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Current page index. Default: 0. */
  page?: number;
  /** Whether to show tabs. Default: true. */
  showTabs?: boolean;
  /** Whether to show a border. Default: true. */
  showBorder?: boolean;
  /** Whether tabs can be scrolled when they overflow. Default: false. */
  scrollable?: boolean;
  /** Tab position. Default: "top". */
  tabPos?: GtkPositionType;
  /** Callback when page changes. */
  onSwitchPage?: (pageIndex: number) => void;
  children?: ReactNode;
}

/**
 * GtkNotebook — A tabbed container widget.
 *
 * CSS node:
 *   notebook[.frame]
 *     ├── header[.top|.bottom|.left|.right]
 *     │   └── tabs
 *     │       └── tab[:checked] (per page)
 *     └── stack (page content)
 *
 * @see https://docs.gtk.org/gtk4/class.Notebook.html
 */
export const GtkNotebook = forwardRef<HTMLDivElement, GtkNotebookProps>(function GtkNotebook(
  {
    page: controlledPage,
    showTabs = true,
    showBorder = true,
    scrollable = false,
    tabPos = "top",
    onSwitchPage,
    children,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    ...rest
  },
  ref,
) {
  const isControlled = controlledPage !== undefined;
  const [internalPage, setInternalPage] = useState(0);
  const currentPage = isControlled ? controlledPage : internalPage;

  // Extract pages from children
  const pages: Array<GtkNotebookPageProps & { element: ReactNode }> = [];
  Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === GtkNotebookPage) {
      const props = child.props as GtkNotebookPageProps;
      pages.push({ ...props, element: props.children });
    }
  });

  const switchPage = useCallback(
    (index: number) => {
      if (!isControlled) setInternalPage(index);
      onSwitchPage?.(index);
    },
    [isControlled, onSwitchPage],
  );

  const classes = ["gtk-notebook", "gtk-box-layout", "vertical"];
  if (showBorder) classes.push("frame");
  if (className) classes.push(className);

  const isTop = tabPos === "top";
  const isBottom = tabPos === "bottom";

  const header = showTabs && (
    <div className={`gtk-header ${tabPos}`}>
      <div
        className="gtk-tabs"
        role="tablist"
        style={scrollable ? { overflowX: "auto" } : undefined}
      >
        {pages.map((page, i) => (
          <div
            key={i}
            className={`gtk-tab ${page.reorderable ? "reorderable-page" : ""}`}
            role="tab"
            aria-selected={i === currentPage}
            data-checked={i === currentPage || undefined}
            tabIndex={i === currentPage ? 0 : -1}
            onClick={() => switchPage(i)}
          >
            {page.tabWidget ?? <span className="gtk-label">{page.tabLabel}</span>}
          </div>
        ))}
      </div>
    </div>
  );

  const content = <div className="gtk-stack">{pages[currentPage]?.element}</div>;

  return (
    <div
      ref={ref}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      {...rest}
    >
      {(isTop || tabPos === "left") && header}
      {content}
      {(isBottom || tabPos === "right") && header}
    </div>
  );
});
