import type { ReactNode } from "react";

/**
 * Minimal markdown renderer for GitHub release notes. Supports headings,
 * lists, fenced code blocks, blockquotes, bold, inline code, and links.
 * Renders to React elements, so no HTML injection is possible.
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">
      {parseBlocks(text)}
    </div>
  );
}

const INLINE_RE = /(`[^`]+`)|(\*\*[^*]+\*\*)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const m of text.matchAll(INLINE_RE)) {
    const index = m.index;
    if (index > last) nodes.push(text.slice(last, index));
    if (m[1]) {
      nodes.push(
        <code
          key={key++}
          className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground"
        >
          {m[1].slice(1, -1)}
        </code>,
      );
    } else if (m[2]) {
      nodes.push(
        <strong key={key++} className="font-medium text-foreground">
          {m[2].slice(2, -2)}
        </strong>,
      );
    } else if (m[3] && m[4]) {
      nodes.push(
        <a
          key={key++}
          href={m[4]}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          {m[3]}
        </a>,
      );
    }
    last = index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function parseBlocks(text: string): ReactNode[] {
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  const blocks: ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    // fenced code block
    if (line.startsWith("```")) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        code.push(lines[i]);
        i++;
      }
      i++; // closing fence
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-lg border border-border/50 bg-muted/40 p-3 font-mono text-[12px] leading-relaxed text-foreground"
        >
          <code>{code.join("\n")}</code>
        </pre>,
      );
      continue;
    }

    // horizontal rule
    if (/^-{3,}\s*$/.test(line)) {
      i++;
      continue;
    }

    // heading, level-aware so sections read as a hierarchy. Within a
    // changelog entry, "###" are category labels (Performance, Fixes, …) and
    // "####" are finer sub-headings.
    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2]);
      blocks.push(
        level <= 3 ? (
          <h3
            key={key++}
            className="pt-5 font-mono text-[11px] font-semibold tracking-widest text-foreground/70 uppercase first:pt-0"
          >
            {content}
          </h3>
        ) : (
          <h4 key={key++} className="pt-2 text-sm font-semibold text-foreground">
            {content}
          </h4>
        ),
      );
      i++;
      continue;
    }

    // list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="space-y-1.5 pl-1">
          {items.map((item, n) => (
            <li key={n} className="flex gap-2.5">
              <span
                className="mt-[9px] size-1 shrink-0 rounded-full bg-copper"
                aria-hidden="true"
              />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // blockquote
    if (line.startsWith(">")) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoted.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-border pl-3 text-[13px] italic">
          {renderInline(quoted.join(" "))}
        </blockquote>,
      );
      continue;
    }

    // paragraph: consume until blank line or a line that starts another block
    const para: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !/^(#{1,4}\s|```|\s*[-*+]\s|>|-{3,}\s*$)/.test(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={key++}>{renderInline(para.join(" "))}</p>);
  }

  return blocks;
}
