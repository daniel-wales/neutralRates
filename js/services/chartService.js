/**
 * Chart rendering service for time-series and parameter visualizations.
 *
 * Assumptions:
 * - Chart.js is loaded globally before this module runs.
 * - Zoom plugin may be unavailable (e.g., CDN failure), and charts should still render.
 */
import { colors } from "../config/variables.js";

const chartTheme = {
  text: "#1f3347",
  mutedText: "#49617a",
  grid: "#d7e1eb",
  border: "#7f97af",
  divider: "#6f88a0",
  tooltipBackground: "#f9fbff",
  tooltipBorder: "#7f97af"
};

// Register zoom plugin from CDN (required for ES modules)
const isZoomPluginAvailable = Boolean(window.ChartZoom);
if (isZoomPluginAvailable) {
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
    ctx.fillStyle = xTitleOptions.color ?? xTickOptions.color ?? chartTheme.mutedText;
    ctx.font = font.string;
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    ctx.fillText(sourceText, right, sourceY);
    ctx.restore();
  }
};

export function renderChart(ctx, datasets, labels, yAxisLabel = "", axisLimits = {}) {
  // Replace, don't mutate: rebuilding avoids stale plugin/axis state across variable switches.
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
            color: chartTheme.text,
            font: {
              size: 12,
              weight: "normal"
            }
          }
        },

        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: chartTheme.tooltipBackground,
          titleColor: chartTheme.text,
          bodyColor: chartTheme.text,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1
        },

        ...(isZoomPluginAvailable
          ? {
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
            }
          : {})
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
            color: chartTheme.text,
            maxTicksLimit: 10
          },
          grid: {
            color: chartTheme.grid,
            lineWidth: 1
          },
          border: {
            color: chartTheme.border
          },
          title: {
            display: true,
            text: "Year-Month",
            color: chartTheme.text
          }
        },

        y: {
          min: axisLimits.y?.min,
          max: axisLimits.y?.max,
          ticks: {
            color: chartTheme.text,
            callback: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
          },
          grid: {
            color: chartTheme.grid,
            lineWidth: 1
          },
          border: {
            color: chartTheme.border
          },
          title: {
            display: true,
            text: yAxisLabel,
            color: chartTheme.text
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

export function renderDecompositionChart(ctx, datasets, labels, yAxisLabel = "", axisLimits = {}) {
  // Decomposition chart mirrors base chart behavior but uses stacked y-values.
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
            color: chartTheme.text,
            font: { size: 12, weight: "normal" }
          }
        },
        tooltip: {
          mode: "index",
          intersect: false,
          backgroundColor: chartTheme.tooltipBackground,
          titleColor: chartTheme.text,
          bodyColor: chartTheme.text,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1
        },
        ...(isZoomPluginAvailable
          ? {
              zoom: {
                limits: { x: axisLimits.x ?? {}, y: axisLimits.y ?? {} },
                pan: { enabled: true, mode: "x", threshold: 5 },
                zoom: {
                  wheel: { enabled: true, speed: 0.1 },
                  pinch: { enabled: true },
                  drag: { enabled: true, backgroundColor: "rgba(0,0,0,0.1)" },
                  mode: "x"
                }
              }
            }
          : {})
      },
      elements: {
        line: { borderWidth: 2, tension: 0 },
        point: { radius: 0, hoverRadius: 5 }
      },
      scales: {
        x: {
          min: axisLimits.x?.min,
          max: axisLimits.x?.max,
          ticks: { color: chartTheme.text, maxTicksLimit: 10 },
          grid: { color: chartTheme.grid, lineWidth: 1 },
          border: { color: chartTheme.border },
          title: { display: true, text: "Year-Month", color: chartTheme.text }
        },
        y: {
          stacked: true,
          min: axisLimits.y?.min,
          max: axisLimits.y?.max,
          ticks: {
            color: chartTheme.text,
            callback: (value) => Number(value).toLocaleString(undefined, { maximumFractionDigits: 1 })
          },
          grid: { color: chartTheme.grid, lineWidth: 1 },
          border: { color: chartTheme.border },
          title: { display: true, text: yAxisLabel, color: chartTheme.text }
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

const unicodeSuperscripts = {
  "0": "⁰",
  "1": "¹",
  "2": "²",
  "3": "³",
  "4": "⁴",
  "5": "⁵",
  "6": "⁶",
  "7": "⁷",
  "8": "⁸",
  "9": "⁹",
  "a": "ᵃ",
  "b": "ᵇ",
  "c": "ᶜ",
  "d": "ᵈ",
  "e": "ᵉ",
  "f": "ᶠ",
  "g": "ᵍ",
  "h": "ʰ",
  "i": "ⁱ",
  "j": "ʲ",
  "k": "ᵏ",
  "l": "ˡ",
  "m": "ᵐ",
  "n": "ⁿ",
  "o": "ᵒ",
  "p": "ᵖ",
  "r": "ʳ",
  "s": "ˢ",
  "t": "ᵗ",
  "u": "ᵘ",
  "v": "ᵛ",
  "w": "ʷ",
  "x": "ˣ",
  "y": "ʸ",
  "z": "ᶻ",
  "*": "*"
};

function toUnicodeSubscript(token) {
  return token
    .split("")
    .map(char => unicodeSubscripts[char] ?? char)
    .join("");
}

function toUnicodeSuperscript(token) {
  return token
    .split("")
    .map(char => unicodeSuperscripts[char] ?? char)
    .join("");
}

function formatParameterTick(value) {
  // Parameter labels arrive in LaTeX-ish syntax; normalize to readable unicode on the axis.
  if (typeof value !== "string") return value;

  let tick = value.trim();
  if (tick.startsWith("$") && tick.endsWith("$")) tick = tick.slice(1, -1);

  tick = tick
    .replace(/_int/g, "")
    .replace(/\\hat\{y\}/g, "ŷ")
    .replace(/\\sigma/g, "σ")
    .replace(/\\theta/g, "θ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\{\\{/g, "{")
    .replace(/\\}\\}/g, "}");

  tick = tick.replace(/_\{([^}]+)\}/g, (_, token) => toUnicodeSubscript(token));
  tick = tick.replace(/_([A-Za-z0-9*]+)/g, (_, token) => toUnicodeSubscript(token));
  tick = tick.replace(/\^\{([^}]+)\}/g, (_, token) => toUnicodeSuperscript(token));
  tick = tick.replace(/\^([A-Za-z0-9*]+)/g, (_, token) => toUnicodeSuperscript(token));

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
    ctx.strokeStyle = chartTheme.divider;
    ctx.moveTo(x, yScale.top);
    ctx.lineTo(x, yScale.bottom);
    ctx.stroke();
    ctx.restore();
  }
};

const parameterSectionLabelPlugin = {
  id: "parameterSectionLabel",
  afterDraw(chart) {
    const splitIndex = chart?.options?.plugins?.parameterDivider?.splitIndex;
    if (!Number.isInteger(splitIndex) || splitIndex <= 0 || splitIndex >= chart.data.labels.length) return;

    const xScale = chart.scales?.x;
    if (!xScale) return;

    const leftStart = xScale.getPixelForTick(0);
    const leftEnd = xScale.getPixelForTick(splitIndex - 1);
    const rightStart = xScale.getPixelForTick(splitIndex);
    const rightEnd = xScale.getPixelForTick(chart.data.labels.length - 1);
    if (![leftStart, leftEnd, rightStart, rightEnd].every(Number.isFinite)) return;

    const leftCenter = (leftStart + leftEnd) / 2;
    const rightCenter = (rightStart + rightEnd) / 2;
    const y = xScale.bottom + 20;

    const { ctx } = chart;
    ctx.save();
    ctx.fillStyle = chartTheme.mutedText;
    ctx.font = "600 12px 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Standard LW", leftCenter, y);
    ctx.fillText("International Model", rightCenter, y);
    ctx.restore();
  }
};

export function renderParameterChart(ctx, rows, selectedSeries = ["prior", "posterior", "range"]) {
  // Compose datasets dynamically so the legend and rendering match current checkbox state.
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
          bottom: 64
        }
      },
      scales: {
        x: {
          ticks: {
            color: chartTheme.text,
            maxRotation: 70,
            minRotation: 45,
            autoSkip: false,
            callback: (_, index) => formatParameterTick(labels[index])
          },
          title: {
            display: true,
            text: "Parameters",
            color: chartTheme.text
          },
          grid: {
            display: false
          },
          border: {
            color: chartTheme.border
          }
        },
        y: {
          ticks: {
            color: chartTheme.text
          },
          title: {
            display: true,
            text: "Value",
            color: chartTheme.text
          },
          grid: {
            color: chartTheme.grid
          },
          border: {
            color: chartTheme.border
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
          backgroundColor: chartTheme.tooltipBackground,
          titleColor: chartTheme.text,
          bodyColor: chartTheme.text,
          borderColor: chartTheme.tooltipBorder,
          borderWidth: 1
        },
        parameterDivider: {
          splitIndex: getParameterSplitIndex(rows)
        }
      }
    },
    plugins: [sourceLabelPlugin, parameterDividerPlugin, parameterSectionLabelPlugin]
  });

  chartsByCanvas.set(ctx, chart);
  activeChart = chart;

  return chart;
}


export function zoomPluginLoaded() {
  return isZoomPluginAvailable;
}
