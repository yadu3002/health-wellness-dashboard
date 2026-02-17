
function calculateGenderData(data, header) {
    if (!data || data.length <= 1) return null;

    const genderCol = findCol(header, 'gender');
    if (genderCol === -1) return null;

    const counts = { 'Male': 0, 'Female': 0 };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const gender = (row[genderCol] || '').toString().toLowerCase().trim();
        if (gender.startsWith('m')) {
            counts['Male']++;
        } else if (gender.startsWith('f')) {
            counts['Female']++;
        }
    }

    if (counts['Male'] + counts['Female'] === 0) return null;
    return counts;
}

function calculateParticipantsData(data, header = null) {
    if (!data || data.length <= 1) return null;

    const headerRow = header || data[0].map(h => String(h || '').toLowerCase().trim());
    const ageCol = findCol(headerRow, 'age');
    const dobCol = findCol(headerRow, 'dob'); // fallback if only DOB is provided
    const genderCol = findCol(headerRow, 'gender');

    if (genderCol === -1 || (ageCol === -1 && dobCol === -1)) return null;

    const buckets = [
        { label: 'Under 30', male: 0, female: 0 },
        { label: '30-40', male: 0, female: 0 },
        { label: '40+', male: 0, female: 0 }
    ];

    const parseAge = (ageVal, dobVal) => {
        const asNumber = parseFloat(ageVal);
        if (!isNaN(asNumber) && asNumber > 0 && asNumber < 120) return asNumber;

        const rawDate = dobVal ?? ageVal;
        const dateVal = new Date(rawDate);
        if (!isNaN(dateVal)) {
            const today = new Date();
            let computed = today.getFullYear() - dateVal.getFullYear();
            const monthDiff = today.getMonth() - dateVal.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateVal.getDate())) {
                computed--;
            }
            if (computed >= 0 && computed < 120) return computed;
        }
        return null;
    };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const age = parseAge(
            ageCol !== -1 ? row[ageCol] : null,
            dobCol !== -1 ? row[dobCol] : null
        );
        if (age === null) continue;

        const genderRaw = (row[genderCol] || '').toString().toLowerCase().trim();
        const genderKey = genderRaw.startsWith('m') ? 'male' : genderRaw.startsWith('f') ? 'female' : null;
        if (!genderKey) continue;

        // Keep bucket boundaries consistent with openAgePopup:
        // Under 30  -> age < 30
        // 30-40     -> 30 <= age <= 40
        // 40+       -> age > 40
        let bucketIdx;
        if (age < 30) bucketIdx = 0;
        else if (age <= 40) bucketIdx = 1;
        else bucketIdx = 2;
        buckets[bucketIdx][genderKey]++;
    }

    const totalCount = buckets.reduce((sum, b) => sum + b.male + b.female, 0);
    if (totalCount === 0) return null;

    return {
        labels: buckets.map(b => b.label),
        male: buckets.map(b => b.male),
        female: buckets.map(b => b.female)
    };
}

function calculateObesityData(data, header) {
    let bmiCol = findCol(header, 'bmi');
    if (bmiCol === -1) { bmiCol = findCol(header, 'number'); } 
    if (bmiCol === -1) return null;

    const counts = { 'Risk': 0, 'WNL': 0 }; 
    for (let i = 1; i < data.length; i++) {
        const bmiValue = parseFloat(data[i][bmiCol]);
        if (isNaN(bmiValue)) continue;

        if (bmiValue >= 30.0) { // BMI >= 30 is Obesity
            counts['Risk']++; 
        } else { 
            counts['WNL']++; 
        }
    }
    
    if (counts['Risk'] + counts['WNL'] === 0) return null;
    return counts;
}

function openObesityPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const bmiIdx = findCol(header, 'bmi');

    const stages = [
        { name: 'Underweight', color: '#36b9cc', check: (v) => v < 18.5, count: 0 },
        { name: 'Normal', color: '#1cc88a', check: (v) => v >= 18.5 && v <= 24.9, count: 0 },
        { name: 'Overweight', color: '#f6c23e', check: (v) => v >= 25.0 && v <= 29.9, count: 0 },
        { name: 'Obesity Gr 1', color: '#fd7e14', check: (v) => v >= 30.0 && v <= 34.9, count: 0 },
        { name: 'Obesity Gr 2', color: '#e74a3b', check: (v) => v >= 35.0 && v <= 39.9, count: 0 },
        { name: 'Grossly Obese', color: '#851010', check: (v) => v >= 40.0, count: 0 }
    ];

    lastFilteredData.slice(1).forEach(row => {
        const val = parseFloat(row[bmiIdx]);
        if (isNaN(val)) return;
        for (let i = 0; i < stages.length; i++) {
            if (stages[i].check(val)) { stages[i].count++; break; }
        }
    });

    const popup = window.open('', '_blank', 'width=1100,height=700');
popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Obesity Risk</title>
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
            <h2>Obesity Risk</h2>
            <div id="chart"></div>
        </div>
        <script>
            var options = {
                series: [{ name: 'Count', data: ${JSON.stringify(stages.map(s => s.count))} }],
                chart: {
                    type: 'bar',
                    height: 500,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 100 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 },
                    events: {
                        dataPointSelection: function(event, chartContext, config) {
                            const categoryIndex = config.dataPointIndex;
                            const categoryName = ${JSON.stringify(stages.map(s => s.name))}[categoryIndex];
                            if (window.opener && typeof window.opener.openUserReportPopup === 'function') {
                                window.opener.openUserReportPopup('obesity', categoryName);
                            }
                        }
                    }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 12,
                        distributed: true,
                        columnWidth: '70%',
                        dataLabels: {
                            position: 'top',
                            style: { fontSize: '14px', fontWeight: 600 }
                        }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '14px', colors: ['#1e293b'] }
                },
                colors: ${JSON.stringify(stages.map(s => s.color))},
                xaxis: {
                    categories: ${JSON.stringify(stages.map(s => s.name))},
                    labels: { style: { fontSize: '13px', fontWeight: 600 } }
                },
                yaxis: {
                    title: { text: 'Count', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return 'Employees: ' + val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
        </script>
    </body>
    </html>
`);
}

function calculateDiabetesData(data, header) {
    const fbsCol = findCol(header, 'bs1');
    const rbsCol = findCol(header, 'bs2');
    if (fbsCol === -1 && rbsCol === -1) return null;

    const counts = { 'Risk': 0, 'WNL': 0 };
    
    for (let i = 1; i < data.length; i++) {
        let fVal = parseFloat(data[i][fbsCol]);
        let rVal = parseFloat(data[i][rbsCol]);
        
        // Define what counts as "valid data" (not NaN and not 0)
        const hasF = !isNaN(fVal) && fVal > 0;
        const hasR = !isNaN(rVal) && rVal > 0;

        if (!hasF && !hasR) continue; // Skip row if both are missing/0

        // Normalize invalids to -1 so popup and donut logic stay in sync
        if (!hasF) fVal = -1;
        if (!hasR) rVal = -1;

        // Reuse the same staging logic as the diabetes popup:
        // Normal:       (f in (0,100] or r in (0,160])
        // Pre-Diabetic: (f 101-110 or r 161-200)
        // Moderate:     (f 111-129 or r 201-250)
        // Diabetic:     (f >= 130 or r >= 251)
        let stage = 'Normal';
        if ((fVal >= 130) || (rVal >= 251)) {
            stage = 'Diabetic';
        } else if ((fVal >= 111 && fVal <= 129) || (rVal >= 201 && rVal <= 250)) {
            stage = 'Moderate';
        } else if ((fVal >= 101 && fVal <= 110) || (rVal >= 161 && rVal <= 200)) {
            stage = 'Pre-Diabetic';
        } else if (!((fVal > 0 && fVal <= 100) || (rVal > 0 && rVal <= 160))) {
            // Values outside all explicit bands are treated as Risk
            stage = 'Abnormal';
        }

        if (stage === 'Normal') {
            counts['WNL']++;
        } else {
            counts['Risk']++;
        }
    }
    
    return (counts['Risk'] + counts['WNL'] === 0) ? null : counts;
}

function openDiabetesPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const fbsIdx = findCol(header, 'bs1');
    const rbsIdx = findCol(header, 'bs2');
    
    const stages = [
        { name: 'Normal', color: '#1cc88a', check: (f, r) => (f > 0 && f <= 100) || (r > 0 && r <= 160), count: 0 },
        { name: 'Pre-Diabetic', color: '#f6c23e', check: (f, r) => (f >= 101 && f <= 110) || (r >= 161 && r <= 200), count: 0 },
        { name: 'Moderate', color: '#fd7e14', check: (f, r) => (f >= 111 && f <= 129) || (r >= 201 && r <= 250), count: 0 },
        { name: 'Diabetic', color: '#e74a3b', check: (f, r) => (f >= 130) || (r >= 251), count: 0 }
    ];

    lastFilteredData.slice(1).forEach(row => {
        let f = parseFloat(row[fbsIdx]);
        let r = parseFloat(row[rbsIdx]);
        
        // Convert NaN or 0 to -1 so the "check" functions ignore that specific metric
        if (isNaN(f) || f <= 0) f = -1;
        if (isNaN(r) || r <= 0) r = -1;

        if (f === -1 && r === -1) return; // Skip if no valid data

        // Iterate backwards from Diabetic to Normal (priority to worst condition)
        for (let i = stages.length - 1; i >= 0; i--) {
            if (stages[i].check(f, r)) { 
                stages[i].count++; 
                break; 
            }
        }
    });

    const popup = window.open('', '_blank', 'width=1100,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Diabetes Risk</title>
        <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
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
            <h2>Diabetes Risk</h2>
            <div id="chart"></div>
            </div>
            <script>
            var options = {
                series: [{ name: 'Count', data: ${JSON.stringify(stages.map(s => s.count))} }],
                chart: {
                    type: 'bar',
                    height: 500,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 100 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 },
                    events: {
                        dataPointSelection: function(event, chartContext, config) {
                            const categoryIndex = config.dataPointIndex;
                            const categoryName = ${JSON.stringify(stages.map(s => s.name))}[categoryIndex];
                            if (window.opener && typeof window.opener.openUserReportPopup === 'function') {
                                window.opener.openUserReportPopup('diabetes', categoryName);
                            }
                        }
                    }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 12,
                        distributed: true,
                        columnWidth: '70%',
                        dataLabels: { position: 'top' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ${JSON.stringify(stages.map(s => s.color))},
                xaxis: {
                    categories: ${JSON.stringify(stages.map(s => s.name))},
                    labels: { style: { fontSize: '13px', fontWeight: 600 } }
                },
                yaxis: {
                    title: { text: 'Count', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return 'Employees: ' + val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
    </body>
    </html>
    `);
}

function calculateFitnessData(data, header) {
    const exe1Col = findCol(header, 'EXE1');
    const exe2Col = findCol(header, 'EXE2');
    const exe3Col = findCol(header, 'EXE3');

    // If columns aren't found, exit
    if (exe1Col === -1 && exe2Col === -1 && exe3Col === -1) return null;

    const counts = { 'WNL': 0, 'Risk': 0 };

    // Start from 1 to skip the header row
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        let personYCount = 0;

        // Check EXE1
        if (row[exe1Col] && row[exe1Col].toString().toUpperCase().trim() === 'Y') {
            personYCount++;
        }
        // Check EXE2
        if (row[exe2Col] && row[exe2Col].toString().toUpperCase().trim() === 'Y') {
            personYCount++;
        }
        // Check EXE3
        if (row[exe3Col] && row[exe3Col].toString().toUpperCase().trim() === 'Y') {
            personYCount++;
        }

        // Logic: More than 1 "Y" (meaning 2 or 3) counts as WNL/Active, otherwise Risk
        if (personYCount > 1) {
            counts['WNL']++;
        } else {
            counts['Risk']++;
        }
    }

    // Return null if no data was processed to avoid empty charts
    return (counts['WNL'] === 0 && counts['Risk'] === 0) ? null : counts;
}


function openFitnessPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    
    // 1. Setup Metrics & HR Categories
    const metrics = [
        { id: 'exe1', name: 'Regular Exercise', color: '#1cc88a', type: 'binary', count: 0 },
        { id: 'breath', name: 'Good Lung Cap.', color: '#36b9cc', type: 'numeric', threshold: 30, isLess: false, count: 0 },
        { id: 'exe3', name: 'Good Strength', color: '#4e73df', type: 'binary', count: 0 },
        { id: 'exe2', name: 'Good Flexibility', color: '#858796', type: 'binary', count: 0 }
    ];

    // Dedicated Heart Rate Breakdown
    const hrCategories = [
        { name: 'HR: Resting (<60)', color: '#4e73df', check: (v) => v < 60, count: 0 },
        { name: 'HR: Normal (60-100)', color: '#1cc88a', check: (v) => v >= 60 && v <= 100, count: 0 },
        { name: 'HR: High (101-120)', color: '#f6c23e', check: (v) => v >= 101 && v <= 120, count: 0 },
        { name: 'HR: Tachy (>120)', color: '#e74a3b', check: (v) => v > 120, count: 0 }
    ];

    const rows = lastFilteredData.slice(1);
    const pulseIdx = findCol(header, 'pulse');

    // 2. Single Pass Data Processing
    rows.forEach(row => {
        // Process standard metrics
        metrics.forEach(m => {
            const colIdx = findCol(header, m.id);
            if (colIdx === -1) return;
            const rawVal = (row[colIdx] || '').toString().trim();
            if (m.type === 'binary' && rawVal.toUpperCase().startsWith('Y')) m.count++;
            if (m.type === 'numeric') {
                const val = parseFloat(rawVal);
                if (!isNaN(val) && (m.isLess ? val < m.threshold : val >= m.threshold)) m.count++;
            }
        });

        // Process Pulse into 4 specific bars
        if (pulseIdx !== -1) {
            const pulseVal = parseFloat(row[pulseIdx]);
            if (!isNaN(pulseVal)) {
                for (let cat of hrCategories) {
                    if (cat.check(pulseVal)) { cat.count++; break; }
                }
            }
        }
    });

    // Combine all for the chart
    const finalLabels = [...metrics.map(m => m.name), ...hrCategories.map(c => c.name)];
    const finalData = [...metrics.map(m => m.count), ...hrCategories.map(c => c.count)];
    const finalColors = [...metrics.map(m => m.color), ...hrCategories.map(c => c.color)];

    // 3. UI Generation
    const popup = window.open('', '_blank', 'width=1200,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Fitness Level</title>
        <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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
                max-width: 1100px;
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
            #chart { min-height: 500px; }
        </style>
    </head>
    <body>
        <div class="chart-wrapper">
            <h2>Fitness Level</h2>
            <div id="chart"></div>
            </div>
            <script>
            var options = {
                series: [{ name: 'Count', data: ${JSON.stringify(finalData)} }],
                chart: {
                    type: 'bar',
                    height: 550,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 50 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 10,
                        distributed: true,
                        columnWidth: '65%',
                        horizontal: false,
                        dataLabels: { position: 'top' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '12px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ${JSON.stringify(finalColors)},
                xaxis: {
                    categories: ${JSON.stringify(finalLabels)},
                    labels: { 
                        style: { fontSize: '12px', fontWeight: 600 },
                        rotate: -45,
                        rotateAlways: true
                    }
                },
                yaxis: {
                    title: { text: 'Count', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return 'Employees: ' + val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
    </body>
    </html>
    `);
}

function calculateStressData(data, header) {
    // Person-level stress scoring based on STR1–STR4
    const str1Idx = findCol(header, 'str1');
    const str2Idx = findCol(header, 'str2');
    const str3Idx = findCol(header, 'str3');
    const str4Idx = findCol(header, 'str4');

    // If none of the STR columns exist, bail out
    if (str1Idx === -1 && str2Idx === -1 && str3Idx === -1 && str4Idx === -1) {
        return null;
    }

    const counts = { 'Risk': 0, 'WNL': 0 };

    const getVal = (row, idx) => {
        if (idx === -1) return '';
        return (row[idx] || '').toString().toUpperCase().trim();
    };

    // Start from index 1 to skip the header row
    for (let i = 1; i < data.length; i++) {
        const row = data[i];

        let stressScore = 0;
        const s1 = getVal(row, str1Idx); // Job satisfaction
        const s2 = getVal(row, str2Idx); // Home situation
        const s3 = getVal(row, str3Idx); // Major problems
        const s4 = getVal(row, str4Idx); // Sleep

        // 1. ENVIRONMENTAL & PSYCHOLOGICAL STRESSORS
        if (s1.startsWith('N')) stressScore += 3; // STR1 == "No"
        if (s2.startsWith('N')) stressScore += 3; // STR2 == "No"
        if (s3.startsWith('Y')) stressScore += 4; // STR3 == "Yes"

        // 3. COPING & RECOVERY MECHANISMS
        if (s4.startsWith('N')) stressScore += 2; // STR4 == "No"

        // Classify this person: stress_score >= 4 => Risk, else WNL
        if (stressScore >= 4) {
            counts['Risk']++;
        } else {
            counts['WNL']++;
        }
    }

    if (counts['Risk'] + counts['WNL'] === 0) return null;
    return counts;
}

function openChronicMedicationPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const medIdx = findCol(header, 'medication');
    const fbsIdx = findCol(header, 'bs1');
    const rbsIdx = findCol(header, 'bs2');
    const bp1Idx = findCol(header, 'bp1');
    const cholIdx = findCol(header, 'cholesterol');

    const counts = { diabetes: 0, hypertension: 0, cholesterol: 0 };

    lastFilteredData.slice(1).forEach(row => {
        // Only count if MEDICATION is 'N' (No)
        if (String(row[medIdx]).toUpperCase() === 'N') {
            const fbs = parseFloat(row[fbsIdx]);
            const rbs = parseFloat(row[rbsIdx]);
            const sys = parseFloat(row[bp1Idx]);
            const chol = parseFloat(row[cholIdx]);

            // Diabetes: Fasting > 126 or Random > 200
            if (fbs >= 126 || rbs >= 200) counts.diabetes++;
            // Hypertension: Systolic >= 140
            if (sys >= 140) counts.hypertension++;
            // Cholesterol: Total >= 200
            if (chol >= 200) counts.cholesterol++;
        }
    });

    const popup = window.open('', '_blank', 'width=1000,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>At-Risk & Unmedicated Population</title>
        <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
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
                max-width: 900px;
                animation: slideUp 0.5s ease-out;
            }
            @keyframes slideUp {
                from { opacity: 0; transform: translateY(30px); }
                to { opacity: 1; transform: translateY(0); }
            }
            h2 {
                text-align: center;
                color: #1e293b;
                margin-bottom: 15px;
                font-size: 28px;
                font-weight: 700;
            }
            p {
                text-align: center;
                color: #64748b;
                margin-bottom: 30px;
                font-size: 14px;
                line-height: 1.6;
            }
            #chart { min-height: 450px; }
        </style>
    </head>
    <body>
        <div class="chart-wrapper">
            <h2>At-Risk & Unmedicated Population</h2>
            <p>Count of people with clinical conditions who reported <b>NOT</b> taking chronic medication.</p>
            <div id="chart"></div>
            </div>
            <script>
            var options = {
                series: [{ name: 'Count', data: [${counts.diabetes}, ${counts.hypertension}, ${counts.cholesterol}] }],
                chart: {
                    type: 'bar',
                    height: 500,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 100 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 12,
                        distributed: true,
                        columnWidth: '60%',
                        dataLabels: { position: 'top' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ['#f87171', '#fb923c', '#fbbf24'],
                xaxis: {
                    categories: ['Diabetes Risk', 'Hypertension Risk', 'High Cholesterol'],
                    labels: { style: { fontSize: '13px', fontWeight: 600 } }
                },
                yaxis: {
                    title: { text: 'Number of People', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return 'Employees: ' + val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
        </body>
    </html>
    `);
}

function openStressHabitsPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    
    const indicators = [
        { id: 'str1', name: 'Work Stress', color: '#e74a3b', isReversed: false },
        { id: 'str2', name: 'Family Stress', color: '#e74a3b', isReversed: false },
        { id: 'str3', name: 'Financial Stress', color: '#e74a3b', isReversed: false },
        { id: 'str4', name: 'Poor Sleep', color: '#e74a3b', isReversed: true },
        { id: 'hab1', name: 'Smoking', color: '#f6c23e', isReversed: false },
        { id: 'hab2', name: 'Alcohol', color: '#f6c23e', isReversed: false },
        { id: 'hab3', name: 'Oral Tobacco', color: '#f6c23e', isReversed: false },
        { id: 'hab4', name: 'Poor Safety', color: '#f6c23e', isReversed: true }
    ];

    indicators.forEach(ind => {
        const colIdx = findCol(header, ind.id);
        ind.count = 0;
        if (colIdx !== -1) {
            lastFilteredData.slice(1).forEach(row => {
                const val = (row[colIdx] || '').toString().toUpperCase().trim();
                // Reversed logic: For Sleep, 'N' counts as the issue
                if (!ind.isReversed && val.startsWith('Y')) ind.count++;
                else if (ind.isReversed && val.startsWith('N')) ind.count++;
            });
        }
    });

    const popup = window.open('', '_blank', 'width=1200,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Stress level</title>
        <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
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
                max-width: 1100px;
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
            #chart { min-height: 500px; }
        </style>
    </head>
    <body>
        <div class="chart-wrapper">
            <h2>Stress level</h2>
            <div id="chart"></div>
            </div>
            <script>
            var options = {
                series: [{ name: 'Count of Reported Issues', data: ${JSON.stringify(indicators.map(i => i.count))} }],
                chart: {
                    type: 'bar',
                    height: 550,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 50 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 },
                    events: {
                        dataPointSelection: function(event, chartContext, config) {
                            var idx = config.dataPointIndex;
                            var categories = ${JSON.stringify(indicators.map(i => i.name))};
                            var categoryName = categories[idx];
                            if (window.opener && typeof window.opener.openUserReportPopup === 'function') {
                                window.opener.openUserReportPopup('stress', categoryName);
                            }
                        }
                    }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 10,
                        distributed: true,
                        columnWidth: '65%',
                        dataLabels: { position: 'top' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '12px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ${JSON.stringify(indicators.map(i => i.color))},
                xaxis: {
                    categories: ${JSON.stringify(indicators.map(i => i.name))},
                    labels: { 
                        style: { fontSize: '12px', fontWeight: 600 },
                        rotate: -45,
                        rotateAlways: true
                    }
                },
                yaxis: {
                    title: { text: 'Count of Reported Issues', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return 'Employees: ' + val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
    </body>
    </html>
    `);
}

// Classify a single BP reading using the requested logic:
// if SBP <= 100 and DBP <= 65      -> Hypotension
// else if SBP >= 180 or DBP >= 110 -> Grade III HTN
// else if SBP >= 160 or DBP >= 100 -> Grade II HTN
// else if SBP >= 140 or DBP >= 90  -> Grade I HTN
// else if SBP >= 121 or DBP >= 81  -> Pre-HTN
// else                             -> Normal
function classifyBPCategory(s, d) {
    if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) return null;
    // Only classify as Hypotension when BOTH systolic and diastolic
    // are at or below 100/65.
    if (s <= 100 && d <= 65) return 'Hypotension';
    if (s >= 180 || d >= 110) return 'Grade III HTN';
    if (s >= 160 || d >= 100) return 'Grade II HTN';
    if (s >= 140 || d >= 90) return 'Grade I HTN';
    if (s >= 121 || d >= 81) return 'Pre-HTN';
    return 'Normal';
}

function calculateHypertensionData(data, header) {
    // Support either a combined "bp" column ("120/80") or separate "bp1"/"bp2".
    // Prefer explicit bp1/bp2; only fall back to "bp" when both are missing.
    const bp1Idx = findCol(header, 'bp1');
    const bp2Idx = findCol(header, 'bp2');
    const bpCol = (bp1Idx === -1 && bp2Idx === -1) ? findCol(header, 'bp') : -1;

    if (bpCol === -1 && (bp1Idx === -1 || bp2Idx === -1)) return null;

    const counts = { 'Risk': 0, 'WNL': 0 };

    for (let i = 1; i < data.length; i++) {
        let s, d;
        if (bpCol !== -1) {
            const bpValue = (data[i][bpCol] || '').toString();
            const parts = bpValue.split('/');
            s = parseFloat(parts[0]);
            d = parseFloat(parts[1]);
        } else {
            s = parseFloat(data[i][bp1Idx]);
            d = parseFloat(data[i][bp2Idx]);
        }

        const category = classifyBPCategory(s, d);
        if (!category) continue;

        // For the donut, treat Hypotension, Normal, and Pre-HTN as WNL;
        // only Grade I/II/III HTN are counted as Risk.
        if (category === 'Hypotension' || category === 'Normal' || category === 'Pre-HTN') {
            counts['WNL']++;
        } else {
            counts['Risk']++;
        }
    }
    return (counts['Risk'] + counts['WNL'] === 0) ? null : counts;
}

function openHypertensionPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const bp1Idx = findCol(header, 'bp1'), bp2Idx = findCol(header, 'bp2');

    // Categories including Hypotension using the same logic as classifyBPCategory
    const grades = [
        { name: 'Hypotension',   color: '#36b9cc', count: 0 },
        { name: 'Normal',        color: '#1cc88a', count: 0 },
        { name: 'Pre-HTN',       color: '#f6c23e', count: 0 },
        { name: 'Grade I HTN',   color: '#fd7e14', count: 0 },
        { name: 'Grade II HTN',  color: '#e74a3b', count: 0 },
        { name: 'Grade III HTN', color: '#851010', count: 0 }
    ];

    lastFilteredData.slice(1).forEach(row => {
        const s = parseFloat(row[bp1Idx]), d = parseFloat(row[bp2Idx]);
        const cat = classifyBPCategory(s, d);
        if (!cat) return;
        const idx = grades.findIndex(g => g.name === cat);
        if (idx !== -1) grades[idx].count++;
    });

    const popup = window.open('', '_blank', 'width=1100,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Hypertension Severity Distribution</title>
        <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #ee0979 0%, #ff6a00 100%);
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
            <h2>Hypertension Severity Distribution</h2>
            <div id="chart"></div>
            </div>
            <script>
            var options = {
                series: [{ name: 'Count', data: ${JSON.stringify(grades.map(g => g.count))} }],
                chart: {
                    type: 'bar',
                    height: 500,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 100 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 },
                    events: {
                        dataPointSelection: function(event, chartContext, config) {
                            const categoryIndex = config.dataPointIndex;
                            const categoryName = ${JSON.stringify(grades.map(g => g.name))}[categoryIndex];
                            if (window.opener && typeof window.opener.openUserReportPopup === 'function') {
                                window.opener.openUserReportPopup('hypertension', categoryName);
                            }
                        }
                    }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 12,
                        distributed: true,
                        columnWidth: '70%',
                        dataLabels: { position: 'top' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ${JSON.stringify(grades.map(g => g.color))},
                xaxis: {
                    categories: ${JSON.stringify(grades.map(g => g.name))},
                    labels: { style: { fontSize: '13px', fontWeight: 600 } }
                },
                yaxis: {
                    title: { text: 'Count', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
    </body>
    </html>
    `);
}

function calculateChronicData(data, header) {
    const medDetailsCol = findCol(header, 'med_details');
    if (medDetailsCol === -1) return null;

    const counts = { 'Risk': 0, 'WNL': 0 };
    for (let i = 1; i < data.length; i++) {
        const value = (data[i][medDetailsCol] || '').toString().toUpperCase().trim();
        
        if (value.length > 0 && value !== 'NONE' && value !== 'N/A' && value !== 'N') {
            counts['Risk']++;
        } else if (value.length > 0) {
             counts['WNL']++; 
        }
        // Skip if the cell is completely empty (no data points)
    }
    
    if (counts['Risk'] + counts['WNL'] === 0) return null;
    return counts;
}

function openPDetailsPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;

    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const pDetailsIdx = findCol(header, 'med_details');
    if (pDetailsIdx === -1) return alert("Medication/Chronic details column not found.");

    const rows = lastFilteredData.slice(1);
    const conditionCounts = {};
    let totalParticipantsWithConditions = 0;

    // Known multi-word conditions that should NOT be split on spaces
    const MULTI_WORD_CONDITIONS = [
        'URIC ACID', 'KIDNEY STONE', 'SLEEPING PILLS', 'FATTY LIVER',
        'BACK PAIN', 'GASTRIC ULCER', 'VITAMIN D', 'MULTI VITAMINS',
        'ANTI COAGULATION', 'CARDIAC BLOCK', 'CARDIAC - BLOCK',
        'MED FOR SLEEP', 'OMEGA - 3'
    ];

    // Noise words / qualifiers that are not conditions themselves
    const NOISE_WORDS = new Set([
        'STOPPED', 'IRREGULAR', 'SOMETIMES', 'OF', 'FOR', 'NONE',
        'NA', 'WNL', 'ALL', 'LEFT', 'MONTH', 'MONTHS', 'MEDICINE', 'MED'
    ]);

    // 1. Extract and count unique conditions
    rows.forEach(row => {
        const details = (row[pDetailsIdx] || '').toString().trim();
        if (details && details.toUpperCase() !== 'NONE' && details.toLowerCase() !== 'wnl' && details !== '0' && details.toUpperCase() !== 'NA') {
            totalParticipantsWithConditions++;

            let text = details.toUpperCase().trim();
            const foundConditions = [];

            // Step 1: Extract known multi-word conditions first
            for (const mw of MULTI_WORD_CONDITIONS) {
                if (text.includes(mw)) {
                    foundConditions.push(mw);
                    text = text.replace(mw, ','); // replace with comma so remainder splits cleanly
                }
            }

            // Step 2: Strip parenthetical qualifiers like (STOPPED), (IRREGULAR)
            text = text.replace(/\([^)]*\)/g, '');

            // Step 3: Split remaining text on commas and spaces
            const tokens = text.split(/[\s,]+/)
                .map(t => t.replace(/[()]/g, '').trim())
                .filter(t => t.length > 1 && !NOISE_WORDS.has(t));

            foundConditions.push(...tokens);

            // Deduplicate within this row
            const uniqueConditions = [...new Set(foundConditions)];
            
            uniqueConditions.forEach(condition => {
                conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
            });
        }
    });

    // Sort conditions by frequency (descending) but do NOT limit the count,
    // so all recorded conditions (e.g., vitamins) appear in the popup bars.
    const sortedConditions = Object.entries(conditionCounts)
        .sort((a, b) => b[1] - a[1]);

    if (sortedConditions.length === 0) return alert("No chronic conditions recorded in the data.");

    // 2. UI Generation (Updated to match standard popup style)
    const popup = window.open('', '_blank', 'width=1100,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Chronic Disease Risk Distribution</title>
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
            <h2>Chronic Disease Risk Distribution</h2>
            <div id="chart"></div>
            </div>
            <script>
            // Prepare categories (condition labels) and values once
            var chronicCategories = ${JSON.stringify(sortedConditions.map(c => c[0]))};
            var chronicValues = ${JSON.stringify(sortedConditions.map(c => c[1]))};

            // Make the chart height adapt to number of conditions so it stays readable
            var chronicHeight = Math.min(750, 40 * chronicCategories.length + 160);

            var options = {
                series: [{ name: 'Count', data: chronicValues }],
                chart: {
                    type: 'bar',
                    height: chronicHeight,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 80 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.18 }
                },
                plotOptions: {
                    bar: {
                        horizontal: true,
                        borderRadius: 10,
                        barHeight: '70%',
                        dataLabels: { position: 'right' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    // Show both the condition name and the count on each bar
                    formatter: function (val, opts) {
                        var idx = opts.dataPointIndex;
                        var name = chronicCategories[idx] || '';
                        if (!name) return val;
                        return name + ' : ' + val;
                    },
                    offsetX: 8,
                    style: { fontSize: '12px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ['#4e73df'],
                xaxis: {
                    title: { text: 'Number of Reports', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                yaxis: {
                    categories: chronicCategories,
                    labels: { 
                        style: { fontSize: '12px', fontWeight: 600 }
                    }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
    </body>
    </html>
    `);
}

function calculateMedicationData(data, header) {
    const medCol  = findCol(header, 'medication');
    const fbsCol  = findCol(header, 'bs1');
    const rbsCol  = findCol(header, 'bs2');
    const bp1Col  = findCol(header, 'bp1');
    const cholCol = findCol(header, 'cholesterol');

    // Need at least the medication column + one chronic-disease column
    if (medCol === -1) return null;
    if (fbsCol === -1 && rbsCol === -1 && bp1Col === -1 && cholCol === -1) return null;

    const counts = { 'Risk': 0, 'WNL': 0 };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const medValue = (row[medCol] || '').toString().toUpperCase().trim();

        // Skip rows with no medication answer
        if (!medValue.startsWith('Y') && !medValue.startsWith('N')) continue;

        const isOnMedication = medValue.startsWith('Y');

        // Check for chronic conditions from lab values
        const fbs  = parseFloat(row[fbsCol]);
        const rbs  = parseFloat(row[rbsCol]);
        const sbp  = parseFloat(row[bp1Col]);
        const chol = parseFloat(row[cholCol]);

        const hasDiabetes      = (fbs >= 126) || (rbs >= 200);
        const hasHypertension  = (sbp >= 140);
        const hasHighChol      = (chol >= 200);
        const hasChronicDisease = hasDiabetes || hasHypertension || hasHighChol;

        // RISK = NOT medicated BUT has a chronic disease
        if (!isOnMedication && hasChronicDisease) {
            counts['Risk']++;
        } else {
            counts['WNL']++;
        }
    }

    if (counts['Risk'] + counts['WNL'] === 0) return null;
    return counts;
}


function calculateDyslipidemiaData(data, header) {
    // Look for the user-specified column: 'CHOLESTEROL'
    const cholCol = findCol(header, 'cholesterol');
    
    // Fallback logic to check other cholesterol column names if 'CHOLESTEROL' is missing
    const genericCholCol = findCol(header, 'chol');

    if (cholCol === -1 && genericCholCol === -1) return null;

    const counts = { 'Risk': 0, 'WNL': 0 }; // Risk: Dyslipidemia/High Chol
    
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
        
        // Keep thresholds aligned with cholesterol popup bands:
        // Normal (<200) vs any hyperlipidemia (>=200) counted as Risk
        if (cholValue >= 200) { 
            counts['Risk']++;
        } else {
            counts['WNL']++;
        }
    }
    
    if (counts['Risk'] + counts['WNL'] === 0) return null;
    return counts;
}  
function openCholesterolPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;

    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const cholIdx = findCol(header, 'cholesterol');
    
    if (cholIdx === -1) return alert("Cholesterol column not found.");

    // 1. Clinical Categories & Thresholds (mg/dL)
    // Labels intentionally do NOT include numeric ranges in the text;
    // ranges are only used internally for classification.
    const stages = [
        { name: 'Normal',         color: '#1cc88a', check: (v) => v < 200,                    count: 0 },
        { name: 'Mild Hyper',     color: '#f6c23e', check: (v) => v >= 200 && v <= 239,       count: 0 },
        { name: 'Moderate Hyper', color: '#fd7e14', check: (v) => v >= 240 && v <= 299,       count: 0 },
        { name: 'Severe Hyper',   color: '#e74a3b', check: (v) => v >= 300,                   count: 0 }
    ];

    const rows = lastFilteredData.slice(1);
    let totalValid = 0;

    // 2. Data Processing
    rows.forEach(row => {
        const val = parseFloat(row[cholIdx]);
        if (isNaN(val)) return;
        totalValid++;

        // Priority check: Highest severity first
        for (let i = stages.length - 1; i >= 0; i--) {
            if (stages[i].check(val)) {
                stages[i].count++;
                break;
            }
        }
    });

    // 3. UI Generation
    const popup = window.open('', '_blank', 'width=1100,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Dyslipidemia Risk</title>
        <script src="https://cdn.jsdelivr.net/npm/apexcharts"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
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
            <h2>Dyslipidemia Risk</h2>
            <div id="chart"></div>
            </div>
            <script>
            var options = {
                series: [{ name: 'Count', data: ${JSON.stringify(stages.map(s => s.count))} }],
                chart: {
                    type: 'bar',
                    height: 500,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 100 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 },
                    events: {
                        dataPointSelection: function(event, chartContext, config) {
                            const categoryIndex = config.dataPointIndex;
                            const categoryName = ${JSON.stringify(stages.map(s => s.name))}[categoryIndex];
                            if (window.opener && typeof window.opener.openUserReportPopup === 'function') {
                                window.opener.openUserReportPopup('cholesterol', categoryName);
                            }
                        }
                    }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 12,
                        distributed: true,
                        columnWidth: '70%',
                        dataLabels: { position: 'top' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ${JSON.stringify(stages.map(s => s.color))},
                xaxis: {
                    categories: ${JSON.stringify(stages.map(s => s.name))},
                    labels: { style: { fontSize: '13px', fontWeight: 600 } }
                },
                yaxis: {
                    title: { text: 'No. of People', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    y: { formatter: function(val) { return val; } }
                        },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: { show: false }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
    </body>
    </html>
    `);
}

function openAgePopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;

    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const ageCol = findCol(header, 'age');
    const dobCol = findCol(header, 'dob'); // fallback if only DOB is provided
    const genderCol = findCol(header, 'gender');

    if (genderCol === -1 || (ageCol === -1 && dobCol === -1)) return alert("Age or Gender column not found.");

    const ageDetails = {
        'Under 30': { M: 0, F: 0, total: 0, color: '#4e73df' },
        '30-40': { M: 0, F: 0, total: 0, color: '#1cc88a' },
        '40+': { M: 0, F: 0, total: 0, color: '#f6c23e' }
    };

    const parseAge = (ageVal, dobVal) => {
        const asNumber = parseFloat(ageVal);
        if (!isNaN(asNumber) && asNumber > 0 && asNumber < 120) return asNumber;

        const rawDate = dobVal ?? ageVal;
        const dateVal = new Date(rawDate);
        if (!isNaN(dateVal)) {
            const today = new Date();
            let computed = today.getFullYear() - dateVal.getFullYear();
            const monthDiff = today.getMonth() - dateVal.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateVal.getDate())) {
                computed--;
            }
            if (computed >= 0 && computed < 120) return computed;
        }
        return null;
    };

    lastFilteredData.slice(1).forEach(row => {
        const age = parseAge(
            ageCol !== -1 ? row[ageCol] : null,
            dobCol !== -1 ? row[dobCol] : null
        );
        if (age === null) return;

        const genderRaw = (row[genderCol] || '').toString().toLowerCase().trim();
        const genderKey = genderRaw.startsWith('m') ? 'M' : genderRaw.startsWith('f') ? 'F' : null;
        if (!genderKey) return;

        let bucketKey;
        if (age < 30) bucketKey = 'Under 30';
        else if (age <= 40) bucketKey = '30-40'; // Changed to <= 40 for accurate bucket
        else bucketKey = '40+';

        ageDetails[bucketKey][genderKey]++;
        ageDetails[bucketKey].total++;
    });

    const labels = Object.keys(ageDetails);
    const maleData = labels.map(l => ageDetails[l].M);
    const femaleData = labels.map(l => ageDetails[l].F);
    const totalData = labels.map(l => ageDetails[l].total);
    const colors = labels.map(l => ageDetails[l].color);

    const popup = window.open('', '_blank', 'width=1100,height=700');
    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Age/Gender</title>
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
            <h2>Age/Gender</h2>
            <div id="chart"></div>
            </div>
            <script>
            var options = {
                series: [
                    { name: 'Male', data: ${JSON.stringify(maleData)} },
                    { name: 'Female', data: ${JSON.stringify(femaleData)} }
                ],
                chart: {
                    type: 'bar',
                    height: 500,
                    fontFamily: 'Inter, sans-serif',
                    toolbar: { show: false },
                    stacked: false,
                    animations: {
                        enabled: true,
                        easing: 'easeinout',
                        speed: 1200,
                        animateGradually: { enabled: true, delay: 100 }
                    },
                    dropShadow: { enabled: true, blur: 10, opacity: 0.2 }
                },
                plotOptions: {
                    bar: {
                        borderRadius: 8,
                        columnWidth: '60%',
                        dataLabels: { position: 'top' }
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: function(val) { return val; },
                    offsetY: -20,
                    style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] }
                },
                colors: ['#4e73df', '#fb7185'],
                xaxis: {
                    categories: ${JSON.stringify(labels)},
                    labels: { style: { fontSize: '13px', fontWeight: 600 } }
                },
                yaxis: {
                    title: { text: 'Count', style: { fontSize: '14px', fontWeight: 600 } },
                    labels: { style: { fontSize: '12px' } }
                },
                tooltip: {
                    theme: 'dark',
                    style: { fontSize: '14px' },
                    shared: true,
                    intersect: false,
                    y: { formatter: function(val) { return val; } }
                },
                grid: { borderColor: '#e2e8f0', strokeDashArray: 4 },
                legend: {
                    show: true,
                    position: 'top',
                    horizontalAlign: 'center',
                    fontSize: '14px',
                    fontWeight: 600
                        }
            };
            var chart = new ApexCharts(document.querySelector("#chart"), options);
            chart.render();
            </script>
        </body>
    </html>
    `);
}

// Helper function to find column index (if not already defined globally)
if (typeof findCol === 'undefined') {
    function findCol(header, name) {
        return header.findIndex(h => String(h || '').toLowerCase().includes(name.toLowerCase()));
    }
}

/**
 * Opens a user report popup with employee details filtered by graph type and bar category.
 * Exposed on the global window object so popups can call window.opener.openUserReportPopup(...)
 * reliably.
 * @param {string} graphType - Type of graph (e.g., 'hypertension', 'obesity', 'diabetes', etc.)
 * @param {string} barCategory - The category/bar that was clicked (e.g., 'Normal', 'Gr I HTN', 'Obesity Gr 1', etc.)
 */
window.openUserReportPopup = function(graphType, barCategory) {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    
    // Use the current window or opener window depending on context
    const targetWindow = window.opener || window;
    
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const rows = lastFilteredData.slice(1);
    
    // Get column indices for employee details
    const getCol = (name) => findCol(header, name);
    const colIdx = {
        ref: getCol('refid'),
        emp: getCol('empid'),
        name: getCol('empname'),
        phone: getCol('phone'),
        dept: getCol('depart'),
        dosc: getCol('dosc'),
        bmi: getCol('bmi'),
        bp1: getCol('bp1'),
        bp2: getCol('bp2'),
        bs1: getCol('bs1'),
        bs2: getCol('bs2'),
        chol: getCol('cholesterol'),
        str1: getCol('str1'),
        str2: getCol('str2'),
        str3: getCol('str3'),
        str4: getCol('str4'),
        hab1: getCol('hab1'),
        hab2: getCol('hab2'),
        hab3: getCol('hab3'),
        hab4: getCol('hab4')
    };
    
    // Filter rows based on graph type and bar category
    let filteredRows = [];
    
    if (graphType === 'hypertension') {
        const bp1Idx = colIdx.bp1;
        const bp2Idx = colIdx.bp2;
        
        // Use the same classification logic as the hypertension popup / donut.
        // barCategory will be one of: 'Low BP', 'Normal', 'Pre-HTN',
        // 'Grade I HTN', 'Grade II HTN', 'Grade III HTN'.
        filteredRows = rows.filter(row => {
            const s = parseFloat(row[bp1Idx]);
            const d = parseFloat(row[bp2Idx]);
            const cat = typeof classifyBPCategory === 'function' ? classifyBPCategory(s, d) : null;
            if (!cat) return false;
            return cat === barCategory;
        });
    } else if (graphType === 'obesity') {
        const bmiIdx = colIdx.bmi;
        
        const bmiChecks = {
            'Underweight': (v) => v < 18.5,
            'Normal': (v) => v >= 18.5 && v <= 24.9,
            'Overweight': (v) => v >= 25.0 && v <= 29.9,
            'Obesity Gr 1': (v) => v >= 30.0 && v <= 34.9,
            'Obesity Gr 2': (v) => v >= 35.0 && v <= 39.9,
            'Grossly Obese': (v) => v >= 40.0
        };
        
        const check = bmiChecks[barCategory];
        if (check) {
            filteredRows = rows.filter(row => {
                const val = parseFloat(row[bmiIdx]);
                if (isNaN(val)) return false;
                return check(val);
            });
        }
    } else if (graphType === 'diabetes') {
        const bs1Idx = colIdx.bs1;
        const bs2Idx = colIdx.bs2;
        
        const diabetesChecks = {
            'Normal': (f, r) => (f > 0 && f <= 100) || (r > 0 && r <= 160),
            'Pre-Diabetic': (f, r) => (f >= 101 && f <= 110) || (r >= 161 && r <= 200),
            'Moderate': (f, r) => (f >= 111 && f <= 129) || (r >= 201 && r <= 250),
            'Diabetic': (f, r) => (f >= 130) || (r >= 251)
        };
        
        const check = diabetesChecks[barCategory];
        if (check) {
            filteredRows = rows.filter(row => {
                let f = parseFloat(row[bs1Idx]);
                let r = parseFloat(row[bs2Idx]);
                if (isNaN(f) || f <= 0) f = -1;
                if (isNaN(r) || r <= 0) r = -1;
                if (f === -1 && r === -1) return false;
                return check(f, r);
            });
        }
    } else if (graphType === 'cholesterol') {
        const cholIdx = colIdx.chol;
        
        const cholChecks = {
            'Normal (<200)': (v) => v < 200,
            'Mild Hyper (200-239)': (v) => v >= 200 && v <= 239,
            'Moderate Hyper (240-299)': (v) => v >= 240 && v <= 299,
            'Hyper (≥300)': (v) => v >= 300
        };
        
        const check = cholChecks[barCategory];
        if (check) {
            filteredRows = rows.filter(row => {
                const val = parseFloat(row[cholIdx]);
                if (isNaN(val)) return false;
                return check(val);
            });
        }
    } else if (graphType === 'stress') {
        // Map bar labels from Stress popup to underlying columns
        const keyMap = {
            'Work Stress':      'str1',
            'Family Stress':    'str2',
            'Financial Stress': 'str3',
            'Poor Sleep':       'str4',
            'Smoking':          'hab1',
            'Alcohol':          'hab2',
            'Oral Tobacco':     'hab3',
            'Poor Safety':      'hab4'
        };

        const key = keyMap[barCategory];
        const idx = key ? colIdx[key] : -1;

        if (idx !== -1 && idx != null) {
            filteredRows = rows.filter(row => {
                const v = (row[idx] || '').toString().toUpperCase().trim();
                if (key === 'str4' || key === 'hab4') {
                    // Reversed: 'N' counts as the issue (poor sleep / poor safety)
                    return v.startsWith('N');
                } else {
                    // For STR1–3 and HAB1–3 we count 'Y' as an issue
                    return v.startsWith('Y');
                }
            });
        }
    }
    
    if (filteredRows.length === 0) {
        alert('No employees found for the selected category.');
        return;
    }
    
    // Determine which additional columns to show based on graph type
    let additionalHeaders = [];
    
    if (graphType === 'hypertension') {
        additionalHeaders = ['BP'];
    } else if (graphType === 'obesity') {
        additionalHeaders = ['BMI'];
    } else if (graphType === 'diabetes') {
        additionalHeaders = ['Blood Sugar'];
    } else if (graphType === 'cholesterol') {
        additionalHeaders = ['Cholesterol'];
    }
    
    // Generate table rows
    const tableRows = filteredRows.map(row => {
        let rowHtml = `
            <tr>
                <td>${row[colIdx.name] || '-'}</td>
                <td>${row[colIdx.emp] || '-'}</td>
                <td>${row[colIdx.dept] || '-'}</td>
                <td>${row[colIdx.phone] || '-'}</td>
                <td>${row[colIdx.dosc] || '-'}</td>`;
        
        // Add graph-specific columns
        if (graphType === 'hypertension') {
            const bp = (row[colIdx.bp1] && row[colIdx.bp2]) ? `${row[colIdx.bp1]}/${row[colIdx.bp2]}` : '-';
            rowHtml += `<td>${bp}</td>`;
        } else if (graphType === 'obesity') {
            const bmi = row[colIdx.bmi] ? parseFloat(row[colIdx.bmi]).toFixed(2) : '-';
            rowHtml += `<td>${bmi}</td>`;
        } else if (graphType === 'diabetes') {
            const bs = (row[colIdx.bs1] || row[colIdx.bs2]) ? (row[colIdx.bs1] || row[colIdx.bs2]) : '-';
            rowHtml += `<td>${bs}</td>`;
        } else if (graphType === 'cholesterol') {
            rowHtml += `<td>${row[colIdx.chol] || '-'}</td>`;
        }
        
        rowHtml += `</tr>`;
        return rowHtml;
    }).join('');
    
    // Prepare data for Excel export
    const excelData = filteredRows.map(row => {
        const obj = {
            'Name': row[colIdx.name] || '-',
            'Employee ID': row[colIdx.emp] || '-',
            'Department': row[colIdx.dept] || '-',
            'Mobile': row[colIdx.phone] || '-',
            'DOS': row[colIdx.dosc] || '-'
        };
        
        if (graphType === 'hypertension') {
            obj['BP'] = (row[colIdx.bp1] && row[colIdx.bp2]) ? `${row[colIdx.bp1]}/${row[colIdx.bp2]}` : '-';
        } else if (graphType === 'obesity') {
            obj['BMI'] = row[colIdx.bmi] ? parseFloat(row[colIdx.bmi]).toFixed(2) : '-';
        } else if (graphType === 'diabetes') {
            obj['Blood Sugar'] = (row[colIdx.bs1] || row[colIdx.bs2]) ? (row[colIdx.bs1] || row[colIdx.bs2]) : '-';
        } else if (graphType === 'cholesterol') {
            obj['Cholesterol'] = row[colIdx.chol] || '-';
        }
        
        return obj;
    });
    
    const graphLabel = graphType.charAt(0).toUpperCase() + graphType.slice(1);
    const mainTitle = `${graphLabel} Report`;
    const subTitle = barCategory;
    
    // Generate the HTML content
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>${mainTitle} - ${subTitle}</title>
        <script src="https://unpkg.com/xlsx/dist/xlsx.full.min.js"></script>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; 
                background: #f8fafc;
                padding: 20px;
                color: #1e293b;
            }
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                margin-bottom: 20px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }
            .header h1 {
                font-size: 24px;
                margin-bottom: 4px;
                text-align: center;
            }
            .header h2 {
                font-size: 20px;
                font-weight: 600;
                opacity: 0.9;
                margin-bottom: 8px;
                text-align: center;
            }
            .header p {
                font-size: 14px;
                opacity: 0.9;
                text-align: center;
            }
            .actions {
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.3s ease;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .btn-excel {
                background: linear-gradient(135deg, #10b981, #059669);
                color: white;
            }
            .btn-excel:hover {
                background: linear-gradient(135deg, #059669, #047857);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(16, 185, 129, 0.3);
            }
            .btn-pdf {
                background: linear-gradient(135deg, #ef4444, #dc2626);
                color: white;
            }
            .btn-pdf:hover {
                background: linear-gradient(135deg, #dc2626, #b91c1c);
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3);
            }
            .table-container {
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                overflow-x: auto;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 13px;
            }
            thead {
                background: linear-gradient(135deg, #2563eb, #1e40af);
                color: white;
            }
            th {
                padding: 12px;
                text-align: left;
                font-weight: 600;
                white-space: nowrap;
            }
            td {
                padding: 10px 12px;
                border-bottom: 1px solid #e2e8f0;
            }
            tbody tr:hover {
                background-color: #f8fafc;
            }
            @media print {
                .actions { display: none; }
                .header { background: #667eea !important; -webkit-print-color-adjust: exact; }
                thead { background: #2563eb !important; -webkit-print-color-adjust: exact; }
                body { padding: 0; }
            }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>${mainTitle}</h1>
            <h2>${subTitle}</h2>
            <p>Total Employees: ${filteredRows.length}</p>
        </div>
        <div class="actions">
            <button class="btn btn-excel" onclick="exportToExcel()">Export to Excel</button>
            <button class="btn btn-pdf" onclick="window.print()">Export to PDF</button>
        </div>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Employee ID</th>
                        <th>Department</th>
                        <th>Mobile</th>
                        <th>DOS</th>
                        ${additionalHeaders.map(h => `<th>${h}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        <script>
            const tableData = ${JSON.stringify(excelData)};
            
            function exportToExcel() {
                const ws = XLSX.utils.json_to_sheet(tableData);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, 'User Report');
                XLSX.writeFile(wb, '${(subTitle + '_' + mainTitle).replace(/[^a-z0-9]/gi, '_')}.xlsx');
            }
        </script>
    </body>
    </html>
    `;
    
    // Use Blob URL approach to avoid popup blocking
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    
    // Try to open from the parent window if we're in a popup, otherwise use current window
    try {
        const popup = targetWindow.open(blobUrl, '_blank', 'width=1200,height=800');
        if (!popup || popup.closed || typeof popup.closed === 'undefined') {
            // Fallback: open in current window
            window.open(blobUrl, '_blank', 'width=1200,height=800');
        }
    } catch (e) {
        // If all else fails, open in current window
        window.open(blobUrl, '_blank', 'width=1200,height=800');
    }
    
    // Clean up the blob URL after a delay (give time for the window to load)
    setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
    }, 1000);
}