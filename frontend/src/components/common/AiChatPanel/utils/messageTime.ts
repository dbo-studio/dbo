/** Backend timestamps are "YYYY-MM-DD HH:mm:ss" (no zone); streamed ones may be ISO or missing. */
export function formatMessageTime(value: string | undefined): string | undefined {
  if (!value) return undefined;

  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? undefined : date.toLocaleString();
}
