import { colors } from "../config/variables.js";

let chart = null;

export function renderChart(ctx, datasets, labels) {
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      scales: {
        x: { title: { display: true, text: 'Year-Month' } },
        y: { title: { display: true, text: '' } }
      }
    }
  });

  return chart;
}

export function getColors(index) {
  return colors[index % colors.length];
}

export function getChartInstance() {
  return chart;
}
