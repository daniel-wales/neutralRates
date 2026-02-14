import { parseCSV } from "../utils/csv.js";

/**
 * Data retrieval service for chart series and parameter tables.
 *
 * Assumptions:
 * - Files are UTF-8 CSV and include headers.
 * - Main data uses Year/Month columns, or falls back to index positions.
 *
 * Failure modes:
 * - Throws descriptive errors for network failures, HTTP failures, malformed CSV,
 *   missing required columns, and empty/invalid parse results.
 */
const cache = {};

function resolveDateColumnIndices(normalizedHeader) {
  const yearIndex = normalizedHeader.indexOf("year");
  const monthIndex = normalizedHeader.indexOf("month");
  if (yearIndex >= 0 && monthIndex >= 0) return { yearIndex, monthIndex };

  const firstColumn = normalizedHeader[0] || "";
  if (firstColumn.includes("matlab") && normalizedHeader.length >= 3) {
    return { yearIndex: 1, monthIndex: 2 };
  }

  return { yearIndex: 0, monthIndex: 1 };
}

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

  const rows = parseCSV(csv);
  if (!rows.length) throw new Error(`No CSV rows found in ${file}`);

  const header = rows[0];
  const dataRows = rows.slice(1);

  const dates = [];
  const series = {};

  const normalizedHeader = header.map(col => col.toLowerCase());
  const { yearIndex: safeYearIndex, monthIndex: safeMonthIndex } = resolveDateColumnIndices(normalizedHeader);
  const skippedColumns = new Set([safeYearIndex, safeMonthIndex]);

  const valueColumnIndices = [];
  header.forEach((columnName, index) => {
    if (skippedColumns.has(index)) return;
    valueColumnIndices.push(index);
    series[columnName] = [];
  });

  dataRows.forEach(row => {
    if (row.length < header.length) return;

    const year = Number.parseInt(row[safeYearIndex], 10);
    const month = Number.parseInt(row[safeMonthIndex], 10);
    if (!Number.isInteger(year) || !Number.isInteger(month)) return;

    const formattedDate = `${year}-${String(month).padStart(2, "0")}`;
    dates.push(formattedDate);

    valueColumnIndices.forEach(index => {
      const val = Number.parseFloat(row[index]);
      series[header[index]].push(Number.isNaN(val) ? null : val);
    });
  });

  if (!dates.length) {
    throw new Error(`No valid rows parsed from ${file}`);
  }

  cache[file] = { dates, series };
  return cache[file];
}

export async function fetchParameterData(file) {
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

  const rows = parseCSV(csv);
  if (!rows.length) throw new Error(`No CSV rows found in ${file}`);

  const headers = rows[0];

  const parameterIndex = headers.indexOf("Parameter");
  const priorIndex = headers.indexOf("Mean");
  const posteriorIndex = headers.indexOf("Mean_1");
  const lowerIndex = headers.indexOf("Lower");
  const upperIndex = headers.indexOf("Upper");

  if ([parameterIndex, priorIndex, posteriorIndex, lowerIndex, upperIndex].some(index => index < 0)) {
    throw new Error(`Missing required parameter columns in ${file}`);
  }

  const parsedRows = rows.slice(1)
    .filter(columns => columns.length >= headers.length)
    .map(columns => ({
      parameter: columns[parameterIndex],
      prior: Number.parseFloat(columns[priorIndex]),
      posterior: Number.parseFloat(columns[posteriorIndex]),
      lower: Number.parseFloat(columns[lowerIndex]),
      upper: Number.parseFloat(columns[upperIndex])
    }))
    .filter(item => Number.isFinite(item.prior) && Number.isFinite(item.posterior) && Number.isFinite(item.lower) && Number.isFinite(item.upper));

  if (!parsedRows.length) {
    throw new Error(`No valid parameter rows parsed from ${file}`);
  }

  cache[file] = parsedRows;
  return cache[file];
}
