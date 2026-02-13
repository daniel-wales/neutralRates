import { colors } from "../config/variables.js";

// Register zoom plugin from CDN (required for ES modules)
if (window.ChartZoom) {
  Chart.register(window.ChartZoom);
}

const chartsByCanvas = new WeakMap();
let activeChart = null;

const sourceLabelPlugin = {
  id: "sourceLabel",
  afterDraw(chart) {
    const sourceText = "Source: Calderon Dhungana and Wales (2026)";
    const {
      ctx,
      chartArea: { right, bottom }
    } = chart;

    ctx.save();
    ctx.fillStyle = "#4a4a4a";
    ctx.font = "11px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "bottom";
    ctx.fillText(sourceText, right, bottom + 28);
    ctx.restore();
  }
};

export function renderChart(ctx, datasets, labels, yAxisLabel = "", axisLimits = {}) {
  const existingChart = chartsByCanvas.get(ctx);
  if (existingChart) existingChart.destroy();

  const chart = new Chart(ctx, {
    type: "line",
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          bottom: 36
        }
      },

      interaction: {
        mode: "index",
        intersect: false
      },

      plugins: {
        legend: {
          position: "top",
          labels: {
            color: "#000",
            font: {
              size: 12,
              weight: "normal"
            }
          }
        },

        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: "#ffffff",
          titleColor: "#000000",
          bodyColor: "#000000",
          borderColor: "#000000",
          borderWidth: 1
        },

        zoom: {
          limits: {
            x: axisLimits.x ?? {},
            y: axisLimits.y ?? {}
          },
          pan: {
            enabled: true,
            mode: "x",
            threshold: 5
          },
          zoom: {
            wheel: {
              enabled: true,
              speed: 0.1
            },
            pinch: {
              enabled: true
            },
            drag: {
              enabled: true,
              backgroundColor: "rgba(0,0,0,0.1)"
            },
            mode: "x"
          }
        }
      },

      elements: {
        line: {
          borderWidth: 2,
          tension: 0
        },
        point: {
          radius: 0,
          hoverRadius: 5
        }
      },

      scales: {
        x: {
          min: axisLimits.x?.min,
          max: axisLimits.x?.max,
          ticks: {
            color: "#000000",
            maxTicksLimit: 10
          },
          grid: {
            color: "#e0e0e0",
            lineWidth: 1
          },
          border: {
            color: "#000000"
          },
          title: {
            display: true,
            text: "Year-Month",
            color: "#000000"
          }
        },

        y: {
          min: axisLimits.y?.min,
          max: axisLimits.y?.max,
          ticks: {
            color: "#000000"
          },
          grid: {
            color: "#e0e0e0",
            lineWidth: 1
          },
          border: {
            color: "#000000"
          },
          title: {
            display: true,
            text: yAxisLabel,
            color: "#000000"
          }
        }
      }
    },
    plugins: [sourceLabelPlugin]
  });

  chartsByCanvas.set(ctx, chart);
  activeChart = chart;

  return chart;
}


export function getColors(index) {
  return colors[index % colors.length];
}

export function getChartInstance(ctx = null) {
  if (ctx) return chartsByCanvas.get(ctx) || null;
  return activeChart;
}
