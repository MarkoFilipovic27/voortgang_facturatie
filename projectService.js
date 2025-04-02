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
            // Fetch all data in parallel: base phases, work types, costs, and invoice terms
            const [baseData, cumulativeWorkTypeData, cumulativeCostData, invoiceTermData] = await Promise.all([
                this.afasApi.fetchBaseProjectAndPhases(projectCode), // Correct function for base structure
                this.afasApi.fetchCumulativeWorkTypeData(projectCode),
                this.afasApi.fetchCumulativeCostData(projectCode),   // Fetch cost data
                this.afasApi.fetchInvoiceTerms(projectCode) // Fetch invoice term data (contract sums)
            ]);

            // Log raw data
            console.log('Raw Base Project/Phases:', baseData);
            console.log('Raw Base Project/Phases type:', typeof baseData);
            console.log('Raw Base Project/Phases structure:', baseData ? Object.keys(baseData) : 'null');
            console.log('Raw Cumulative Work Types:', cumulativeWorkTypeData);
            console.log('Raw Cumulative Work Types type:', typeof cumulativeWorkTypeData);
            console.log('Raw Cumulative Work Types structure:', cumulativeWorkTypeData ? Object.keys(cumulativeWorkTypeData) : 'null');
            console.log('Raw Cumulative Costs:', cumulativeCostData);
            console.log('Raw Cumulative Costs type:', typeof cumulativeCostData);
            console.log('Raw Cumulative Costs structure:', cumulativeCostData ? Object.keys(cumulativeCostData) : 'null');
            console.log('Raw Invoice Terms:', invoiceTermData); // Log raw invoice term data

            // Extract the rows array if the data is in {rows: [...]} format
            const baseRowsArg = (baseData && baseData.rows) ? baseData.rows : (Array.isArray(baseData) ? baseData : []); 
            const cumulativeRowsArg = (cumulativeWorkTypeData && cumulativeWorkTypeData.rows) ? cumulativeWorkTypeData.rows : (Array.isArray(cumulativeWorkTypeData) ? cumulativeWorkTypeData : []); 
            const cumulativeCostRowsArg = (cumulativeCostData && cumulativeCostData.rows) ? cumulativeCostData.rows : (Array.isArray(cumulativeCostData) ? cumulativeCostData : []); 
            const invoiceTermRowsArg = (invoiceTermData && invoiceTermData.rows) ? invoiceTermData.rows : (Array.isArray(invoiceTermData) ? invoiceTermData : []); // Extract invoice term rows

            // Check lengths before transforming
            console.log(`CHECK baseRowsArg length: ${baseRowsArg.length}`);
            console.log(`CHECK cumulativeRowsArg length: ${cumulativeRowsArg.length}`);
            console.log(`CHECK cumulativeCostRowsArg length: ${cumulativeCostRowsArg.length}`); 
            console.log(`CHECK invoiceTermRowsArg length: ${invoiceTermRowsArg.length}`); // Log invoice term rows length

            // Transform the fetched data
            const transformedData = this.transformData(
                baseRowsArg,         // Pass base phase data
                cumulativeRowsArg,   // Pass work type data
                cumulativeCostRowsArg, // Pass cost data
                invoiceTermRowsArg   // Pass invoice term data
            );

            return transformedData;
        } catch (error) {
            console.error(`Error fetching data for project ${projectCode}:`, error);
            throw error; // Re-throw to be handled by App.js
        }
    }

    transformData(baseRows, cumulativeWorkTypeRows, cumulativeCostRows, invoiceTermRows) { // Added invoiceTermRows
        console.log('Starting data transformation...');
        
        // Ensure we're working with arrays
        const baseRowsArray = Array.isArray(baseRows) ? baseRows : (baseRows?.rows || []);
        const workTypeRowsArray = Array.isArray(cumulativeWorkTypeRows) ? cumulativeWorkTypeRows : (cumulativeWorkTypeRows?.rows || []);
        const costRowsArray = Array.isArray(cumulativeCostRows) ? cumulativeCostRows : (cumulativeCostRows?.rows || []);
        const invoiceTermRowsArray = Array.isArray(invoiceTermRows) ? invoiceTermRows : (invoiceTermRows?.rows || []); // Ensure invoice terms is array

        console.log('Processed arrays lengths:', {
            base: baseRowsArray.length,
            workTypes: workTypeRowsArray.length,
            costs: costRowsArray.length,
            invoiceTerms: invoiceTermRowsArray.length // Log length
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

        // Process cumulative work type data
        console.log('Processing Cumulative Work Type rows...', workTypeRowsArray);
        console.log(`Number of Cumulative Work Type Rows: ${workTypeRowsArray.length}`);
        workTypeRowsArray.forEach(row => {
             let projectCode = row.Projectnummer;
            if (!projectCode) {
                console.warn(`Cumulative Work Type Row - Skipping due to missing Projectnummer`);
                return;
            }
            const lookupKey = String(projectCode).trim(); 
            const project = projectMap.get(lookupKey); 
            console.log(`Cumulative Work Type Row - Project found in map for key '${lookupKey}'?`, project ? 'Yes' : 'No');
            
            if (project) {
                // Ensure array exists (redundant due to initialization, but safe)
                if (!project.cumulativeWorkTypes) project.cumulativeWorkTypes = []; 

                project.cumulativeWorkTypes.push({
                    itemCode: row.Itemcode, 
                    itemDescription: row.Item_omschrijving, 
                    budgetHours: parseFloat(row.Aantal_uren_voorcalculatie) || 0, 
                    actualHours: parseFloat(row.Aantal_uren_nacalculatie) || 0, 
                    budgetCosts: parseFloat(row.Totaal_kostprijs_voorcalculatie) || 0, 
                    actualCosts: parseFloat(row.Totaal_kostprijs_nacalculatie) || 0 
                });
            } else {
                console.warn(`Cumulative work type row found for project ${projectCode} not in base structure:`, row);
            }
        });
        
        // NEW: Process cumulative cost data (Uncommented and adjusted)
        console.log('Processing Cumulative Cost rows...', costRowsArray);
        console.log(`Number of Cumulative Cost Rows: ${costRowsArray.length}`);
        costRowsArray.forEach(row => {
            let projectCode = row.Projectnummer; 
            if (!projectCode) {
                console.warn(`Cumulative Cost Row - Skipping due to missing Projectnummer field`);
                return;
            }
            const lookupKey = String(projectCode).trim(); 
            const project = projectMap.get(lookupKey);

            console.log(`Processing cost row for project: ${projectCode}, Found in map? ${project ? 'Yes' : 'No'}`);

            if (project) {
                 // Ensure array exists (redundant due to initialization, but safe)
                if (!project.cumulativeCosts) project.cumulativeCosts = []; 
                
                const costItem = {
                    itemCode: row.KOSTENSOORT || 'N/A',
                    itemDescription: row.Omschrijving_kostensoort || 'Geen omschrijving',
                    budgetCosts: parseFloat(row.Budget_kosten) || 0,      // Assuming field name is Budget_kosten
                    actualCosts: parseFloat(row.Nacalculatie_kosten) || 0 // Assuming field name is Nacalculatie_kosten
                };
                console.log('Adding cumulative cost item:', costItem);
                project.cumulativeCosts.push(costItem);
            } else {
                 console.warn(`Cumulative cost row found for project ${projectCode} not in base structure:`, row);
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