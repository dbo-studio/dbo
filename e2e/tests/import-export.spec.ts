import fs from "node:fs";
import { expect, test } from "@playwright/test";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import {
  createImportExportTmpDir,
  dropTables,
  treePath,
  setupPostgresImportExport,
} from "../helpers/importExport";
import { withConnectionCleanup } from "../helpers/safeCleanup";

/**
 * Import / Export via Data browser (PostgreSQL, web mode).
 * Covers CSV / JSON / SQL export (download content), import of each format,
 * CSV round-trip, filtered export, and continue-on-error import.
 */
test.describe("Import Export PostgreSQL", () => {
  test("Export CSV and verify download", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const exportTable = `e2e_export_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            exportTable,
          });

        await test.step("Export table as CSV and verify download", async () => {
          await dataBrowser.openTableFromTree([...tableTreePath], exportTable);
          await dataGrid.waitForData("Export One");
          await dataBrowser.exportAndDownload("CSV", paths.exportedCsv);

          const csv = fs.readFileSync(paths.exportedCsv, "utf8");
          const csvLines = csv
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          expect(csvLines[0]).toMatch(/^id\s*,\s*name$/i);
          expect(csvLines.slice(1)).toHaveLength(3);
          expect(csv).toContain("1,Export One");
          expect(csv).toContain("2,Export Two");
          expect(csv).toContain("3,Export Three");
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [exportTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Export JSON and verify download", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const exportTable = `e2e_export_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            exportTable,
          });

        await test.step("Export table as JSON and verify download", async () => {
          await dataBrowser.openTableFromTree([...tableTreePath], exportTable);
          await dataGrid.waitForData("Export One");
          await dataBrowser.exportAndDownload("JSON", paths.exportedJson);

          const json = JSON.parse(
            fs.readFileSync(paths.exportedJson, "utf8"),
          ) as Array<Record<string, unknown>>;
          expect(json).toHaveLength(3);
          for (const row of json) {
            expect(row).toHaveProperty("id");
            expect(row).toHaveProperty("name");
          }
          const byId = new Map(
            json.map((row) => [Number(row.id), String(row.name)]),
          );
          expect(byId.get(1)).toBe("Export One");
          expect(byId.get(2)).toBe("Export Two");
          expect(byId.get(3)).toBe("Export Three");
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [exportTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Export SQL and verify download", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const exportTable = `e2e_export_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            exportTable,
          });

        await test.step("Export table as SQL and verify download", async () => {
          await dataBrowser.openTableFromTree([...tableTreePath], exportTable);
          await dataGrid.waitForData("Export One");
          await dataBrowser.exportAndDownload("SQL", paths.exportedSql);

          const sql = fs.readFileSync(paths.exportedSql, "utf8");
          expect(sql).toMatch(
            new RegExp(`INSERT\\s+INTO\\s+${exportTable}\\b`, "i"),
          );
          expect(sql).toContain("Export One");
          expect(sql).toContain("Export Two");
          expect(sql).toContain("Export Three");
          expect(sql).toMatch(/\b1\b/);
          expect(sql).toMatch(/\b2\b/);
          expect(sql).toMatch(/\b3\b/);
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [exportTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Export filtered rows (CSV)", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const exportTable = `e2e_export_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            exportTable,
          });

        await test.step("Export filtered rows only (CSV)", async () => {
          await dataBrowser.openTableFromTree([...tableTreePath], exportTable);
          await dataGrid.waitForData("Export One");
          await dataBrowser.openFiltersPanel();
          await dataBrowser.addFilter("name", "=", "Export Two");
          await dataGrid.waitForData("Export Two");
          await dataGrid.expectCellHidden("Export One");

          await dataBrowser.exportAndDownload("CSV", paths.filteredCsv);
          const filtered = fs.readFileSync(paths.filteredCsv, "utf8");
          const filteredLines = filtered
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0);
          expect(filteredLines[0]).toMatch(/^id\s*,\s*name$/i);
          expect(filteredLines.slice(1)).toHaveLength(1);
          expect(filtered).toContain("2,Export Two");
          expect(filtered).not.toContain("Export One");
          expect(filtered).not.toContain("Export Three");

          await dataBrowser.clearFilters();
          await dataGrid.waitForData("Export One");
          await dataBrowser.closeFiltersPanel();
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [exportTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Import hand-written CSV", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const importCsvTable = `e2e_imp_csv_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            importCsvTable,
          });

        await test.step("Import hand-written CSV into empty table", async () => {
          fs.writeFileSync(
            paths.handCsv,
            "id,name\n10,Imported Alpha\n20,Imported Beta\n",
            "utf8",
          );

          await dataBrowser.openTableFromTree([...tableTreePath], importCsvTable);
          await expect(page.getByTestId("data-grid")).toBeVisible({
            timeout: 15000,
          });
          await dataBrowser.importFile(paths.handCsv);
          await dataGrid.refreshQuery();
          await dataGrid.waitForData("Imported Alpha");
          await dataGrid.expectCellVisible("Imported Beta");
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [importCsvTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Import hand-written JSON", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const importJsonTable = `e2e_imp_json_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            importJsonTable,
          });

        await test.step("Import hand-written JSON into empty table", async () => {
          fs.writeFileSync(
            paths.handJson,
            JSON.stringify([
              { id: 11, name: "Json Alpha" },
              { id: 22, name: "Json Beta" },
            ]),
            "utf8",
          );

          await dataBrowser.openTableFromTree([...tableTreePath], importJsonTable);
          await expect(page.getByTestId("data-grid")).toBeVisible({
            timeout: 15000,
          });
          await dataBrowser.importFile(paths.handJson);
          await dataGrid.refreshQuery();
          await dataGrid.waitForData("Json Alpha");
          await dataGrid.expectCellVisible("Json Beta");
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [importJsonTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Import hand-written SQL", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const importSqlTable = `e2e_imp_sql_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            importSqlTable,
          });

        await test.step("Import hand-written SQL into empty table", async () => {
          // Clean INSERT only — SQL export adds comment headers that some parsers reject.
          fs.writeFileSync(
            paths.handSql,
            `INSERT INTO ${importSqlTable} (id, name) VALUES (31, 'Sql Alpha'), (32, 'Sql Beta');`,
            "utf8",
          );

          await dataBrowser.openTableFromTree([...tableTreePath], importSqlTable);
          await expect(page.getByTestId("data-grid")).toBeVisible({
            timeout: 15000,
          });
          await dataBrowser.importFile(paths.handSql);
          await dataGrid.refreshQuery();
          await dataGrid.waitForData("Sql Alpha");
          await dataGrid.expectCellVisible("Sql Beta");
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [importSqlTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Round-trip CSV export and re-import", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const exportTable = `e2e_export_${suffix}`;
    const roundTripTable = `e2e_imp_rt_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            exportTable,
            roundTripTable,
          });

        await test.step("Export table as CSV", async () => {
          await dataBrowser.openTableFromTree([...tableTreePath], exportTable);
          await dataGrid.waitForData("Export One");
          await dataBrowser.exportAndDownload("CSV", paths.exportedCsv);
        });

        await test.step("Round-trip: re-import exported CSV", async () => {
          await dataBrowser.openTableFromTree([...tableTreePath], roundTripTable);
          await expect(page.getByTestId("data-grid")).toBeVisible({
            timeout: 15000,
          });
          await dataBrowser.importFile(paths.exportedCsv);
          await dataGrid.refreshQuery();
          await dataGrid.waitForData("Export One");
          await dataGrid.expectCellVisible("Export Two");
          await dataGrid.expectCellVisible("Export Three");
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [exportTable, roundTripTable]);
        });
      } finally {
        cleanup();
      }
    });
  });

  test("Import continue-on-error", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `import-export-${suffix}`;
    const importCsvTable = `e2e_imp_csv_${suffix}`;
    const { paths, cleanup } = createImportExportTmpDir(suffix);
    const tableTreePath = treePath(connectionName);

    await withConnectionCleanup(page, connectionName, async () => {
      try {
        const { sqlEditor, dataBrowser, dataGrid } =
          await setupPostgresImportExport(page, {
            connectionName,
            importCsvTable,
          });

        await test.step("Seed table with initial row", async () => {
          fs.writeFileSync(
            paths.handCsv,
            "id,name\n10,Imported Alpha\n",
            "utf8",
          );

          await dataBrowser.openTableFromTree([...tableTreePath], importCsvTable);
          await expect(page.getByTestId("data-grid")).toBeVisible({
            timeout: 15000,
          });
          await dataBrowser.importFile(paths.handCsv);
          await dataGrid.refreshQuery();
          await dataGrid.waitForData("Imported Alpha");
        });

        await test.step("Import with continue on error (partial success)", async () => {
          // Second row duplicates PK 10 already present in importCsvTable.
          fs.writeFileSync(
            paths.badRowsCsv,
            "id,name\n40,Continue Ok\n10,Duplicate Fail\n50,Continue Also\n",
            "utf8",
          );

          // Table tab is already open from the seed step — reselect if needed.
          await dataBrowser.openTableFromTree([...tableTreePath], importCsvTable);
          await dataGrid.waitForData("Imported Alpha");
          await dataBrowser.importFile(paths.badRowsCsv, {
            continueOnError: true,
            expectStatus: /import completed:.*successful/i,
          });
          await dataGrid.refreshQuery();
          await dataGrid.waitForData("Continue Ok");
          await dataGrid.expectCellVisible("Continue Also");
          // Original row with id=10 must still be the first import, not the failed overwrite.
          await dataGrid.expectCellVisible("Imported Alpha");
        });

        await test.step("Cleanup tables", async () => {
          await dropTables(sqlEditor, [importCsvTable]);
        });
      } finally {
        cleanup();
      }
    });
  });
});
