import { existsSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  getBastionOnlyPostgresConfig,
  getSshBastionConfig,
} from "../../fixtures/dbConfigs";
import { uniqueTestSuffix } from "../../fixtures/uniqueSuffix";
import {
  API_DB_TIMEOUT,
  apiRoute,
  pendingResponse,
} from "../../helpers/network";
import {
  createImportExportTmpDir,
  dropTables,
  setupImportExport,
  treePathForEngine,
} from "../../helpers/importExport";
import { withConnectionCleanup } from "../../helpers/safeCleanup";
import { ConnectionPage } from "../../pages";

const privateKey = readFileSync(
  path.join(process.cwd(), "fixtures", "ssh", "id_ed25519"),
  "utf8",
);

async function canReach(host: string, port: number): Promise<boolean> {
  return await new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok: boolean): void => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(1500);
    socket.on("connect", () => done(true));
    socket.on("timeout", () => done(false));
    socket.on("error", () => done(false));
  });
}

async function pingStatus(
  page: Page,
  connectionPage: ConnectionPage,
): Promise<{ status: number; body: string }> {
  const responsePromise = pendingResponse(
    page,
    apiRoute.connectionsPing,
    API_DB_TIMEOUT,
  );
  await connectionPage.testConnectionButton.click();
  const response = await responsePromise;

  return { status: response.status(), body: await response.text() };
}

/**
 * Connection SSH tunnel — bastion sample-sshd reaches sample-pgsql by service
 * name, so a 200 Test proves the tunnel carried the traffic.
 *
 * Prerequisites:
 *   docker compose -p dbo -f docker-compose.dev.yml up -d sample-pgsql sample-sshd
 */
test.describe("Connection SSH tunnel", () => {
  const testPrefix = "conn-ssh";
  const bastion = getSshBastionConfig();

  test("SSH tab toggles tunnel and auth fields", async ({ page }, testInfo) => {
    const connectionPage = new ConnectionPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.openNewConnectionModal();
    await connectionPage.selectConnectionType("PostgreSQL");
    await connectionPage.nameInput.fill(
      `${testPrefix}-ui-${uniqueTestSuffix(testInfo)}`,
    );

    await test.step("Tunnel fields hidden until enabled", async () => {
      await connectionPage.openSshTab();
      await expect(page.getByTestId("ssh-fields")).toBeHidden();
      await connectionPage.setSshEnabled(true);
      await expect(page.getByTestId("ssh-fields")).toBeVisible();
    });

    await test.step("Auth method switches credential fields", async () => {
      const root = page.getByTestId("ssh-fields");
      await expect(root.locator('input[name="sshPassword"]')).toBeVisible();
      await root.locator(".ssh-auth__control").click();
      await page
        .getByRole("option", { name: "Private key", exact: true })
        .click();
      await expect(page.getByTestId("ssh-private-key")).toBeVisible();
      await expect(root.locator('input[name="sshPassword"]')).toBeHidden();
    });

    await test.step("Bastion hop is optional", async () => {
      await expect(page.getByTestId("sshJump-fields")).toBeHidden();
      await page.getByTestId("ssh-jump-enabled").check();
      await expect(page.getByTestId("sshJump-fields")).toBeVisible();
    });

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Password auth reaches a DB only visible from the bastion", async ({
    page,
  }, testInfo) => {
    test.skip(
      !(await canReach(bastion.host, Number(bastion.port))),
      `SSH sample not reachable at ${bastion.host}:${bastion.port}. Run: docker compose -p dbo -f docker-compose.dev.yml up -d sample-sshd`,
    );

    const connectionPage = new ConnectionPage(page);
    const name = `${testPrefix}-pw-${uniqueTestSuffix(testInfo)}`;

    await withConnectionCleanup(page, name, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      await test.step("Create connection through tunnel", async () => {
        await connectionPage.createConnection({
          ...getBastionOnlyPostgresConfig(name),
          ssh: { ...bastion, authMethod: "password" },
        });
      });

      await test.step("Edit form keeps tunnel settings, never shows secrets", async () => {
        await connectionPage.editConnection(name);
        await connectionPage.openSshTab();
        await expect(page.getByTestId("ssh-enabled")).toBeChecked();
        const root = page.getByTestId("ssh-fields");
        await expect(root.locator('input[name="sshHost"]')).toHaveValue(
          bastion.host,
        );
        await expect(root.locator('input[name="sshPassword"]')).toHaveValue("");
        await expect(root.locator('input[name="sshPassword"]')).toHaveAttribute(
          "placeholder",
          /Stored/,
        );
        await page.getByRole("button", { name: "Cancel" }).click();
      });

      await test.step("Blank stored secret is reused on re-test", async () => {
        await connectionPage.editConnection(name);
        await connectionPage.openGeneralTab();
        await connectionPage.passwordInput.fill("secret");
        const { status } = await pingStatus(page, connectionPage);
        expect(status).toBe(200);
        await page.getByRole("button", { name: "Cancel" }).click();
      });

      await test.step("Cleanup", async () => {
        await connectionPage.deleteConnection(name);
      });
    });
  });

  test("Private key auth works and API never returns SSH secrets", async ({
    page,
  }, testInfo) => {
    test.skip(
      !(await canReach(bastion.host, Number(bastion.port))),
      `SSH sample not reachable at ${bastion.host}:${bastion.port}.`,
    );

    const connectionPage = new ConnectionPage(page);
    const name = `${testPrefix}-key-${uniqueTestSuffix(testInfo)}`;

    await withConnectionCleanup(page, name, async () => {
      await connectionPage.goto();
      await connectionPage.waitForReady();

      const listResponse = page.waitForResponse(
        (r) =>
          /\/api\/connections\/?$/.test(new URL(r.url()).pathname) &&
          r.request().method() === "GET" &&
          r.status() === 200,
      );

      await connectionPage.createConnection({
        ...getBastionOnlyPostgresConfig(name),
        ssh: { ...bastion, authMethod: "key", privateKey },
      });

      await page.reload();
      const body = await (await listResponse).text();
      expect(body).not.toContain("BEGIN OPENSSH PRIVATE KEY");
      expect(body).not.toContain(bastion.password);

      await connectionPage.deleteConnection(name);
    });
  });

  test("Wrong SSH password fails Test with an ssh error", async ({
    page,
  }, testInfo) => {
    test.skip(
      !(await canReach(bastion.host, Number(bastion.port))),
      `SSH sample not reachable at ${bastion.host}:${bastion.port}.`,
    );

    const connectionPage = new ConnectionPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.openNewConnectionModal();
    await connectionPage.selectConnectionType("PostgreSQL");
    await connectionPage.fillConnectionForm({
      ...getBastionOnlyPostgresConfig(
        `${testPrefix}-bad-${uniqueTestSuffix(testInfo)}`,
      ),
      ssh: { ...bastion, authMethod: "password", password: "wrong-password" },
    });

    const { status, body } = await pingStatus(page, connectionPage);
    expect(status).toBe(400);
    expect(body).toContain('"category":"ssh"');

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Unreachable bastion fails Test with an ssh error", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.openNewConnectionModal();
    await connectionPage.selectConnectionType("PostgreSQL");
    await connectionPage.fillConnectionForm({
      ...getBastionOnlyPostgresConfig(
        `${testPrefix}-down-${uniqueTestSuffix(testInfo)}`,
      ),
      ssh: { ...bastion, port: "1", authMethod: "password" },
    });

    const { status, body } = await pingStatus(page, connectionPage);
    expect(status).toBe(400);
    expect(body).toContain('"category":"ssh"');

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Connects through a bastion jump host", async ({ page }, testInfo) => {
    test.skip(
      !(await canReach(bastion.host, Number(bastion.port))),
      `SSH sample not reachable at ${bastion.host}:${bastion.port}.`,
    );

    const connectionPage = new ConnectionPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.openNewConnectionModal();
    await connectionPage.selectConnectionType("PostgreSQL");
    // Final SSH server (sample-sshd:2222) is only reachable from inside the
    // docker network, so the hop through the published bastion port is required.
    await connectionPage.fillConnectionForm({
      ...getBastionOnlyPostgresConfig(
        `${testPrefix}-jump-${uniqueTestSuffix(testInfo)}`,
      ),
      ssh: {
        ...bastion,
        host: "sample-sshd",
        port: "2222",
        authMethod: "password",
        jump: { ...bastion, authMethod: "password" },
      },
    });

    const { status } = await pingStatus(page, connectionPage);
    expect(status).toBe(200);

    await page.getByRole("button", { name: "Cancel" }).click();
  });

  test("Changed SSH host key is rejected", async ({ page }, testInfo) => {
    const knownHostsPath = process.env.SSH_KNOWN_HOSTS_PATH;
    test.skip(
      !knownHostsPath || !(await canReach(bastion.host, Number(bastion.port))),
      "Needs SSH_KNOWN_HOSTS_PATH shared with the API and a reachable bastion.",
    );

    const before = existsSync(knownHostsPath!)
      ? readFileSync(knownHostsPath!, "utf8")
      : "";
    const otherKey = readFileSync(
      path.join(process.cwd(), "fixtures", "ssh", "id_ed25519.pub"),
      "utf8",
    )
      .trim()
      .split(" ")
      .slice(0, 2)
      .join(" ");

    // Pin a different key for the bastion, as after a MITM or host rebuild.
    writeFileSync(
      knownHostsPath!,
      `[${bastion.host}]:${bastion.port} ${otherKey}\n`,
    );

    try {
      const connectionPage = new ConnectionPage(page);

      await connectionPage.goto();
      await connectionPage.waitForReady();
      await connectionPage.openNewConnectionModal();
      await connectionPage.selectConnectionType("PostgreSQL");
      await connectionPage.fillConnectionForm({
        ...getBastionOnlyPostgresConfig(
          `${testPrefix}-hostkey-${uniqueTestSuffix(testInfo)}`,
        ),
        ssh: { ...bastion, authMethod: "password" },
      });

      const { status, body } = await pingStatus(page, connectionPage);
      expect(status).toBe(400);
      expect(body).toContain("host key");

      await page.getByRole("button", { name: "Cancel" }).click();
    } finally {
      writeFileSync(knownHostsPath!, before);
    }
  });

  test("Import and export run through the tunnel", async ({
    page,
  }, testInfo) => {
    test.skip(
      !(await canReach(bastion.host, Number(bastion.port))),
      `SSH sample not reachable at ${bastion.host}:${bastion.port}.`,
    );

    const suffix = uniqueTestSuffix(testInfo);
    const name = `${testPrefix}-ie-${suffix}`;
    const exportTable = `e2e_ssh_export_${suffix}`;
    const importCsvTable = `e2e_ssh_import_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const treePath = treePathForEngine("postgresql", name);

    await withConnectionCleanup(page, name, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } = await setupImportExport(
          page,
          { connectionName: name, exportTable, importCsvTable },
          "postgresql",
          {
            ...getBastionOnlyPostgresConfig(name),
            ssh: { ...bastion, authMethod: "password" },
          },
        );

        await test.step("Export CSV through the tunnel", async () => {
          await dataBrowser.openTableFromTree([...treePath], exportTable);
          await dataGrid.waitForData("Export One");
          await dataBrowser.exportAndDownload("CSV", paths.exportedCsv);

          const csv = readFileSync(paths.exportedCsv, "utf8");
          expect(csv).toContain("1,Export One");
          expect(csv).toContain("3,Export Three");
        });

        await test.step("Import CSV through the tunnel", async () => {
          writeFileSync(
            paths.handCsv,
            "id,name\n10,Imported Alpha\n20,Imported Beta\n",
            "utf8",
          );
          await dataBrowser.openTableFromTree([...treePath], importCsvTable);
          await dataBrowser.importFile(paths.handCsv);
          await dataGrid.refreshQuery();
          await dataGrid.waitForData("Imported Alpha");
          await dataGrid.expectCellVisible("Imported Beta");
        });

        await dropTables(sqlEditor, [exportTable, importCsvTable]);
      } finally {
        cleanup();
      }
    });
  });

  test("New tunnel without a password is rejected", async ({
    page,
  }, testInfo) => {
    const connectionPage = new ConnectionPage(page);

    await connectionPage.goto();
    await connectionPage.waitForReady();
    await connectionPage.openNewConnectionModal();
    await connectionPage.selectConnectionType("PostgreSQL");
    await connectionPage.fillConnectionForm({
      ...getBastionOnlyPostgresConfig(
        `${testPrefix}-blank-${uniqueTestSuffix(testInfo)}`,
      ),
      ssh: { ...bastion, authMethod: "password", password: "" },
    });

    await connectionPage.openSshTab();
    await expect(
      page.getByTestId("ssh-fields").locator('input[name="sshPassword"]'),
    ).not.toHaveAttribute("placeholder", /Stored/);

    const { status, body } = await pingStatus(page, connectionPage);
    expect(status).toBe(400);
    expect(body).toContain("password cannot be blank");

    await page.getByRole("button", { name: "Cancel" }).click();
  });
});
