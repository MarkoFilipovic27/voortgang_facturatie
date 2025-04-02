const fetch = require('node-fetch'); // Use node-fetch for Node.js environments

exports.handler = async (event, context) => {
    // 1. Get parameters from the query string
    const { connector, filterfieldids, filtervalues, skip, take } = event.queryStringParameters;
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

    // 2. Construct the AFAS API URL
    let targetUrl = `${baseUri}/${connector}`;

    const params = new URLSearchParams();
    if (skip) params.append('skip', skip);
    if (take) params.append('take', take);
    if (filterfieldids && filtervalues) {
        params.append('filterfieldids', filterfieldids);
        params.append('filtervalues', filtervalues);
    }

    const paramsString = params.toString();
    if (paramsString) {
        targetUrl += `?${paramsString}`;
    }

    console.log(`Proxying request to: ${targetUrl}`); // Log for debugging in Netlify

    try {
        // 3. Make the actual call to AFAS API
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: {
                'Authorization': `AfasToken ${afasToken}`,
                'Accept': 'application/json',
            },
        });

        // Log the response status and headers for debugging
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);

        // 4. Handle the response from AFAS
        const text = await response.text(); // First get the raw text
        console.log('Response body:', text); // Log the raw response

        let data;
        try {
            data = JSON.parse(text); // Then try to parse it
        } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            return {
                statusCode: 500,
                body: JSON.stringify({ 
                    error: 'Invalid JSON response from AFAS API', 
                    details: parseError.message,
                    responseText: text.substring(0, 1000) // Include first 1000 chars of response for debugging
                }),
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                },
            };
        }

        if (!response.ok) {
            // Forward AFAS error status and message if possible
            console.error('AFAS API Error:', response.status, data);
            return {
                statusCode: response.status,
                body: JSON.stringify(data),
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
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error in proxy function.', details: error.message }),
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
        };
    }
}; 