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

  const rows = csv.trim().split("\n");
  const headers = rows[0].split(",").map(column => column.trim());

  const parameterIndex = headers.indexOf("Parameter");
  const priorIndex = headers.indexOf("Mean");
  const posteriorIndex = headers.indexOf("Mean_1");
  const lowerIndex = headers.indexOf("Lower");
  const upperIndex = headers.indexOf("Upper");

  if ([parameterIndex, priorIndex, posteriorIndex, lowerIndex, upperIndex].some(index => index < 0)) {
    throw new Error(`Missing required parameter columns in ${file}`);
  }

  const parsedRows = rows.slice(1)
    .map(row => row.split(",").map(value => value.trim()))
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
