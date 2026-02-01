// adminpage.js (Complete Dashboard Logic)

// Global variables
let allData = null; // Stores the loaded data from localStorage: {header: [], employeeRows: [[]]}
let headerRow = null; // Extracted header row array (lowercase, trimmed)
let employeeData = []; // Extracted employee rows only
let chartInstances = {}; // Object to store all Chart.js instances by their canvas ID
let currentDisplayedRows = []; // Used for the data table after initial load/filter

// --- Column Finder Helpers ---
const findCol = (header, name) => header.findIndex(h => h.includes(name));
const findCols = (header, names) => names.map(name => findCol(header, name)).filter(i => i !== -1);

// --- Status Calculation Helpers ---

/**
 * Calculates the status (Low, Medium, High) for a metric based on thresholds.
 * @param {number} value - The metric value.
 * @param {number} lowMax - The upper limit for "Low" (Green).
 * @param {number} mediumMax - The upper limit for "Medium" (Yellow). Anything above is "High" (Red).
 * @returns {{text: string, class: string}} Status and CSS class.
 */
function getHealthStatus(value, lowMax, mediumMax) {
    if (isNaN(value)) {
        return { text: 'N/A', class: 'status-na' };
    } else if (value <= lowMax) {
        return { text: 'Low', class: 'status-green' };
    } else if (value <= mediumMax) {
        return { text: 'Medium', class: 'status-yellow' };
    } else {
        return { text: 'High', class: 'status-red' };
    }
}

// --- Data Categorization Functions (from index.js, now needed here) ---

// (1) Participants
function calculateParticipantsData(data) {
    const total = data.length; // employeeData is rows only
    if (total <= 0) return null;
    return { 'Participants': total };
}

// (2) Calculates Obesity (BMI)
function calculateObesityData(data, header) {
    let bmiCol = findCol(header, 'bmi');
    if (bmiCol === -1) { bmiCol = findCol(header, 'number'); } 
    if (bmiCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 }; 
    for (const row of data) {
        const bmiValue = parseFloat(row[bmiCol]);
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

// (3) Calculates Diabetes (BS)
function calculateDiabetesData(data, header) {
    const fbsCol = findCol(header, 'bs1');
    const rbsCol = findCol(header, 'bs2');
    if (fbsCol === -1 && rbsCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };
    
    for (const row of data) {
        let isDiabetic = false;
        let hasData = false;
        
        const fbsValue = parseFloat(row[fbsCol]);
        if (!isNaN(fbsValue)) {
            hasData = true;
            if (fbsValue >= 112) { // FBS >= 112 mg/dL
                isDiabetic = true;
            }
        }

        const rbsValue = parseFloat(row[rbsCol]);
        if (!isNaN(rbsValue)) {
            hasData = true;
            if (rbsValue >= 202) { // RBS >= 202 mg/dL
                isDiabetic = true;
            }
        }

        if (isDiabetic) {
            counts['Yes']++;
        } else if (hasData) {
            counts['No']++;
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (4) Calculates Fitness (EXE1, EXE2, EXE3)
function calculateFitnessData(data, header) {
    const exeCols = findCols(header, ['exe1', 'exe2', 'exe3']);
    if (exeCols.length === 0) return null;

    const counts = { 'Yes': 0, 'No': 0 }; 

    for (const row of data) {
        for (const colIndex of exeCols) {
            const value = (row[colIndex] || '').toString().toUpperCase().trim();

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

// (5) Calculates Stress (STR1-STR4)
function calculateStressData(data, header) {
    const strCols = findCols(header, ['str1', 'str2', 'str3', 'str4']);
    const str4ColIndex = findCol(header, 'str4');
    if (strCols.length === 0) return null;

    const counts = { 'Yes': 0, 'No': 0 }; 

    for (const row of data) {
        for (const colIndex of strCols) {
            const value = (row[colIndex] || '').toString().toUpperCase().trim();

            if (colIndex === str4ColIndex) {
                // REVERSED LOGIC FOR STR4
                if (value.startsWith('Y')) { counts['No']++; } 
                else if (value.startsWith('N')) { counts['Yes']++; }
            } else {
                // NORMAL LOGIC for STR1, STR2, STR3
                if (value.startsWith('Y')) { counts['Yes']++; } 
                else if (value.startsWith('N')) { counts['No']++; }
            }
        }
    }

    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}
    
// (6) Hypertension
function calculateHypertensionData(data, header) {
    const bp1Col = findCol(header, 'bp1');
    const bp2Col = findCol(header, 'bp2');
    if (bp1Col === -1 || bp2Col === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };
    
    for (const row of data) {
        const bp1 = parseInt(row[bp1Col]);
        const bp2 = parseInt(row[bp2Col]);
        
        if (isNaN(bp1) || isNaN(bp2)) continue;

        if (bp1 >= 142 || bp2 >= 91) { // BP1 >= 142 OR BP2 >= 91
            counts['Yes']++;
        } else {
            counts['No']++;
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (7) Chronic Disease Status
function calculateChronicData(data, header) {
    const medDetailsCol = findCol(header, 'med_details');
    if (medDetailsCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };
    for (const row of data) {
        const value = (row[medDetailsCol] || '').toString().toUpperCase().trim();
        
        if (value.length > 0 && value !== 'NONE' && value !== 'N/A' && value !== 'N') {
            counts['Yes']++;
        } else if (value.length > 0) {
             counts['No']++; 
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (8) Chronic Medication Status
function calculateMedicationData(data, header) {
    const medicationCol = findCol(header, 'medication');
    if (medicationCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 }; 
    for (const row of data) {
        const value = (row[medicationCol] || '').toString().toUpperCase().trim();

        if (value.startsWith('Y')) { 
            counts['Yes']++; 
        } else if (value.startsWith('N')) { 
            counts['No']++; 
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (9) Dyslipidemia (High Cholesterol)
function calculateDyslipidemiaData(data, header) {
    const cholCol = findCol(header, 'cholesterol');
    const genericCholCol = findCol(header, 'chol');

    if (cholCol === -1 && genericCholCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 }; // Yes: Dyslipidemia/High Chol
    
    for (const row of data) {
        let cholValue = NaN;
        if (cholCol !== -1) {
            cholValue = parseFloat(row[cholCol]);
        } else if (genericCholCol !== -1) {
            cholValue = parseFloat(row[genericCholCol]);
        }

        if (isNaN(cholValue)) continue;
        
        if (cholValue > 220) { 
            counts['Yes']++;
        } else {
            counts['No']++;
        }
    }
    
    if (counts['Yes'] + counts['No'] === 0) return null;
    return counts;
}

// (10) Gender
function calculateGenderData(data, header) {
    const genderCol = findCol(header, 'gender');
    if (genderCol === -1) return null;

    let genderData = { Male: 0, Female: 0 };
    for (const row of data) {
        const gender = (row[genderCol] || '').toString().toLowerCase();

        if (gender.startsWith('m')) {
            genderData.Male++;
        } else if (gender.startsWith('f')) {
            genderData.Female++;
        }
    }
    return genderData;
}


// --- Chart Drawing Functions ---

/**
 * Clears a chart and hides the canvas, replacing it with a message.
 */
function clearChart(chartId, message = 'No data available.') {
    if (chartInstances[chartId]) {
        chartInstances[chartId].destroy();
        delete chartInstances[chartId];
    }
    // (Omitted: Placeholder logic, as charts are not defined in the provided HTML)
}

/**
 * Draws or updates any chart. (Placeholder - You'll need Chart.js for this)
 */
function drawChart(chartId, type, title, labels, data, colors) {
    // This is where Chart.js logic would live.
    // Since Chart.js is not imported in the provided HTML, this is a placeholder.
    console.log(`[Chart] Drawing ${title} on ${chartId}:`, data);
}

// --- Status Metric Card Generation ---

function generateMetricCard(title, value, unit = '', className = '', description = '') {
    return `
        <div class="metric-card ${className}">
            <div class="metric-title">${title}</div>
            <div class="metric-value">${value} ${unit}</div>
            <div class="metric-description">${description}</div>
        </div>
    `;
}

function updateMetricsGrid(data, header) {
    const totalParticipants = data.length;
    const container = document.getElementById('metricsContainer');
    let cardsHtml = '';
    
    // Total Participants Card
    cardsHtml += generateMetricCard('Participants', totalParticipants.toLocaleString(), '', 'card-blue');

    // Corporate Count Card (We must re-calculate this from the row data)
    const companyCol = findCol(header, 'company');
    const companies = new Set();
    if (companyCol !== -1) {
        data.forEach(row => {
            const company = (row[companyCol] || '').toString().toUpperCase().trim();
            if (company.length > 0) {
                companies.add(company);
            }
        });
    }
    cardsHtml += generateMetricCard('Total Corporates', companies.size.toLocaleString(), '', 'card-purple');

    // Calculate High Risk for BMI (Obesity)
    const obesityData = calculateObesityData(data, header);
    const highObesity = obesityData ? obesityData['Yes'] : 0;
    cardsHtml += generateMetricCard('High BMI (Obesity)', highObesity.toLocaleString(), '', 'card-red', `BMI $\ge$ 30.0`);
    
    // Calculate High Risk for BP (Hypertension)
    const hypertensionData = calculateHypertensionData(data, header);
    const highBP = hypertensionData ? hypertensionData['Yes'] : 0;
    cardsHtml += generateMetricCard('High BP', highBP.toLocaleString(), '', 'card-red', `BP $\ge$ 142/91`);

    // Calculate High Risk for BS (Diabetes)
    const diabetesData = calculateDiabetesData(data, header);
    const highBS = diabetesData ? diabetesData['Yes'] : 0;
    cardsHtml += generateMetricCard('High BS (Diabetes)', highBS.toLocaleString(), '', 'card-red', `FBS $\ge$ 112 or RBS $\ge$ 202`);

    container.innerHTML = cardsHtml;
}


// --- 🚨 NEW: Data Table Population Function 🚨 ---

/**
 * Populates the HTML table with employee data and risk statuses.
 */
function populateDataTable(data, header) {
    const tableBody = document.getElementById('tableBody');
    if (!tableBody) return;

    // Get column indices
    const colMap = {
        refId: findCol(header, 'refid'),
        name: findCol(header, 'empname'),
        empId: findCol(header, 'empid'),
        mobile: findCol(header, 'phone'),
        depart: findCol(header, 'department'),
        bmi: findCol(header, 'bmi') !== -1 ? findCol(header, 'bmi') : findCol(header, 'number'), // Fallback for BMI
        bp1: findCol(header, 'bp1'),
        bp2: findCol(header, 'bp2'),
        bs1: findCol(header, 'bs1'),
        bs2: findCol(header, 'bs2'),
        chol: findCol(header, 'cholesterol') !== -1 ? findCol(header, 'cholesterol') : findCol(header, 'chol'), // Fallback for Chol
        medication: findCol(header, 'medication'),
        exe1: findCol(header, 'exe1'),
        str1: findCol(header, 'str1'),
    };

    let html = '';

    data.forEach((row, index) => {
        // --- 1. Basic Data Extraction ---
        const refId = row[colMap.refId] || 'N/A';
        const name = row[colMap.name] || 'N/A';
        const empId = row[colMap.empId] || 'N/A';
        const mobile = row[colMap.mobile] || 'N/A';
        const depart = row[colMap.depart] || 'N/A';
        
        // --- 2. Health Status Calculations ---
        
        // BMI (Obesity)
        const bmiValue = parseFloat(row[colMap.bmi]);
        const bmiStatus = getHealthStatus(bmiValue, 24.9, 29.9); // Low: <25, Med: 25-29.9, High: >=30
        const bmiDisplay = isNaN(bmiValue) ? 'N/A' : `${bmiValue.toFixed(1)} (${bmiStatus.text.charAt(0)})`;

        // BP (Hypertension)
        const bp1Value = parseInt(row[colMap.bp1]);
        const bp2Value = parseInt(row[colMap.bp2]);
        const isHypertensive = (bp1Value >= 142 || bp2Value >= 91);
        const bpStatus = getHealthStatus(isHypertensive ? 150 : (bp1Value || 0), 139, 141); // Use SBP for categorization
        const bpDisplay = (isNaN(bp1Value) || isNaN(bp2Value)) ? 'N/A' : `${bp1Value}/${bp2Value} (${bpStatus.text.charAt(0)})`;
        
        // BG (Blood Sugar / Diabetes)
        const bs1Value = parseFloat(row[colMap.bs1]);
        const bs2Value = parseFloat(row[colMap.bs2]);
        const isDiabetic = (bs1Value >= 112 || bs2Value >= 202);
        const bsValue = bs1Value > 0 ? bs1Value : bs2Value;
        const bsStatus = getHealthStatus(isDiabetic ? 200 : (bsValue || 0), 111, 199); // Use general BS for categorization
        const bsDisplay = (isNaN(bsValue) || bsValue === 0) ? 'N/A' : `${bsValue.toFixed(0)} (${bsStatus.text.charAt(0)})`;
        
        // Total Cholesterol (Dyslipidemia)
        const cholValue = parseFloat(row[colMap.chol]);
        const cholStatus = getHealthStatus(cholValue, 200, 220); // Low: <200, Med: 200-220, High: >220
        const cholDisplay = isNaN(cholValue) ? 'N/A' : `${cholValue.toFixed(0)} (${cholStatus.text.charAt(0)})`;
        
        // Medication Status (Simple Y/N from Medication column)
        const medication = (row[colMap.medication] || 'N').toString().toUpperCase().charAt(0);
        const mediaDisplay = medication === 'Y' ? `<span class="status-red">Y</span>` : `<span class="status-green">N</span>`;

        // Simplified Fitness/Stress (Using a single column for a quick indicator)
        const fitness = (row[colMap.exe1] || 'N').toString().toUpperCase().charAt(0);
        const fitnessDisplay = fitness === 'Y' ? `<span class="status-green">Fit</span>` : `<span class="status-yellow">Unfit</span>`;

        const stress = (row[colMap.str1] || 'N').toString().toUpperCase().charAt(0);
        const stressDisplay = stress === 'Y' ? `<span class="status-red">Yes</span>` : `<span class="status-green">No</span>`;

        // Overall Risk (Simple Aggregate - Can be made more complex)
        let riskScore = 0;
        if (bmiStatus.class === 'status-red') riskScore += 1;
        if (bpStatus.class === 'status-red') riskScore += 1;
        if (bsStatus.class === 'status-red') riskScore += 1;
        if (cholStatus.class === 'status-red') riskScore += 1;
        if (medication === 'Y') riskScore += 1;
        
        let overallRiskClass = 'status-green';
        let overallRiskText = 'Low';
        if (riskScore >= 3) { overallRiskClass = 'status-red'; overallRiskText = 'High'; }
        else if (riskScore >= 1) { overallRiskClass = 'status-yellow'; overallRiskText = 'Medium'; }


        // --- 3. Build Table Row HTML ---
        html += `
            <tr class="data-row">
                <td>${refId}</td>
                <td>${name}</td>
                <td>${empId}</td>
                <td>${mobile}</td>
                <td>${depart}</td>
                <td class="${bmiStatus.class}">${bmiDisplay}</td>
                <td class="${bpStatus.class}">${bpDisplay}</td>
                <td class="${bsStatus.class}">${bsDisplay}</td>
                <td class="${cholStatus.class}">${cholDisplay}</td>
                <td>${mediaDisplay}</td>
                <td><button class="small-btn cardiac-btn">Cardiac</button></td>
                <td><span class="${overallRiskClass} risk-badge">${overallRiskText}</span></td>
                <td><button class="small-btn health-btn">Health</button></td>
                <td><button class="small-btn habit-btn">Habit</button></td>
                <td>${fitnessDisplay}</td>
                <td>${stressDisplay}</td>
                <td><button class="small-btn view-report-btn">View</button></td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}


// --- Main Initialization and Dashboard Update ---

function loadAndPrepareData() {
    const dataString = localStorage.getItem('corporateWellnessData');
    if (!dataString) {
        console.error('No data found in localStorage. Please upload a file first.');
        // Set up initial dashboard state for no data
        updateMetricsGrid([], []); 
        populateDataTable([], []);
        return false;
    }
    
    try {
        allData = JSON.parse(dataString);
        headerRow = allData.header.map(h => String(h || '').toLowerCase().trim());
        employeeData = allData.employeeRows;
        return true;
    } catch (e) {
        console.error('Error parsing data from localStorage:', e);
        return false;
    }
}


function updateDashboard() {
    if (!employeeData || employeeData.length === 0) {
        // Handle empty data case
        const allChartIds = ['chartParticipants','chartGender', 'chartChronic', 'chartHypertension', 'chartDiabetes', 
                             'chartCholestrol','chartObesity', 'chartFitness', 'chartStress', 'chartMedication'];
        allChartIds.forEach(id => clearChart(id, 'No data available for the current filters.'));
        updateMetricsGrid([], []);
        populateDataTable([], []);
        return;
    }

    // --- 1. Update Metrics Grid ---
    updateMetricsGrid(employeeData, headerRow);

    // --- 2. Update Data Table (The 'mini-spreadsheet') ---
    populateDataTable(employeeData, headerRow);

    // --- 3. Update Charts (Placeholder for when charts are available) ---
    /*
    // Example:
    const genderData = calculateGenderData(employeeData, headerRow);
    if (genderData) {
        drawChart('chartGender', 'pie', 'Gender Distribution', Object.keys(genderData), Object.values(genderData), ['#4e73df', '#e74a3b']);
    }
    // ... continue for all 10 charts
    */
    
    console.log(`Dashboard updated with ${employeeData.length} records.`);
}


// --- Event Listeners and Initial Load ---
document.addEventListener('DOMContentLoaded', () => {
    // 1. Set Date
    const dateElement = document.getElementById('currentDate');
    const today = new Date();
    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    // 2. Load Data and Update Dashboard
    if (loadAndPrepareData()) {
        updateDashboard();
    }
});