// =======================
// 1. Setup dropdowns
// =======================

// Populate country and variable dropdowns
function populateDropdowns() { ... }

// =======================
// 2. CSV loader
// =======================
function loadCSV(file, variable) { ... }

// =======================
// 3. Chart updater
// =======================
function updateChart(dates, datasets, variable) { ... }

// =======================
// 4. Event listeners
// =======================
document.getElementById('countrySelect').addEventListener('change', handleChange);
document.getElementById('variableSelect').addEventListener('change', handleChange);

function initChart() {
  populateDropdowns();

  // Initial chart
  loadCSV('bra_Data.csv', 'ii Rate');

  // Event listeners
  document.getElementById('countrySelect').addEventListener('change', handleChange);
  document.getElementById('variableSelect').addEventListener('change', handleChange);
}

// Call initChart on page load
initChart();

function handleChange() {
  const file = document.getElementById('countrySelect').value;
  const variable = document.getElementById('variableSelect').value;
  loadCSV(file, variable);
}
