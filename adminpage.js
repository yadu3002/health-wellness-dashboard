// Global variables
let allLoadedData = []; 
let searchQuery = '';
let headerRow = null;
let chartInstances = {}; // Object to store all Chart.js instances by their canvas ID
let lastFilteredData = null; 
// --- NEW GLOBAL VARIABLE FOR DATE RANGE ---
let selectedDateRange = null;

// --- NEW GLOBAL VARIABLES FOR FILTERING ---
let companyNames = new Set();
let selectedCompany = 'ALL'; // Default to show all companies

// --- Column Finder Helpers ---
// Change this at the top of adminpage.js
if (typeof findCol === 'undefined') {
    window.findCol = (header, name) => header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
}

if (typeof findCols === 'undefined') {
    window.findCols = (header, names) => names.map(name => findCol(header, name)).filter(i => i !== -1);
}

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

    if (!data || data.length <= 1) {
        tableBody.innerHTML = '<tr><td colspan="16" style="text-align:center;">No data records found.</td></tr>';
        return;
    }

    const header = data[0];
    const rows = data.slice(1); // Show all rows

    

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
        nut1: getCol('NUT1'),
        nut2: getCol('NUT2'),
        nut3: getCol('NUT3'),
        nut4: getCol('NUT4'),
        // Flag mapping based on your Excel sheet columns
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
        
        // BP - Separate column
        const bp = (row[colIdx.bp1] && row[colIdx.bp2]) ? `${row[colIdx.bp1]}/${row[colIdx.bp2]}` : '-';
        tr.insertCell().textContent = bp;
        
        // Blood Sugar - Separate column
        const bs = (row[colIdx.bs1] || row[colIdx.bs2]) ? (row[colIdx.bs1] || row[colIdx.bs2]) : '-';
        tr.insertCell().textContent = bs;

        tr.insertCell().textContent = row[colIdx.chol] || '0';
        

        // Helper to generate Red/Green labels
        const createFlag = (cell, isIssue, labelIssue, labelNormal) => {
            const label = isIssue ? labelIssue : labelNormal;
            const className = isIssue ? 'flag-issue' : 'flag-normal';
            cell.innerHTML = `<span class="flag-indicator ${className}">${label}</span>`;
        };

        // 1. Medication
        createFlag(tr.insertCell(), row[colIdx.med] === 'Y', 'YES', 'NO');

        // 2. Cardiac Risk (derived from BP, Blood Sugar, Cholesterol)
        const sbp  = parseFloat(row[colIdx.bp1]);
        const dbp  = parseFloat(row[colIdx.bp2]);
        const fbs  = parseFloat(row[colIdx.bs1]);
        const rbs  = parseFloat(row[colIdx.bs2]);
        const chol = parseFloat(row[colIdx.chol]);

        const highBP   = ((!isNaN(sbp) && sbp > 140) || (!isNaN(dbp) && dbp > 90));
        const highBS   = ((!isNaN(fbs) && fbs > 126) || (!isNaN(rbs) && rbs > 200));
        const highChol = (!isNaN(chol) && chol > 200);

        const cardiacRisk = highBP || highBS || highChol;
        createFlag(tr.insertCell(), cardiacRisk, 'HIGH', 'LOW');

        // 3. Health Habit (If any HAB column is 'N')
        const poorHabit = colIdx.habs.some(i => i !== -1 && String(row[i] || '').toUpperCase().trim() === 'N');
        createFlag(tr.insertCell(), poorHabit, 'POOR', 'GOOD');

        // 4. Nutrient Status (NUT1–4)
        const isYes = (v) => {
            const t = (v || '').toString().toUpperCase().trim();
            return t.startsWith('Y');
        };
        const isNo = (v) => {
            const t = (v || '').toString().toUpperCase().trim();
            return t.startsWith('N');
        };
        let nutScore = 0;
        if (colIdx.nut1 !== -1 && isYes(row[colIdx.nut1])) nutScore++;
        if (colIdx.nut2 !== -1 && isYes(row[colIdx.nut2])) nutScore++;
        if (colIdx.nut3 !== -1 && isYes(row[colIdx.nut3])) nutScore++;
        if (colIdx.nut4 !== -1 && isNo(row[colIdx.nut4])) nutScore++;
        const nutrientStatus = nutScore >= 3 ? 'Adequate' : 'Inadequate';
        createFlag(tr.insertCell(), nutrientStatus === 'Inadequate', 'Inadequate', 'Adequate');

        // 5. Fitness – align with chart logic (EXE1/2/3, >1 'Y' = ACTIVE/WNL)
        let exeYCount = 0;
        colIdx.exes.forEach(i => {
            if (i === -1) return;
            const v = (row[i] || '').toString().toUpperCase().trim();
            if (v === 'Y') exeYCount++;
        });
        const lowFitness = exeYCount <= 1;
        createFlag(tr.insertCell(), lowFitness, 'LOW', 'ACTIVE');

        // 6. Stress – weighted stress_score from STR1–STR4 (data grid only)
        // STR1 (Job satisfaction):   "No"  -> +3
        // STR2 (Home situation):     "No"  -> +3
        // STR3 (Major problems):     "Yes" -> +4
        // STR4 (Sufficient sleep):   "No"  -> +2
        // If stress_score >= 4 THEN "High Stress"
        const [str1Idx, str2Idx, str3Idx, str4Idx] = colIdx.strs;
        let stressScore = 0;

        const getStrVal = (idx) => {
            if (idx === -1) return '';
            return (row[idx] || '').toString().toUpperCase().trim();
        };

        const s1 = getStrVal(str1Idx);
        const s2 = getStrVal(str2Idx);
        const s3 = getStrVal(str3Idx);
        const s4 = getStrVal(str4Idx);

        if (s1.startsWith('N')) stressScore += 3; // STR1 == "No"
        if (s2.startsWith('N')) stressScore += 3; // STR2 == "No"
        if (s3.startsWith('Y')) stressScore += 4; // STR3 == "Yes"
        if (s4.startsWith('N')) stressScore += 2; // STR4 == "No"

        const highStress = stressScore >= 4;
        createFlag(tr.insertCell(), highStress, 'HIGH', 'NORMAL');

        tr.insertCell().textContent = row[colIdx.dosc] || '-';

        // View Button
        const viewCell = tr.insertCell();
        viewCell.innerHTML = `<button class="view-button" onclick="alert('Viewing Report for ${row[colIdx.name]}')">View</button>`;
    });
}



// --- Placeholder for Dashboard Filter Update ---
function updateDashboardFilters() {
    console.log("Date range selected:", selectedDateRange);

}

// --- Chart Drawing Functions (No Change) ---

/**
 * Modern ApexCharts implementation for all charts except Age
 */
function drawChart(chartId, type, title, labels, data, colors, onClickHandler = null) {
    const container = document.getElementById(chartId);
    if (!container) return;

    // Standard cleanup: ApexCharts needs to be destroyed manually to avoid overlaps
    if (chartInstances[chartId] && typeof chartInstances[chartId].destroy === 'function') {
        chartInstances[chartId].destroy();
    }

    const isPie = (type === 'pie' || type === 'doughnut');

    // Calculate appropriate height based on container - ensure labels are visible
    const containerElement = document.getElementById(chartId);
    const containerHeight = containerElement ? Math.min(containerElement.offsetHeight || 220, 220) : 220;
    
    const chartOptions = {
        type: isPie ? 'donut' : 'bar',
        height: containerHeight,
        width: '100%',
        fontFamily: 'Inter, sans-serif',
        toolbar: { show: false },
        zoom: { enabled: false },
        offsetY: 0,
        // IMPORTANT: We intentionally do NOT wire chart-level click handlers here.
        // Popup opening is handled at the card level in setupMetricCardClickHandlers()
        // to avoid multiple popups from a single user click.
        dropShadow: {
            enabled: true,
            blur: 5,
            left: 0,
            top: 2,
            opacity: 0.1
        }
    };
    
    const options = {
        series: isPie ? data : [{ name: title, data: data }],
        chart: chartOptions,
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: "vertical",
                shadeIntensity: 0.5,
                gradientToColors: colors.map(c => c + 'AA'),
                opacityFrom: 1,
                opacityTo: 0.8,
                stops: [0, 100]
            }
        },
        plotOptions: {
            pie: {
                startAngle: -90, // Semi-circle gauge
                endAngle: 90,
                offsetY: 10,
                donut: {
                    // Make the ring thicker by reducing the inner hole
                    size: '72%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '14px', offsetY: -8, color: '#000000' },
                        value: { show: true, fontSize: '22px', fontWeight: 700, offsetY: 0, color: '#000000' },
                        total: {
                            show: true,
                            label: title,
                            formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
                            color: '#000000',
                            fontSize: '14px',
                            fontWeight: 600
                        }
                    }
                }
            },
            bar: {
                borderRadius: 10,
                columnWidth: '60%',
                distributed: true
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function(val, opts) {
                return val.toFixed(0) + '%';
            },
            style: {
                fontSize: '13px',
                fontWeight: 600,
                colors: ['#000000']
            },
            dropShadow: {
                enabled: false
            },
            offsetY: -5
        },
        colors: colors,
        labels: labels,
        stroke: {
            width: 3,
            colors: ['#fff']
        },
        grid: {
            padding: { 
                bottom: 0,
                top: 0,
                left: 0,
                right: 0
            }
        },
        legend: { 
            position: 'bottom',
            offsetY: -20,
            height: 20,
            labels: {
                colors: '#000000',
                useSeriesColors: false,
                fontSize: '11px'
            },
            itemMargin: {
                horizontal: 6,
                vertical: 1
            }
        }
    };

    chartInstances[chartId] = new ApexCharts(container, options);
    chartInstances[chartId].render();
    
    // Force resize after render to ensure proper fitting
    setTimeout(() => {
        if (chartInstances[chartId] && typeof chartInstances[chartId].resize === 'function') {
            chartInstances[chartId].resize();
        }
    }, 100);
}

// Helper: fixed ordering & colors on admin charts: Risk first (red), WNL second (green)
function buildRiskWnlSeriesAdmin(counts) {
    return {
        labels: ['Risk', 'WNL'],
        values: [counts['Risk'] || 0, counts['WNL'] || 0],
        colors: ['#dc3545', '#28a745']
    };
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

// Function to create simple display with values and icons
function createOverviewGraph(containerId, numCompanies, numEmployees, maxCompanies, maxEmployees) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Clear existing chart
    if (chartInstances[containerId]) {
        if (typeof chartInstances[containerId].destroy === 'function') {
            chartInstances[containerId].destroy();
        }
        delete chartInstances[containerId];
    }
    container.innerHTML = '';
    
    // Create sleek professional display with icons and values
    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; height: 100%; min-height: 100%; justify-content: center; align-items: center; padding: 0.75rem; width: 100%; position: relative;">
            <div style="display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.6); border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.15); backdrop-filter: blur(10px); transition: all 0.2s ease; width: 100%; max-width: 180px;">
                <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                        <polyline points="9 22 9 12 15 12 15 22"></polyline>
                    </svg>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.15rem;">Corporates</div>
                    <div style="font-size: 20px; font-weight: 700; color: #1e293b; line-height: 1.1;">${numCompanies.toLocaleString()}</div>
                </div>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.6); border-radius: 10px; border: 1px solid rgba(16, 185, 129, 0.15); backdrop-filter: blur(10px); transition: all 0.2s ease; width: 100%; max-width: 180px;">
                <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #10b981, #34d399); border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="20" height="20">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="9" cy="7" r="4"></circle>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-size: 9px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 0.15rem;">Employees</div>
                    <div style="font-size: 20px; font-weight: 700; color: #1e293b; line-height: 1.1;">${numEmployees.toLocaleString()}</div>
                </div>
            </div>
        </div>
    `;
    
    // Ensure the container fills its area visually (no click behavior)
    container.style.height = '100%';
    container.style.minHeight = '100%';
    container.style.width = '100%';
    container.style.position = 'relative';
}

async function updateDashboardAndCharts(data) {
    
    const totalEmployees = data.length - 1; 
    const allChartIds = [
        'chartParticipants', 'chartChronic', 'chartHypertension',
        'chartDiabetes', 'chartCholestrol','chartObesity', 'chartFitness',
        'chartStress', 'chartMedication'
    ];

    // --- OVERVIEW: use CURRENT FILTERED DATA, not global totals ---
    let filteredEmployees = Math.max(totalEmployees, 0);
    let filteredCompanies = 0;

    let header = null;
    if (data && data.length > 0) {
        header = data[0].map(h => String(h || '').toLowerCase().trim());

        const companyIdx = findCol(header, 'company');
        if (companyIdx !== -1 && data.length > 1) {
            const companySet = new Set();
            data.slice(1).forEach(row => {
                const comp = (row[companyIdx] || '').toString().toUpperCase().trim();
                if (comp) companySet.add(comp);
            });
            filteredCompanies = companySet.size;
        } else if (selectedCompany && selectedCompany !== 'ALL') {
            // Fallback: we know the user filtered by a specific company
            filteredCompanies = 1;
        } else {
            // No company column detected – fall back to total known companies
            filteredCompanies = companyNames.size;
        }
    }

    const maxCompanies = Math.max((filteredCompanies || 0) * 1.2, 10);
    const maxEmployees = Math.max((filteredEmployees || 0) * 1.2, 100);

    createOverviewGraph('overviewGraph', filteredCompanies, filteredEmployees, maxCompanies, maxEmployees);

    if (totalEmployees <= 0) {
        allChartIds.forEach(id => clearChart(id, 'No data available for the current filters.'));
        return;
    }
    lastFilteredData = data;
    
    // --- PRE-CALCULATION BLOCK (Runs quickly) ---
    // header already computed above

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
            if (d) { 
                preDrawCleanup('chartChronic'); 
                const series = buildRiskWnlSeriesAdmin(d);
                drawChart('chartChronic', 'pie', '', series.labels, series.values, series.colors, openPDetailsPopup); 
            } else { 
                clearChart('chartChronic', 'Data missing.'); 
            }
        }},
        { id: 'chartHypertension', fn: () => {
            const d = calculateHypertensionData(data, header);
            if (d) { 
                preDrawCleanup('chartHypertension'); 
                const series = buildRiskWnlSeriesAdmin(d);
                drawChart('chartHypertension', 'pie', '', series.labels, series.values, series.colors, openHypertensionPopup); 
            } else { 
                clearChart('chartHypertension', 'Data missing.'); 
            }
        }},
        { id: 'chartDiabetes', fn: () => {
            const d = calculateDiabetesData(data, header);
            if (d) { 
                preDrawCleanup('chartDiabetes'); 
                const series = buildRiskWnlSeriesAdmin(d);
                drawChart('chartDiabetes', 'pie', '', series.labels, series.values, series.colors, openDiabetesPopup); 
            } else { 
                clearChart('chartDiabetes', 'Data missing.'); 
            }
        }},
        { id: 'chartCholestrol', fn: () => {
            const d = calculateDyslipidemiaData(data, header);
            if (d) { 
                preDrawCleanup('chartCholestrol'); 
                const series = buildRiskWnlSeriesAdmin(d);
                drawChart('chartCholestrol', 'pie', '', series.labels, series.values, series.colors, openCholesterolPopup); 
            } else { 
                clearChart('chartCholestrol', 'Data missing.'); 
            }
        }},
        { id: 'chartObesity', fn: () => {
            const d = calculateObesityData(data, header);
            if (d) { 
                preDrawCleanup('chartObesity'); 
                const series = buildRiskWnlSeriesAdmin(d);
                drawChart('chartObesity', 'pie', '', series.labels, series.values, series.colors, openObesityPopup); 
            } else { 
                clearChart('chartObesity', 'Data missing.'); 
            }
        }},
        { id: 'chartFitness', fn: () => {
            const d = calculateFitnessData(data, header);
            if (d) { 
                preDrawCleanup('chartFitness'); 
                const series = buildRiskWnlSeriesAdmin(d);
                drawChart('chartFitness', 'pie', '', series.labels, series.values, series.colors, openFitnessPopup); 
            } else { 
                clearChart('chartFitness', 'Data missing.'); 
            }
        }},
        { id: 'chartStress', fn: () => {
            const d = calculateStressData(data, header);
            if (d) { 
                preDrawCleanup('chartStress'); 
                const series = buildRiskWnlSeriesAdmin(d);
                drawChart('chartStress', 'pie', '', series.labels, series.values, series.colors, openStressHabitsPopup); 
            } else { 
                clearChart('chartStress', 'Data missing.'); 
            }
        }},
        { id: 'chartMedication', fn: () => {
            const d = calculateMedicationData(data, header);
            if (d) { 
                preDrawCleanup('chartMedication'); 
                const mapped = { Risk: d['Yes'] || 0, WNL: d['No'] || 0 };
                const series = buildRiskWnlSeriesAdmin(mapped);
                drawChart('chartMedication', 'pie', '', series.labels, series.values, series.colors, openChronicMedicationPopup);
            } else { 
                clearChart('chartMedication', 'No medication data.'); 
            }
        }},
    ];

    // Execute each chart render one by one, allowing UI updates in between
    for (const task of tasks) {
        await yieldToBrowser(); 
        task.fn();
    }
    
    // Make metric cards clickable
    setupMetricCardClickHandlers();
}

// Function to open overview popup
function openOverviewPopup() {
    if (!allLoadedData || allLoadedData.length === 0) return;
    
    // Calculate totals from all unfiltered data
    let totalEmployees = 0;
    const companyEmployeeMap = new Map();
    
    allLoadedData.forEach(dataObj => {
        if (dataObj.data && dataObj.data.length > 1) {
            const header = dataObj.header || dataObj.data[0];
            const companyCol = findCol(header, 'company');
            
            if (companyCol !== -1) {
                dataObj.data.slice(1).forEach(row => {
                    const company = (row[companyCol] || '').toString().toUpperCase().trim();
                    if (company && company !== 'UNKNOWN') {
                        companyEmployeeMap.set(company, (companyEmployeeMap.get(company) || 0) + 1);
                        totalEmployees++;
                    }
                });
            } else {
                totalEmployees += dataObj.data.length - 1;
            }
        }
    });
    
    const companies = Array.from(companyEmployeeMap.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    
    const popup = window.open('', '_blank', 'width=1100,height=700');
    popup.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Overview - Corporates & Employees</title>
            <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
            <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    padding: 40px;
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .chart-wrapper {
                    background: white;
                    padding: 40px;
                    border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    width: 100%;
                    max-width: 1000px;
                    animation: slideUp 0.5s ease-out;
                }
                @keyframes slideUp {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                h2 {
                    text-align: center;
                    color: #1e293b;
                    margin-bottom: 30px;
                    font-size: 28px;
                    font-weight: 700;
                }
                #chart { min-height: 450px; }
            </style>
        </head>
        <body>
            <div class="chart-wrapper">
                <h2>Overview - Corporates & Employees</h2>
                <div id="chart"></div>
            </div>
            <script>
                var options = {
                    series: [{ name: 'Employees', data: ${JSON.stringify(companies.map(c => c.count))} }],
                    chart: {
                        type: 'bar',
                        height: 500,
                        fontFamily: 'Inter, sans-serif',
                        toolbar: { show: false },
                        animations: {
                            enabled: true,
                            easing: 'easeinout',
                            speed: 800
                        }
                    },
                    plotOptions: {
                        bar: {
                            borderRadius: 8,
                            horizontal: false,
                            distributed: true,
                            columnWidth: '60%'
                        }
                    },
                    dataLabels: {
                        enabled: true,
                        formatter: function(val) {
                            return val.toLocaleString();
                        },
                        style: {
                            fontSize: '12px',
                            fontWeight: 600,
                            colors: ['#1e293b']
                        }
                    },
                    xaxis: {
                        categories: ${JSON.stringify(companies.map(c => c.name))},
                        labels: {
                            style: {
                                fontSize: '11px',
                                fontWeight: 600,
                                colors: '#1e293b'
                            },
                            rotate: -45,
                            rotateAlways: true
                        }
                    },
                    yaxis: {
                        title: {
                            text: 'No. of Employees',
                            style: {
                                fontSize: '14px',
                                fontWeight: 600,
                                color: '#1e293b'
                            }
                        },
                        labels: {
                            formatter: function(val) {
                                return val.toLocaleString();
                            },
                            style: {
                                fontSize: '12px',
                                colors: '#64748b'
                            }
                        }
                    },
                    colors: ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16', '#f97316'],
                    tooltip: {
                        y: {
                            formatter: function(val) {
                                return val.toLocaleString() + ' employees';
                            }
                        }
                    },
                    grid: {
                        borderColor: '#e2e8f0',
                        strokeDashArray: 4
                    }
                };
                var chart = new ApexCharts(document.querySelector("#chart"), options);
                chart.render();
            </script>
        </body>
        </html>
    `);
    popup.document.close();
}

// Function to setup click handlers for metric cards
function setupMetricCardClickHandlers() {
    const chartPopupMap = {
        'chartParticipants': openAgePopup,
        'chartChronic': openPDetailsPopup,
        'chartHypertension': openHypertensionPopup,
        'chartDiabetes': openDiabetesPopup,
        'chartCholestrol': openCholesterolPopup,
        'chartObesity': openObesityPopup,
        'chartFitness': openFitnessPopup,
        'chartStress': openStressHabitsPopup,
        'chartMedication': openChronicMedicationPopup
    };
    
    Object.keys(chartPopupMap).forEach(chartId => {
        const chartContainer = document.getElementById(chartId);
                if (chartContainer) {
                    const metricCard = chartContainer.closest('.metric-card');
                    if (metricCard && !metricCard.dataset.clickHandlerAdded) {
                        const popupFn = chartPopupMap[chartId];

                        // For overview graph, all click wiring is handled in createOverviewGraph.
                        // We only need to ensure the cursor looks clickable.
                        if (chartId === 'overviewGraph') {
                            metricCard.style.cursor = 'pointer';
                        } else {
                            // Single, card-level click handler to avoid multiple popup invocations.
                            const clickHandler = (e) => {
                                if (popupFn && typeof popupFn === 'function') {
                                    popupFn();
                                }
                            };

                            metricCard.addEventListener('click', clickHandler);
                            metricCard.style.cursor = 'pointer';
                        }

                        metricCard.dataset.clickHandlerAdded = 'true';
                    }
                }
    });
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
        nut1: getCol('NUT1'), nut2: getCol('NUT2'), nut3: getCol('NUT3'), nut4: getCol('NUT4'),
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

        // BP - Separate column
        const bp = (row[colIdx.bp1] && row[colIdx.bp2]) ? `${row[colIdx.bp1]}/${row[colIdx.bp2]}` : '-';
        // Blood Sugar - Separate column
        const bs = (row[colIdx.bs1] || row[colIdx.bs2]) ? (row[colIdx.bs1] || row[colIdx.bs2]) : '-';

        return `
            <tr>
                <td>${row[colIdx.ref] || '-'}</td>
                <td>${row[colIdx.emp] || '-'}</td>
                <td>${row[colIdx.name] || '-'}</td>
                <td>${row[colIdx.phone] || '-'}</td>
                <td>${row[colIdx.dept] || '-'}</td>
                <td>${formattedBMI}</td>
                <td>${bp}</td>
                <td>${bs}</td>
                <td>${row[colIdx.chol] || '0'}</td>
                ${getFlagHtml(String(row[colIdx.med] || '').toUpperCase().trim() === 'Y', 'YES', 'NO')}
                ${(() => {
                    // Cardiac risk from BP, Blood Sugar, Cholesterol
                    const sbp  = parseFloat(row[colIdx.bp1]);
                    const dbp  = parseFloat(row[colIdx.bp2]);
                    const fbs  = parseFloat(row[colIdx.bs1]);
                    const rbs  = parseFloat(row[colIdx.bs2]);
                    const chol = parseFloat(row[colIdx.chol]);

                    const highBP   = ((!isNaN(sbp) && sbp > 140) || (!isNaN(dbp) && dbp > 90));
                    const highBS   = ((!isNaN(fbs) && fbs > 126) || (!isNaN(rbs) && rbs > 200));
                    const highChol = (!isNaN(chol) && chol > 200);

                    const risk = highBP || highBS || highChol;
                    return getFlagHtml(risk, 'HIGH', 'LOW');
                })()}
                ${getFlagHtml(colIdx.habs.some(i => i !== -1 && String(row[i] || '').toUpperCase().trim() === 'N'), 'POOR', 'GOOD')}
                ${(() => {
                    // Nutrient status: NUT1/2/3 YES, NUT4 NO; score >=3 = Adequate
                    const isYes = (v) => {
                        const t = (v || '').toString().toUpperCase().trim();
                        return t.startsWith('Y');
                    };
                    const isNo = (v) => {
                        const t = (v || '').toString().toUpperCase().trim();
                        return t.startsWith('N');
                    };
                    let score = 0;
                    if (colIdx.nut1 !== -1 && isYes(row[colIdx.nut1])) score++;
                    if (colIdx.nut2 !== -1 && isYes(row[colIdx.nut2])) score++;
                    if (colIdx.nut3 !== -1 && isYes(row[colIdx.nut3])) score++;
                    if (colIdx.nut4 !== -1 && isNo(row[colIdx.nut4])) score++;
                    const inadequate = score < 3;
                    return getFlagHtml(inadequate, 'Inadequate', 'Adequate');
                })()}
                ${(() => {
                    // Fitness: >1 EXE 'Y' = ACTIVE/WNL, else LOW (same as chart logic)
                    let exeYCount = 0;
                    colIdx.exes.forEach(i => {
                        if (i === -1) return;
                        const v = (row[i] || '').toString().toUpperCase().trim();
                        if (v === 'Y') exeYCount++;
                    });
                    const lowFitness = exeYCount <= 1;
                    return getFlagHtml(lowFitness, 'LOW', 'ACTIVE');
                })()}
                ${(() => {
                    // Stress: STR1-3 Y = Risk, STR4 N = Risk (align with calculateStressData)
                    const str4Idx = colIdx.strs.length ? colIdx.strs[colIdx.strs.length - 1] : -1;
                    let highStress = false;
                    colIdx.strs.forEach(i => {
                        if (i === -1) return;
                        const v = (row[i] || '').toString().toUpperCase().trim();
                        if (i === str4Idx) {
                            if (v.startsWith('N')) highStress = true;
                        } else {
                            if (v.startsWith('Y')) highStress = true;
                        }
                    });
                    return getFlagHtml(highStress, 'HIGH', 'NORMAL');
                })()}
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
                        <th>BMI</th><th>BP</th><th>Blood Sugar</th><th>Cholestrol</th><th>Medication</th>
                        <th>Cardiac</th><th>Habit</th><th>Nutrient</th><th>Fitness</th><th>Stress</th><th>DOSC</th>
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
        btn.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default form submission if any

            console.log('🖨️ Print Report button clicked');

            // Validate that a company is selected
            const companySelect = document.getElementById('companySelect');
            if (!companySelect || companySelect.value === 'ALL' || companySelect.value === '') {
                alert('Please select a specific company from the dropdown before generating the report.');
                return;
            }

            // Check if generateUserReport function exists
            if (typeof generateUserReport !== 'function') {
                console.error('❌ generateUserReport function is not defined');
                alert('Error: Report generator function is not available. Please refresh the page and try again.');
                return;
            }

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'adminpage.js:generateUserReportBtnClick',message:'Group Profile button clicked',data:{hasHeaderRowOnWindow:!!window.headerRow,selectedCompany:companySelect.value},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log

            try {
                console.log('📊 Starting report generation...');
                await generateUserReport();
                console.log('✅ Report generation completed');
            } catch (error) {
                console.error('❌ Error generating report:', error);
                console.error('Error stack:', error.stack);
                alert(`Error generating report: ${error.message}. Please check the browser console for details.`);
            }
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
function filterData() {
    if (!headerRow) return [];
    let combined = [headerRow];
    
    // Find column indices
    const compIdx = headerRow.findIndex(h => String(h || '').toUpperCase().includes('COMPANY'));
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
            const rowDateRaw = String(row[doscIdx] || '').trim(); // "DD.MM.YYYY"
            
            const compMatch = (selectedCompany === 'ALL' || rowComp === selectedCompany);
            
            // --- UPDATED: Single Date Filtering Logic ---
            let dateMatch = true;
            if (selectedDateRange) {
                // It's a single date - exact match
                dateMatch = (rowDateRaw === selectedDateRange);
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

            if (compMatch && searchMatch && dateMatch) {
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

    

    // Apply filter (Company + Date + Search)
    lastFilteredData = filterData(); 
    
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



// Window resize handler to update charts
let resizeTimeoutAdmin;
function handleResizeAdmin() {
    clearTimeout(resizeTimeoutAdmin);
    resizeTimeoutAdmin = setTimeout(() => {
        // Resize all ApexCharts instances
        Object.keys(chartInstances).forEach(chartId => {
            if (chartInstances[chartId] && typeof chartInstances[chartId].resize === 'function') {
                try {
                    chartInstances[chartId].resize();
                } catch (e) {
                    console.warn('Error resizing chart:', chartId, e);
                }
            }
        });
        
        // Resize Chart.js instances
        Object.keys(chartInstances).forEach(chartId => {
            if (chartInstances[chartId] && chartInstances[chartId].canvas) {
                try {
                    chartInstances[chartId].resize();
                } catch (e) {
                    console.warn('Error resizing Chart.js:', chartId, e);
                }
            }
        });
    }, 250);
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
    

    // 3. Date Picker (Flatpickr) - Single Date
const datePickerInput = document.getElementById('dosDateRangePicker');
if (datePickerInput) {
    flatpickr(datePickerInput, {
        mode: "single",
        dateFormat: "d.m.Y",
        onClose: function(selectedDates, dateStr) {
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
            searchQuery = '';

            // Clear all input fields
            const dateInput = document.getElementById('dosDateRangePicker');
            const monthPickerInput = document.getElementById('monthPicker');
            const groupProfileInput = document.getElementById('groupProfile');
            const employeeSearch = document.getElementById('employeeSearch');
            const companySelect = document.getElementById('companySelect');

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

            // Reset dropdowns to default values
            if (companySelect) companySelect.value = 'ALL';

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
            handleFilterChange(); 
        });
    }
    
    // 5. Logout Button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            const confirmed = window.confirm('Are you sure you want to logout?');
            if (!confirmed) return;
            
            localStorage.removeItem('adminName');
            localStorage.removeItem('loggedInUsername');
            window.location.href = 'index.html';
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
    // Initialize overview graph with zero values
    createOverviewGraph('overviewGraph', 0, 0, 10, 100);
    
    // Setup click handlers for metric cards after initial render
    setTimeout(() => {
        setupMetricCardClickHandlers();
    }, 500);
    
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
    const savedUsername = localStorage.getItem('loggedInUsername');
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
    }
    
    // Add resize listener for charts
    window.addEventListener('resize', handleResizeAdmin);
    
    // Add function to adjust table container width based on viewport
    // Table container now fits naturally with CSS - no JS width constraints needed
});