const cache = {};

export async function fetchData(file) {
 if (cache[file]) return cache[file];

 const res = await fetch(file);
 if (!res.ok) throw new Error(`Failed to load ${file}: ${res.status}`);
 const csv = await res.text();

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

    const formattedDate = `${cols[safeYearIndex]}-${String(cols[safeMonthIndex]).padStart(2,"0")}`;
   dates.push(formattedDate);


    valueColumnIndices.forEach(index => {
      const val = parseFloat(cols[index]);
      series[header[index]].push(isNaN(val) ? null : val);
    });
 });

 cache[file] = { dates, series };
 return cache[file];
}
