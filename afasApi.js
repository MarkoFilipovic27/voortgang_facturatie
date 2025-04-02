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

    async _fetchData(connector, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        console.log(`_fetchData called for connector: ${connector}, params:`, params);
        try {
            const response = await fetch(`${this.netlifyProxyEndpoint}?connector=${encodeURIComponent(connector)}${queryString ? '&' + queryString : ''}`);
            
            console.log(`_fetchData - Response status for ${connector}: ${response.status}`);

            if (!response.ok) {
                let errorDetails = await response.text(); // Try to get text body for error details
                try {
                    // Attempt to parse as JSON if possible, might contain more info
                    const jsonError = JSON.parse(errorDetails);
                    errorDetails = jsonError; 
                } catch (e) {
                    // If not JSON, use the raw text
                }
                console.error(`_fetchData - Error response body for ${connector}:`, errorDetails);
                throw new Error(`Failed to fetch ${connector}: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log(`_fetchData - Raw data received for ${connector}:`, JSON.stringify(data).substring(0, 500) + '...'); // Log first 500 chars of raw data
            
            // Return the direct data (handle potential {rows: ...} structure later if needed)
            return data; 

        } catch (error) {
            console.error(`Error in _fetchData for ${connector}:`, error);
            throw error; // Re-throw
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

    async fetchInvoiceTerms(projectCode = null) {
        const connector = 'Cursor_Voortgang_Factuurtermijnen';
        const options = {};
        if (projectCode) {
            console.log(`Fetching invoice terms for project ${projectCode}`);
            options.filterfieldids = 'Projectnummer';
            options.filtervalues = projectCode;
            options.operatortypes = '1';
        } else {
            console.log('Fetching all invoice terms');
        }
        return this._fetchData(connector, options);
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