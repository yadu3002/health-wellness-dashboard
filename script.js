// Global variables
let allLoadedData = []; 
let headerRow = null;
let chartInstances = {}; 
let lastFilteredData = null; 

// --- Column Finder Helpers ---
// Change from strict (===) to flexible (.includes)

const findCol = (header, name) => header.findIndex(h => h.toLowerCase().includes(name.toLowerCase()));

const findCols = (header, names) => names.map(name => findCol(header, name)).filter(i => i !== -1);

function openLoginPopup() {
    const modal = document.getElementById('loginModal');
    const frame = document.getElementById('loginFrame');
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    // Force a refresh so previously typed credentials never persist
    if (frame) frame.src = 'loginpage2.html?embedded=1&_ts=' + Date.now();
}

function closeLoginModal() {
    const modal = document.getElementById('loginModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    // Clear the iframe DOM by unloading it (avoids cached input values)
    const frame = document.getElementById('loginFrame');
    if (frame) frame.src = 'about:blank';
}


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

    // Calculate appropriate height based on container
    const containerHeight = container ? Math.min(container.offsetHeight || 280, 280) : 280;

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
                startAngle: -90, // Makes it a cool semi-circle arch
                endAngle: 90,
                offsetY: 40,
                donut: {
                    size: '75%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '14px', offsetY: -10, color: '#000000' },
                        value: { show: true, fontSize: '20px', fontWeight: 'bold', offsetY: 0, color: '#000000' },
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
                fontSize: '14px',
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
            offsetY: 0,
            labels: {
                colors: '#000000'
            }
        },
        grid: { padding: { bottom: -60 } } // Adjusts for the semi-circle layout
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

// Dedicated renderer for age distribution by gender
function drawAgeChart(chartId, ageData) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    
    if (chartInstances[chartId]) chartInstances[chartId].destroy();
    ctx.style.display = 'block';

    // This specifically uses the Chart.js library as requested
    chartInstances[chartId] = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ageData.labels,
            datasets: [
                {
                    label: 'Male',
                    data: ageData.male,
                    backgroundColor: '#4e73df' // Admin Blue
                },
                {
                    label: 'Female',
                    data: ageData.female,
                    backgroundColor: '#fb7185' // Admin Pink
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'right' } },
            cutout: '50%'
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

function preDrawCleanup(chartId) {
    const canvas = document.getElementById(chartId);
    if (canvas) {
        const container = canvas.closest('.chart-container');
        const message = container.querySelector('.placeholder-message');
        if (message) message.remove();
        canvas.style.display = 'block';
    }
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
        if (d) { preDrawCleanup('chartChronic'); drawChart('chartChronic', 'pie', '', Object.keys(d), Object.values(d), ['#df4e4e', '#1cc88a'], openPDetailsPopup); }
    }},
    { id: 'chartHypertension', fn: () => {
        const d = calculateHypertensionData(data, header);
        if (d) { preDrawCleanup('chartHypertension'); drawChart('chartHypertension', 'pie', '', Object.keys(d), Object.values(d), ['#e74a3b', '#1cc88a'], openHypertensionPopup); }
        
    }},
    { id: 'chartDiabetes', fn: () => {
        const d = calculateDiabetesData(data, header);
        if (d) { preDrawCleanup('chartDiabetes'); drawChart('chartDiabetes', 'pie', '', Object.keys(d), Object.values(d), ['#e74a3b', '#1cc88a'], openDiabetesPopup); }
    }},
    { id: 'chartCholestrol', fn: () => {
        const d = calculateDyslipidemiaData(data, header);
        if (d) { preDrawCleanup('chartCholestrol'); drawChart('chartCholestrol', 'pie', '', Object.keys(d), Object.values(d), ['#e74a3b', '#1cc88a'], openCholesterolPopup); }
    }},
    { id: 'chartObesity', fn: () => {
        const d = calculateObesityData(data, header);
        if (d) { preDrawCleanup('chartObesity'); drawChart('chartObesity', 'pie', '', Object.keys(d), Object.values(d), ['#e74a3b', '#1cc88a'], openObesityPopup); }
    }},
    { id: 'chartFitness', fn: () => {
        const d = calculateFitnessData(data, header);
        if (d) { preDrawCleanup('chartFitness'); drawChart('chartFitness', 'pie', '', Object.keys(d), Object.values(d), ['#1cc88a', '#e74a3b'], openFitnessPopup); }
    }},
    { id: 'chartStress', fn: () => {
        const d = calculateStressData(data, header);
        if (d) { preDrawCleanup('chartStress'); drawChart('chartStress', 'pie', '', Object.keys(d), Object.values(d), ['#1cc88a', '#e74a3b'], openStressHabitsPopup); }
    }},
    { id: 'chartMedication', fn: () => {
    const d = calculateMedicationData(data, header);
    if (d) { 
        preDrawCleanup('chartMedication'); 
        // We pass openPDetailsPopup as the final argument here
        drawChart('chartMedication', 'pie', '', Object.keys(d), Object.values(d), ['#4e73df', '#1cc88a']);
    }
    else { clearChart('chartMedication', 'No medication data.'); }
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

// Window resize handler to update charts
let resizeTimeout;
function handleResize() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
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