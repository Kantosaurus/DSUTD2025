const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const apiHealthCheck = async function () {
    const page = await synthetics.getPage();
    
    // API endpoints to check (update with your actual endpoints)
    const apiEndpoints = [
        {
            url: 'https://your-backend-app.region.awsapprunner.com/health',
            method: 'GET',
            expectedStatus: 200,
            name: 'Health Check'
        },
        {
            url: 'https://your-backend-app.region.awsapprunner.com/api/status',
            method: 'GET',
            expectedStatus: 200,
            name: 'API Status'
        }
    ];
    
    for (const endpoint of apiEndpoints) {
        log.info(`Checking ${endpoint.name}: ${endpoint.url}`);
        
        const response = await page.goto(endpoint.url, {
            waitUntil: 'networkidle0',
            timeout: 15000
        });
        
        if (!response) {
            throw new Error(`No response from ${endpoint.name}`);
        }
        
        const status = response.status();
        if (status !== endpoint.expectedStatus) {
            throw new Error(`${endpoint.name} returned status ${status}, expected ${endpoint.expectedStatus}`);
        }
        
        // Check response time
        const timing = await page.evaluate(() => {
            const perfEntries = performance.getEntriesByType('navigation');
            return perfEntries[0] ? perfEntries[0].responseEnd - perfEntries[0].requestStart : null;
        });
        
        if (timing > 5000) { // 5 seconds threshold
            log.warn(`${endpoint.name} response time is high: ${timing}ms`);
        }
        
        log.info(`${endpoint.name} check passed - Status: ${status}, Response time: ${timing}ms`);
    }
    
    // Check database connectivity through API
    try {
        const dbCheckResponse = await page.goto('https://your-backend-app.region.awsapprunner.com/api/db-health', {
            waitUntil: 'networkidle0',
            timeout: 10000
        });
        
        if (dbCheckResponse && dbCheckResponse.ok()) {
            log.info('Database connectivity check passed');
        } else {
            log.warn('Database connectivity check failed or endpoint not available');
        }
    } catch (error) {
        log.warn('Database health check endpoint not accessible:', error.message);
    }
    
    log.info('API health check completed successfully');
};

exports.handler = async () => {
    return await synthetics.executeStep('apiHealthCheck', apiHealthCheck);
};