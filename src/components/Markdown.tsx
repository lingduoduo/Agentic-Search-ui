import React from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const CITATION_RE = /(\[(?:R\d+Q\d+)?D\d+\])/;

function linkifyCitations(children: React.ReactNode): React.ReactNode {
  if (Array.isArray(children)) {
    return (children as React.ReactNode[]).flatMap((child, i) => {
      if (typeof child !== "string") return [child];
      const parts = child.split(CITATION_RE);
      if (parts.length === 1) return [child];
      return parts.map((part, j) =>
        /^\[(?:R\d+Q\d+)?D\d+\]$/.test(part)
          ? React.createElement("a", { key: `${i}-${j}`, href: `#source-${part}`, className: "citation-link" }, part)
          : part
      );
    });
  }
  if (typeof children !== "string") return children;
  const parts = children.split(CITATION_RE);
  if (parts.length === 1) return children;
  return parts.map((part, i) =>
    /^\[(?:R\d+Q\d+)?D\d+\]$/.test(part)
      ? React.createElement("a", { key: i, href: `#source-${part}`, className: "citation-link" }, part)
      : part
  );
}

const markdownComponents: Components = {
  p({ children }) {
    return <p>{linkifyCitations(children as React.ReactNode)}</p>;
  },
  code({ className, children }) {
    const isBlock = Boolean(className);
    return isBlock
      ? <pre><code className={className}>{children}</code></pre>
      : <code>{children}</code>;
  },
};

/** The answer renderer. Its own module so react-markdown is a separate chunk. */
export default function Markdown({ children }: { children: string }) {
  return <ReactMarkdown components={markdownComponents}>{children}</ReactMarkdown>;
}
