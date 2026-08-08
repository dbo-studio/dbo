import { expect, test } from "@playwright/test";
import {
  cleanupTypedTableOnFailure,
  dropTypedTable,
  loadTypedTableGrid,
  setupTypedTable,
  typedCellsEnumType,
} from "../helpers/dataGridTypedCells";
import { uniqueTestSuffix } from "../fixtures/uniqueSuffix";
import { withConnectionCleanup } from "../helpers/safeCleanup";

/**
 * Data Grid type-aware cells + Quick Look editor (DBO-131/132/133).
 * Covers everyday editors, in-cell cues, and Quick Look modes.
 */
test.describe("Data grid typed cells MySQL", () => {
  test("Everyday values render", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-mysql-${suffix}`;
    const tableName = `e2e_qtypes_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "mysql",
        connectionName,
        tableName,
      );

      try {
        await test.step("Load grid and assert everyday values", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "mysql", tableName);
          await dataGrid.expectCellVisible("Aurora");
          await dataGrid.expectCellVisible("129.99");
          // Drivers may serialize DATE/DATETIME with a timezone offset.
          await expect(dataGrid.grid.getByText(/2024-03-15/).first()).toBeVisible();
          await expect(dataGrid.grid.getByText(/09:30:00/).first()).toBeVisible();
          await expect(dataGrid.grid.getByText(/2024-06-01/).first()).toBeVisible();
          await dataGrid.expectCellVisible("draft");
          await dataGrid.expectCellVisible(
            "11111111-1111-4111-8111-111111111111",
          );
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "mysql", tableName);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(sqlEditor, "mysql", tableName);
        throw err;
      }
    });
  });

  test("Boolean toggle and save", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-mysql-${suffix}`;
    const tableName = `e2e_qtypes_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "mysql",
        connectionName,
        tableName,
      );

      try {
        await test.step("Toggle boolean and save", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "mysql", tableName);
          await dataGrid.toggleBooleanCell("is_active");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY id;`,
          );
          await dataGrid.waitForData("Aurora");
          await expect(
            dataGrid.grid.getByRole("checkbox", { name: "is_active" }).first(),
          ).toBeChecked();
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "mysql", tableName);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(sqlEditor, "mysql", tableName);
        throw err;
      }
    });
  });

  test("Nullable boolean NULL cycle", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-mysql-${suffix}`;
    const tableName = `e2e_qtypes_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "mysql",
        connectionName,
        tableName,
      );

      try {
        await test.step("Nullable boolean cycles NULL → true → false → NULL", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "mysql", tableName);
          await dataGrid.expectBooleanCellState("is_flagged", "null");

          await dataGrid.clickBooleanCell("is_flagged");
          await dataGrid.expectBooleanCellState("is_flagged", "checked");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY id;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectBooleanCellState("is_flagged", "checked");

          await dataGrid.clickBooleanCell("is_flagged");
          await dataGrid.expectBooleanCellState("is_flagged", "unchecked");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY id;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectBooleanCellState("is_flagged", "unchecked");

          await dataGrid.clickBooleanCell("is_flagged");
          await dataGrid.expectBooleanCellState("is_flagged", "null");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY id;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectBooleanCellState("is_flagged", "null");
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "mysql", tableName);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(sqlEditor, "mysql", tableName);
        throw err;
      }
    });
  });

  test("Enum change and save", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-mysql-${suffix}`;
    const tableName = `e2e_qtypes_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "mysql",
        connectionName,
        tableName,
      );

      try {
        await test.step("Change enum and save", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "mysql", tableName);
          await dataGrid.selectEnumCell("draft", "archived");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT status FROM ${tableName} WHERE id = 1;`,
          );
          await dataGrid.waitForData("archived");
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "mysql", tableName);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(sqlEditor, "mysql", tableName);
        throw err;
      }
    });
  });

  test("Number datetime JSON edits", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-mysql-${suffix}`;
    const tableName = `e2e_qtypes_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "mysql",
        connectionName,
        tableName,
      );

      try {
        await test.step("Edit number and save", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "mysql", tableName);
          await dataGrid.editCell("129.99", "199.50");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT price FROM ${tableName} WHERE id = 1;`,
          );
          await dataGrid.waitForData("199.50");
        });

        await test.step("Edit datetime and save", async () => {
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY id;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.editDateTimeCell(/2024-06-01/, "2024-07-15 10:00:00");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT updated_at FROM ${tableName} WHERE id = 1;`,
          );
          await expect(dataGrid.grid.getByText(/2024-07-15/).first()).toBeVisible({
            timeout: 15000,
          });
        });

        await test.step("JSON text is inline-editable", async () => {
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY id;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectJsonTextVisible('"a"');
          await dataGrid.expectCueAbsent("[json]");
          const jsonCell = dataGrid.grid.getByText('"a"', { exact: false }).first();
          await jsonCell.click({ clickCount: 2, delay: 40 });
          await expect(dataGrid.grid.getByTestId("grid-cell-json")).toBeVisible({
            timeout: 5000,
          });
          await dataGrid.grid.getByTestId("grid-cell-json").press("Escape");
        });

        await test.step("Quick Look JSON editor + Apply control", async () => {
          await dataGrid.openQuickLookOnCell('"a"');
          await dataGrid.expectQuickLookMode("json");
          await expect(page.getByTestId("value-panel-apply")).toBeVisible();
          await dataGrid.closeQuickLook();
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "mysql", tableName);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(sqlEditor, "mysql", tableName);
        throw err;
      }
    });
  });

  test("Hex and image cues", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-mysql-${suffix}`;
    const tableName = `e2e_qtypes_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "mysql",
        connectionName,
        tableName,
      );

      try {
        await test.step("Complex cues without mojibake", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "mysql", tableName);
          await dataGrid.expectBinaryCueVisible();
          await dataGrid.expectImageCueVisible();
          await dataGrid.expectGeometryTextVisible();
          await dataGrid.expectGeometryCueAbsent();
          await expect(dataGrid.grid.getByText("\uFFFD")).toHaveCount(0);
        });

        await test.step("Quick Look hex + image editors", async () => {
          await dataGrid.openQuickLookOnCell("[hex]");
          await dataGrid.expectQuickLookMode("hex");
          await dataGrid.closeQuickLook();

          await dataGrid.openQuickLookOnCell("[image]");
          await dataGrid.expectQuickLookMode("image");
          await expect(page.getByRole("img", { name: /binary/i })).toBeVisible({
            timeout: 5000,
          });
          await expect(
            page.getByTestId("value-panel-image-dropzone"),
          ).toBeVisible();
          await expect(
            page.getByTestId("value-panel-image-size"),
          ).toBeVisible();
          await expect(
            page.getByTestId("value-panel-image-download"),
          ).toBeVisible();
          await expect(
            page.getByTestId("value-panel-image-clear"),
          ).toBeVisible();
          await dataGrid.closeQuickLook();
        });

        await test.step("Quick Look image Clear + Apply + Save", async () => {
          await dataGrid.openQuickLookOnCell("[image]");
          await dataGrid.expectQuickLookMode("image");
          await page.getByTestId("value-panel-image-clear").click();
          await dataGrid.applyQuickLook();
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY id;`,
          );
          await dataGrid.waitForData("Aurora");
          await expect(dataGrid.grid.getByText(/\[image\]/i)).toHaveCount(0);
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "mysql", tableName);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(sqlEditor, "mysql", tableName);
        throw err;
      }
    });
  });

  test("Geometry WKT and Quick Look map", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-mysql-${suffix}`;
    const tableName = `e2e_qtypes_mysql_${suffix}`;

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "mysql",
        connectionName,
        tableName,
      );

      try {
        await test.step("Quick Look geometry map", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "mysql", tableName);
          await dataGrid.openQuickLookOnCell(/POINT\s*\(/i);
          await dataGrid.expectQuickLookMode("geometry");
          await expect(
            page.getByTestId("value-panel-geometry-map"),
          ).toBeVisible({ timeout: 5000 });
          await expect(
            page.getByTestId("value-panel-geometry-map-fallback"),
          ).toHaveCount(0);
          await dataGrid.closeQuickLook();
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "mysql", tableName);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(sqlEditor, "mysql", tableName);
        throw err;
      }
    });
  });
});

test.describe("Data grid typed cells PostgreSQL", () => {
  test("Everyday values render", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-pg-${suffix}`;
    const tableName = `e2e_qtypes_pg_${suffix}`;
    const enumType = typedCellsEnumType(suffix);

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "postgresql",
        connectionName,
        tableName,
        enumType,
      );

      try {
        await test.step("Load grid and assert everyday values", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "postgresql", tableName);
          await dataGrid.expectCellVisible("Aurora");
          await dataGrid.expectCellVisible("129.99");
          await expect(dataGrid.grid.getByText(/2024-03-15/).first()).toBeVisible();
          await expect(dataGrid.grid.getByText(/09:30:00/).first()).toBeVisible();
          await expect(dataGrid.grid.getByText(/2024-06-01/).first()).toBeVisible();
          await dataGrid.expectCellVisible("draft");
          await dataGrid.expectCellVisible(
            "11111111-1111-4111-8111-111111111111",
          );
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "postgresql", tableName, enumType);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(
          sqlEditor,
          "postgresql",
          tableName,
          enumType,
        );
        throw err;
      }
    });
  });

  test("Boolean toggle and save", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-pg-${suffix}`;
    const tableName = `e2e_qtypes_pg_${suffix}`;
    const enumType = typedCellsEnumType(suffix);

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "postgresql",
        connectionName,
        tableName,
        enumType,
      );

      try {
        await test.step("Toggle boolean and save", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "postgresql", tableName);
          await dataGrid.toggleBooleanCell("is_active");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY name;`,
          );
          await dataGrid.waitForData("Aurora");
          await expect(
            dataGrid.grid.getByRole("checkbox", { name: "is_active" }).first(),
          ).toBeChecked();
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "postgresql", tableName, enumType);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(
          sqlEditor,
          "postgresql",
          tableName,
          enumType,
        );
        throw err;
      }
    });
  });

  test("Nullable boolean NULL cycle", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-pg-${suffix}`;
    const tableName = `e2e_qtypes_pg_${suffix}`;
    const enumType = typedCellsEnumType(suffix);

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "postgresql",
        connectionName,
        tableName,
        enumType,
      );

      try {
        await test.step("Nullable boolean cycles NULL → true → false → NULL", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "postgresql", tableName);
          await dataGrid.expectBooleanCellState("is_flagged", "null");

          await dataGrid.clickBooleanCell("is_flagged");
          await dataGrid.expectBooleanCellState("is_flagged", "checked");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY name;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectBooleanCellState("is_flagged", "checked");

          await dataGrid.clickBooleanCell("is_flagged");
          await dataGrid.expectBooleanCellState("is_flagged", "unchecked");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY name;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectBooleanCellState("is_flagged", "unchecked");

          await dataGrid.clickBooleanCell("is_flagged");
          await dataGrid.expectBooleanCellState("is_flagged", "null");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY name;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectBooleanCellState("is_flagged", "null");
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "postgresql", tableName, enumType);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(
          sqlEditor,
          "postgresql",
          tableName,
          enumType,
        );
        throw err;
      }
    });
  });

  test("Enum change and save", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-pg-${suffix}`;
    const tableName = `e2e_qtypes_pg_${suffix}`;
    const enumType = typedCellsEnumType(suffix);

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "postgresql",
        connectionName,
        tableName,
        enumType,
      );

      try {
        await test.step("Change enum and save", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "postgresql", tableName);
          await dataGrid.selectEnumCell("draft", "archived");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT status FROM ${tableName} WHERE name = 'Aurora';`,
          );
          await dataGrid.waitForData("archived");
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "postgresql", tableName, enumType);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(
          sqlEditor,
          "postgresql",
          tableName,
          enumType,
        );
        throw err;
      }
    });
  });

  test("Number datetime JSON edits", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-pg-${suffix}`;
    const tableName = `e2e_qtypes_pg_${suffix}`;
    const enumType = typedCellsEnumType(suffix);

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "postgresql",
        connectionName,
        tableName,
        enumType,
      );

      try {
        await test.step("Edit datetime and save", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "postgresql", tableName);
          await dataGrid.editDateTimeCell(/2024-06-01/, "2024-07-15 10:00:00");
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT updated_at FROM ${tableName} WHERE name = 'Aurora';`,
          );
          await expect(dataGrid.grid.getByText(/2024-07-15/).first()).toBeVisible({
            timeout: 15000,
          });
        });

        await test.step("JSON text is inline-editable", async () => {
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY name;`,
          );
          await dataGrid.waitForData("Aurora");
          await dataGrid.expectJsonTextVisible('"a"');
          await dataGrid.expectCueAbsent("[json]");
        });

        await test.step("Quick Look JSON editor", async () => {
          await dataGrid.openQuickLookOnCell('"a"');
          await dataGrid.expectQuickLookMode("json");
          await dataGrid.closeQuickLook();
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "postgresql", tableName, enumType);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(
          sqlEditor,
          "postgresql",
          tableName,
          enumType,
        );
        throw err;
      }
    });
  });

  test("Hex and image cues", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-pg-${suffix}`;
    const tableName = `e2e_qtypes_pg_${suffix}`;
    const enumType = typedCellsEnumType(suffix);

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "postgresql",
        connectionName,
        tableName,
        enumType,
      );

      try {
        await test.step("JSON text + complex cues", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "postgresql", tableName);
          await dataGrid.expectJsonTextVisible('"a"');
          await dataGrid.expectCueAbsent("[json]");
          await dataGrid.expectBinaryCueVisible();
          await dataGrid.expectImageCueVisible();
          await dataGrid.expectGeometryTextVisible();
          await dataGrid.expectGeometryCueAbsent();
        });

        await test.step("Quick Look hex + image editors", async () => {
          await dataGrid.openQuickLookOnCell("[hex]");
          await dataGrid.expectQuickLookMode("hex");
          await dataGrid.closeQuickLook();
          await dataGrid.openQuickLookOnCell("[image]");
          await dataGrid.expectQuickLookMode("image");
          await expect(page.getByRole("img", { name: /binary/i })).toBeVisible({
            timeout: 5000,
          });
          await expect(
            page.getByTestId("value-panel-image-dropzone"),
          ).toBeVisible();
          await expect(
            page.getByTestId("value-panel-image-size"),
          ).toBeVisible();
          await expect(
            page.getByTestId("value-panel-image-download"),
          ).toBeVisible();
          await expect(
            page.getByTestId("value-panel-image-clear"),
          ).toBeVisible();
          await dataGrid.closeQuickLook();
        });

        await test.step("Quick Look image Clear + Apply + Save", async () => {
          await dataGrid.openQuickLookOnCell("[image]");
          await dataGrid.expectQuickLookMode("image");
          await page.getByTestId("value-panel-image-clear").click();
          await dataGrid.applyQuickLook();
          await dataGrid.saveChanges();
          await sqlEditor.typeAndRun(
            `SELECT * FROM ${tableName} ORDER BY name;`,
          );
          await dataGrid.waitForData("Aurora");
          await expect(dataGrid.grid.getByText(/\[image\]/i)).toHaveCount(0);
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "postgresql", tableName, enumType);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(
          sqlEditor,
          "postgresql",
          tableName,
          enumType,
        );
        throw err;
      }
    });
  });

  test("Geometry WKT and Quick Look map", async ({ page }, testInfo) => {
    const suffix = uniqueTestSuffix(testInfo);
    const connectionName = `qtypes-pg-${suffix}`;
    const tableName = `e2e_qtypes_pg_${suffix}`;
    const enumType = typedCellsEnumType(suffix);

    await withConnectionCleanup(page, connectionName, async () => {
      const { sqlEditor, dataGrid } = await setupTypedTable(
        page,
        "postgresql",
        connectionName,
        tableName,
        enumType,
      );

      try {
        await test.step("Quick Look geometry map", async () => {
          await loadTypedTableGrid(sqlEditor, dataGrid, "postgresql", tableName);
          await dataGrid.openQuickLookOnCell(/POINT\s*\(/i);
          await dataGrid.expectQuickLookMode("geometry");
          await expect(
            page.getByTestId("value-panel-geometry-map"),
          ).toBeVisible({ timeout: 5000 });
          await expect(
            page.getByTestId("value-panel-geometry-map-fallback"),
          ).toHaveCount(0);
          await dataGrid.closeQuickLook();
        });

        await test.step("Cleanup table", async () => {
          await dropTypedTable(sqlEditor, "postgresql", tableName, enumType);
        });
      } catch (err) {
        await cleanupTypedTableOnFailure(
          sqlEditor,
          "postgresql",
          tableName,
          enumType,
        );
        throw err;
      }
    });
  });
});
