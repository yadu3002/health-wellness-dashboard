// Set current date
function setCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    dateElement.textContent = today;
}

// Metrics Data
const metricsData = [
    { title: 'Participants', data: [{ value: 10, label: '10', color: '#3B82F6' }, { value: 0, label: '0%', color: '#93C5FD' }] },
    { title: 'Gender', data: [{ value: 67, label: '67\nF', color: '#3B82F6' }, { value: 33, label: '33\nM', color: '#FB923C' }] },
    { title: 'Chronic Disease', data: [{ value: 67, label: '67\nN', color: '#3B82F6' }, { value: 33, label: '33\nY', color: '#FB923C' }] },
    { title: 'Hypertension', data: [{ value: 62, label: '62\nN', color: '#3B82F6' }, { value: 38, label: '38\nY', color: '#FB923C' }] },
    { title: 'Diabetes', data: [{ value: 59, label: '59\nN', color: '#3B82F6' }, { value: 41, label: '41\nY', color: '#FB923C' }] },
    { title: 'DYSLIPIDEMIA', data: [{ value: 598, label: '598\nN', color: '#3B82F6' }, { value: 41, label: '41\nY', color: '#FB923C' }] },
    { title: 'Obesity', data: [{ value: 307, label: '307\nN', color: '#3B82F6' }, { value: 41, label: '41\nY', color: '#FB923C' }] },
    { title: 'Fitness', data: [{ value: 139, label: '139\nN', color: '#3B82F6' }, { value: 18, label: '18\nY', color: '#FB923C' }] },
    { title: 'Stress', data: [{ value: 81, label: '81\nN', color: '#3B82F6' }, { value: 24, label: '24\nY', color: '#FB923C' }] },
    { title: 'Chronic Medication', data: [{ value: 61, label: '61\nN', color: '#3B82F6' }, { value: 21, label: '21\nY', color: '#FB923C' }] }
];

// Create Pie Chart SVG
function createPieChart(data) {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = -90; // Start from top
    let svg = '<svg viewBox="0 0 100 100" style="transform: rotate(0deg);">';

    data.forEach(item => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const endAngle = currentAngle + angle;

        const startX = 50 + 40 * Math.cos((currentAngle * Math.PI) / 180);
        const startY = 50 + 40 * Math.sin((currentAngle * Math.PI) / 180);
        const endX = 50 + 40 * Math.cos((endAngle * Math.PI) / 180);
        const endY = 50 + 40 * Math.sin((endAngle * Math.PI) / 180);

        const largeArcFlag = angle > 180 ? 1 : 0;

        svg += `<path d="M 50 50 L ${startX} ${startY} A 40 40 0 ${largeArcFlag} 1 ${endX} ${endY} Z" fill="${item.color}" />`;

        currentAngle = endAngle;
    });

    svg += '<circle cx="50" cy="50" r="25" fill="white" />';
    svg += '</svg>';

    return svg;
}

// Render Metrics
function renderMetrics() {
    const container = document.getElementById('metricsContainer');

    metricsData.forEach(metric => {
        const card = document.createElement('div');
        card.className = 'metric-card';

        const chartSvg = createPieChart(metric.data);

        const labelsHtml = metric.data.map(item => {
            const lines = item.label.split('\n');
            return lines.map(line => `<div class="chart-label-item" style="color: ${item.color}">${line}</div>`).join('');
        }).join('');

        card.innerHTML = `
            <div class="metric-title">${metric.title}</div>
            <div class="chart-container">
                ${chartSvg}
                <div class="chart-labels">${labelsHtml}</div>
            </div>
        `;

        container.appendChild(card);
    });
}

// Render Table Rows
function renderTable() {
    const tbody = document.getElementById('tableBody');

    for (let i = 0; i < 10; i++) {
        const row = document.createElement('tr');

        // All 17 columns
        for (let j = 0; j < 17; j++) {
            const td = document.createElement('td');
            row.appendChild(td);
        }

        tbody.appendChild(row);
    }
}

// Initialize
setCurrentDate();
renderMetrics();
renderTable();
