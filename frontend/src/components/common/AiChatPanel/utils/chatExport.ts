import type { AiChatType, AiMessageType } from '@/types';

const FENCE = '```';

function messageToMarkdown(message: AiMessageType): string | undefined {
  if (message.role === 'user') {
    return `### You\n\n${message.content.trim()}`;
  }

  // Tool traces, diagram diffs and permission requests carry raw SQL/args; keep exports to the conversation.
  if (message.type === 'explanation') {
    return `### Assistant\n\n${message.content.trim()}`;
  }

  if (message.type === 'code') {
    return `### Assistant\n\n${FENCE}${message.language}\n${message.content.trim()}\n${FENCE}`;
  }

  return undefined;
}

export function chatToMarkdown(chat: AiChatType): string {
  const body = chat.messages.map(messageToMarkdown).filter((part): part is string => Boolean(part));
  return [`# ${chat.title}`, ...body].join('\n\n') + '\n';
}

export function chatFileName(chat: AiChatType): string {
  const slug = chat.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${slug || 'chat'}.md`;
}
