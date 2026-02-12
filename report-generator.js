/**
 * Main function called by the Group Profile button
 */
// #region agent log
fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'report-generator.js:load',message:'report-generator.js loaded',data:{ready:true},timestamp:Date.now()})}).catch(()=>{});
// #endregion agent log

// ─────────────────────────────────────────────────────────────
// HELPER: Render an ApexChart off-screen, capture its dataURI,
//         then destroy it.  Returns the base64 PNG string.
// ─────────────────────────────────────────────────────────────
async function _renderAndCapture(apexOptions, width = 700, height = 400) {
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:' + width + 'px;height:' + height + 'px;';
    document.body.appendChild(div);
    try {
        const chart = new ApexCharts(div, apexOptions);
        await chart.render();
        // Small delay to let the SVG settle
        await new Promise(r => setTimeout(r, 350));
        const { imgURI } = await chart.dataURI({ scale: 2 });
        chart.destroy();
        return imgURI || null;
    } catch (err) {
        console.error('_renderAndCapture error:', err);
        return null;
    } finally {
        div.remove();
    }
}

// ─────────────────────────────────────────────────────────────
// Generate popup-style chart images from the report data.
// These charts normally only exist inside window.open() popups,
// so we re-create them in hidden divs, capture, then destroy.
// Returns { tagName: base64PNG, … }
// ─────────────────────────────────────────────────────────────
async function capturePopupChartImages(reportData) {
    const images = {};
    if (!reportData || reportData.length <= 1) return images;

    const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
    const _col = (name) => header.findIndex(h => h.includes(name));
    const rows = reportData.slice(1);

    // ── 1. AGE / GENDER (grouped bar) ────────────────────────
    try {
        const ageCol = _col('age');
        const dobCol = _col('dob');
        const genderCol = _col('gender');
        if (genderCol !== -1 && (ageCol !== -1 || dobCol !== -1)) {
            const buckets = { 'Under 30': { M: 0, F: 0 }, '30-40': { M: 0, F: 0 }, '40+': { M: 0, F: 0 } };
            const parseAge = (a, d) => { const n = parseFloat(a); if (!isNaN(n) && n > 0 && n < 120) return n; const dt = new Date(d ?? a); if (!isNaN(dt)) { let y = new Date().getFullYear() - dt.getFullYear(); const md = new Date().getMonth() - dt.getMonth(); if (md < 0 || (md === 0 && new Date().getDate() < dt.getDate())) y--; return y >= 0 && y < 120 ? y : null; } return null; };
            rows.forEach(row => {
                const age = parseAge(ageCol !== -1 ? row[ageCol] : null, dobCol !== -1 ? row[dobCol] : null);
                if (age === null) return;
                const g = (row[genderCol] || '').toString().toLowerCase();
                const gk = g.startsWith('m') ? 'M' : g.startsWith('f') ? 'F' : null;
                if (!gk) return;
                const bk = age < 30 ? 'Under 30' : age <= 40 ? '30-40' : '40+';
                buckets[bk][gk]++;
            });
            const labels = Object.keys(buckets);
            const img = await _renderAndCapture({
                series: [{ name: 'Male', data: labels.map(l => buckets[l].M) }, { name: 'Female', data: labels.map(l => buckets[l].F) }],
                chart: { type: 'bar', height: 400, toolbar: { show: false }, animations: { enabled: false } },
                plotOptions: { bar: { borderRadius: 8, columnWidth: '60%', dataLabels: { position: 'top' } } },
                dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
                colors: ['#4e73df', '#fb7185'],
                xaxis: { categories: labels },
                yaxis: { title: { text: 'Count' } },
                legend: { position: 'top' }
            });
            if (img) { images['age_popup_chart_image'] = img; console.log('📸 Popup captured: age_popup_chart_image'); }
        }
    } catch (e) { console.error('❌ Age popup capture failed:', e); }

    // ── 2. OBESITY (bar) ─────────────────────────────────────
    try {
        const bmiIdx = _col('bmi');
        if (bmiIdx !== -1) {
            const stages = [
                { name: 'Underweight', color: '#36b9cc', check: v => v < 18.5, count: 0 },
                { name: 'Normal', color: '#1cc88a', check: v => v >= 18.5 && v <= 24.9, count: 0 },
                { name: 'Overweight', color: '#f6c23e', check: v => v >= 25.0 && v <= 29.9, count: 0 },
                { name: 'Obesity Gr 1', color: '#fd7e14', check: v => v >= 30.0 && v <= 34.9, count: 0 },
                { name: 'Obesity Gr 2', color: '#e74a3b', check: v => v >= 35.0 && v <= 39.9, count: 0 },
                { name: 'Grossly Obese', color: '#851010', check: v => v >= 40.0, count: 0 }
            ];
            rows.forEach(row => { const v = parseFloat(row[bmiIdx]); if (isNaN(v)) return; for (const s of stages) { if (s.check(v)) { s.count++; break; } } });
            const img = await _renderAndCapture({
                series: [{ name: 'Count', data: stages.map(s => s.count) }],
                chart: { type: 'bar', height: 400, toolbar: { show: false }, animations: { enabled: false } },
                plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: '70%', dataLabels: { position: 'top' } } },
                dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
                colors: stages.map(s => s.color),
                xaxis: { categories: stages.map(s => s.name) },
                yaxis: { title: { text: 'Count' } },
                legend: { show: false }
            });
            if (img) { images['obesity_popup_chart_image'] = img; console.log('📸 Popup captured: obesity_popup_chart_image'); }
        }
    } catch (e) { console.error('❌ Obesity popup capture failed:', e); }

    // ── 3. DIABETES (bar) ────────────────────────────────────
    try {
        const fbsIdx = _col('bs1');
        const rbsIdx = _col('bs2');
        if (fbsIdx !== -1 || rbsIdx !== -1) {
            const stages = [
                { name: 'Normal', color: '#1cc88a', count: 0 },
                { name: 'Pre-Diabetic', color: '#f6c23e', count: 0 },
                { name: 'Moderate', color: '#fd7e14', count: 0 },
                { name: 'Diabetic', color: '#e74a3b', count: 0 }
            ];
            rows.forEach(row => {
                const f = fbsIdx !== -1 ? parseFloat(row[fbsIdx]) : NaN;
                const r = rbsIdx !== -1 ? parseFloat(row[rbsIdx]) : NaN;
                if (isNaN(f) && isNaN(r)) return;
                if (f >= 130 || r >= 251) stages[3].count++;
                else if ((f >= 111 && f <= 129) || (r >= 201 && r <= 250)) stages[2].count++;
                else if ((f >= 101 && f <= 110) || (r >= 161 && r <= 200)) stages[1].count++;
                else stages[0].count++;
            });
            const img = await _renderAndCapture({
                series: [{ name: 'Count', data: stages.map(s => s.count) }],
                chart: { type: 'bar', height: 400, toolbar: { show: false }, animations: { enabled: false } },
                plotOptions: { bar: { borderRadius: 12, distributed: true, columnWidth: '70%', dataLabels: { position: 'top' } } },
                dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
                colors: stages.map(s => s.color),
                xaxis: { categories: stages.map(s => s.name) },
                yaxis: { title: { text: 'Count' } },
                legend: { show: false }
            });
            if (img) { images['diabetes_popup_chart_image'] = img; console.log('📸 Popup captured: diabetes_popup_chart_image'); }
        }
    } catch (e) { console.error('❌ Diabetes popup capture failed:', e); }

    // ── 4. HYPERTENSION (bar) ────────────────────────────────
    try {
        const bp1Idx = _col('bp1');
        const bp2Idx = _col('bp2');
        if (bp1Idx !== -1 && bp2Idx !== -1) {
            const grades = [
                { name: 'Normal', color: '#1cc88a', count: 0 },
                { name: 'Pre-HTN', color: '#f6c23e', count: 0 },
                { name: 'Grade I HTN', color: '#fd7e14', count: 0 },
                { name: 'Grade II HTN', color: '#e74a3b', count: 0 },
                { name: 'Grade III HTN', color: '#851010', count: 0 }
            ];
            rows.forEach(row => {
                const s = parseFloat(row[bp1Idx]), d = parseFloat(row[bp2Idx]);
                if (isNaN(s) || isNaN(d) || s <= 0 || d <= 0) return;
                if (s >= 180 || d >= 110) grades[4].count++;
                else if (s >= 160 || d >= 100) grades[3].count++;
                else if (s >= 140 || d >= 90) grades[2].count++;
                else if (s >= 121 || d >= 81) grades[1].count++;
                else grades[0].count++;
            });
            const img = await _renderAndCapture({
                series: [{ name: 'Count', data: grades.map(g => g.count) }],
                chart: { type: 'bar', height: 400, toolbar: { show: false }, animations: { enabled: false } },
                plotOptions: { bar: { borderRadius: 12, distributed: true, columnWidth: '70%', dataLabels: { position: 'top' } } },
                dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
                colors: grades.map(g => g.color),
                xaxis: { categories: grades.map(g => g.name) },
                yaxis: { title: { text: 'Count' } },
                legend: { show: false }
            });
            if (img) { images['hypertension_popup_chart_image'] = img; console.log('📸 Popup captured: hypertension_popup_chart_image'); }
        }
    } catch (e) { console.error('❌ Hypertension popup capture failed:', e); }

    // ── 5. CHOLESTEROL / DYSLIPIDEMIA (bar) ──────────────────
    try {
        const cholIdx = _col('cholesterol');
        if (cholIdx !== -1) {
            const stages = [
                { name: 'Normal', color: '#1cc88a', count: 0 },
                { name: 'Borderline', color: '#f6c23e', count: 0 },
                { name: 'Moderate', color: '#fd7e14', count: 0 },
                { name: 'Dyslipidemia', color: '#e74a3b', count: 0 }
            ];
            rows.forEach(row => {
                const v = parseFloat(row[cholIdx]);
                if (isNaN(v) || v <= 0) return;
                if (v >= 251) stages[3].count++;
                else if (v >= 220 && v <= 250) stages[2].count++;
                else if (v >= 201 && v <= 219) stages[1].count++;
                else stages[0].count++;
            });
            const img = await _renderAndCapture({
                series: [{ name: 'Count', data: stages.map(s => s.count) }],
                chart: { type: 'bar', height: 400, toolbar: { show: false }, animations: { enabled: false } },
                plotOptions: { bar: { borderRadius: 12, distributed: true, columnWidth: '70%', dataLabels: { position: 'top' } } },
                dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
                colors: stages.map(s => s.color),
                xaxis: { categories: stages.map(s => s.name) },
                yaxis: { title: { text: 'Count' } },
                legend: { show: false }
            });
            if (img) { images['cholesterol_popup_chart_image'] = img; console.log('📸 Popup captured: cholesterol_popup_chart_image'); }
        }
    } catch (e) { console.error('❌ Cholesterol popup capture failed:', e); }

    // ── 6. FITNESS (bar) ─────────────────────────────────────
    try {
        const metrics = [
            { id: 'exe1', name: 'Regular Exercise', color: '#1cc88a', type: 'binary', count: 0 },
            { id: 'breath', name: 'Good Lung Cap.', color: '#36b9cc', type: 'numeric', threshold: 30, isLess: false, count: 0 },
            { id: 'exe3', name: 'Good Strength', color: '#4e73df', type: 'binary', count: 0 },
            { id: 'exe2', name: 'Good Flexibility', color: '#858796', type: 'binary', count: 0 }
        ];
        const hrCats = [
            { name: 'HR: Resting (<60)', color: '#4e73df', check: v => v < 60, count: 0 },
            { name: 'HR: Normal (60-100)', color: '#1cc88a', check: v => v >= 60 && v <= 100, count: 0 },
            { name: 'HR: High (101-120)', color: '#f6c23e', check: v => v >= 101 && v <= 120, count: 0 },
            { name: 'HR: Tachy (>120)', color: '#e74a3b', check: v => v > 120, count: 0 }
        ];
        const pulseIdx = _col('pulse');
        rows.forEach(row => {
            metrics.forEach(m => { const ci = _col(m.id); if (ci === -1) return; const rv = (row[ci] || '').toString().trim(); if (m.type === 'binary' && rv.toUpperCase().startsWith('Y')) m.count++; if (m.type === 'numeric') { const v = parseFloat(rv); if (!isNaN(v) && (m.isLess ? v < m.threshold : v >= m.threshold)) m.count++; } });
            if (pulseIdx !== -1) { const pv = parseFloat(row[pulseIdx]); if (!isNaN(pv)) { for (const c of hrCats) { if (c.check(pv)) { c.count++; break; } } } }
        });
        const allItems = [...metrics, ...hrCats];
        const img = await _renderAndCapture({
            series: [{ name: 'Count', data: allItems.map(i => i.count) }],
            chart: { type: 'bar', height: 450, toolbar: { show: false }, animations: { enabled: false } },
            plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: '65%', dataLabels: { position: 'top' } } },
            dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '12px', fontWeight: 600, colors: ['#1e293b'] } },
            colors: allItems.map(i => i.color),
            xaxis: { categories: allItems.map(i => i.name), labels: { rotate: -45, rotateAlways: true, style: { fontSize: '10px' } } },
            yaxis: { title: { text: 'Count' } },
            legend: { show: false }
        }, 800, 450);
        if (img) { images['fitness_popup_chart_image'] = img; console.log('📸 Popup captured: fitness_popup_chart_image'); }
    } catch (e) { console.error('❌ Fitness popup capture failed:', e); }

    // ── 7a. STRESS (STR1-4 bar) ──────────────────────────────
    try {
        const stressInds = [
            { id: 'str1', name: 'Work Stress', color: '#e74a3b', isReversed: false },
            { id: 'str2', name: 'Family Stress', color: '#e74a3b', isReversed: false },
            { id: 'str3', name: 'Financial Stress', color: '#e74a3b', isReversed: false },
            { id: 'str4', name: 'Poor Sleep', color: '#e74a3b', isReversed: true }
        ];
        stressInds.forEach(ind => {
            const ci = _col(ind.id); ind.count = 0;
            if (ci !== -1) { rows.forEach(row => { const v = (row[ci] || '').toString().toUpperCase().trim(); if (!ind.isReversed && v.startsWith('Y')) ind.count++; else if (ind.isReversed && v.startsWith('N')) ind.count++; }); }
        });
        const img = await _renderAndCapture({
            series: [{ name: 'Count', data: stressInds.map(i => i.count) }],
            chart: { type: 'bar', height: 450, toolbar: { show: false }, animations: { enabled: false } },
            plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: '65%', dataLabels: { position: 'top' } } },
            dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
            colors: stressInds.map(i => i.color),
            xaxis: { categories: stressInds.map(i => i.name), labels: { rotate: -45, rotateAlways: true, style: { fontSize: '10px' } } },
            yaxis: { title: { text: 'Count' } },
            legend: { show: false }
        }, 800, 450);
        if (img) { images['stress_popup_chart_image'] = img; console.log('📸 Popup captured: stress_popup_chart_image'); }
    } catch (e) { console.error('❌ Stress popup capture failed:', e); }

    // ── 7b. HABITS (HAB1-4 bar) ────────────────────────────
    try {
        const habitsInds = [
            { id: 'hab1', name: 'Smoking', color: '#f6c23e', isReversed: false },
            { id: 'hab2', name: 'Alcohol', color: '#f6c23e', isReversed: false },
            { id: 'hab3', name: 'Oral Tobacco', color: '#f6c23e', isReversed: false },
            { id: 'hab4', name: 'Poor Safety', color: '#f6c23e', isReversed: true }
        ];
        habitsInds.forEach(ind => {
            const ci = _col(ind.id); ind.count = 0;
            if (ci !== -1) { rows.forEach(row => { const v = (row[ci] || '').toString().toUpperCase().trim(); if (!ind.isReversed && v.startsWith('Y')) ind.count++; else if (ind.isReversed && v.startsWith('N')) ind.count++; }); }
        });
        const img = await _renderAndCapture({
            series: [{ name: 'Count', data: habitsInds.map(i => i.count) }],
            chart: { type: 'bar', height: 450, toolbar: { show: false }, animations: { enabled: false } },
            plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: '65%', dataLabels: { position: 'top' } } },
            dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
            colors: habitsInds.map(i => i.color),
            xaxis: { categories: habitsInds.map(i => i.name), labels: { rotate: -45, rotateAlways: true, style: { fontSize: '10px' } } },
            yaxis: { title: { text: 'Count' } },
            legend: { show: false }
        }, 800, 450);
        if (img) { images['habits_popup_chart_image'] = img; console.log('📸 Popup captured: habits_popup_chart_image'); }
    } catch (e) { console.error('❌ Habits popup capture failed:', e); }

    // ── 7c. NUTRITION (NUT1-4 bar) ─────────────────────────
    try {
        const nutInds = [
            { id: 'nut1', name: 'Fruits & Vegetables', color: '#1cc88a', isReversed: false },
            { id: 'nut2', name: 'Milk/Curd/Eggs', color: '#36b9cc', isReversed: false },
            { id: 'nut3', name: 'Water', color: '#4e73df', isReversed: false },
            { id: 'nut4', name: 'Commercial Foods', color: '#858796', isReversed: true }
        ];
        nutInds.forEach(ind => {
            const ci = _col(ind.id); ind.count = 0;
            if (ci !== -1) { rows.forEach(row => { const v = (row[ci] || '').toString().toUpperCase().trim(); if (!ind.isReversed && v.startsWith('Y')) ind.count++; else if (ind.isReversed && v.startsWith('N')) ind.count++; }); }
        });
        const img = await _renderAndCapture({
            series: [{ name: 'Count', data: nutInds.map(i => i.count) }],
            chart: { type: 'bar', height: 450, toolbar: { show: false }, animations: { enabled: false } },
            plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: '65%', dataLabels: { position: 'top' } } },
            dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
            colors: nutInds.map(i => i.color),
            xaxis: { categories: nutInds.map(i => i.name), labels: { style: { fontSize: '12px' } } },
            yaxis: { title: { text: 'Count' } },
            legend: { show: false }
        }, 800, 450);
        if (img) { images['nutrition_popup_chart_image'] = img; console.log('📸 Popup captured: nutrition_popup_chart_image'); }
    } catch (e) { console.error('❌ Nutrition popup capture failed:', e); }

    // ── 7d. EXERCISE (EXE1-3 bar) ──────────────────────────
    try {
        const exeInds = [
            { id: 'exe1', name: 'Daily Exercise', color: '#1cc88a', isReversed: false },
            { id: 'exe2', name: 'Toe Touch', color: '#858796', isReversed: false },
            { id: 'exe3', name: 'Push Ups', color: '#4e73df', isReversed: false }
        ];
        exeInds.forEach(ind => {
            const ci = _col(ind.id); ind.count = 0;
            if (ci !== -1) { rows.forEach(row => { const v = (row[ci] || '').toString().toUpperCase().trim(); if (v.startsWith('Y')) ind.count++; }); }
        });
        const img = await _renderAndCapture({
            series: [{ name: 'Count', data: exeInds.map(i => i.count) }],
            chart: { type: 'bar', height: 450, toolbar: { show: false }, animations: { enabled: false } },
            plotOptions: { bar: { borderRadius: 10, distributed: true, columnWidth: '65%', dataLabels: { position: 'top' } } },
            dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
            colors: exeInds.map(i => i.color),
            xaxis: { categories: exeInds.map(i => i.name), labels: { style: { fontSize: '12px' } } },
            yaxis: { title: { text: 'Count' } },
            legend: { show: false }
        }, 800, 450);
        if (img) { images['exercise_popup_chart_image'] = img; console.log('📸 Popup captured: exercise_popup_chart_image'); }
    } catch (e) { console.error('❌ Exercise popup capture failed:', e); }

    // ── 8. CHRONIC DISEASE (horizontal bar) ──────────────────
    try {
        const condCols = [
            { id: 'art', name: 'Arthritis' }, { id: 'spo', name: 'Spondylitis' },
            { id: 'bac', name: 'Back Ache' }, { id: 'muscu_oth', name: 'Musculo Other' }
        ];
        const condMap = {};
        condCols.forEach(cc => {
            const ci = _col(cc.id); if (ci === -1) return;
            let cnt = 0;
            rows.forEach(row => { const v = String(row[ci] || '').trim(); if (cc.id === 'muscu_oth' ? v !== '' : v.toUpperCase().startsWith('Y')) cnt++; });
            if (cnt > 0) condMap[cc.name] = cnt;
        });
        const sorted = Object.entries(condMap).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) {
            const img = await _renderAndCapture({
                series: [{ name: 'Count', data: sorted.map(s => s[1]) }],
                chart: { type: 'bar', height: Math.min(500, 40 * sorted.length + 160), toolbar: { show: false }, animations: { enabled: false } },
                plotOptions: { bar: { horizontal: true, borderRadius: 10, barHeight: '70%', dataLabels: { position: 'top' } } },
                dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetX: 8, style: { fontSize: '12px', fontWeight: 600, colors: ['#1e293b'] } },
                colors: ['#4e73df'],
                xaxis: { title: { text: 'Number of Reports' } },
                yaxis: { categories: sorted.map(s => s[0]) },
                legend: { show: false }
            }, 800, Math.min(500, 40 * sorted.length + 160));
            if (img) { images['chronic_popup_chart_image'] = img; console.log('📸 Popup captured: chronic_popup_chart_image'); }
        }
    } catch (e) { console.error('❌ Chronic popup capture failed:', e); }

    // ── 9. MEDICATION / AT-RISK UNMEDICATED (bar) ────────────
    try {
        const medIdx = _col('medication');
        const fbsIdx = _col('bs1');
        const rbsIdx = _col('bs2');
        const bp1Idx = _col('bp1');
        const cholIdx = _col('cholesterol');
        if (medIdx !== -1) {
            const counts = { diabetes: 0, hypertension: 0, cholesterol: 0 };
            rows.forEach(row => {
                if (String(row[medIdx]).toUpperCase() !== 'N') return;
                const fbs = parseFloat(row[fbsIdx]), rbs = parseFloat(row[rbsIdx]);
                const sys = parseFloat(row[bp1Idx]), chol = parseFloat(row[cholIdx]);
                if (fbs >= 126 || rbs >= 200) counts.diabetes++;
                if (sys >= 140) counts.hypertension++;
                if (chol >= 200) counts.cholesterol++;
            });
            const labels = ['Diabetes', 'Hypertension', 'Cholesterol'];
            const data = [counts.diabetes, counts.hypertension, counts.cholesterol];
            const img = await _renderAndCapture({
                series: [{ name: 'Count', data: data }],
                chart: { type: 'bar', height: 400, toolbar: { show: false }, animations: { enabled: false } },
                plotOptions: { bar: { borderRadius: 12, distributed: true, columnWidth: '60%', dataLabels: { position: 'top' } } },
                dataLabels: { enabled: true, formatter: function(val) { return val; }, offsetY: -20, style: { fontSize: '14px', fontWeight: 600, colors: ['#1e293b'] } },
                colors: ['#e74a3b', '#fd7e14', '#f6c23e'],
                xaxis: { categories: labels },
                yaxis: { title: { text: 'Count' } },
                legend: { show: false }
            });
            if (img) { images['medication_popup_chart_image'] = img; console.log('📸 Popup captured: medication_popup_chart_image'); }
        }
    } catch (e) { console.error('❌ Medication popup capture failed:', e); }

    console.log(`📊 Popup chart capture complete: ${Object.keys(images).length}/9 popup charts captured`);
    return images;
}

async function generateUserReport() {
    console.log('📋 generateUserReport() called');
    
    const userReportInput = document.getElementById('monthPicker');
    const groupProfileInput = document.getElementById('groupProfile');

    console.log('📅 Date inputs:', {
        monthPicker: userReportInput ? userReportInput.value : 'NOT FOUND',
        groupProfile: groupProfileInput ? groupProfileInput.value : 'NOT FOUND'
    });

    const userDateValue = userReportInput ? userReportInput.value : '';
    const wordDateValue = groupProfileInput ? groupProfileInput.value : '';

    // Initialize all report variables at function level
    let m_per = "0";
    let f_per = "0";
    let borderline_hyperlipidemia_pct = "0";
    let moderate_hyperlipidemia_pct = "0";
    let hyperlipidemia_pct = "0";

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'report-generator.js:generateUserReport',message:'generateUserReport called',data:{userDateValue,wordDateValue,hasHeaderRow:!!window.headerRow,hasFilterFn:typeof window.filterDataBySpecificRange},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

    if (!userDateValue && !wordDateValue) {
        console.warn('⚠️ No date range selected');
        alert("Please select a date range in the 'Group Profile' date picker before generating the report.");
        return;
    }

    // --- DATA GRID LOGIC ---
    if (userDateValue) {
        const gridData = filterDataBySpecificRange(userDateValue);
        if (gridData.length > 1) openDataGridPopup(gridData, userDateValue);
        else alert("No records for the grid date range.");
    }

    // --- WORD DOCUMENT LOGIC ---
    if (wordDateValue) {
        const reportData = filterDataBySpecificRange(wordDateValue);
        
        if (!reportData || reportData.length <= 1) {
            alert(`No records found for: ${wordDateValue}`);
        } else {
            const employeeCount = reportData.length - 1;

            // 1. Calculate Gender Percentages


            // #region agent log
            fetch('http://1.27.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'report-generator.js:pre-gender-calc',message:'Starting gender calculation',data:{employeeCount:employeeCount,reportDataLength:reportData.length},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const genderCol = header.findIndex(h => h.includes('gender'));
                let maleCount = 0;
                let femaleCount = 0;

                if (genderCol !== -1) {
                    for (let i = 1; i < reportData.length; i++) {
                        const gender = (reportData[i][genderCol] || '').toString().toLowerCase();
                        if (gender.startsWith('m')) maleCount++;
                        else if (gender.startsWith('f')) femaleCount++;
                    }
                }

                m_per = ((maleCount / employeeCount) * 100).toFixed(1);
                f_per = ((femaleCount / employeeCount) * 100).toFixed(1);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'report-generator.js:gender-calc-done',message:'Gender calculation completed',data:{maleCount:maleCount,femaleCount:femaleCount,m_per:m_per,f_per:f_per},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // 1.5. Calculate Age Distribution Percentages
            let under_30_per = "0";
            let age_31_40_pct = "0";
            let under_40_per = "0";
            let age_40_plus_pct = "0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const ageCol = header.findIndex(h => h.includes('age'));
                const dobCol = header.findIndex(h => h.includes('date') && h.includes('birth') || h.includes('dob'));

                let under30Count = 0;
                let age3140Count = 0;
                let age40PlusCount = 0;

                if (ageCol !== -1 || dobCol !== -1) {
                    const parseAge = (ageVal, dobVal) => {
                        const asNumber = parseFloat(ageVal);
                        if (!isNaN(asNumber) && asNumber > 0 && asNumber < 150) return asNumber;

                        const rawDate = dobVal ?? ageVal;
                        if (!rawDate) return null;

                        try {
                            const birthDate = new Date(rawDate);
                            if (isNaN(birthDate.getTime())) return null;
                            const today = new Date();
                            let age = today.getFullYear() - birthDate.getFullYear();
                            const monthDiff = today.getMonth() - birthDate.getMonth();
                            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                                age--;
                            }
                            return age > 0 && age < 150 ? age : null;
                        } catch {
                            return null;
                        }
                    };

                    for (let i = 1; i < reportData.length; i++) {
                        const age = parseAge(
                            ageCol !== -1 ? reportData[i][ageCol] : null,
                            dobCol !== -1 ? reportData[i][dobCol] : null
                        );

                        if (age === null) continue;

                        if (age < 30) under30Count++;
                        else if (age >= 31 && age <= 40) age3140Count++;
                        else if (age >= 40) age40PlusCount++;
                    }
                }

                under_30_per = ((under30Count / employeeCount) * 100).toFixed(1);
                age_31_40_pct = ((age3140Count / employeeCount) * 100).toFixed(1);
                under_40_per = (((under30Count + age3140Count) / employeeCount) * 100).toFixed(1);
                age_40_plus_pct = ((age40PlusCount / employeeCount) * 100).toFixed(1);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'report-generator.js:age-calc-done',message:'Age distribution calculation completed',data:{under30Count:under30Count,age3140Count:age3140Count,age40PlusCount:age40PlusCount,under_30_per:under_30_per,age_31_40_pct:age_31_40_pct,under_40_per:under_40_per,age_40_plus_pct:age_40_plus_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // 1.6. Calculate Descent/Ethnicity Percentages
            let asian_descent_pct = "0";
            let middle_eastern_pct = "0";
            let african_descent_pct = "0";
            let european_descent_pct = "0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const descentCol = header.findIndex(h => h.includes('descent'));

                let asianCount = 0;
                let middleEasternCount = 0;
                let africanCount = 0;
                let europeanCount = 0;

                if (descentCol !== -1) {
                    for (let i = 1; i < reportData.length; i++) {
                        const descent = String(reportData[i][descentCol] || '').toLowerCase().trim();

                        if (descent.includes('asian')) asianCount++;
                        else if (descent.includes('middle') && descent.includes('east')) middleEasternCount++;
                        else if (descent.includes('african')) africanCount++;
                        else if (descent.includes('european')) europeanCount++;
                    }
                }

                // Always calculate percentages, even if descent column not found (counts will be 0)
                asian_descent_pct = ((asianCount / employeeCount) * 100).toFixed(1);
                middle_eastern_pct = ((middleEasternCount / employeeCount) * 100).toFixed(1);
                african_descent_pct = ((africanCount / employeeCount) * 100).toFixed(1);
                european_descent_pct = ((europeanCount / employeeCount) * 100).toFixed(1);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H5',location:'report-generator.js:descent-calc-done',message:'Descent distribution calculation completed',data:{asianCount:asianCount,middleEasternCount:middleEasternCount,africanCount:africanCount,europeanCount:europeanCount,asian_descent_pct:asian_descent_pct,middle_eastern_pct:middle_eastern_pct,african_descent_pct:african_descent_pct,european_descent_pct:european_descent_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // 1.7. Calculate BMI/Weight Classification Percentages
            let underweight_bmi_pct = "0";
            let normal_weight_pct = "0";
            let overweight_bmi_pct = "0";
            let obese_total_pct = "0";
            let obese_grade1_pct = "0";
            let obese_grade2_pct = "0";
            let obese_gross_pct = "0";
            let bmi_above_25_1_pct = "0"; // Percentage for BMI above 25.1

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const bmiCol = header.findIndex(h => h.includes('bmi'));

                let underweightCount = 0;
                let normalWeightCount = 0;
                let overweightCount = 0;
                let obeseTotalCount = 0;
                let obeseGrade1Count = 0;
                let obeseGrade2Count = 0;
                let obeseGrossCount = 0;
                let bmiAbove25_1Count = 0;
                if (bmiCol !== -1) {
                    for (let i = 1; i < reportData.length; i++) {
                        const bmiValue = parseFloat(reportData[i][bmiCol]);
                        if (isNaN(bmiValue) || bmiValue <= 0) continue;

                        if (bmiValue < 18.9) underweightCount++;
                        else if (bmiValue >= 19 && bmiValue <= 25) normalWeightCount++;
                        else if (bmiValue >= 25.1 && bmiValue <= 29.9) overweightCount++;
                        else if (bmiValue >= 30) {
                            obeseTotalCount++;
                            if (bmiValue >= 30 && bmiValue <= 35) obeseGrade1Count++;
                            else if (bmiValue >= 35.1 && bmiValue <= 39.9) obeseGrade2Count++;
                            else if (bmiValue >= 40) obeseGrossCount++;
                        }

                        if (bmiValue >= 25.1) { // Check for BMI above 25.1
                            bmiAbove25_1Count++;
                        }
                    }
                }

                // Always calculate percentages, even if BMI column not found (counts will be 0)
                underweight_bmi_pct = ((underweightCount / employeeCount) * 100).toFixed(1);
                normal_weight_pct = ((normalWeightCount / employeeCount) * 100).toFixed(1);
                overweight_bmi_pct = ((overweightCount / employeeCount) * 100).toFixed(1);
                obese_total_pct = ((obeseTotalCount / employeeCount) * 100).toFixed(1);
                obese_grade1_pct = ((obeseGrade1Count / employeeCount) * 100).toFixed(1);
                obese_grade2_pct = ((obeseGrade2Count / employeeCount) * 100).toFixed(1);
                obese_gross_pct = ((obeseGrossCount / employeeCount) * 100).toFixed(1);
                bmi_above_25_1_pct = ((bmiAbove25_1Count / employeeCount) * 100).toFixed(1); // Calculate new percentage

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'report-generator.js:bmi-calc-done',message:'BMI classification calculation completed',data:{underweightCount:underweightCount,normalWeightCount:normalWeightCount,overweightCount:overweightCount,obeseTotalCount:obeseTotalCount,obeseGrade1Count:obeseGrade1Count,obeseGrade2Count:obeseGrade2Count,obeseGrossCount:obeseGrossCount,bmiAbove25_1Count:bmiAbove25_1Count,underweight_bmi_pct:underweight_bmi_pct,normal_weight_pct:normal_weight_pct,overweight_bmi_pct:overweight_bmi_pct,obese_total_pct:obese_total_pct,obese_grade1_pct:obese_grade1_pct,obese_grade2_pct:obese_grade2_pct,obese_gross_pct:obese_gross_pct,bmi_above_25_1_pct:bmi_above_25_1_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // 1.8. Calculate Stress & Presenteeism Percentages
            let overall_stress_pct = "0";
            let home_social_stress_pct = "0";
            let work_related_stress_pct = "0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const str1Col = header.findIndex(h => h.includes('str1'));
                const str2Col = header.findIndex(h => h.includes('str2'));
                const str3Col = header.findIndex(h => h.includes('str3'));
                const str4Col = header.findIndex(h => h.includes('str4'));

                let highStressCount = 0;
                let homeSocialStressCount = 0;
                let workRelatedStressCount = 0;

                if (str1Col !== -1 && str2Col !== -1 && str3Col !== -1 && str4Col !== -1) {
                    for (let i = 1; i < reportData.length; i++) {
                        let stressScore = 0;
                        if (String(reportData[i][str3Col] || '').toLowerCase().trim() === 'y') stressScore += 3;
                        if (String(reportData[i][str4Col] || '').toLowerCase().trim() === 'n') stressScore += 2;
                        if (String(reportData[i][str1Col] || '').toLowerCase().trim() === 'n') stressScore += 1;
                        if (String(reportData[i][str2Col] || '').toLowerCase().trim() === 'n') stressScore += 1;

                        if (stressScore >= 3) highStressCount++;

                        if (String(reportData[i][str2Col] || '').toLowerCase().trim() === 'n') homeSocialStressCount++;
                        if (String(reportData[i][str1Col] || '').toLowerCase().trim() === 'n') workRelatedStressCount++;
                    }
                }

                overall_stress_pct = ((highStressCount / employeeCount) * 100).toFixed(1);
                // Placeholder values for now
                home_social_stress_pct = ((homeSocialStressCount / employeeCount) * 100).toFixed(1);
                work_related_stress_pct = ((workRelatedStressCount / employeeCount) * 100).toFixed(1);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H7',location:'report-generator.js:stress-calc-done',message:'Stress calculation completed',data:{highStressCount:highStressCount,overall_stress_pct:overall_stress_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // 1.9. Calculate Habits (Tobacco & Alcohol) Percentages
            let tobacco_use_pct = "0";
            let alcohol_consumption_pct = "0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const hab1Col = header.findIndex(h => h.includes('hab1'));
                const hab2Col = header.findIndex(h => h.includes('hab2'));
                const hab3Col = header.findIndex(h => h.includes('hab3'));

                let tobaccoUseCount = 0;
                let alcoholConsumptionCount = 0;

                if (hab1Col !== -1 || hab2Col !== -1 || hab3Col !== -1) {
                    for (let i = 1; i < reportData.length; i++) {
                        // Tobacco Use (HAB2 or HAB3 is 'Y')
                        const hab2Val = String(reportData[i][hab2Col] || '').toLowerCase().trim();
                        const hab3Val = String(reportData[i][hab3Col] || '').toLowerCase().trim();
                        if ((hab2Col !== -1 && hab2Val === 'y') || (hab3Col !== -1 && hab3Val === 'y')) {
                            tobaccoUseCount++;
                        }

                        // Alcohol Consumption (HAB1 is 'Y')
                        const hab1Val = String(reportData[i][hab1Col] || '').toLowerCase().trim();
                        if (hab1Col !== -1 && hab1Val === 'y') {
                            alcoholConsumptionCount++;
                        }
                    }
                }

                // Always calculate percentages, even if columns not found (counts will be 0)
                tobacco_use_pct = ((tobaccoUseCount / employeeCount) * 100).toFixed(1);
                alcohol_consumption_pct = ((alcoholConsumptionCount / employeeCount) * 100).toFixed(1);

                // #endregion agent log
            }

            // 1.10. Calculate Chronic Ailments and Medication Percentages
            let chronic_ailments_pct = "0";
            let medication_total_pct = "0";
            let medication_diabetes_pct = "0";
            let medication_hypertension_pct = "0";
            let medication_dyslipidemia_pct = "0";
            let medication_musculoskeletal_pct = "0";
            let medication_other_pct = "0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const artCol = header.findIndex(h => h.includes('art'));
                const spoCol = header.findIndex(h => h.includes('spo'));
                const bacCol = header.findIndex(h => h.includes('bac'));
                const muscuOthCol = header.findIndex(h => h.includes('muscu_oth'));
                const medDetailsCol = header.findIndex(h => h.includes('med_details'));
                const medicationCol = header.findIndex(h => h.includes('medication'));

                let chronicAilmentsCount = 0;
                let medicationTotalCount = 0;
                let medicationDiabetesCount = 0;
                let medicationHypertensionCount = 0;
                let medicationDyslipidemiaCount = 0;
                let medicationMusculoskeletalCount = 0;
                let medicationOtherCount = 0;

                for (let i = 1; i < reportData.length; i++) {
                    const row = reportData[i];
                    let hasChronicAilment = false;
                    let isOnMedication = false;

                    // Check for Chronic Ailments
                    if (artCol !== -1 && String(row[artCol] || '').toLowerCase().trim() === 'y') hasChronicAilment = true;
                    if (spoCol !== -1 && String(row[spoCol] || '').toLowerCase().trim() === 'y') hasChronicAilment = true;
                    if (bacCol !== -1 && String(row[bacCol] || '').toLowerCase().trim() === 'y') hasChronicAilment = true;
                    if (muscuOthCol !== -1 && String(row[muscuOthCol] || '').trim() !== '') hasChronicAilment = true; // Any value in MUSCU_OTH

                    if (medDetailsCol !== -1) {
                        const medDetails = String(row[medDetailsCol] || '').toLowerCase().trim();
                        if (medDetails.includes('stroke') || medDetails.includes('neurology')) hasChronicAilment = true;
                    }

                    if (hasChronicAilment) chronicAilmentsCount++;

                    // Check for Medication (total)
                    if (medicationCol !== -1 && String(row[medicationCol] || '').toLowerCase().trim() === 'y') {
                        medicationTotalCount++;
                        isOnMedication = true;
                        console.log(`Row ${i} is on medication. MED_DETAILS: '${String(row[medDetailsCol] || '')}'`);
                    }

                    // Check for Medication sub-categories if on medication
                    if (isOnMedication && medDetailsCol !== -1) {
                        console.log(`Processing row ${i} for medication.`);
                        console.log(`medDetailsCol: ${medDetailsCol}`);
                        const medDetails = String(row[medDetailsCol] || '').toLowerCase().trim();
                        console.log(`MED_DETAILS content: '${medDetails}'`);
                        let foundSpecificMedication = false;

                        if (medDetails.includes('diabetes')) {
                            medicationDiabetesCount++;
                            foundSpecificMedication = true;
                        }
                        if (medDetails.includes('bp') || medDetails.includes('hypertension')) {
                            medicationHypertensionCount++;
                            foundSpecificMedication = true;
                        }
                        if (medDetails.includes('cholesterol') || medDetails.includes('dyslipidemia') || medDetails.includes('lipid')) {
                            medicationDyslipidemiaCount++;
                            foundSpecificMedication = true;
                            console.log(`Dyslipidemia medication found in row ${i}. Current count: ${medicationDyslipidemiaCount}. MED_DETAILS: '${medDetails}'`);
                        }

                        // Musculo-skeletal check remains the same as it's based on other columns/fields
                        if (
                            (artCol !== -1 && String(row[artCol] || '').toLowerCase().trim() === 'y') ||
                            (spoCol !== -1 && String(row[spoCol] || '').toLowerCase().trim() === 'y') ||
                            (bacCol !== -1 && String(row[bacCol] || '').toLowerCase().trim() === 'y') ||
                            (muscuOthCol !== -1 && String(row[muscuOthCol] || '').trim() !== '')
                        ) {
                            medicationMusculoskeletalCount++;
                            foundSpecificMedication = true; // Mark as found if musculoskeletal is true
                        }

                        if (!foundSpecificMedication) {
                            medicationOtherCount++;
                        }
                    }
                }

                chronic_ailments_pct = ((chronicAilmentsCount / employeeCount) * 100).toFixed(1);
                medication_total_pct = ((medicationTotalCount / employeeCount) * 100).toFixed(1);
                medication_diabetes_pct = ((medicationDiabetesCount / employeeCount) * 100).toFixed(1);
                medication_hypertension_pct = ((medicationHypertensionCount / employeeCount) * 100).toFixed(1);
                medication_dyslipidemia_pct = ((medicationDyslipidemiaCount / employeeCount) * 100).toFixed(1);
                medication_musculoskeletal_pct = ((medicationMusculoskeletalCount / employeeCount) * 100).toFixed(1);
                medication_other_pct = ((medicationOtherCount / employeeCount) * 100).toFixed(1);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H9',location:'report-generator.js:chronic-medication-calc-done',message:'Chronic Ailments and Medication calculation completed',data:{chronicAilmentsCount:chronicAilmentsCount,medicationTotalCount:medicationTotalCount,medicationDiabetesCount:medicationDiabetesCount,medicationHypertensionCount:medicationHypertensionCount,medicationDyslipidemiaCount:medicationDyslipidemiaCount,medicationMusculoskeletalCount:medicationMusculoskeletalCount,medicationOtherCount:medicationOtherCount,chronic_ailments_pct:chronic_ailments_pct,medication_total_pct:medication_total_pct,medication_diabetes_pct:medication_diabetes_pct,medication_hypertension_pct:medication_hypertension_pct,medication_dyslipidemia_pct:medication_dyslipidemia_pct,medication_musculoskeletal_pct:medication_musculoskeletal_pct,medication_other_pct:medication_other_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            } 

    

            // 1.11. Calculate Diabetic Percentages
            let fbs_pre_pct = "0.0";
            let fbs_mod_pct = "0.0";
            let fbs_dia_pct = "0.0";
            let rbs_pre_pct = "0.0";
            let rbs_mod_pct = "0.0";
            let rbs_dia_pct = "0.0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const fbsCol = header.findIndex(h => h.includes('fasting') || h.includes('bs1'));
                const rbsCol = header.findIndex(h => h.includes('random') || h.includes('bs2'));

                let fastingCount = { pre: 0, moderate: 0, diabetic: 0 };
                let randomCount = { pre: 0, moderate: 0, diabetic: 0 };
                let totalValidFasting = 0;
                let totalValidRandom = 0;

                for (let i = 1; i < reportData.length; i++) {
                    const row = reportData[i];

                    if (fbsCol !== -1) {
                        const fbs = parseFloat(row[fbsCol]);
                        if (!isNaN(fbs)) {
                            totalValidFasting++;
                            if (fbs >= 101 && fbs <= 110) fastingCount.pre++;
                            else if (fbs >= 111 && fbs <= 139) fastingCount.moderate++;
                            else if (fbs >= 140) fastingCount.diabetic++;
                        }
                    }

                    if (rbsCol !== -1) {
                        const rbs = parseFloat(row[rbsCol]);
                        if (!isNaN(rbs)) {
                            totalValidRandom++;
                            if (rbs >= 161 && rbs <= 200) randomCount.pre++;
                            else if (rbs >= 201 && rbs <= 249) randomCount.moderate++;
                            else if (rbs >= 250) randomCount.diabetic++;
                        }
                    }
                }

                const getSafePct = (count, total) => (total > 0 ? ((count / total) * 100).toFixed(1) : "0.0");

                fbs_pre_pct = getSafePct(fastingCount.pre, totalValidFasting);
                fbs_mod_pct = getSafePct(fastingCount.moderate, totalValidFasting);
                fbs_dia_pct = getSafePct(fastingCount.diabetic, totalValidFasting);
                rbs_pre_pct = getSafePct(randomCount.pre, totalValidRandom);
                rbs_mod_pct = getSafePct(randomCount.moderate, totalValidRandom);
                rbs_dia_pct = getSafePct(randomCount.diabetic, totalValidRandom);

            }

            // 1.12. Calculate Blood Pressure Profile Percentages
            let pre_hypertensive_pct = "0";
            let gr1_hypertensive_pct = "0";
            let gr2_hypertensive_pct = "0";
            let gr3_hypertensive_pct = "0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const systolicCol = header.findIndex(h => h.includes('systolic') || h.includes('bp_sys'));
                const diastolicCol = header.findIndex(h => h.includes('diastolic') || h.includes('bp_dia'));
                // Assuming a single 'BP' column might contain "systolic/diastolic" or just systolic
                const bpCol = header.findIndex(h => h.includes('bp'));

                let preHypertensiveCount = 0;
                let gr1HypertensiveCount = 0;
                let gr2HypertensiveCount = 0;
                let gr3HypertensiveCount = 0;
                let totalValidBPReadings = 0;

                for (let i = 1; i < reportData.length; i++) {
                    const row = reportData[i];
                    let systolic = NaN;
                    let diastolic = NaN;

                    if (systolicCol !== -1) {
                        systolic = parseFloat(row[systolicCol]);
                    }
                    if (diastolicCol !== -1) {
                        diastolic = parseFloat(row[diastolicCol]);
                    }

                    // Attempt to parse from a general 'BP' column if specific ones aren't found or are invalid
                    if ((isNaN(systolic) || isNaN(diastolic)) && bpCol !== -1) {
                        const bpValue = String(row[bpCol] || '').trim();
                        if (bpValue.includes('/')) {
                            const parts = bpValue.split('/').map(p => parseFloat(p.trim()));
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                systolic = parts[0];
                                diastolic = parts[1];
                            }
                        } else {
                            // If only one number in BP column, assume it's systolic for classification
                            const singleBP = parseFloat(bpValue);
                            if (!isNaN(singleBP)) {
                                systolic = singleBP;
                            }
                        }
                    }

                    if ((!isNaN(systolic) && systolic > 0) || (!isNaN(diastolic) && diastolic > 0)) {
                        totalValidBPReadings++;

                        // Pre-Hypertensive
                        if ((systolic >= 135 && systolic <= 140) || (diastolic >= 85 && diastolic <= 89)) {
                            preHypertensiveCount++;
                        }
                        // Gr I - Hypertensive
                        else if ((systolic >= 141 && systolic <= 159) || (diastolic >= 90 && diastolic <= 99)) {
                            gr1HypertensiveCount++;
                        }
                        // Gr II - Hypertensive
                        else if ((systolic >= 160 && systolic <= 179) || (diastolic >= 100 && diastolic <= 109)) {
                            gr2HypertensiveCount++;
                        }
                        // Gr III - Hypertensive
                        else if (systolic >= 180 || diastolic >= 110) {
                            gr3HypertensiveCount++;
                        }
                    }
                }

                const getSafePct = (count, total) => (total > 0 ? ((count / total) * 100).toFixed(1) : "0.0");

                pre_hypertensive_pct = getSafePct(preHypertensiveCount, totalValidBPReadings);
                gr1_hypertensive_pct = getSafePct(gr1HypertensiveCount, totalValidBPReadings);
                gr2_hypertensive_pct = getSafePct(gr2HypertensiveCount, totalValidBPReadings);
                gr3_hypertensive_pct = getSafePct(gr3HypertensiveCount, totalValidBPReadings);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H11',location:'report-generator.js:bp-calc-done',message:'Blood Pressure percentages calculation completed',data:{preHypertensiveCount:preHypertensiveCount,gr1HypertensiveCount:gr1HypertensiveCount,gr2HypertensiveCount:gr2HypertensiveCount,gr3HypertensiveCount:gr3HypertensiveCount,pre_hypertensive_pct:pre_hypertensive_pct,gr1_hypertensive_pct:gr1_hypertensive_pct,gr2_hypertensive_pct:gr2_hypertensive_pct,gr3_hypertensive_pct:gr3_hypertensive_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // 1.13. Calculate Cholesterol Profile Percentages (Dyslipidemia)

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                const cholesterolCol = header.findIndex(h => h.includes('cholesterol') || h.includes('tc') || h.includes('chol') || (h.includes('total') && h.includes('chol')));

                let borderlineCount = 0;
                let moderateCount = 0;
                let hyperlipidemiaCount = 0;
                let totalValidCholesterolReadings = 0;

                if (cholesterolCol !== -1) {
                    for (let i = 1; i < reportData.length; i++) {
                        const cholesterolValue = parseFloat(reportData[i][cholesterolCol]);

                        if (!isNaN(cholesterolValue) && cholesterolValue > 0) {
                            totalValidCholesterolReadings++;

                            if (cholesterolValue >= 201 && cholesterolValue <= 219) {
                                borderlineCount++;
                            } else if (cholesterolValue >= 220 && cholesterolValue <= 250) {
                                moderateCount++;
                            } else if (cholesterolValue >= 251) {
                                hyperlipidemiaCount++;
                            }
                        }
                    }
                }

                const getSafePct = (count, total) => (total > 0 ? ((count / total) * 100).toFixed(1) : "0.0");

                borderline_hyperlipidemia_pct = getSafePct(borderlineCount, totalValidCholesterolReadings);
                moderate_hyperlipidemia_pct = getSafePct(moderateCount, totalValidCholesterolReadings);
                hyperlipidemia_pct = getSafePct(hyperlipidemiaCount, totalValidCholesterolReadings);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H12',location:'report-generator.js:cholesterol-calc-done',message:'Cholesterol percentages calculation completed',data:{borderlineCount:borderlineCount,moderateCount:moderateCount,hyperlipidemiaCount:hyperlipidemiaCount,borderline_hyperlipidemia_pct:borderline_hyperlipidemia_pct,moderate_hyperlipidemia_pct:moderate_hyperlipidemia_pct,hyperlipidemia_pct:hyperlipidemia_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // #endregion agent log

            // 1.14. Calculate Cardiac Risk Percentage
            let cardiac_risk_pct = "0";

            if (employeeCount > 0 && reportData.length > 1) {
                const header = reportData[0].map(h => String(h || '').toLowerCase().trim());
                // Re-using or finding new column indices for existing factors
                const systolicCol = header.findIndex(h => h.includes('systolic') || h.includes('bp_sys'));
                const diastolicCol = header.findIndex(h => h.includes('diastolic') || h.includes('bp_dia'));
                const bpCol = header.findIndex(h => h.includes('bp')); // General BP for parsing "sys/dia"
                const fbsCol = header.findIndex(h => h.includes('fasting') || h.includes('bs1'));
                const rbsCol = header.findIndex(h => h.includes('random') || h.includes('bs2'));
                const bmiCol = header.findIndex(h => h.includes('bmi'));
                const hab2Col = header.findIndex(h => h.includes('hab2')); // Tobacco
                const hab3Col = header.findIndex(h => h.includes('hab3')); // Other Tobacco
                const familyHistoryCardiacCol = header.findIndex(h => h.includes('family_history_cardiac') || h.includes('fhx_cardiac'));


                let cardiacRiskCount = 0;
                let totalValidEmployeesForCardiacRisk = 0; // To count employees with at least one measurable risk factor

                for (let i = 1; i < reportData.length; i++) {
                    const row = reportData[i];
                    let riskFactorsMet = 0;
                    let hasMeasurableFactor = false;

                    // Condition 1: BP is high (>140/90)
                    let systolic = NaN;
                    let diastolic = NaN;
                    if (systolicCol !== -1) systolic = parseFloat(row[systolicCol]);
                    if (diastolicCol !== -1) diastolic = parseFloat(row[diastolicCol]);
                    if ((isNaN(systolic) || isNaN(diastolic)) && bpCol !== -1) {
                        const bpValue = String(row[bpCol] || '').trim();
                        if (bpValue.includes('/')) {
                            const parts = bpValue.split('/').map(p => parseFloat(p.trim()));
                            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                                systolic = parts[0];
                                diastolic = parts[1];
                            }
                        } else {
                            const singleBP = parseFloat(bpValue);
                            if (!isNaN(singleBP)) systolic = singleBP;
                        }
                    }
                    if ((!isNaN(systolic) && systolic > 140) || (!isNaN(diastolic) && diastolic > 90)) {
                        riskFactorsMet++;
                        hasMeasurableFactor = true;
                    }

                    // Condition 2: BS is high (>140 fasting)
                    let fbs = NaN;
                    let rbs = NaN;
                    if (fbsCol !== -1) fbs = parseFloat(row[fbsCol]);
                    if (rbsCol !== -1) rbs = parseFloat(row[rbsCol]);
                    if (!isNaN(fbs) && fbs > 140) { // Fasting Blood Sugar
                        riskFactorsMet++;
                        hasMeasurableFactor = true;
                    } else if (!isNaN(rbs) && rbs > 200) { // Using random BS if fasting not available or low, and random is high
                        riskFactorsMet++;
                        hasMeasurableFactor = true;
                    }


                    // Condition 3: BMI is >= 30
                    if (bmiCol !== -1) {
                        const bmiValue = parseFloat(row[bmiCol]);
                        if (!isNaN(bmiValue) && bmiValue >= 30) {
                            riskFactorsMet++;
                            hasMeasurableFactor = true;
                        }
                    }

                    // Condition 4: Smoking/Tobacco is 'Y'
                    const hab2Val = String(row[hab2Col] || '').toLowerCase().trim();
                    const hab3Val = String(row[hab3Col] || '').toLowerCase().trim();
                    if ((hab2Col !== -1 && hab2Val === 'y') || (hab3Col !== -1 && hab3Val === 'y')) {
                        riskFactorsMet++;
                        hasMeasurableFactor = true;
                    }

                    // Condition 5: Family History of Cardiac issues is 'Y'
                    if (familyHistoryCardiacCol !== -1) {
                        const fhxVal = String(row[familyHistoryCardiacCol] || '').toLowerCase().trim();
                        if (fhxVal === 'y') {
                            riskFactorsMet++;
                            hasMeasurableFactor = true;
                        }
                    }

                    if (hasMeasurableFactor) {
                        totalValidEmployeesForCardiacRisk++;
                        if (riskFactorsMet >= 2) {
                            cardiacRiskCount++;
                        }
                    }
                }

                const getSafePct = (count, total) => (total > 0 ? ((count / total) * 100).toFixed(1) : "0.0");

                cardiac_risk_pct = getSafePct(cardiacRiskCount, totalValidEmployeesForCardiacRisk);

                // #region agent log
                fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H13',location:'report-generator.js:cardiac-risk-calc-done',message:'Cardiac Risk percentage calculation completed',data:{cardiacRiskCount:cardiacRiskCount,totalValidEmployeesForCardiacRisk:totalValidEmployeesForCardiacRisk,cardiac_risk_pct:cardiac_risk_pct},timestamp:Date.now()})}).catch(()=>{});
                // #endregion agent log
            }

            // 1.14. Get Current Date
            const today = new Date();
            const current_date = today.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });

            // 2. Prepare Date Tags
            let s_date = current_date, e_date = current_date; // Default to current_date
            if (wordDateValue.includes(" to ")) {
                [s_date, e_date] = wordDateValue.split(" to ");
            } else if (wordDateValue) { // If wordDateValue is provided and not a range, use it for both
                s_date = e_date = wordDateValue;
            }

            // 2b. Build employee list for the Word table
            // Columns: Sl. No (auto), Emp Id, Name, Department
            const empHeader  = reportData[0].map(h => String(h || '').toLowerCase().trim());
            const empIdCol   = empHeader.findIndex(h => h.includes('empid'));
            const empNameCol = empHeader.findIndex(h => h.includes('empname'));
            const empDeptCol = empHeader.findIndex(h => h.includes('depart'));
            const employees  = [];
            for (let i = 1; i < reportData.length; i++) {
                const row = reportData[i];
                employees.push({
                    sl_no:  i,
                    emp_id: empIdCol   !== -1 ? String(row[empIdCol]   || '') : '',
                    name:   empNameCol !== -1 ? String(row[empNameCol] || '') : '',
                    dept:   empDeptCol !== -1 ? String(row[empDeptCol] || '') : ''
                });
            }
            console.log(`👥 Employee list built: ${employees.length} rows (columns: empId=${empIdCol}, name=${empNameCol}, dept=${empDeptCol})`);

            // ─────────────────────────────────────────────────
            // 2c. Count Y and N for lifestyle flag columns
            //     NUT1-4, EXE1-3, STR1-4, HAB1-4
            // ─────────────────────────────────────────────────
            const flagCols = [
                'nut1','nut2','nut3','nut4',
                'exe1','exe2','exe3',
                'str1','str2','str3','str4',
                'hab1','hab2','hab3','hab4'
            ];
            const flagHeader = reportData[0].map(h => String(h || '').toLowerCase().trim());
            const flagIdx = {};
            flagCols.forEach(c => { flagIdx[c] = flagHeader.findIndex(h => h.includes(c)); });

            // Initialise raw counters  { nut1_y: 0, nut1_n: 0, … }
            const _flagRaw = {};
            flagCols.forEach(c => { _flagRaw[c + '_y'] = 0; _flagRaw[c + '_n'] = 0; });

            for (let i = 1; i < reportData.length; i++) {
                const row = reportData[i];
                flagCols.forEach(c => {
                    if (flagIdx[c] === -1) return;
                    const v = String(row[flagIdx[c]] || '').toUpperCase().trim();
                    if (v.startsWith('Y')) _flagRaw[c + '_y']++;
                    else if (v.startsWith('N')) _flagRaw[c + '_n']++;
                });
            }

            // Count employees where ALL of HAB1, HAB2, HAB3 are Y
            let _hab_all_y = 0;
            if (flagIdx['hab1'] !== -1 && flagIdx['hab2'] !== -1 && flagIdx['hab3'] !== -1) {
                for (let i = 1; i < reportData.length; i++) {
                    const row = reportData[i];
                    const h1 = String(row[flagIdx['hab1']] || '').toUpperCase().trim();
                    const h2 = String(row[flagIdx['hab2']] || '').toUpperCase().trim();
                    const h3 = String(row[flagIdx['hab3']] || '').toUpperCase().trim();
                    if (h1.startsWith('Y') && h2.startsWith('Y') && h3.startsWith('Y')) {
                        _hab_all_y++;
                    }
                }
            }

            // Count employees where NUT1-3 are N AND NUT4 is Y (poor nutrition)
            let _nut_poor = 0;
            if (flagIdx['nut1'] !== -1 && flagIdx['nut2'] !== -1 && flagIdx['nut3'] !== -1 && flagIdx['nut4'] !== -1) {
                for (let i = 1; i < reportData.length; i++) {
                    const row = reportData[i];
                    const n1 = String(row[flagIdx['nut1']] || '').toUpperCase().trim();
                    const n2 = String(row[flagIdx['nut2']] || '').toUpperCase().trim();
                    const n3 = String(row[flagIdx['nut3']] || '').toUpperCase().trim();
                    const n4 = String(row[flagIdx['nut4']] || '').toUpperCase().trim();
                    if (n1.startsWith('N') && n2.startsWith('N') && n3.startsWith('N') && n4.startsWith('Y')) {
                        _nut_poor++;
                    }
                }
            }

            // Count employees where ALL of EXE1, EXE2, EXE3 are N
            let _exe_all_n = 0;
            if (flagIdx['exe1'] !== -1 && flagIdx['exe2'] !== -1 && flagIdx['exe3'] !== -1) {
                for (let i = 1; i < reportData.length; i++) {
                    const row = reportData[i];
                    const e1 = String(row[flagIdx['exe1']] || '').toUpperCase().trim();
                    const e2 = String(row[flagIdx['exe2']] || '').toUpperCase().trim();
                    const e3 = String(row[flagIdx['exe3']] || '').toUpperCase().trim();
                    if (e1.startsWith('N') && e2.startsWith('N') && e3.startsWith('N')) {
                        _exe_all_n++;
                    }
                }
            }

            // Convert raw counts → percentages (of total employees screened)
            const flagCounts = {};
            Object.keys(_flagRaw).forEach(k => {
                flagCounts[k] = employeeCount > 0
                    ? ((_flagRaw[k] / employeeCount) * 100).toFixed(1)
                    : '0.0';
            });
            const hab_all_y = employeeCount > 0 ? ((_hab_all_y / employeeCount) * 100).toFixed(1) : '0.0';
            const nut_poor = employeeCount > 0 ? ((_nut_poor / employeeCount) * 100).toFixed(1) : '0.0';
            const exe_all_n = employeeCount > 0 ? ((_exe_all_n / employeeCount) * 100).toFixed(1) : '0.0';
            console.log('📊 Flag Y/N percentages:', flagCounts);
            console.log(`📊 HAB1-4 all Y: ${_hab_all_y} employees (${hab_all_y}%)`);
            console.log(`📊 NUT1-3 N & NUT4 Y: ${_nut_poor} employees (${nut_poor}%)`);
            console.log(`📊 EXE1-3 all N: ${_exe_all_n} employees (${exe_all_n}%)`);

            // Count employees with low heart rate (pulse < 60) OR low breath retention (breath < 30)
            const _pulseCol  = flagHeader.findIndex(h => h.includes('pulse'));
            const _breathCol = flagHeader.findIndex(h => h.includes('breath'));
            let _low_hr_breath = 0;
            for (let i = 1; i < reportData.length; i++) {
                const row = reportData[i];
                const pulse  = _pulseCol  !== -1 ? parseFloat(row[_pulseCol])  : NaN;
                const breath = _breathCol !== -1 ? parseFloat(row[_breathCol]) : NaN;
                const lowPulse  = !isNaN(pulse)  && pulse > 0  && pulse < 60;
                const lowBreath = !isNaN(breath) && breath > 0 && breath < 30;
                if (lowPulse || lowBreath) _low_hr_breath++;
            }
            const low_hr_breath = employeeCount > 0 ? ((_low_hr_breath / employeeCount) * 100).toFixed(1) : '0.0';
            console.log(`💓 Low HR or Low Breath Retention: ${_low_hr_breath} employees (${low_hr_breath}%)`);

            // Count employees with any non-empty value in MUSCU_OTH
            const _muscuOthCol = flagHeader.findIndex(h => h.includes('muscu_oth'));
            let _muscu_oth_count = 0;
            if (_muscuOthCol !== -1) {
                for (let i = 1; i < reportData.length; i++) {
                    const val = String(reportData[i][_muscuOthCol] || '').trim();
                    if (val.length > 0 && val !== '0' && val.toLowerCase() !== 'none' && val.toLowerCase() !== 'n/a') {
                        _muscu_oth_count++;
                    }
                }
            }
            const muscu_oth_pct = employeeCount > 0 ? ((_muscu_oth_count / employeeCount) * 100).toFixed(1) : '0.0';
            console.log(`🦴 MUSCU_OTH non-empty: ${_muscu_oth_count} employees (${muscu_oth_pct}%)`);

            // ─────────────────────────────────────────────────
            // 2d. Diabetes-related special counts (as percentages)
            // ─────────────────────────────────────────────────
            const _medCol       = flagHeader.findIndex(h => h.includes('medication'));
            const _medDetCol    = flagHeader.findIndex(h => h.includes('med_details'));
            const _pDetCol      = flagHeader.findIndex(h => h.includes('p_details'));
            const _fbsCol       = flagHeader.findIndex(h => h.includes('bs1'));
            const _rbsCol       = flagHeader.findIndex(h => h.includes('bs2'));

            let _diabetes_med_y  = 0;   // MEDICATION=Y  AND  MED_DETAILS contains DIABETES
            let _diabetes_unmed  = 0;   // MEDICATION=N  BUT  blood-sugar classifies as diabetic
            let _family_hist     = 0;   // P_DETAILS contains SUGAR → Family History

            for (let i = 1; i < reportData.length; i++) {
                const row = reportData[i];
                const medVal    = _medCol    !== -1 ? String(row[_medCol]    || '').toUpperCase().trim() : '';
                const medDet    = _medDetCol !== -1 ? String(row[_medDetCol] || '').toLowerCase().trim() : '';
                const pDet      = _pDetCol   !== -1 ? String(row[_pDetCol]  || '').toLowerCase().trim() : '';
                const fbs       = _fbsCol    !== -1 ? parseFloat(row[_fbsCol]) : NaN;
                const rbs       = _rbsCol    !== -1 ? parseFloat(row[_rbsCol]) : NaN;

                // (a) On medication AND MED_DETAILS mentions diabetes
                if (medVal === 'Y' && medDet.includes('diabetes')) {
                    _diabetes_med_y++;
                }

                // (b) NOT on medication BUT graph classifies as diabetic
                //     Thresholds from charts-logic.js diabetes popup:
                //       Pre-Diabetic:  FBS 101-110  OR  RBS 161-200
                //       Moderate:      FBS 111-129  OR  RBS 201-250
                //       Diabetic:      FBS >= 130   OR  RBS >= 251
                if (medVal === 'N' || medVal === '') {
                    const fOk = !isNaN(fbs) && fbs > 0;
                    const rOk = !isNaN(rbs) && rbs > 0;
                    if (fOk || rOk) {
                        const isDiabRisk =
                            (fOk && fbs >= 101) ||
                            (rOk && rbs >= 161);
                        if (isDiabRisk) _diabetes_unmed++;
                    }
                }

                // (c) Family History = P_DETAILS contains SUGAR
                if (pDet.includes('sugar')) {
                    _family_hist++;
                }
            }

            // Convert counts → % Yes and % No (of total employees screened)
            const pct   = (n) => employeeCount > 0 ? ((n / employeeCount) * 100).toFixed(1) : '0.0';
            const pctNo = (n) => employeeCount > 0 ? (((employeeCount - n) / employeeCount) * 100).toFixed(1) : '0.0';

            const diabetes_med_yes   = pct(_diabetes_med_y);
            const diabetes_med_no    = pctNo(_diabetes_med_y);
            const diabetes_unmed_yes = pct(_diabetes_unmed);
            const diabetes_unmed_no  = pctNo(_diabetes_unmed);
            const family_hist_yes    = pct(_family_hist);
            const family_hist_no     = pctNo(_family_hist);

            console.log(`🩺 Diabetes & family history (% Yes / % No of ${employeeCount} employees):`);
            console.log(`   Known diabetics on medication:     ${diabetes_med_yes}% / ${diabetes_med_no}%`);
            console.log(`   Known diabetics NOT on medication: ${diabetes_unmed_yes}% / ${diabetes_unmed_no}%`);
            console.log(`   Family history (SUGAR in P_DETAILS): ${family_hist_yes}% / ${family_hist_no}%`);

            // 3. Send to Server
            // We pass an object so it's easy to add more stats later
            const reportPayload = {
                count: employeeCount,
                s_date,
                e_date,
                employees,
                // Y/N flag counts (NUT, EXE, STR, HAB)
                ...flagCounts,
                hab_all_y,      // % of employees where HAB1-4 are all Y
                nut_poor,       // % of employees where NUT1-3 are N and NUT4 is Y
                exe_all_n,      // % of employees where EXE1-3 are all N
                low_hr_breath,  // % of employees with low heart rate OR low breath retention
                muscu_oth_pct,  // % of employees with non-empty MUSCU_OTH
                // Diabetes & family history (% Yes / % No)
                diabetes_med_yes,
                diabetes_med_no,
                diabetes_unmed_yes,
                diabetes_unmed_no,
                family_hist_yes,
                family_hist_no,
                m_per,
                f_per,
                under_30_per,
                age_31_40_pct,
                under_40_per,
                age_40_plus_pct,
                asian_descent_pct,
                middle_eastern_pct,
                african_descent_pct,
                european_descent_pct,
                underweight_bmi_pct,
                normal_weight_pct,
                overweight_bmi_pct,
                obese_total_pct,
                obese_grade1_pct,
                obese_grade2_pct,
                obese_gross_pct,
                overall_stress_pct,
                home_social_stress_pct,
                work_related_stress_pct,
                tobacco_use_pct,
                alcohol_consumption_pct,
                chronic_ailments_pct,
                medication_total_pct,
                medication_diabetes_pct,
                medication_hypertension_pct,
                medication_dyslipidemia_pct,
                medication_musculoskeletal_pct,
                medication_other_pct,
                fbs_pre_pct,
                fbs_mod_pct,
                fbs_dia_pct,
                rbs_pre_pct,
                rbs_mod_pct,
                rbs_dia_pct,
                pre_hypertensive_pct,
                gr1_hypertensive_pct,
                gr2_hypertensive_pct,
                gr3_hypertensive_pct,
                borderline_hyperlipidemia_pct,
                moderate_hyperlipidemia_pct,
                hyperlipidemia_pct,
                cardiac_risk_pct,
                bmi_above_25_1_pct,
                current_date
            };

            // --- CHART IMAGE CAPTURE (ApexCharts only) ---
            // Map chart IDs to their template placeholder names
            const chartToTagMap = {
                'chartChronic':      'chronic_chart_image',
                'chartHypertension': 'hypertension_chart_image',
                'chartDiabetes':     'diabetes_chart_image',
                'chartCholestrol':   'cholesterol_chart_image',
                'chartObesity':      'obesity_chart_image',
                'chartFitness':      'fitness_chart_image',
                'chartStress':       'stress_chart_image',
                'chartMedication':   'medication_chart_image'
            };

            const chartImages = {};

            // Iterate through all chart instances, only process ApexCharts
            // ApexCharts have a .dataURI() method; Chart.js instances do NOT
            for (const [chartId, instance] of Object.entries(chartInstances)) {
                // Skip if not in our export map
                if (!chartToTagMap[chartId]) continue;

                // Skip non-ApexCharts (Chart.js, null, HTML elements, etc.)
                if (!instance || typeof instance.dataURI !== 'function') {
                    console.warn(`⏭️ Skipping "${chartId}" — not an ApexCharts instance (no dataURI method)`);
                    continue;
                }

                try {
                    const { imgURI } = await instance.dataURI({ scale: 2 });
                    if (imgURI) {
                        const tagName = chartToTagMap[chartId];
                        chartImages[tagName] = imgURI; // full data:image/png;base64,... string
                        console.log(`📸 Captured "${chartId}" → {%${tagName}} (${(imgURI.length / 1024).toFixed(1)} KB)`);
                    } else {
                        console.warn(`⚠️ dataURI() returned empty for "${chartId}"`);
                    }
                } catch (err) {
                    console.error(`❌ Failed to capture chart "${chartId}":`, err);
                }
            }

            const capturedCount = Object.keys(chartImages).length;
            console.log(`📊 Dashboard chart capture complete: ${capturedCount}/${Object.keys(chartToTagMap).length} ApexCharts captured`);

            // --- POPUP CHART CAPTURE (re-create popup charts off-screen) ---
            console.log('📊 Starting popup chart capture...');
            const popupImages = await capturePopupChartImages(reportData);

            // Merge popup images into chartImages
            Object.assign(chartImages, popupImages);

            const totalCaptured = Object.keys(chartImages).length;
            console.log(`📊 Total chart capture: ${totalCaptured} images (${capturedCount} dashboard + ${Object.keys(popupImages).length} popup)`);

            // Attach chart images to the payload
            reportPayload._chartImages = chartImages;

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'report-generator.js:generateUserReport',message:'Calling generateWordFileOnServer',data:{payloadKeys:Object.keys(reportPayload),count:reportPayload.count,s_date:reportPayload.s_date,e_date:reportPayload.e_date,chartImagesCaptured:capturedCount},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log

            generateWordFileOnServer(reportPayload);
        }
    }



/**
 * Handles the actual API communication
 */
async function generateWordFileOnServer(payload) {
    try {
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'report-generator.js:generateWordFileOnServer',message:'POST /generate-report starting',data:{url:'http://localhost:3000/generate-report',payloadKeys:Object.keys(payload)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log

        const response = await fetch('http://localhost:3000/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'report-generator.js:generateWordFileOnServer',message:'POST /generate-report response',data:{ok:response.ok,status:response.status,statusText:response.statusText,contentType:response.headers.get('content-type')},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log

        if (!response.ok) throw new Error("Server failed to generate report.");

        const blob = await response.blob();
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4',location:'report-generator.js:generateWordFileOnServer',message:'Received blob',data:{blobSize:blob.size,blobType:blob.type},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Group_Analysis_${payload.s_date}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
    } catch (err) {
        console.error(err);
        alert("Error generating report. Check if Node.js server is running.");

        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'report-generator.js:generateWordFileOnServer.catch',message:'generateWordFileOnServer error',data:{error:String(err)},timestamp:Date.now()})}).catch(()=>{});
        // #endregion agent log
    }
    }
}
