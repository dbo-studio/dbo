import { expect, test, type Page } from "@playwright/test";
import { FakeLlm } from "../../helpers/fakeLlm";

/** The provider settings API: a connection test that lists models, and activation that needs a key. */

type Provider = {
  id: number;
  type: string;
  isActive: boolean;
  model: string;
  apiKey: string | null;
};

async function provider(page: Page, type: string): Promise<Provider> {
  const response = await page.request.get("/api/ai/providers");
  const body = (await response.json()) as { data: Provider[] };
  const found = body.data.find((item) => item.type === type);
  expect(found, `${type} provider exists`).toBeDefined();
  return found as Provider;
}

test.describe("AI provider settings API", () => {
  test("lists models as a connection test and reports failures as answers", async ({
    page,
  }) => {
    const llm = new FakeLlm();
    llm.requiredKey = "sk-right";
    const url = await llm.start();

    try {
      const { id } = await provider(page, "openai");
      const test = (data: Record<string, unknown>) =>
        page.request.post(`/api/ai/providers/${id}/models`, {
          data: { url, ...data },
        });

      {
        const ok = await test({ apiKey: "sk-right" });
        expect(ok.status()).toBe(200);
        expect(
          ((await ok.json()) as { data: { models: string[]; error?: string } })
            .data,
        ).toEqual({
          models: ["fake-model", "fake-model-mini"],
        });
      }

      const wrongKey = await test({ apiKey: "sk-wrong" });
      expect(wrongKey.status()).toBe(200);
      expect(
        (
          (await wrongKey.json()) as {
            data: { models: string[]; error: string };
          }
        ).data,
      ).toEqual({
        models: [],
        error: "the provider rejected the API key",
      });

      const unreachable = await page.request.post(
        `/api/ai/providers/${id}/models`,
        {
          data: {
            url: "http://127.0.0.1:1/v1",
            apiKey: "sk-right",
            timeout: 2,
          },
        },
      );
      expect(unreachable.status()).toBe(200);
      expect(
        ((await unreachable.json()) as { data: { error: string } }).data.error,
      ).toContain("could not reach the provider");

      const badUrl = await test({
        url: "ftp://example.com",
        apiKey: "sk-right",
      });
      expect(badUrl.status()).toBe(400);

      const badTimeout = await test({ timeout: 5000 });
      expect(badTimeout.status()).toBe(422);
    } finally {
      await llm.stop();
    }
  });

  test("a provider cannot become active without a key, except Ollama", async ({
    page,
  }) => {
    const gemini = await provider(page, "gemini");
    const without = await page.request.patch(`/api/ai/providers/${gemini.id}`, {
      data: { isActive: true },
    });
    // The seeded Gemini row has no key unless an earlier spec saved one in this run.
    if (gemini.apiKey === null) {
      expect(without.status()).toBe(422);
      expect(((await without.json()) as { message: string }).message).toContain(
        "API key is required",
      );
    }

    const ollama = await provider(page, "ollama");
    const active = await page.request.patch(`/api/ai/providers/${ollama.id}`, {
      data: { isActive: true },
    });
    expect(active.status()).toBe(200);
    await page.request.patch(`/api/ai/providers/${ollama.id}`, {
      data: { isActive: false },
    });
  });

  test("the Groq entry points at Groq", async ({ page }) => {
    const response = await page.request.get("/api/ai/providers");
    const groq = (
      (await response.json()) as { data: Array<{ type: string; url: string }> }
    ).data.find((item) => item.type === "groq");
    expect(groq?.url).toBe("https://api.groq.com/openai/v1");
  });
});
