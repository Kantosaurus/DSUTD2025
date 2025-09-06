const synthetics = require('Synthetics');
const log = require('SyntheticsLogger');

const contentIntegrityCheck = async function () {
    const page = await synthetics.getPage();
    
    // Navigate to homepage
    const response = await page.goto('https://yourdomain.com', {
        waitUntil: 'networkidle0',
        timeout: 30000
    });
    
    if (!response || !response.ok()) {
        throw new Error(`Failed to load page: ${response ? response.status() : 'No response'}`);
    }
    
    // Wait for dynamic content to load
    await page.waitForTimeout(2000);
    
    // Check page title hasn't been changed
    const title = await page.title();
    if (!title || title.length < 3) {
        throw new Error('Page title is missing or too short');
    }
    
    // Verify expected content sections exist
    const expectedSections = [
        { selector: 'nav', name: 'Navigation' },
        { selector: 'main, .main-content, #main-content', name: 'Main content' },
        { selector: 'footer', name: 'Footer' }
    ];
    
    for (const section of expectedSections) {
        const element = await page.$(section.selector);
        if (!element) {
            throw new Error(`${section.name} section is missing`);
        }
        
        // Check if section has content
        const textContent = await element.evaluate(el => el.textContent?.trim());
        if (!textContent || textContent.length < 10) {
            throw new Error(`${section.name} section appears to be empty`);
        }
    }
    
    // Check for unauthorized external links
    const externalLinks = await page.$$eval('a[href^="http"]', links => 
        links.map(link => link.href).filter(href => 
            !href.includes('yourdomain.com') && 
            !href.includes('localhost')
        )
    );
    
    // Log but don't fail for external links (might be legitimate)
    if (externalLinks.length > 0) {
        log.info(`Found ${externalLinks.length} external links:`, externalLinks.slice(0, 5));
    }
    
    // Check for iframe injections
    const iframes = await page.$$eval('iframe', frames => 
        frames.map(frame => frame.src)
    );
    
    const suspiciousIframes = iframes.filter(src => 
        src && !src.includes('yourdomain.com') && !src.includes('youtube.com') && !src.includes('vimeo.com')
    );
    
    if (suspiciousIframes.length > 0) {
        throw new Error(`Suspicious iframes detected: ${suspiciousIframes.join(', ')}`);
    }
    
    // Check for unexpected redirects in meta tags
    const metaRefresh = await page.$eval('meta[http-equiv="refresh"]', 
        meta => meta ? meta.getAttribute('content') : null
    ).catch(() => null);
    
    if (metaRefresh) {
        log.warn(`Meta refresh detected: ${metaRefresh}`);
    }
    
    // Take screenshot for visual record
    await synthetics.takeScreenshot('content-integrity', 'verified');
    
    log.info('Content integrity check completed successfully');
};

exports.handler = async () => {
    return await synthetics.executeStep('contentIntegrityCheck', contentIntegrityCheck);
};