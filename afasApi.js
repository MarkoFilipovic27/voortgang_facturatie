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
        // Set default take value to 1000 if not specified
        const take = options.take || 1000;
        
        const params = new URLSearchParams();
        params.append('connector', connector);
        params.append('take', take.toString());

        if (options.skip) params.append('skip', options.skip);
        if (options.filterfieldids) params.append('filterfieldids', options.filterfieldids);
        if (options.filtervalues) params.append('filtervalues', options.filtervalues);

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
        } else {
            console.log('Fetching all cumulative cost data');
        }
        return this._fetchData(connector, options);
    }

    async fetchProjectsAndPhases() {
        try {
            const response = await fetch(
                `${this.proxyUrl}${this.config.baseUrl}/Cursor_Voortgang_Projecten_en_fases`,
                { 
                    headers: this.getHeaders(),
                    mode: 'cors'
                }
            );
            if (!response.ok) throw new Error('Failed to fetch projects and phases');
            return await response.json();
        } catch (error) {
            console.error('Error fetching projects and phases:', error);
            throw error;
        }
    }

    async fetchBaseProjectAndPhases(projectCode = null) {
        let endpoint = '/connectors/Cursor_Voortgang_Projecten_en_fases';
        if (projectCode) {
            endpoint += `?filterfieldids=Projectnummer&filtervalues=${encodeURIComponent(projectCode)}&operatortypes=1`;
        }
        const url = `${this.proxyUrl}${this.config.baseUrl.replace(/\/connectors\/?$/, '')}${endpoint}`;
        console.log('Fetching base project/phases from URL:', url);
        try {
            const response = await fetch(url, {
                headers: this.getHeaders(),
                mode: 'cors'
            });
            if (!response.ok) {
                let errorDetails = `HTTP error! status: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorDetails += ` - ${errorData.message || JSON.stringify(errorData)}`;
                } catch (e) { /* Ignore */ }
                throw new Error(errorDetails);
            }
            const data = await response.json();
            console.log('Raw Base Project/Phases response:', data);
            return data && data.rows ? data.rows : [];
        } catch (error) {
            console.error('Failed to fetch base project/phases:', error);
            throw error;
        }
    }

    async fetchActualCosts(projectCode = null) {
        let endpoint = '/connectors/Cursor_Voortgang_Nacalculatie_Kostensoorten';
        if (projectCode) {
            endpoint += `?filterfieldids=Projectnummer&filtervalues=${encodeURIComponent(projectCode)}&operatortypes=1`;
        }
        const url = `${this.proxyUrl}${this.config.baseUrl.replace(/\/connectors\/?$/, '')}${endpoint}`;
        console.log('Fetching actual costs from URL:', url);
        try {
            const response = await fetch(url, {
                headers: this.getHeaders(),
                mode: 'cors'
            });
            if (!response.ok) throw new Error('Failed to fetch actual costs');
            return await response.json();
        } catch (error) {
            console.error('Error fetching actual costs:', error);
            throw error;
        }
    }

    async fetchActualWorkTypes(projectCode = null) {
        let endpoint = '/connectors/Cursor_Voortgang_Nacalculatie_Werksoorten';
        if (projectCode) {
            endpoint += `?filterfieldids=Projectnummer&filtervalues=${encodeURIComponent(projectCode)}&operatortypes=1`;
        }
        const url = `${this.proxyUrl}${this.config.baseUrl.replace(/\/connectors\/?$/, '')}${endpoint}`;
        console.log('Fetching actual work types from URL:', url);
        try {
            const response = await fetch(url, {
                headers: this.getHeaders(),
                mode: 'cors'
            });
            if (!response.ok) throw new Error('Failed to fetch actual work types');
            return await response.json();
        } catch (error) {
            console.error('Error fetching actual work types:', error);
            throw error;
        }
    }

    async fetchInvoicedAmounts(projectCode = null) {
        let endpoint = '/connectors/Cursor_Voortgang_Gefactureerd';
        if (projectCode) {
            endpoint += `?filterfieldids=Projectnummer&filtervalues=${encodeURIComponent(projectCode)}&operatortypes=1`;
        }
        const url = `${this.proxyUrl}${this.config.baseUrl.replace(/\/connectors\/?$/, '')}${endpoint}`;
        console.log('Fetching invoiced amounts from URL:', url);
        try {
            const response = await fetch(url, {
                headers: this.getHeaders(),
                mode: 'cors'
            });
            if (!response.ok) throw new Error('Failed to fetch invoiced amounts');
            return await response.json();
        } catch (error) {
            console.error('Error fetching invoiced amounts:', error);
            throw error;
        }
    }

    async fetchProjectsForSidebar() {
        const connector = 'Cursor_Voortgang_Projecten_per_Projectleider';
        console.log(`Fetching sidebar projects using connector: ${connector}`);
        return this._fetchData(connector);
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