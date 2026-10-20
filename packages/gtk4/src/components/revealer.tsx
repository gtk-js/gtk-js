import {
  type CSSProperties,
  forwardRef,
  type HTMLAttributes,
  type ReactNode,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { EASE_OUT_CUBIC, prefersReducedMotion } from "../animation.ts";
import { alignAttrs, type GtkAlignProps } from "../types.ts";

/** The GtkRevealerTransitionType values gtk-js implements. */
export type GtkRevealerTransitionType = "none" | "slide-down" | "slide-up";

export interface GtkRevealerProps extends HTMLAttributes<HTMLDivElement>, GtkAlignProps {
  /** Whether the child is revealed. Default: false. */
  revealChild?: boolean;
  /** How the child is revealed and hidden. Default: "slide-down". */
  transitionType?: GtkRevealerTransitionType;
  /** Duration of the transition, in milliseconds. Default: 250. */
  transitionDuration?: number;
  children?: ReactNode;
}

/**
 * GtkRevealer — Animates the showing and hiding of its child.
 *
 * Sliding scales the revealer's height from 0 to the child's height
 * (gtk_revealer_measure()) with ease-out cubic, clipping the child, which
 * keeps its own size: slide-down keeps the child's bottom edge in view,
 * slide-up its top edge (gtk_revealer_size_allocate()). A change during a
 * transition starts from the current height. Only changes animate, not the
 * initial state, and the hidden child stays mounted but out of view and out
 * of the focus chain (gtk_widget_set_child_visible()).
 *
 * CSS node: revealer
 *
 * @see https://docs.gtk.org/gtk4/class.Revealer.html
 * @see upstream/gtk/gtk/gtkrevealer.c
 */
export const GtkRevealer = forwardRef<HTMLDivElement, GtkRevealerProps>(function GtkRevealer(
  {
    revealChild = false,
    transitionType = "slide-down",
    transitionDuration = 250,
    halign,
    valign,
    hexpand,
    vexpand,
    className,
    style,
    children,
    ...rest
  },
  ref,
) {
  const element = useRef<HTMLDivElement>(null);
  useImperativeHandle(ref, () => element.current as HTMLDivElement);
  const animation = useRef<Animation | null>(null);

  const animates = transitionType !== "none" && transitionDuration > 0 && !prefersReducedMotion();
  // The child stays visible until the hide transition ends, like
  // gtk_revealer_set_position() (child-visible = position != 0).
  const [hiding, setHiding] = useState(false);
  const [prevReveal, setPrevReveal] = useState(revealChild);
  if (prevReveal !== revealChild) {
    setPrevReveal(revealChild);
    setHiding(!revealChild && animates);
  }
  const childVisible = revealChild || hiding;

  // gtk_revealer_start_animation(): from the current position to the target.
  // Only changes animate, not the first render.
  const target = useRef(revealChild);
  useLayoutEffect(() => {
    const el = element.current;
    if (!el || target.current === revealChild) return;
    target.current = revealChild;
    // The layout height, which the running transition sets.
    const height = () => parseFloat(getComputedStyle(el).height);
    const running = animation.current;
    // Without a running transition, it starts from the other end.
    const from = running ? height() : null;
    running?.cancel();
    animation.current = null;
    if (!animates || typeof el.animate !== "function") return;
    const full = height();
    const start = from ?? (revealChild ? 0 : full);
    const end = revealChild ? full : 0;
    const anim = el.animate(
      [
        { height: `${start}px`, overflow: "clip" },
        { height: `${end}px`, overflow: "clip" },
      ],
      { duration: transitionDuration, easing: EASE_OUT_CUBIC, fill: "forwards" },
    );
    animation.current = anim;
    anim.onfinish = () => {
      if (revealChild) {
        anim.cancel();
        animation.current = null;
      } else {
        setHiding(false);
      }
    };
  }, [revealChild]);

  // Once the hidden child is out of view, drop the finished transition.
  useLayoutEffect(() => {
    if (childVisible) return;
    animation.current?.cancel();
    animation.current = null;
  }, [childVisible]);

  useLayoutEffect(() => () => animation.current?.cancel(), []);

  const classes = ["gtk-revealer", "gtk-bin-layout"];
  if (className) classes.push(className);

  const revealerStyle: CSSProperties = {
    ...(transitionType === "slide-down" && { alignContent: "end" }),
    ...(!childVisible && { height: 0, overflow: "clip", visibility: "hidden" }),
    ...style,
  };

  return (
    <div
      ref={element}
      className={classes.join(" ")}
      {...alignAttrs(halign, valign, hexpand, vexpand)}
      style={revealerStyle}
      {...rest}
    >
      {children}
    </div>
  );
});
