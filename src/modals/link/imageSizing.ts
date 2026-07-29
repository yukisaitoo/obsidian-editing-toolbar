import { App, MarkdownView } from "obsidian";

/** Fraction of the editor width an inserted image is sized to. */
const WIDTH_RATIO = 0.65;
/** Tallest an inserted image may be, as a fraction of the view height. */
const HEIGHT_RATIO = 0.5;
/** Used when the image is not on screen to measure, so it has no known ratio. */
const DEFAULT_ASPECT_RATIO = 4 / 3;

export interface ImageDimensions {
  width: number;
  /** Null when the image could not be measured, leaving the height to Obsidian. */
  height: number | null;
}

/** Resource paths carry a `?<mtime>` cache-buster the markdown target lacks. */
const stripQuery = (src: string): string => src.split("?")[0];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * A width (and height, when measurable) that fits `url`'s image into the active
 * editor. Null when there is no markdown view to measure against.
 */
export function measureImageDimensions(
  app: App,
  url: string,
): ImageDimensions | null {
  const view = app.workspace.getActiveViewOfType(MarkdownView);
  if (!view) return null;

  const editorEl = view.contentEl.querySelector<HTMLElement>(
    ".markdown-source-view .cm-content",
  );
  if (!editorEl) return null;

  const editorWidth = editorEl.offsetWidth;
  const maxWidth = Math.floor(editorWidth * WIDTH_RATIO);
  const maxHeight = Math.floor(view.contentEl.offsetHeight * HEIGHT_RATIO);

  const rendered = findRenderedImage(app, editorEl, url);
  if (!rendered) {
    return {
      width: Math.min(maxWidth, Math.floor(maxHeight * DEFAULT_ASPECT_RATIO)),
      height: null,
    };
  }

  const aspectRatio = rendered.naturalWidth / rendered.naturalHeight;
  let width = Math.min(rendered.naturalWidth, maxWidth);
  let height = Math.floor(width / aspectRatio);

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.floor(height * aspectRatio);
  }

  return { width, height };
}

/** The first loaded, on-screen `<img>` for `url`, if there is one. */
function findRenderedImage(
  app: App,
  editorEl: HTMLElement,
  url: string,
): HTMLImageElement | null {
  const resolved = resolveImageSrc(app, url);
  if (!resolved) return null;

  const target = stripQuery(resolved);
  for (const img of Array.from(editorEl.querySelectorAll("img"))) {
    if (stripQuery(img.src) === target && img.complete && img.naturalWidth > 0) {
      return img;
    }
  }
  return null;
}

/**
 * `img.src` is always fully resolved — `app://<id>/<abs-path>?<mtime>` for a
 * vault file — while the markdown holds the raw target, so the link has to be
 * resolved the same way or vault images never match and every one of them falls
 * back to the default aspect ratio.
 */
function resolveImageSrc(app: App, url: string): string | null {
  if (!url) return null;
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(url)) return url;

  const file = app.metadataCache.getFirstLinkpathDest(
    safeDecode(url),
    app.workspace.getActiveFile()?.path ?? "",
  );
  return file ? app.vault.getResourcePath(file) : null;
}
