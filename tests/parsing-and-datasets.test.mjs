import test from "node:test";
import assert from "node:assert/strict";
import { parseCSV } from "../js/utils/csv.js";
import { computeMedian, getDateLabels } from "../js/utils/datasetUtils.js";

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
