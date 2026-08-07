// Attributes need an `=`, or `a<b and c>d` and `Map<K, V>` read as tags. `!` stays
// out so `<!-- -->` survives, as `%%…%%` does: comments are hidden text, not
// formatting.
export const HTML_TAG = /<\/?[A-Za-z][\w-]*(?:\s[^<>]*=[^<>]*)?\s*\/?>/g;

// Void elements never close, so they must not read as an unbalanced open.
export const VOID_TAG =
  /^<(?:area|base|br|col|embed|hr|img|input|link|meta|source|track|wbr)\b/i;
