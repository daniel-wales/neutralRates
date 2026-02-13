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
    const sourceText = "Source: Calderon, Dhungana and Wales (2026)";
    const {
      ctx,
      chartArea: { right, bottom }
    } = chart;
    const xScale = chart.scales?.x;
    const xTitleOptions = chart.options?.scales?.x?.title ?? {};
    const xTickOptions = chart.options?.scales?.x?.ticks ?? {};
    const font = Chart.helpers.toFont(xTitleOptions.font, Chart.defaults.font);

    const sourceY = xScale ? xScale.bottom - font.lineHeight / 2 : bottom + 28;

    ctx.save();
    ctx.fillStyle = xTitleOptions.color ?? xTickOptions.color ?? "#000000";
    ctx.font = font.string;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(sourceText, right, sourceY);
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
          bottom: 44
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
            color: "#000000",
            callback: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
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


export function renderParameterChart(ctx, rows) {
  const existingChart = chartsByCanvas.get(ctx);
  if (existingChart) existingChart.destroy();

  const labels = rows.map(row => row.parameter);

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Range (Lower to Upper)",
          data: rows.map(row => [row.lower, row.upper]),
          backgroundColor: "rgba(31, 119, 180, 0.25)",
          borderColor: "rgba(31, 119, 180, 0.8)",
          borderWidth: 1,
          borderSkipped: false,
          barPercentage: 0.72,
          categoryPercentage: 0.9
        },
        {
          type: "line",
          label: "Prior (Mean)",
          data: rows.map(row => row.prior),
          borderColor: "#e67e22",
          backgroundColor: "#e67e22",
          showLine: false,
          pointRadius: 4,
          pointHoverRadius: 5
        },
        {
          type: "line",
          label: "Posterior (Mean_1)",
          data: rows.map(row => row.posterior),
          borderColor: "#2f7a3e",
          backgroundColor: "#2f7a3e",
          showLine: false,
          pointRadius: 4,
          pointHoverRadius: 5
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          bottom: 44
        }
      },
      plugins: {
        legend: {
          position: "top"
        },
        tooltip: {
          backgroundColor: "#ffffff",
          titleColor: "#000000",
          bodyColor: "#000000",
          borderColor: "#000000",
          borderWidth: 1
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#000000",
            maxRotation: 70,
            minRotation: 45,
            autoSkip: false
          },
          title: {
            display: true,
            text: "Parameters",
            color: "#000000"
          },
          grid: {
            display: false
          },
          border: {
            color: "#000000"
          }
        },
        y: {
          ticks: {
            color: "#000000"
          },
          title: {
            display: true,
            text: "Value",
            color: "#000000"
          },
          grid: {
            color: "#e0e0e0"
          },
          border: {
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
