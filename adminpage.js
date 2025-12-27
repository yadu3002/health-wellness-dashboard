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

// --- Data Categorization Functions (No Change) ---

// (1) Participants - NEW DEDICATED LOGIC (For chartParticipants)
function calculateParticipantsData(data) {
    const total = data.length - 1;
    if (total <= 0) return null;
    return { 'Participants': total };
}

// (2) Calculates Obesity (BMI) - UPDATED LOGIC (Yes/No based on BMI >= 30)
function calculateObesityData(data, header) {
    let bmiCol = findCol(header, 'bmi');
    if (bmiCol === -1) { bmiCol = findCol(header, 'number'); } 
    if (bmiCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 }; 
    for (let i = 1; i < data.length; i++) {
        const bmiValue = parseFloat(data[i][bmiCol]);
        if (isNaN(bmiValue)) continue;

        if (bmiValue >= 30.0) { // BMI >= 30 is Obesity
            counts['Yes']++; 
        } else { 
            counts['No']++; 
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (3) Calculates Diabetes - UPDATED LOGIC (Yes/No based on BS thresholds)
function calculateDiabetesData(data, header) {
    const fbsCol = findCol(header, 'bs1');
    const rbsCol = findCol(header, 'bs2');
    if (fbsCol === -1 && rbsCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };
    
    for (let i = 1; i < data.length; i++) {
        let isDiabetic = false;
        let hasData = false;
        
        const fbsValue = parseFloat(data[i][fbsCol]);
        if (!isNaN(fbsValue)) {
            hasData = true;
            if (fbsValue >= 112) { // FBS > 111 (>= 112)
                isDiabetic = true;
            }
        }

        const rbsValue = parseFloat(data[i][rbsCol]);
        if (!isNaN(rbsValue)) {
            hasData = true;
            if (rbsValue >= 202) { // RBS > 201 (>= 202)
                isDiabetic = true;
            }
        }

        if (isDiabetic) {
            counts['Yes']++;
        } else if (hasData) {
            counts['No']++;
        }
        // Skip if neither FBS nor RBS data exists for the row
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

function calculateFitnessData(data, header) {
    const exeCols = findCols(header, ['exe1', 'exe2', 'exe3']);
    if (exeCols.length === 0) return null;

    // Change: Counts now represent the total number of 'Yes' and 'No' responses across all exercise columns.
    const counts = { 'Yes': 0, 'No': 0 }; 

    for (let i = 1; i < data.length; i++) {
        for (const colIndex of exeCols) {
            const value = (data[i][colIndex] || '').toString().toUpperCase().trim();

            if (value.startsWith('Y')) {
                counts['Yes']++;
            } else if (value.startsWith('N')) { 
                counts['No']++;
            }
        }
    }

    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// **MODIFIED LOGIC: Count total 'Y's and 'N's across STR1, STR2, STR3, STR4**
function calculateStressData(data, header) {
    const strCols = findCols(header, ['str1', 'str2', 'str3', 'str4']);
    const str4ColIndex = findCol(header, 'str4');
    if (strCols.length === 0) return null;

    // Change: Counts now represent the total number of 'Yes' and 'No' responses across all stress columns.
    const counts = { 'Yes': 0, 'No': 0 }; 

    for (let i = 1; i < data.length; i++) {
        for (const colIndex of strCols) {
            const value = (data[i][colIndex] || '').toString().toUpperCase().trim();

            if (colIndex === str4ColIndex) {
                // REVERSED LOGIC FOR STR4
                if (value.startsWith('Y')) {
                    // Y in STR4 means 'No' Stress
                    counts['No']++; 
                } else if (value.startsWith('N')) { 
                    // N in STR4 means 'Yes' Stress
                    counts['Yes']++;
                }
            } else {
                // NORMAL LOGIC for STR1, STR2, STR3
                if (value.startsWith('Y')) {
                    // Y means 'Yes' Stress
                    counts['Yes']++;
                } else if (value.startsWith('N')) { 
                    // N means 'No' Stress
                    counts['No']++;
                }
            }
        }
    }

    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}
    
// (5) Hypertension - UPDATED LOGIC (Yes/No based on BP thresholds)
function calculateHypertensionData(data, header) {
    const bp1Col = findCol(header, 'bp1');
    const bp2Col = findCol(header, 'bp2');
    if (bp1Col === -1 || bp2Col === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };
    
    for (let i = 1; i < data.length; i++) {
        const bp1 = parseInt(data[i][bp1Col]);
        const bp2 = parseInt(data[i][bp2Col]);
        
        if (isNaN(bp1) || isNaN(bp2)) continue;

        if (bp1 >= 142 || bp2 >= 91) { // BP1 > 141 (>= 142) OR BP2 > 90 (>= 91)
            counts['Yes']++;
        } else {
            counts['No']++;
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (6) Chronic Disease Status - NEW DEDICATED LOGIC (Based on MED_DETAILS content)
function calculateChronicData(data, header) {
    const medDetailsCol = findCol(header, 'med_details');
    if (medDetailsCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };
    for (let i = 1; i < data.length; i++) {
        const value = (data[i][medDetailsCol] || '').toString().toUpperCase().trim();
        
        if (value.length > 0 && value !== 'NONE' && value !== 'N/A' && value !== 'N') {
            counts['Yes']++;
        } else if (value.length > 0) {
             counts['No']++; 
        }
        // Skip if the cell is completely empty (no data points)
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (7) Chronic Medication Status - NEW DEDICATED LOGIC (Based on MEDICATION column Y/N)
function calculateMedicationData(data, header) {
    const medicationCol = findCol(header, 'medication');
    if (medicationCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 }; 
    for (let i = 1; i < data.length; i++) {
        const value = (data[i][medicationCol] || '').toString().toUpperCase().trim();

        if (value.startsWith('Y')) { 
            counts['Yes']++; 
        } else if (value.startsWith('N')) { 
            counts['No']++; 
        }
        // Skip if value is empty or anything else
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (8) Dyslipidemia - NEW DEDICATED LOGIC (For chartCholestrol)
function calculateDyslipidemiaData(data, header) {
    // Look for the user-specified column: 'CHOLESTEROL'
    const cholCol = findCol(header, 'cholesterol');
    
    // Fallback logic to check other cholesterol column names if 'CHOLESTEROL' is missing
    const genericCholCol = findCol(header, 'chol');

    if (cholCol === -1 && genericCholCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 }; // Yes: Dyslipidemia/High Chol
    
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Prioritize the specific 'CHOLESTEROL' column if it exists
        let cholValue = NaN;
        if (cholCol !== -1) {
            cholValue = parseFloat(row[cholCol]);
        } else if (genericCholCol !== -1) {
            // Fallback to 'chol' if 'cholesterol' is not found
            cholValue = parseFloat(row[genericCholCol]);
        }

        if (isNaN(cholValue)) continue;
        
        // User-defined rule: above 220 is 'Yes' (High Cholesterol)
        if (cholValue > 220) { 
            counts['Yes']++;
        } else {
            counts['No']++;
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}   


/**
 * Populates the data table with the filtered participant records.
 * @param {Array<Array<any>>} data - The filtered data array (including the header row).
 */

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
        formattedBMI = bmiNum.toFixed(2); // Rounds to 2 decimal places
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
    // When you implement filtering, this function will contain the logic
    // to filter your data based on the selectedDateRange.
}

// --- Chart Drawing Functions (No Change) ---

/**
 * Draws or updates any chart.
 */
function drawChart(chartId, type, title, labels, data, colors) {
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

/**
 * Clears a chart and hides the canvas, replacing it with a message.
 */
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
        'chartParticipants','chartGender', 'chartChronic', 'chartHypertension', 
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
    
    // --- PRE-CALCULATION BLOCK (Runs quickly) ---
    const header = data[0].map(h => String(h || '').toLowerCase().trim());
    const genderCol = findCol(header, 'gender');
    let genderData = { Male: 0, Female: 0 };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        if (genderCol !== -1) {
            const gender = (row[genderCol] || '').toString().toLowerCase();
            if (gender.startsWith('m')) genderData.Male++;
            else if (gender.startsWith('f')) genderData.Female++;
        }
    }

    // --- ASYNCHRONOUS RENDERING BLOCK ---
    // This helper allows the browser to "breathe" so the search bar doesn't freeze
    const yieldToBrowser = () => new Promise(resolve => setTimeout(resolve, 0));

    // Define all drawing tasks
    const tasks = [
        { id: 'chartParticipants', fn: () => {
            const d = calculateParticipantsData(data);
            if (d) { preDrawCleanup('chartParticipants'); drawChart('chartParticipants', 'doughnut', '', Object.keys(d), Object.values(d), ['#4e73df']); }
            else { clearChart('chartParticipants', 'No employees found.'); }
        }},
        { id: 'chartGender', fn: () => {
            preDrawCleanup('chartGender');
            drawChart('chartGender', 'pie', '', Object.keys(genderData), Object.values(genderData), ['#4e73df', '#e74a3b']);
        }},
        { id: 'chartChronic', fn: () => {
            const d = calculateChronicData(data, header);
            if (d) { preDrawCleanup('chartChronic'); drawChart('chartChronic', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745']); }
            else { clearChart('chartChronic', 'Data missing.'); }
        }},
        { id: 'chartHypertension', fn: () => {
            const d = calculateHypertensionData(data, header);
            if (d) { preDrawCleanup('chartHypertension'); drawChart('chartHypertension', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745']); }
            else { clearChart('chartHypertension', 'Data missing.'); }
        }},
        { id: 'chartDiabetes', fn: () => {
            const d = calculateDiabetesData(data, header);
            if (d) { preDrawCleanup('chartDiabetes'); drawChart('chartDiabetes', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745']); }
            else { clearChart('chartDiabetes', 'Data missing.'); }
        }},
        { id: 'chartCholestrol', fn: () => {
            const d = calculateDyslipidemiaData(data, header);
            if (d) { preDrawCleanup('chartCholestrol'); drawChart('chartCholestrol', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745']); }
            else { clearChart('chartCholestrol', 'Data missing.'); }
        }},
        { id: 'chartObesity', fn: () => {
            const d = calculateObesityData(data, header);
            if (d) { preDrawCleanup('chartObesity'); drawChart('chartObesity', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745']); }
            else { clearChart('chartObesity', 'Data missing.'); }
        }},
        { id: 'chartFitness', fn: () => {
            const d = calculateFitnessData(data, header);
            if (d) { preDrawCleanup('chartFitness'); drawChart('chartFitness', 'pie', '', Object.keys(d), Object.values(d), ['#28a745', '#dc3545']); }
            else { clearChart('chartFitness', 'Data missing.'); }
        }},
        { id: 'chartStress', fn: () => {
            const d = calculateStressData(data, header);
            if (d) { preDrawCleanup('chartStress'); drawChart('chartStress', 'pie', '', Object.keys(d), Object.values(d), ['#28a745', '#dc3545']); }
            else { clearChart('chartStress', 'Data missing.'); }
        }},
        { id: 'chartMedication', fn: () => {
            const d = calculateMedicationData(data, header);
            if (d) { preDrawCleanup('chartMedication'); drawChart('chartMedication', 'pie', '', Object.keys(d), Object.values(d), ['#dc3545', '#28a745']); }
            else { clearChart('chartMedication', 'Data missing.'); }
        }}
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

    
    allLoadedData.forEach(obj => {
        obj.data.slice(1).forEach(row => {
            const rowComp = String(row[compIdx] || '').toUpperCase().trim();
            const rowLoc = String(row[locIdx] || '').trim();
            const rowDate = String(row[doscIdx] || '').trim(); // Gets the date from Excel
            
            const compMatch = (selectedCompany === 'ALL' || rowComp === selectedCompany);
            const locMatch = ignoreLocation || (selectedLocation === 'ALL' || rowLoc === selectedLocation);
            
            // NEW: Logic to check if the row date matches the selected picker date
            const dateMatch = !selectedDateRange || (rowDate === selectedDateRange);
            
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

fetch('http://localhost:3000/get-my-data')
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
        mode: "single", // Changed from "range"
        dateFormat: "d.m.Y", // Matches your Excel date format
        onChange: function(selectedDates, dateStr) {
            if (selectedDates.length === 1) {
                selectedDateRange = dateStr; // Store the single date string
            } else {
                selectedDateRange = null;
            }
            handleFilterChange();
        }
    });

    // X. Clear button
    // Clear Date Filter Logic
    const clearDateBtn = document.getElementById('clearDateFilter');
    const dateInput = document.getElementById('dosDateRangePicker');

    if (clearDateBtn && dateInput) {
    clearDateBtn.addEventListener('click', () => {
        // 1. Reset the global variable
        selectedDateRange = null; 
        
        // 2. Clear the input field text
        dateInput.value = ''; 
        
        // 3. Clear the Flatpickr instance (if it exists)
        if (dateInput._flatpickr) {
            dateInput._flatpickr.clear();
        }

        // 4. Trigger the filter refresh
        handleFilterChange(); 
    });

}
}
   // User Report
   let selectedMonth = null;

// Initialize Month Picker
const monthPickerInput = document.getElementById('monthPicker');
if (monthPickerInput) {
    flatpickr(monthPickerInput, {
        plugins: [
            new monthSelectPlugin({
                shorthand: true, // "Jan" instead of "January"
                dateFormat: "m.Y", // Matches format like "10.2025"
                altFormat: "F Y" // Displays as "October 2025"
            })
        ],
        onChange: function(selectedDates, dateStr) {
            selectedMonth = dateStr; // e.g., "10.2025"
            handleFilterChange();
        }
    });
}

// Clear Month Button
document.getElementById('clearMonthFilter').addEventListener('click', () => {
    selectedMonth = null;
    monthPickerInput.value = '';
    if (monthPickerInput._flatpickr) monthPickerInput._flatpickr.clear();
    handleFilterChange();
});

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
        'chartParticipants','chartGender', 'chartChronic', 'chartHypertension', 
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
        nameDisplayElement.textContent = savedName ? savedName : "Admin";
    }

});

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