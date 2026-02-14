/**
 * Main UI orchestration module.
 *
 * Owns section state wiring, country/variable selection flows, dataset assembly,
 * tab activation behavior, and status messaging for all dashboard panes.
 */
import { fetchData, fetchParameterData } from "./services/dataService.js";
import { renderChart, renderDecompositionChart, renderParameterChart, getColors, getChartInstance, zoomPluginLoaded } from "./services/chartService.js";
import { downloadPNG, exportCSV } from "./services/exportService.js";
import { variableConfig } from "./config/variables.js";
import { countryCatalog, countryPresets, regionMedianGroups, sectionSupportedCountryCodes, getCountryFile } from "./config/countries.js";
import { computeMedian, getDateLabels } from "./utils/datasetUtils.js";

document.addEventListener("DOMContentLoaded", () => {
  // Section-specific wiring metadata (selectors, sources, default selections).
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
    defaultSelections: ["median:WORLD"],
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
    defaultSelections: ["median:WORLD"],
    formatLabel: (file, variable) => `${file.replace("rstar_HLW_SV_", "").replace(".csv", "")} - ${variableConfig[variable]?.[0]?.label ?? variable}`
  };

  const decompositionConfig = {
    id: "decompositions",
    selectCountryId: "decompositionCountrySelect",
    countrySearchId: "decompositionCountrySearch",
    presetContainerId: "decompositionPresets",
    selectVariableId: "decompositionVariableSelect",
    canvasId: "decompositionChart",
    sourcePath: "results",
    statusId: "decompositionStatus",
    resetButtonId: "resetDecompositionZoom",
    downloadButtonId: "downloadDecompositionPNG",
    exportButtonId: "exportDecompositionCSV",
    defaultSelections: ["median:WORLD"],
    formatLabel: (file, variable) => `${file.replace("rstar_HLW_SV_", "").replace(".csv", "")} - ${variableConfig[variable]?.[0]?.label ?? variable}`
  };

  const parameterConfig = {
    id: "parameters",
    selectCountryId: "parameterCountrySelect",
    countrySearchId: "parameterCountrySearch",
    canvasId: "parameterChart",
    sourcePath: "tables",
    statusId: "parameterStatus",
    defaultCountries: ["usa"]
  };


  // Lookup maps refreshed whenever country lists are rebuilt (search/preset changes).
  const countryMetadataBySection = {
    economic: new Map(),
    interest: new Map(),
    decompositions: new Map(),
    parameters: new Map()
  };


  // Selection + interaction helpers.
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


  const countryByCode = new Map(countryCatalog.map(country => [country.code, country]));

  function computeOutputGap(outputLevel, trendOutputLevel) {
    if (!Number.isFinite(outputLevel) || !Number.isFinite(trendOutputLevel) || outputLevel <= 0 || trendOutputLevel <= 0) {
      return null;
    }

    const gap = (Math.log(outputLevel) - Math.log(trendOutputLevel)) * 100;
    return Number.isFinite(gap) ? gap : null;
  }

  function getSeriesValue(data, key, index) {
    if (key === "output_gap_lw") {
      return computeOutputGap(data.series.yobs?.[index], data.series.ybar_lw?.[index]);
    }

    if (key === "output_gap_int") {
      return computeOutputGap(data.series.yobs?.[index], data.series.ybar_lw_int?.[index]);
    }

    if (key === "observed_growth_rate_yoy") {
      const currentDate = data.dates?.[index];
      if (!currentDate) return null;

      const [year, month] = currentDate.split("-");
      const previousYearDate = `${Number(year) - 1}-${month}`;
      const dateIndexMap = data.dateIndexMap || new Map(data.dates.map((date, idx) => [date, idx]));
      const previousIndex = dateIndexMap.get(previousYearDate);

      if (previousIndex == null) return null;

      const outputLevelNow = data.series.yobs?.[index];
      const outputLevelPast = data.series.yobs?.[previousIndex];

      if (!Number.isFinite(outputLevelNow) || !Number.isFinite(outputLevelPast) || outputLevelNow <= 0 || outputLevelPast <= 0) {
        return null;
      }

      const growth = (Math.log(outputLevelNow) - Math.log(outputLevelPast)) * 100;
      return Number.isFinite(growth) ? growth : null;
    }

    return data.series[key]?.[index] ?? null;
  }

  function getDecompositionValue(data, key, index) {
    const rstarLW = data.series.rstar_lw?.[index];
    const gHome = data.series.gg_home?.[index];
    const rstarInt = data.series.rstar_lw_int?.[index];
    const gHomeInt = data.series.gg_home_int?.[index];
    const gForeign = data.series.gg_home_f?.[index];

    if (key === "lw_z") {
      if (!Number.isFinite(rstarLW) || !Number.isFinite(gHome)) return null;
      return rstarLW - gHome;
    }

    if (key === "int_z") {
      if (!Number.isFinite(rstarInt) || !Number.isFinite(gHomeInt) || !Number.isFinite(gForeign)) return null;
      return rstarInt - gHomeInt - gForeign;
    }

    return data.series[key]?.[index] ?? null;
  }

  function getDecompositionValueByDate(data, key, date) {
    const index = data.dateIndexMap?.get(date);
    if (index == null) return null;
    return getDecompositionValue(data, key, index);
  }

  function getSeriesValueByDate(data, key, date) {
    const index = data.dateIndexMap?.get(date);
    if (index == null) return null;
    return getSeriesValue(data, key, index);
  }

  function getSelectionDescriptor(selection, sectionConfig) {
    if (!selection.startsWith("median:")) return { type: "country", file: selection, label: selection };

    const groupCode = selection.replace("median:", "");
    const group = regionMedianGroups.find(item => item.code === groupCode);
    if (!group) return { type: "country", file: selection, label: selection };

    const supportedCodes = new Set(sectionSupportedCountryCodes[sectionConfig.id] || []);
    const memberFiles = group.members
      .filter(code => !supportedCodes.size || supportedCodes.has(code))
      .map(code => countryByCode.get(code))
      .filter(Boolean)
      .map(country => getCountryFile(country, sectionConfig.id));

    return {
      type: "median",
      label: group.name,
      memberFiles
    };
  }

  function getAxisLimitsForPercentChart(isPercentChart, labels, datasets) {
    if (!isPercentChart) return {};

    const y = getClampedBounds(datasets.flatMap(dataset => dataset.data));
    const x = getClampedBounds(labels.map(label => Number(label)));

    return { y, x };
  }


  // Dataset assembly for both direct country series and regional medians.
  async function buildDatasets(selectedCountries, selectedVariables, sectionConfig) {
    const datasets = [];
    let colorIndex = 0;
    const selections = [];

    for (const selection of selectedCountries) {
      const descriptor = getSelectionDescriptor(selection, sectionConfig);

      if (descriptor.type === "median") {
        const memberData = await Promise.all(
          descriptor.memberFiles.map(file => fetchData(`${sectionConfig.sourcePath}/${file}`))
        );

        memberData.forEach(data => {
          if (!data.dateIndexMap) data.dateIndexMap = new Map(data.dates.map((date, idx) => [date, idx]));
        });

        selections.push({ type: "median", descriptor, memberData });
        continue;
      }

      const data = await fetchData(`${sectionConfig.sourcePath}/${descriptor.file}`);
      if (!data.dateIndexMap) data.dateIndexMap = new Map(data.dates.map((date, idx) => [date, idx]));
      selections.push({ type: "country", descriptor, data });
    }

    const labels = getDateLabels(
      selections.flatMap(item => (item.type === "median" ? item.memberData : [item.data]))
    );

    for (const selection of selections) {
      if (selection.type === "median") {
        for (const variable of selectedVariables) {
          const configItems = variableConfig[variable] || [];

          configItems.forEach(item => {
            const points = labels.map(date =>
              computeMedian(selection.memberData.map(data => getSeriesValueByDate(data, item.key, date)))
            );

            datasets.push({
              label: `${selection.descriptor.label} - ${variableConfig[variable][0].label}`,
              data: points,
              borderColor: getColors(colorIndex++),
              tension: 0.2,
              spanGaps: true,
              borderDash: [6, 4]
            });
          });
        }

        continue;
      }

      for (const variable of selectedVariables) {
        const configItems = variableConfig[variable] || [];

        configItems.forEach(item => {
          datasets.push({
            label: sectionConfig.formatLabel(selection.descriptor.file, variable),
            data: labels.map(date => getSeriesValueByDate(selection.data, item.key, date)),
            borderColor: getColors(colorIndex++),
            tension: 0.2,
            spanGaps: true
          });
        });
      }
    }

    return { labels, datasets };
  }


  async function buildDecompositionDatasets(selectedCountries, selectedVariables, sectionConfig) {
    const selections = [];

    for (const selection of selectedCountries) {
      const descriptor = getSelectionDescriptor(selection, sectionConfig);

      if (descriptor.type === "median") {
        const memberData = await Promise.all(
          descriptor.memberFiles.map(file => fetchData(`${sectionConfig.sourcePath}/${file}`))
        );

        memberData.forEach(data => {
          if (!data.dateIndexMap) data.dateIndexMap = new Map(data.dates.map((date, idx) => [date, idx]));
        });

        selections.push({ type: "median", descriptor, memberData });
        continue;
      }

      const data = await fetchData(`${sectionConfig.sourcePath}/${descriptor.file}`);
      if (!data.dateIndexMap) data.dateIndexMap = new Map(data.dates.map((date, idx) => [date, idx]));
      selections.push({ type: "country", descriptor, data });
    }

    const labels = getDateLabels(
      selections.flatMap(item => (item.type === "median" ? item.memberData : [item.data]))
    );

    const datasets = [];

    for (const selection of selections) {
      const baseLabel = selection.type === "median"
        ? selection.descriptor.label
        : selection.descriptor.file.replace("rstar_HLW_SV_", "").replace(".csv", "");

      for (const variable of selectedVariables) {
        const isLW = variable === "rstar_lw_decomposition";
        const components = isLW
          ? [
              { key: "gg_home", label: "g", color: "rgba(31, 119, 180, 0.45)" },
              { key: "lw_z", label: "z", color: "rgba(214, 39, 40, 0.45)" }
            ]
          : [
              { key: "gg_home_int", label: "g home", color: "rgba(31, 119, 180, 0.45)" },
              { key: "gg_home_f", label: "g foreign", color: "rgba(44, 160, 44, 0.45)" },
              { key: "int_z", label: "z int", color: "rgba(214, 39, 40, 0.45)" }
            ];

        const totalKey = isLW ? "rstar_lw" : "rstar_lw_int";

        components.forEach(component => {
          const points = labels.map(date => {
            if (selection.type === "median") {
              return computeMedian(selection.memberData.map(data => getDecompositionValueByDate(data, component.key, date)));
            }

            return getDecompositionValueByDate(selection.data, component.key, date);
          });

          datasets.push({
            label: `${baseLabel} - ${component.label}`,
            data: points,
            borderColor: "transparent",
            backgroundColor: component.color,
            fill: "stack",
            borderWidth: 0,
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0,
            stack: `${baseLabel}-${variable}`
          });
        });

        const totalPoints = labels.map(date => {
          if (selection.type === "median") {
            return computeMedian(selection.memberData.map(data => getDecompositionValueByDate(data, totalKey, date)));
          }

          return getDecompositionValueByDate(selection.data, totalKey, date);
        });

        datasets.push({
          label: `${baseLabel} - total`,
          data: totalPoints,
          borderColor: "#000000",
          backgroundColor: "transparent",
          fill: false,
          borderWidth: 2,
          pointRadius: 0,
          pointHoverRadius: 3,
          tension: 0,
          spanGaps: true
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
    const supportedCodes = new Set(sectionSupportedCountryCodes[sectionId] || []);
    const filtered = countryCatalog
      .filter(country => country.name.toLowerCase().includes(query.toLowerCase()))
      .filter(country => !supportedCodes.size || supportedCodes.has(country.code));
    const grouped = groupByRegion(filtered);

    select.innerHTML = "";
    countryMetadataBySection[sectionId].clear();

    if (sectionId !== "parameters") {
      const medianOptgroup = document.createElement("optgroup");
      medianOptgroup.label = "Regional medians";

      regionMedianGroups.forEach(group => {
        const value = `median:${group.code}`;
        const option = document.createElement("option");
        option.value = value;
        option.textContent = group.name;
        option.selected = selectedValues.has(value);
        medianOptgroup.appendChild(option);
      });

      select.appendChild(medianOptgroup);
    }

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
    const presetContainer = sectionConfig.presetContainerId
      ? document.getElementById(sectionConfig.presetContainerId)
      : null;

    const defaults = new Set(sectionConfig.defaultSelections || []);

    if (!defaults.size) {
      (sectionConfig.defaultCountries || [])
        .map(code => countryCatalog.find(country => country.code === code))
        .filter(Boolean)
        .map(country => getCountryFile(country, sectionConfig.id))
        .forEach(file => defaults.add(file));
    }

    buildCountrySelect(select, sectionConfig.id, "", defaults);

    searchInput.addEventListener("input", () => {
      const selectedValues = new Set(getSelected(select));
      buildCountrySelect(select, sectionConfig.id, searchInput.value, selectedValues);
    });

    if (presetContainer) {
      presetContainer.addEventListener("click", event => {
        const button = event.target.closest("button[data-preset]");
        if (!button) return;
        applyPreset(sectionConfig, button.dataset.preset);
      });
    }
  }


  // Section initialization routines.
  function setupParameterSection(sectionConfig) {
    const countrySelect = document.getElementById(sectionConfig.selectCountryId);
    const seriesSelect = document.getElementById("parameterSeriesSelect");
    const canvas = document.getElementById(sectionConfig.canvasId);
    const statusElement = document.getElementById(sectionConfig.statusId);

    const update = async () => {
      const selectedCountry = countrySelect.value;
      const selectedSeries = getSelected(seriesSelect);

      if (!selectedCountry) {
        setStatus(statusElement, "Select a country to view parameter estimates.", "warning");
        return;
      }

      if (!selectedSeries.length) {
        setStatus(statusElement, "Select at least one display series.", "warning");
        return;
      }

      setStatus(statusElement, "Loading parameter table...", "warning");

      try {
        const rows = await fetchParameterData(`${sectionConfig.sourcePath}/${selectedCountry}`);
        renderParameterChart(canvas, rows, selectedSeries);
        setStatus(statusElement, `Showing ${rows.length} parameters with ${selectedSeries.length} selected series.`, "success");
      } catch (error) {
        setStatus(statusElement, `Error loading parameter chart: ${error.message}`, "error");
      }
    };

    countrySelect.addEventListener("change", update);
    seriesSelect.addEventListener("change", update);
    if (seriesSelect.multiple) enableClickToToggleMultiSelect(seriesSelect);
    setupCountryControls(sectionConfig, update);

    if (countrySelect.options.length && !countrySelect.value) {
      countrySelect.options[0].selected = true;
    }

    return update;
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
    if (countrySelect.multiple) enableClickToToggleMultiSelect(countrySelect);
    if (variableSelect.multiple) enableClickToToggleMultiSelect(variableSelect);

    downloadButton.addEventListener("click", () => downloadPNG(getChartInstance(canvas), `${sectionConfig.id}-chart`));
    exportButton.addEventListener("click", () => exportCSV(getChartInstance(canvas), `${sectionConfig.id}-chart-data`));
    resetButton.addEventListener("click", () => {
      const chart = getChartInstance(canvas);
      if (chart?.resetZoom) chart.resetZoom();
    });

    setupCountryControls(sectionConfig, update);

    if (!zoomPluginLoaded()) {
      setStatus(statusElement, "Chart zoom plugin unavailable (CDN load issue). Pan/zoom controls are disabled.", "warning");
    }

    return update;
  }


  function setupDecompositionSection(sectionConfig) {
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
        setStatus(statusElement, "Select at least one country and one decomposition variable.", "warning");
        return;
      }

      setStatus(statusElement, "Loading decomposition data...", "warning");

      try {
        const { labels, datasets } = await buildDecompositionDatasets(selectedCountries, selectedVariables, sectionConfig);
        if (!datasets.length || !labels.length) {
          setStatus(statusElement, "No usable decomposition data found for the selected filters.", "warning");
          return;
        }

        const axisLimits = getAxisLimitsForPercentChart(true, labels, datasets);
        renderDecompositionChart(canvas, datasets, labels, "Percent", axisLimits);
        setStatus(statusElement, `Showing ${selectedCountries.length} country(ies) and ${selectedVariables.length} decomposition(s).`, "success");
      } catch (error) {
        setStatus(statusElement, `Error loading decomposition chart data: ${error.message}`, "error");
      }
    };

    countrySelect.addEventListener("change", update);
    variableSelect.addEventListener("change", update);
    if (countrySelect.multiple) enableClickToToggleMultiSelect(countrySelect);

    downloadButton.addEventListener("click", () => downloadPNG(getChartInstance(canvas), `${sectionConfig.id}-chart`));
    exportButton.addEventListener("click", () => exportCSV(getChartInstance(canvas), `${sectionConfig.id}-chart-data`));
    resetButton.addEventListener("click", () => {
      const chart = getChartInstance(canvas);
      if (chart?.resetZoom) chart.resetZoom();
    });

    setupCountryControls(sectionConfig, update);

    if (!zoomPluginLoaded()) {
      setStatus(statusElement, "Chart zoom plugin unavailable (CDN load issue). Pan/zoom controls are disabled.", "warning");
    }

    return update;
  }


  // Tab activation and initial render pass.
  const updateEconomic = setupChartSection(economicConfig);
  const updateParameters = setupParameterSection(parameterConfig);
  const updateInterest = setupChartSection(interestConfig);
  const updateDecompositions = setupDecompositionSection(decompositionConfig);

  const tabButtons = Array.from(document.querySelectorAll(".tab-button"));

  const activateTab = target => {
    document.querySelectorAll(".tab-content").forEach(tab => {
      const isActive = tab.id === `tab-${target}`;
      tab.style.display = isActive ? "block" : "none";
      tab.setAttribute("aria-hidden", String(!isActive));
    });

    tabButtons.forEach(tabButton => {
      const isActive = tabButton.dataset.tab === target;
      tabButton.classList.toggle("active", isActive);
      tabButton.setAttribute("aria-selected", String(isActive));
      tabButton.tabIndex = isActive ? 0 : -1;
    });

    if (target === "economic") updateEconomic();
    if (target === "parameters") updateParameters();
    if (target === "interest") updateInterest();
    if (target === "decompositions") updateDecompositions();
  };

  tabButtons.forEach((button, index) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
    button.addEventListener("keydown", event => {
      if (!["ArrowRight", "ArrowLeft", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const nextIndex =
        event.key === "Home" ? 0 :
          event.key === "End" ? tabButtons.length - 1 :
            (index + (event.key === "ArrowRight" ? 1 : -1) + tabButtons.length) % tabButtons.length;
      tabButtons[nextIndex].focus();
      activateTab(tabButtons[nextIndex].dataset.tab);
    });
  });

  const initialTab = tabButtons.find(button => button.classList.contains("active"))?.dataset.tab || "economic";
  activateTab(initialTab);
});
