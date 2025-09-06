const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const performanceBaseline = async function () {
    const page = await synthetics.getPage();
    
    // Enable performance tracking
    await page.setCacheEnabled(false);
    
    const startTime = Date.now();
    
    // Navigate to homepage
    const response = await page.goto('https://yourdomain.com', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
    }
    
    const loadTime = Date.now() - startTime;
    
    // Get detailed performance metrics
    const metrics = await page.evaluate(() => {
        const perfEntries = performance.getEntriesByType('navigation')[0];
        if (!perfEntries) return null;
        
        return {
            dns: perfEntries.domainLookupEnd - perfEntries.domainLookupStart,
            connection: perfEntries.connectEnd - perfEntries.connectStart,
            ssl: perfEntries.secureConnectionStart > 0 ? perfEntries.connectEnd - perfEntries.secureConnectionStart : 0,
            ttfb: perfEntries.responseStart - perfEntries.requestStart, // Time to First Byte
            download: perfEntries.responseEnd - perfEntries.responseStart,
            domReady: perfEntries.domContentLoadedEventEnd - perfEntries.navigationStart,
            windowLoad: perfEntries.loadEventEnd - perfEntries.navigationStart,
            totalTime: perfEntries.loadEventEnd - perfEntries.navigationStart
        };
    });
    
    if (metrics) {
        // Log all metrics for CloudWatch
        log.info('Performance Metrics:', {
            loadTime: loadTime,
            dnsTime: metrics.dns,
            connectionTime: metrics.connection,
            sslTime: metrics.ssl,
            timeToFirstByte: metrics.ttfb,
            downloadTime: metrics.download,
            domReadyTime: metrics.domReady,
            windowLoadTime: metrics.windowLoad,
            totalTime: metrics.totalTime
        });
        
        // Set performance thresholds and alerts
        if (metrics.totalTime > 5000) {
            throw new Error(`Page load time too high: ${metrics.totalTime}ms (threshold: 5000ms)`);
        }
        
        if (metrics.ttfb > 2000) {
            throw new Error(`Time to First Byte too high: ${metrics.ttfb}ms (threshold: 2000ms)`);
        }
        
        if (metrics.domReady > 3000) {
            throw new Error(`DOM ready time too high: ${metrics.domReady}ms (threshold: 3000ms)`);
        }
    }
    
    // Check resource loading
    const resourceMetrics = await page.evaluate(() => {
        const resources = performance.getEntriesByType('resource');
        const resourceStats = {
            total: resources.length,
            css: 0,
            js: 0,
            images: 0,
            fonts: 0,
            other: 0,
            failed: 0
        };
        
        resources.forEach(resource => {
            if (resource.name.includes('.css')) resourceStats.css++;
            else if (resource.name.includes('.js')) resourceStats.js++;
            else if (resource.name.match(/\.(jpg|jpeg|png|gif|svg|webp)$/)) resourceStats.images++;
            else if (resource.name.match(/\.(woff|woff2|ttf|eot)$/)) resourceStats.fonts++;
            else resourceStats.other++;
            
            if (resource.transferSize === 0 && resource.decodedBodySize === 0) {
                resourceStats.failed++;
            }
        });
        
        return resourceStats;
    });
    
    log.info('Resource Loading Stats:', resourceMetrics);
    
    if (resourceMetrics.failed > 0) {
        log.warn(`${resourceMetrics.failed} resources failed to load`);
    }
    
    // Check for JavaScript errors
    const jsErrors = await page.evaluate(() => {
        return window.jsErrors || [];
    });
    
    if (jsErrors.length > 0) {
        log.warn('JavaScript errors detected:', jsErrors);
    }
    
    // Take screenshot for visual record
    await synthetics.takeScreenshot('performance-baseline', 'completed');
    
    log.info(`Performance baseline check completed - Total load time: ${loadTime}ms`);
};

exports.handler = async () => {
    return await synthetics.executeStep('performanceBaseline', performanceBaseline);
};