const AFAS_CONFIG = {
    environmentKey: process.env.AFAS_ENVIRONMENT_KEY,
    apiKey: process.env.AFAS_API_KEY,
    token: process.env.AFAS_TOKEN,
    baseUrl: process.env.AFAS_BASE_URL || 'https://31219.restaccept.afas.online/ProfitRestServices/connectors',
    environment: process.env.AFAS_ENVIRONMENT || 'Accept'
}; 

module.exports = AFAS_CONFIG; 