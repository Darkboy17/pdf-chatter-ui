import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";

const normalizeMathDelimiters = (content = "") =>
  content
    .split(/(```[\s\S]*?```|`[^`\n]*`)/g)
    .map((segment, index) => {
      if (index % 2 === 1) {
        return segment;
      }

      return segment
        .replace(/\\\[([\s\S]*?)\\\]/g, (_, equation) => `$$\n${equation}\n$$`)
        .replace(/\\\(([\s\S]*?)\\\)/g, (_, equation) => `$${equation}$`);
    })
    .join("");

const MarkdownResponse = ({ content }) => (
  <div className="markdown-response">
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[[rehypeHighlight, { detect: false }], rehypeKatex]}
      components={{
        a: ({ node, children, ...props }) => (
          <a target="_blank" rel="noreferrer noopener" {...props}>
            {children}
          </a>
        ),
        blockquote: ({ node, ...props }) => <blockquote {...props} />,
        code: ({ node, className, children, ...props }) => (
          <code className={className || ""} {...props}>
            {children}
          </code>
        ),
        h1: ({ node, children, ...props }) => <h1 {...props}>{children}</h1>,
        h2: ({ node, children, ...props }) => <h2 {...props}>{children}</h2>,
        h3: ({ node, children, ...props }) => <h3 {...props}>{children}</h3>,
        img: ({ node, ...props }) => <img loading="lazy" {...props} alt={props.alt || ""} />,
        input: ({ node, ...props }) => <input {...props} disabled />,
        ol: ({ node, ...props }) => <ol {...props} />,
        p: ({ node, ...props }) => <p {...props} />,
        pre: ({ node, ...props }) => <pre {...props} />,
        table: ({ node, ...props }) => (
          <div className="markdown-table-scroll">
            <table {...props} />
          </div>
        ),
        ul: ({ node, ...props }) => <ul {...props} />,
      }}
    >
      {normalizeMathDelimiters(content)}
    </ReactMarkdown>
  </div>
);

export default MarkdownResponse;
