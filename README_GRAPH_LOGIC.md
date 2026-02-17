# Graph & Chart Logic Documentation

This document explains all graphs and charts used across the Health Dashboard application, including both the **dashboard donut/pie charts** (visible on the main admin page) and the **popup bar charts** (opened on click).

---

## Table of Contents

1. [Overview Card](#1-overview-card)
2. [Gender Distribution (Pie Chart)](#2-gender-distribution-pie-chart)
3. [Age/Gender Participants (Grouped Bar Chart)](#3-agegender-participants-grouped-bar-chart)
4. [Obesity Risk (Donut + Popup Bar)](#4-obesity-risk-donut--popup-bar)
5. [Diabetes Risk (Donut + Popup Bar)](#5-diabetes-risk-donut--popup-bar)
6. [Hypertension Risk (Donut + Popup Bar)](#6-hypertension-risk-donut--popup-bar)
7. [Cholesterol / Dyslipidemia Risk (Donut + Popup Bar)](#7-cholesterol--dyslipidemia-risk-donut--popup-bar)
8. [Fitness Level (Donut + Popup Bar)](#8-fitness-level-donut--popup-bar)
9. [Stress Level (Donut + Popup Bar)](#9-stress-level-donut--popup-bar)
10. [Chronic Disease Status (Donut + Popup Bar)](#10-chronic-disease-status-donut--popup-bar)
11. [Medication / At-Risk Unmedicated (Donut + Popup Bar)](#11-medication--at-risk-unmedicated-donut--popup-bar)
12. [Employee List Popup (Click-through)](#12-employee-list-popup-click-through)

---

## 1. Overview Card

**File:** `adminpage.js` → `createOverviewGraph()`

**Purpose:** Displays a summary of the number of Corporates and Employees in the currently filtered dataset.

**Logic:**
- Counts unique company names from the `COMPANY` column.
- Counts total data rows (excluding header) as employees.
- Displayed as numeric stat cards (not a chart).

---

## 2. Gender Distribution (Pie Chart)

**File:** `charts-logic.js` → `calculateGenderData()`

**Purpose:** Shows male vs. female distribution as a pie/donut chart on the dashboard.

**Data Column:** `GENDER`

**Logic:**
- Iterates all rows; classifies gender by checking if the value starts with `'m'` (Male) or `'f'` (Female).
- Returns `{ Male: count, Female: count }`.
- Displayed as a donut with two slices: Male and Female.

---

## 3. Age/Gender Participants (Grouped Bar Chart)

**File:** `charts-logic.js` → `calculateParticipantsData()` and `openAgePopup()`

**Purpose:** Shows employee count broken down by age group and gender.

**Data Columns:** `AGE` (or `DOB` as fallback), `GENDER`

### Age Parsing Logic:
1. First try to parse as a direct number.
2. If that fails, try to parse as a date of birth and compute age from current date.
3. Valid range: 0–120 years.

### Age Buckets:
| Bucket     | Condition       |
|------------|-----------------|
| Under 30   | age < 30        |
| 30–40      | 30 ≤ age ≤ 40   |
| 40+        | age > 40        |

### Dashboard Chart:
- Grouped bar chart (Chart.js) with Male and Female series per age bucket.

### Popup Chart:
- Opens a styled popup window with an ApexCharts grouped bar chart.
- Same bucketing logic.
- Colors: Male = `#4e73df`, Female = `#fb7185`.

---

## 4. Obesity Risk (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateObesityData()` and `openObesityPopup()`

**Data Column:** `BMI`

### Dashboard Donut Logic:
| Category | Condition    |
|----------|-------------|
| Risk     | BMI ≥ 30.0  |
| WNL      | BMI < 30.0  |

### Popup Bar Chart Stages:
| Stage          | BMI Range         | Color     |
|----------------|-------------------|-----------|
| Underweight    | < 18.5            | `#36b9cc` |
| Normal         | 18.5 – 24.9       | `#1cc88a` |
| Overweight     | 25.0 – 29.9       | `#f6c23e` |
| Obesity Gr 1   | 30.0 – 34.9       | `#fd7e14` |
| Obesity Gr 2   | 35.0 – 39.9       | `#e74a3b` |
| Grossly Obese  | ≥ 40.0            | `#851010` |

**Interaction:** Clicking a bar opens the Employee List popup filtered to that BMI category.

---

## 5. Diabetes Risk (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateDiabetesData()` and `openDiabetesPopup()`

**Data Columns:** `BS1` (Fasting Blood Sugar), `BS2` (Random Blood Sugar)

### Dashboard Donut Logic:
- Uses both FBS and RBS. If a value is missing/0, it is set to `-1` (ignored).
- Staging (highest priority wins, checked from Diabetic → Normal):

| Stage         | FBS Condition     | RBS Condition      |
|---------------|-------------------|--------------------|
| Normal        | 0 < FBS ≤ 100    | 0 < RBS ≤ 160     |
| Pre-Diabetic  | 101 ≤ FBS ≤ 110  | 161 ≤ RBS ≤ 200   |
| Moderate      | 111 ≤ FBS ≤ 129  | 201 ≤ RBS ≤ 250   |
| Diabetic      | FBS ≥ 130        | RBS ≥ 251          |

- **Donut:** Normal → WNL; all others (Pre-Diabetic, Moderate, Diabetic) → Risk.

### Popup Bar Chart:
- 4 bars: Normal, Pre-Diabetic, Moderate, Diabetic with the same thresholds above.
- Colors: Normal `#1cc88a`, Pre-Diabetic `#f6c23e`, Moderate `#fd7e14`, Diabetic `#e74a3b`.
- Checks worst condition first (priority: Diabetic > Moderate > Pre-Diabetic > Normal).

**Interaction:** Clicking a bar opens the Employee List popup filtered to that diabetes category.

---

## 6. Hypertension Risk (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateHypertensionData()`, `classifyBPCategory()`, and `openHypertensionPopup()`

**Data Columns:** `BP1` (Systolic), `BP2` (Diastolic). Falls back to a combined `BP` column (e.g. `"120/80"`).

### Blood Pressure Classification (`classifyBPCategory`):
| Category       | Condition                              |
|----------------|----------------------------------------|
| Hypotension    | SBP ≤ 100 **AND** DBP ≤ 65            |
| Grade III HTN  | SBP ≥ 180 **OR** DBP ≥ 110            |
| Grade II HTN   | SBP ≥ 160 **OR** DBP ≥ 100            |
| Grade I HTN    | SBP ≥ 140 **OR** DBP ≥ 90             |
| Pre-HTN        | SBP ≥ 121 **OR** DBP ≥ 81             |
| Normal         | Everything else                        |

### Dashboard Donut:
- **WNL:** Hypotension, Normal, Pre-HTN.
- **Risk:** Grade I HTN, Grade II HTN, Grade III HTN.

### Popup Bar Chart:
- 6 bars: Hypotension, Normal, Pre-HTN, Grade I HTN, Grade II HTN, Grade III HTN.
- Colors: `#36b9cc`, `#1cc88a`, `#f6c23e`, `#fd7e14`, `#e74a3b`, `#851010`.

**Interaction:** Clicking a bar opens the Employee List popup filtered to that BP category.

---

## 7. Cholesterol / Dyslipidemia Risk (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateDyslipidemiaData()` and `openCholesterolPopup()`

**Data Column:** `CHOLESTEROL`

### Dashboard Donut Logic:
| Category | Condition         |
|----------|-------------------|
| Risk     | Cholesterol ≥ 200 |
| WNL      | Cholesterol < 200 |

### Popup Bar Chart Stages:
| Stage                   | Cholesterol Range | Color     |
|-------------------------|-------------------|-----------|
| Normal (<200)           | < 200             | `#1cc88a` |
| Mild Hyper (200–239)    | 200 – 239         | `#f6c23e` |
| Moderate Hyper (240–299)| 240 – 299         | `#fd7e14` |
| Hyper (≥300)            | ≥ 300             | `#e74a3b` |

**Interaction:** Clicking a bar opens the Employee List popup filtered to that cholesterol category.

---

## 8. Fitness Level (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateFitnessData()` and `openFitnessPopup()`

**Data Columns:** `EXE1`, `EXE2`, `EXE3`, `BREATH`, `PULSE`

### Dashboard Donut Logic:
- Checks `EXE1`, `EXE2`, `EXE3` for each employee (Y/N values).
- If **more than 1** are "Y" (i.e. 2 or 3) → **WNL** (Active).
- Otherwise → **Risk** (Inactive).

### Popup Bar Chart — Two sections combined:

#### Standard Fitness Metrics:
| Metric           | Column  | Type    | Positive Condition             | Color     |
|------------------|---------|---------|--------------------------------|-----------|
| Regular Exercise | EXE1    | Binary  | Value starts with "Y"          | `#1cc88a` |
| Good Lung Cap.   | BREATH  | Numeric | Value ≥ 30                     | `#36b9cc` |
| Good Strength    | EXE3    | Binary  | Value starts with "Y"          | `#4e73df` |
| Good Flexibility | EXE2    | Binary  | Value starts with "Y"          | `#858796` |

#### Heart Rate Categories (from `PULSE` column):
| Category            | Pulse Range | Color     |
|---------------------|-------------|-----------|
| HR: Resting (<60)   | < 60        | `#4e73df` |
| HR: Normal (60–100) | 60 – 100    | `#1cc88a` |
| HR: High (101–120)  | 101 – 120   | `#f6c23e` |
| HR: Tachy (>120)    | > 120       | `#e74a3b` |

---

## 9. Stress Level (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateStressData()` and `openStressHabitsPopup()`

**Data Columns:** `STR1`, `STR2`, `STR3`, `STR4`, `HAB1`, `HAB2`, `HAB3`, `HAB4`

### Dashboard Donut Logic — Person-Level Stress Scoring:

| Column | Description          | Scoring Rule                 | Points |
|--------|----------------------|------------------------------|--------|
| STR1   | Job satisfaction     | "N" (No) adds points         | +3     |
| STR2   | Home situation       | "N" (No) adds points         | +3     |
| STR3   | Major problems       | "Y" (Yes) adds points        | +4     |
| STR4   | Sleep                | "N" (No) adds points         | +2     |

- If **stressScore ≥ 4** → **Risk**.
- Otherwise → **WNL**.

### Popup Bar Chart — 8 Individual Indicators:

| Indicator        | Column | Positive = Issue | Color     |
|------------------|--------|------------------|-----------|
| Work Stress      | STR1   | "Y"              | `#e74a3b` |
| Family Stress    | STR2   | "Y"              | `#e74a3b` |
| Financial Stress | STR3   | "Y"              | `#e74a3b` |
| Poor Sleep       | STR4   | "N" (reversed)   | `#e74a3b` |
| Smoking          | HAB1   | "Y"              | `#f6c23e` |
| Alcohol          | HAB2   | "Y"              | `#f6c23e` |
| Oral Tobacco     | HAB3   | "Y"              | `#f6c23e` |
| Poor Safety      | HAB4   | "N" (reversed)   | `#f6c23e` |

> **Note:** "Reversed" means a "No" answer indicates the risk/issue (e.g., "No" to good sleep = poor sleep).

**Interaction:** Clicking a bar opens the Employee List popup filtered to that specific stress/habit indicator.

---

## 10. Chronic Disease Status (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateChronicData()` and `openPDetailsPopup()`

**Data Column:** `MED_DETAILS`

### Dashboard Donut Logic:
- Reads the `MED_DETAILS` column (free-text medication/condition details).
- If the value is non-empty AND NOT "NONE", "N/A", or "N" → **Risk**.
- Otherwise → **WNL**.

### Popup Bar Chart:
- Parses free-text conditions from `MED_DETAILS`, handling:
  - **Known multi-word conditions:** "URIC ACID", "KIDNEY STONE", "SLEEPING PILLS", "FATTY LIVER", "BACK PAIN", "GASTRIC ULCER", "VITAMIN D", "MULTI VITAMINS", "ANTI COAGULATION", "CARDIAC BLOCK", "CARDIAC - BLOCK", "MED FOR SLEEP", "OMEGA - 3".
  - **Noise words filtered out:** "STOPPED", "IRREGULAR", "SOMETIMES", "OF", "FOR", "NONE", "NA", "WNL", "ALL", "LEFT", "MONTH", "MONTHS", "MEDICINE", "MED".
  - Parenthetical qualifiers like `(STOPPED)` are stripped.
- Displays a **horizontal bar chart** sorted by frequency (most common condition at top).
- Each bar label shows `CONDITION : count`.

---

## 11. Medication / At-Risk Unmedicated (Donut + Popup Bar)

**File:** `charts-logic.js` → `calculateMedicationData()` and `openChronicMedicationPopup()`

**Data Columns:** `MEDICATION`, `BS1`, `BS2`, `BP1`, `CHOLESTEROL`

### Dashboard Donut Logic:
- Checks if a person answers "Y" or "N" for `MEDICATION`.
- Checks for chronic conditions from lab values:
  - **Diabetes:** FBS ≥ 126 or RBS ≥ 200.
  - **Hypertension:** SBP ≥ 140.
  - **High Cholesterol:** Total Cholesterol ≥ 200.
- **Risk:** NOT on medication **AND** has at least one chronic condition.
- **WNL:** Everyone else with valid medication data.

### Popup Bar Chart:
- 3 bars showing count of **unmedicated** employees at risk for each condition:
  - **Diabetes Risk** (FBS ≥ 126 or RBS ≥ 200, Medication = "N")
  - **Hypertension Risk** (SBP ≥ 140, Medication = "N")
  - **High Cholesterol** (Cholesterol ≥ 200, Medication = "N")
- Colors: `#e74a3b`, `#fd7e14`, `#f6c23e`.

---

## 12. Employee List Popup (Click-through)

**File:** `charts-logic.js` → `window.openUserReportPopup()`

**Purpose:** When a user clicks on a specific bar in any popup chart, this function opens a detailed employee list filtered to that category.

### Supported Graph Types and Filtering:

| Graph Type    | Filter Column(s) | Categories                                              |
|---------------|-------------------|---------------------------------------------------------|
| Hypertension  | BP1, BP2          | Hypotension, Normal, Pre-HTN, Grade I/II/III HTN        |
| Obesity       | BMI               | Underweight, Normal, Overweight, Obesity Gr 1/2, Grossly Obese |
| Diabetes      | BS1, BS2          | Normal, Pre-Diabetic, Moderate, Diabetic                |
| Cholesterol   | CHOLESTEROL       | Normal (<200), Mild Hyper, Moderate Hyper, Hyper (≥300) |
| Stress/Habits | STR1-4, HAB1-4    | Work/Family/Financial Stress, Poor Sleep, Smoking, Alcohol, Oral Tobacco, Poor Safety |

### Table Columns Shown:
- Name, Employee ID, Department, Mobile, DOS (Date of Screening)
- Plus a graph-specific column (e.g., BP value, BMI value, Blood Sugar, Cholesterol).

### Export Options:
- **Export to Excel** — Uses XLSX.js to generate a `.xlsx` file.
- **Export to PDF** — Uses browser's `window.print()` function.

### Heading Structure:
- **Main Title:** `{GraphType} Report` (e.g., "Diabetes Report")
- **Subtitle:** `{BarCategory}` (e.g., "Normal", "Pre-Diabetic")

---

## Chart Libraries Used

| Library               | Usage                                      |
|-----------------------|--------------------------------------------|
| **ApexCharts**        | All donut charts on dashboard, all popup bar charts |
| **Chart.js**          | Age/Gender grouped bar chart on dashboard  |
| **XLSX.js**           | Excel export in employee list popups       |

---

## Chart Image Capture for Word Report

**File:** `report-generator.js` → `capturePopupChartImages()`

For the Word document report, all popup charts are re-created off-screen in hidden `<div>` elements, captured as base64 PNG images using `ApexCharts.dataURI()`, then destroyed. The captured images are:

| Tag Name                      | Chart Description                          |
|-------------------------------|--------------------------------------------|
| `age_popup_chart_image`       | Age/Gender grouped bar                     |
| `obesity_popup_chart_image`   | Obesity BMI breakdown bar                  |
| `diabetes_popup_chart_image`  | Diabetes stages bar                        |
| `hypertension_popup_chart_image` | Hypertension grades bar                 |
| `cholesterol_popup_chart_image`  | Cholesterol levels bar                  |
| `fitness_popup_chart_image`   | Fitness metrics + heart rate bar           |
| `stress_popup_chart_image`    | Stress indicators bar (STR1-4)             |
| `habits_popup_chart_image`    | Habits indicators bar (HAB1-4)             |
| `nutrition_popup_chart_image` | Nutrition indicators bar (NUT1-4)          |
| `exercise_popup_chart_image`  | Exercise indicators bar (EXE1-3)           |
| `chronic_popup_chart_image`   | Chronic conditions horizontal bar          |
| `medication_popup_chart_image`| At-risk unmedicated bar                    |

Dashboard donut chart images are also captured directly from `chartInstances` using `dataURI()`:

| Tag Name                      | Chart Description                          |
|-------------------------------|--------------------------------------------|
| `chronic_chart_image`         | Chronic Disease donut                      |
| `hypertension_chart_image`    | Hypertension Risk donut                    |
| `diabetes_chart_image`        | Diabetes Risk donut                        |
| `cholesterol_chart_image`     | Cholesterol/Dyslipidemia donut             |
| `obesity_chart_image`         | Obesity Risk donut                         |
| `fitness_chart_image`         | Fitness Level donut                        |
| `stress_chart_image`          | Stress Level donut                         |
| `medication_chart_image`      | Medication donut                           |
` 