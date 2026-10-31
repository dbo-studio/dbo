export type ServerEvent = { type: string; data: Record<string, unknown> };

/** Reads GET /api/events the way the app's client does, keeping every event it receives. */
export class EventStream {
  events: ServerEvent[] = [];
  private controller = new AbortController();
  private reading?: Promise<void>;

  async open(baseURL: string, cookie = ""): Promise<void> {
    // The stream is scoped to the owner the session cookie names, so it must carry the page's cookies.
    const response = await fetch(`${baseURL}/api/events`, { signal: this.controller.signal, headers: cookie ? { cookie } : {} });
    if (!response.ok || !response.body) throw new Error(`events stream answered ${response.status}`);
    expectStream(response.headers.get("content-type"));

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let connected: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => (connected = resolve));

    this.reading = (async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) return;
          buffer += decoder.decode(value, { stream: true });
          for (let end = buffer.indexOf("\n\n"); end !== -1; end = buffer.indexOf("\n\n")) {
            const block = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            if (block.startsWith(": connected")) connected();
            const type = /^event: (.+)$/m.exec(block)?.[1];
            const data = /^data: (.+)$/m.exec(block)?.[1];
            if (type && data) this.events.push({ type, data: JSON.parse(data) as Record<string, unknown> });
          }
        }
      } catch {
        // closed by close()
      }
    })();

    await ready;
  }

  of(type: string): ServerEvent[] {
    return this.events.filter((event) => event.type === type);
  }

  async close(): Promise<void> {
    this.controller.abort();
    await this.reading;
  }
}

function expectStream(contentType: string | null): void {
  if (!contentType?.startsWith("text/event-stream")) throw new Error(`not an event stream: ${contentType}`);
}
