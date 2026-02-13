const cache = {};

export async function fetchData(file) {
  if (cache[file]) return cache[file];

  let res;
  try {
    res = await fetch(file);
  } catch (error) {
    throw new Error(`Network error while requesting ${file}: ${error.message}`);
  }

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} when requesting ${file}`);
  }

  const csv = await res.text();
  if (!csv.trim()) {
    throw new Error(`Received empty CSV content from ${file}`);
  }

  const lines = csv.trim().split("\n");
  const header = lines[0].split(",").map(col => col.trim());
  const rows = lines.slice(1);

  const dates = [];
  const series = {};

  const normalizedHeader = header.map(col => col.toLowerCase());
  const yearIndex = normalizedHeader.indexOf("year");
  const monthIndex = normalizedHeader.indexOf("month");

  const safeYearIndex = yearIndex >= 0 ? yearIndex : 1;
  const safeMonthIndex = monthIndex >= 0 ? monthIndex : 2;
  const skippedColumns = new Set([safeYearIndex, safeMonthIndex]);

  const valueColumnIndices = [];
  header.forEach((columnName, index) => {
    if (skippedColumns.has(index)) return;
    valueColumnIndices.push(index);
    series[columnName] = [];
  });

  rows.forEach(row => {
    const cols = row.split(",").map(col => col.trim());
    if (cols.length !== header.length) return;

    const formattedDate = `${cols[safeYearIndex]}-${String(cols[safeMonthIndex]).padStart(2, "0")}`;
    dates.push(formattedDate);

    valueColumnIndices.forEach(index => {
      const val = parseFloat(cols[index]);
      series[header[index]].push(Number.isNaN(val) ? null : val);
    });
  });

  if (!dates.length) {
    throw new Error(`No valid rows parsed from ${file}`);
  }

  cache[file] = { dates, series };
  return cache[file];
}
