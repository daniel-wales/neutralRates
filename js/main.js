import { fetchData } from "./services/dataService.js";
import { renderChart, getColors, getChartInstance } from "./services/chartService.js";
import { downloadPNG, exportCSV } from "./services/exportService.js";
import { variableConfig } from "./config/variables.js";

document.addEventListener("DOMContentLoaded", () => {

  const countrySelect = document.getElementById("countrySelect");
  const variableSelect = document.getElementById("variableSelect");
  const downloadPNGBtn = document.getElementById("downloadPNG");
  const exportCSVBtn = document.getElementById("exportCSV");
  const ctx = document.getElementById("myChart");

  let lastRenderedData = null;

  function getMode() {
    return document.querySelector("input[name='mode']:checked").value;
  }

  function getSelected(select) {
    return Array.from(select.selectedOptions).map(o => o.value);
  }

  async function updateChart() {
    const mode = getMode();
    const selectedCountries = getSelected(countrySelect);
    const selectedVariables = getSelected(variableSelect);

    if (!selectedCountries.length || !selectedVariables.length) return;

    let datasets = [];
    let labels = [];
    let colorIndex = 0;

    if (mode === "countries") {
      const variable = selectedVariables[0];

      for (const file of selectedCountries) {
        const data = await fetchData(file);
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

    } else { // compare variables
      const file = selectedCountries[0];
      const data = await fetchData(file);
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

    const units = selectedVariables.map(v => variableConfig[v][0].unit);
    const uniqueUnits = [...new Set(units)];
    
    let yAxisLabel = "";
    
    if (uniqueUnits.length === 1) {
      // All selected variables share same unit
      yAxisLabel = variableConfig[selectedVariables[0]][0].yAxisLabel;
    } else {
      // Mixed units selected
      yAxisLabel = "Value";
    }
        
    renderChart(ctx, datasets, labels, yAxisLabel);
    lastRenderedData = { labels, datasets, yAxisLabel};
  }

  // Event listeners
  countrySelect.addEventListener("change", updateChart);
  variableSelect.addEventListener("change", updateChart);
  document.querySelectorAll("input[name='mode']")
          .forEach(r => r.addEventListener("change", updateChart));

  downloadPNGBtn.addEventListener("click", () => {
    downloadPNG(getChartInstance());
  });

  exportCSVBtn.addEventListener("click", () => {
    exportCSV(lastRenderedData);
  });

  // Initial render
  updateChart();
});

document.getElementById("resetZoom").addEventListener("click", () => {
  const chart = getChartInstance();
  if (chart) chart.resetZoom();
});
