function calculateGenderData(data, header) {
    const genderCol = findCol(header, 'gender');
    if (genderCol === -1) return null;

    const counts = { 'Male': 0, 'Female': 0 };

    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const gender = (row[genderCol] || '').toString().toLowerCase().trim();
        
        if (gender.startsWith('m')) {
            counts.Male++;
        } else if (gender.startsWith('f')) {
            counts.Female++;
        }
    }

    // Return null if no gender data was found to avoid drawing an empty chart
    return (counts.Male === 0 && counts.Female === 0) ? null : counts;
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

        const bucketIdx = age < 30 ? 0 : age < 40 ? 1 : 2;
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

    const popup = window.open('', '_blank', 'width=1000,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">BMI & Obesity Classification</h2>
                <div style="height:450px;"><canvas id="mainChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('mainChart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(stages.map(s => s.name))},
                        datasets: [{
                            label: 'Participants',
                            data: ${JSON.stringify(stages.map(s => s.count))},
                            backgroundColor: ${JSON.stringify(stages.map(s => s.color))},
                            borderRadius: 5
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            </script>
        </body>`);
}

function calculateDiabetesData(data, header) {
    const fbsCol = findCol(header, 'bs1');
    const rbsCol = findCol(header, 'bs2');
    if (fbsCol === -1 && rbsCol === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };
    
    for (let i = 1; i < data.length; i++) {
        const fVal = parseFloat(data[i][fbsCol]);
        const rVal = parseFloat(data[i][rbsCol]);
        
        // Define what counts as "valid data" (not NaN and not 0)
        const hasF = !isNaN(fVal) && fVal > 0;
        const hasR = !isNaN(rVal) && rVal > 0;

        if (!hasF && !hasR) continue; // Skip row if both are missing/0

        let isDiabetic = false;

        // If Fasting exists, check it. If Random exists, check it.
        // If both exist, either one being high triggers 'Yes'.
        if (hasF && fVal >= 112) isDiabetic = true;
        if (hasR && rVal >= 202) isDiabetic = true;

        if (isDiabetic) {
            counts['Yes']++;
        } else {
            counts['No']++;
        }
    }
    
    return (counts['Yes'] + counts['No'] === 0) ? null : counts;
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

    const popup = window.open('', '_blank', 'width=900,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">Diabetes Risk Distribution</h2>
                <div style="height:450px;"><canvas id="mainChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('mainChart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(stages.map(s => s.name))},
                        datasets: [{
                            label: 'Participants',
                            data: ${JSON.stringify(stages.map(s => s.count))},
                            backgroundColor: ${JSON.stringify(stages.map(s => s.color))},
                            borderRadius: 5
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            </script>
        </body>`);
}

function calculateFitnessData(data, header) {
    const exe1Col = findCol(header, 'EXE1');
    const exe2Col = findCol(header, 'EXE2');
    const exe3Col = findCol(header, 'EXE3');

    // If columns aren't found, exit
    if (exe1Col === -1 && exe2Col === -1 && exe3Col === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };

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

        // Logic: More than 1 "Y" (meaning 2 or 3) counts as Yes/Fit
        if (personYCount > 1) {
            counts['Yes']++;
        } else {
            counts['No']++;
        }
    }

    // Return null if no data was processed to avoid empty charts
    return (counts['Yes'] === 0 && counts['No'] === 0) ? null : counts;
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
    const popup = window.open('', '_blank', 'width=1100,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">Fitness & Heart Rate Detailed Analysis</h2>
                <div style="height:450px;"><canvas id="fitnessChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('fitnessChart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(finalLabels)},
                        datasets: [{
                            label: 'Participants',
                            data: ${JSON.stringify(finalData)},
                            backgroundColor: ${JSON.stringify(finalColors)},
                            borderRadius: 5
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            </script>
        </body>`);
}

function calculateStressData(data, header) {
    const str1Col = findCol(header, 'STR1');
    const str2Col = findCol(header, 'STR2');
    const str3Col = findCol(header, 'STR3');
    const str4Col = findCol(header, 'STR4');

    // If none of the stress columns are found, exit
    if (str1Col === -1 && str2Col === -1 && str3Col === -1 && str4Col === -1) return null;

    const counts = { 'Yes': 0, 'No': 0 };

    // Start from index 1 to skip the header row
    for (let i = 1; i < data.length; i++) {
        const row = data[i];
        let personYCount = 0;

        // Check each column for a 'Y'
        const colsToCheck = [str1Col, str2Col, str3Col, str4Col];
        colsToCheck.forEach(colIdx => {
            if (colIdx !== -1 && row[colIdx]) {
                const val = row[colIdx].toString().toUpperCase().trim();
                if (val === 'Y') {
                    personYCount++;
                }
            }
        });

        // Threshold logic: More than 1 "Y" counts as Yes (Stressed)
        if (personYCount > 2) {
            counts['Yes']++;
        } else {
            counts['No']++;
        }
    }

    // Return null if no data was processed
    return (counts['Yes'] === 0 && counts['No'] === 0) ? null : counts;
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

    const popup = window.open('', '_blank', 'width=900,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f8fafc; padding:40px;">
            <div style="background:white; padding:25px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; color:#1e293b;">At-Risk & Unmedicated Population</h2>
                <p style="text-align:center; color:#64748b; margin-bottom:30px;">
                    Count of people with clinical conditions who reported <b>NOT</b> taking chronic medication.
                </p>
                <div style="height:400px;"><canvas id="chronicRiskChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('chronicRiskChart'), {
                    type: 'bar',
                    data: {
                        labels: ['Diabetes Risk', 'Hypertension Risk', 'High Cholesterol'],
                        datasets: [{
                            label: 'Unmedicated Participants',
                            data: [${counts.diabetes}, ${counts.hypertension}, ${counts.cholesterol}],
                            backgroundColor: ['#f87171', '#fb923c', '#fbbf24'],
                            borderRadius: 8
                        }]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { 
                            y: { beginAtZero: true, title: { display: true, text: 'Number of People' } } 
                        }
                    }
                });
            </script>
        </body>
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
        { id: 'hab3', name: 'Other Habits', color: '#f6c23e', isReversed: false }
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

    const popup = window.open('', '_blank', 'width=1100,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">Stressors & Lifestyle Risk Factors</h2>
                <div style="height:450px;"><canvas id="mainChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('mainChart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(indicators.map(i => i.name))},
                        datasets: [{
                            label: 'Count of Reported Issues',
                            data: ${JSON.stringify(indicators.map(i => i.count))},
                            backgroundColor: ${JSON.stringify(indicators.map(i => i.color))},
                            borderRadius: 5
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true } }
                    }
                });
            </script>
        </body>`);
}

function calculateHypertensionData(data, header) {
    const bpCol = findCol(header, 'bp');
    if (bpCol === -1) return null;

    const counts = { 'Normal': 0, 'High Risk': 0 };

    for (let i = 1; i < data.length; i++) {
        const bpValue = (data[i][bpCol] || '').toString();
        const parts = bpValue.split('/');
        const s = parseInt(parts[0]);
        const d = parseInt(parts[1]);

        if (!isNaN(s) && s > 0) {
            // If systolic >= 120 OR diastolic >= 80, it's High Risk (includes Pre-Hypertension)
            if (s >= 120 || (!isNaN(d) && d >= 80)) {
                counts['High Risk']++;
            } else {
                counts['Normal']++;
            }
        }
    }
    return (counts['Normal'] + counts['High Risk'] === 0) ? null : counts;
}

function openHypertensionPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;
    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const bp1Idx = findCol(header, 'bp1'), bp2Idx = findCol(header, 'bp2');

    const grades = [
        { name: 'Normal', color: '#1cc88a', check: (s, d) => (s >= 100 && s <= 120) || (d >= 65 && d <= 80), count: 0 },
        { name: 'Pre-HTN', color: '#f6c23e', check: (s, d) => (s >= 135 && s <= 140) || (d >= 85 && d <= 89), count: 0 },
        { name: 'Gr I HTN', color: '#fd7e14', check: (s, d) => (s >= 141 && s <= 159) || (d >= 90 && d <= 99), count: 0 },
        { name: 'Gr II HTN', color: '#e74a3b', check: (s, d) => (s >= 160 && s <= 179) || (d >= 100 && d <= 109), count: 0 },
        { name: 'Gr III HTN', color: '#851010', check: (s, d) => (s > 180 || d > 110), count: 0 }
    ];

    lastFilteredData.slice(1).forEach(row => {
        const s = parseFloat(row[bp1Idx]), d = parseFloat(row[bp2Idx]);
        if (isNaN(s) || isNaN(d)) return;
        for (let i = grades.length - 1; i >= 0; i--) {
            if (grades[i].check(s, d)) { grades[i].count++; break; }
        }
    });

    const popup = window.open('', '_blank', 'width=900,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">Hypertension Severity Distribution</h2>
                <div style="height:450px;"><canvas id="mainChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('mainChart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(grades.map(g => g.name))},
                        datasets: [{
                            label: 'Number of Participants',
                            data: ${JSON.stringify(grades.map(g => g.count))},
                            backgroundColor: ${JSON.stringify(grades.map(g => g.color))},
                            borderRadius: 5
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: { y: { beginAtZero: true, title: { display: true, text: 'Count' } } }
                    }
                });
            </script>
        </body>`);
}

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

function openPDetailsPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;

    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const pDetailsIdx = findCol(header, 'med_details');
    if (pDetailsIdx === -1) return alert("Medication/Chronic details column not found.");

    const rows = lastFilteredData.slice(1);
    const conditionCounts = {};
    let totalParticipantsWithConditions = 0;

    // 1. Extract and count unique conditions
    rows.forEach(row => {
        const details = (row[pDetailsIdx] || '').toString().trim();
        if (details && details.toLowerCase() !== 'no' && details !== '0') {
            totalParticipantsWithConditions++;
            const words = details.split(/[\s,]+/).map(w => w.toUpperCase().trim()).filter(w => w.length > 1);
            const uniqueWordsInRow = [...new Set(words)]; 
            
            uniqueWordsInRow.forEach(word => {
                conditionCounts[word] = (conditionCounts[word] || 0) + 1;
            });
        }
    });

    const sortedConditions = Object.entries(conditionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6); // Limit to top 6 to keep vertical bars readable

    if (sortedConditions.length === 0) return alert("No chronic conditions recorded in the data.");

    // 2. UI Generation (Updated to match standard popup style)
    const popup = window.open('', '_blank', 'width=900,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">Chronic Disease Risk Distribution</h2>
                <div style="height:450px;"><canvas id="mainChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('mainChart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(sortedConditions.map(c => c[0]))},
                        datasets: [{
                            label: 'Participants',
                            data: ${JSON.stringify(sortedConditions.map(c => c[1]))},
                            // Using a blue consistent with other primary charts
                            backgroundColor: '#4e73df',
                            borderRadius: 5
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false } 
                        },
                        scales: { 
                            y: { 
                                beginAtZero: true,
                                title: { display: true, text: 'Number of Reports' }
                            } 
                        }
                    }
                });
            </script>
        </body>`);
}

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
function openCholesterolPopup() {
    if (!lastFilteredData || lastFilteredData.length <= 1) return;

    const header = lastFilteredData[0].map(h => String(h || '').toLowerCase().trim());
    const cholIdx = findCol(header, 'cholesterol');
    
    if (cholIdx === -1) return alert("Cholesterol column not found.");

    // 1. Clinical Categories & Thresholds (mg/dL)
    const stages = [
        { name: 'Normal (<200)', color: '#1cc88a', check: (v) => v < 200, count: 0 },
        { name: 'Mild Hyper (200-239)', color: '#f6c23e', check: (v) => v >= 200 && v <= 239, count: 0 },
        { name: 'Moderate Hyper (240-299)', color: '#fd7e14', check: (v) => v >= 240 && v <= 299, count: 0 },
        { name: 'Hyper (≥300)', color: '#e74a3b', check: (v) => v >= 300, count: 0 }
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
    const popup = window.open('', '_blank', 'width=900,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">Hypercholesterolemia Classification</h2>
                <div style="height:450px;"><canvas id="cholChart"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('cholChart'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(stages.map(s => s.name))},
                        datasets: [{
                            label: 'Participants',
                            data: ${JSON.stringify(stages.map(s => s.count))},
                            backgroundColor: ${JSON.stringify(stages.map(s => s.color))},
                            borderRadius: 5
                        }]
                    },
                    options: { 
                        responsive: true, maintainAspectRatio: false,
                        plugins: { 
                            legend: { display: false },
                            tooltip: { callbacks: { label: (ctx) => 'Count: ' + ctx.raw } }
                        },
                        scales: { 
                            y: { beginAtZero: true, title: { display: true, text: 'No. of People' } } 
                        }
                    }
                });
            </script>
        </body>`);
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

    const popup = window.open('', '_blank', 'width=900,height=600');
    popup.document.write(`
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <body style="font-family:sans-serif; background:#f0f2f5; padding:30px;">
            <div style="background:white; padding:20px; border-radius:12px; box-shadow:0 4px 15px rgba(0,0,0,0.1);">
                <h2 style="text-align:center; margin-bottom:20px;">Age Distribution by Gender</h2>
                <div style="height:450px;"><canvas id="ageChartDetail"></canvas></div>
            </div>
            <script>
                new Chart(document.getElementById('ageChartDetail'), {
                    type: 'bar',
                    data: {
                        labels: ${JSON.stringify(labels)},
                        datasets: [
                            {
                                label: 'Male',
                                data: ${JSON.stringify(maleData)},
                                backgroundColor: '#4e73df',
                                borderColor: '#4e73df',
                                borderWidth: 1
                            },
                            {
                                label: 'Female',
                                data: ${JSON.stringify(femaleData)},
                                backgroundColor: '#fb7185',
                                borderColor: '#fb7185',
                                borderWidth: 1
                            }
                        ]
                    },
                    options: {
                        responsive: true, maintainAspectRatio: false,
                        scales: {
                            x: { stacked: false },
                            y: { beginAtZero: true, stacked: false, title: { display: true, text: 'Number of Participants' } }
                        }
                    }
                });
            </script>
        </body>
    `);
}