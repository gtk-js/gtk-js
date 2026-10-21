"use client";

import { useEffect, useState } from "react";

export interface TypeAnimationOptions {
  /** Characters per second. Default: 30. */
  speed?: number;
  /** Delay before starting (ms). Default: 0. */
  startDelay?: number;
  /** Whether to show a blinking cursor. Default: true. */
  showCursor?: boolean;
}

export function useTypeAnimation(target: string, options: TypeAnimationOptions = {}) {
  const { speed = 30, startDelay = 0, showCursor = true } = options;
  const [index, setIndex] = useState(0);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setIndex(0);
    setStarted(false);
    setDone(false);

    const startTimeout = setTimeout(() => setStarted(true), startDelay);
    return () => clearTimeout(startTimeout);
  }, [target, startDelay]);

  useEffect(() => {
    if (!started || index >= target.length) {
      if (index >= target.length) setDone(true);
      return;
    }

    const interval = 1000 / speed;
    const timeout = setTimeout(() => {
      setIndex((i) => i + 1);
    }, interval);

    return () => clearTimeout(timeout);
  }, [started, index, target, speed]);

  const text = target.slice(0, index);
  const cursor = showCursor && !done ? "▎" : "";

  return { text, cursor, done, progress: target.length > 0 ? index / target.length : 1 };
}
