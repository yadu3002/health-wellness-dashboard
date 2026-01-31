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

            // 3. Capture Chart Images
            // Get chart images from the admin page
            const chartImages = {};
            
            // Wait for charts to fully render (charts might be rendering asynchronously)
            console.log('Waiting for charts to render...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            if (typeof window.captureChartAsImage === 'function') {
                console.log('=== Capturing Chart Images ===');
                
                // Capture key charts for the report (only existing charts)
                const chartIds = {
                    ageChart: 'chartParticipants',
                    stressChart: 'chartStress',
                    fitnessChart: 'chartFitness',
                    hypertensionChart: 'chartHypertension',
                    cholesterolChart: 'chartCholesterol',
                    diabetesChart: 'chartDiabetes',
                    medicationChart: 'chartMedication'
                };

                for (const [key, chartId] of Object.entries(chartIds)) {
                    const canvas = document.getElementById(chartId);
                    if (canvas) {
                        // Check if canvas has content
                        const hasContent = canvas.width > 0 && canvas.height > 0;
                        if (hasContent) {
                            const image = window.captureChartAsImage(chartId);
                            if (image && image.length > 100) {
                                chartImages[key] = image;
                                console.log(`✅ ${key} (${chartId}): Captured successfully, length: ${image.length}`);
                            } else {
                                console.log(`⚠️ ${key} (${chartId}): Capture returned invalid data`);
                            }
                        } else {
                            console.log(`⚠️ ${key} (${chartId}): Canvas exists but has no content (${canvas.width}x${canvas.height})`);
                        }
                    } else {
                        console.log(`❌ ${key} (${chartId}): Canvas element not found in DOM`);
                    }
                }
                
                console.log(`Total charts captured: ${Object.keys(chartImages).length}`);
            } else {
                console.error('❌ captureChartAsImage function not available on window object');
                console.log('Available window functions:', Object.keys(window).filter(k => k.includes('chart') || k.includes('Chart')));
            }

            // 4. Send to Server
            // We pass an object so it's easy to add more stats later
            const reportPayload = {
                count: employeeCount,
                s_date,
                e_date,
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
                current_date,
                // Chart images
                age_chart_image: chartImages.ageChart,
                stress_chart_image: chartImages.stressChart,
                fitness_chart_image: chartImages.fitnessChart,
                hypertension_chart_image: chartImages.hypertensionChart,
                cholesterol_chart_image: chartImages.cholesterolChart,
                diabetes_chart_image: chartImages.diabetesChart,
                medication_chart_image: chartImages.medicationChart
            };

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/1d97a748-68d6-4f07-a07e-26d0c0815749',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2',location:'report-generator.js:generateUserReport',message:'Calling generateWordFileOnServer',data:{payloadKeys:Object.keys(reportPayload),count:reportPayload.count,s_date:reportPayload.s_date,e_date:reportPayload.e_date},timestamp:Date.now()})}).catch(()=>{});
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
