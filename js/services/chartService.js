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


function getParameterSplitIndex(rows) {
  return rows.findIndex(row => row.parameter.includes("_int"));
}

const unicodeSubscripts = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "a": "ₐ",
  "e": "ₑ",
  "h": "ₕ",
  "i": "ᵢ",
  "j": "ⱼ",
  "k": "ₖ",
  "l": "ₗ",
  "m": "ₘ",
  "n": "ₙ",
  "o": "ₒ",
  "p": "ₚ",
  "r": "ᵣ",
  "s": "ₛ",
  "t": "ₜ",
  "u": "ᵤ",
  "v": "ᵥ",
  "x": "ₓ",
  "y": "ᵧ",
  "z": "z",
  "*": "*"
};

function toUnicodeSubscript(token) {
  return token
    .split("")
    .map(char => unicodeSubscripts[char] ?? char)
    .join("");
}

function formatParameterTick(value) {
  if (typeof value !== "string") return value;

  let tick = value.trim();
  if (tick.startsWith("$") && tick.endsWith("$")) tick = tick.slice(1, -1);

  tick = tick
    .replace(/_int/g, "^{int}")
    .replace(/\\hat\{y\}/g, "ŷ")
    .replace(/\\sigma/g, "σ")
    .replace(/\\theta/g, "θ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\{\\{/g, "{")
    .replace(/\\}\\}/g, "}");

  tick = tick.replace(/_\{([^}]+)\}/g, (_, token) => toUnicodeSubscript(token));
  tick = tick.replace(/_([A-Za-z0-9*]+)/g, (_, token) => toUnicodeSubscript(token));

  return tick;
}

const parameterDividerPlugin = {
  id: "parameterDivider",
  afterDatasetsDraw(chart) {
    const splitIndex = chart?.options?.plugins?.parameterDivider?.splitIndex;
    if (!Number.isInteger(splitIndex) || splitIndex <= 0) return;

    const xScale = chart.scales?.x;
    const yScale = chart.scales?.y;
    if (!xScale || !yScale || splitIndex >= chart.data.labels.length) return;

    const left = xScale.getPixelForTick(splitIndex - 1);
    const right = xScale.getPixelForTick(splitIndex);
    if (!Number.isFinite(left) || !Number.isFinite(right)) return;

    const x = (left + right) / 2;
    const { ctx } = chart;

    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = "#4b4b4b";
    ctx.moveTo(x, yScale.top);
    ctx.lineTo(x, yScale.bottom);
    ctx.stroke();
    ctx.restore();
  }
};

export function renderParameterChart(ctx, rows, selectedSeries = ["prior", "posterior", "range"]) {
  const existingChart = chartsByCanvas.get(ctx);
  if (existingChart) existingChart.destroy();

  const labels = rows.map(row => row.parameter);
  const selected = new Set(selectedSeries);
  const datasets = [];

  if (selected.has("range")) {
    datasets.push({
      type: "bar",
      label: "Range (Lower to Upper)",
      data: rows.map(row => [row.lower, row.upper]),
      backgroundColor: "rgba(31, 119, 180, 0.25)",
      borderWidth: 0,
      borderSkipped: false,
      barPercentage: 0.72,
      categoryPercentage: 0.9
    });
  }

  if (selected.has("prior")) {
    datasets.push({
      type: "line",
      label: "Prior (Mean)",
      data: rows.map(row => row.prior),
      borderColor: "#e67e22",
      backgroundColor: "#e67e22",
      showLine: false,
      pointStyle: "circle",
      pointRadius: 4,
      pointHoverRadius: 5
    });
  }

  if (selected.has("posterior")) {
    datasets.push({
      type: "line",
      label: "Posterior (Median)",
      data: rows.map(row => row.posterior),
      borderColor: "#2f7a3e",
      backgroundColor: "#2f7a3e",
      showLine: false,
      pointStyle: "circle",
      pointRadius: 4,
      pointHoverRadius: 5
    });
  }

  const chart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          bottom: 44
        }
      },
      scales: {
        x: {
          ticks: {
            color: "#000000",
            maxRotation: 70,
            minRotation: 45,
            autoSkip: false,
            callback: (_, index) => formatParameterTick(labels[index])
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
      },
      plugins: {
        legend: {
          position: "top",
          labels: {
            usePointStyle: true,
            boxWidth: 8,
            boxHeight: 8,
            pointStyleWidth: 8,
            generateLabels: chart => {
              const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);
              return defaultLabels.map(item => {
                const dataset = chart.data.datasets[item.datasetIndex];
                return {
                  ...item,
                  pointStyle: dataset?.type === "line" ? "circle" : "rect",
                  lineWidth: 0,
                  radius: dataset?.type === "line" ? 4 : 0
                };
              });
            }
          }
        },
        tooltip: {
          backgroundColor: "#ffffff",
          titleColor: "#000000",
          bodyColor: "#000000",
          borderColor: "#000000",
          borderWidth: 1
        },
        parameterDivider: {
          splitIndex: getParameterSplitIndex(rows)
        }
      }
    },
    plugins: [sourceLabelPlugin, parameterDividerPlugin]
  });

  chartsByCanvas.set(ctx, chart);
  activeChart = chart;

  return chart;
}
