// Global variables
let allLoadedData = []; 
let headerRow = null;
let chartInstances = {}; 
let lastFilteredData = null; 

// --- Column Finder Helpers ---
// Change from strict (===) to flexible (.includes)

if (typeof findCol === 'undefined') {
    window.findCol = (header, name) => header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));
}

if (typeof findCols === 'undefined') {
    window.findCols = (header, names) => names.map(name => findCol(header, name)).filter(i => i !== -1);
}

function openLoginPopup() {
    const modal = document.getElementById('loginModal');
    const frame = document.getElementById('loginFrame');
    if (!modal) {
        console.error('Login modal not found');
        return;
    }
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Force a refresh so previously typed credentials never persist
    if (frame) frame.src = 'loginpage2.html?embedded=1&_ts=' + Date.now();
}

// Ensure function is available globally
window.openLoginPopup = openLoginPopup;

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (!modal) {
        console.error('Login modal not found');
        return;
    }
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    // Clear the iframe DOM by unloading it (avoids cached input values)
    const frame = document.getElementById('loginFrame');
    if (frame) frame.src = 'about:blank';
}

// Ensure function is available globally
window.closeLoginModal = closeLoginModal;


// --- Chart Drawing Functions ---

/**
 * Modern ApexCharts implementation for all charts except Age
 */
function drawChart(chartId, type, title, labels, data, colors, onClickHandler = null) {
    const container = document.getElementById(chartId);
    if (!container) return;

    // Standard cleanup for ApexCharts
    if (chartInstances[chartId] && typeof chartInstances[chartId].destroy === 'function') {
        chartInstances[chartId].destroy();
    }

    const isPie = (type === 'pie' || type === 'doughnut');

    // Dynamic height: measure the actual container space minus the title label
    const parentContainer = container.closest('.chart-container');
    const titleEl = parentContainer ? parentContainer.querySelector('.text-sm') : null;
    const titleHeight = titleEl ? titleEl.offsetHeight + 8 : 30; // title + margin
    const parentHeight = parentContainer ? parentContainer.clientHeight : 260;
    const containerHeight = Math.max(140, parentHeight - titleHeight - 16); // 16px for padding

    const options = {
        series: data,
        chart: {
            type: isPie ? 'donut' : 'bar',
            height: containerHeight,
            width: '100%',
            fontFamily: 'Inter, sans-serif',
            toolbar: { show: false },
            zoom: { enabled: false },
            // --- FIX: INTEGRATE THE POPUP HANDLER HERE ---
            events: {
                dataPointSelection: (event, chartContext, config) => {
                    // event: The mouse event
                    // chartContext: The internal Apex instance
                    // config: contains index of the clicked bar/slice
                    if (onClickHandler) onClickHandler();
                }
            },
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 1000,
                animateGradually: { enabled: true, delay: 150 }
            },
            dropShadow: {
                enabled: true,
                blur: 5,
                left: 0,
                top: 2,
                opacity: 0.1
            }
        },
        // --- ADDING COMPLEXITY: GRADIENTS ---
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark',
                type: "vertical",
                shadeIntensity: 0.5,
                gradientToColors: colors.map(c => c + 'CC'), // Slightly transparent ends
                opacityFrom: 1,
                opacityTo: 0.9,
                stops: [0, 100]
            }
        },
        plotOptions: {
            pie: {
                startAngle: -90,
                endAngle: 90,
                offsetY: Math.max(5, Math.round(containerHeight * 0.06)),
                donut: {
                    size: '68%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: window.innerWidth < 1400 ? '10px' : '12px', offsetY: -5, color: '#000000' },
                        value: { show: true, fontSize: window.innerWidth < 1400 ? '14px' : '18px', fontWeight: 'bold', offsetY: 0, color: '#000000' },
                        total: {
                            show: true,
                            label: title,
                            formatter: (w) => w.globals.seriesTotals.reduce((a, b) => a + b, 0),
                            color: '#000000',
                            fontSize: window.innerWidth < 1400 ? '10px' : '12px',
                            fontWeight: 600
                        }
                    }
                }
            },
            bar: {
                borderRadius: 10,
                columnWidth: '55%',
                distributed: true
            }
        },
        dataLabels: {
            enabled: true,
            formatter: function(val, opts) {
                return val.toFixed(0) + '%';
            },
            style: {
                fontSize: window.innerWidth < 1400 ? '11px' : '14px',
                fontWeight: 600,
                colors: ['#000000']
            },
            dropShadow: {
                enabled: false
            }
        },
        colors: colors,
        labels: labels,
        stroke: {
            show: true,
            width: 3,
            colors: ['#fff'] // Strong white borders create a "layered" look
        },
        legend: { 
            position: 'bottom', 
            offsetY: -5,
            height: undefined, // auto-size based on content
            fontSize: window.innerWidth < 1400 ? '10px' : '11px',
            labels: {
                colors: '#000000',
                useSeriesColors: false
            },
            itemMargin: {
                horizontal: 4,
                vertical: 1
            }
        },
        grid: { 
            padding: { 
                bottom: 0,
                top: 0,
                left: 2,
                right: 2
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

// Dedicated renderer for age distribution by gender (matches admin page style)
function drawAgeChart(chartId, ageData) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    
    if (chartInstances[chartId]) chartInstances[chartId].destroy();
    ctx.style.display = 'block';

    // Responsive sizing based on viewport
    const vw = window.innerWidth;
    const legendFontSize = vw < 1200 ? 9 : vw < 1400 ? 10 : 11;

    // Distinct colors per age bracket so the legend is readable
    const maleColors   = ['#1e40af', '#3b82f6', '#93c5fd']; // dark → light blue
    const femaleColors = ['#be123c', '#fb7185', '#fecdd3']; // dark → light pink

    chartInstances[chartId] = new Chart(ctx, {
        type: 'doughnut',
        plugins: [ChartDataLabels],
        data: {
            labels: ageData.labels,
            datasets: [
                {
                    label: 'Male',
                    data: ageData.male,
                    backgroundColor: maleColors.slice(0, ageData.labels.length)
                },
                {
                    label: 'Female',
                    data: ageData.female,
                    backgroundColor: femaleColors.slice(0, ageData.labels.length)
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '45%',
            layout: {
                padding: {
                    top: 2,
                    bottom: 2,
                    left: 2,
                    right: 2
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: legendFontSize,
                        boxHeight: legendFontSize - 2,
                        padding: vw < 1400 ? 6 : 8,
                        font: {
                            size: legendFontSize,
                            weight: '600'
                        },
                        color: '#1e293b',
                        generateLabels: function(chart) {
                            const datasets = chart.data.datasets;
                            const labels = chart.data.labels;
                            const items = [];
                            datasets.forEach((ds, dsIdx) => {
                                items.push({
                                    text: ds.label,
                                    fillStyle: ds.backgroundColor[0],
                                    strokeStyle: ds.backgroundColor[0],
                                    lineWidth: 0,
                                    hidden: !chart.isDatasetVisible(dsIdx),
                                    datasetIndex: dsIdx
                                });
                            });
                            labels.forEach((label, i) => {
                                items.push({
                                    text: label,
                                    fillStyle: datasets[0].backgroundColor[i],
                                    strokeStyle: '#fff',
                                    lineWidth: 1,
                                    hidden: false,
                                    index: i
                                });
                            });
                            return items;
                        }
                    }
                },
                datalabels: { display: false },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const dsLabel = context.dataset.label || '';
                            const ageLabel = context.label || '';
                            return `${dsLabel} (${ageLabel}): ${context.parsed}`;
                        }
                    }
                }
            }
        }
    });
}

// Helper: fixed ordering & colors: Risk first (red), WNL second (green)
function buildRiskWnlSeries(counts) {
    return {
        labels: ['Risk', 'WNL'],
        values: [counts['Risk'] || 0, counts['WNL'] || 0],
        colors: ['#e74a3b', '#1cc88a']
    };
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

function preDrawCleanup(chartId) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const container = canvas.closest('.chart-container');
        const message = container.querySelector('.placeholder-message');
        if (message) message.remove();
        canvas.style.display = 'block';
    }
}

// --- Overview Graph (Index Page) ---
// Simple overview card showing total corporates & employees
function createOverviewGraphIndex(containerId, numCompanies, numEmployees) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem; height: 100%; min-height: 100%; justify-content: center; align-items: center; padding: 0.75rem; width: 100%; position: relative;">
            <div style="display: flex; align-items: center; gap: 0.625rem; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.6); border-radius: 10px; border: 1px solid rgba(59, 130, 246, 0.15); backdrop-filter: blur(10px); transition: all 0.2s ease; width: 100%; max-width: 180px;">
                <div style="width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);">
                    <!-- House icon (same as adminpage) -->
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
                    <!-- People icon (same as adminpage) -->
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
}

// --- Dashboard Update Logic ---

function updateDashboardAndCharts(data) {
    
    if (!data || data.length <= 1) return;

    lastFilteredData = data;
    const totalEmployees = data.length - 1; 
    document.getElementById('numScreenedValue').textContent = totalEmployees.toLocaleString();

    const header = data[0].map(h => String(h || '').toLowerCase().trim());
    const genderCol = findCol(header, 'gender');
    let genderData = { Male: 0, Female: 0 };

    for (let i = 1; i < data.length; i++) {
        if (genderCol !== -1) {
            const gender = (data[i][genderCol] || '').toString().toLowerCase();
            if (gender.startsWith('m')) genderData.Male++;
            else if (gender.startsWith('f')) genderData.Female++;
        }
    }

    // Compute total companies for overview graph (from the same data set)
    const companyCol = header.findIndex(h => h.includes('company'));
    let companiesInSelection = new Set();
    if (companyCol !== -1) {
        for (let i = 1; i < data.length; i++) {
            const rowCompany = (data[i][companyCol] || '').toString().toUpperCase().trim();
            if (rowCompany) companiesInSelection.add(rowCompany);
        }
    }
    // Update topline corporates count (already shown near header)
    const numCompaniesEl = document.getElementById('numCompaniesValue');
    if (numCompaniesEl) {
        numCompaniesEl.textContent = companiesInSelection.size.toLocaleString();
    }

    // Process all charts
    // Inside updateDashboardAndCharts function in script.js
const charts = [
    { id: 'chartParticipants', fn: () => {
        const d = calculateParticipantsData(data, header);
        if (d) { preDrawCleanup('chartParticipants'); drawAgeChart('chartParticipants', d); }
        else { clearChart('chartParticipants', 'Age data missing.'); }
    }},
    { id: 'chartChronic', fn: () => {
        const d = calculateChronicData(data, header);
        if (d) { 
            preDrawCleanup('chartChronic'); 
            const series = buildRiskWnlSeries(d);
            drawChart('chartChronic', 'pie', '', series.labels, series.values, series.colors, openPDetailsPopup); 
        }
    }},
    { id: 'chartHypertension', fn: () => {
        const d = calculateHypertensionData(data, header);
        if (d) { 
            preDrawCleanup('chartHypertension'); 
            const series = buildRiskWnlSeries(d);
            drawChart('chartHypertension', 'pie', '', series.labels, series.values, series.colors, openHypertensionPopup); 
        }
    }},
    { id: 'chartDiabetes', fn: () => {
        const d = calculateDiabetesData(data, header);
        if (d) { 
            preDrawCleanup('chartDiabetes'); 
            const series = buildRiskWnlSeries(d);
            drawChart('chartDiabetes', 'pie', '', series.labels, series.values, series.colors, openDiabetesPopup); 
        }
    }},
    { id: 'chartCholestrol', fn: () => {
        const d = calculateDyslipidemiaData(data, header);
        if (d) { 
            preDrawCleanup('chartCholestrol'); 
            const series = buildRiskWnlSeries(d);
            drawChart('chartCholestrol', 'pie', '', series.labels, series.values, series.colors, openCholesterolPopup); 
        }
    }},
    { id: 'chartObesity', fn: () => {
        const d = calculateObesityData(data, header);
        if (d) { 
            preDrawCleanup('chartObesity'); 
            const series = buildRiskWnlSeries(d);
            drawChart('chartObesity', 'pie', '', series.labels, series.values, series.colors, openObesityPopup); 
        }
    }},
    { id: 'chartFitness', fn: () => {
        const d = calculateFitnessData(data, header);
        if (d) { 
            preDrawCleanup('chartFitness'); 
            const series = buildRiskWnlSeries(d);
            drawChart('chartFitness', 'pie', '', series.labels, series.values, series.colors, openFitnessPopup); 
        }
    }},
    { id: 'chartStress', fn: () => {
        const d = calculateStressData(data, header);
        if (d) { 
            preDrawCleanup('chartStress'); 
            const series = buildRiskWnlSeries(d);
            drawChart('chartStress', 'pie', '', series.labels, series.values, series.colors, openStressHabitsPopup); 
        }
    }},
    { id: 'chartMedication', fn: () => {
        const d = calculateMedicationData(data, header);
        if (d) { 
            preDrawCleanup('chartMedication'); 
            // Risk = unmedicated with chronic disease, WNL = everyone else
            const mapped = { Risk: d['Risk'] || 0, WNL: d['WNL'] || 0 };
            const series = buildRiskWnlSeries(mapped);
            drawChart('chartMedication', 'pie', '', series.labels, series.values, series.colors);
        } else { 
            clearChart('chartMedication', 'No medication data.'); 
        }
    }}
];

    charts.forEach(c => {
        try {
            c.fn();
        } catch (err) {
            console.error("Error drawing chart: " + c.id, err);
            clearChart(c.id, "Error drawing chart");
        }
    });
}

function handleFilterChange() {
    if (!allLoadedData || allLoadedData.length === 0) return;

    
    
    // Server data is always in allLoadedData[0].data
    const dataToProcess = allLoadedData[0].data;
    const header = dataToProcess[0].map(h => String(h || '').toLowerCase().trim());
    const companyCol = header.findIndex(h => h.includes('company'));
    
    let companiesInSelection = new Set();
    if (companyCol !== -1) {
        for (let i = 1; i < dataToProcess.length; i++) {
            const rowCompany = (dataToProcess[i][companyCol] || '').toString().toUpperCase().trim();
            if (rowCompany) companiesInSelection.add(rowCompany);
        }
    }
    document.getElementById('numCompaniesValue').textContent = companiesInSelection.size.toLocaleString();
    updateDashboardAndCharts(dataToProcess);
}

// Window resize handler - fully re-render charts so dynamic font sizes
// and heights adapt when the window moves between monitors or is resized.
let resizeTimeout;
let lastResizeWidth = window.innerWidth;
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        const widthDelta = Math.abs(window.innerWidth - lastResizeWidth);
        lastResizeWidth = window.innerWidth;

        // If the width changed significantly (e.g. moved to a different monitor),
        // do a full re-render so dynamic font sizes and chart heights recalculate.
        if (widthDelta > 100 && lastFilteredData) {
            updateDashboardAndCharts(lastFilteredData);
            return;
        }

        // Otherwise, just resize existing chart instances
        Object.keys(chartInstances).forEach(chartId => {
            if (chartInstances[chartId] && typeof chartInstances[chartId].resize === 'function') {
                try {
                    chartInstances[chartId].resize();
                } catch (e) {
                    console.warn('Error resizing chart:', chartId, e);
                }
            }
        });
    }, 300);
}

// --- Initialize ---
document.addEventListener('DOMContentLoaded', async () => {
    const dateElement = document.getElementById('currentDate');
    const today = new Date();
    
    // Set UI Defaults
    if (dateElement) dateElement.textContent = today.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const yearDisplay = document.getElementById('currentYearDisplay');
    if (yearDisplay) yearDisplay.textContent = '2025';

    // Clear Charts initially
    const allChartIds = ['chartParticipants', 'chartChronic', 'chartHypertension', 'chartDiabetes', 
                         'chartCholestrol','chartObesity', 'chartFitness', 'chartStress', 'chartMedication'];
    allChartIds.forEach(id => clearChart(id, 'Loading server data...'));

    // Fetch from server
    const data = await loadWellnessData(); 
    if (data) {
        allLoadedData = data;
        handleFilterChange();
    } else {
        allChartIds.forEach(id => clearChart(id, 'Failed to connect to server.'));
    }
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
});