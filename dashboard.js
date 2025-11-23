/**
 * Data extracted from "Dashboard Data'25_2025.xlsx - 2025.csv"
 * The date of the data is October 1, 2025.
 */
const dashboardMetrics = {
    // Current date for the dashboard based on the data
    "current_date": "10/01/2025", 

    // Header Metrics
    "total_employees": 321,
    "corporates": 3,

    // Detailed Metrics
    "gender": {
        "Male": 309,
        "Female": 12
    },
    "chronic_diseases": {
        "Yes": 128,
        "No": 193
    },
    "hypertension": {
        "Yes": 1,
        "No": 320
    },
    "diabetes": {
        "Yes": 24,
        "No": 297
    },
    "obesity": {
        "Yes": 9,
        "No": 312
    }
};

document.addEventListener('DOMContentLoaded', (event) => {
    // Function to set the text content of an element
    const setMetric = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    };

    // 1. Set Header Metrics
    setMetric('current-date', dashboardMetrics.current_date);
    setMetric('total-employees', dashboardMetrics.total_employees);
    setMetric('corporates-count', dashboardMetrics.corporates);

    // 2. Set Gender Data
    setMetric('gender-male', dashboardMetrics.gender.Male);
    setMetric('gender-female', dashboardMetrics.gender.Female);

    // 3. Set Chronic Diseases Data
    setMetric('diseases-yes', dashboardMetrics.chronic_diseases.Yes);
    setMetric('diseases-no', dashboardMetrics.chronic_diseases.No);

    // 4. Set Hypertension Data
    setMetric('hyp-yes', dashboardMetrics.hypertension.Yes);
    setMetric('hyp-no', dashboardMetrics.hypertension.No);

    // 5. Set Diabetes Data
    setMetric('dia-yes', dashboardMetrics.diabetes.Yes);
    setMetric('dia-no', dashboardMetrics.diabetes.No);

    // 6. Set Obesity Data
    setMetric('obe-yes', dashboardMetrics.obesity.Yes);
    setMetric('obe-no', dashboardMetrics.obesity.No);
});