// Global variables
let allLoadedData = []; 
let headerRow = null;
let chartInstances = {}; // Object to store all Chart.js instances by their canvas ID
let lastFilteredData = null; 

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

// --- Data Categorization Functions ---

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

// (4) Generic Status Check (USED FOR FITNESS AND STRESS ONLY)
// If any of the keyword columns has a positive indicator ('Y', 'Positive', 'High', etc.), it is 'Yes'.
function calculateGenericStatusData(data, header, keywords, yesLabel='Yes', noLabel='No') {
    const cols = findCols(header, keywords);
    if (cols.length === 0) return null;

    const counts = { [yesLabel]: 0, [noLabel]: 0 }; 
    
    for (let i = 1; i < data.length; i++) {
        let foundYes = false;
        let foundValue = false;
        for (const col of cols) {
             const value = (data[i][col] || '').toString().toUpperCase().trim();
             if (value.startsWith('Y') || value.includes('POSITIVE') || value.includes('HIGH') || value.includes('MEDICATION')) { 
                 foundYes = true;
                 foundValue = true;
                 break;
             }
             if (value.length > 0 && value !== 'N') { 
                 foundValue = true;
             }
        }
        
        if (foundYes) { 
            counts[yesLabel]++; 
        } else if (foundValue) { 
            counts[noLabel]++; 
        }
    }
    
    if (counts[yesLabel] + counts[noLabel] === 0) return null;
    
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

// --- Chart Drawing Functions (Unchanged) ---

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

    const isPie = (type === 'pie');
    
    chartInstances[chartId] = new Chart(ctx, {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: isPie ? title : 'Employee Count',
                data: data,
                backgroundColor: colors,
                borderColor: isPie ? 'white' : 'rgba(0, 0, 0, 0.1)',
                borderWidth: isPie ? 2 : 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: { position: isPie ? 'right' : 'top' },
                title: { display: false } 
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


// --- Dashboard Update Logic ---

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
        drawChart('chartParticipants', 'doughnut', 'Total Participants', Object.keys(participantsData), Object.values(participantsData), ['#4e73df']); 
    } else { clearChart('chartParticipants', 'No employees found in selection.'); }

    // Chart 2: Gender (Pie)
    preDrawCleanup('chartGender');
    drawChart('chartGender', 'pie', 'Gender Distribution', Object.keys(genderData), Object.values(genderData), ['#4e73df', '#e74a3b']);

    // Chart 3: Chronic Disease (NEW DEDICATED LOGIC)
    const chronicData = calculateChronicData(data, header);
    if (chronicData) {
        preDrawCleanup('chartChronic');
        // Red for Yes, Green for No
        drawChart('chartChronic', 'pie', 'Chronic Disease Status', Object.keys(chronicData), Object.values(chronicData), ['#dc3545', '#28a745']); 
    } else { clearChart('chartChronic', 'MED_DETAILS column not found.'); }

    // Chart 4: Hypertension/BP (NEW DEDICATED LOGIC)
    const hypertensionData = calculateHypertensionData(data, header);
    if (hypertensionData) {
        preDrawCleanup('chartHypertension');
        // Red for Yes, Green for No
        drawChart('chartHypertension', 'pie', 'Hypertension Risk (BP)', Object.keys(hypertensionData), Object.values(hypertensionData), ['#dc3545', '#28a745']);
    } else { clearChart('chartHypertension', 'Blood Pressure columns (BP1/BP2) not found.'); }
    
    // Chart 5: Diabetes/BS (NEW DEDICATED LOGIC)
    const diabetesData = calculateDiabetesData(data, header);
    if (diabetesData) {
        preDrawCleanup('chartDiabetes');
        // Red for Yes, Green for No
        drawChart('chartDiabetes', 'pie', 'Diabetes (Blood Sugar)', Object.keys(diabetesData), Object.values(diabetesData), ['#dc3545', '#28a745']);
    } else { clearChart('chartDiabetes', 'Required blood sugar columns (BS1/BS2) not found.'); }
    
    // Chart 6: Dyslipidemia (NEW DEDICATED LOGIC)
    const dyslipidemiaData = calculateDyslipidemiaData(data, header);
    if (dyslipidemiaData) {
        preDrawCleanup('chartCholestrol');
        // Red for Yes, Green for No
        drawChart('chartCholestrol', 'pie', 'Dyslipidemia', Object.keys(dyslipidemiaData), Object.values(dyslipidemiaData), ['#dc3545', '#28a745']);
    } else { clearChart('chartCholestrol', 'Cholesterol/Lipid columns not found.'); }

    // Chart 7: Obesity/BMI (NEW DEDICATED LOGIC)
    const obesityData = calculateObesityData(data, header);
    if (obesityData) {
        preDrawCleanup('chartObesity');
        // Red for Yes, Green for No
        drawChart('chartObesity', 'pie', 'Obesity/BMI Classification', Object.keys(obesityData), Object.values(obesityData), ['#dc3545', '#28a745']);
    } else { clearChart('chartObesity', 'BMI column not found.'); }

    // Chart 8: Fitness/Exercise (Keep Existing Generic Logic)
    const fitnessData = calculateGenericStatusData(data, header, ['exe1', 'exe2', 'exe3'], 'Active/Fit', 'Less Active');
    if (fitnessData) {
        preDrawCleanup('chartFitness');
        // Green for Active/Fit, Red for Less Active
        drawChart('chartFitness', 'pie', 'Fitness/Exercise Level', Object.keys(fitnessData), Object.values(fitnessData), ['#28a745', '#dc3545']); 
    } else { clearChart('chartFitness', 'Exercise columns (EXE1-3) not found.'); }
    
    // Chart 9: Stress (Keep Existing Generic Logic)
    const stressData = calculateGenericStatusData(data, header, ['str1', 'str2', 'str3', 'str4'], 'High Stress', 'Low Stress');
    if (stressData) {
        preDrawCleanup('chartStress');
        // Red for High Stress, Green for Low Stress
        drawChart('chartStress', 'pie', 'Stress/Mental Health', Object.keys(stressData), Object.values(stressData), ['#dc3545', '#28a745']);
    } else { clearChart('chartStress', 'Stress columns (STR1-4) not found.'); }

    // Chart 10: Chronic Medication (NEW DEDICATED LOGIC)
    const medicationData = calculateMedicationData(data, header);
    if (medicationData) {
        preDrawCleanup('chartMedication');
        // Red for Yes, Green for No
        drawChart('chartMedication', 'pie', 'Chronic Medication Status', Object.keys(medicationData), Object.values(medicationData), ['#dc3545', '#28a745']); 
    } else { clearChart('chartMedication', 'MEDICATION column not found.'); }
}


// --- Filtering Logic (MODIFIED) ---

function filterData() {
    if (allLoadedData.length === 0) return [];

    // No year/company filters now, combine all data.
    let combinedFilteredData = [];
    if (allLoadedData[0] && allLoadedData[0].data.length > 0) {
        combinedFilteredData.push(allLoadedData[0].data[0]); // Add Header
    } else { return []; }
    
    let companiesInSelection = new Set();
    
    for (const dataObj of allLoadedData) {
        const data = dataObj.data;
        const companyCol = dataObj.header.findIndex(h => h.includes('company'));
        
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            const rowCompany = (row[companyCol] || '').toString().toUpperCase();
            
            combinedFilteredData.push(row);
            if (companyCol !== -1 && rowCompany.trim().length > 0) {
                companiesInSelection.add(rowCompany.trim());
            }
        }
    }
    
    // Update the 'Total Corporates' card
    document.getElementById('numCompaniesValue').textContent = companiesInSelection.size.toLocaleString();
    
    return combinedFilteredData;
}


function handleFilterChange() {
    if (allLoadedData.length === 0) {
        const allChartIds = ['chartParticipants','chartGender', 'chartChronic', 'chartHypertension', 'chartDiabetes', 
                             'chartCholestrol','chartObesity', 'chartFitness', 'chartStress', 'chartMedication'];
        allChartIds.forEach(id => clearChart(id, 'Upload data to begin analysis.'));
        return;
    }
    
    lastFilteredData = filterData();
    updateDashboardAndCharts(lastFilteredData);
}

// --- File Upload Logic (MODIFIED) ---
function handleFileUpload(event) {
    const files = event.target.files;
    if (files.length === 0) return;

    allLoadedData = []; 
    // Removed all dropdown-related variables (companyNames, yearSelect, years)
    
    const processFile = (file) => {
        return new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const data = new Uint8Array(e.target.result);
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
            
            // Removed dropdown population logic
            
            handleFilterChange();
        });
}


document.addEventListener('DOMContentLoaded', () => {
    // Initial date and stat setup
    const dateElement = document.getElementById('currentDate');
    const currentYearDisplay = document.getElementById('currentYearDisplay');
    const today = new Date();

    if (dateElement) {
        dateElement.textContent = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
    
    // Set the current year display based on the HTML
    if (currentYearDisplay) {
        currentYearDisplay.textContent = '2025'; 
    }
    
    // Initial Filter Listeners
    document.getElementById('fileUpload').addEventListener('change', handleFileUpload);
    // Removed yearSelect and companySelect listeners
    
    // Initial placeholder setup
    document.getElementById('numCompaniesValue').textContent = '0';
    document.getElementById('numScreenedValue').textContent = '0';
    
    // Set initial messages for all charts
    const allChartIds = ['chartParticipants','chartGender', 'chartChronic', 'chartHypertension', 'chartDiabetes', 
                         'chartCholestrol','chartObesity', 'chartFitness', 'chartStress', 'chartMedication'];
    allChartIds.forEach(id => clearChart(id, 'Upload data to begin analysis.'));
});