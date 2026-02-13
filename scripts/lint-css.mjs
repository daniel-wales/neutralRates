import { readFileSync } from "node:fs";

const css = readFileSync("css/styles.css", "utf8");
const openBraces = (css.match(/\{/g) || []).length;
const closeBraces = (css.match(/\}/g) || []).length;
if (openBraces !== closeBraces) {
  throw new Error(`Unbalanced CSS braces: {=${openBraces}, }=${closeBraces}`);
}

const canonicalChartContainer = css.match(/^\.chart-container\s*\{/gm) || [];
if (canonicalChartContainer.length > 1) {
  throw new Error("Duplicate top-level .chart-container blocks detected.");
}

console.log("CSS lint checks passed.");
