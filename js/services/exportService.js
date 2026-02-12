export function downloadPNG(chart, filename="chart.png") {
  if (!chart) return;
  const link = document.createElement("a");
  link.download = filename;
  link.href = chart.toBase64Image();
  link.click();
}

export function exportCSV(data, filename="export.csv") {
  if (!data) return;

  const { dates, datasets } = data;

  let csv = "Date," + datasets.map(d => d.label).join(",") + "\n";

  for (let i = 0; i < dates.length; i++) {
    const row = [dates[i]];
    datasets.forEach(ds => row.push(ds.data[i] ?? ""));
    csv += row.join(",") + "\n";
  }

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}
