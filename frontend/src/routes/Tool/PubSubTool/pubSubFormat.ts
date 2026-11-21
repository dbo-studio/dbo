export const PUBSUB_MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

export function prettyPubSubPayload(payload: string | undefined): string {
  try {
    return JSON.stringify(JSON.parse(payload ?? ''), null, 2);
  } catch {
    return payload ?? '';
  }
}