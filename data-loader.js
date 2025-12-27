async function loadWellnessData() {
    try {
        const response = await fetch('http://localhost:3000/get-my-data');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const rawData = await response.json();
        
        if (rawData && rawData.length > 0) {
            // CRITICAL FIX: Normalize the header so findCol('bmi') actually finds 'BMI'
            const header = rawData[0].map(h => String(h || '').toLowerCase().trim());
            
            // Return the data in the format the filtering logic expects
            return [{
                data: rawData,
                header: header,
                company: 'AUTO-LOADED',
                year: '2025'
            }];
        }
        return null;
    } catch (err) {
        console.error("Data load failed:", err);
        return null; 
    }
}