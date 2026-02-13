import { fetchData } from "./services/dataService.js";
import { renderChart, getColors, getChartInstance } from "./services/chartService.js";
import { downloadPNG, exportCSV } from "./services/exportService.js";
import { variableConfig } from "./config/variables.js";
import { countries, countryPresets } from "./config/countries.js";

document.addEventListener("DOMContentLoaded", () => {
  const economicConfig = {
    selectCountryId: "countrySelect",
    selectVariableId: "variableSelect",
    countrySearchId: "countrySearch",
    canvasId: "myChart",
    sourcePath: "data",
    statusId: "economicStatus",
    resetButtonId: "resetZoom",
    downloadButtonId: "downloadPNG",
    exportButtonId: "exportCSV",
    fileField: "dataFile",
    formatLabel: (file, variable) => `${file.replace("_Data.csv", "")} - ${variableConfig[variable][0].label}`
  };

  const interestConfig = {
    selectCountryId: "interestCountrySelect",
    selectVariableId: "interestVariableSelect",
    countrySearchId: "interestCountrySearch",
    canvasId: "interestChart",
    sourcePath: "results",
    statusId: "interestStatus",
    resetButtonId: "resetInterestZoom",
    downloadButtonId: "downloadInterestPNG",
    exportButtonId: "exportInterestCSV",
    fileField: "resultFile",
    formatLabel: (file, variable) => `${file.replace("rstar_HLW_SV_", "").replace(".csv", "")} - ${variable}`
  };

  function getSelected(select) {
    return Array.from(select.selectedOptions).map(option => option.value);
  }

  function setStatus(statusElement, text, tone = "info") {
    statusElement.textContent = text;
    statusElement.dataset.tone = tone;
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

    return {
      min: Math.floor((minData < -50 ? -50 : minData) * 10) / 10,
      max: Math.ceil((maxData > 50 ? 50 : maxData) * 10) / 10
    };
  }

  function getAxisLimitsForPercentChart(isPercentChart, labels, datasets) {
    if (!isPercentChart) return {};

    return {
      y: getClampedBounds(datasets.flatMap(dataset => dataset.data)),
      x: getClampedBounds(labels.map(label => Number(label)))
    };
  }

  function populateCountrySelect(select, fileField, selectedValues = [], searchText = "") {
    const selectedSet = new Set(selectedValues);
    const searchTerm = searchText.trim().toLowerCase();

    const grouped = countries.reduce((acc, country) => {
      if (searchTerm && !country.name.toLowerCase().includes(searchTerm)) return acc;
      acc[country.region] ||= [];
      acc[country.region].push(country);
      return acc;
    }, {});

    select.innerHTML = "";

    Object.entries(grouped).forEach(([region, regionCountries]) => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = region;

      regionCountries.forEach(country => {
        const option = document.createElement("option");
        option.value = country[fileField];
        option.textContent = country.name;
        option.selected = selectedSet.has(option.value);
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    });
  }

  function applyPreset(select, fileField, presetName) {
    if (presetName === "clear") {
      Array.from(select.options).forEach(option => (option.selected = false));
      return;
    }

    const selectedCodes = new Set(countryPresets[presetName] || []);
    const selectedValues = countries
      .filter(country => selectedCodes.has(country.code))
      .map(country => country[fileField]);

    Array.from(select.options).forEach(option => {
      option.selected = selectedValues.includes(option.value);
    });
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
    const units = selectedVariables.map(variable => variableConfig[variable]?.[0]?.unit).filter(Boolean);
    const uniqueUnits = [...new Set(units)];

    return {
      yAxisLabel: uniqueUnits.length === 1 ? variableConfig[selectedVariables[0]][0].yAxisLabel : "Value",
      axisLimits: getAxisLimitsForPercentChart(uniqueUnits.length === 1 && uniqueUnits[0] === "percent", labels, datasets)
    };
  }

  function setupChartSection(sectionConfig) {
    const countrySelect = document.getElementById(sectionConfig.selectCountryId);
    const variableSelect = document.getElementById(sectionConfig.selectVariableId);
    const countrySearch = document.getElementById(sectionConfig.countrySearchId);
    const canvas = document.getElementById(sectionConfig.canvasId);
    const statusElement = document.getElementById(sectionConfig.statusId);

    populateCountrySelect(countrySelect, sectionConfig.fileField, [countries.find(c => c.code === "usa")[sectionConfig.fileField]]);

    const update = async () => {
      const selectedCountries = getSelected(countrySelect);
      const selectedVariables = getSelected(variableSelect);

      if (!selectedCountries.length || !selectedVariables.length) {
        setStatus(statusElement, "Select at least one country and one variable.", "warning");
        return;
      }

      setStatus(statusElement, "Loading data...", "info");

      try {
        const { labels, datasets } = await buildDatasets(selectedCountries, selectedVariables, sectionConfig);
        const { yAxisLabel, axisLimits } = getAxisLabelAndLimits(selectedVariables, labels, datasets);
        renderChart(canvas, datasets, labels, yAxisLabel, axisLimits);
        setStatus(statusElement, `Showing ${selectedCountries.length} country(ies) and ${selectedVariables.length} variable(s).`, "success");
      } catch (error) {
        console.error(error);
        setStatus(statusElement, "Could not load one or more files. Check browser console for details.", "error");
      }
    };

    countrySearch.addEventListener("input", () => {
      populateCountrySelect(countrySelect, sectionConfig.fileField, getSelected(countrySelect), countrySearch.value);
      countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
    });

    countrySelect.addEventListener("change", update);
    variableSelect.addEventListener("change", update);

    enableClickToToggleMultiSelect(countrySelect);
    enableClickToToggleMultiSelect(variableSelect);

    document.getElementById(sectionConfig.downloadButtonId).addEventListener("click", () => downloadPNG(getChartInstance(canvas)));
    document.getElementById(sectionConfig.exportButtonId).addEventListener("click", () => exportCSV(getChartInstance(canvas)));
    document.getElementById(sectionConfig.resetButtonId).addEventListener("click", () => {
      const chart = getChartInstance(canvas);
      if (chart) chart.resetZoom();
    });

    return { update, countrySelect };
  }

  const economic = setupChartSection(economicConfig);
  const interest = setupChartSection(interestConfig);

  document.querySelectorAll(".preset-button").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.target;
      const preset = button.dataset.preset;

      if (target === "economic") {
        applyPreset(economic.countrySelect, economicConfig.fileField, preset);
        economic.countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }

      if (target === "interest") {
        applyPreset(interest.countrySelect, interestConfig.fileField, preset);
        interest.countrySelect.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });

  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      const target = button.dataset.tab;
      document.querySelectorAll(".tab-content").forEach(tab => (tab.style.display = "none"));
      document.querySelectorAll(".tab-button").forEach(tabButton => tabButton.classList.remove("active"));
      document.getElementById(`tab-${target}`).style.display = "block";
      button.classList.add("active");

      if (target === "economic") economic.update();
      if (target === "interest") interest.update();
    });
  });

  economic.update();
  interest.update();
});
