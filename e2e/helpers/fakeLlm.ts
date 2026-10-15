import { expect, type Page } from "@playwright/test";
import { createServer, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

/**
 * OpenAI-compatible stand-in for an LLM so e2e runs the real agent loop.
 * With a script the model asks for one tool call; after the tool result (or
 * with no script) it answers "ok".
 */

export type ToolCallScript = { name: string; args: Record<string, unknown> };

export class FakeLlm {
  /** Tool names offered to the model, one entry per completion request. */
  readonly offeredTools: string[][] = [];
  script: ToolCallScript | null = null;
  private server: Server | null = null;

  async start(): Promise<string> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => this.handle(Buffer.concat(chunks).toString("utf8"), res));
    });
    await new Promise<void>((resolve) => this.server?.listen(0, "127.0.0.1", resolve));
    return `http://127.0.0.1:${(this.server?.address() as AddressInfo).port}/v1`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => (this.server ? this.server.close(() => resolve()) : resolve()));
  }

  private handle(rawBody: string, res: ServerResponse): void {
    const body = JSON.parse(rawBody || "{}") as {
      tools?: Array<{ function?: { name?: string } }>;
      messages?: Array<{ role: string }>;
    };
    const tools = (body.tools ?? []).map((tool) => tool.function?.name ?? "");
    if (tools.length > 0) {
      this.offeredTools.push(tools);
    }

    const afterToolResult = body.messages?.at(-1)?.role === "tool";
    const call = !afterToolResult && tools.length > 0 ? this.script : null;

    res.writeHead(200, { "content-type": "text/event-stream" });
    const send = (delta: Record<string, unknown>, finish: string | null): void => {
      res.write(
        `data: ${JSON.stringify({
          id: "chatcmpl-e2e",
          object: "chat.completion.chunk",
          created: 1,
          model: "fake-model",
          choices: [{ index: 0, delta, finish_reason: finish }],
        })}\n\n`,
      );
    };

    if (call) {
      send(
        {
          role: "assistant",
          tool_calls: [
            {
              index: 0,
              id: "call_e2e",
              type: "function",
              function: { name: call.name, arguments: JSON.stringify(call.args) },
            },
          ],
        },
        null,
      );
      send({}, "tool_calls");
    } else {
      send({ role: "assistant", content: "ok" }, null);
      send({}, "stop");
    }
    res.write("data: [DONE]\n\n");
    res.end();
  }
}

export async function pointProviderAtFakeLlm(page: Page, url: string): Promise<void> {
  const list = await page.request.get("/api/ai/providers");
  const body = (await list.json()) as { data?: Array<{ id: number; type: string }> };
  const provider = body.data?.find((item) => item.type === "openai") ?? body.data?.[0];
  expect(provider, "an AI provider row exists").toBeDefined();

  const update = await page.request.patch(`/api/ai/providers/${provider?.id}`, {
    data: { url, apiKey: "sk-e2e-fake-key", model: "fake-model", models: ["fake-model"], isActive: true },
  });
  expect(update.status()).toBe(200);
}
