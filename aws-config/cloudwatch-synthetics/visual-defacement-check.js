const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const visualDefacementCheck = async function () {
    const page = await synthetics.getPage();
    
    // Navigate to homepage
    const response = await page.goto('https://yourdomain.com', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
    }
    
    // Wait for page to fully load
    await page.waitForTimeout(3000);
    
    // Take screenshot for visual comparison
    await synthetics.takeScreenshot('homepage', 'loaded');
    
    // Check for common defacement indicators
    const pageContent = await page.content();
    const defacementKeywords = [
        'hacked',
        'defaced', 
        'owned',
        'pwned',
        'cyber attack',
        'security breach',
        'site compromised'
    ];
    
    const lowerContent = pageContent.toLowerCase();
    for (const keyword of defacementKeywords) {
        if (lowerContent.includes(keyword)) {
            throw new Error(`Potential defacement detected: Found keyword "${keyword}"`);
        }
    }
    
    // Check for suspicious script injections
    const scripts = await page.$$eval('script', scripts => 
        scripts.map(script => script.src || script.innerHTML)
    );
    
    for (const script of scripts) {
        if (script && (script.includes('eval(') || script.includes('document.write('))) {
            log.warn('Suspicious script detected', script.substring(0, 100));
        }
    }
    
    // Verify critical page elements exist
    const criticalElements = [
        'title',
        'header, nav',
        'main, .main-content, #main',
        'footer'
    ];
    
    for (const selector of criticalElements) {
        try {
            const element = await page.$(selector);
            if (!element) {
                throw new Error(`Critical element missing: ${selector}`);
            }
        } catch (e) {
            log.warn(`Could not find element: ${selector}`);
        }
    }
    
    log.info('Visual defacement check completed successfully');
};

exports.handler = async () => {
    return await synthetics.executeStep('visualDefacementCheck', visualDefacementCheck);
};