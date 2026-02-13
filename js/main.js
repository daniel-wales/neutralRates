import { fetchData } from "./services/dataService.js";
import { renderChart, getColors, getChartInstance } from "./services/chartService.js";
import { downloadPNG, exportCSV } from "./services/exportService.js";
import { variableConfig } from "./config/variables.js";

document.addEventListener("DOMContentLoaded", () => {

  // ---------------------
  // Elements for Economic Data tab
  // ---------------------
  const countrySelect = document.getElementById("countrySelect");
  const variableSelect = document.getElementById("variableSelect");
  const downloadPNGBtn = document.getElementById("downloadPNG");
  const exportCSVBtn = document.getElementById("exportCSV");
  const ctx = document.getElementById("myChart");
  let lastRenderedData = null;

  // ---------------------
  // Elements for Interest Rates tab
  // ---------------------
  const interestCountrySelect = document.getElementById("interestCountrySelect");
  const interestVariableSelect = document.getElementById("interestVariableSelect");
  const interestCtx = document.getElementById("interestChart");
  const downloadInterestPNG = document.getElementById("downloadInterestPNG");
  const exportInterestCSV = document.getElementById("exportInterestCSV");
  let lastInterestData = null;

  // ---------------------
  // 🔹 Helpers
  // ---------------------
  function getMode() {
    const modeInput = document.querySelector("input[name='mode']:checked");
    return modeInput ? modeInput.value : "countries"; // fallback
  }

  function getSelected(select) {
    return Array.from(select.selectedOptions).map(o => o.value);
  }

  // ---------------------
  // 🔹 Update Economic Data Chart
  // ---------------------
  async function updateChart() {
    const mode = getMode();
    const selectedCountries = getSelected(countrySelect);
    const selectedVariables = getSelected(variableSelect);

    if (!selectedCountries.length || !selectedVariables.length) return;

    let datasets = [];
    let labels = [];
    let colorIndex = 0;

    // 1️⃣ Compare Countries mode
    if (mode === "countries") {
      const variable = selectedVariables[0];
      for (const file of selectedCountries) {
        const data = await fetchData(`data/${file}`);
        if (!labels.length) labels = data.dates;
        const config = variableConfig[variable];
        config.forEach(item => {
          datasets.push({
            label: `${file.replace("_Data.csv","")} - ${item.label}`,
            data: data.series[item.key],
            borderColor: getColors(colorIndex++),
            tension: 0.2,
            spanGaps: true
          });
        });
      }
    }
    // 2️⃣ Compare Variables mode
    else if (mode === "variables") {
      const file = selectedCountries[0];
      const data = await fetchData(`data/${file}`);
      labels = data.dates;
      for (const variable of selectedVariables) {
        const config = variableConfig[variable];
        config.forEach(item => {
          datasets.push({
            label: `${file.replace("_Data.csv","")} - ${item.label}`,
            data: data.series[item.key],
            borderColor: getColors(colorIndex++),
            tension: 0.2,
            spanGaps: true
          });
        });
      }
    }
    // 3️⃣ Mixed mode
    else if (mode === "mixed") {
      for (const file of selectedCountries) {
        const data = await fetchData(`data/${file}`);
        if (!labels.length) labels = data.dates;
        for (const variable of selectedVariables) {
          const config = variableConfig[variable];
          config.forEach(item => {
            datasets.push({
              label: `${file.replace("_Data.csv","")} - ${item.label}`,
              data: data.series[item.key],
              borderColor: getColors(colorIndex++),
              tension: 0.2,
              spanGaps: true
            });
          });
        }
      }
    }

    // Y-axis label logic
    const units = selectedVariables.map(v => variableConfig[v][0].unit);
    const uniqueUnits = [...new Set(units)];
    let yAxisLabel = uniqueUnits.length === 1 ? variableConfig[selectedVariables[0]][0].yAxisLabel : "Value";

    renderChart(ctx, datasets, labels, yAxisLabel);
    lastRenderedData = { labels, datasets, yAxisLabel };
  }

  // ---------------------
  // 🔹 Update Interest Rates Chart
  // ---------------------
  async function updateInterestChart() {
    const country = interestCountrySelect.value;
    const variable = interestVariableSelect.value;
    if (!country || !variable) return;

    const data = await fetchData(`results/${file}`);

    const dataset = {
      label: variable,
      data: data.series[variable],
      borderColor: "#1f77b4",
      tension: 0.2,
      spanGaps: true
    };

    renderChart(interestCtx, [dataset], data.dates, variable);
    lastInterestData = { labels: data.dates, datasets: [dataset], yAxisLabel: variable };
  }

  // ---------------------
  // 🔹 Event Listeners for Economic Data
  // ---------------------
  countrySelect.addEventListener("change", updateChart);
  variableSelect.addEventListener("change", updateChart);
  document.querySelectorAll("input[name='mode']").forEach(r => r.addEventListener("change", updateChart));
  downloadPNGBtn.addEventListener("click", () => downloadPNG(getChartInstance()));
  exportCSVBtn.addEventListener("click", () => exportCSV(lastRenderedData));
  document.getElementById("resetZoom").addEventListener("click", () => {
    const chart = getChartInstance();
    if (chart) chart.resetZoom();
  });

  // ---------------------
  // 🔹 Event Listeners for Interest Rates
  // ---------------------
  interestCountrySelect.addEventListener("change", updateInterestChart);
  interestVariableSelect.addEventListener("change", updateInterestChart);
  downloadInterestPNG.addEventListener("click", () => downloadPNG(getChartInstance()));
  exportInterestCSV.addEventListener("click", () => exportCSV(lastInterestData));
  document.getElementById("resetInterestZoom").addEventListener("click", () => {
    const chart = getChartInstance();
    if (chart) chart.resetZoom();
  });

  // ---------------------
  // 🔹 Tab Switching
  // ---------------------
  document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;
      document.querySelectorAll('.tab-content').forEach(tab => tab.style.display = 'none');
      document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      document.getElementById('tab-' + target).style.display = 'block';
      button.classList.add('active');
    });
  });

  // ---------------------
  // 🔹 Initial Render
  // ---------------------
  updateChart();
  updateInterestChart();

});
