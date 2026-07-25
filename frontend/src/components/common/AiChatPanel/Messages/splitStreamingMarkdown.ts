export type StreamingMarkdownParts = {
  stable: string;
  pending: string;
};

const splitAtLastCompleteBlock = (content: string): StreamingMarkdownParts => {
  const lastBreak = content.lastIndexOf('\n\n');
  if (lastBreak === -1) {
    return { stable: '', pending: content };
  }

  return {
    stable: content.slice(0, lastBreak),
    pending: content.slice(lastBreak + 2)
  };
};

/**
 * Splits partial markdown into a stable prefix (safe to render) and a pending suffix
 * that is still being typed. Prevents broken formatting from incomplete fences or blocks.
 */
export const splitStreamingMarkdown = (content: string): StreamingMarkdownParts => {
  if (!content) {
    return { stable: '', pending: '' };
  }

  const fenceCount = (content.match(/```/g) ?? []).length;
  if (fenceCount % 2 === 1) {
    const lastFence = content.lastIndexOf('```');
    const beforeFence = content.slice(0, lastFence);
    const openFence = content.slice(lastFence);
    const split = splitAtLastCompleteBlock(beforeFence);

    return {
      stable: split.stable,
      pending: split.pending ? `${split.pending}\n\n${openFence}` : openFence
    };
  }

  return splitAtLastCompleteBlock(content);
};
