import { getChartInstance } from "./chartService.js";

function resolveChart(chart) {
  return chart || getChartInstance();
}

export function exportCSV(chart = null) {
  const chartInstance = resolveChart(chart);
  if (!chartInstance) return;

  const labels = chartInstance.data.labels;
  const datasets = chartInstance.data.datasets;

  let csvContent = "Date";

  datasets.forEach(dataset => {
    csvContent += `,${dataset.label}`;
  });

  csvContent += "\n";

  labels.forEach((label, index) => {
    let row = label;
    datasets.forEach(dataset => {
      row += `,${dataset.data[index] ?? ""}`;
    });
    csvContent += `${row}\n`;
  });

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "chart-data.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export function downloadPNG(chart = null) {
  const chartInstance = resolveChart(chart);
  if (!chartInstance) return;

  const canvas = chartInstance.canvas;
  const ctx = canvas.getContext("2d");

  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const link = document.createElement("a");
  link.download = "chart.png";
  link.href = canvas.toDataURL("image/png");
  link.click();

  ctx.restore();
}
