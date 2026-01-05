import { Page } from '@playwright/test';
import { SEOCheckResult } from './seo-checks';
import { LinkCheckResult } from './broken-links';

/**
 * Merged report structure containing all test results
 */
export interface MergedReport {
  url: string;
  timestamp: string;
  summary: {
    overallStatus: 'passed' | 'failed';
    seoPassed: boolean;
    brokenLinksCount: number;
    accessibilityPassed: boolean;
  };
  seo: {
    results: SEOCheckResult[];
    passedCount: number;
    totalCount: number;
    failedChecks: SEOCheckResult[];
  };
  brokenLinks: {
    totalChecked: number;
    brokenCount: number;
    brokenLinks: LinkCheckResult[];
  };
  accessibility: {
    passed: boolean;
    totalViolations: number;
    totalIncomplete: number;
    violations: any[];
    incomplete: any[];
  };
  metadata?: {
    pageTitle?: string;
    metaDescription?: string;
    canonicalUrl?: string;
    robotsMetaTag?: string;
  };
}

/**
 * Merge all test results into a single report structure
 */
export async function mergeTestResults(
  url: string,
  seoResults: SEOCheckResult[],
  brokenLinks: LinkCheckResult[],
  accessibilityResults: {
    violations: any[];
    incomplete: any[];
    passed: boolean;
    totalViolations: number;
    totalIncomplete: number;
  },
  page?: Page
): Promise<MergedReport> {
  const seoPassedCount = seoResults.filter(r => r.passed).length;
  const seoFailedChecks = seoResults.filter(r => !r.passed);
  const seoPassed = seoFailedChecks.length === 0;
  
  const brokenLinksCount = brokenLinks.filter(link => link.isBroken).length;
  
  const overallStatus = (seoPassed && brokenLinksCount === 0 && accessibilityResults.passed) 
    ? 'passed' 
    : 'failed';

  const report: MergedReport = {
    url,
    timestamp: new Date().toISOString(),
    summary: {
      overallStatus,
      seoPassed,
      brokenLinksCount,
      accessibilityPassed: accessibilityResults.passed,
    },
    seo: {
      results: seoResults,
      passedCount: seoPassedCount,
      totalCount: seoResults.length,
      failedChecks: seoFailedChecks,
    },
    brokenLinks: {
      totalChecked: brokenLinks.length,
      brokenCount: brokenLinksCount,
      brokenLinks: brokenLinks.filter(link => link.isBroken),
    },
    accessibility: {
      passed: accessibilityResults.passed,
      totalViolations: accessibilityResults.totalViolations,
      totalIncomplete: accessibilityResults.totalIncomplete,
      violations: accessibilityResults.violations,
      incomplete: accessibilityResults.incomplete,
    },
  };

  // Add metadata if page is provided
  if (page) {
    try {
      const title = await page.title();
      const metaDescription = await page.locator('meta[name="description"]').getAttribute('content').catch(() => null);
      const canonicalUrl = await page.locator('link[rel="canonical"]').getAttribute('href').catch(() => null);
      const robotsMetaTag = await page.locator('meta[name="robots"]').getAttribute('content').catch(() => null);

      report.metadata = {
        pageTitle: title || undefined,
        metaDescription: metaDescription || undefined,
        canonicalUrl: canonicalUrl || undefined,
        robotsMetaTag: robotsMetaTag || undefined,
      };
    } catch (error) {
      // Metadata extraction failed, skip it
    }
  }

  return report;
}
