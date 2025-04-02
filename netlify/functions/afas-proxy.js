const fetch = require('node-fetch'); // Use node-fetch for Node.js environments

exports.handler = async (event, context) => {
    // 1. Get parameters from the query string
    const { connector, filterfieldids, filtervalues, operatortypes, skip, take } = event.queryStringParameters;
    const afasToken = process.env.AFAS_TOKEN;
    const baseUri = process.env.AFAS_BASE_URL;

    // Basic validation
    if (!afasToken || !baseUri) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Missing AFAS Token or Base URL.' }),
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        };
    }
    if (!connector) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required parameter: connector' }),
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        };
    }

    try {
        // 2. Construct the AFAS API URL
        const params = new URLSearchParams();
        
        // Add parameters only if they are provided and not empty
        if (skip) params.append('skip', skip);
        if (take) params.append('take', take);
        if (filterfieldids && filtervalues) {
            params.append('filterfieldids', filterfieldids);
            params.append('filtervalues', filtervalues);
            // Only add operatortypes if we have filter fields
            if (operatortypes) {
                params.append('operatortypes', operatortypes);
            }
        }

        // Ensure baseUri doesn't end with a slash and connector doesn't start with one
        const cleanBaseUri = baseUri.replace(/\/$/, '');
        const cleanConnector = connector.replace(/^\//, '');
        const targetUrl = `${cleanBaseUri}/${cleanConnector}${params.toString() ? '?' + params.toString() : ''}`;

        console.log('AFAS API Request:', {
            url: targetUrl,
            method: 'GET',
            headers: {
                'Authorization': 'AfasToken [hidden]',
                'Accept': 'application/json'
            }
        });

        // 3. Make the actual call to AFAS API
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `AfasToken ${afasToken}`,
                'Accept': 'application/json',
            },
        });

        // Log response details
        console.log('AFAS API Response:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
        });

        // Get the raw text first
        const text = await response.text();
        console.log('Raw response text:', text);

        // If response is not ok, return detailed error
        if (!response.ok) {
            return {
                statusCode: response.status,
                body: JSON.stringify({
                    error: 'Error from AFAS API',
                    details: text,
                    status: response.status,
                    statusText: response.statusText,
                    url: targetUrl.replace(afasToken, '[hidden]') // Log URL but hide token
                }),
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            };
        }

        // Try to parse the response as JSON
        let data;
        try {
            data = text ? JSON.parse(text) : null;
            
            if (!data) {
                throw new Error('Empty response from AFAS API');
            }
        } catch (parseError) {
            console.error('JSON Parse Error:', {
                error: parseError.message,
                rawResponse: text
            });
            
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Invalid JSON response from AFAS API', 
                    details: parseError.message,
                    rawResponse: text,
                    url: targetUrl.replace(afasToken, '[hidden]') // Log URL but hide token
                }),
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            };
        }

        // 5. Return successful data to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data),
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        };

    } catch (error) {
        console.error('Error in proxy function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: 'Internal Server Error in proxy function.',
                details: error.message,
                stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
            }),
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        };
    }
}; 