"use client";

import { AdwaitaProvider } from "@gtk-js/adwaita";
import {
  AudioVolumeHigh,
  EditCopy,
  MediaPlaybackPause,
  MediaPlaybackStart,
  MediaSeekBackward,
  MediaSeekForward,
  ObjectSelect,
} from "@gtk-js/icons-adwaita";
import type { ReactNode } from "react";

const icons = {
  AudioVolumeHigh,
  EditCopy,
  MediaPlaybackPause,
  MediaPlaybackStart,
  MediaSeekBackward,
  MediaSeekForward,
  ObjectSelect,
};

export function GtkProviders({ children }: { children: ReactNode }) {
  return (
    <AdwaitaProvider icons={icons} hideUntilReady={false}>
      {children}
    </AdwaitaProvider>
  );
}
