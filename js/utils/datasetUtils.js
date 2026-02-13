import { sortYearMonthLabels } from "./dateUtils.js";

/**
 * Pure helpers for dataset assembly used by the chart sections.
 */
export function computeMedian(values) {
  const numericValues = values
    .map(value => (value == null ? Number.NaN : Number(value)))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);

  if (!numericValues.length) return null;

  const middle = Math.floor(numericValues.length / 2);
  if (numericValues.length % 2) return numericValues[middle];
  return (numericValues[middle - 1] + numericValues[middle]) / 2;
}

export function getDateLabels(dataItems) {
  const allDates = [...new Set(dataItems.flatMap(data => data.dates || []))];
  return sortYearMonthLabels(allDates);
}
