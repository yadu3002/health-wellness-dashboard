// Global variables
let allLoadedData = []; 
let searchQuery = '';
let headerRow = null;
let chartInstances = {}; // Object to store all Chart.js instances by their canvas ID
let lastFilteredData = null; 
// --- NEW GLOBAL VARIABLE FOR DATE RANGE ---
let selectedDateRange = null;
let selectedLocation = 'ALL';

// --- NEW GLOBAL VARIABLES FOR FILTERING ---
let companyNames = new Set();
let selectedCompany = 'ALL'; // Default to show all companies

// --- Column Finder Helpers ---
// Change this at the top of adminpage.js
const findCol = (header, name) => header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
const findCols = (header, names) => names.map(name => findCol(header, name)).filter(i => i !== -1);

function openLoginPopup() {
    const url = 'loginpage2.html';
    const name = 'LoginWindow';
    // Window features: width, height, and disabling toolbars/location bar
    const features = 'width=550,height=700,toolbar=no,location=,status=no,menubar=no,scrollbars=yes,resizable=yes';
    window.open(url, name, features);
}


/**
 * Populates the data table with the filtered participant records.
 * @param {Array<Array<any>>} data - The filtered data array (including the header row).
 */
function populateDataTable(data) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;
    tableBody.innerHTML = ''; 

    const limit = 50;
    const displayData = data.slice(0, limit);

    displayData.forEach(row => {
        const tr = document.createElement('tr');
        // ... (your existing row creation logic) ...
        tableBody.appendChild(tr);
    });




    if (!data || data.length <= 1) {
        tableBody.innerHTML = '<tr><td colspan="14" style="text-align:center;">No data records found.</td></tr>';
        return;
    }

    const header = data[0];
    const rows = data.slice(1);

    

    // FIX: Enhanced Column Finder (Case-Insensitive & Flexible)
    const getCol = (name) => header.findIndex(h => h.toUpperCase().replace(/\s/g, '').includes(name.toUpperCase()));

    const colIdx = {
        ref: getCol('REFID'),
        emp: getCol('EMPID'),
        name: getCol('EMPNAME'),
        phone: getCol('PHONE'),
        dept: getCol('DEPART'),
        bmi: getCol('BMI'),
        bp1: getCol('BP1'), // Matches BP1 or Systolic BP1
        bp2: getCol('BP2'), // Matches BP2 or Diastolic BP2
        bs1: getCol('BS1'), // Matches BS1 or Fasting BS1
        bs2: getCol('BS2'), // Matches BS2 or Random BS2
        chol: getCol('CHOLESTEROL'),
        med: getCol('MEDICATION'),
        // Flag mapping based on your Excel sheet columns
        orgs: [getCol('ORG1'), getCol('ORG2'), getCol('ORG3')],
        habs: [getCol('HAB1'), getCol('HAB2')],
        exes: [getCol('EXE1'), getCol('EXE2'), getCol('EXE3')],
        strs: [getCol('STR1'), getCol('STR2'), getCol('STR3'), getCol('STR4')],
        dosc: getCol('DOSC')
    };

    rows.forEach(row => {
        const tr = tableBody.insertRow();

        let rawBMI = row[colIdx.bmi];
    let formattedBMI = '-';

    // 2. Check if the value exists and is a valid number
    if (rawBMI !== undefined && rawBMI !== null && rawBMI !== '') {
        let bmiNum = parseFloat(rawBMI);
    if (!isNaN(bmiNum)) {
        formattedBMI = bmiNum.toFixed(2);
    }
}
        
        // Populate Cells with Fallbacks
        tr.insertCell().textContent = row[colIdx.ref] || '-';
        tr.insertCell().textContent = row[colIdx.emp] || '-';
        tr.insertCell().textContent = row[colIdx.name] || '-';
        tr.insertCell().textContent = row[colIdx.phone] || '-';
        tr.insertCell().textContent = row[colIdx.dept] || '-';
        tr.insertCell().textContent = formattedBMI;
        
        
        // BP/BG Combined Logic
        const bp = (row[colIdx.bp1] && row[colIdx.bp2]) ? `${row[colIdx.bp1]}/${row[colIdx.bp2]}` : '-';
        const bs = (row[colIdx.bs1] || row[colIdx.bs2]) ? ` (${row[colIdx.bs1] || row[colIdx.bs2]})` : '';
        tr.insertCell().textContent = bp + bs;

        tr.insertCell().textContent = row[colIdx.chol] || '0';
        

        // Helper to generate Red/Green labels
        const createFlag = (cell, isIssue, labelIssue, labelNormal) => {
            const label = isIssue ? labelIssue : labelNormal;
            const className = isIssue ? 'flag-issue' : 'flag-normal';
            cell.innerHTML = `<span class="flag-indicator ${className}">${label}</span>`;
        };

        // 1. Medication
        createFlag(tr.insertCell(), row[colIdx.med] === 'Y', 'YES', 'NO');

        // 2. Cardiac Risk (If any ORG column is 'Y')
        const cardiacRisk = colIdx.orgs.some(i => row[i] === 'Y');
        createFlag(tr.insertCell(), cardiacRisk, 'HIGH', 'LOW');

        // 3. Health Habit (If any HAB column is 'N')
        const poorHabit = colIdx.habs.some(i => row[i] === 'N');
        createFlag(tr.insertCell(), poorHabit, 'POOR', 'GOOD');

        // 4. Fitness (If any EXE column is 'N')
        const lowFitness = colIdx.exes.some(i => row[i] === 'N');
        createFlag(tr.insertCell(), lowFitness, 'LOW', 'ACTIVE');

        // 5. Stress (If any STR column is 'Y')
        const highStress = colIdx.strs.some(i => row[i] === 'Y');
        createFlag(tr.insertCell(), highStress, 'HIGH', 'NORMAL');

        tr.insertCell().textContent = row[colIdx.dosc] || '-';

        // View Button
        const viewCell = tr.insertCell();
        viewCell.innerHTML = `<button class="view-button" onclick="alert('Viewing Report for ${row[colIdx.name]}')">View</button>`;
    });
}

// (6) Location Dropdown Population
function populateLocationDropdown(filteredData) {
    const select = document.getElementById('locationSelect');
    if (!select) return;

    const locIdx = findCol(headerRow, 'FACTORY'); // Or 'LOCATION' depending on your Excel
    const uniqueLocs = new Set();

    filteredData.forEach(row => {
        const val = String(row[locIdx] || '').trim();
        if (val) uniqueLocs.add(val);
    });

    const current = select.value;
    select.innerHTML = '<option value="ALL">ALL LOCATIONS</option>';
    Array.from(uniqueLocs).sort().forEach(loc => {
        const opt = document.createElement('option');
        opt.value = loc;
        opt.textContent = loc;
        select.appendChild(opt);
    });
    
    // Keep the selection if it's still valid, otherwise reset to ALL
    select.value = uniqueLocs.has(current) ? current : 'ALL';
}


// --- Placeholder for Dashboard Filter Update ---
function updateDashboardFilters() {
    console.log("Date range selected:", selectedDateRange);

}

// --- Chart Drawing Functions (No Change) ---


function drawChart(chartId, type, title, labels, data, colors,onClickHandler = null) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;

    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
    }
    
    ctx.style.display = 'block';

    const isPie = (type === 'pie' || type === 'doughnut');
    
    chartInstances[chartId] = new Chart(ctx, {
        type: type,
        plugins: [ChartDataLabels], // Enable the plugin globally for this chart instance
        data: {
            labels: labels,
            datasets: [{
                label: isPie ? title : 'Employee Count',
                data: data,
                backgroundColor: colors,
                borderColor: isPie ? 'white' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: isPie ? 2 : 1,
                // Configuration specific to the datalabels plugin
                datalabels: {
                    formatter: (value, context) => {
                        // Display the count and the percentage for pie/doughnut charts
                        if (isPie) {
                            let sum = 0;
                            let dataArr = context.chart.data.datasets[0].data;
                            dataArr.map(data => {
                                sum += data;
                            });
                            const percentage = (value * 100 / sum).toFixed(1) + '%';
                            return value.toLocaleString() + ' (' + percentage + ')';
                        }
                        return value.toLocaleString(); // Just the count for bar/other charts
                    },
                    color: '#000000', // Always black for better visibility outside
                    backgroundColor: '#ffffff', // White background
                    borderColor: '#94a3b8', // Light border
                    borderWidth: 1,
                    borderRadius: 4,
                    padding: 6,
                    font: {
                        weight: 'bold',
                        size: 11
                    },
                    anchor: 'end', // Place the anchor point at the end of the line
                    align: 'start', // Align the text box to the start of the line (outside the slice)
                    offset: 10, // Move 10 pixels away from the slice edge
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                // If the chart has an onClickHandler and a slice/bar was clicked
                if (onClickHandler && elements.length > 0) {
                    onClickHandler();
                }
            },
            onHover: (event, chartElement) => {
                // Change cursor to pointer if the chart is clickable
                if (onClickHandler) {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                }
            }, 
            plugins: {
                legend: { position: isPie ? 'right' : 'top' },
                title: { display: false },
                datalabels: { display: false } 
            },
            scales: isPie ? {} : {
                y: { beginAtZero: true, title: { display: true, text: 'Count' } },
                x: { ticks: { autoSkip: true, maxRotation: 0 } }
            }
        }
    });
}

// Dedicated renderer for the age-by-gender chart
function drawAgeChart(chartId, ageData, onClickHandler = null) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;

    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
    }

    ctx.style.display = 'block';

    chartInstances[chartId] = new Chart(ctx, {
        type: 'doughnut',
        plugins: [ChartDataLabels],
        data: {
            labels: ageData.labels,
            datasets: [
                {
                    label: 'Male',
                    data: ageData.male,
                    backgroundColor: ageData.labels.map(() => '#4e73df')
                },
                {
                    label: 'Female',
                    data: ageData.female,
                    backgroundColor: ageData.labels.map(() => '#fb7185')
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                if (onClickHandler && elements.length > 0) {
                    onClickHandler();
                }
            },
            onHover: (event, chartElement) => {
                if (onClickHandler) {
                    event.native.target.style.cursor = chartElement[0] ? 'pointer' : 'default';
                }
            },
            plugins: {
                legend: { position: 'right' },
                datalabels: { display: false } // Remove datalabels for cleaner display
            }
        }
    });
}


function clearChart(chartId, message = 'No data available.') {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
    const canvas = document.getElementById(chartId);
    if (canvas) {
        canvas.style.display = 'none';
        const container = canvas.closest('.chart-container');
        if (container) {
            let currentMessage = container.querySelector('.placeholder-message');
            if (!currentMessage) {
                currentMessage = document.createElement('div');
                currentMessage.className = 'placeholder-message text-center text-muted';
                currentMessage.style.paddingTop = '50px';
                container.appendChild(currentMessage);
            }
            currentMessage.textContent = message;
        }
    }
}

/**
 * Clears the placeholder message before drawing a new chart.
 */
function preDrawCleanup(chartId) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const container = canvas.closest('.chart-container');
        const message = container.querySelector('.placeholder-message');
        if (message) {
            message.remove();
        }
        canvas.style.display = 'block';
    }
}

// --- Dashboard Update Logic (No Change) ---

async function updateDashboardAndCharts(data) {
    
    const totalEmployees = data.length - 1; 
    const allChartIds = [
        'chartParticipants', 'chartChronic', 'chartHypertension', 
        'chartDiabetes', 'chartCholestrol','chartObesity', 'chartFitness', 
        'chartStress', 'chartMedication'
    ];

    // Update the stat card immediately
    const screenedEl = document.getElementById('numScreenedValue');
    if (screenedEl) {
        screenedEl.textContent = totalEmployees <= 0 ? '0' : totalEmployees.toLocaleString();
    }

    if (totalEmployees <= 0) {
        allChartIds.forEach(id => clearChart(id, 'No data available for the current filters.'));
        return;
    }
    lastFilteredData = data;
    
    // --- PRE-CALCULATION BLOCK (Runs quickly) ---
    const header = data[0].map(h => String(h || '').toLowerCase().trim());

    // --- ASYNCHRONOUS RENDERING BLOCK ---
    // This helper allows the browser to "breathe" so the search bar doesn't freeze
    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

    // Define all drawing tasks
    const tasks = [
        { id: 'chartParticipants', fn: () => {
            const d = calculateParticipantsData(data, header);
            if (d) { preDrawCleanup('chartParticipants'); drawAgeChart('chartParticipants', d, openAgePopup); }
            else { clearChart('chartParticipants', 'Age data missing.'); }
        }},
    
        { id: 'chartChronic', fn: () => {
            const d = calculateChronicData(data, header);
            if (d) { preDrawCleanup('chartChronic'); drawChart('chartChronic', 'pie', '', Object.keys(d), Object.values(d), ['#e74a3b', '#4e73df'], openPDetailsPopup); }
            else { clearChart('chartChronic', 'Data missing.'); }
        }},
        { id: 'chartHypertension', fn: () => {
            const d = calculateHypertensionData(data, header);
            if (d) { preDrawCleanup('chartHypertension'); drawChart('chartHypertension', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745'],openHypertensionPopup); }
            else { clearChart('chartHypertension', 'Data missing.'); }
        }},
        { id: 'chartDiabetes', fn: () => {
            const d = calculateDiabetesData(data, header);
            if (d) { preDrawCleanup('chartDiabetes'); drawChart('chartDiabetes', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745'],openDiabetesPopup); }
            else { clearChart('chartDiabetes', 'Data missing.'); }
        }},
        { id: 'chartCholestrol', fn: () => {
            const d = calculateDyslipidemiaData(data, header);
            if (d) { preDrawCleanup('chartCholestrol'); drawChart('chartCholestrol', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745'],openCholesterolPopup); }
            else { clearChart('chartCholestrol', 'Data missing.'); }
        }},
        { id: 'chartObesity', fn: () => {
            const d = calculateObesityData(data, header);
            if (d) { preDrawCleanup('chartObesity'); drawChart('chartObesity', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745'],openObesityPopup); }
            else { clearChart('chartObesity', 'Data missing.'); }
        }},
        { id: 'chartFitness', fn: () => {
            const d = calculateFitnessData(data, header);
            if (d) { preDrawCleanup('chartFitness'); drawChart('chartFitness', 'pie', '', Object.keys(d), Object.values(d), ['#28a745', '#dc3545'],openFitnessPopup); }
            else { clearChart('chartFitness', 'Data missing.'); }
        }},
        { id: 'chartStress', fn: () => {
            const d = calculateStressData(data, header);
            if (d) { preDrawCleanup('chartStress'); drawChart('chartStress', 'pie', '', Object.keys(d), Object.values(d), ['#28a745', '#dc3545'],openStressHabitsPopup); }
            else { clearChart('chartStress', 'Data missing.'); }
        }},
        { id: 'chartMedication', fn: () => {
    const d = calculateMedicationData(data, header);
    if (d) { 
        preDrawCleanup('chartMedication'); 
        // We pass openPDetailsPopup as the final argument here
        drawChart('chartMedication', 'pie', '', Object.keys(d), Object.values(d), ['#4e73df', '#1cc88a'],openChronicMedicationPopup);
    }
    else { clearChart('chartMedication', 'No medication data.'); }
}},
    ];

    // Execute each chart render one by one, allowing UI updates in between
    for (const task of tasks) {
        await yieldToBrowser(); 
        task.fn();
    }
}

function renderChart(canvasId, config) {
    // 1. Find the canvas
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    // 2. Kill the old chart if it exists
    if (chartInstances[canvasId]) {
        chartInstances[canvasId].destroy();
    }

    // 3. Create the new one
    chartInstances[canvasId] = new Chart(canvas.getContext('2d'), config);
}

// --- NEW FUNCTION: Populate the Company Dropdown ---
function populateDropdowns() {
    const companySelect = document.getElementById('companySelect');
    if (!companySelect) return;

    // Clear existing options, but keep the "All Companies" option
    companySelect.innerHTML = '<option value="ALL">All Companies</option>';

    // Add new company options
    const sortedCompanies = Array.from(companyNames).sort();
    sortedCompanies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companySelect.appendChild(option);
    });

    // Restore the previously selected value, or default to ALL
    if (selectedCompany === 'ALL' || !companyNames.has(selectedCompany)) {
        selectedCompany = 'ALL';
    }
    companySelect.value = selectedCompany;
}



// Updated generateUserReport to enforce BOTH dates and handle Excel date formats


/**
 * Filter helper that uses your existing parseDateStr to handle DD.MM.YYYY
 */
function filterDataBySpecificRange(rangeStr) {
    if (!headerRow || !allLoadedData.length) return [headerRow];

    // Reuse your existing date parser from adminpage.js
    const parseDateStr = (str) => {
        if (!str) return null;
        const parts = str.split('.');
        if (parts.length !== 3) return null;
        return new Date(parts[2], parts[1] - 1, parts[0]);
    };

    let startDate, endDate;
    if (rangeStr.includes(" to ")) {
        const parts = rangeStr.split(" to ");
        // Flatpickr date is often D.M.Y, convert to Date Objects
        const sParts = parts[0].split('.');
        const eParts = parts[1].split('.');
        startDate = new Date(sParts[2], sParts[1]-1, sParts[0]);
        endDate = new Date(eParts[2], eParts[1]-1, eParts[0]);
    } else {
        const p = rangeStr.split('.');
        startDate = endDate = new Date(p[2], p[1]-1, p[0]);
    }

    const doscIdx = headerRow.findIndex(h => String(h || '').toUpperCase().includes('DOSC'));
    let combined = [headerRow];

    allLoadedData.forEach(obj => {
        // Handle both simple arrays or your object structure {data: [...]}
        const rows = obj.data ? obj.data.slice(1) : obj.slice(1);
        
        rows.forEach(row => {
            const rowDateRaw = String(row[doscIdx] || '').trim();
            const rowDateObj = parseDateStr(rowDateRaw);

            if (rowDateObj) {
                rowDateObj.setHours(0,0,0,0);
                startDate.setHours(0,0,0,0);
                endDate.setHours(0,0,0,0);

                if (rowDateObj >= startDate && rowDateObj <= endDate) {
                    combined.push(row);
                }
            }
        });
    });

    return combined;
}

/**
 * Popup helper using Blob to avoid SecurityErrors
 */
/**
 * Updated Popup helper using Blob to avoid SecurityErrors
 * Includes a "Print to PDF" button and PDF-optimized styling.
 */
/**
 * Updated Popup helper with Column Filtering and PDF/Print Button
 */
function openDataGridPopup(data, rangeText) {
    const popupWidth = 1200;
    const popupHeight = 700;
    const left = (screen.width / 2) - (popupWidth / 2);
    const top = (screen.height / 2) - (popupHeight / 2);

    if (!data || data.length <= 1) return;

    const header = data[0];
    const rows = data.slice(1);

    // 1. REUSE YOUR EXACT COLUMN FINDER LOGIC
    const getCol = (name) => header.findIndex(h => h.toUpperCase().replace(/\s/g, '').includes(name.toUpperCase()));
    const colIdx = {
        ref: getCol('REFID'), emp: getCol('EMPID'), name: getCol('EMPNAME'), phone: getCol('PHONE'),
        dept: getCol('DEPART'), bmi: getCol('BMI'), bp1: getCol('BP1'), bp2: getCol('BP2'),
        bs1: getCol('BS1'), bs2: getCol('BS2'), chol: getCol('CHOLESTEROL'), med: getCol('MEDICATION'),
        orgs: [getCol('ORG1'), getCol('ORG2'), getCol('ORG3')],
        habs: [getCol('HAB1'), getCol('HAB2')],
        exes: [getCol('EXE1'), getCol('EXE2'), getCol('EXE3')],
        strs: [getCol('STR1'), getCol('STR2'), getCol('STR3'), getCol('STR4')],
        dosc: getCol('DOSC')
    };

    // 2. HELPER FOR FLAGS (Directly copied from your style logic)
    const getFlagHtml = (isIssue, labelIssue, labelNormal) => {
        const label = isIssue ? labelIssue : labelNormal;
        const className = isIssue ? 'flag-issue' : 'flag-normal';
        return `<td><span class="flag-indicator ${className}">${label}</span></td>`;
    };

    // 3. GENERATE ROWS USING YOUR LOGIC
    const tableRows = rows.map(row => {
        // BMI Logic
        let rawBMI = row[colIdx.bmi];
        let formattedBMI = '-';
        if (rawBMI !== undefined && rawBMI !== null && rawBMI !== '') {
            let bmiNum = parseFloat(rawBMI);
            if (!isNaN(bmiNum)) formattedBMI = bmiNum.toFixed(2);
        }

        // BP/BG Combined Logic
        const bp = (row[colIdx.bp1] && row[colIdx.bp2]) ? `${row[colIdx.bp1]}/${row[colIdx.bp2]}` : '-';
        const bs = (row[colIdx.bs1] || row[colIdx.bs2]) ? ` (${row[colIdx.bs1] || row[colIdx.bs2]})` : '';
        const bpBg = bp + bs;

        return `
            <tr>
                <td>${row[colIdx.ref] || '-'}</td>
                <td>${row[colIdx.emp] || '-'}</td>
                <td>${row[colIdx.name] || '-'}</td>
                <td>${row[colIdx.phone] || '-'}</td>
                <td>${row[colIdx.dept] || '-'}</td>
                <td>${formattedBMI}</td>
                <td>${bpBg}</td>
                <td>${row[colIdx.chol] || '0'}</td>
                ${getFlagHtml(row[colIdx.med] === 'Y', 'YES', 'NO')}
                ${getFlagHtml(colIdx.orgs.some(i => row[i] === 'Y'), 'HIGH', 'LOW')}
                ${getFlagHtml(colIdx.habs.some(i => row[i] === 'N'), 'POOR', 'GOOD')}
                ${getFlagHtml(colIdx.exes.some(i => row[i] === 'N'), 'LOW', 'ACTIVE')}
                ${getFlagHtml(colIdx.strs.some(i => row[i] === 'Y'), 'HIGH', 'NORMAL')}
                <td>${row[colIdx.dosc] || '-'}</td>
            </tr>`;
    }).join('');

    // 4. GENERATE THE FINAL HTML WITH THE "WAY BETTER" CSS
    const tableHtml = `
        <html>
        <head>
            <title>User Report Preview - ${rangeText}</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 20px; color: #333; }
                .no-print { 
                    display: flex; justify-content: space-between; align-items: center; 
                    background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;
                    margin-bottom: 20px;
                }
                .btn-pdf {
                    background: #e11d48; color: white; border: none; padding: 10px 20px;
                    border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px;
                }
                .btn-pdf:hover { background: #be123c; }
                
                table { border-collapse: collapse; width: 100%; font-size: 10px; }
                th { background: #2563eb; color: white; padding: 12px 8px; text-align: left; position: sticky; top: 0; }
                td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
                tr:nth-child(even) { background: #f9fafb; }
                
                /* Flag styling to match your dashboard */
                .flag-indicator { padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 9px; display: inline-block; text-align: center; min-width: 45px; }
                .flag-issue { background: #fee2e2; color: #991b1b; }
                .flag-normal { background: #dcfce7; color: #166534; }

                @media print {
                    .no-print { display: none !important; }
                    th { background-color: #2563eb !important; -webkit-print-color-adjust: exact; }
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="no-print">
                <div>
                    <h2 style="margin:0; color: #1e40af;">User Report: Data Preview</h2>
                    <p style="margin:5px 0 0 0;">Range: ${rangeText} | Records: ${rows.length}</p>
                </div>
                <button class="btn-pdf" onclick="window.print()">Download as PDF</button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Ref ID</th><th>Emp ID</th><th>Name</th><th>Mobile</th><th>Depart</th>
                        <th>BMI</th><th>BP/BG</th><th>Cholestrol</th><th>Medication</th>
                        <th>Cardiac</th><th>Habit</th><th>Fitness</th><th>Stress</th><th>DOSC</th>
                    </tr>
                </thead>
                <tbody>${tableRows}</tbody>
            </table>
        </body>
        </html>
    `;

    const blob = new Blob([tableHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "ReportDataGrid", `width=${popupWidth},height=${popupHeight},left=${left},top=${top},scrollbars=yes,resizable=yes`);
}

// Ensure the listener is attached after the page is ready
document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('generateUserReportBtn');
    if (btn) {
        btn.addEventListener('click', (event) => { 
            event.preventDefault(); // Prevent default form submission if any
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'adminpage.js:generateUserReportBtnClick',message:'Group Profile button clicked',data:{hasHeaderRowOnWindow:!!window.headerRow},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log
            generateUserReport(window.headerRow); // Pass headerRow here
        });
    } else {
        console.error("Could not find button with ID 'generateUserReportBtn'");
    }
});

async function generateWordFileOnServer(count, s_date, e_date, data) {
    try {
        const response = await fetch('/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ count, s_date, e_date, data })
        });

        if (!response.ok) throw new Error("Server Error - check payload size");

        const docBlob = await response.blob();
        const docUrl = window.URL.createObjectURL(docBlob);
        const a = document.createElement('a');
        a.href = docUrl;
        a.download = `Group_Profile_Report_${s_date}.docx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(docUrl);
    } catch (err) {
        console.error(err);
        alert("The Word Doc could not be generated. Check if the server body-parser limit is increased.");
    }
}


// --- MODIFIED FUNCTION: Apply Dynamic Filter ---
function filterData(ignoreLocation = false) {
    if (!headerRow) return [];
    let combined = [headerRow];
    
    // Find column indices
    const compIdx = headerRow.findIndex(h => String(h || '').toUpperCase().includes('COMPANY'));
    const locIdx = headerRow.findIndex(h => String(h || '').toUpperCase().includes('FACTORY'));
    const doscIdx = headerRow.findIndex(h => String(h || '').toUpperCase().includes('DOSC'));

    const refIdx = headerRow.findIndex(h => String(h||'').toUpperCase().includes('REFID'));
    const empIdx = headerRow.findIndex(h => String(h||'').toUpperCase().includes('EMPID'));
    const nameIdx = headerRow.findIndex(h => String(h||'').toUpperCase().includes('EMPNAME'));
    const phoneIdx = headerRow.findIndex(h => String(h||'').toUpperCase().includes('PHONE'));

    // --- NEW: Date Parsing Helper ---
    // Converts "DD.MM.YYYY" string from Excel into a comparable Date object
    const parseDateStr = (str) => {
        if (!str) return null;
        const parts = str.split('.');
        if (parts.length !== 3) return null;
        return new Date(parts[2], parts[1] - 1, parts[0]);
    };
    
    allLoadedData.forEach(obj => {
        obj.data.slice(1).forEach(row => {
            const rowComp = String(row[compIdx] || '').toUpperCase().trim();
            const rowLoc = String(row[locIdx] || '').trim();
            const rowDateRaw = String(row[doscIdx] || '').trim(); // "DD.MM.YYYY"
            
            const compMatch = (selectedCompany === 'ALL' || rowComp === selectedCompany);
            const locMatch = ignoreLocation || (selectedLocation === 'ALL' || rowLoc === selectedLocation);
            
            // --- UPDATED: Range Filtering Logic ---
            let dateMatch = true;
            if (selectedDateRange) {
                const rowDateObj = parseDateStr(rowDateRaw);

                if (selectedDateRange.includes(" to ")) {
                    // It's a range: "01.01.2025 to 07.01.2025"
                    const [startStr, endStr] = selectedDateRange.split(" to ");
                    const startDate = parseDateStr(startStr);
                    const endDate = parseDateStr(endStr);
                    
                    dateMatch = rowDateObj && rowDateObj >= startDate && rowDateObj <= endDate;
                } else {
                    // It's a single date
                    dateMatch = (rowDateRaw === selectedDateRange);
                }
            }
            
            let searchMatch = true;
            if (searchQuery) {
                const valRef = String(row[refIdx] || '').toLowerCase();
                const valEmp = String(row[empIdx] || '').toLowerCase();
                const valName = String(row[nameIdx] || '').toLowerCase();
                const valPhone = String(row[phoneIdx] || '').toLowerCase();
                
                searchMatch = valRef.includes(searchQuery) || 
                              valEmp.includes(searchQuery) || 
                              valName.includes(searchQuery) || 
                              valPhone.includes(searchQuery);
            }

            if (compMatch && locMatch && searchMatch && dateMatch) {
                combined.push(row);
            }
        });
    });
    return combined;
}
 async function handleFilterChange() {
    if (!allLoadedData || allLoadedData.length === 0) return;

    const fullData = allLoadedData[0].data;
    const header = allLoadedData[0].header;
    

    // --- NEW: Populate Company List if it's empty ---
    if (companyNames.size === 0) {
        const cIdx = findCol(header, 'COMPANY');
        if (cIdx !== -1) {
            fullData.slice(1).forEach(row => {
                const val = String(row[cIdx] || '').trim();
                if (val) companyNames.add(val);
            });
            populateCompanyDropdown(); // Call the specific company populator
        }
    }

    

    // Step 1: Filter raw data by Company & Date ONLY to see available locations
    const companyDateFiltered = filterData(true); 
    
    // Step 2: Update the Location Dropdown based on those results
    populateLocationDropdown(companyDateFiltered);

    // Step 3: Apply FINAL filter (Company + Date + Location + Search)
    lastFilteredData = filterData(false); 
    
    // Step 4: Refresh UI
    setTimeout(() => {
        updateDashboardAndCharts(lastFilteredData);
    }, 0);
    setTimeout(() => {
        populateDataTable(lastFilteredData);
    }, 50);

    

}

// --- File Upload Logic (MODIFIED) ---
function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    allLoadedData = []; 
    companyNames.clear(); // Clear company names list on new upload
    
    const processFile = (file) => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
                // XLSX is assumed to be available globally
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

                if (jsonData.length <= 1) return resolve();

                const fileHeader = jsonData[0].map(h => String(h || '').toLowerCase().trim());
                const companyCol = fileHeader.findIndex(h => h.includes('company'));
                
                let inferredCompany = 'UNKNOWN';
                if (jsonData.length > 1 && companyCol !== -1) {
                    inferredCompany = (jsonData[1][companyCol] || 'UNKNOWN').toString().toUpperCase().trim();
                }
                
                let inferredYear = 'UNKNOWN';
                const match = file.name.match(/(\d{4})/);
                if (match) { inferredYear = match[0]; }
                
                allLoadedData.push({ data: jsonData, header: fileHeader, company: inferredCompany, year: inferredYear });
                resolve();
            };
            reader.readAsArrayBuffer(file);
        });
    };

    Promise.all(Array.from(files).map(processFile))
        .then(() => {
            if (allLoadedData.length === 0) {
                alert('No valid data found in the uploaded files.');
                handleFilterChange();
                return;
            }

            headerRow = allLoadedData[0].header;
            
            // **NEW: Collect all unique company names**
            const companyColIndex = headerRow.findIndex(h => h.includes('company'));
            if (companyColIndex !== -1) {
                 allLoadedData.forEach(dataObj => {
                    dataObj.data.slice(1).forEach(row => {
                        const company = (row[companyColIndex] || '').toString().toUpperCase().trim();
                        if (company.length > 0 && company !== 'UNKNOWN') {
                            companyNames.add(company);
                        }
                    });
                });
            }

            // **NEW: Populate the dropdown**
            populateDropdowns();
            
            handleFilterChange();
        });
}




function populateCompanyDropdown() {
    const select = document.getElementById('companySelect');
    if (!select) return;
    select.innerHTML = '<option value="ALL">ALL COMPANIES</option>';
    Array.from(companyNames).sort().forEach(name => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    });
    const numCompaniesEl = document.getElementById('numCompaniesValue');
    if (numCompaniesEl) {
        numCompaniesEl.textContent = companyNames.size.toLocaleString();
    }
}

function transformToExcelStyle(json) {
    if (json.length === 0) return [];
    const headers = Object.keys(json[0]);
    const rows = json.map(obj => headers.map(header => obj[header]));
    return [headers, ...rows];
}



document.addEventListener('DOMContentLoaded', async function () {

    const data = await loadWellnessData();
    
    if (data && data.length > 0) {
        // 2. Set the global variables your existing charts need
        headerRow = data[0]; 
        allLoadedData = [{ data: data, header: headerRow }];
        
        // 3. Kick off your existing dashboard logic
        populateDropdowns(); 
        handleFilterChange(); 
        
        console.log("Dashboard populated automatically!");
    } else {
        alert("No data found on the server.");
    }

fetch('/get-my-data')
        .then(response => response.json())
        .then(data => {
            console.log("Data received automatically!", data);
            
            // Set the global variables your charts use
            headerRow = data[0]; 
            allLoadedData = [{ data: data, header: headerRow }];
            
            // Run your existing logic to fill the dashboard
            populateDropdowns(); 
            handleFilterChange(); 
            document.getElementById('loadingOverlay').style.display = 'none';
        })
        
        .catch(err => {
            console.error("Server error:", err);
            alert("Could not connect to the server. Make sure 'node server.js' is running!");

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'adminpage.js:/get-my-data.catch',message:'get-my-data failed',data:{error:String(err)},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log
        });


    // 1. Initial date and stat setup
    const dateElement = document.getElementById('currentDate');
    const currentYearDisplay = document.getElementById('currentYearDisplay');
    const today = new Date();

    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('en-GB', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        });
    }
    
    // Set the current year display
    if (currentYearDisplay) {
        currentYearDisplay.textContent = '2025'; 
    }
    

    // 3. Date Range Picker (Flatpickr)
const datePickerInput = document.getElementById('dosDateRangePicker');
if (datePickerInput) {
    flatpickr(datePickerInput, {
        mode: "range", // Changed from "single"
        dateFormat: "d.m.Y",
        onClose: function(selectedDates, dateStr) {
            // Only update and filter if a single date OR a full range is selected
            if (selectedDates.length > 0) {
                selectedDateRange = dateStr; 
                handleFilterChange();
            }
        }
    });


    // Master Clear All Filters Button
    const clearAllBtn = document.getElementById('clearAllFilters');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', () => {
            // Reset all global variables
            selectedDateRange = null;
            selectedCompany = 'ALL';
            selectedLocation = 'ALL';
            searchQuery = '';

            // Clear all input fields
            const dateInput = document.getElementById('dosDateRangePicker');
            const monthPickerInput = document.getElementById('monthPicker');
            const groupProfileInput = document.getElementById('groupProfile');
            const employeeSearch = document.getElementById('employeeSearch');
            const departmentInput = document.getElementById('departmentInput');
            const companySelect = document.getElementById('companySelect');
            const locationSelect = document.getElementById('locationSelect');

            // Clear date inputs
            if (dateInput) {
                dateInput.value = '';
                if (dateInput._flatpickr) dateInput._flatpickr.clear();
            }
            if (monthPickerInput) {
                monthPickerInput.value = '';
                if (monthPickerInput._flatpickr) monthPickerInput._flatpickr.clear();
            }
            if (groupProfileInput) {
                groupProfileInput.value = '';
                if (groupProfileInput._flatpickr) groupProfileInput._flatpickr.clear();
            }

            // Clear text inputs
            if (employeeSearch) employeeSearch.value = '';
            if (departmentInput) departmentInput.value = '';

            // Reset dropdowns to default values
            if (companySelect) companySelect.value = 'ALL';
            if (locationSelect) locationSelect.value = 'ALL';

            // Trigger the filter refresh
            handleFilterChange();
        });
    }



    const generateReportInput = document.getElementById('groupProfile');
    if (generateReportInput) {
        flatpickr(generateReportInput, {
            mode: "range", // Set to range mode
            dateFormat: "d.m.Y",
            onClose: function(selectedDates, dateStr) {
            if (selectedDates.length > 0) {
                selectedDateRange = dateStr; 
            }
        }
        });
    }



let selectedUserReportDate = null; // Use a dedicated variable or share selectedDateRange

const monthPickerInput = document.getElementById('monthPicker');
if (monthPickerInput) {
    // We destroy the old month-only picker and create a date range picker
    flatpickr(monthPickerInput, {
        mode: "range", 
        dateFormat: "d.m.Y",
        onClose: function(selectedDates, dateStr) {
            if (selectedDates.length > 0) {
                // To keep them synced, we update the same global variable
                selectedDateRange = dateStr; 
            }
        }
    });
}


    // 4. Company Dropdown
    const companySelect = document.getElementById('companySelect');
    if (companySelect) {
        companySelect.addEventListener('change', (event) => {
            selectedCompany = event.target.value;
            selectedLocation = 'ALL'; // Reset location on company change
            handleFilterChange(); 
        });
    }
    
    // 5. Location Dropdown
    const locationSelect = document.getElementById('locationSelect');
    if (locationSelect) {
        locationSelect.addEventListener('change', (event) => {
            selectedLocation = event.target.value;
            handleFilterChange();
        });
    }

    // Search Function
    let searchTimeout;
    const employeeSearch = document.getElementById('employeeSearch');
    if (employeeSearch) {
            employeeSearch.addEventListener('input', (e) => {
                searchQuery = e.target.value.toLowerCase().trim();
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    handleFilterChange();
             }, 300)
    });
}
    
    
    // 6. Initial Stats & Chart Placeholders
    const numCompaniesValue = document.getElementById('numCompaniesValue');
    const numScreenedValue = document.getElementById('numScreenedValue');

    if (numCompaniesValue) numCompaniesValue.textContent = '0';
    if (numScreenedValue) numScreenedValue.textContent = '0';
    
    const allChartIds = [
        'chartParticipants','chartChronic', 'chartHypertension', 
        'chartDiabetes', 'chartCholestrol','chartObesity', 'chartFitness', 
        'chartStress', 'chartMedication'
    ];
    
    allChartIds.forEach(id => {
        if (typeof clearChart === "function") {
            clearChart(id, 'Upload data to begin analysis.');
        }
    });

    const savedName = localStorage.getItem('adminName');
    const nameDisplayElement = document.getElementById('adminDisplayName');

    // 2. If a name exists, show it; otherwise default to "Admin"
    if (nameDisplayElement) {
        nameDisplayElement.textContent = (savedUsername && savedUsername.trim())
            ? savedUsername.trim()
            : (savedName && savedName.trim()) ? savedName.trim() : "Admin";
    }

}});

window.addEventListener('load', async () => {
    // This calls the server's "cached" data, so it won't lag the login transition
    const data = await loadWellnessData();
    
    if (data) {
        allLoadedData = data;
        headerRow = data[0];
        
        // Populate the table and charts immediately
        handleFilterChange(); 
        console.log("Admin page populated instantly from server cache.");
    }});