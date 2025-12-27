// Global variables
let allLoadedData = []; 
let headerRow = null;
let chartInstances = {}; 
let lastFilteredData = null; 

// --- Column Finder Helpers ---
const findCol = (header, name) => 
    header.findIndex(h => h.toString().toLowerCase().trim() === name.toLowerCase());

const findCols = (header, names) => names.map(name => findCol(header, name)).filter(i => i !== -1);

function openLoginPopup() {
    const url = 'loginpage2.html';
    const name = 'LoginWindow';
    const features = 'width=550,height=700,toolbar=no,location=,status=no,menubar=no,scrollbars=yes,resizable=yes';
    window.open(url, name, features);
}

// --- Data Categorization Functions ---

function calculateParticipantsData(data) {
    const total = data.length - 1;
    if (total <= 0) return null;
    return { 'Participants': total };
}

function calculateObesityData(data, header) {
    let bmiCol = findCol(header, 'bmi');
    if (bmiCol === -1) { bmiCol = findCol(header, 'number'); } 
    if (bmiCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 }; 
    for (let i = 1; i < data.length; i++) {
        const bmiValue = parseFloat(data[i][bmiCol]);
        if (isNaN(bmiValue)) continue;
        if (bmiValue >= 30.0) { counts['Yes']++; } else { counts['No']++; }
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}

function calculateDiabetesData(data, header) {
    const fbsCol = findCol(header, 'fasting bs1');
    const rbsCol = findCol(header, 'random bs2');
    if (fbsCol === -1 && rbsCol === -1) return null;
    const counts = { 'Yes': 0, 'No': 0 };
    for (let i = 1; i < data.length; i++) {
        let isDiabetic = false;
        let hasData = false;
        const fbsValue = parseFloat(data[i][fbsCol]);
        if (!isNaN(fbsValue)) {
            hasData = true;
            if (fbsValue >= 112) isDiabetic = true;
        }
        const rbsValue = parseFloat(data[i][rbsCol]);
        if (!isNaN(rbsValue)) {
            hasData = true;
            if (rbsValue >= 202) isDiabetic = true;
        }
        if (isDiabetic) counts['Yes']++;
        else if (hasData) counts['No']++;
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}

function calculateFitnessData(data, header) {
    const exeCols = findCols(header, ['exe1', 'exe2', 'exe3']);
    if (exeCols.length === 0) return null;
    const counts = { 'Yes': 0, 'No': 0 }; 
    for (let i = 1; i < data.length; i++) {
        for (const colIndex of exeCols) {
            const value = (data[i][colIndex] || '').toString().toUpperCase().trim();
            if (value.startsWith('Y')) counts['Yes']++;
            else if (value.startsWith('N')) counts['No']++;
        }
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}

function calculateStressData(data, header) {
    const strCols = findCols(header, ['str1', 'str2', 'str3', 'str4']);
    const str4ColIndex = findCol(header, 'str4');
    if (strCols.length === 0) return null;
    const counts = { 'Yes': 0, 'No': 0 }; 
    for (let i = 1; i < data.length; i++) {
        for (const colIndex of strCols) {
            const value = (data[i][colIndex] || '').toString().toUpperCase().trim();
            if (colIndex === str4ColIndex) {
                if (value.startsWith('Y')) counts['No']++; 
                else if (value.startsWith('N')) counts['Yes']++;
            } else {
                if (value.startsWith('Y')) counts['Yes']++;
                else if (value.startsWith('N')) counts['No']++;
            }
        }
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}

function calculateHypertensionData(data, header) {
    const bp1Col = findCol(header, 'systolic bp1');
    const bp2Col = findCol(header, 'diastolic bp2');
    if (bp1Col === -1 || bp2Col === -1) return null;
    const counts = { 'Yes': 0, 'No': 0 };
    for (let i = 1; i < data.length; i++) {
        const bp1 = parseInt(data[i][bp1Col]);
        const bp2 = parseInt(data[i][bp2Col]);
        if (isNaN(bp1) || isNaN(bp2)) continue;
        if (bp1 >= 142 || bp2 >= 91) counts['Yes']++;
        else counts['No']++;
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}

function calculateChronicData(data, header) {
    const medDetailsCol = findCol(header, 'med_details');
    if (medDetailsCol === -1) return null;
    const counts = { 'Yes': 0, 'No': 0 };
    for (let i = 1; i < data.length; i++) {
        const value = (data[i][medDetailsCol] || '').toString().toUpperCase().trim();
        if (value.length > 0 && value !== 'NONE' && value !== 'N/A' && value !== 'N') counts['Yes']++;
        else if (value.length > 0) counts['No']++; 
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}

function calculateMedicationData(data, header) {
    const medicationCol = findCol(header, 'medication');
    if (medicationCol === -1) return null;
    const counts = { 'Yes': 0, 'No': 0 }; 
    for (let i = 1; i < data.length; i++) {
        const value = (data[i][medicationCol] || '').toString().toUpperCase().trim();
        if (value.startsWith('Y')) counts['Yes']++; 
        else if (value.startsWith('N')) counts['No']++; 
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}

function calculateDyslipidemiaData(data, header) {
    const cholCol = findCol(header, 'cholesterol');
    const genericCholCol = findCol(header, 'chol');
    if (cholCol === -1 && genericCholCol === -1) return null;
    const counts = { 'Yes': 0, 'No': 0 }; 
    for (let i = 1; i < data.length; i++) {
        let cholValue = parseFloat(data[i][cholCol !== -1 ? cholCol : genericCholCol]);
        if (isNaN(cholValue)) continue;
        if (cholValue > 220) counts['Yes']++; else counts['No']++;
    }
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
}   

// --- Chart Drawing Functions ---

function drawChart(chartId, type, title, labels, data, colors) {
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
            scales: isPie ? {} : { y: { beginAtZero: true } }
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
    const charts = [
        { id: 'chartParticipants', type: 'doughnut', func: calculateParticipantsData, colors: ['#4e73df'] },
        { id: 'chartGender', type: 'pie', data: genderData, colors: ['#4e73df', '#e74a3b'] },
        { id: 'chartChronic', type: 'pie', func: calculateChronicData, colors: ['#dc3545', '#28a745'] },
        { id: 'chartHypertension', type: 'pie', func: calculateHypertensionData, colors: ['#dc3545', '#28a745'] },
        { id: 'chartDiabetes', type: 'pie', func: calculateDiabetesData, colors: ['#dc3545', '#28a745'] },
        { id: 'chartCholestrol', type: 'pie', func: calculateDyslipidemiaData, colors: ['#dc3545', '#28a745'] },
        { id: 'chartObesity', type: 'pie', func: calculateObesityData, colors: ['#dc3545', '#28a745'] },
        { id: 'chartFitness', type: 'pie', func: calculateFitnessData, colors: ['#28a745', '#dc3545'] },
        { id: 'chartStress', type: 'pie', func: calculateStressData, colors: ['#28a745', '#dc3545'] },
        { id: 'chartMedication', type: 'pie', func: calculateMedicationData, colors: ['#dc3545', '#28a745'] }
    ];

    charts.forEach(c => {
        const chartData = c.func ? c.func(data, header) : c.data;
        if (chartData) {
            preDrawCleanup(c.id);
            drawChart(c.id, c.type, '', Object.keys(chartData), Object.values(chartData), c.colors);
        } else {
            clearChart(c.id);
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
    const allChartIds = ['chartParticipants','chartGender', 'chartChronic', 'chartHypertension', 'chartDiabetes', 
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