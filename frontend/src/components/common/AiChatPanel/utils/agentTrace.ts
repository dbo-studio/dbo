import type {
  AiAgentItem,
  AiMessageType,
  AiPermissionRequest,
  AiPlanStep,
  AiToolTrace,
  AiTraceMessageKind
} from '@/types';

const TRACE_KINDS: ReadonlySet<string> = new Set<AiTraceMessageKind>(['tool', 'diagram_diff', 'permission', 'plan']);

export const isTraceMessage = (message: AiMessageType): boolean => TRACE_KINDS.has(message.type);

/** Parses a persisted tool / diagram_diff / permission / plan message into a card item. */
export const traceMessageToItem = (message: AiMessageType): AiAgentItem | undefined => {
  try {
    const payload: unknown = JSON.parse(message.content);
    switch (message.type) {
      case 'tool':
        return { kind: 'tool', trace: payload as AiToolTrace };
      case 'diagram_diff':
        return { kind: 'diagram_diff', changesetId: (payload as { changesetId: number }).changesetId };
      case 'permission':
        return { kind: 'permission', request: payload as AiPermissionRequest };
      case 'plan':
        return { kind: 'plan', steps: (payload as { steps: AiPlanStep[] }).steps };
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
};

/**
 * Turns live cards into chat messages when a turn is stopped, so the partial
 * work (and any pending diagram proposal) stays visible. Running tools are
 * marked cancelled.
 */
export const agentItemToMessage = (item: AiAgentItem): AiMessageType => {
  const base = {
    role: 'assistant' as const,
    createdAt: new Date().toISOString(),
    language: 'json' as const,
    isNew: true
  };
  switch (item.kind) {
    case 'tool':
      return {
        ...base,
        type: 'tool',
        content: JSON.stringify(item.trace.status === 'running' ? { ...item.trace, status: 'cancelled' } : item.trace)
      };
    case 'diagram_diff':
      return { ...base, type: 'diagram_diff', content: JSON.stringify({ changesetId: item.changesetId }) };
    case 'permission':
      return { ...base, type: 'permission', content: JSON.stringify(item.request) };
    case 'plan':
      return { ...base, type: 'plan', content: JSON.stringify({ steps: item.steps }) };
  }
};

type Thinking = AiMessageType['thinking'];

export type RenderBlock =
  | { kind: 'message'; message: AiMessageType; key: string }
  | { kind: 'tools'; items: AiAgentItem[]; key: string; thinking?: Thinking }
  | { kind: 'card'; item: AiAgentItem; key: string; thinking?: Thinking };

/** A newer plan replaces the one shown earlier in the same turn, as it does while streaming. */
const dropTurnPlan = (blocks: RenderBlock[]): void => {
  for (let i = blocks.length - 1; i >= 0; i--) {
    const block = blocks[i];
    if (block.kind === 'message' && block.message.role === 'user') return;
    if (block.kind === 'card' && block.item.kind === 'plan') {
      blocks.splice(i, 1);
      return;
    }
  }
};

/** Groups consecutive tool traces into one "Used N tools" block. */
export const toRenderBlocks = (messages: AiMessageType[]): RenderBlock[] => {
  const blocks: RenderBlock[] = [];

  messages.forEach((message) => {
    const key = `${message.role}-${message.createdAt}-${message.content.slice(0, 64)}`;
    if (!isTraceMessage(message)) {
      blocks.push({ kind: 'message', message, key });
      return;
    }

    const item = traceMessageToItem(message);
    if (!item) return;

    if (item.kind === 'plan') {
      dropTurnPlan(blocks);
    }

    if (item.kind !== 'tool') {
      blocks.push({ kind: 'card', item, key, thinking: message.thinking });
      return;
    }

    const last = blocks[blocks.length - 1];
    if (last?.kind === 'tools') {
      last.items.push(item);
    } else {
      blocks.push({ kind: 'tools', items: [item], key, thinking: message.thinking });
    }
  });

  return blocks;
};

export type LiveBlock =
  { kind: 'tools'; items: AiAgentItem[]; key: string } | { kind: 'card'; item: AiAgentItem; key: string };

/** Same grouping as toRenderBlocks for the cards of the turn being streamed. */
export const groupLiveItems = (items: AiAgentItem[]): LiveBlock[] => {
  const blocks: LiveBlock[] = [];
  items.forEach((item, index) => {
    const last = blocks[blocks.length - 1];
    if (item.kind === 'tool' && last?.kind === 'tools') {
      last.items.push(item);
    } else if (item.kind === 'tool') {
      blocks.push({ kind: 'tools', items: [item], key: `live-tools-${index}` });
    } else {
      blocks.push({ kind: 'card', item, key: `live-card-${index}` });
    }
  });
  return blocks;
};
