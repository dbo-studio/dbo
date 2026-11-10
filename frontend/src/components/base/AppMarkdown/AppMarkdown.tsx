import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { JSX, ReactNode } from 'react';

const isSafeHref = (href: string): boolean => {
  try {
    const url = new URL(href, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const textOf = (node: ReactNode): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(textOf).join('');
  return '';
};

const baseComponents: Components = {
  a: ({ href, children, ...props }) => {
    if (!href || !isSafeHref(href)) {
      return <span>{children}</span>;
    }

    return (
      <a href={href} rel='noopener noreferrer' target='_blank' {...props}>
        {children}
      </a>
    );
  }
};

type AppMarkdownProps = {
  children: string;
  /** Replaces fenced code blocks (``` ... ```); inline code is untouched. */
  renderCodeBlock?: (code: string, language: string) => ReactNode;
};

export default function AppMarkdown({ children, renderCodeBlock }: AppMarkdownProps): JSX.Element {
  const components: Components = renderCodeBlock
    ? {
        ...baseComponents,
        pre: ({ children: preChildren }) => <>{preChildren}</>,
        code: ({ className, children: codeChildren, ...props }) => {
          const text = textOf(codeChildren);
          const language = /language-(\w+)/.exec(className ?? '')?.[1];
          if (language === undefined && !text.includes('\n')) {
            return (
              <code className={className} {...props}>
                {codeChildren}
              </code>
            );
          }

          return <>{renderCodeBlock(text.replace(/\n$/, ''), language ?? 'text')}</>;
        }
      }
    : baseComponents;

  return <Markdown components={components}>{children}</Markdown>;
}
