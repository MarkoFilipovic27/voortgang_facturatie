class AfasApi {
    // Remove constructor properties for token and env number
    // constructor(afasToken, afasEnvironmentNumber, corsProxy = '') {
    //     this.afasToken = afasToken;
    //     this.afasEnvironmentNumber = afasEnvironmentNumber;
    //     this.baseUri = `https://${afasEnvironmentNumber}.restaccept.afas.online/ProfitRestServices/connectors/`;
    //     this.corsProxy = corsProxy;
    // }

    // Define the Netlify function endpoint
    netlifyProxyEndpoint = '/.netlify/functions/afas-proxy';

    async _fetchData(connector, options = {}) {
        const params = new URLSearchParams();
        params.append('connector', connector);
        
        // Only add take parameter if explicitly provided
        if (options.take !== undefined) {
            params.append('take', options.take.toString());
        }

        if (options.skip) params.append('skip', options.skip);
        if (options.filterfieldids) params.append('filterfieldids', options.filterfieldids);
        if (options.filtervalues) params.append('filtervalues', options.filtervalues);
        if (options.operatortypes) params.append('operatortypes', options.operatortypes);

        const url = `${this.netlifyProxyEndpoint}?${params.toString()}`;
        console.log(`Calling Netlify proxy: ${url}`);

        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch (e) {
                    errorData = { error: await response.text() };
                }
                console.error(`Error fetching ${connector} via proxy:`, response.status, errorData);
                throw new Error(`Failed to fetch ${connector}: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
            }

            const data = await response.json();
            return data.rows || [];
        } catch (error) {
            console.error(`Network or other error fetching ${connector} via proxy:`, error);
            throw error;
        }
    }

    async fetchProjects() {
        const connector = 'Cursor_Voortgang_Projecten';
        console.log(`Fetching projects using connector: ${connector}`);
        return this._fetchData(connector);
    }

    async fetchCumulativeWorkTypeData(projectCode = null) {
        const connector = 'Cursor_Voortgang_Nacalculatie_Werksoorten';
        const options = {};
        if (projectCode) {
            console.log(`Fetching cumulative work type data for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all cumulative work type data');
        }
        return this._fetchData(connector, options);
    }

    async fetchContractSumsAndPhases(projectCode = null) {
        const connector = 'Cursor_Voortgang_Projecten_Contractsom_Fase'; 
        const options = {};
        if (projectCode) {
            console.log(`Fetching contract sums and phases for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all contract sums and phases');
        }
        return this._fetchData(connector, options);
    }

    async fetchCumulativeCostData(projectCode = null) {
        const connector = 'Cursor_Voortgang_Projecten_Cumulatieven_Kosten';
        const options = {};
        if (projectCode) {
            console.log(`Fetching cumulative cost data for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all cumulative cost data');
        }
        return this._fetchData(connector, options);
    }

    async fetchProjectsAndPhases() {
        const connector = 'Cursor_Voortgang_Projecten_en_fases';
        console.log(`Fetching projects and phases using connector: ${connector}`);
        return this._fetchData(connector);
    }

    async fetchBaseProjectAndPhases(projectCode = null) {
        const connector = 'Cursor_Voortgang_Projecten_en_fases';
        const options = {};
        if (projectCode) {
            console.log(`Fetching base project/phases for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all base project/phases');
        }
        return this._fetchData(connector, options);
    }

    async fetchActualCosts(projectCode = null) {
        const connector = 'Cursor_Voortgang_Nacalculatie_Kostensoorten';
        const options = {};
        if (projectCode) {
            console.log(`Fetching actual costs for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all actual costs');
        }
        return this._fetchData(connector, options);
    }

    async fetchActualWorkTypes(projectCode = null) {
        const connector = 'Cursor_Voortgang_Nacalculatie_Werksoorten';
        const options = {};
        if (projectCode) {
            console.log(`Fetching actual work types for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all actual work types');
        }
        return this._fetchData(connector, options);
    }

    async fetchInvoicedAmounts(projectCode = null) {
        const connector = 'Cursor_Voortgang_Gefactureerd';
        const options = {};
        if (projectCode) {
            console.log(`Fetching invoiced amounts for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all invoiced amounts');
        }
        return this._fetchData(connector, options);
    }

    async fetchProjectsForSidebar() {
        const connector = 'Cursor_Voortgang_Projecten_per_projectleider';
        console.log(`Fetching sidebar projects using connector: ${connector}`);
        return this._fetchData(connector, { take: undefined });
    }

    async createDirectInvoice(projectCode, phaseCode, amount) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const data = {
                "FbDirectInvoice": {
                    "Element": {
                        "Fields": {
                            "OrDa": today,
                            "PrId": projectCode,
                            "PrSt": phaseCode
                        },
                        "Objects": [
                            {
                                "FbDirectInvoiceLines": {
                                    "Element": {
                                        "Fields": {
                                            "VaIt": "6",
                                            "ItCd": "TM",
                                            "BiUn": "*****",
                                            "QuUn": "1",
                                            "Upri": amount.toString()
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            };

            const url = `${this.netlifyProxyEndpoint}?connector=FbDirectInvoice`;
            console.log('Calling FbDirectInvoice endpoint:', url);
            console.log('Sending data:', JSON.stringify(data, null, 2));

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseText = await response.text();
            console.log('FbDirectInvoice Response Status:', response.status);
            console.log('FbDirectInvoice Response Text:', responseText);

            if (response.ok) {
                let responseData;
                try {
                    responseData = JSON.parse(responseText);
                } catch (jsonError) {
                    console.warn('Could not parse successful response as JSON:', jsonError);
                    return {
                        success: true,
                        message: 'Factuurregel succesvol verwerkt (maar factuurnummer kon niet worden gelezen)',
                        invoiceNumber: null,
                        details: responseText
                    };
                }

                let invoiceNumber = null;
                if (responseData.results && 
                    responseData.results.FbDirectInvoice && 
                    Array.isArray(responseData.results.FbDirectInvoice) && 
                    responseData.results.FbDirectInvoice.length > 1 && 
                    responseData.results.FbDirectInvoice[1] && 
                    responseData.results.FbDirectInvoice[1].LiIn) {
                    invoiceNumber = responseData.results.FbDirectInvoice[1].LiIn;
                } else if (responseData.results && responseData.results[0] && responseData.results[0].LiIn) {
                    invoiceNumber = responseData.results[0].LiIn;
                } else if (responseData.FbDirectInvoice && responseData.FbDirectInvoice.Element && responseData.FbDirectInvoice.Element.Fields && responseData.FbDirectInvoice.Element.Fields.LiIn) {
                    invoiceNumber = responseData.FbDirectInvoice.Element.Fields.LiIn;
                }

                return {
                    success: true,
                    message: `Factuurregel succesvol verwerkt. Factuurnummer: ${invoiceNumber || 'Niet gevonden'}`,
                    invoiceNumber: invoiceNumber,
                    details: responseData
                };
            } else {
                let errorData = { message: `Fout ${response.status}: ${response.statusText}` };
                try {
                    errorData = JSON.parse(responseText);
                } catch (jsonError) {
                    console.warn('Could not parse error response as JSON:', jsonError);
                }
                const errorMessage = errorData.error?.message || errorData.message || `Onbekende fout: ${response.statusText}`;
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('Error in createDirectInvoice:', error);
            return {
                success: false,
                message: 'Er is een fout opgetreden bij het aanmaken van de factuurregel',
                details: error.message 
            };
        }
    }
} 