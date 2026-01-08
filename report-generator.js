/**
 * Main function called by the Group Profile button
 */
async function generateUserReport() {
    const userReportInput = document.getElementById('monthPicker'); 
    const groupProfileInput = document.getElementById('groupProfile'); 

    const userDateValue = userReportInput ? userReportInput.value : '';
    const wordDateValue = groupProfileInput ? groupProfileInput.value : '';

    if (!userDateValue && !wordDateValue) {
        alert("Please select a date range.");
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
            // Reusing your logic from charts-logic.js
            const genderData = calculateGenderData(reportData, headerRow);
            let m_per = "0";
            let f_per = "0";
            
            if (genderData && employeeCount > 0) {
                m_per = ((genderData.Male / employeeCount) * 100).toFixed(1);
                f_per = ((genderData.Female / employeeCount) * 100).toFixed(1);
            }

            // 2. Prepare Date Tags
            let s_date = "_______", e_date = "_______";
            if (wordDateValue.includes(" to ")) {
                [s_date, e_date] = wordDateValue.split(" to ");
            } else {
                s_date = e_date = wordDateValue;
            }

            // 3. Send to Server
            // We pass an object so it's easy to add more stats later
            const reportPayload = {
                count: employeeCount,
                s_date,
                e_date,
                m_per,
                f_per
            };

            generateWordFileOnServer(reportPayload);
        }
    }
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