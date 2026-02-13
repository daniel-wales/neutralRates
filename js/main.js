import { fetchData } from "./services/dataService.js";
import { renderChart, getColors, getChartInstance } from "./services/chartService.js";
import { downloadPNG, exportCSV } from "./services/exportService.js";
import { variableConfig } from "./config/variables.js";
import { countryCatalog, countryPresets, getCountryFile } from "./config/countries.js";

document.addEventListener("DOMContentLoaded", () => {
  const economicConfig = {
    id: "economic",
    selectCountryId: "countrySelect",
    countrySearchId: "countrySearch",
    presetContainerId: "economicPresets",
    selectVariableId: "variableSelect",
    canvasId: "myChart",
    sourcePath: "data",
    statusId: "economicStatus",
    resetButtonId: "resetZoom",
    downloadButtonId: "downloadPNG",
    exportButtonId: "exportCSV",
    defaultCountries: ["usa"],
    formatLabel: (file, variable) => `${file.replace("_Data.csv", "")} - ${variableConfig[variable][0].label}`
  };

  const interestConfig = {
    id: "interest",
    selectCountryId: "interestCountrySelect",
    countrySearchId: "interestCountrySearch",
    presetContainerId: "interestPresets",
    selectVariableId: "interestVariableSelect",
    canvasId: "interestChart",
    sourcePath: "results",
    statusId: "interestStatus",
    resetButtonId: "resetInterestZoom",
    downloadButtonId: "downloadInterestPNG",
    exportButtonId: "exportInterestCSV",
    defaultCountries: ["usa"],
    formatLabel: (file, variable) => `${file.replace("rstar_HLW_SV_", "").replace(".csv", "")} - ${variable}`
  };

  const countryMetadataBySection = {
    economic: new Map(),
    interest: new Map()
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

  function setStatus(statusElement, text, type = "warning") {
    statusElement.textContent = text;
    statusElement.className = `status-message status-${type}`;
  }

  function groupByRegion(items) {
    return items.reduce((acc, item) => {
      if (!acc[item.group]) acc[item.group] = [];
      acc[item.group].push(item);
      return acc;
    }, {});
  }

  function buildCountrySelect(select, sectionId, query = "", selectedValues = new Set()) {
    const filtered = countryCatalog.filter(country => country.name.toLowerCase().includes(query.toLowerCase()));
    const grouped = groupByRegion(filtered);

    select.innerHTML = "";
    countryMetadataBySection[sectionId].clear();

    Object.keys(grouped).forEach(region => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = region;

      grouped[region].forEach(country => {
        const file = getCountryFile(country, sectionId);
        const option = document.createElement("option");
        option.value = file;
        option.textContent = country.name;
        option.selected = selectedValues.has(file);
        countryMetadataBySection[sectionId].set(country.code, file);
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });
  }

  function applyPreset(sectionConfig, presetName) {
    const select = document.getElementById(sectionConfig.selectCountryId);
    const supportedCodes = countryPresets[presetName] || [];

    const filesToSelect = new Set(
      supportedCodes
        .map(code => countryMetadataBySection[sectionConfig.id].get(code))
        .filter(Boolean)
    );

    Array.from(select.options).forEach(option => {
      option.selected = filesToSelect.has(option.value);
    });

    if (!filesToSelect.size && presetName !== "CLEAR") {
      const defaultFile = countryMetadataBySection[sectionConfig.id].get("usa");
      if (defaultFile) {
        Array.from(select.options).forEach(option => {
          option.selected = option.value === defaultFile;
        });
      }
    }

    select.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function setupCountryControls(sectionConfig, update) {
    const select = document.getElementById(sectionConfig.selectCountryId);
    const searchInput = document.getElementById(sectionConfig.countrySearchId);
    const presetContainer = document.getElementById(sectionConfig.presetContainerId);

    const defaults = new Set(
      sectionConfig.defaultCountries
        .map(code => countryCatalog.find(country => country.code === code))
        .filter(Boolean)
        .map(country => getCountryFile(country, sectionConfig.id))
    );

    buildCountrySelect(select, sectionConfig.id, "", defaults);

    searchInput.addEventListener("input", () => {
      const selectedValues = new Set(getSelected(select));
      buildCountrySelect(select, sectionConfig.id, searchInput.value, selectedValues);
    });

    presetContainer.addEventListener("click", event => {
      const button = event.target.closest("button[data-preset]");
      if (!button) return;
      applyPreset(sectionConfig, button.dataset.preset);
    });
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
        setStatus(statusElement, "Select at least one country and one variable.", "warning");
        return;
      }

      setStatus(statusElement, "Loading data...", "warning");

      try {
        const { labels, datasets } = await buildDatasets(selectedCountries, selectedVariables, sectionConfig);
        if (!datasets.length || !labels.length) {
          setStatus(statusElement, "No usable data found for the selected filters.", "warning");
          return;
        }

        const { yAxisLabel, axisLimits } = getAxisLabelAndLimits(selectedVariables, labels, datasets);
        renderChart(canvas, datasets, labels, yAxisLabel, axisLimits);
        setStatus(statusElement, `Showing ${selectedCountries.length} country(ies) and ${selectedVariables.length} variable(s).`, "success");
      } catch (error) {
        setStatus(statusElement, `Error loading chart data: ${error.message}`, "error");
      }
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

    setupCountryControls(sectionConfig, update);

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
