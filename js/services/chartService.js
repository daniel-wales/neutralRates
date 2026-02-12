import { colors } from "../config/variables.js";

let chart = null;

export function renderChart(ctx, datasets, labels) {
  if (chart) chart.destroy();

  chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      interaction: {
        mode: "index",
        intersect: false
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            padding: 15
          }
        },
        tooltip: {
          mode: "index",
          intersect: false,
          padding: 10,
          titleFont: { size: 14, weight: "600" },
          bodyFont: { size: 13 }
        }
      },
      elements: {
        line: {
          borderWidth: 2,
          tension: 0.3  // smooth lines
        },
        point: {
          radius: 0,          // hides points for clean look
          hoverRadius: 5,
          hoverBorderWidth: 2
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 10 },
          title: { display: true, text: "Year-Month", font: { weight: "500" } }
        },
        y: {
          grid: { color: "rgba(0,0,0,0.05)" },
          title: { display: true, text: "", font: { weight: "500" } }
        }
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
