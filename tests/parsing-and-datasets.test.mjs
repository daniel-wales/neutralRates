import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "../js/utils/csv.js";
import { computeMedian, getDateLabels } from "../js/utils/datasetUtils.js";

function parseRowsWithDateIndices(header, rows) {
  const normalizedHeader = header.map(col => col.toLowerCase());
  const yearIndex = normalizedHeader.indexOf("year");
  const monthIndex = normalizedHeader.indexOf("month");
  const safeYearIndex = yearIndex >= 0 ? yearIndex : 0;
  const safeMonthIndex = monthIndex >= 0 ? monthIndex : 1;

  return rows
    .map(row => {
      const year = Number.parseInt(row[safeYearIndex], 10);
      const month = Number.parseInt(row[safeMonthIndex], 10);
      if (!Number.isInteger(year) || !Number.isInteger(month)) return null;
      return `${year}-${String(month).padStart(2, "0")}`;
    })
    .filter(Boolean);
}

test("parseCSV handles quoted commas and escaped quotes", () => {
  const csv = 'name,notes\n"US, East","He said ""hello"""';
  const rows = parseCSV(csv);

  assert.deepEqual(rows, [
    ["name", "notes"],
    ["US, East", 'He said "hello"']
  ]);
});

test("dataset helpers sort labels and compute medians", () => {
  const labels = getDateLabels([
    { dates: ["2024-10", "2024-2", "2024-01"] },
    { dates: ["2023-12", "2024-02"] }
  ]);

  assert.deepEqual(labels, ["2023-12", "2024-01", "2024-2", "2024-02", "2024-10"]);
  assert.equal(computeMedian([1, 3, null, 2]), 2);
  assert.equal(computeMedian([1, 3, 2, 4]), 2.5);
});

test("date parsing fallback uses first two columns when Year/Month headers are absent", () => {
  const header = ["Date", "Period", "value"];
  const rows = [
    ["2020", "1", "10"],
    ["2020", "2", "11"]
  ];

  const dates = parseRowsWithDateIndices(header, rows);
  assert.deepEqual(dates, ["2020-01", "2020-02"]);
});
