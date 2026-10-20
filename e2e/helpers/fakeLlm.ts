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
  /** Text of every system message the model received, one entry per completion request. */
  readonly systemPrompts: string[] = [];
  script: ToolCallScript | null = null;
  /** When set, the answer streams word by word with this pause between words, instead of "ok". */
  reply: { text: string; wordDelayMs: number; startDelayMs?: number } | null =
    null;
  /** Model ids GET /models lists. */
  models = ["fake-model", "fake-model-mini"];
  /** When set, requests without this bearer key get 401, like a provider that rejects a wrong key. */
  requiredKey: string | null = null;
  private server: Server | null = null;

  async start(): Promise<string> {
    this.server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        if (
          this.requiredKey &&
          req.headers.authorization !== `Bearer ${this.requiredKey}`
        ) {
          res.writeHead(401, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              error: {
                message: "Incorrect API key provided",
                type: "invalid_request_error",
              },
            }),
          );
          return;
        }
        if (
          req.method === "GET" &&
          req.url?.split("?")[0].endsWith("/models")
        ) {
          res.writeHead(200, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              object: "list",
              data: this.models.map((id) => ({
                id,
                object: "model",
                created: 1,
                owned_by: "fake",
              })),
            }),
          );
          return;
        }
        this.handle(Buffer.concat(chunks).toString("utf8"), res);
      });
    });
    await new Promise<void>((resolve) =>
      this.server?.listen(0, "127.0.0.1", resolve),
    );
    return `http://127.0.0.1:${(this.server?.address() as AddressInfo).port}/v1`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) =>
      this.server ? this.server.close(() => resolve()) : resolve(),
    );
  }

  private handle(rawBody: string, res: ServerResponse): void {
    const body = JSON.parse(rawBody || "{}") as {
      tools?: Array<{ function?: { name?: string } }>;
      messages?: Array<{ role: string; content?: unknown }>;
    };
    this.systemPrompts.push(
      (body.messages ?? [])
        .filter((message) => message.role === "system")
        .map((message) => JSON.stringify(message.content))
        .join("\n"),
    );
    const tools = (body.tools ?? []).map((tool) => tool.function?.name ?? "");
    if (tools.length > 0) {
      this.offeredTools.push(tools);
    }

    const afterToolResult = body.messages?.at(-1)?.role === "tool";
    const call = !afterToolResult && tools.length > 0 ? this.script : null;

    res.writeHead(200, { "content-type": "text/event-stream" });
    const send = (
      delta: Record<string, unknown>,
      finish: string | null,
    ): void => {
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
              function: {
                name: call.name,
                arguments: JSON.stringify(call.args),
              },
            },
          ],
        },
        null,
      );
      send({}, "tool_calls");
    } else if (this.reply) {
      void this.streamReply(this.reply, send, res);
      return;
    } else {
      send({ role: "assistant", content: "ok" }, null);
      send({}, "stop");
    }
    res.write("data: [DONE]\n\n");
    res.end();
  }

  private async streamReply(
    reply: { text: string; wordDelayMs: number; startDelayMs?: number },
    send: (delta: Record<string, unknown>, finish: string | null) => void,
    res: ServerResponse,
  ): Promise<void> {
    send({ role: "assistant" }, null);
    await new Promise((resolve) =>
      setTimeout(resolve, reply.startDelayMs ?? 0),
    );
    for (const word of reply.text.match(/\S+\s*/g) ?? []) {
      send({ content: word }, null);
      await new Promise((resolve) => setTimeout(resolve, reply.wordDelayMs));
    }
    send({}, "stop");
    res.write("data: [DONE]\n\n");
    res.end();
  }
}

export async function pointProviderAtFakeLlm(
  page: Page,
  url: string,
): Promise<void> {
  const list = await page.request.get("/api/ai/providers");
  const body = (await list.json()) as {
    data?: Array<{ id: number; type: string }>;
  };
  const provider =
    body.data?.find((item) => item.type === "openai") ?? body.data?.[0];
  expect(provider, "an AI provider row exists").toBeDefined();

  const update = await page.request.patch(`/api/ai/providers/${provider?.id}`, {
    data: {
      url,
      apiKey: "sk-e2e-fake-key",
      model: "fake-model",
      models: ["fake-model"],
      isActive: true,
    },
  });
  expect(update.status()).toBe(200);
}
