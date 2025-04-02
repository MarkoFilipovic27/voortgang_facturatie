const fetch = require('node-fetch'); // Use node-fetch for Node.js environments

exports.handler = async function(event, context) {
    try {
        // Extract connector and other parameters from query string
        const { connector, ...params } = event.queryStringParameters || {};
        
        if (!connector) {
            throw new Error('Connector parameter is required');
        }

        // Get token from environment variable
        const token = process.env.AFAS_TOKEN;
        if (!token) {
            throw new Error('AFAS_TOKEN environment variable is not set');
        }

        console.log('Token format verification:', {
            length: token.length,
            startsWithBasic: token.startsWith('Basic '),
            isBase64: /^[A-Za-z0-9+/=]+$/.test(token.replace('Basic ', ''))
        });

        // Construct the URL with proper path components
        const baseUrl = 'https://62894.restaccept.afas.online/ProfitRestServices';
        const connectorPath = 'connectors';
        const url = `${baseUrl}/${connectorPath}/${encodeURIComponent(connector)}`;

        // Add default parameters if not provided
        const queryParams = {
            skip: 0,
            take: 1000,
            orderbyfieldids: '',
            ...params
        };

        // Build query string
        const queryString = Object.entries(queryParams)
            .filter(([_, value]) => value !== undefined)
            .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
            .join('&');

        const finalUrl = `${url}${queryString ? '?' + queryString : ''}`;
        console.log('AFAS API Request:', {
            url: finalUrl,
            connector,
            params: queryParams
        });

        const response = await fetch(finalUrl, {
            method: 'GET',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json'
            }
        });

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

        const data = await response.json();
        console.log('AFAS API Success:', {
            connector,
            dataType: typeof data,
            isArray: Array.isArray(data),
            hasRows: data && typeof data === 'object' && 'rows' in data,
            rowCount: data?.rows?.length || (Array.isArray(data) ? data.length : 0)
        });

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