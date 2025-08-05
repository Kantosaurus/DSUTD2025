#!/usr/bin/env node

/**
 * DSUTD 2025 - Security Audit Script
 * 
 * This script performs a comprehensive security audit of the application:
 * - Environment variable validation
 * - Dependency vulnerability scanning
 * - Configuration security checks
 * - Database security validation
 * - API endpoint security analysis
 * - Frontend security checks
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ANSI color codes for output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

// Audit results
const auditResults = {
  critical: [],
  high: [],
  medium: [],
  low: [],
  info: [],
  passed: []
};

/**
 * Print colored output
 */
const print = (color, message) => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

/**
 * Add audit finding
 */
const addFinding = (severity, message, recommendation = '') => {
  auditResults[severity].push({ message, recommendation });
};

/**
 * Check environment variables
 */
const checkEnvironmentVariables = () => {
  print('cyan', '\n🔍 Checking Environment Variables...');
  
  const requiredVars = [
    'JWT_SECRET',
    'DATABASE_URL',
    'EMAIL_USER',
    'EMAIL_PASSWORD',
    'EMAIL_FROM'
  ];
  
  const optionalVars = [
    'NODE_ENV',
    'PORT',
    'FRONTEND_URL',
    'FINGERPRINT_SALT',
    'SESSION_SECRET'
  ];
  
  // Check required variables
  requiredVars.forEach(varName => {
    if (!process.env[varName]) {
      addFinding('critical', `Missing required environment variable: ${varName}`, 
        'Set this variable in your .env file');
    } else if (varName === 'JWT_SECRET' && process.env[varName].length < 32) {
      addFinding('critical', `JWT_SECRET is too short (${process.env[varName].length} chars)`, 
        'JWT_SECRET should be at least 32 characters long');
    } else if (varName === 'JWT_SECRET' && process.env[varName] === 'your-secret-key-change-in-production') {
      addFinding('critical', 'JWT_SECRET is using default value', 
        'Change JWT_SECRET to a strong, unique value');
    } else {
      addFinding('passed', `✓ ${varName} is properly configured`);
    }
  });
  
  // Check optional variables
  optionalVars.forEach(varName => {
    if (!process.env[varName]) {
      addFinding('info', `Optional environment variable not set: ${varName}`);
    } else {
      addFinding('passed', `✓ ${varName} is configured`);
    }
  });
  
  // Check for weak passwords in environment
  const envContent = fs.readFileSync('.env', 'utf8');
  const weakPatterns = [
    /password\s*=\s*['"]?password['"]?/i,
    /secret\s*=\s*['"]?secret['"]?/i,
    /key\s*=\s*['"]?key['"]?/i,
    /admin\s*=\s*['"]?admin['"]?/i
  ];
  
  weakPatterns.forEach(pattern => {
    if (pattern.test(envContent)) {
      addFinding('high', 'Weak default values found in environment file', 
        'Replace default values with strong, unique credentials');
    }
  });
};

/**
 * Check dependencies for vulnerabilities
 */
const checkDependencies = () => {
  print('cyan', '\n🔍 Checking Dependencies...');
  
  const packageFiles = [
    'package.json',
    'backend/package.json',
    'frontend/package.json'
  ];
  
  packageFiles.forEach(file => {
    if (fs.existsSync(file)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
        addFinding('info', `✓ ${file} found and valid JSON`);
        
        // Check for known vulnerable packages
        const vulnerablePackages = [
          'express-session@1.17.0',
          'lodash@4.17.0',
          'moment@2.29.0'
        ];
        
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
        Object.keys(allDeps).forEach(dep => {
          const version = allDeps[dep];
          vulnerablePackages.forEach(vuln => {
            const [vulnName, vulnVersion] = vuln.split('@');
            if (dep === vulnName && version === vulnVersion) {
              addFinding('high', `Vulnerable package detected: ${dep}@${version}`, 
                'Update to latest version');
            }
          });
        });
      } catch (error) {
        addFinding('critical', `Invalid JSON in ${file}: ${error.message}`);
      }
    } else {
      addFinding('info', `${file} not found`);
    }
  });
};

/**
 * Check database security
 */
const checkDatabaseSecurity = () => {
  print('cyan', '\n🔍 Checking Database Security...');
  
  // Check database initialization script
  const initFile = 'backend/init.sql';
  if (fs.existsSync(initFile)) {
    const content = fs.readFileSync(initFile, 'utf8');
    
    // Check for hardcoded passwords
    if (content.includes('DSUTDadmin')) {
      addFinding('critical', 'Hardcoded admin passwords found in database script', 
        'Remove hardcoded passwords and use environment variables');
    }
    
    // Check for proper constraints
    if (!content.includes('CHECK (role IN')) {
      addFinding('medium', 'Missing role constraint in users table', 
        'Add CHECK constraint for role field');
    }
    
    // Check for proper indexes
    if (!content.includes('CREATE INDEX')) {
      addFinding('medium', 'No database indexes found', 
        'Add indexes for frequently queried columns');
    }
    
    addFinding('passed', '✓ Database schema file found');
  } else {
    addFinding('critical', 'Database initialization file not found');
  }
  
  // Check for SQL injection vulnerabilities in server code
  const serverFile = 'backend/server.js';
  if (fs.existsSync(serverFile)) {
    const content = fs.readFileSync(serverFile, 'utf8');
    
    // Check for parameterized queries
    if (content.includes('$1') && content.includes('$2')) {
      addFinding('passed', '✓ Parameterized queries are being used');
    } else {
      addFinding('high', 'Potential SQL injection vulnerability', 
        'Use parameterized queries for all database operations');
    }
    
    // Check for proper error handling
    if (content.includes('catch (err)')) {
      addFinding('passed', '✓ Error handling is implemented');
    } else {
      addFinding('medium', 'Missing error handling', 
        'Add try-catch blocks around database operations');
    }
  }
};

/**
 * Check API security
 */
const checkAPISecurity = () => {
  print('cyan', '\n🔍 Checking API Security...');
  
  const serverFile = 'backend/server.js';
  if (fs.existsSync(serverFile)) {
    const content = fs.readFileSync(serverFile, 'utf8');
    
    // Check for authentication middleware
    if (content.includes('authenticateToken')) {
      addFinding('passed', '✓ Authentication middleware is implemented');
    } else {
      addFinding('critical', 'No authentication middleware found');
    }
    
    // Check for rate limiting
    if (content.includes('rateLimit') || content.includes('express-rate-limit')) {
      addFinding('passed', '✓ Rate limiting is implemented');
    } else {
      addFinding('high', 'No rate limiting found', 
        'Implement rate limiting to prevent abuse');
    }
    
    // Check for input validation
    if (content.includes('express-validator') || content.includes('body(')) {
      addFinding('passed', '✓ Input validation is implemented');
    } else {
      addFinding('high', 'No input validation found', 
        'Implement input validation for all endpoints');
    }
    
    // Check for CORS configuration
    if (content.includes('cors(')) {
      addFinding('passed', '✓ CORS is configured');
    } else {
      addFinding('medium', 'No CORS configuration found', 
        'Configure CORS to restrict cross-origin requests');
    }
    
    // Check for security headers
    if (content.includes('helmet(')) {
      addFinding('passed', '✓ Security headers are configured');
    } else {
      addFinding('medium', 'No security headers found', 
        'Use Helmet.js to set security headers');
    }
    
    // Check for password hashing
    if (content.includes('bcrypt') || content.includes('bcryptjs')) {
      addFinding('passed', '✓ Password hashing is implemented');
    } else {
      addFinding('critical', 'No password hashing found', 
        'Use bcrypt or similar for password hashing');
    }
    
    // Check for JWT usage
    if (content.includes('jsonwebtoken') || content.includes('jwt.sign')) {
      addFinding('passed', '✓ JWT authentication is implemented');
    } else {
      addFinding('high', 'No JWT implementation found', 
        'Implement JWT for secure authentication');
    }
  }
};

/**
 * Check frontend security
 */
const checkFrontendSecurity = () => {
  print('cyan', '\n🔍 Checking Frontend Security...');
  
  // Check for environment variable exposure
  const nextConfig = 'frontend/next.config.js';
  if (fs.existsSync(nextConfig)) {
    const content = fs.readFileSync(nextConfig, 'utf8');
    if (content.includes('NEXT_PUBLIC_')) {
      addFinding('info', 'Public environment variables found (this is expected for frontend)');
    }
  }
  
  // Check for client-side security
  const mainPage = 'frontend/app/page.tsx';
  if (fs.existsSync(mainPage)) {
    const content = fs.readFileSync(mainPage, 'utf8');
    
    // Check for token storage
    if (content.includes('localStorage.setItem')) {
      addFinding('info', 'Tokens stored in localStorage (consider httpOnly cookies for better security)');
    }
    
    // Check for proper error handling
    if (content.includes('catch (error)')) {
      addFinding('passed', '✓ Frontend error handling is implemented');
    } else {
      addFinding('medium', 'Missing frontend error handling', 
        'Add try-catch blocks for API calls');
    }
  }
  
  // Check for HTTPS enforcement
  const packageJson = 'frontend/package.json';
  if (fs.existsSync(packageJson)) {
    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
    if (pkg.dependencies && pkg.dependencies.next) {
      addFinding('passed', '✓ Next.js is being used (includes security features)');
    }
  }
};

/**
 * Check file permissions and sensitive files
 */
const checkFileSecurity = () => {
  print('cyan', '\n🔍 Checking File Security...');
  
  const sensitiveFiles = [
    '.env',
    '.env.local',
    '.env.production',
    'backend/.env',
    'frontend/.env.local'
  ];
  
  const gitignore = '.gitignore';
  if (fs.existsSync(gitignore)) {
    const content = fs.readFileSync(gitignore, 'utf8');
    sensitiveFiles.forEach(file => {
      if (content.includes(file.replace('./', ''))) {
        addFinding('passed', `✓ ${file} is properly ignored by git`);
      } else {
        addFinding('critical', `${file} is not in .gitignore`, 
          'Add sensitive files to .gitignore');
      }
    });
  }
  
  // Check for exposed secrets
  const filesToCheck = [
    'backend/server.js',
    'frontend/app/page.tsx',
    'docker-compose.yml'
  ];
  
  filesToCheck.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Check for hardcoded secrets
      const secretPatterns = [
        /password\s*[:=]\s*['"][^'"]*['"]/gi,
        /secret\s*[:=]\s*['"][^'"]*['"]/gi,
        /key\s*[:=]\s*['"][^'"]*['"]/gi,
        /token\s*[:=]\s*['"][^'"]*['"]/gi
      ];
      
      secretPatterns.forEach(pattern => {
        const matches = content.match(pattern);
        if (matches) {
          addFinding('critical', `Hardcoded secrets found in ${file}`, 
            'Move secrets to environment variables');
        }
      });
    }
  });
};

/**
 * Check Docker security
 */
const checkDockerSecurity = () => {
  print('cyan', '\n🔍 Checking Docker Security...');
  
  const dockerCompose = 'docker-compose.yml';
  if (fs.existsSync(dockerCompose)) {
    const content = fs.readFileSync(dockerCompose, 'utf8');
    
    // Check for exposed ports
    if (content.includes('ports:')) {
      addFinding('info', 'Ports are exposed (consider using internal networks only)');
    }
    
    // Check for volume mounts
    if (content.includes('volumes:')) {
      addFinding('passed', '✓ Volume mounts are configured');
    }
    
    // Check for health checks
    if (content.includes('healthcheck:')) {
      addFinding('passed', '✓ Health checks are configured');
    } else {
      addFinding('medium', 'No health checks found', 
        'Add health checks for better monitoring');
    }
    
    // Check for non-root user
    if (content.includes('user:') || content.includes('USER')) {
      addFinding('passed', '✓ Non-root user is configured');
    } else {
      addFinding('medium', 'No non-root user specified', 
        'Run containers as non-root user');
    }
  }
};

/**
 * Generate security report
 */
const generateReport = () => {
  print('bold', '\n' + '='.repeat(60));
  print('bold', '🔒 DSUTD 2025 SECURITY AUDIT REPORT');
  print('bold', '='.repeat(60));
  
  const totalFindings = Object.values(auditResults).reduce((sum, arr) => sum + arr.length, 0);
  const criticalCount = auditResults.critical.length;
  const highCount = auditResults.high.length;
  const mediumCount = auditResults.medium.length;
  const lowCount = auditResults.low.length;
  const infoCount = auditResults.info.length;
  const passedCount = auditResults.passed.length;
  
  print('bold', `\n📊 SUMMARY:`);
  print('info', `Total Findings: ${totalFindings}`);
  print('red', `Critical: ${criticalCount}`);
  print('yellow', `High: ${highCount}`);
  print('blue', `Medium: ${mediumCount}`);
  print('cyan', `Low: ${lowCount}`);
  print('magenta', `Info: ${infoCount}`);
  print('green', `Passed: ${passedCount}`);
  
  // Print findings by severity
  if (auditResults.critical.length > 0) {
    print('red', '\n🚨 CRITICAL ISSUES:');
    auditResults.critical.forEach(finding => {
      print('red', `  • ${finding.message}`);
      if (finding.recommendation) {
        print('yellow', `    Recommendation: ${finding.recommendation}`);
      }
    });
  }
  
  if (auditResults.high.length > 0) {
    print('yellow', '\n⚠️  HIGH PRIORITY ISSUES:');
    auditResults.high.forEach(finding => {
      print('yellow', `  • ${finding.message}`);
      if (finding.recommendation) {
        print('blue', `    Recommendation: ${finding.recommendation}`);
      }
    });
  }
  
  if (auditResults.medium.length > 0) {
    print('blue', '\n🔵 MEDIUM PRIORITY ISSUES:');
    auditResults.medium.forEach(finding => {
      print('blue', `  • ${finding.message}`);
      if (finding.recommendation) {
        print('cyan', `    Recommendation: ${finding.recommendation}`);
      }
    });
  }
  
  if (auditResults.low.length > 0) {
    print('cyan', '\n💡 LOW PRIORITY ISSUES:');
    auditResults.low.forEach(finding => {
      print('cyan', `  • ${finding.message}`);
      if (finding.recommendation) {
        print('magenta', `    Recommendation: ${finding.recommendation}`);
      }
    });
  }
  
  if (auditResults.info.length > 0) {
    print('magenta', '\nℹ️  INFORMATION:');
    auditResults.info.forEach(finding => {
      print('magenta', `  • ${finding.message}`);
      if (finding.recommendation) {
        print('info', `    Note: ${finding.recommendation}`);
      }
    });
  }
  
  if (auditResults.passed.length > 0) {
    print('green', '\n✅ PASSED CHECKS:');
    auditResults.passed.forEach(finding => {
      print('green', `  • ${finding.message}`);
    });
  }
  
  // Overall security score
  const score = Math.max(0, 100 - (criticalCount * 20) - (highCount * 10) - (mediumCount * 5) - (lowCount * 2));
  
  print('bold', '\n🎯 OVERALL SECURITY SCORE:');
  if (score >= 90) {
    print('green', `  ${score}/100 - EXCELLENT`);
  } else if (score >= 80) {
    print('blue', `  ${score}/100 - GOOD`);
  } else if (score >= 70) {
    print('yellow', `  ${score}/100 - FAIR`);
  } else if (score >= 60) {
    print('magenta', `  ${score}/100 - POOR`);
  } else {
    print('red', `  ${score}/100 - CRITICAL`);
  }
  
  // Recommendations
  if (criticalCount > 0 || highCount > 0) {
    print('bold', '\n🚨 IMMEDIATE ACTION REQUIRED:');
    print('red', '  Fix all critical and high priority issues before deployment!');
  }
  
  if (mediumCount > 0) {
    print('bold', '\n📋 RECOMMENDED ACTIONS:');
    print('blue', '  Address medium priority issues for better security posture.');
  }
  
  print('bold', '\n' + '='.repeat(60));
  print('bold', 'Audit completed at: ' + new Date().toISOString());
  print('bold', '='.repeat(60));
};

/**
 * Main audit function
 */
const runSecurityAudit = () => {
  print('bold', '🔒 Starting DSUTD 2025 Security Audit...');
  
  checkEnvironmentVariables();
  checkDependencies();
  checkDatabaseSecurity();
  checkAPISecurity();
  checkFrontendSecurity();
  checkFileSecurity();
  checkDockerSecurity();
  
  generateReport();
};

// Run the audit
runSecurityAudit(); 