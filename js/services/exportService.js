import { getChartInstance } from "./chartService.js";

/**
 * Export helpers for current chart views.
 *
 * Assumptions:
 * - Chart.js instance is available when export actions are triggered.
 *
 * Failure modes:
 * - No-ops when chart instance is unavailable.
 */
function resolveChart(chart) {
  return chart || getChartInstance();
}

function buildFilename(baseName, extension) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${baseName}-${timestamp}.${extension}`;
}

export function exportCSV(chart = null, context = "chart-data") {
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
  link.download = buildFilename(context, "csv");
  link.click();

  URL.revokeObjectURL(url);
}

export function downloadPNG(chart = null, context = "chart") {
  const chartInstance = resolveChart(chart);
  if (!chartInstance) return;

  const canvas = chartInstance.canvas;
  const ctx = canvas.getContext("2d");

  ctx.save();
  ctx.globalCompositeOperation = "destination-over";
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const link = document.createElement("a");
  link.download = buildFilename(context, "png");
  link.href = canvas.toDataURL("image/png");
  link.click();

  ctx.restore();
}
