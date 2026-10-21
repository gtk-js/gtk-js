"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createHighlighter, type Highlighter } from "shiki";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter() {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-dark"],
      langs: ["tsx"],
    });
  }
  return highlighterPromise;
}

const CURSOR_ID = "sh-cursor";
const CURSOR_HTML = `<span id="${CURSOR_ID}" style="font-style:normal;font-weight:normal;animation:blink 1s step-end infinite">▎</span>`;

function injectCursor(html: string, cursor?: string): string {
  if (!cursor) return html;
  const lastCode = html.lastIndexOf("</code>");
  if (lastCode === -1) return html + CURSOR_HTML;
  return html.slice(0, lastCode) + CURSOR_HTML + html.slice(lastCode);
}

function stripBg(html: string): string {
  return html
    .replace(/background-color:\s*#[0-9a-fA-F]+/g, "background-color:transparent")
    .replace(/background-color:\s*rgb[^;"]*/g, "background-color:transparent");
}

interface SyntaxHighlightProps {
  code: string;
  cursor?: string;
}

export function SyntaxHighlight({ code, cursor }: SyntaxHighlightProps) {
  const [highlighter, setHighlighter] = useState<Highlighter | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getHighlighter().then(setHighlighter);
  }, []);

  const html = useMemo(() => {
    if (!highlighter || !code) return "";
    return highlighter.codeToHtml(code, {
      lang: "tsx",
      theme: "github-dark",
    });
  }, [highlighter, code]);

  // Scroll horizontally to keep the cursor visible after each render
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || !cursor) return;
    const cursorEl = container.querySelector(`#${CURSOR_ID}`) as HTMLElement | null;
    if (!cursorEl) return;
    const containerRect = container.getBoundingClientRect();
    const cursorRect = cursorEl.getBoundingClientRect();
    const cursorRight = cursorRect.right - containerRect.left + container.scrollLeft;
    const cursorLeft = cursorRect.left - containerRect.left + container.scrollLeft;
    if (cursorLeft < container.scrollLeft) {
      // Cursor moved left (new line) — smooth scroll back to start
      container.scrollTo({ left: 0, behavior: "smooth" });
    } else if (cursorRight > container.scrollLeft + container.clientWidth) {
      // Cursor moved past right edge — snap to follow immediately
      container.scrollLeft = cursorRight - container.clientWidth + 16;
    }
  });

  const lines = (code || "").split("\n");

  if (!html) {
    return (
      <div
        style={{ fontFamily: "monospace", fontSize: "0.85rem", lineHeight: 1.6, whiteSpace: "pre" }}
      >
        {code}
        {cursor}
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 16, fontSize: "0.85rem", lineHeight: 1.6 }}>
      <div
        style={{
          fontFamily: "monospace",
          color: "rgba(255,255,255,0.25)",
          textAlign: "right",
          userSelect: "none",
          minWidth: 20,
          flexShrink: 0,
        }}
      >
        {lines.map((_, i) => (
          <div key={i}>{i + 1}</div>
        ))}
      </div>
      <div ref={scrollRef} style={{ flex: 1, minWidth: 0, overflowX: "auto" }}>
        <div
          dangerouslySetInnerHTML={{ __html: injectCursor(stripBg(html), cursor) }}
          style={{ fontFamily: "monospace" }}
        />
      </div>
      <style>{`
        @keyframes blink { 50% { opacity: 0; } }
        .shiki { background-color: transparent !important; }
        .shiki code { white-space: pre !important; }
        .shiki span { font-style: normal !important; }
      `}</style>
    </div>
  );
}
