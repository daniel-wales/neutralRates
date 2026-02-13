/**
 * Date label helpers for YYYY-MM dashboard series.
 */
export function parseYearMonth(label) {
  const [yearText, monthText] = String(label ?? "").split("-");
  const year = Number.parseInt(yearText, 10);
  const month = Number.parseInt(monthText, 10);

  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  return { year, month };
}

export function sortYearMonthLabels(labels) {
  return [...labels].sort((left, right) => {
    const leftDate = parseYearMonth(left);
    const rightDate = parseYearMonth(right);

    if (leftDate && rightDate) {
      if (leftDate.year !== rightDate.year) return leftDate.year - rightDate.year;
      return leftDate.month - rightDate.month;
    }

    return String(left).localeCompare(String(right));
  });
}
