const fetch = require('node-fetch'); // Use node-fetch for Node.js environments

exports.handler = async function(event, context) {
    try {
        // Check if this is a GET or POST request
        const isUpdateConnector = event.httpMethod === 'POST';
        
        // For GET requests (GetConnector), extract params from query string
        // For POST requests (UpdateConnector), get the connector name from a custom header
        let connector, params;
        
        if (isUpdateConnector) {
            connector = event.headers['x-afas-update-connector'];
            // Voor UpdateConnector hebben we geen query params nodig
            params = {};
            
            if (!connector) {
                throw new Error('X-AFAS-Update-Connector header is required for POST requests');
            }
            
            console.log('Processing UpdateConnector request for:', connector);
        } else {
            // Extract connector and other parameters from query string for GetConnector
            const queryParams = event.queryStringParameters || {};
            connector = queryParams.connector;
            
            // Destructure to remove connector from params
            const { connector: _, ...restParams } = queryParams;
            params = restParams;
            
            if (!connector) {
                throw new Error('Connector parameter is required for GET requests');
            }
            
            console.log('Processing GetConnector request for:', connector);
        }

        // Get token from environment variable
        const token = process.env.AFAS_TOKEN;
        if (!token) {
            throw new Error('AFAS_TOKEN environment variable is not set');
        }

        // Get base URL from environment variable
        const baseUrl = process.env.AFAS_BASE_URL;
        if (!baseUrl) {
            throw new Error('AFAS_BASE_URL environment variable is not set');
        }

        console.log('Token format verification:', {
            length: token.length,
            startsWithBasic: token.startsWith('Basic '),
            isBase64: /^[A-Za-z0-9+/=]+$/.test(token.replace('Basic ', ''))
        });

        // Construct the URL with proper path components
        const servicePath = 'ProfitRestServices';
        const fullBaseUrl = `${baseUrl.replace(/\/$/, '')}/${servicePath}`;
        const connectorPath = 'connectors';
        const url = `${fullBaseUrl}/${connectorPath}/${encodeURIComponent(connector)}`;

        let finalUrl = url;
        let requestBody = null;
        let requestMethod = 'GET';
        
        if (isUpdateConnector) {
            // Voor UpdateConnector gebruiken we geen query params, maar sturen we een body
            finalUrl = url;
            requestMethod = 'POST';
            requestBody = event.body;
            console.log('AFAS UpdateConnector Request:', {
                url: finalUrl,
                connector,
                bodyLength: requestBody ? requestBody.length : 0
            });
        } else {
            // Add default parameters if not provided for GetConnector
            const queryParams = {
                skip: 0,
                take: 1000,
                orderbyfieldids: 'Projectnummer',
                ...params
            };

            // Build query string
            const queryString = Object.entries(queryParams)
                .filter(([_, value]) => value !== undefined)
                .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                .join('&');

            finalUrl = `${url}${queryString ? '?' + queryString : ''}`;
            console.log('AFAS GetConnector Request:', {
                url: finalUrl,
                connector,
                params: queryParams
            });
        }

        // Maak het request met de juiste methode en headers
        const headers = {
            'Authorization': `AfasToken ${token}`,
            'Content-Type': 'application/json'
        };
        
        const fetchOptions = {
            method: requestMethod,
            headers: headers
        };
        
        if (requestBody) {
            fetchOptions.body = requestBody;
        }
        
        const response = await fetch(finalUrl, fetchOptions);

        console.log('AFAS API Response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('AFAS API Error Response:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`AFAS API request failed: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const responseText = await response.text();
        let data;
        
        try {
            data = JSON.parse(responseText);
            console.log('AFAS API Success:', {
                connector,
                dataType: typeof data,
                isArray: Array.isArray(data),
                hasRows: data && typeof data === 'object' && 'rows' in data,
                rowCount: data?.rows?.length || (Array.isArray(data) ? data.length : 0)
            });
        } catch (e) {
            console.log('Response is not JSON, returning as text');
            return {
                statusCode: 200,
                body: responseText
            };
        }

        return {
            statusCode: 200,
            body: JSON.stringify(data)
        };
    } catch (error) {
        console.error('AFAS Proxy Error:', {
            message: error.message,
            stack: error.stack
        });
        
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal Server Error',
                message: error.message,
                details: error.stack
            })
        };
    }
}; 