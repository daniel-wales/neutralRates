import { getChartInstance } from "./chartService.js";

export function exportCSV() {
  const chart = getChartInstance();
  if (!chart) return;

  const labels = chart.data.labels;
  const datasets = chart.data.datasets;

  let csvContent = "Date";

  // Add dataset headers
  datasets.forEach(ds => {
    csvContent += `,${ds.label}`;
  });

  csvContent += "\n";

  // Add rows
  labels.forEach((label, i) => {
    let row = label;
    datasets.forEach(ds => {
      row += `,${ds.data[i] ?? ""}`;
    });
    csvContent += row + "\n";
  });

  // Create downloadable file
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "chart-data.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export function downloadPNG() {
  const chart = getChartInstance();
  if (!chart) return;

  const canvas = chart.canvas;
  const ctx = canvas.getContext("2d");

  // Save current state
  ctx.save();

  // Draw white background behind chart
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Export image
  const link = document.createElement("a");
  link.download = "chart.png";
  link.href = canvas.toDataURL("image/png");
  link.click();

  // Restore
  ctx.restore();
}
