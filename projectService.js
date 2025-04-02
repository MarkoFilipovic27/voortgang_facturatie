class ProjectService {
    constructor(afasApi) {
        this.afasApi = afasApi;
    }

    calculateToInvoice(newProgress, contractSum, invoiced) {
        return (newProgress / 100 * contractSum) - invoiced;
    }

    async fetchProjectData(projectCode = null) {
        if (!projectCode) {
            throw new Error("fetchProjectData requires a projectCode when fetching details.");
        }
        try {
            // Fetch all data in parallel: base phases, cumulative work types, cumulative costs, and invoice terms
            const [baseData, cumulativeWorkTypeData, cumulativeCostData, invoiceTermData] = await Promise.all([
                this.afasApi.fetchBaseProjectAndPhases(projectCode), 
                this.afasApi.fetchCumulativeWorkTypeData(projectCode), // Gets cumulative work types for bars
                this.afasApi.fetchCumulativeCostData(projectCode),   // Gets cumulative costs for bars
                this.afasApi.fetchInvoiceTerms(projectCode) 
                // Removed: this.afasApi.fetchProjectCumulativeWorkTypes(projectCode) 
            ]);

            // Log raw data
            console.log('Raw Base Project/Phases:', baseData);
            console.log('Raw Cumulative Work Types:', cumulativeWorkTypeData); // Renamed log back
            console.log('Raw Cumulative Costs:', cumulativeCostData); // Renamed log back
            console.log('Raw Invoice Terms:', invoiceTermData); 
            // Removed log for projCumulativeWorkTypeData

            // Extract the rows array if the data is in {rows: [...]} format
            const baseRowsArg = (baseData && baseData.rows) ? baseData.rows : (Array.isArray(baseData) ? baseData : []); 
            const cumulativeWorkTypeRowsArg = (cumulativeWorkTypeData && cumulativeWorkTypeData.rows) ? cumulativeWorkTypeData.rows : (Array.isArray(cumulativeWorkTypeData) ? cumulativeWorkTypeData : []); // Renamed variable back
            const cumulativeCostRowsArg = (cumulativeCostData && cumulativeCostData.rows) ? cumulativeCostData.rows : (Array.isArray(cumulativeCostData) ? cumulativeCostData : []); // Renamed variable back
            const invoiceTermRowsArg = (invoiceTermData && invoiceTermData.rows) ? invoiceTermData.rows : (Array.isArray(invoiceTermData) ? invoiceTermData : []); 
            // Removed projCumulativeWorkTypeRowsArg

            // Check lengths before transforming
            console.log(`CHECK baseRowsArg length: ${baseRowsArg.length}`);
            console.log(`CHECK cumulativeWorkTypeRowsArg length: ${cumulativeWorkTypeRowsArg.length}`); // Renamed variable back
            console.log(`CHECK cumulativeCostRowsArg length: ${cumulativeCostRowsArg.length}`); // Renamed variable back
            console.log(`CHECK invoiceTermRowsArg length: ${invoiceTermRowsArg.length}`); 
            // Removed log for projCumulativeWorkTypeRowsArg length

            // Transform the fetched data
            const transformedData = this.transformData(
                baseRowsArg,         
                cumulativeWorkTypeRowsArg,   // Renamed variable back
                cumulativeCostRowsArg, // Renamed variable back
                invoiceTermRowsArg   
                // Removed projCumulativeWorkTypeRowsArg
            );

            return transformedData;
        } catch (error) {
            console.error(`Error fetching data for project ${projectCode}:`, error);
            throw error; // Re-throw to be handled by App.js
        }
    }

    transformData(baseRows, cumulativeWorkTypeRows, cumulativeCostRows, invoiceTermRows) { // Reverted parameters
        console.log('Starting data transformation...');
        
        // Ensure we're working with arrays
        const baseRowsArray = Array.isArray(baseRows) ? baseRows : (baseRows?.rows || []);
        const cumulativeWorkTypeRowsArray = Array.isArray(cumulativeWorkTypeRows) ? cumulativeWorkTypeRows : (cumulativeWorkTypeRows?.rows || []); // Renamed variable back
        const cumulativeCostRowsArray = Array.isArray(cumulativeCostRows) ? cumulativeCostRows : (cumulativeCostRows?.rows || []); // Renamed variable back
        const invoiceTermRowsArray = Array.isArray(invoiceTermRows) ? invoiceTermRows : (invoiceTermRows?.rows || []); 
        // Removed projCumulativeWorkTypeRowsArray

        console.log('Processed arrays lengths:', {
            base: baseRowsArray.length,
            cumulativeWorkTypes: cumulativeWorkTypeRowsArray.length, // Renamed key back
            cumulativeCosts: cumulativeCostRowsArray.length, // Renamed key back
            invoiceTerms: invoiceTermRowsArray.length 
            // Removed projCumulativeWorkTypes key
        });

        // Create a map of projects for efficient lookup
        const projectMap = new Map();

        // Process base phase data first to initialize projects
        baseRowsArray.forEach(row => {
            const projectCode = row.Projectnummer;
            const phaseCode = row.Projectfase;
            const projectDescription = row.Project_omschrijving;
            const phaseDescription = row.Projectfase_omschrijving;

            if (!projectCode || !phaseCode) {
                console.warn('Skipping base row due to missing project/phase code:', row);
                return;
            }

            let project = projectMap.get(projectCode);
            if (!project) {
                project = {
                    projectCode: projectCode,
                    projectDescription: projectDescription || 'Onbekende Projectomschrijving',
                    phases: new Map(),
                    cumulativeWorkTypes: [], // Restored array for work type bars
                    cumulativeCosts: [] // Restored array for cost bars
                    // detailedWorkTypes: [] // Removed
                };
                projectMap.set(projectCode, project);
            }

            if (!project.phases.has(phaseCode)) {
                project.phases.set(phaseCode, {
                    phaseCode: phaseCode,
                    phaseDescription: phaseDescription || 'Onbekende Faseomschrijving',
                    contractSum: 0, // Initialize contractSum, will be updated later
                    actualCosts: 0,
                    actualWorkTypes: 0,
                    invoiced: 0,
                    progress: 0,
                    newProgress: null,
                    toInvoice: 0
                });
            }
        });

        // Process cumulative work type data for bars
        console.log('Processing Cumulative Work Type rows (for bars)...', cumulativeWorkTypeRowsArray); // Updated log
        console.log(`Number of Cumulative Work Type Rows: ${cumulativeWorkTypeRowsArray.length}`); // Updated log
        cumulativeWorkTypeRowsArray.forEach(row => { // Renamed variable back
             let projectCode = row.Projectnummer;
             // Removed phaseCode and costAmount logic for phase totals

            if (!projectCode) {
                console.warn(`Cumulative Work Type Row - Skipping due to missing Projectnummer`, row);
                return;
            }
            
            const lookupKey = String(projectCode).trim(); 
            const project = projectMap.get(lookupKey); 
            
            if (project) {
                // Restore pushing data for bars
                if (!project.cumulativeWorkTypes) project.cumulativeWorkTypes = []; 
                
                // Debugging om de exacte veldnamen te zien
                console.log('Raw work type row:', row);
                
                project.cumulativeWorkTypes.push({
                    itemCode: row.Itemcode, 
                    itemDescription: row.Item_omschrijving, 
                    budgetHours: parseFloat(row.Aantal_uren_voorcalculatie) || 0, 
                    actualHours: parseFloat(row.Aantal_uren_nacalculatie) || 0,
                    budgetCosts: parseFloat(row.Totaal_kostprijs_voorcalculatie) || 0, 
                    actualCosts: parseFloat(row.Totaal_kostprijs_nacalculatie) || 0,
                    // Extra debug info om veldnamen te controleren
                    _debug_budgetHours: row.Aantal_uren_voorcalculatie,
                    _debug_actualHours: row.Aantal_uren_nacalculatie
                });
            } else {
                console.warn(`Cumulative work type row found for project ${projectCode} not in base structure:`, row);
            }
        });

        // Process cumulative cost data for bars
        console.log('Processing Cumulative Cost rows (for bars)...', cumulativeCostRowsArray); // Updated log
        cumulativeCostRowsArray.forEach(row => {
            const projectCode = row.Projectnummer; 
            // Removed phaseCode and costAmount logic for phase totals
            if (!projectCode) {
                console.warn(`Cumulative Cost Row - Skipping due to missing Projectnummer`, row);
                return;
            }
            const lookupKey = String(projectCode).trim(); 
            const project = projectMap.get(lookupKey);

            if (project) {
                 // Restore pushing data for bars
                if (!project.cumulativeCosts) project.cumulativeCosts = []; 
                project.cumulativeCosts.push({
                    itemCode: row.KOSTENSOORT || 'N/A', // Use field from this connector
                    itemDescription: row.Omschrijving_kostensoort || 'Geen omschrijving', // Use field from this connector
                    budgetCosts: parseFloat(row.Budget_kosten) || 0,      // Use field from this connector
                    actualCosts: parseFloat(row.Nacalculatie_kosten) || 0 // Use field from this connector
                });
            } else {
                 console.warn(`Cumulative cost row found for project ${projectCode} not in base structure:`, row);
            }
        });

        // Removed processing for detailedWorkTypes
        
        // Process actual cost data to update phase actual costs (KEEP THIS PART for the main table)
        console.log('Processing Actual Cost rows (for phase totals)...', actualCostRowsArray); // Log message adjusted
        actualCostRowsArray.forEach(row => {
            const projectCode = row.Projectnummer; 
            const phaseCode = row.Projectfase; // Assuming Projectfase exists here too
            const costAmount = parseFloat(row.Kostprijsbedrag) || 0; // Use Kostprijsbedrag

            if (!projectCode || !phaseCode) {
                console.warn(`Actual Cost Row - Skipping due to missing Projectnummer or Projectfase`, row);
                return;
            }
            
            if (costAmount === 0) return; // Skip zero amounts

            const lookupKey = String(projectCode).trim(); 
            const project = projectMap.get(lookupKey);

            if (project && project.phases.has(phaseCode)) {
                const phase = project.phases.get(phaseCode);
                // console.log(`Adding actual cost ${costAmount} to Project ${projectCode}, Phase ${phaseCode}. Current: ${phase.actualCosts}`);
                phase.actualCosts += costAmount; // Add cost to phase total
            } else {
                 console.warn(`Actual cost row found for project ${projectCode}, phase ${phaseCode} not in base structure or phase map:`, row);
            }
        });

        // NEW: Process Invoice Term data to update contract sums
        console.log('Processing Invoice Term rows...', invoiceTermRowsArray);
        invoiceTermRowsArray.forEach(row => {
            const projectCode = row.Projectnummer;
            const phaseCode = row.Projectfase; 
            const contractSum = parseFloat(row.Termijnbedrag) || 0; // Corrected field name to 'Termijnbedrag'

            if (!projectCode || !phaseCode) {
                console.warn(`Invoice Term Row - Skipping due to missing Projectnummer or Projectfase`, row);
                return;
            }

            const lookupKey = String(projectCode).trim();
            const project = projectMap.get(lookupKey);

            if (project && project.phases.has(phaseCode)) {
                const phase = project.phases.get(phaseCode);
                console.log(`Updating contract sum for Project ${projectCode}, Phase ${phaseCode} from ${phase.contractSum} to ${contractSum}`);
                phase.contractSum = contractSum; // Update the contract sum
            } else {
                console.warn(`Invoice term row found for project ${projectCode}, phase ${phaseCode} not in base structure or phase map:`, row);
            }
        });

        // Convert map values to array and finalize phase data within projects
        const finalData = Array.from(projectMap.values()).map(project => ({
            ...project,
            phases: Array.from(project.phases.values()) // Just convert phases map to array
            // Note: progress/toInvoice calculation might need data from other sources 
            // that are currently not fetched in this simplified version.
            // We'll rely on defaults (0) for now.
        }));

        console.log('Final transformed data:', finalData);
        return finalData;
    }

    updateProjectProgress(projects, projectCode, phaseCode, newProgress) {
        return projects.map(project => {
            if (project.projectCode !== projectCode) return project;
            
            return {
                ...project,
                phases: project.phases.map(phase => {
                    if (phase.phaseCode !== phaseCode) return phase;
                    
                    const toInvoice = this.calculateToInvoice(
                        newProgress,
                        phase.contractSum,
                        phase.invoiced
                    );
                    
                    return {
                        ...phase,
                        newProgress,
                        toInvoice
                    };
                })
            };
        });
    }

    updateProjectWithInvoicedAmounts(project, invoicedAmountsData) {
        if (!invoicedAmountsData || !invoicedAmountsData.rows) {
            console.warn(`No invoiced amounts data available for project ${project.projectCode}`);
            return;
        }

        console.log(`Processing invoiced amounts for project ${project.projectCode}`);
        console.log('Total invoiced amount rows:', invoicedAmountsData.rows.length);

        const invoicedMap = new Map();

        // Process all invoiced amounts for this project
        invoicedAmountsData.rows.forEach(row => {
            const phaseCode = row.Projectfase;
            const invoiced = parseFloat(row.Gefactureerd) || 0;

            if (!phaseCode) {
                console.log('Skipping invoiced amount row due to missing phase:', row);
                return;
            }

            const currentTotal = invoicedMap.get(phaseCode) || 0;
            const newTotal = currentTotal + invoiced;
            invoicedMap.set(phaseCode, newTotal);

            console.log(`Processing invoice for phase ${phaseCode}:`, {
                phaseCode,
                invoiced,
                currentTotal,
                newTotal
            });
        });

        // Update each phase with its invoiced amount
        project.phases.forEach(phase => {
            const invoicedAmount = invoicedMap.get(phase.phaseCode) || 0;

            console.log(`Updating phase with invoiced amount:`, {
                projectCode: project.projectCode,
                phaseCode: phase.phaseCode,
                invoicedAmount,
                contractSum: phase.contractSum
            });

            phase.invoiced = invoicedAmount;
            
            // Calculate progress based on invoiced amount
            phase.progress = phase.contractSum > 0 ? 
                Math.round((phase.invoiced / phase.contractSum) * 100) : 0;
            phase.newProgress = phase.progress;

            // Calculate toInvoice
            phase.toInvoice = this.calculateToInvoice(phase.newProgress, phase.contractSum, phase.invoiced);

            console.log(`Updated phase values:`, {
                projectCode: project.projectCode,
                phaseCode: phase.phaseCode,
                invoiced: phase.invoiced,
                progress: phase.progress,
                newProgress: phase.newProgress,
                toInvoice: phase.toInvoice
            });
        });
    }
} 