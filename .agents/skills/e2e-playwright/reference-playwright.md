# Playwright Best Practices (condensed)

Source: [Playwright Best Practices](https://playwright.dev/docs/best-practices). Adapted for DBO `e2e/`.

## Philosophy

- Test **user-visible** behavior, not internals (CSS class names, private store shape) unless a documented test hook exists (e.g. `__FORM_OBJECT_STORE__` for Monaco gaps).
- Keep tests **isolated** — own data, own names, cleanup even on failure.
- Control the database: ephemeral app SQLite via harness; unique names on sample PG/MySQL.
- Do not assert against third-party sites; mock if needed (`page.route`).

## Locators (priority)

1. `getByRole` / `getByLabel` / `getByPlaceholder` / `getByText`
2. `getByTestId` (product contract — prefer adding testids in `frontend/` when missing)
3. Avoid CSS/XPath tied to structure or hashed class names

```ts
// Prefer
await page.getByRole('button', { name: 'Yes' }).click();
await page.getByTestId('add-connection').click();

// Avoid
await page.locator('button.css-abc123').click();
```

Chain/filter to narrow:

```ts
page.getByRole('listitem').filter({ hasText: 'Product 2' }).getByRole('button', { name: 'Add to cart' });
```

Use codegen when stuck: `cd e2e && npm run test:codegen` (via harness).

## Assertions

```ts
// Good — auto-wait/retry
await expect(page.getByText('welcome')).toBeVisible();

// Bad — no wait
expect(await page.getByText('welcome').isVisible()).toBe(true);
```

Soft assertions (`expect.soft`) only when collecting multiple independent checks in one step is intentional.

## Network waits

Prefer user-visible UI after an action. When you need status/body, use `helpers/network.ts`
(`apiRoute.*` matchers + short timeouts):

```ts
import { apiRoute, waitForResponseDuring, API_DB_TIMEOUT } from '../helpers/network';

// Default API_TIMEOUT is 5s — local API should answer well under that.
await waitForResponseDuring(page, apiRoute.queryRaw, () => button.click());

// DB round-trips (ping) can use API_DB_TIMEOUT (15s); DDL uses API_DDL_TIMEOUT (60s).
await waitForResponseDuring(
  page,
  apiRoute.connectionsPing,
  () => testBtn.click(),
  API_DB_TIMEOUT,
);
```

Never:

- Start `waitForResponse` **after** the click that fires the request.
- Soft-catch timeouts (`.catch(() => undefined)`).
- Use broad `url.includes('connections')` matchers — use `apiRoute.*` instead.
## Isolation & hooks

- Prefer setup inside the test or `beforeEach` that does not share mutable server state across files.
- In DBO: `uniqueTestSuffix` + `withConnectionCleanup` + lifecycle `try/finally`.
- Parallelism is off by default (`workers=1`); do not enable until isolation is proven.

## Debugging

| Tool | When |
|------|------|
| List reporter | Default — see which `test.step` failed |
| HTML report | `e2e/playwright-report/` |
| Trace Viewer | `npx playwright show-trace <trace.zip>` — timeline, DOM, network |
| UI mode | `npm run test:ui` |
| `--debug` | Step through a single failing test |

DBO config retains trace/screenshot/video **on failure**.

## CI notes

- Install only Chromium: `npx playwright install chromium`
- Run via `npm test` so the ephemeral stack starts
- Fail-fast (`maxFailures: 1`) is intentional for local/QA loops
