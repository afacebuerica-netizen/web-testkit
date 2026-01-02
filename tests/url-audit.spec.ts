import { test, expect, request } from '@playwright/test';
import {
  runSEOChecks,
  formatSEOCheckReport,
} from '../utils/seo-checks';
import {
  checkBrokenLinks,
  formatBrokenLinksReport,
} from '../utils/broken-links';
import {
  runAccessibilityCheck,
  formatAccessibilityReport,
} from '../utils/accessibility';
import { gotoAndWait } from '../utils/page-load';
import { formatErrorWithContext, getCurrentUrl } from '../utils/error-handling';
import {
  generateTestResultsReport,
  saveTestResultsReport,
  formatTestResultsSummary,
} from '../utils/test-results-report';
import * as path from 'path';
import * as fs from 'fs';
const { getUrlBasedPath } = require('../utils/url-path');

/**
 * Dynamic URL audit test
 * URL can be provided via:
 * 1. Environment variable: URL_AUDIT_URL
 * 2. Playwright project use.baseURL
 * 3. Default fallback URL
 */
const TEST_URL = process.env.URL_AUDIT_URL || process.env.BASE_URL || 'https://anewbride.com/';

test.describe(`Audit Test for: ${TEST_URL}`, () => {
  test('comprehensive audit - SEO, broken links, and accessibility', async ({ page }) => {
    let currentUrl = TEST_URL;
    let seoResults: any = undefined;
    let brokenLinks: any = undefined;
    let accessibilityResults: any = undefined;
    
    // Get output directory paths (used for saving reports and screenshots)
    const testUrl = process.env.URL_AUDIT_URL || process.env.TEST_URL || TEST_URL;
    const outputDir = getUrlBasedPath(testUrl, 'test-results');
    const outputDirPath = path.join(process.cwd(), outputDir);
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      // Run all checks in parallel for faster execution
      const apiRequest = await request.newContext();

      [seoResults, brokenLinks, accessibilityResults] = await Promise.all([
        runSEOChecks(page, {
          checkRobots: true, // Include robots meta tag check
        }),
        checkBrokenLinks(page, apiRequest),
        runAccessibilityCheck(page),
      ]);

    // Log all reports
    console.log(`\n${'='.repeat(80)}`);
    console.log(`AUDIT REPORT FOR: ${TEST_URL}`);
    console.log(`${'='.repeat(80)}\n`);

    console.log('=== SEO CHECK RESULTS ===');
    console.log(await formatSEOCheckReport(seoResults, page));

    console.log('\n=== BROKEN LINKS CHECK ===');
    console.log(formatBrokenLinksReport(brokenLinks));

    console.log('\n=== ACCESSIBILITY CHECK ===');
    console.log(formatAccessibilityReport(accessibilityResults));

    console.log(`\n${'='.repeat(80)}\n`);

    // Take screenshots of accessibility violations (after outputDirPath is set)
    const screenshotsDir = path.join(outputDirPath, 'comprehensive-audit', 'screenshots');
    
    // Create screenshots directory
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Take screenshots of violating elements
    const violationScreenshots: { [key: string]: string } = {};
    if (accessibilityResults.violations && accessibilityResults.violations.length > 0) {
      for (let vIndex = 0; vIndex < accessibilityResults.violations.length; vIndex++) {
        const violation = accessibilityResults.violations[vIndex];
        if (violation.nodes && violation.nodes.length > 0) {
          for (let nIndex = 0; nIndex < violation.nodes.length; nIndex++) {
            const node = violation.nodes[nIndex];
            if (node.target && Array.isArray(node.target) && node.target.length > 0) {
              try {
                const selector = node.target[node.target.length - 1] as string;
                const element = page.locator(selector).first();
                
                // Check if element exists and is visible
                const count = await element.count();
                if (count > 0 && await element.isVisible().catch(() => false)) {
                  // Take screenshot of the element
                  const screenshotName = `violation-${vIndex + 1}-element-${nIndex + 1}-${violation.id}.png`;
                  const screenshotPath = path.join(screenshotsDir, screenshotName);
                  await element.screenshot({ path: screenshotPath });
                  
                  // Store relative path for report
                  const relativePath = path.join('comprehensive-audit', 'screenshots', screenshotName);
                  violationScreenshots[`${vIndex}-${nIndex}`] = relativePath;
                }
              } catch (screenshotError) {
                // If screenshot fails, continue with other elements
                console.warn(`Could not take screenshot for violation ${vIndex + 1}, element ${nIndex + 1}`);
              }
            }
          }
        }
      }
    }

    // Enhance violations with screenshot paths
    const enhancedViolations = accessibilityResults.violations.map((violation: any, vIndex: number) => ({
      ...violation,
      nodes: (violation.nodes || []).map((node: any, nIndex: number) => ({
        ...node,
        screenshot: violationScreenshots[`${vIndex}-${nIndex}`] || undefined,
      })),
    }));

    // Generate and save test results report BEFORE assertions (so it saves even if test fails)
    const testResultsReport = generateTestResultsReport(
      currentUrl,
      'comprehensive-audit',
      seoResults,
      brokenLinks,
      {
        passed: accessibilityResults.passed,
        violations: enhancedViolations,
        incomplete: accessibilityResults.incomplete,
        totalViolations: accessibilityResults.totalViolations,
        totalIncomplete: accessibilityResults.totalIncomplete,
      }
    );

    const reportPath = await saveTestResultsReport(
      testResultsReport,
      outputDirPath,
      'comprehensive-audit'
    );

    // Display summary
    console.log(formatTestResultsSummary(testResultsReport));
    console.log(`\n📄 Test results report saved to: ${reportPath}`);
    console.log(`   - Directory: comprehensive-audit/`);
    console.log(`   - JSON: ${path.basename(reportPath)}`);
    console.log(`   - Markdown: ${path.basename(reportPath).replace('.json', '.md')}`);
    if (Object.keys(violationScreenshots).length > 0) {
      console.log(`   - Screenshots: ${Object.keys(violationScreenshots).length} screenshot(s) saved to comprehensive-audit/screenshots/`);
    }
    console.log(`   - Latest: comprehensive-audit/comprehensive-audit-latest.json / .md\n`);

    // Assertions (after saving report)
    const failedSEOChecks = seoResults.filter((r: any) => !r.passed);
    
    // You can adjust these assertions based on your requirements
    // Option 1: Fail if any check fails
    expect(failedSEOChecks.length).toBe(0);
    expect(brokenLinks.length).toBe(0);
    expect(accessibilityResults.passed).toBe(true);
    
    // Option 2: Log failures but don't fail (comment out assertions above and use this):
    // if (failedSEOChecks.length > 0 || brokenLinks.length > 0 || !accessibilityResults.passed) {
    //   console.warn('⚠️  Some checks failed. Review the report above.');
    // }
    } catch (error: any) {
      // Try to save report even if test fails (in case it failed before the save above)
      if (seoResults || brokenLinks || accessibilityResults) {
        try {
          const testResultsReport = generateTestResultsReport(
            currentUrl,
            'comprehensive-audit',
            seoResults,
            brokenLinks,
            accessibilityResults ? {
              passed: accessibilityResults.passed,
              violations: accessibilityResults.violations,
              incomplete: accessibilityResults.incomplete,
              totalViolations: accessibilityResults.totalViolations,
              totalIncomplete: accessibilityResults.totalIncomplete,
            } : undefined
          );

          const testUrl = process.env.URL_AUDIT_URL || process.env.TEST_URL || TEST_URL;
          const outputDir = getUrlBasedPath(testUrl, 'test-results');
          const outputDirPath = path.join(process.cwd(), outputDir);
          await saveTestResultsReport(
            testResultsReport,
            outputDirPath,
            'comprehensive-audit'
          );
        } catch (saveError) {
          // Ignore save errors
        }
      }
      
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'comprehensive audit',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });

  test('SEO checks only', async ({ page }) => {
    let currentUrl = TEST_URL;
    let seoResults: any = undefined;
    
    // Get output directory paths (used for saving reports)
    const testUrl = process.env.URL_AUDIT_URL || process.env.TEST_URL || TEST_URL;
    const outputDir = getUrlBasedPath(testUrl, 'test-results');
    const outputDirPath = path.join(process.cwd(), outputDir);
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      seoResults = await runSEOChecks(page, {
        checkRobots: true,
      });

    console.log(`\nSEO Check for: ${TEST_URL}`);
    console.log(await formatSEOCheckReport(seoResults, page));

    // Generate and save test results report BEFORE assertions (so it saves even if test fails)
    const testResultsReport = generateTestResultsReport(
      currentUrl,
      'seo-check',
      seoResults
    );

    const reportPath = await saveTestResultsReport(
      testResultsReport,
      outputDirPath,
      'seo-check'
    );

    console.log(formatTestResultsSummary(testResultsReport));
    console.log(`\n📄 Test results report saved to: ${reportPath}`);
    console.log(`   - Directory: seo-check/\n`);

    const failedChecks = seoResults.filter((r: any) => !r.passed);
    expect(failedChecks.length).toBe(0);
    } catch (error: any) {
      // Try to save report even if test fails (in case it failed before the save above)
      if (seoResults !== undefined) {
        try {
          const testResultsReport = generateTestResultsReport(
            currentUrl,
            'seo-check',
            seoResults
          );

          await saveTestResultsReport(
            testResultsReport,
            outputDirPath,
            'seo-check'
          );
        } catch (saveError) {
          // Ignore save errors
        }
      }
      
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'SEO checks',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });

  test('broken links check only', async ({ page }) => {
    let currentUrl = TEST_URL;
    let brokenLinks: any = undefined;
    
    // Get output directory paths (used for saving reports)
    const testUrl = process.env.URL_AUDIT_URL || process.env.TEST_URL || TEST_URL;
    const outputDir = getUrlBasedPath(testUrl, 'test-results');
    const outputDirPath = path.join(process.cwd(), outputDir);
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);
      
      const apiRequest = await request.newContext();
      brokenLinks = await checkBrokenLinks(page, apiRequest);

    console.log(`\nBroken Links Check for: ${TEST_URL}`);
    console.log(formatBrokenLinksReport(brokenLinks));

    // Generate and save test results report BEFORE assertions (so it saves even if test fails)
    const testResultsReport = generateTestResultsReport(
      currentUrl,
      'broken-links',
      undefined,
      brokenLinks
    );

    const reportPath = await saveTestResultsReport(
      testResultsReport,
      outputDirPath,
      'broken-links'
    );

    console.log(formatTestResultsSummary(testResultsReport));
    console.log(`\n📄 Test results report saved to: ${reportPath}`);
    console.log(`   - Directory: broken-links/\n`);

    // Assertions (after saving report)
    expect(brokenLinks.length).toBe(0);
    } catch (error: any) {
      // Try to save report even if test fails (in case it failed before the save above)
      if (brokenLinks !== undefined) {
        try {
          const testResultsReport = generateTestResultsReport(
            currentUrl,
            'broken-links',
            undefined,
            brokenLinks
          );

          await saveTestResultsReport(
            testResultsReport,
            outputDirPath,
            'broken-links'
          );
        } catch (saveError) {
          // Ignore save errors
        }
      }
      
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'broken links check',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });

  test('accessibility check only', async ({ page }) => {
    let currentUrl = TEST_URL;
    
    try {
      console.log(`\nNavigating to: ${TEST_URL}`);
      await gotoAndWait(page, TEST_URL);
      currentUrl = await getCurrentUrl(page);
      console.log(`Successfully loaded: ${currentUrl}`);

      const scanResults = await runAccessibilityCheck(page);

    console.log(`\nAccessibility Check for: ${TEST_URL}`);
    console.log(formatAccessibilityReport(scanResults));

    // Take screenshots of violations
    const testUrl = process.env.URL_AUDIT_URL || process.env.TEST_URL || TEST_URL;
    const outputDir = getUrlBasedPath(testUrl, 'test-results');
    const outputDirPath = path.join(process.cwd(), outputDir);
    const screenshotsDir = path.join(outputDirPath, 'accessibility', 'screenshots');
    
    // Create screenshots directory
    if (!fs.existsSync(screenshotsDir)) {
      fs.mkdirSync(screenshotsDir, { recursive: true });
    }

    // Take screenshots of violating elements
    const violationScreenshots: { [key: string]: string } = {};
    if (scanResults.violations && scanResults.violations.length > 0) {
      for (let vIndex = 0; vIndex < scanResults.violations.length; vIndex++) {
        const violation = scanResults.violations[vIndex];
        if (violation.nodes && violation.nodes.length > 0) {
          for (let nIndex = 0; nIndex < violation.nodes.length; nIndex++) {
            const node = violation.nodes[nIndex];
            if (node.target && Array.isArray(node.target) && node.target.length > 0) {
              try {
                const selector = node.target[node.target.length - 1] as string;
                const element = page.locator(selector).first();
                
                // Check if element exists and is visible
                const count = await element.count();
                if (count > 0 && await element.isVisible().catch(() => false)) {
                  // Take screenshot of the element
                  const screenshotName = `violation-${vIndex + 1}-element-${nIndex + 1}-${violation.id}.png`;
                  const screenshotPath = path.join(screenshotsDir, screenshotName);
                  await element.screenshot({ path: screenshotPath });
                  
                  // Store relative path for report
                  const relativePath = path.join('accessibility', 'screenshots', screenshotName);
                  violationScreenshots[`${vIndex}-${nIndex}`] = relativePath;
                }
              } catch (screenshotError) {
                // If screenshot fails, continue with other elements
                console.warn(`Could not take screenshot for violation ${vIndex + 1}, element ${nIndex + 1}:`, screenshotError);
              }
            }
          }
        }
      }
    }

    // Enhance violations with screenshot paths
    const enhancedViolations = scanResults.violations.map((violation: any, vIndex: number) => ({
      ...violation,
      nodes: (violation.nodes || []).map((node: any, nIndex: number) => ({
        ...node,
        screenshot: violationScreenshots[`${vIndex}-${nIndex}`] || undefined,
      })),
    }));

    // Generate and save test results report
    const testResultsReport = generateTestResultsReport(
      currentUrl,
      'accessibility',
      undefined,
      undefined,
      {
        passed: scanResults.passed,
        violations: enhancedViolations,
        incomplete: scanResults.incomplete,
        totalViolations: scanResults.totalViolations,
        totalIncomplete: scanResults.totalIncomplete,
      }
    );

    const reportPath = await saveTestResultsReport(
      testResultsReport,
      outputDirPath,
      'accessibility'
    );

    console.log(formatTestResultsSummary(testResultsReport));
    console.log(`\n📄 Test results report saved to: ${reportPath}`);
    console.log(`   - Directory: accessibility/`);
    if (Object.keys(violationScreenshots).length > 0) {
      console.log(`   - Screenshots: ${Object.keys(violationScreenshots).length} screenshot(s) saved to accessibility/screenshots/`);
    }
    console.log(`\n`);

    expect(scanResults.passed).toBe(true);
    } catch (error: any) {
      const finalUrl = await getCurrentUrl(page);
      const errorMessage = formatErrorWithContext(
        TEST_URL,
        'accessibility check',
        error
      );
      console.error(errorMessage);
      console.error(`URL before error: ${TEST_URL}`);
      console.error(`URL after error: ${finalUrl}`);
      throw error;
    }
  });
});

