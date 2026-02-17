# Word Template Values Documentation

This document details all the computed values (template tags) that are injected into the **Group Profile CorporateHRA Scan.docx** Word template when generating the report.

The Word template uses `{{tag_name}}` delimiters for text values (handled by Docxtemplater) and **alt-text matching** for chart images (handled by custom image injection logic in `server.js`).

---

## Table of Contents

1. [General / Metadata Tags](#1-general--metadata-tags)
2. [Gender Distribution](#2-gender-distribution)
3. [Age Distribution](#3-age-distribution)
4. [Ethnicity / Descent Distribution](#4-ethnicity--descent-distribution)
5. [BMI / Weight Classification](#5-bmi--weight-classification)
6. [Stress & Presenteeism](#6-stress--presenteeism)
7. [Habits (Tobacco & Alcohol)](#7-habits-tobacco--alcohol)
8. [Chronic Ailments & Medication](#8-chronic-ailments--medication)
9. [Diabetes Profile (FBS & RBS)](#9-diabetes-profile-fbs--rbs)
10. [Blood Pressure / Hypertension Profile](#10-blood-pressure--hypertension-profile)
11. [Cholesterol / Dyslipidemia Profile](#11-cholesterol--dyslipidemia-profile)
12. [Cardiac Risk](#12-cardiac-risk)
13. [Lifestyle Flag Y/N Counts](#13-lifestyle-flag-yn-counts)
14. [Composite Lifestyle Metrics](#14-composite-lifestyle-metrics)
15. [Diabetes-Specific Deep-Dive](#15-diabetes-specific-deep-dive)
16. [Employee List Table](#16-employee-list-table)
17. [Chart Images (Alt-Text Tags)](#17-chart-images-alt-text-tags)

---

## 1. General / Metadata Tags

| Template Tag      | Variable          | Description                                                        | Source                 |
|-------------------|-------------------|--------------------------------------------------------------------|------------------------|
| `{{count}}`       | `count`           | Total number of employees in the filtered dataset (excl. header)   | `reportData.length - 1` |
| `{{company_name}}`| `company_name`    | Selected company name, or "All Companies" if no filter applied     | `selectedCompany` variable |
| `{{s_date}}`      | `s_date`          | Start date of the selected Group Profile date range                | Parsed from `wordDateValue` |
| `{{e_date}}`      | `e_date`          | End date of the selected Group Profile date range                  | Parsed from `wordDateValue` |
| `{{current_date}}`| `current_date`    | Today's date formatted as MM/DD/YYYY                               | `new Date().toLocaleDateString('en-US', ...)` |

---

## 2. Gender Distribution

**Calculation:** Counts male/female by checking if the `GENDER` column value starts with `'m'` or `'f'`.

| Template Tag   | Variable | Formula                                      | Example |
|----------------|----------|----------------------------------------------|---------|
| `{{m_per}}`    | `m_per`  | `(maleCount / employeeCount × 100).toFixed(1)` | "58.3"  |
| `{{f_per}}`    | `f_per`  | `(femaleCount / employeeCount × 100).toFixed(1)` | "41.7"  |

---

## 3. Age Distribution

**Calculation:** Parses age from `AGE` column (direct number) or `DOB` column (date of birth → computed age). Valid range: 0–150 years.

| Template Tag         | Variable         | Age Range       | Formula                                              |
|----------------------|------------------|-----------------|------------------------------------------------------|
| `{{under_30_per}}`   | `under_30_per`   | < 30            | `(under30Count / employeeCount × 100).toFixed(1)`    |
| `{{age_31_40_pct}}`  | `age_31_40_pct`  | 31 – 40         | `(age3140Count / employeeCount × 100).toFixed(1)`    |
| `{{under_40_per}}`   | `under_40_per`   | < 40 (combined) | `((under30 + age3140) / employeeCount × 100).toFixed(1)` |
| `{{age_40_plus_pct}}`| `age_40_plus_pct`| ≥ 40            | `(age40PlusCount / employeeCount × 100).toFixed(1)`  |

---

## 4. Ethnicity / Descent Distribution

**Calculation:** Reads the `DESCENT` column and classifies by substring matching.

| Template Tag              | Variable             | Match Condition                    |
|---------------------------|----------------------|------------------------------------|
| `{{asian_descent_pct}}`   | `asian_descent_pct`  | Value contains "asian"             |
| `{{middle_eastern_pct}}`  | `middle_eastern_pct` | Value contains "middle" AND "east" |
| `{{african_descent_pct}}` | `african_descent_pct`| Value contains "african"           |
| `{{european_descent_pct}}`| `european_descent_pct`| Value contains "european"         |

All values are `(count / employeeCount × 100).toFixed(1)`.

---

## 5. BMI / Weight Classification

**Calculation:** Reads the `BMI` column and classifies into weight categories.

| Template Tag              | Variable             | BMI Range        | Description                |
|---------------------------|----------------------|------------------|----------------------------|
| `{{underweight_bmi_pct}}` | `underweight_bmi_pct`| < 18.9           | Underweight                |
| `{{normal_weight_pct}}`   | `normal_weight_pct`  | 19.0 – 25.0      | Normal Weight              |
| `{{overweight_bmi_pct}}`  | `overweight_bmi_pct` | 25.1 – 29.9      | Overweight                 |
| `{{obese_total_pct}}`     | `obese_total_pct`    | ≥ 30.0           | Obese (all grades total)   |
| `{{obese_grade1_pct}}`    | `obese_grade1_pct`   | 30.0 – 35.0      | Obesity Grade I            |
| `{{obese_grade2_pct}}`    | `obese_grade2_pct`   | 35.1 – 39.9      | Obesity Grade II           |
| `{{obese_gross_pct}}`     | `obese_gross_pct`    | ≥ 40.0           | Grossly Obese              |
| `{{bmi_above_25_1_pct}}`  | `bmi_above_25_1_pct` | ≥ 25.1           | BMI above 25.1 (overweight + obese combined) |

All values are `(count / employeeCount × 100).toFixed(1)`.

---

## 6. Stress & Presenteeism

**Calculation:** Uses `STR1`–`STR4` columns with a weighted scoring system.

### Stress Scoring (per employee):
| Column | Description       | Trigger | Points |
|--------|-------------------|---------|--------|
| STR3   | Major problems    | "Y"     | +3     |
| STR4   | Sleep quality     | "N"     | +2     |
| STR1   | Job satisfaction  | "N"     | +1     |
| STR2   | Home situation    | "N"     | +1     |

- **High Stress:** stressScore ≥ 3

| Template Tag                  | Variable                | Description                                           |
|-------------------------------|-------------------------|-------------------------------------------------------|
| `{{overall_stress_pct}}`      | `overall_stress_pct`    | % of employees with high stress (score ≥ 3)           |
| `{{home_social_stress_pct}}`  | `home_social_stress_pct`| % of employees where STR2 = "N" (home/social stress)  |
| `{{work_related_stress_pct}}` | `work_related_stress_pct`| % of employees where STR1 = "N" (work-related stress)|

> **Note:** The scoring weights in the Word template differ slightly from the dashboard donut chart (which uses higher weights: STR1/STR2 = +3, STR3 = +4, STR4 = +2, threshold = 4).

---

## 7. Habits (Tobacco & Alcohol)

**Calculation:** Uses `HAB1`, `HAB2`, `HAB3` columns.

| Template Tag                   | Variable                  | Description                                              |
|--------------------------------|---------------------------|----------------------------------------------------------|
| `{{tobacco_use_pct}}`          | `tobacco_use_pct`         | % of employees where HAB2 = "Y" OR HAB3 = "Y" (tobacco) |
| `{{alcohol_consumption_pct}}`  | `alcohol_consumption_pct` | % of employees where HAB1 = "Y" (alcohol/smoking)        |

---

## 8. Chronic Ailments & Medication

**Calculation:** Uses `ART`, `SPO`, `BAC`, `MUSCU_OTH`, `MED_DETAILS`, `MEDICATION` columns.

### Chronic Ailment Detection:
An employee has a chronic ailment if ANY of these are true:
- `ART` (Arthritis) = "Y"
- `SPO` (Spondylitis) = "Y"
- `BAC` (Back Ache) = "Y"
- `MUSCU_OTH` has any non-empty value
- `MED_DETAILS` contains "stroke" or "neurology"

### Medication Sub-Categories:
When `MEDICATION` = "Y", the `MED_DETAILS` free-text is checked for specific keywords:

| Template Tag                       | Variable                      | Detection Rule                                                     |
|------------------------------------|-------------------------------|--------------------------------------------------------------------|
| `{{chronic_ailments_pct}}`         | `chronic_ailments_pct`        | % with any chronic ailment (as defined above)                      |
| `{{medication_total_pct}}`         | `medication_total_pct`        | % where MEDICATION = "Y"                                           |
| `{{medication_diabetes_pct}}`      | `medication_diabetes_pct`     | % on medication + MED_DETAILS contains "diabetes"                  |
| `{{medication_hypertension_pct}}`  | `medication_hypertension_pct` | % on medication + MED_DETAILS contains "bp" or "hypertension"      |
| `{{medication_dyslipidemia_pct}}`  | `medication_dyslipidemia_pct` | % on medication + MED_DETAILS contains "cholesterol", "dyslipidemia", or "lipid" |
| `{{medication_musculoskeletal_pct}}`| `medication_musculoskeletal_pct` | % on medication + has any musculoskeletal condition (ART/SPO/BAC/MUSCU_OTH) |
| `{{medication_other_pct}}`         | `medication_other_pct`        | % on medication but no specific category matched                   |

All values are `(count / employeeCount × 100).toFixed(1)`.

---

## 9. Diabetes Profile (FBS & RBS)

**Calculation:** Uses `BS1` (Fasting Blood Sugar) and `BS2` (Random Blood Sugar) columns.

### Fasting Blood Sugar (FBS) Classification:
| Template Tag       | Variable      | FBS Range         | Description       |
|--------------------|---------------|-------------------|-------------------|
| `{{fbs_pre_pct}}`  | `fbs_pre_pct` | 101 – 110         | Pre-Diabetic      |
| `{{fbs_mod_pct}}`  | `fbs_mod_pct` | 111 – 139         | Moderate          |
| `{{fbs_dia_pct}}`  | `fbs_dia_pct` | ≥ 140             | Diabetic          |

### Random Blood Sugar (RBS) Classification:
| Template Tag       | Variable      | RBS Range         | Description       |
|--------------------|---------------|-------------------|-------------------|
| `{{rbs_pre_pct}}`  | `rbs_pre_pct` | 161 – 200         | Pre-Diabetic      |
| `{{rbs_mod_pct}}`  | `rbs_mod_pct` | 201 – 249         | Moderate          |
| `{{rbs_dia_pct}}`  | `rbs_dia_pct` | ≥ 250             | Diabetic          |

> **Note:** FBS percentages are calculated against `totalValidFasting` (employees with valid FBS values), and RBS percentages against `totalValidRandom` (employees with valid RBS values) — NOT total employees. This is done using `getSafePct(count, total)`.

---

## 10. Blood Pressure / Hypertension Profile

**Calculation:** Uses `BP_SYS` / `BP_DIA` / `BP` columns (supports both separate and combined "120/80" format).

| Template Tag               | Variable              | Systolic Range  | Diastolic Range | Description           |
|----------------------------|-----------------------|-----------------|-----------------|-----------------------|
| `{{pre_hypertensive_pct}}` | `pre_hypertensive_pct`| 135 – 140       | 85 – 89         | Pre-Hypertensive      |
| `{{gr1_hypertensive_pct}}` | `gr1_hypertensive_pct`| 141 – 159       | 90 – 99         | Grade I Hypertensive  |
| `{{gr2_hypertensive_pct}}` | `gr2_hypertensive_pct`| 160 – 179       | 100 – 109       | Grade II Hypertensive |
| `{{gr3_hypertensive_pct}}` | `gr3_hypertensive_pct`| ≥ 180           | ≥ 110           | Grade III Hypertensive|

> **Note:** Percentages are calculated against `totalValidBPReadings` (employees with at least one valid BP reading), using `getSafePct(count, total)`.

> **Important:** The classification ranges in the Word template differ slightly from the popup chart classification. The Word template uses: Pre-HTN (135–140 / 85–89), Gr I (141–159 / 90–99), Gr II (160–179 / 100–109), Gr III (≥180 / ≥110). The popup chart uses: Pre-HTN (≥121 / ≥81), Gr I (≥140 / ≥90), Gr II (≥160 / ≥100), Gr III (≥180 / ≥110).

---

## 11. Cholesterol / Dyslipidemia Profile

**Calculation:** Uses the `CHOLESTEROL` column.

| Template Tag                       | Variable                       | Cholesterol Range | Description                |
|------------------------------------|--------------------------------|-------------------|----------------------------|
| `{{borderline_hyperlipidemia_pct}}`| `borderline_hyperlipidemia_pct`| 201 – 219         | Borderline Hyperlipidemia  |
| `{{moderate_hyperlipidemia_pct}}`  | `moderate_hyperlipidemia_pct`  | 220 – 250         | Moderate Hyperlipidemia    |
| `{{hyperlipidemia_pct}}`          | `hyperlipidemia_pct`           | ≥ 251             | Hyperlipidemia             |

> **Note:** Percentages are calculated against `totalValidCholesterolReadings` (employees with valid cholesterol values > 0), using `getSafePct(count, total)`.

---

## 12. Cardiac Risk

**Calculation:** A composite risk score based on multiple health factors.

### Risk Factors Checked (per employee):
| # | Factor                | Condition                                    | Column(s)                |
|---|-----------------------|----------------------------------------------|--------------------------|
| 1 | High Blood Pressure   | SBP > 140 OR DBP > 90                       | BP_SYS, BP_DIA, BP      |
| 2 | High Blood Sugar      | FBS > 140 OR RBS > 200                      | BS1, BS2                 |
| 3 | Obesity               | BMI ≥ 30                                     | BMI                      |
| 4 | Tobacco Use           | HAB2 = "Y" OR HAB3 = "Y"                    | HAB2, HAB3               |
| 5 | Family Cardiac History| FAMILY_HISTORY_CARDIAC / FHX_CARDIAC = "Y"   | FAMILY_HISTORY_CARDIAC   |

- An employee is **at cardiac risk** if they have **2 or more** risk factors.
- Only employees with **at least one measurable factor** are included in the denominator.

| Template Tag          | Variable         | Description                                         |
|-----------------------|------------------|-----------------------------------------------------|
| `{{cardiac_risk_pct}}`| `cardiac_risk_pct`| % of employees (with measurable factors) at cardiac risk |

---

## 13. Lifestyle Flag Y/N Counts

**Calculation:** For each lifestyle flag column (`NUT1`–`NUT4`, `EXE1`–`EXE3`, `STR1`–`STR4`, `HAB1`–`HAB4`), counts how many employees answered "Y" and "N".

Each generates two template tags:

| Template Tag Pattern   | Variable Pattern | Description                                     |
|------------------------|------------------|-------------------------------------------------|
| `{{nut1_y}}`           | `nut1_y`         | % of employees where NUT1 = "Y"                |
| `{{nut1_n}}`           | `nut1_n`         | % of employees where NUT1 = "N"                |
| `{{nut2_y}}`           | `nut2_y`         | % of employees where NUT2 = "Y"                |
| `{{nut2_n}}`           | `nut2_n`         | % of employees where NUT2 = "N"                |
| `{{nut3_y}}`           | `nut3_y`         | % of employees where NUT3 = "Y"                |
| `{{nut3_n}}`           | `nut3_n`         | % of employees where NUT3 = "N"                |
| `{{nut4_y}}`           | `nut4_y`         | % of employees where NUT4 = "Y"                |
| `{{nut4_n}}`           | `nut4_n`         | % of employees where NUT4 = "N"                |
| `{{exe1_y}}`           | `exe1_y`         | % of employees where EXE1 = "Y"                |
| `{{exe1_n}}`           | `exe1_n`         | % of employees where EXE1 = "N"                |
| `{{exe2_y}}`           | `exe2_y`         | % of employees where EXE2 = "Y"                |
| `{{exe2_n}}`           | `exe2_n`         | % of employees where EXE2 = "N"                |
| `{{exe3_y}}`           | `exe3_y`         | % of employees where EXE3 = "Y"                |
| `{{exe3_n}}`           | `exe3_n`         | % of employees where EXE3 = "N"                |
| `{{str1_y}}`           | `str1_y`         | % of employees where STR1 = "Y"                |
| `{{str1_n}}`           | `str1_n`         | % of employees where STR1 = "N"                |
| `{{str2_y}}`           | `str2_y`         | % of employees where STR2 = "Y"                |
| `{{str2_n}}`           | `str2_n`         | % of employees where STR2 = "N"                |
| `{{str3_y}}`           | `str3_y`         | % of employees where STR3 = "Y"                |
| `{{str3_n}}`           | `str3_n`         | % of employees where STR3 = "N"                |
| `{{str4_y}}`           | `str4_y`         | % of employees where STR4 = "Y"                |
| `{{str4_n}}`           | `str4_n`         | % of employees where STR4 = "N"                |
| `{{hab1_y}}`           | `hab1_y`         | % of employees where HAB1 = "Y"                |
| `{{hab1_n}}`           | `hab1_n`         | % of employees where HAB1 = "N"                |
| `{{hab2_y}}`           | `hab2_y`         | % of employees where HAB2 = "Y"                |
| `{{hab2_n}}`           | `hab2_n`         | % of employees where HAB2 = "N"                |
| `{{hab3_y}}`           | `hab3_y`         | % of employees where HAB3 = "Y"                |
| `{{hab3_n}}`           | `hab3_n`         | % of employees where HAB3 = "N"                |
| `{{hab4_y}}`           | `hab4_y`         | % of employees where HAB4 = "Y"                |
| `{{hab4_n}}`           | `hab4_n`         | % of employees where HAB4 = "N"                |

All values are `(rawCount / employeeCount × 100).toFixed(1)`.

### Column Descriptions:
| Column | Full Name                         | "Y" Means                    |
|--------|-----------------------------------|------------------------------|
| NUT1   | Fruits & Vegetables Intake        | Adequate intake              |
| NUT2   | Milk/Curd/Eggs Intake             | Adequate intake              |
| NUT3   | Water Intake                      | Adequate intake              |
| NUT4   | Commercial/Junk Food              | Frequent consumption         |
| EXE1   | Daily Exercise                    | Regular exercise             |
| EXE2   | Toe Touch (Flexibility)           | Can perform                  |
| EXE3   | Push Ups (Strength)               | Can perform                  |
| STR1   | Job Satisfaction                  | Satisfied at work            |
| STR2   | Home Situation                    | Stable home situation        |
| STR3   | Major Financial/Life Problems     | Has major problems           |
| STR4   | Good Sleep Quality                | Gets good sleep              |
| HAB1   | Smoking                           | Smokes                       |
| HAB2   | Alcohol Consumption               | Consumes alcohol             |
| HAB3   | Oral Tobacco Use                  | Uses oral tobacco            |
| HAB4   | Safety Practices                  | Follows safety practices     |

---

## 14. Composite Lifestyle Metrics

These are derived combinations of the individual flag columns:

| Template Tag         | Variable       | Condition                                       | Description                                      |
|----------------------|----------------|-------------------------------------------------|--------------------------------------------------|
| `{{hab_all_y}}`      | `hab_all_y`    | HAB1 = "Y" AND HAB2 = "Y" AND HAB3 = "Y"      | % with all bad habits (smoking + alcohol + oral tobacco) |
| `{{nut_poor}}`       | `nut_poor`     | NUT1 = "N" AND NUT2 = "N" AND NUT3 = "N" AND NUT4 = "Y" | % with poor nutrition (no good food, eats junk)  |
| `{{exe_all_n}}`      | `exe_all_n`    | EXE1 = "N" AND EXE2 = "N" AND EXE3 = "N"      | % completely sedentary (no exercise at all)       |
| `{{low_hr_breath}}`  | `low_hr_breath`| PULSE < 60 OR BREATH < 30                      | % with low heart rate or low breath retention     |
| `{{muscu_oth_pct}}`  | `muscu_oth_pct`| MUSCU_OTH is non-empty (≠ "0", "none", "n/a")  | % with other musculoskeletal conditions           |

---

## 15. Diabetes-Specific Deep-Dive

These tags provide Yes/No percentages for diabetes-related medication and family history:

| Template Tag              | Variable            | Condition                                                         | Description                           |
|---------------------------|---------------------|-------------------------------------------------------------------|---------------------------------------|
| `{{diabetes_med_yes}}`    | `diabetes_med_yes`  | MEDICATION = "Y" AND MED_DETAILS contains "diabetes"              | % known diabetics on medication       |
| `{{diabetes_med_no}}`     | `diabetes_med_no`   | Complement of above (100% - yes%)                                 | % NOT known diabetics on medication   |
| `{{diabetes_unmed_yes}}`  | `diabetes_unmed_yes`| MEDICATION ≠ "Y" AND (FBS ≥ 101 OR RBS ≥ 161)                    | % unmedicated diabetic-risk employees |
| `{{diabetes_unmed_no}}`   | `diabetes_unmed_no` | Complement of above                                               | % NOT unmedicated diabetic-risk       |
| `{{family_hist_yes}}`     | `family_hist_yes`   | P_DETAILS column contains "sugar"                                 | % with family history of sugar/diabetes|
| `{{family_hist_no}}`      | `family_hist_no`    | Complement of above                                               | % without family history              |

---

## 16. Employee List Table

An employee list is generated for the Word document table:

| Field    | Column Used | Description              |
|----------|-------------|--------------------------|
| `sl_no`  | Auto (1-N)  | Serial number            |
| `emp_id` | `EMPID`     | Employee ID              |
| `name`   | `EMPNAME`   | Employee name            |
| `dept`   | `DEPART`    | Department               |

The `employees` array is passed to the template for rendering as a table using Docxtemplater's loop feature.

---

## 17. Chart Images (Alt-Text Tags)

Chart images are **NOT** placed using `{{tag}}` delimiters. Instead, placeholder images in the Word template have their **alt-text** (description) set to match specific tag names. The server replaces the underlying media file while preserving the layout.

### Dashboard Donut Charts (captured from live page):

| Alt-Text Tag Name         | Chart                           |
|---------------------------|---------------------------------|
| `chronic_chart_image`     | Chronic Disease Status donut    |
| `hypertension_chart_image`| Hypertension Risk donut         |
| `diabetes_chart_image`    | Diabetes Risk donut             |
| `cholesterol_chart_image` | Dyslipidemia Risk donut         |
| `obesity_chart_image`     | Obesity Risk donut              |
| `fitness_chart_image`     | Fitness Level donut             |
| `stress_chart_image`      | Stress Level donut              |
| `medication_chart_image`  | Medication donut                |

### Popup Detail Charts (re-rendered off-screen for capture):

| Alt-Text Tag Name              | Chart                                  |
|--------------------------------|----------------------------------------|
| `age_popup_chart_image`        | Age/Gender grouped bar chart           |
| `obesity_popup_chart_image`    | Obesity BMI breakdown bar chart        |
| `diabetes_popup_chart_image`   | Diabetes stages bar chart              |
| `hypertension_popup_chart_image`| Hypertension grades bar chart         |
| `cholesterol_popup_chart_image`| Cholesterol levels bar chart           |
| `fitness_popup_chart_image`    | Fitness metrics + heart rate bar chart |
| `stress_popup_chart_image`     | Stress indicators bar chart (STR1-4)   |
| `habits_popup_chart_image`     | Habits indicators bar chart (HAB1-4)   |
| `nutrition_popup_chart_image`  | Nutrition indicators bar chart (NUT1-4)|
| `exercise_popup_chart_image`   | Exercise indicators bar chart (EXE1-3) |
| `chronic_popup_chart_image`    | Chronic conditions horizontal bar      |
| `medication_popup_chart_image` | At-risk unmedicated bar chart          |

### How Image Injection Works:
1. The template `.docx` file contains placeholder images with specific **alt-text** descriptions matching the tag names above.
2. When generating the report, each chart is captured as a base64 PNG using `ApexCharts.dataURI()`.
3. The server (`server.js` → `injectChartImages()`) opens the Word file as a ZIP archive, scans `word/document.xml`, `word/header*.xml`, and `word/footer*.xml` for `<w:drawing>` elements with matching `descr` attributes.
4. For **Word-native charts** (inserted via Insert → Chart): the `<a:graphic>` section is replaced with a picture-based graphic.
5. For **regular images** (pasted/inserted pictures): the relationship target is retargeted to the new PNG file.
6. The new PNG media files are added to `word/media/` inside the ZIP.

---

## Data Flow Summary

```
User clicks "Group Profile" button
        │
        ▼
report-generator.js: generateUserReport()
        │
        ├─ Filter data by selected date range
        ├─ Calculate all text values (sections 1-16 above)
        ├─ Capture dashboard donut charts via chartInstances[].dataURI()
        ├─ Re-render popup charts off-screen via capturePopupChartImages()
        │
        ▼
POST /generate-report  →  server.js
        │
        ├─ Phase 1: Docxtemplater replaces {{tag}} text placeholders
        ├─ Phase 2: injectChartImages() swaps placeholder images by alt-text
        │
        ▼
Returns .docx file for download
```

---

## Required Data Columns Reference

| Column Name              | Used By                                    |
|--------------------------|--------------------------------------------|
| `GENDER`                 | Gender distribution                        |
| `AGE` / `DOB`           | Age distribution                           |
| `DESCENT`               | Ethnicity distribution                     |
| `BMI`                   | Obesity / weight / cardiac risk            |
| `BS1` (FBS)             | Diabetes profile / cardiac risk            |
| `BS2` (RBS)             | Diabetes profile / cardiac risk            |
| `BP1` (Systolic)        | Hypertension / cardiac risk                |
| `BP2` (Diastolic)       | Hypertension                               |
| `CHOLESTEROL`           | Cholesterol profile                        |
| `PULSE`                 | Fitness (heart rate)                       |
| `BREATH`                | Fitness (lung capacity)                    |
| `EXE1`, `EXE2`, `EXE3` | Exercise / fitness                         |
| `NUT1`–`NUT4`           | Nutrition                                  |
| `STR1`–`STR4`           | Stress                                     |
| `HAB1`–`HAB4`           | Habits (smoking, alcohol, tobacco, safety) |
| `MEDICATION`            | Medication status                          |
| `MED_DETAILS`           | Medication sub-categories / chronic disease|
| `P_DETAILS`             | Family history (diabetes)                  |
| `ART`                   | Arthritis                                  |
| `SPO`                   | Spondylitis                                |
| `BAC`                   | Back Ache                                  |
| `MUSCU_OTH`             | Other musculoskeletal conditions            |
| `FAMILY_HISTORY_CARDIAC`| Family cardiac history                     |
| `EMPID`                 | Employee ID                                |
| `EMPNAME`               | Employee name                              |
| `DEPART`                | Department                                 |
| `COMPANY`               | Company name (for filtering)               |
| `REFID`                 | Reference ID                               |
| `PHONE`                 | Employee phone                             |
| `DOSC`                  | Date of screening                          |
