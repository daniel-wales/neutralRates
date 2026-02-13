import { fetchData } from "./services/dataService.js";
import { renderChart, getColors, getChartInstance } from "./services/chartService.js";
import { downloadPNG, exportCSV } from "./services/exportService.js";
import { variableConfig } from "./config/variables.js";

document.addEventListener("DOMContentLoaded", () => {
  const economicConfig = {
    selectCountryId: "countrySelect",
    selectVariableId: "variableSelect",
    canvasId: "myChart",
    sourcePath: "data",
    statusId: "economicStatus",
    resetButtonId: "resetZoom",
    downloadButtonId: "downloadPNG",
    exportButtonId: "exportCSV",
    formatLabel: (file, variable) => `${file.replace("_Data.csv", "")} - ${variableConfig[variable][0].label}`
  };

  const interestConfig = {
    selectCountryId: "interestCountrySelect",
    selectVariableId: "interestVariableSelect",
    canvasId: "interestChart",
    sourcePath: "results",
    statusId: "interestStatus",
    resetButtonId: "resetInterestZoom",
    downloadButtonId: "downloadInterestPNG",
    exportButtonId: "exportInterestCSV",
    formatLabel: (file, variable) => `${file.replace("rstar_HLW_SV_", "").replace(".csv", "")} - ${variable}`
  };

  function getSelected(select) {
    return Array.from(select.selectedOptions).map(option => option.value);
  }

  function enableClickToToggleMultiSelect(select) {
    select.addEventListener("mousedown", event => {
      const option = event.target;
      if (option.tagName !== "OPTION") return;

      event.preventDefault();
      option.selected = !option.selected;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function getClampedBounds(values) {
    const numericValues = values.filter(Number.isFinite);
    if (!numericValues.length) return {};

    const minData = Math.min(...numericValues);
    const maxData = Math.max(...numericValues);
    const clampedMin = minData < -50 ? -50 : minData;
    const clampedMax = maxData > 50 ? 50 : maxData;

    return {
      min: Math.floor(clampedMin * 10) / 10,
      max: Math.ceil(clampedMax * 10) / 10
    };
  }

  function getAxisLimitsForPercentChart(isPercentChart, labels, datasets) {
    if (!isPercentChart) return {};

    const y = getClampedBounds(datasets.flatMap(dataset => dataset.data));
    const x = getClampedBounds(labels.map(label => Number(label)));

    return { y, x };
  }

  async function buildDatasets(selectedCountries, selectedVariables, sectionConfig) {
    const datasets = [];
    let labels = [];
    let colorIndex = 0;

    for (const file of selectedCountries) {
      const data = await fetchData(`${sectionConfig.sourcePath}/${file}`);
      if (!labels.length) labels = data.dates;

      for (const variable of selectedVariables) {
        const configItems = variableConfig[variable] || [];

        configItems.forEach(item => {
          datasets.push({
            label: sectionConfig.formatLabel(file, variable),
            data: data.series[item.key],
            borderColor: getColors(colorIndex++),
            tension: 0.2,
            spanGaps: true
          });
        });
      }
    }

    return { labels, datasets };
  }

  function getAxisLabelAndLimits(selectedVariables, labels, datasets) {
    const units = selectedVariables
      .map(variable => variableConfig[variable]?.[0]?.unit)
      .filter(Boolean);

    const uniqueUnits = [...new Set(units)];
    const yAxisLabel = uniqueUnits.length === 1 ? variableConfig[selectedVariables[0]][0].yAxisLabel : "Value";
    const isPercentChart = uniqueUnits.length === 1 && uniqueUnits[0] === "percent";

    return {
      yAxisLabel,
      axisLimits: getAxisLimitsForPercentChart(isPercentChart, labels, datasets)
    };
  }

  function setStatus(statusElement, text) {
    statusElement.textContent = text;
  }

  function setupChartSection(sectionConfig) {
    const countrySelect = document.getElementById(sectionConfig.selectCountryId);
    const variableSelect = document.getElementById(sectionConfig.selectVariableId);
    const canvas = document.getElementById(sectionConfig.canvasId);
    const statusElement = document.getElementById(sectionConfig.statusId);
    const resetButton = document.getElementById(sectionConfig.resetButtonId);
    const downloadButton = document.getElementById(sectionConfig.downloadButtonId);
    const exportButton = document.getElementById(sectionConfig.exportButtonId);

    const update = async () => {
      const selectedCountries = getSelected(countrySelect);
      const selectedVariables = getSelected(variableSelect);

      if (!selectedCountries.length || !selectedVariables.length) {
        setStatus(statusElement, "Select at least one country and one variable.");
        return;
      }

      setStatus(statusElement, "Loading data...");

      const { labels, datasets } = await buildDatasets(selectedCountries, selectedVariables, sectionConfig);
      const { yAxisLabel, axisLimits } = getAxisLabelAndLimits(selectedVariables, labels, datasets);

      renderChart(canvas, datasets, labels, yAxisLabel, axisLimits);
      setStatus(statusElement, `Showing ${selectedCountries.length} country(ies) and ${selectedVariables.length} variable(s).`);
    };

    countrySelect.addEventListener("change", update);
    variableSelect.addEventListener("change", update);
    enableClickToToggleMultiSelect(countrySelect);
    enableClickToToggleMultiSelect(variableSelect);

    downloadButton.addEventListener("click", () => downloadPNG(getChartInstance(canvas)));
    exportButton.addEventListener("click", () => exportCSV(getChartInstance(canvas)));
    resetButton.addEventListener("click", () => {
      const chart = getChartInstance(canvas);
      if (chart) chart.resetZoom();
    });

    return update;
  }

  const updateEconomic = setupChartSection(economicConfig);
  const updateInterest = setupChartSection(interestConfig);

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      document.querySelectorAll(".tab-content").forEach(tab => (tab.style.display = "none"));
      document.querySelectorAll(".tab-button").forEach(tabButton => tabButton.classList.remove("active"));
      document.getElementById(`tab-${target}`).style.display = "block";
      button.classList.add("active");

      if (target === "economic") updateEconomic();
      if (target === "interest") updateInterest();
    });
  });

  updateEconomic();
  updateInterest();
});
