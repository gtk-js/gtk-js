"use client";

import { GtkButton, GtkProvider } from "@gtk-js/gtk4";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SyntaxHighlight } from "../gtk-demo/syntax-highlight";
import { ThemeControls } from "../gtk-demo/theme-controls";
import { useThemePicker } from "../gtk-demo/use-theme-picker";
import {
  AudioProvider,
  type CodeBadgeState,
  ShowcasePlayer,
  type SpinnerState,
  windowSteps,
} from "./scenes";

const CHARS_PER_SEC = 120;
const START_DELAY_MS = 800;

function useSteppedTyping() {
  const steps = windowSteps;
  const [stepIndex, setStepIndex] = useState(0);
  const [charIndex, setCharIndex] = useState(0);
  const [completedCode, setCompletedCode] = useState("");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  const step = steps[stepIndex];
  const stepCode = step?.code ?? "";

  useEffect(() => {
    if (started) return;
    const t = setTimeout(() => setStarted(true), START_DELAY_MS);
    return () => clearTimeout(t);
  }, [started]);

  useEffect(() => {
    if (!started || done || !step) return;
    if (charIndex === 1 && visibleSteps <= stepIndex) {
      setVisibleSteps(stepIndex + 1);
    }
    if (charIndex >= stepCode.length) {
      const newCompleted = completedCode + (completedCode ? "\n" : "") + stepCode;
      setCompletedCode(newCompleted);
      if (stepIndex + 1 < steps.length) {
        setStepIndex((i) => i + 1);
        setCharIndex(0);
      } else {
        setDone(true);
      }
      return;
    }
    const t = setTimeout(() => setCharIndex((i) => i + 1), 1000 / CHARS_PER_SEC);
    return () => clearTimeout(t);
  }, [
    started,
    charIndex,
    stepCode,
    stepIndex,
    steps.length,
    step,
    done,
    completedCode,
    visibleSteps,
  ]);

  const displayCode =
    completedCode + (completedCode && charIndex > 0 ? "\n" : "") + stepCode.slice(0, charIndex);

  return { displayCode, cursor: done ? undefined : "▎", visibleSteps, loading: !done };
}

export function ShowcasePage() {
  const codeRef = useRef<HTMLDivElement>(null);
  const { displayCode, cursor, visibleSteps, loading } = useSteppedTyping();

  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [maximized, setMaximized] = useState(false);
  const [spinnerState, setSpinnerState] = useState<SpinnerState>("spinning");
  const [codeBadge, setCodeBadge] = useState<CodeBadgeState>("visible");

  // Theme state — extracted to shared hook
  const { theme, icons, ...controls } = useThemePicker();

  // Committed theme lags behind `theme`: on change, content slides out over 400ms,
  // the CSS swaps while hidden, waits 1s, then slides back in. Changing theme resets.
  const [committedTheme, setCommittedTheme] = useState(theme);
  const [transitionState, setTransitionState] = useState<"idle" | "exiting" | "entering">("idle");
  const isFirstThemeRender = useRef(true);

  useEffect(() => {
    if (isFirstThemeRender.current) {
      isFirstThemeRender.current = false;
      return;
    }
    setTransitionState("idle");
    const timers: ReturnType<typeof setTimeout>[] = [];
    // Next tick: start slide-out (idle reset needs one frame to paint first)
    timers.push(setTimeout(() => setTransitionState("exiting"), 0));
    // 400ms: slide-out done — apply new theme while content is hidden
    timers.push(setTimeout(() => setCommittedTheme(theme), 400));
    // 400ms + 1000ms wait: start slide-in
    timers.push(setTimeout(() => setTransitionState("entering"), 1400));
    // 400ms + 1000ms + 400ms: done
    timers.push(setTimeout(() => setTransitionState("idle"), 1800));
    return () => timers.forEach(clearTimeout);
  }, [theme]);

  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (loading) return;
    setSpinnerState("fade-out");
    const t1 = setTimeout(() => setSpinnerState("hidden"), 300);
    const t2 = setTimeout(() => setSpinnerState("check"), 1300);
    const t3 = setTimeout(() => setSpinnerState("fade-out-check"), 2300);
    const t4 = setTimeout(() => setSpinnerState("hidden"), 3500);
    const t5 = setTimeout(() => setCodeBadge("collapsing"), 3800);
    const t6 = setTimeout(() => setCodeBadge("docked"), 4600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearTimeout(t5);
      clearTimeout(t6);
    };
  }, [loading]);

  useEffect(() => {
    const el = codeRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [displayCode]);

  const handleWindowHandleDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    if (e.button !== 0) return;
    if (maximized) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleToggleMaximized = () => {
    setMaximized((m) => {
      if (!m) setPos({ x: 0, y: 0 });
      return !m;
    });
  };

  const codeCollapsed = codeBadge === "docked";
  const codeCollapsing = codeBadge === "collapsing";

  const player = (
    <ShowcasePlayer
      visibleSteps={visibleSteps}
      spinnerState={spinnerState}
      codeBadge={codeBadge}
      onWindowHandleDragStart={handleWindowHandleDragStart}
      onWindowToggleMaximized={handleToggleMaximized}
      onWindowClose={() => {}}
      maximized={maximized}
    />
  );

  return (
    <GtkProvider
      theme={committedTheme}
      icons={icons}
      hideUntilReady={false}
      style={{ minHeight: "100vh", transition: "background-color 700ms ease" }}
    >
      <div
        style={{
          animation:
            transitionState === "exiting"
              ? "theme-swipe-out 400ms ease forwards"
              : transitionState === "entering"
                ? "theme-swipe-in 400ms ease forwards"
                : undefined,
        }}
      >
        <div style={{ display: "flex", justifyContent: "flex-end", padding: "16px 24px 0" }}>
          <ThemeControls {...controls} />
        </div>

        <div style={{ textAlign: "center", padding: "64px 24px 32px" }}>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 8px" }}>
            The GNOME UI stack for React
          </h1>
          <p style={{ fontSize: "1.1rem", opacity: 0.7, margin: "0 0 32px" }}>
            GTK4/Adwaita components, icons, themes, and more. All usable in your browser, Electron,
            and wherever else you run React.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
            <Link href="/docs/getting-started" style={{ textDecoration: "none" }}>
              <GtkButton label="Get Started" className="suggested-action" />
            </Link>
            <Link href="/docs/gtk4/button" style={{ textDecoration: "none" }}>
              <GtkButton label="View Components" />
            </Link>
          </div>
        </div>

        <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px 48px" }}>
          <AudioProvider>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: codeCollapsed ? "0fr 1fr" : "1fr 1fr",
                transition: "grid-template-columns 600ms cubic-bezier(0.4, 0, 0.2, 1)",
                borderRadius: 12,
              }}
            >
              {/* Code panel */}
              <div style={{ overflow: "hidden", minWidth: 0 }}>
                <div
                  ref={codeRef}
                  style={{
                    padding: 20,
                    overflowY: "auto",
                    overflowX: "auto",
                    maxHeight: 420,
                    borderRight: "1px solid rgba(128,128,128,0.15)",
                    scrollBehavior: "smooth",
                    background: "#0d1117",
                    borderRadius: 12,
                    opacity: codeCollapsing || codeCollapsed ? 0 : 1,
                    transition: "opacity 500ms ease",
                    position: "relative",
                  }}
                >
                  <SyntaxHighlight code={"// app.tsx\n" + displayCode} cursor={cursor} />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: 12,
                      opacity: codeCollapsing ? 1 : 0,
                      transition: "opacity 300ms ease",
                      pointerEvents: "none",
                      fontFamily: "monospace",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "rgba(255,255,255,0.6)",
                    }}
                  >
                    {"</>"}
                  </div>
                </div>
              </div>

              <div
                style={{ position: "relative", overflow: "visible" }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                {mounted && !maximized && (
                  <div
                    className="showcase-preview"
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "50%",
                      transform: codeCollapsed
                        ? `translate(calc(-50% + ${pos.x}px), ${pos.y}px)`
                        : `translate(calc(-50% + 24px + ${pos.x}px), ${pos.y}px)`,
                      transition: dragRef.current
                        ? undefined
                        : `transform 600ms cubic-bezier(0.4, 0, 0.2, 1)`,
                    }}
                  >
                    {player}
                  </div>
                )}
              </div>
            </div>

            {mounted &&
              maximized &&
              createPortal(
                <GtkProvider
                  theme={committedTheme}
                  icons={icons}
                  hideUntilReady={false}
                  style={{ position: "fixed", inset: 0, zIndex: 9999 }}
                >
                  <div
                    className="showcase-preview"
                    style={{ width: "100%", height: "100%" }}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                  >
                    {player}
                  </div>
                </GtkProvider>,
                document.body,
              )}
          </AudioProvider>
        </div>

        <style>{`
        @keyframes theme-swipe-out {
          from { opacity: 1; transform: translateY(0); }
          to { opacity: 0; transform: translateY(-24px); }
        }
        @keyframes theme-swipe-in {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sc-slide-up {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sc-scale-in {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes sc-slide-down {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sc-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes sc-badge-in {
          from { opacity: 0; transform: scale(0.6); }
          to { opacity: 1; transform: scale(1); }
        }
        .showcase-preview .gtk-window {
          animation: sc-scale-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .showcase-preview .gtk-headerbar {
          animation: sc-slide-down 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .showcase-preview .gtk-windowtitle .title {
          animation: sc-fade 200ms ease-out both;
        }
        .showcase-preview .gtk-label {
          animation: sc-slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .showcase-preview .gtk-button {
          animation: sc-slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .showcase-preview .gtk-scale {
          animation: sc-slide-up 250ms cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .showcase-preview .gtk-windowhandle {
          cursor: grab;
        }
        .showcase-preview .gtk-windowhandle:active {
          cursor: grabbing;
        }
        .showcase-preview .gtk-windowhandle button {
          cursor: default;
        }
      `}</style>
      </div>
    </GtkProvider>
  );
}
