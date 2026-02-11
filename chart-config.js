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


function loadCSV(file, variable) {
  fetch('data/' + file)
    .then(response => response.text())
    .then(csv => {
      const rows = csv.split('\n').slice(1);
      const dates = [];
      const series1 = [];
      const series2 = [];

      rows.forEach(row => {
        const cols = row.split(',');
        if (cols.length >= 9) {
          const year = cols[1];
          const month = cols[2];
          const ii = parseFloat(cols[3]);
          const cpi = parseFloat(cols[4]);
          const cpiQoQ = parseFloat(cols[5]);
          const cpiYoY = parseFloat(cols[6]);
          const gdpQoQ = parseFloat(cols[7]);
          const gdpYoY = parseFloat(cols[8]);
          const formattedDate = year + "-" + String(month).padStart(2,'0');

          dates.push(formattedDate);

          if (variable === "ii Rate") series1.push(isNaN(ii)?null:ii);
          else if (variable === "CPI Level") series1.push(isNaN(cpi)?null:cpi);
          else if (variable === "CPI Change") {
            series1.push(isNaN(cpiQoQ)?null:cpiQoQ);
            series2.push(isNaN(cpiYoY)?null:cpiYoY);
          }
          else if (variable === "GDP Change") {
            series1.push(isNaN(gdpQoQ)?null:gdpQoQ);
            series2.push(isNaN(gdpYoY)?null:gdpYoY);
          }
        }
      });

      updateChart(dates, series1, series2, variable, file);
    })
    .catch(err => console.error("Error loading CSV:", err));
}


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

function populateDropdowns() {
  const countries = [
    { file: "bra_Data.csv", name: "Brazil" },
    { file: "chl_Data.csv", name: "Chile" },
    // add more countries here
  ];
  
  const variables = [
    { value: "ii Rate", label: "Nominal Interest Rate" },
    { value: "CPI Level", label: "Price Level" },
    { value: "CPI Change", label: "CPI Change" },
    { value: "GDP Change", label: "Real GDP Change" }
  ];
  
  const countrySelect = document.getElementById('countrySelect');
  const variableSelect = document.getElementById('variableSelect');
  
  countries.forEach(c => {
    const option = document.createElement('option');
    option.value = c.file;
    option.textContent = c.name;
    countrySelect.appendChild(option);
  });
  
  variables.forEach(v => {
    const option = document.createElement('option');
    option.value = v.value;
    option.textContent = v.label;
    variableSelect.appendChild(option);
  });
}

let chart; // global Chart.js instance

function updateChart(dates, series1, series2, variable, file) {
  if (chart) chart.destroy(); // destroy previous chart

  const datasets = [];

  if (series1.length) {
    datasets.push({
      label: (variable==="CPI Change" || variable==="GDP Change") ? "QoQ" : variable + " (" + file.replace('.csv','') + ")",
      data: series1,
      borderColor: 'blue',
      backgroundColor: 'rgba(0,0,255,0.1)',
      spanGaps: true
    });
  }

  if (series2.length) {
    datasets.push({
      label: "YoY",
      data: series2,
      borderColor: 'red',
      backgroundColor: 'rgba(255,0,0,0.1)',
      spanGaps: true
    });
  }

  chart = new Chart(document.getElementById('myChart'), {
    type: 'line',
    data: {
      labels: dates,
      datasets: datasets
    },
    options: {
      responsive: true,
      scales: {
        x: { 
          ticks: { maxTicksLimit: 12 },
          title: { display: true, text: 'Year-Month' }
        },
        y: { title: { display: true, text: variable } }
      }
    }
  });
}
