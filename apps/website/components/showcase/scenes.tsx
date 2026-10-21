"use client";

import {
  GtkBox,
  GtkButton,
  GtkHeaderBar,
  GtkLabel,
  GtkPopover,
  GtkScale,
  GtkSpinner,
  GtkWindow,
  GtkWindowTitle,
  IconProvider,
  useIcons,
} from "@gtk-js/gtk4";
import {
  EditCopy,
  MediaPlaybackPause,
  MediaPlaybackStart,
  MediaSeekBackward,
  MediaSeekForward,
  ObjectSelect,
} from "@gtk-js/icons-adwaita";
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SyntaxHighlight } from "../gtk-demo/syntax-highlight";

export interface SceneStep {
  /** Code snippet shown in the typing panel for this step */
  code: string;
}

const AUDIO_URL =
  "https://archive.org/download/NeverGonnaGiveYouUpOriginal/Never%20Gonna%20Give%20You%20Up%20Original.mp3";
const W = { width: 380, minHeight: 320 };

function formatTime(secs: number) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Audio context ────────────────────────────────────────────────────────────

type AudioState = {
  position: number;
  duration: number;
  playing: boolean;
  scaleValue: number;
  onSeek: (v: number) => void;
  onSeekCommit: (v: number) => void;
  onTogglePlay: () => void;
  onSeekBack: () => void;
  onSeekForward: () => void;
};

const AudioCtx = createContext<AudioState | null>(null);
const useAudio = () => useContext(AudioCtx)!;

export function AudioProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const seekingRef = useRef(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTimeUpdate = () => {
      if (!seekingRef.current) setPosition(audio.currentTime);
    };
    const onDurationChange = () => setDuration(audio.duration || 0);
    const onEnded = () => setPlaying(false);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  const onTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play();
      setPlaying(true);
    }
  };

  const onSeek = (v: number) => {
    seekingRef.current = true;
    setPosition((v / 100) * (duration || 1));
  };

  const onSeekCommit = (v: number) => {
    const audio = audioRef.current;
    const time = (v / 100) * (duration || 1);
    if (audio) audio.currentTime = time;
    setPosition(time);
    seekingRef.current = false;
  };

  const onSeekBack = () => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.max(0, audio.currentTime - 10);
  };

  const onSeekForward = () => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Math.min(duration, audio.currentTime + 10);
  };

  const scaleValue = duration > 0 ? (position / duration) * 100 : 0;

  return (
    <AudioCtx.Provider
      value={{
        position,
        duration,
        playing,
        scaleValue,
        onSeek,
        onSeekCommit,
        onTogglePlay,
        onSeekBack,
        onSeekForward,
      }}
    >
      <audio ref={audioRef} src={AUDIO_URL} preload="metadata" style={{ display: "none" }} />
      {children}
    </AudioCtx.Provider>
  );
}

// ── Step index constants ─────────────────────────────────────────────────────
// Each constant is the step at which that element first appears (0-indexed).
// visibleSteps >= N means element N is shown.

const STEP_WINDOW = 0;
const STEP_HEADERBAR = 1;
const STEP_WINDOW_TITLE = 2;
const STEP_ALBUM_ART = 3;
const STEP_TRACK_TITLE = 4;
const STEP_TRACK_ARTIST = 5;
const STEP_SCALE = 6;
const STEP_TIME_LABELS = 7;
const STEP_PLAY_BTN = 8;
const STEP_SEEK_BTNS = 9;

export const TOTAL_STEPS = 10;

// Full assembled code shown in the copy popover
export const FULL_CODE = `// app.tsx
<GtkWindow
  titlebar={<GtkHeaderBar
    titleWidget={
      <GtkWindowTitle
        title="Harmonix"
      />
    }
  />}
>
  <div style={{
    width: 180, height: 180,
    borderRadius: 12,
    background: "linear-gradient(135deg,
      #3584e4 0%, #9141ac 100%)",
  }} />
  <GtkLabel label="Midnight Bloom" className="title-2" />
  <GtkLabel label="Aurora Waves" className="dim-label" />
  <GtkScale value={position} min={0} max={duration} />
  <GtkLabel label={formatTime(position)} className="dim-label" />
  <GtkLabel label={formatTime(duration)} className="dim-label" />
  <GtkButton className="suggested-action" style={{ borderRadius: "50%", padding: 12 }}>
    {playing ? <MediaPlaybackPause size={24} /> : <MediaPlaybackStart size={24} />}
  </GtkButton>
  <GtkButton hasFrame={false}><MediaSeekBackward size={20} /></GtkButton>
  <GtkButton hasFrame={false}><MediaSeekForward size={20} /></GtkButton>
</GtkWindow>`;

// ── Sub-components ───────────────────────────────────────────────────────────

function LiveProgress({ showLabels }: { showLabels: boolean }) {
  const { scaleValue, position, duration, onSeek, onSeekCommit } = useAudio();
  return (
    <GtkBox orientation="vertical" spacing={0} style={{ width: "100%", marginTop: 16 }}>
      <GtkScale
        value={scaleValue}
        min={0}
        max={100}
        onValueChanged={onSeek}
        onPointerUp={(e) => {
          if (e.button === 0) onSeekCommit(scaleValue);
        }}
      />
      {showLabels && (
        <GtkBox orientation="horizontal" style={{ justifyContent: "space-between", width: "100%" }}>
          <GtkLabel
            label={formatTime(position)}
            className="dim-label"
            style={{ fontSize: "0.8rem" }}
          />
          <GtkLabel
            label={duration > 0 ? formatTime(duration) : "--:--"}
            className="dim-label"
            style={{ fontSize: "0.8rem" }}
          />
        </GtkBox>
      )}
    </GtkBox>
  );
}

// ── Main player ──────────────────────────────────────────────────────────────

export type SpinnerState = "spinning" | "fade-out" | "check" | "fade-out-check" | "hidden";
export type CodeBadgeState = "visible" | "collapsing" | "docked";

function CodePopoverContent({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          overflowY: "auto",
          maxHeight: 320,
          padding: 20,
          background: "#0d1117",
          borderRadius: 8,
          minWidth: 360,
        }}
      >
        <SyntaxHighlight code={code} />
      </div>
      {/* Copy icon button overlaid in top-right of the code block */}
      <div style={{ position: "absolute", top: 8, right: 8 }}>
        <GtkButton
          hasFrame={false}
          className={copied ? "suggested-action" : ""}
          onClicked={handleCopy}
        >
          <EditCopy size={16} />
        </GtkButton>
      </div>
    </div>
  );
}

export function CodeBadge({ code, animateIn }: { code: string; animateIn?: boolean }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const icons = useIcons();

  const handleOpen = () => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) {
      setPopoverPos({ top: rect.bottom + 8, left: rect.left });
    }
    setOpen((o) => !o);
  };

  return (
    <div
      style={{
        animation: animateIn ? "sc-badge-in 350ms cubic-bezier(0.16, 1, 0.3, 1) both" : undefined,
      }}
    >
      <GtkButton
        ref={btnRef}
        hasFrame={false}
        onClicked={handleOpen}
        style={{
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: "0.75rem",
          padding: "4px 6px",
        }}
      >
        {"</>"}
      </GtkButton>
      {open &&
        popoverPos &&
        typeof document !== "undefined" &&
        createPortal(
          <IconProvider value={icons}>
            <div
              style={{
                position: "fixed",
                top: popoverPos.top,
                left: popoverPos.left,
                zIndex: 9999,
              }}
            >
              <GtkPopover
                visible
                hasArrow={false}
                position="bottom"
                onClosed={() => setOpen(false)}
                style={{ position: "static", transform: "none", minWidth: 320 }}
              >
                <CodePopoverContent code={code} />
              </GtkPopover>
            </div>
          </IconProvider>,
          document.body,
        )}
    </div>
  );
}

export interface ShowcasePlayerProps {
  visibleSteps: number;
  spinnerState?: SpinnerState;
  codeBadge?: CodeBadgeState;
  onWindowHandleDragStart?: (e: React.PointerEvent<HTMLDivElement>) => void;
  onWindowToggleMaximized?: () => void;
  onWindowClose?: () => void;
  maximized?: boolean;
}

export function ShowcasePlayer({
  visibleSteps,
  spinnerState = "hidden",
  codeBadge = "visible",
  onWindowHandleDragStart,
  onWindowToggleMaximized,
  onWindowClose,
  maximized,
}: ShowcasePlayerProps) {
  const { playing, onTogglePlay, onSeekBack, onSeekForward } = useAudio();

  const show = (step: number) => visibleSteps > step;

  if (!show(STEP_WINDOW)) return null;

  const wrapperOpacity = spinnerState === "spinning" ? 1 : spinnerState === "check" ? 1 : 0;
  const wrapperTransition =
    spinnerState === "fade-out-check" ? "opacity 1000ms ease" : "opacity 300ms ease";
  const showCheck = spinnerState === "check" || spinnerState === "fade-out-check";

  // Always keep the same DOM structure once headerbar is visible — never unmount
  // the wrapper or swap elements, so CSS transitions are never interrupted.
  // When docked, swap the spinner/check wrapper for the code badge in the start slot.
  const startSlot = show(STEP_HEADERBAR) ? (
    codeBadge === "docked" ? (
      <CodeBadge code={FULL_CODE} animateIn />
    ) : (
      // In a flat header bar button, sized by the theme like the buttons
      // beside it, which takes neither the pointer nor the focus: it only
      // shows progress.
      <GtkButton
        hasFrame={false}
        canTarget={false}
        focusable={false}
        style={{ opacity: wrapperOpacity, transition: wrapperTransition }}
      >
        <div style={{ display: showCheck ? "none" : "flex" }}>
          <GtkSpinner spinning={!showCheck} />
        </div>
        <div style={{ display: showCheck ? "flex" : "none" }}>
          <ObjectSelect size={16} />
        </div>
      </GtkButton>
    )
  ) : undefined;

  const titlebar = show(STEP_HEADERBAR) ? (
    <GtkHeaderBar
      titleWidget={show(STEP_WINDOW_TITLE) ? <GtkWindowTitle title="Harmonix" /> : undefined}
      start={startSlot}
      decorationLayout="appmenu:maximize,close"
      onWindowToggleMaximized={onWindowToggleMaximized}
      onWindowClose={onWindowClose}
      onWindowHandleDragStart={onWindowHandleDragStart}
    />
  ) : undefined;

  return (
    <GtkWindow
      style={maximized ? { width: "100%", height: "100%" } : W}
      maximized={maximized}
      titlebar={titlebar}
    >
      <GtkBox orientation="vertical" spacing={0} style={{ padding: 24, alignItems: "center" }}>
        {show(STEP_ALBUM_ART) && (
          <div
            style={{
              width: 180,
              height: 180,
              borderRadius: 12,
              background: "linear-gradient(135deg, #3584e4 0%, #9141ac 100%)",
              marginBottom: 20,
              animation: "sc-scale-in 400ms cubic-bezier(0.16, 1, 0.3, 1) both",
            }}
          />
        )}
        <GtkBox orientation="vertical" spacing={4} style={{ alignItems: "center", width: "100%" }}>
          {show(STEP_TRACK_TITLE) && <GtkLabel label="Midnight Bloom" className="title-2" />}
          {show(STEP_TRACK_ARTIST) && <GtkLabel label="Aurora Waves" className="dim-label" />}
        </GtkBox>
        {show(STEP_SCALE) && <LiveProgress showLabels={show(STEP_TIME_LABELS)} />}
        {show(STEP_PLAY_BTN) && (
          <GtkBox spacing={8} style={{ marginTop: 16, alignItems: "center" }}>
            {show(STEP_SEEK_BTNS) && (
              <GtkButton hasFrame={false} onClicked={onSeekBack}>
                <MediaSeekBackward size={20} />
              </GtkButton>
            )}
            <GtkButton
              className="suggested-action"
              style={{ borderRadius: "50%", padding: 12 }}
              onClicked={onTogglePlay}
            >
              {playing ? <MediaPlaybackPause size={24} /> : <MediaPlaybackStart size={24} />}
            </GtkButton>
            {show(STEP_SEEK_BTNS) && (
              <GtkButton hasFrame={false} onClicked={onSeekForward}>
                <MediaSeekForward size={20} />
              </GtkButton>
            )}
          </GtkBox>
        )}
      </GtkBox>
    </GtkWindow>
  );
}

// ── Step code snippets ───────────────────────────────────────────────────────

// The assembled code matches exactly what a user would write.
// The only difference vs the live player is the audio backend wiring
// (useAudio hook, onValueChanged, onClicked handlers) which is app-specific.
export const windowSteps: SceneStep[] = [
  {
    code: `<GtkWindow>`,
  },
  {
    code: `  titlebar={<GtkHeaderBar`,
  },
  {
    code: `    titleWidget={
      <GtkWindowTitle
        title="Harmonix"
      />
    }
  />}`,
  },
  {
    code: `  <div style={{
    width: 180, height: 180,
    borderRadius: 12,
    background: "linear-gradient(135deg,
      #3584e4 0%, #9141ac 100%)",
  }} />`,
  },
  {
    code: `  <GtkLabel label="Midnight Bloom" className="title-2" />`,
  },
  {
    code: `  <GtkLabel label="Aurora Waves" className="dim-label" />`,
  },
  {
    code: `  <GtkScale value={position} min={0} max={duration} />`,
  },
  {
    code: `  <GtkLabel label={formatTime(position)} className="dim-label" />
  <GtkLabel label={formatTime(duration)} className="dim-label" />`,
  },
  {
    code: `  <GtkButton className="suggested-action" style={{ borderRadius: "50%", padding: 12 }}>
    {playing ? <MediaPlaybackPause size={24} /> : <MediaPlaybackStart size={24} />}
  </GtkButton>`,
  },
  {
    code: `  <GtkButton hasFrame={false}><MediaSeekBackward size={20} /></GtkButton>
  <GtkButton hasFrame={false}><MediaSeekForward size={20} /></GtkButton>
</GtkWindow>`,
  },
];
