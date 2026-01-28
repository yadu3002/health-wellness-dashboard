/**
 * Main function called by the Group Profile button
 */
// #region agent log
fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'report-generator.js:load',message:'report-generator.js loaded',data:{ready:true},timestamp:Date.now()})}).catch(()=>{});
// #endregion agent log

async function generateUserReport() {
    const userReportInput = document.getElementById('monthPicker'); 
    const groupProfileInput = document.getElementById('groupProfile'); 

    const userDateValue = userReportInput ? userReportInput.value : '';
    const wordDateValue = groupProfileInput ? groupProfileInput.value : '';

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'report-generator.js:generateUserReport',message:'generateUserReport called',data:{userDateValue,wordDateValue,hasHeaderRow:!!window.headerRow,hasFilterFn:typeof window.filterDataBySpecificRange},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log

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
            let m_per = "0";
            let f_per = "0";
            
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

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'report-generator.js:generateUserReport',message:'Calling generateWordFileOnServer',data:{payloadKeys:Object.keys(reportPayload),count:reportPayload.count,s_date:reportPayload.s_date,e_date:reportPayload.e_date},timestamp:Date.now()})}).catch(()=>{});
            // #endregion agent log

            generateWordFileOnServer(reportPayload);
        }
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
