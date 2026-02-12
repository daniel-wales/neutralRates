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
        legend: { position: "top" },
        tooltip: { mode: "index", intersect: false },

        // 🔹 Zoom plugin configuration
        zoom: {
          pan: {
            enabled: true,
            mode: "x",      // pan horizontally
            modifierKey: "ctrl" // optional: only pan when holding Ctrl
          },
          zoom: {
            wheel: { enabled: true }, // zoom with mouse wheel / touchpad
            pinch: { enabled: true }, // zoom with pinch gestures
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
    plugins: [Chart.Zoom] // make sure plugin is registered
  });

  return chart;
}

export function getColors(index) {
  return colors[index % colors.length];
}

export function getChartInstance() {
  return chart;
}
