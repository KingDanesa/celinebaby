/**
 * Simple text format for blog articles, easy to type in the admin:
 *
 *   Paragraphs are separated by an empty line.
 *   ## Subheading
 *   ### Smaller subheading
 *   - list item            (several lines in a row make one list)
 *   **bold**   *italic*   [link text](https://… or /ru/catalog/…)
 *   ![caption](/uploads/photo.jpg)   on its own line: a photo with an optional caption
 *
 * Everything is HTML-escaped first, so nothing typed in the admin can inject code into the site.
 */

export const IMAGE_LINE = /^!\[([^\]]*)\]\(((?:https?:\/\/|\/)[^)]+)\)$/;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function inline(text: string): string {
  let s = esc(text);
  s = s.replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/)[^\s)]+)\)/g, (_m, label: string, url: string) => {
    const external = url.startsWith("http");
    return `<a href="${url}"${external ? ' target="_blank" rel="noopener noreferrer"' : ""}>${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
  return s;
}

export function markupToHtml(markup: string): string {
  const blocks = markup.replace(/\r\n?/g, "\n").split(/\n\s*\n/);
  const out: string[] = [];
  for (const raw of blocks) {
    const lines = raw.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
    if (!lines.length) continue;
    let para: string[] = [];
    let list: string[] = [];
    const flushPara = () => {
      if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`);
      para = [];
    };
    const flushList = () => {
      if (list.length) out.push(`<ul>${list.map((li) => `<li>${inline(li)}</li>`).join("")}</ul>`);
      list = [];
    };
    for (const line of lines) {
      const t = line.trim();
      const h3 = t.match(/^###\s+(.+)/);
      const h2 = !h3 && t.match(/^##\s+(.+)/);
      const li = t.match(/^[-•–]\s+(.+)/);
      const img = t.match(IMAGE_LINE);
      if (img) {
        flushPara();
        flushList();
        const caption = img[1].trim();
        out.push(
          `<figure><img src="${esc(encodeURI(decodeURI(img[2])))}" alt="${esc(caption)}" loading="lazy">${caption ? `<figcaption>${inline(caption)}</figcaption>` : ""}</figure>`,
        );
      } else if (h2 || h3) {
        flushPara();
        flushList();
        out.push(h3 ? `<h3>${inline(h3[1])}</h3>` : `<h2>${inline((h2 as RegExpMatchArray)[1])}</h2>`);
      } else if (li) {
        flushPara();
        list.push(li[1]);
      } else {
        flushList();
        para.push(t);
      }
    }
    flushPara();
    flushList();
  }
  return out.join("\n");
}

/** Converts the HTML of the first articles into the editor format. */
export function htmlToMarkup(html: string): string {
  return html
    .replace(/\r\n?/g, "\n")
    .replace(/>\s+</g, "><")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n\n$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)>([\s\S]*?)<\/\1>/gi, "*$2*")
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, "[$2]($1)")
    .replace(/<img [^>]*src="([^"]+)"[^>]*?(?:alt="([^"]*)")?[^>]*>/gi, "\n\n![$2]($1)\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Photos used inside an article, in order. */
export function bodyImages(markup: string): { line: number; url: string; caption: string }[] {
  return markup
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l, line) => {
      const m = l.trim().match(IMAGE_LINE);
      return m ? { line, url: m[2], caption: m[1] } : null;
    })
    .filter((x): x is { line: number; url: string; caption: string } => !!x);
}

export function readingMinutes(markup: string): number {
  const words = markup.replace(/!\[[^\]]*\]\([^)]*\)/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 180));
}
