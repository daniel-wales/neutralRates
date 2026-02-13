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
  function getSelected(select) {
    return Array.from(select.selectedOptions).map(o => o.value);
  }

  function enableClickToToggleMultiSelect(select) {
    select.addEventListener("mousedown", (event) => {
      const option = event.target;
      if (option.tagName !== "OPTION") return;

      event.preventDefault();
      option.selected = !option.selected;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function getClampedBounds(values) {
    const numericValues = values.filter(v => Number.isFinite(v));
    if (!numericValues.length) return {};

    const minData = Math.min(...numericValues);
    const maxData = Math.max(...numericValues);
    const clampedMin = minData < -50 ? -50 : minData;
    const clampedMax = maxData > 50 ? 50 : maxData;

    const roundedMin = Math.floor(clampedMin * 10) / 10;
    const roundedMax = Math.ceil(clampedMax * 10) / 10;

    return {
      min: roundedMin,
      max: roundedMax
    };
  }

  function getAxisLimitsForPercentChart(isPercentChart, labels, datasets) {
    if (!isPercentChart) return {};

    const yValues = datasets.flatMap(ds => ds.data);
    const y = getClampedBounds(yValues);

    const numericLabels = labels.map(label => Number(label));
    const x = getClampedBounds(numericLabels);

    return { y, x };
  }

  // ---------------------
  // 🔹 Update Economic Data Chart
  // ---------------------
  async function updateChart() {
    const selectedCountries = getSelected(countrySelect);
    const selectedVariables = getSelected(variableSelect);

    if (!selectedCountries.length || !selectedVariables.length) return;

    let datasets = [];
    let labels = [];
    let colorIndex = 0;

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

    // Y-axis label logic
    const units = selectedVariables.map(v => variableConfig[v][0].unit);
    const uniqueUnits = [...new Set(units)];
    let yAxisLabel = uniqueUnits.length === 1 ? variableConfig[selectedVariables[0]][0].yAxisLabel : "Value";

    const isPercentChart = uniqueUnits.length === 1 && uniqueUnits[0] === "percent";
    const axisLimits = getAxisLimitsForPercentChart(isPercentChart, labels, datasets);

    renderChart(ctx, datasets, labels, yAxisLabel, axisLimits);
    lastRenderedData = { labels, datasets, yAxisLabel };
  }

  // ---------------------
  // 🔹 Update Interest Rates Chart
  // ---------------------
  async function updateInterestChart() {
    const selectedCountries = getSelected(interestCountrySelect);
    const selectedVariables = getSelected(interestVariableSelect);
    if (!selectedCountries.length || !selectedVariables.length) return;

    const datasets = [];
    let labels = [];
    let colorIndex = 0;

    for (const country of selectedCountries) {
      const data = await fetchData(`results/${country}`);
      if (!labels.length) labels = data.dates;

      for (const variable of selectedVariables) {
        datasets.push({
          label: `${country.replace("rstar_HLW_SV_", "").replace(".csv", "")} - ${variable}`,
          data: data.series[variable],
          borderColor: getColors(colorIndex++),
          tension: 0.2,
          spanGaps: true
        });
      }
    }

    const interestUnits = selectedVariables.map(v => variableConfig[v]?.[0]?.unit).filter(Boolean);
    const uniqueUnits = [...new Set(interestUnits)];
    const yAxisLabel = uniqueUnits.length === 1 ? variableConfig[selectedVariables[0]][0].yAxisLabel : "Value";
    const isPercentChart = uniqueUnits.length === 1 && uniqueUnits[0] === "percent";
    const axisLimits = getAxisLimitsForPercentChart(isPercentChart, labels, datasets);

    renderChart(interestCtx, datasets, labels, yAxisLabel, axisLimits);
    lastInterestData = { labels, datasets, yAxisLabel };
  }

  // ---------------------
  // 🔹 Event Listeners for Economic Data
  // ---------------------
  countrySelect.addEventListener("change", updateChart);
  variableSelect.addEventListener("change", updateChart);
  enableClickToToggleMultiSelect(countrySelect);
  enableClickToToggleMultiSelect(variableSelect);
  downloadPNGBtn.addEventListener("click", () => downloadPNG(getChartInstance(ctx)));
  exportCSVBtn.addEventListener("click", () => exportCSV(lastRenderedData));
  document.getElementById("resetZoom").addEventListener("click", () => {
    const chart = getChartInstance(ctx);
    if (chart) chart.resetZoom();
  });

  // ---------------------
  // 🔹 Event Listeners for Interest Rates
  // ---------------------
  interestCountrySelect.addEventListener("change", updateInterestChart);
  interestVariableSelect.addEventListener("change", updateInterestChart);
  enableClickToToggleMultiSelect(interestCountrySelect);
  enableClickToToggleMultiSelect(interestVariableSelect);
  downloadInterestPNG.addEventListener("click", () => downloadPNG(getChartInstance(interestCtx)));
  exportInterestCSV.addEventListener("click", () => exportCSV(lastInterestData));
  document.getElementById("resetInterestZoom").addEventListener("click", () => {
    const chart = getChartInstance(interestCtx);
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

      if (target === 'economic') updateChart();
      if (target === 'interest') updateInterestChart();
    });
  });

  // ---------------------
  // 🔹 Initial Render
  // ---------------------
  updateChart();
  updateInterestChart();

});
