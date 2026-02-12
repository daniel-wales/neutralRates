import { colors } from "../config/variables.js";

// Register zoom plugin from CDN (required for ES modules)
if (window.ChartZoom) {
  Chart.register(window.ChartZoom);
}

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
        legend: { position: "top" },
        tooltip: { mode: "index", intersect: false },

        // 🔹 Zoom plugin configuration
        zoom: {
          limits: {
            x: { min: "original", max: "original" },
            y: { min: "original", max: "original" }
          },
          pan: {
            enabled: true,
            mode: "x",
            threshold: 5
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1   // smoother zoom
            },
            pinch: {
              enabled: true
            },
            drag: {
              enabled: true,
              backgroundColor: "rgba(31, 119, 180, 0.1)"
            },
            mode: "x"
          }
        }
      },
      elements: {
        line: { borderWidth: 2, tension: 0.3 },
        point: { radius: 0, hoverRadius: 5 }
      },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 10 }, title: { display: true, text: "Year-Month" } },
        y: { grid: { color: "rgba(0,0,0,0.05)" }, title: { display: true, text: "" } }
      }
    },
  });

  return chart;
}

export function getColors(index) {
  return colors[index % colors.length];
}

export function getChartInstance() {
  return chart;
}
