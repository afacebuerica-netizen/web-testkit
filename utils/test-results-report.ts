import { Page } from '@playwright/test';
import { SEOCheckResult } from './seo-checks';
import { LinkCheckResult } from './broken-links';
import * as fs from 'fs';
import * as path from 'path';

// Import getUrlSlug from JavaScript module
const { getUrlSlug } = require('./url-path');

/**
 * Interface for comprehensive test results
 */
export interface TestResultsReport {
  url: string;
  timestamp: string;
  testType: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: number;
  };
  seo?: {
    total: number;
    passed: number;
    failed: number;
    checks: SEOCheckResult[];
  };
  brokenLinks?: {
    total: number;
    broken: number;
    links: LinkCheckResult[];
  };
  accessibility?: {
    passed: boolean;
    violations: number;
    incomplete: number;
    totalViolations: number;
    totalIncomplete: number;
    // Detailed violation information
    violationDetails?: Array<{
      id: string;
      description: string;
      impact: string;
      helpUrl: string;
      affectedElements: Array<{
        selector: string;
        html: string;
        failureSummary: string;
        screenshot?: string; // Path to screenshot
      }>;
    }>;
    incompleteDetails?: Array<{
      id: string;
      description: string;
      helpUrl: string;
      affectedElements: Array<{
        selector: string;
        html: string;
      }>;
    }>;
  };
}

/**
 * Generate a comprehensive test results report
 */
export function generateTestResultsReport(
  url: string,
  testType: string,
  seoResults?: SEOCheckResult[],
  brokenLinks?: LinkCheckResult[],
  accessibilityResults?: {
    passed: boolean;
    violations: any[];
    incomplete: any[];
    totalViolations: number;
    totalIncomplete: number;
  }
): TestResultsReport {
  const timestamp = new Date().toISOString();
  
  // Calculate SEO summary
  let seoSummary;
  if (seoResults) {
    const passed = seoResults.filter(r => r.passed).length;
    const failed = seoResults.filter(r => !r.passed).length;
    seoSummary = {
      total: seoResults.length,
      passed,
      failed,
      checks: seoResults,
    };
  }

  // Calculate broken links summary
  let brokenLinksSummary;
  if (brokenLinks) {
    brokenLinksSummary = {
      total: brokenLinks.length,
      broken: brokenLinks.length,
      links: brokenLinks,
    };
  }

  // Calculate accessibility summary with detailed violation information
  let accessibilitySummary;
  if (accessibilityResults) {
    // Extract detailed violation information
    const violationDetails = accessibilityResults.violations.map((violation: any, vIndex: number) => ({
      id: violation.id,
      description: violation.description,
      impact: violation.impact,
      helpUrl: violation.helpUrl || '',
      affectedElements: (violation.nodes || []).map((node: any, nIndex: number) => {
        const selector = node.target && Array.isArray(node.target) 
          ? node.target[node.target.length - 1] 
          : (node.target || 'unknown');
        return {
          selector,
          html: node.html || '',
          failureSummary: node.failureSummary || '',
          screenshot: node.screenshot || undefined, // Screenshot path if available
        };
      }),
    }));

    const incompleteDetails = accessibilityResults.incomplete.map((incomplete: any) => ({
      id: incomplete.id,
      description: incomplete.description,
      helpUrl: incomplete.helpUrl || '',
      affectedElements: (incomplete.nodes || []).map((node: any) => {
        const selector = node.target && Array.isArray(node.target) 
          ? node.target[node.target.length - 1] 
          : (node.target || 'unknown');
        return {
          selector,
          html: node.html || '',
        };
      }),
    }));

    accessibilitySummary = {
      passed: accessibilityResults.passed,
      violations: accessibilityResults.violations.length,
      incomplete: accessibilityResults.incomplete.length,
      totalViolations: accessibilityResults.totalViolations,
      totalIncomplete: accessibilityResults.totalIncomplete,
      violationDetails,
      incompleteDetails,
    };
  }

  // Calculate overall summary
  let total = 0;
  let passed = 0;
  let failed = 0;

  if (seoSummary) {
    total += seoSummary.total;
    passed += seoSummary.passed;
    failed += seoSummary.failed;
  }

  if (brokenLinksSummary) {
    total += 1; // Count as one check
    if (brokenLinksSummary.broken === 0) {
      passed += 1;
    } else {
      failed += 1;
    }
  }

  if (accessibilitySummary) {
    total += 1; // Count as one check
    if (accessibilitySummary.passed) {
      passed += 1;
    } else {
      failed += 1;
    }
  }

  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return {
    url,
    timestamp,
    testType,
    summary: {
      total,
      passed,
      failed,
      passRate,
    },
    seo: seoSummary,
    brokenLinks: brokenLinksSummary,
    accessibility: accessibilitySummary,
  };
}

/**
 * Format test results as a readable markdown report
 */
export function formatTestResultsReport(report: TestResultsReport): string {
  let md = `# Test Results Report\n\n`;
  md += `**URL**: ${report.url}\n`;
  md += `**Test Type**: ${report.testType}\n`;
  md += `**Timestamp**: ${new Date(report.timestamp).toLocaleString()}\n\n`;
  
  md += `## Summary\n\n`;
  md += `| Metric | Count |\n`;
  md += `|--------|-------|\n`;
  md += `| **Total Checks** | ${report.summary.total} |\n`;
  md += `| **✅ Passed** | ${report.summary.passed} |\n`;
  md += `| **❌ Failed** | ${report.summary.failed} |\n`;
  md += `| **Pass Rate** | ${report.summary.passRate}% |\n\n`;

  // SEO Results
  if (report.seo) {
    md += `## SEO Checks\n\n`;
    md += `**Status**: ${report.seo.failed === 0 ? '✅ All Passed' : `❌ ${report.seo.failed} Failed`}\n\n`;
    
    md += `### Passed (${report.seo.passed})\n\n`;
    report.seo.checks
      .filter(check => check.passed)
      .forEach(check => {
        md += `- ✅ **${check.check}**: ${check.message}\n`;
        if (check.value) {
          md += `  - Value: ${check.value}\n`;
        }
      });
    
    if (report.seo.failed > 0) {
      md += `\n### Failed (${report.seo.failed})\n\n`;
      report.seo.checks
        .filter(check => !check.passed)
        .forEach(check => {
          md += `- ❌ **${check.check}**: ${check.message}\n`;
          if (check.value) {
            md += `  - Value: ${check.value}\n`;
          }
        });
    }
    md += `\n`;
  }

  // Broken Links Results
  if (report.brokenLinks) {
    md += `## Broken Links Check\n\n`;
    md += `**Status**: ${report.brokenLinks.broken === 0 ? '✅ No Broken Links' : `❌ ${report.brokenLinks.broken} Broken Link(s)`}\n\n`;
    
    if (report.brokenLinks.broken === 0) {
      md += `✅ All links are working correctly.\n\n`;
    } else {
      md += `### Broken Links (${report.brokenLinks.broken})\n\n`;
      report.brokenLinks.links.forEach((link, index) => {
        md += `${index + 1}. **${link.url}**\n`;
        md += `   - Status: ${link.status} ${link.statusText}\n`;
        if (link.error) {
          md += `   - Error: ${link.error}\n`;
        }
        
        // Show which elements link to this broken URL
        if (link.elements && link.elements.length > 0) {
          md += `   - Found on page (${link.elements.length} element(s)):\n`;
          link.elements.forEach((element, elemIndex) => {
            md += `     ${elemIndex + 1}. Selector: \`${element.selector}\`\n`;
            md += `        - Link Text: "${element.text || '(empty)'}"\n`;
            md += `        - HTML: \`${element.html.substring(0, 100)}${element.html.length > 100 ? '...' : ''}\`\n`;
          });
        }
        md += `\n`;
      });
    }
  }

  // Accessibility Results
  if (report.accessibility) {
    md += `## Accessibility Check\n\n`;
    md += `**Status**: ${report.accessibility.passed ? '✅ Passed' : `❌ Failed (${report.accessibility.violations} violation(s))`}\n\n`;
    
    if (report.accessibility.passed) {
      md += `✅ No accessibility violations found.\n\n`;
    } else {
      md += `### Summary\n\n`;
      md += `- **Total Violations**: ${report.accessibility.totalViolations}\n`;
      md += `- **Total Incomplete**: ${report.accessibility.totalIncomplete}\n\n`;

      // Detailed violations
      if (report.accessibility.violationDetails && report.accessibility.violationDetails.length > 0) {
        md += `### Detailed Violations\n\n`;
        
        report.accessibility.violationDetails.forEach((violation, vIndex) => {
          md += `#### ${vIndex + 1}. ${violation.id}: ${violation.description}\n\n`;
          md += `- **Impact**: ${violation.impact}\n`;
          md += `- **Help**: [${violation.helpUrl}](${violation.helpUrl})\n`;
          md += `- **Affected Elements**: ${violation.affectedElements.length}\n\n`;

          violation.affectedElements.forEach((element, eIndex) => {
            md += `**Element ${eIndex + 1}:**\n`;
            md += `- **Selector**: \`${element.selector}\`\n`;
            md += `- **HTML**: \`${element.html.substring(0, 200)}${element.html.length > 200 ? '...' : ''}\`\n`;
            if (element.failureSummary) {
              md += `- **Issue**: ${element.failureSummary.trim()}\n`;
            }
            if (element.screenshot) {
              md += `- **Screenshot**: ![Violation Screenshot](${element.screenshot})\n`;
            }
            md += `\n`;
          });
          md += `---\n\n`;
        });
      }

      // Incomplete checks
      if (report.accessibility.incompleteDetails && report.accessibility.incompleteDetails.length > 0) {
        md += `### Incomplete Checks (Needs Manual Review)\n\n`;
        
        report.accessibility.incompleteDetails.forEach((incomplete, iIndex) => {
          md += `#### ${iIndex + 1}. ${incomplete.id}: ${incomplete.description}\n\n`;
          md += `- **Help**: [${incomplete.helpUrl}](${incomplete.helpUrl})\n`;
          md += `- **Affected Elements**: ${incomplete.affectedElements.length}\n\n`;

          incomplete.affectedElements.forEach((element, eIndex) => {
            md += `**Element ${eIndex + 1}:**\n`;
            md += `- **Selector**: \`${element.selector}\`\n`;
            md += `- **HTML**: \`${element.html.substring(0, 200)}${element.html.length > 200 ? '...' : ''}\`\n\n`;
          });
          md += `---\n\n`;
        });
      }
    }
  }

  md += `---\n\n`;
  md += `*Report generated at ${new Date(report.timestamp).toLocaleString()}*\n`;

  return md;
}

/**
 * Save test results report to file
 * Organized by test type: test-results/<domain>/<test-type>/
 */
export async function saveTestResultsReport(
  report: TestResultsReport,
  outputDir: string,
  testType: string
): Promise<string> {
  // Generate URL slug for filename
  const urlSlug = getUrlSlug(report.url, { maxLength: 50, includePath: true });
  
  // Convert to Philippine time (UTC+8) and format as YYYY-MM-DDTHH-MM-SS
  const philippineTime = new Date(report.timestamp).toLocaleString('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false // 24-hour format
  });
  
  // Format: MM/DD/YYYY, HH:MM:SS -> YYYY-MM-DDTHH-MM-SS
  const [datePart, timePart] = philippineTime.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');
  const timestamp = `${year}-${month}-${day}T${hour}-${minute}-${second}`;
  
  // Create test-type subdirectory: test-results/<domain>/<test-type>/
  const testTypeDir = path.join(outputDir, testType);
  if (!fs.existsSync(testTypeDir)) {
    fs.mkdirSync(testTypeDir, { recursive: true });
  }

  // Save JSON report in test-type subdirectory
  const jsonFilename = `${testType}-${urlSlug}-${timestamp}.json`;
  const jsonPath = path.join(testTypeDir, jsonFilename);
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  // Save Markdown report in test-type subdirectory
  const mdReport = formatTestResultsReport(report);
  const mdFilename = `${testType}-${urlSlug}-${timestamp}.md`;
  const mdPath = path.join(testTypeDir, mdFilename);
  fs.writeFileSync(mdPath, mdReport, 'utf-8');

  // Also save as "latest" for easy access in test-type subdirectory
  const latestJsonPath = path.join(testTypeDir, `${testType}-latest.json`);
  const latestMdPath = path.join(testTypeDir, `${testType}-latest.md`);
  fs.writeFileSync(latestJsonPath, JSON.stringify(report, null, 2), 'utf-8');
  fs.writeFileSync(latestMdPath, mdReport, 'utf-8');

  return jsonPath;
}

/**
 * Format test results as a simple pass/fail summary
 */
export function formatTestResultsSummary(report: TestResultsReport): string {
  let summary = `\n${'='.repeat(80)}\n`;
  summary += `TEST RESULTS SUMMARY\n`;
  summary += `${'='.repeat(80)}\n\n`;
  summary += `URL: ${report.url}\n`;
  summary += `Test Type: ${report.testType}\n`;
  summary += `Timestamp: ${new Date(report.timestamp).toLocaleString()}\n\n`;
  
  summary += `OVERALL: ${report.summary.passRate}% Pass Rate\n`;
  summary += `  ✅ Passed: ${report.summary.passed}/${report.summary.total}\n`;
  summary += `  ❌ Failed: ${report.summary.failed}/${report.summary.total}\n\n`;

  // SEO Summary
  if (report.seo) {
    summary += `SEO CHECKS: ${report.seo.failed === 0 ? '✅ All Passed' : `❌ ${report.seo.failed} Failed`}\n`;
    summary += `  ✅ Passed: ${report.seo.passed}/${report.seo.total}\n`;
    summary += `  ❌ Failed: ${report.seo.failed}/${report.seo.total}\n`;
    if (report.seo.failed > 0) {
      summary += `  Failed Checks:\n`;
      report.seo.checks
        .filter(check => !check.passed)
        .forEach(check => {
          summary += `    - ❌ ${check.check}: ${check.message}\n`;
        });
    }
    summary += `\n`;
  }

  // Broken Links Summary
  if (report.brokenLinks) {
    summary += `BROKEN LINKS: ${report.brokenLinks.broken === 0 ? '✅ None Found' : `❌ ${report.brokenLinks.broken} Broken`}\n`;
    if (report.brokenLinks.broken > 0) {
      summary += `  Broken URLs:\n`;
      report.brokenLinks.links.slice(0, 5).forEach(link => {
        summary += `    - ❌ ${link.url} (${link.status} ${link.statusText})\n`;
      });
      if (report.brokenLinks.broken > 5) {
        summary += `    ... and ${report.brokenLinks.broken - 5} more\n`;
      }
    }
    summary += `\n`;
  }

  // Accessibility Summary
  if (report.accessibility) {
    summary += `ACCESSIBILITY: ${report.accessibility.passed ? '✅ Passed' : `❌ Failed (${report.accessibility.violations} violations)`}\n`;
    if (!report.accessibility.passed) {
      summary += `  Violations: ${report.accessibility.totalViolations}\n`;
      summary += `  Incomplete: ${report.accessibility.totalIncomplete}\n`;
      
      // Show violation types
      if (report.accessibility.violationDetails && report.accessibility.violationDetails.length > 0) {
        summary += `  Violation Types:\n`;
        report.accessibility.violationDetails.forEach((violation, index) => {
          summary += `    ${index + 1}. ${violation.id} (${violation.impact}): ${violation.description}\n`;
          summary += `       Affected: ${violation.affectedElements.length} element(s)\n`;
        });
      }
    }
    summary += `\n`;
  }

  summary += `${'='.repeat(80)}\n`;
  
  return summary;
}

