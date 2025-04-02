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
            // Fetch all data in parallel: base phases, work types, ACTUAL costs, and invoice terms
            const [baseData, cumulativeWorkTypeData, actualCostData, invoiceTermData] = await Promise.all([
                this.afasApi.fetchBaseProjectAndPhases(projectCode), 
                this.afasApi.fetchCumulativeWorkTypeData(projectCode),
                this.afasApi.fetchActualCosts(projectCode),   // Fetch ACTUAL cost data per cost type
                this.afasApi.fetchInvoiceTerms(projectCode) 
            ]);

            // Log raw data
            console.log('Raw Base Project/Phases:', baseData);
            console.log('Raw Base Project/Phases type:', typeof baseData);
            console.log('Raw Base Project/Phases structure:', baseData ? Object.keys(baseData) : 'null');
            console.log('Raw Cumulative Work Types:', cumulativeWorkTypeData);
            console.log('Raw Cumulative Work Types type:', typeof cumulativeWorkTypeData);
            console.log('Raw Cumulative Work Types structure:', cumulativeWorkTypeData ? Object.keys(cumulativeWorkTypeData) : 'null');
            console.log('Raw Actual Costs:', actualCostData); // Log raw actual cost data
            console.log('Raw Cumulative Costs type:', typeof actualCostData);
            console.log('Raw Cumulative Costs structure:', actualCostData ? Object.keys(actualCostData) : 'null');
            console.log('Raw Invoice Terms:', invoiceTermData); 

            // Extract the rows array if the data is in {rows: [...]} format
            const baseRowsArg = (baseData && baseData.rows) ? baseData.rows : (Array.isArray(baseData) ? baseData : []); 
            const cumulativeRowsArg = (cumulativeWorkTypeData && cumulativeWorkTypeData.rows) ? cumulativeWorkTypeData.rows : (Array.isArray(cumulativeWorkTypeData) ? cumulativeWorkTypeData : []); 
            const actualCostRowsArg = (actualCostData && actualCostData.rows) ? actualCostData.rows : (Array.isArray(actualCostData) ? actualCostData : []); // Extract actual cost rows
            const invoiceTermRowsArg = (invoiceTermData && invoiceTermData.rows) ? invoiceTermData.rows : (Array.isArray(invoiceTermData) ? invoiceTermData : []); 

            // Check lengths before transforming
            console.log(`CHECK baseRowsArg length: ${baseRowsArg.length}`);
            console.log(`CHECK cumulativeRowsArg length: ${cumulativeRowsArg.length}`);
            console.log(`CHECK actualCostRowsArg length: ${actualCostRowsArg.length}`); // Log actual cost rows length
            console.log(`CHECK invoiceTermRowsArg length: ${invoiceTermRowsArg.length}`); 

            // Transform the fetched data
            const transformedData = this.transformData(
                baseRowsArg,         
                cumulativeRowsArg,   
                actualCostRowsArg, // Pass actual cost data
                invoiceTermRowsArg   
            );

            return transformedData;
        } catch (error) {
            console.error(`Error fetching data for project ${projectCode}:`, error);
            throw error; // Re-throw to be handled by App.js
        }
    }

    transformData(baseRows, cumulativeWorkTypeRows, actualCostRows, invoiceTermRows) { // Changed cumulativeCostRows to actualCostRows
        console.log('Starting data transformation...');
        
        // Ensure we're working with arrays
        const baseRowsArray = Array.isArray(baseRows) ? baseRows : (baseRows?.rows || []);
        const workTypeRowsArray = Array.isArray(cumulativeWorkTypeRows) ? cumulativeWorkTypeRows : (cumulativeWorkTypeRows?.rows || []);
        const actualCostRowsArray = Array.isArray(actualCostRows) ? actualCostRows : (actualCostRows?.rows || []); // Ensure actual costs is array
        const invoiceTermRowsArray = Array.isArray(invoiceTermRows) ? invoiceTermRows : (invoiceTermRows?.rows || []); 

        console.log('Processed arrays lengths:', {
            base: baseRowsArray.length,
            workTypes: workTypeRowsArray.length,
            costs: actualCostRowsArray.length, // Changed log key
            invoiceTerms: invoiceTermRowsArray.length 
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
                    cumulativeWorkTypes: [], // Initialize work types array
                    cumulativeCosts: [] // Initialize costs array HERE
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

        // Process cumulative work type data to update phase actual work type costs
        console.log('Processing Cumulative Work Type rows (for actual costs)...', workTypeRowsArray);
        console.log(`Number of Cumulative Work Type Rows: ${workTypeRowsArray.length}`);
        workTypeRowsArray.forEach(row => {
             let projectCode = row.Projectnummer;
             const phaseCode = row.Projectfase; // Assuming Projectfase exists here too
             const workTypeCostAmount = parseFloat(row.Kostprijsbedrag) || 0; // Use Kostprijsbedrag

            if (!projectCode || !phaseCode) {
                // console.warn(`Cumulative Work Type Row - Skipping due to missing Projectnummer or Projectfase`, row);
                return;
            }

            if (workTypeCostAmount === 0) return; // Skip zero amounts
            
            const lookupKey = String(projectCode).trim(); 
            const project = projectMap.get(lookupKey); 
            // console.log(`Cumulative Work Type Row - Project found in map for key '${lookupKey}'?`, project ? 'Yes' : 'No');
            
            if (project && project.phases.has(phaseCode)) {
                const phase = project.phases.get(phaseCode);
                // console.log(`Adding actual work type cost ${workTypeCostAmount} to Project ${projectCode}, Phase ${phaseCode}. Current: ${phase.actualWorkTypes}`);
                phase.actualWorkTypes += workTypeCostAmount; // Add work type cost to phase total
            } else {
                // console.warn(`Cumulative work type row found for project ${projectCode}, phase ${phaseCode} not in base structure or phase map:`, row);
            }
        });
        
        // Process actual cost data to update phase actual costs
        console.log('Processing Actual Cost rows...', actualCostRowsArray);
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