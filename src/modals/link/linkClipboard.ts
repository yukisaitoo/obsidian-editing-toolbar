import { requestUrl } from "obsidian";
import {
  basename,
  parseMixedContent,
  ParsedImage,
  ParsedLink,
  parseMarkdownImageLink,
  parseMarkdownLink,
} from "src/modals/link/linkParsing";

const READABLE_TYPES = ["text/html", "text/plain", "text/markdown"] as const;

export interface ClipboardLink {
  image?: ParsedImage;
  link?: ParsedLink;
  fallback?: { title: string; url: string };
}

/**
 * Reads the clipboard and reports the richest link it can find. A markdown image
 * or link is taken verbatim; anything else is best-effort title/url extraction.
 */
export async function readClipboardLink(): Promise<ClipboardLink> {
  const items = await readClipboard();
  const plain = items["text/plain"];

  if (plain) {
    const image = parseMarkdownImageLink(plain);
    if (image) return { image };

    const link = parseMarkdownLink(plain);
    if (link) return { link };
  }

  if (items["text/html"]) {
    return { fallback: parseHtmlContent(items["text/html"]) };
  }
  if (items["text/markdown"]) {
    return { fallback: parseMarkdownContent(items["text/markdown"]) };
  }
  if (plain) {
    return { fallback: parseMixedContent(plain) };
  }

  return {};
}

async function readClipboard(): Promise<Record<string, string>> {
  const items: Record<string, string> = {};

  try {
    for (const item of await navigator.clipboard.read()) {
      for (const type of item.types) {
        if (!READABLE_TYPES.includes(type as (typeof READABLE_TYPES)[number])) {
          continue;
        }
        items[type] = await (await item.getType(type)).text();
      }
    }
    return items;
  } catch {
    // Firefox and some Linux setups only expose readText().
    try {
      items["text/plain"] = await navigator.clipboard.readText();
    } catch (error) {
      console.error("editing-toolbar: failed to read clipboard", error);
    }
    return items;
  }
}

function parseHtmlContent(html: string): { title: string; url: string } {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const anchor = doc.querySelector("a");
  if (anchor) {
    return { title: anchor.textContent?.trim() || "", url: anchor.href };
  }
  return parseMixedContent(doc.body.textContent || "");
}

function parseMarkdownContent(markdown: string): { title: string; url: string } {
  const match = markdown.match(/\[([^\]]+)\]\(([^)]+)\)/);
  return match
    ? { title: match[1].trim(), url: match[2].trim() }
    : parseMixedContent(markdown);
}

const TITLE_PATTERNS = [
  /<title>([^<]*)<\/title>/im,
  /<title [^>]*>(.*?)<\/title>/i,
  /<meta name="title" content="([^<]*)" \/>/im,
];
const WECHAT_TITLE = /<meta property="og:title" content="([^<]*)" \/>/im;

const MAX_TITLE_LENGTH = 100;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36";

/** Fetches a page's <title>, falling back to the URL's last path segment. */
export async function fetchRemoteTitle(url: string): Promise<string> {
  const fallback = basename(url) ?? url;
  if (!/^https?:\/\//.test(url)) return fallback;

  try {
    const response = await requestUrl({
      url,
      method: "GET",
      headers: { "User-Agent": USER_AGENT },
      throw: true,
    });
    if (response.status !== 200) return fallback;

    const title = parseTitle(url, response.text);
    return title && title.length <= MAX_TITLE_LENGTH ? title : fallback;
  } catch (error) {
    console.error(`editing-toolbar: failed to fetch title for ${url}`, error);
    return fallback;
  }
}

function parseTitle(url: string, body: string): string | null {
  const patterns = url.includes("mp.weixin.qq.com")
    ? [WECHAT_TITLE, ...TITLE_PATTERNS]
    : TITLE_PATTERNS;

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (typeof match?.[1] === "string") return match[1].trim();
  }
  return null;
}
