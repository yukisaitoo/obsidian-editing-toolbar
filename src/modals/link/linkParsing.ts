import { Editor, EditorPosition } from "obsidian";

export interface LinkTarget {
  isImage: boolean;
  text: string;
  url: string;
  title: string;
  from: EditorPosition;
  to: EditorPosition;
}

export interface ParsedLink {
  text: string;
  url: string;
  title?: string;
}

export interface ParsedImage extends ParsedLink {
  width?: string;
  height?: string;
}

const MARKDOWN_LINK =
  /\[([^\]]+)\]\(([a-zA-Z]+:\/\/[^\s)]+)(?:\s+["']([^"']*)["'])?\)/;
const MARKDOWN_IMAGE =
  /!\[(.*?)(?:\|(\d+)(?:x(\d+))?)?\]\(\s*([^\s)]+)(?:\s+["']([^"']*)["'])?\s*\)/;
const ANY_MARKDOWN_LINK =
  /(!)?\[([^\]]+)\]\(([^\s)]+)(?:\s+["']([^"']*)["'])?\)/g;
const BARE_URL =
  /(?:^|\s)([a-zA-Z][a-zA-Z\d+\-.]*:\/\/\S+|\S+\.[a-zA-Z]{2,}(?:\/\S*)?)/g;
const IMAGE_EXTENSION = /\.(jpg|jpeg|png|gif|webp|bmp)$/i;

/** Where a markdown link or image sits inside a longer string, if at all. */
export function findLinkSpan(
  text: string,
  kind: "link" | "image",
): { start: number; length: number; source: string } | null {
  const match = text.match(kind === "image" ? MARKDOWN_IMAGE : MARKDOWN_LINK);
  if (!match) return null;
  return {
    start: match.index ?? 0,
    length: match[0].length,
    source: match[0],
  };
}

export function parseMarkdownLink(markdown: string): ParsedLink | null {
  const match = markdown.match(MARKDOWN_LINK);
  if (!match) return null;
  const [, text, url, title] = match;
  return { text: text.trim(), url: url.trim(), title: title?.trim() };
}

export function parseMarkdownImageLink(markdown: string): ParsedImage | null {
  const match = markdown.match(MARKDOWN_IMAGE);
  if (!match) return null;
  const [, text, width, height, url, title] = match;
  return { text: text.trim(), url: url.trim(), title: title?.trim(), width, height };
}

/** Renders a target back to markdown, round-tripping what was matched. */
export function formatTargetText(target: LinkTarget): string {
  const bang = target.isImage ? "!" : "";
  const title = target.title ? ` "${target.title}"` : "";
  return `${bang}[${target.text}](${target.url}${title})`;
}

/**
 * Finds the markdown link or bare URL overlapping [startPos, endPos] on `line`.
 * Markdown wins over bare URLs so the full `[text](url)` span is claimed.
 */
export function matchLinkInLine(
  line: string,
  startPos: number,
  endPos: number,
  lineNumber: number,
): LinkTarget | null {
  const overlaps = (from: number, to: number) =>
    startPos <= to && endPos >= from;

  ANY_MARKDOWN_LINK.lastIndex = 0;
  for (const match of line.matchAll(ANY_MARKDOWN_LINK)) {
    const from = match.index;
    const to = from + match[0].length;
    if (!overlaps(from, to)) continue;
    return {
      isImage: !!match[1],
      text: match[2],
      url: match[3],
      title: match[4] || "",
      from: { line: lineNumber, ch: from },
      to: { line: lineNumber, ch: to },
    };
  }

  for (const match of line.matchAll(BARE_URL)) {
    const url = match[1];
    const from = match.index + (match[0].startsWith(" ") ? 1 : 0);
    const to = from + url.length;
    if (!overlaps(from, to)) continue;
    return {
      isImage: IMAGE_EXTENSION.test(url),
      text: url,
      url,
      title: "",
      from: { line: lineNumber, ch: from },
      to: { line: lineNumber, ch: to },
    };
  }

  return null;
}

export function findLinkAtCursor(
  editor: Editor,
  cursor: EditorPosition,
): LinkTarget | null {
  return matchLinkInLine(editor.getLine(cursor.line), cursor.ch, cursor.ch, cursor.line);
}

/** Grows a selection out to the whole link it sits inside, if any. */
export function expandSelectionToLink(editor: Editor): LinkTarget | null {
  const from = editor.getCursor("from");
  return matchLinkInLine(
    editor.getLine(from.line),
    from.ch,
    editor.getCursor("to").ch,
    from.line,
  );
}

const TITLE_URL = /^(.*?)\s*((?:https?:\/\/|www\.)\S+)$/i;
const WRAPPED_MARKDOWN = /^\[(.*?)\]\((.*?)\)$/;
const HTML_ANCHOR = /<a[^>]+href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/i;

/** Best-effort title/url from arbitrary pasted or selected text. Never fails. */
export function parseMixedContent(content: string): {
  title: string;
  url: string;
} {
  const markdown = content.match(WRAPPED_MARKDOWN);
  if (markdown) return { title: markdown[1].trim(), url: markdown[2].trim() };

  const anchor = content.match(HTML_ANCHOR);
  if (anchor) return { title: anchor[2].trim(), url: anchor[1].trim() };

  const titled = content.match(TITLE_URL);
  if (titled && titled[1].trim()) {
    return { title: titled[1].trim(), url: titled[2].trim() };
  }

  const trimmed = content.trim();
  return isValidUrl(trimmed)
    ? { title: extractTitleFromUrl(trimmed), url: trimmed }
    : { title: trimmed, url: "" };
}

export function extractTitleFromUrl(url: string): string {
  const protocol = url.match(/^([a-zA-Z]+):\/\/(.+)$/);
  if (protocol) {
    const lastSegment = protocol[2].split(/[/\\]/).pop();
    return lastSegment
      ? decodeURIComponent(lastSegment).trim()
      : protocol[1].toUpperCase();
  }

  const wikiLink = url.match(/^\[\[(.*?)\]\]$/);
  if (wikiLink) return wikiLink[1];

  return basename(url) ?? url;
}

// Anything Obsidian will actually follow, not just what `new URL()` accepts:
// app protocols, wiki links, and absolute or relative file paths.
const APP_PROTOCOLS = [
  "obsidian://",
  "zotero://",
  "evernote://",
  "notion://",
  "bear://",
  "things://",
  "drafts://",
  "x-devonthink-item://",
  "file://",
  "ftp://",
  "ftps://",
  "http://",
  "https://",
  "tel:",
  "mailto:",
];

const PATH_LIKE = [
  /^[./\\]/,
  /^[a-zA-Z]:\\/,
  /^\/[^/]/,
  /^[a-zA-Z]+:\/\//,
];

export function isValidUrl(url: string): boolean {
  if (!url || /\s/.test(url)) return false;
  if (APP_PROTOCOLS.some((protocol) => url.startsWith(protocol))) return true;
  if (/^\[\[.*?\]\]$/.test(url)) return true;
  if (PATH_LIKE.some((pattern) => pattern.test(url))) return true;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/** Last path segment, stripped of its extension and separators. */
export function basename(url: string): string | null {
  const match = url.match(/[^/\\]+$/);
  if (!match) return null;
  return match[0]
    .replace(/\.[^/.]+$/, "")
    .replace(/[-_]/g, " ")
    .trim();
}
