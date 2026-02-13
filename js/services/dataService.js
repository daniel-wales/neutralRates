const cache = {};

export async function fetchData(file) {
  if (cache[file]) return cache[file];

  const res = await fetch(file);
  const csv = await res.text();

  const lines = csv.trim().split("\n");
  const header = lines[0].split(",");
  const rows = lines.slice(1);

  const dates = [];
  const series = {};

  for (let i = 3; i < header.length; i++) {
    series[header[i]] = [];
  }

  rows.forEach(row => {
    const cols = row.split(",");
    if (cols.length !== header.length) return;

    const formattedDate = `${cols[1]}-${String(cols[2]).padStart(2,"0")}`;
    dates.push(formattedDate);

    for (let i = 3; i < cols.length; i++) {
      const val = parseFloat(cols[i]);
      series[header[i]].push(isNaN(val) ? null : val);
    }
  });

  cache[file] = { dates, series };
  return cache[file];
}
