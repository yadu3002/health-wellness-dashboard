/**
 * Main function called by the Group Profile button
 */
// Inside report-generator.js
async function generateUserReport() {
    const groupProfileInput = document.getElementById('groupProfile'); 
    const wordDateValue = groupProfileInput ? groupProfileInput.value : '';

    if (!wordDateValue) {
        alert("Please select a date range.");
        return;
    }

    // Filter the data based on the selected date range
    const reportData = filterDataBySpecificRange(wordDateValue);
    
    // headerRow is a global variable from adminpage.js
    if (reportData && reportData.length > 1) {
        const employeeCount = reportData.length - 1;

        // Calculate gender using the helper from charts-logic.js
        const genderData = calculateGenderData(reportData, headerRow);
        
        let m_per = "0.0";
        let f_per = "0.0";
        
        if (genderData && employeeCount > 0) {
            const males = genderData.Male || 0;
            const females = genderData.Female || 0;
            m_per = ((males / employeeCount) * 100).toFixed(1);
            f_per = ((females / employeeCount) * 100).toFixed(1);
        }

        // Handle date range splitting safely
        let s_date = wordDateValue;
        let e_date = wordDateValue;
        if (wordDateValue.includes(" to ")) {
            const parts = wordDateValue.split(" to ");
            s_date = parts[0];
            e_date = parts[1];
        }

        // Prepare payload: names on the LEFT must match {tags} in your Word Doc
        const reportPayload = {
            count: employeeCount,
            s_date: s_date,
            e_date: e_date,
            m_per: m_per,
            f_per: f_per
            // Add other metrics here (e.g., obesity_per: calculateObesityData(...))
        };

        generateWordFileOnServer(reportPayload);
    } else {
        alert("No records found for the selected range.");
    }
}

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
 * Handles the actual API communication
 */
async function generateWordFileOnServer(payload) {
    try {
        const response = await fetch('http://localhost:3000/generate-report', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error("Server failed to generate report.");

        const blob = await response.blob();
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
    }
}