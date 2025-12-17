// Global variables
let allLoadedData = []; 
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
const findCol = (header, name) => header.findIndex(h => h.includes(name));
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
        strs: [getCol('STR1'), getCol('STR2'), getCol('STR3'), getCol('STR4')]
    };

    rows.forEach(row => {
        const tr = tableBody.insertRow();
        
        // Populate Cells with Fallbacks
        tr.insertCell().textContent = row[colIdx.ref] || '-';
        tr.insertCell().textContent = row[colIdx.emp] || '-';
        tr.insertCell().textContent = row[colIdx.name] || '-';
        tr.insertCell().textContent = row[colIdx.phone] || '-';
        tr.insertCell().textContent = row[colIdx.dept] || '-';
        tr.insertCell().textContent = row[colIdx.bmi] || '-';
        
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

        // View Button
        const viewCell = tr.insertCell();
        viewCell.innerHTML = `<button class="view-button" onclick="alert('Viewing Report for ${row[colIdx.name]}')">View</button>`;
    });
}

// (6) Location Dropdown Population
function populateLocationDropdown(data) {
    if (!headerRow) return;
    
    // Find column using Case-Insensitive search
    let locationCol = headerRow.findIndex(h => 
        String(h || '').toUpperCase().replace(/\s/g, '').includes('FACTORY')
    );
    
    const locationSelect = document.getElementById('locationSelect');
    if (locationCol === -1 || !locationSelect) return;

    // 1. Get unique locations from the data ALREADY filtered by Company
    const uniqueLocations = new Set();
    for (let i = 1; i < data.length; i++) {
        const location = data[i][locationCol];
        if (location && String(location).trim() !== '' && String(location).trim().toUpperCase() !== 'NA') {
            uniqueLocations.add(String(location).trim());
        }
    }

    // 2. Clear and Rebuild
    const currentSelection = selectedLocation;
    locationSelect.innerHTML = '<option value="ALL">ALL</option>';

    const sortedLocations = Array.from(uniqueLocations).sort();
    sortedLocations.forEach(location => {
        const option = document.createElement('option');
        option.value = location;
        option.textContent = location;
        locationSelect.appendChild(option);
    });
    
    // 3. Keep selection if it's still valid, otherwise reset to ALL
    if (uniqueLocations.has(currentSelection)) {
        locationSelect.value = currentSelection;
    } else {
        selectedLocation = 'ALL';
        locationSelect.value = 'ALL';
    }
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

function updateDashboardAndCharts(data) {
    const totalEmployees = data.length - 1; 
    
    const allChartIds = ['chartParticipants','chartGender', 'chartChronic', 'chartHypertension', 'chartDiabetes', 
                         'chartCholestrol','chartObesity', 'chartFitness', 'chartStress', 'chartMedication'];

    if (totalEmployees <= 0) {
        // Only update the one stat card we have in the HTML
        document.getElementById('numScreenedValue').textContent = '0';
        
        allChartIds.forEach(id => clearChart(id, 'No data available for the current filters.'));
        return;
    }
    
    document.getElementById('numScreenedValue').textContent = totalEmployees.toLocaleString();

    const header = data[0].map(h => String(h || '').toLowerCase().trim());
    const genderCol = findCol(header, 'gender');
    let genderData = { Male: 0, Female: 0 };

    // 1. Calculate Gender Data
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        
        // Gender
        if (genderCol !== -1) {
            const gender = (row[genderCol] || '').toString().toLowerCase();

            if (gender.startsWith('m')) {
                genderData.Male++;
            } else if (gender.startsWith('f')) {
                genderData.Female++;
            }
        }
    }

    
    // --- 2. Draw All 10 Charts ---
    
    const participantsData = calculateParticipantsData(data);
    if (participantsData) {
        preDrawCleanup('chartParticipants');
        // Use 'doughnut' for a better look for a single total, making the total count visible in the card above.
        drawChart('chartParticipants', 'doughnut', '', Object.keys(participantsData), Object.values(participantsData), ['#4e73df']); 
    } else { clearChart('chartParticipants', 'No employees found in selection.'); }

    // Chart 2: Gender (Pie)
    preDrawCleanup('chartGender');
    drawChart('chartGender', 'pie', '', Object.keys(genderData), Object.values(genderData), ['#4e73df', '#e74a3b']);

    // Chart 3: Chronic Disease (NEW DEDICATED LOGIC)
    const chronicData = calculateChronicData(data, header);
    if (chronicData) {
        preDrawCleanup('chartChronic');
        // Red for Yes, Green for No
        drawChart('chartChronic', 'pie', '', Object.keys(chronicData), Object.values(chronicData), ['#dc3545', '#28a745']); 
    } else { clearChart('chartChronic', 'MED_DETAILS column not found.'); }

    // Chart 4: Hypertension/BP (NEW DEDICATED LOGIC)
    const hypertensionData = calculateHypertensionData(data, header);
    if (hypertensionData) {
        preDrawCleanup('chartHypertension');
        // Red for Yes, Green for No
        drawChart('chartHypertension', 'pie', '', Object.keys(hypertensionData), Object.values(hypertensionData), ['#dc3545', '#28a745']);
    } else { clearChart('chartHypertension', 'Blood Pressure columns (BP1/BP2) not found.'); }
    
    // Chart 5: Diabetes/BS (NEW DEDICATED LOGIC)
    const diabetesData = calculateDiabetesData(data, header);
    if (diabetesData) {
        preDrawCleanup('chartDiabetes');
        // Red for Yes, Green for No
        drawChart('chartDiabetes', 'pie', '', Object.keys(diabetesData), Object.values(diabetesData), ['#dc3545', '#28a745']);
    } else { clearChart('chartDiabetes', 'Required blood sugar columns (BS1/BS2) not found.'); }
    
    // Chart 6: Dyslipidemia (NEW DEDICATED LOGIC)
    const dyslipidemiaData = calculateDyslipidemiaData(data, header);
    if (dyslipidemiaData) {
        preDrawCleanup('chartCholestrol');
        // Red for Yes, Green for No
        drawChart('chartCholestrol', 'pie', '', Object.keys(dyslipidemiaData), Object.values(dyslipidemiaData), ['#dc3545', '#28a745']);
    } else { clearChart('chartCholestrol', 'Cholesterol/Lipid columns not found.'); }

    // Chart 7: Obesity/BMI (NEW DEDICATED LOGIC)
    const obesityData = calculateObesityData(data, header);
    if (obesityData) {
        preDrawCleanup('chartObesity');
        // Red for Yes, Green for No
        drawChart('chartObesity', 'pie', '', Object.keys(obesityData), Object.values(obesityData), ['#dc3545', '#28a745']);
    } else { clearChart('chartObesity', 'BMI column not found.'); }

    // Chart 8: Fitness/Exercise (Keep Existing Generic Logic)
    const fitnessData = calculateFitnessData(data, header);
    if (fitnessData) {
        preDrawCleanup('chartFitness');
        // Green for Active/Fit, Red for Less Active
        drawChart('chartFitness', 'pie', '', Object.keys(fitnessData), Object.values(fitnessData), ['#28a745', '#dc3545']); 
    } else { clearChart('chartFitness', 'Exercise columns (EXE1-3) not found.'); }
    
    // Chart 9: Stress (Keep Existing Generic Logic)
    const stressData = calculateStressData(data, header);
    if (stressData) {
        preDrawCleanup('chartStress');
        // Green for Active/Fit, Red for Less Active
        drawChart('chartStress', 'pie', '', Object.keys(stressData), Object.values(stressData), ['#28a745', '#dc3545']); 
    } else { clearChart('chartStress', 'Exercise columns (STR1-4) not found.'); }

    // Chart 10: Chronic Medication (NEW DEDICATED LOGIC)
    const medicationData = calculateMedicationData(data, header);
    if (medicationData) {
        preDrawCleanup('chartMedication');
        // Red for Yes, Green for No
        drawChart('chartMedication', 'pie', '', Object.keys(medicationData), Object.values(medicationData), ['#dc3545', '#28a745']); 
    } else { clearChart('chartMedication', 'MEDICATION column not found.'); }
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
// --- MODIFIED FUNCTION: Apply Dynamic Filter ---
function filterData(ignoreLocation = false) {
    if (!headerRow) return [];
    let combined = [headerRow];
    
    const compIdx = headerRow.findIndex(h => String(h || '').toUpperCase().includes('COMPANY'));
    const locIdx = headerRow.findIndex(h => String(h || '').toUpperCase().includes('FACTORY'));

    allLoadedData.forEach(obj => {
        obj.data.slice(1).forEach(row => {
            const rowComp = String(row[compIdx] || '').toUpperCase().trim();
            const rowLoc = String(row[locIdx] || '').trim();
            
            const compMatch = (selectedCompany === 'ALL' || rowComp === selectedCompany);
            // Ignore location filter when we are just rebuilding the dropdown list
            const locMatch = ignoreLocation || (selectedLocation === 'ALL' || rowLoc === selectedLocation);
            
            if (compMatch && locMatch) {
                combined.push(row);
            }
        });
    });
    return combined;
}

function handleFilterChange() {
    if (allLoadedData.length === 0) return;

    // Step 1: Filter raw data by Company & Date ONLY to see available locations
    const companyDateFiltered = filterData(true); // Helper flag to ignore location
    
    // Step 2: Update the Location Dropdown based on those results
    populateLocationDropdown(companyDateFiltered);

    // Step 3: Apply the FINAL filter (Company + Date + the now-valid Location)
    lastFilteredData = filterData(false); 
    
    // Step 4: Refresh UI
    updateDashboardAndCharts(lastFilteredData);
    populateDataTable(lastFilteredData);
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


function populateCompanyDropdown(data) {
    if (!data || data.length <= 1) return;
    
    // Use the existing findCol helper
    const companyColIndex = findCol(data[0], 'COMPANY');
    if (companyColIndex === -1) {
        console.warn("Company column not found. Cannot populate Company filter.");
        return;
    }
    
    // Extract unique company names
    companyNames = new Set(data.slice(1).map(row => row[companyColIndex]).filter(Boolean));
    const companySelect = document.getElementById('companySelect');
    
    if (companySelect) {
        companySelect.innerHTML = '<option value="ALL">ALL</option>';
        companyNames.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            companySelect.appendChild(option);
        });
        // Select the initial value ('ALL')
        companySelect.value = selectedCompany; 
    }
}

document.addEventListener('DOMContentLoaded', () => {
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
    
    // 2. Initial Filter Listeners (File Upload)
    const fileUploadElement = document.getElementById('fileUpload');
    if (fileUploadElement) {
        fileUploadElement.addEventListener('change', handleFileUpload);
    } else {
        console.error("Error: 'fileUpload' element not found.");
    }

    // 3. Date Range Picker (Flatpickr)
    const datePickerInput = document.getElementById('dosDateRangePicker');
    if (datePickerInput) {
        flatpickr(datePickerInput, {
            mode: "range",
            dateFormat: "d.m.Y",
            onChange: function(selectedDates, dateStr) {
                if (selectedDates.length === 2) {
                    const parts = dateStr.split(' to ');
                    const startParts = parts[0].split('.');
                    const endParts = parts[1].split('.');
                    
                    selectedDateRange = {
                        start: `${startParts[2]}-${startParts[1]}-${startParts[0]}`, 
                        end: `${endParts[2]}-${endParts[1]}-${endParts[0]}`
                    };
                    handleFilterChange();
                } else {
                    selectedDateRange = null;
                    handleFilterChange();
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
});