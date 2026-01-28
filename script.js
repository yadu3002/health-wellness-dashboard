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

function drawChart(chartId, type, title, labels, data, colors,onClickHandler=null) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    if (chartInstances[chartId]) chartInstances[chartId].destroy();
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
            plugins: { legend: { position: isPie ? 'right' : 'top' } },
            scales: isPie ? {} : { y: { beginAtZero: true } },
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
        }
    });
}

// Dedicated renderer for age distribution by gender
function drawAgeChart(chartId, ageData) {
    const ctx = document.getElementById(chartId);
    if (!ctx) return;
    if (chartInstances[chartId]) chartInstances[chartId].destroy();
    ctx.style.display = 'block';

    chartInstances[chartId] = new Chart(ctx, {
        type: 'doughnut',
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
            plugins: { legend: { position: 'right' } }
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
        if (d) { preDrawCleanup('chartChronic'); drawChart('chartChronic', 'pie', '', Object.keys(d), Object.values(d), ['#4e73df', '#1cc88a'], openPDetailsPopup); }
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
});