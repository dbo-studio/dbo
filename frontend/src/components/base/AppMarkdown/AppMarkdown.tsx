import Markdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { JSX } from 'react';

const isSafeHref = (href: string): boolean => {
  try {
    const url = new URL(href, window.location.origin);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const markdownComponents: Components = {
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
};

export default function AppMarkdown({ children }: AppMarkdownProps): JSX.Element {
  return <Markdown components={markdownComponents}>{children}</Markdown>;
}
