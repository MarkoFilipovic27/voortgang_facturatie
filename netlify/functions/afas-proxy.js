const fetch = require('node-fetch'); // Use node-fetch for Node.js environments

exports.handler = async (event, context) => {
    // 1. Get parameters from the query string
    const { connector, filterfieldids, filtervalues, skip, take } = event.queryStringParameters;
    const afasToken = process.env.AFAS_TOKEN; // Read token from Netlify environment variables
    const afasEnv = process.env.AFAS_ENVIRONMENT_NUMBER; // e.g., 31219

    // Basic validation
    if (!afasToken || !afasEnv) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Server configuration error: Missing AFAS Token or Environment Number.' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }
    if (!connector) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Missing required parameter: connector' }),
            headers: { 'Content-Type': 'application/json' },
        };
    }

    // 2. Construct the AFAS API URL
    const baseUri = `https://${afasEnv}.restaccept.afas.online/ProfitRestServices/connectors/`;
    let targetUrl = `${baseUri}${connector}`;

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

        // 4. Handle the response from AFAS
        const data = await response.json();

        if (!response.ok) {
            // Forward AFAS error status and message if possible
            console.error('AFAS API Error:', response.status, data);
            return {
                statusCode: response.status, // Forward the status code from AFAS
                body: JSON.stringify(data), // Forward the error body from AFAS
                 // Important: Allow requests from your frontend domain
                headers: { 
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*', // Or specify your frontend domain for better security
                    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
                 }, 
            };
        }

        // 5. Return successful data to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify(data),
             // Important: Allow requests from your frontend domain
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Or specify your frontend domain for better security
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
             },
        };

    } catch (error) {
        console.error('Error in Netlify function:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error in proxy function.', details: error.message }),
             // Important: Allow requests from your frontend domain
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*', // Or specify your frontend domain for better security
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
             },
        };
    }
}; 