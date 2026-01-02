import { Page, APIRequestContext } from '@playwright/test';
import { URL } from 'url';

/**
 * Interface for link element information
 */
export interface LinkElementInfo {
  url: string;
  text: string | null;
  html: string;
  selector: string;
  tagName: string;
  href: string;
}

/**
 * Interface for link check results
 */
export interface LinkCheckResult {
  url: string;
  status: number;
  statusText: string;
  isBroken: boolean;
  error?: string;
  // Element information - which elements on the page link to this URL
  elements?: LinkElementInfo[];
}

/**
 * Extract all links from a page with element information
 * Returns a map of normalized URLs to their element information
 */
export async function extractLinksWithElements(
  page: Page,
  baseUrl?: string
): Promise<Map<string, LinkElementInfo[]>> {
  const currentUrl = page.url();
  const base = baseUrl || currentUrl;
  const baseUrlObj = new URL(base);

  // Extract all href attributes from <a> tags with element information
  const linkData = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href]'));
    return anchors.map((anchor, index) => {
      const element = anchor as HTMLAnchorElement;
      const text = element.textContent?.trim() || null;
      const html = element.outerHTML.substring(0, 200); // Limit HTML length
      const href = element.href;
      
      // Generate a simple selector (try id, class, or fallback to tag + index)
      let selector = '';
      if (element.id) {
        selector = `#${element.id}`;
      } else if (element.className) {
        const classes = element.className.split(' ').filter(c => c).slice(0, 2).join('.');
        selector = `a.${classes}`;
      } else {
        selector = `a:nth-of-type(${index + 1})`;
      }

      return {
        href,
        text,
        html,
        selector,
        tagName: element.tagName.toLowerCase(),
      };
    });
  });

  // Normalize URLs and group elements by normalized URL
  const linkMap = new Map<string, LinkElementInfo[]>();

  for (const linkInfo of linkData) {
    try {
      const link = linkInfo.href;
      
      // Skip empty, javascript:, mailto:, tel:, and anchor-only links
      if (!link || link.startsWith('javascript:') || link.startsWith('mailto:') || link.startsWith('tel:') || link.startsWith('#')) {
        continue;
      }

      // Convert relative URLs to absolute
      const urlObj = new URL(link, base);
      const absoluteUrl = urlObj.href;

      // Only check links from the same origin (optional: remove to check external links)
      // Uncomment the next line to only check same-origin links:
      // if (urlObj.origin !== baseUrlObj.origin) continue;

      // Remove hash fragments and trailing slashes for consistency
      const normalizedUrl = absoluteUrl.split('#')[0].replace(/\/$/, '');

      // Group elements by normalized URL
      if (!linkMap.has(normalizedUrl)) {
        linkMap.set(normalizedUrl, []);
      }
      linkMap.get(normalizedUrl)!.push({
        url: normalizedUrl,
        text: linkInfo.text,
        html: linkInfo.html,
        selector: linkInfo.selector,
        tagName: linkInfo.tagName,
        href: linkInfo.href,
      });
    } catch (error) {
      // Skip invalid URLs
      console.warn(`Invalid URL skipped: ${linkInfo.href}`);
    }
  }

  return linkMap;
}

/**
 * Extract all links from a page and normalize them to absolute URLs
 * @deprecated Use extractLinksWithElements for better element tracking
 */
export async function extractLinks(page: Page, baseUrl?: string): Promise<string[]> {
  const linkMap = await extractLinksWithElements(page, baseUrl);
  return Array.from(linkMap.keys());
}

/**
 * Check if a single link is broken using HEAD request (faster than GET)
 * Falls back to GET if HEAD is not supported
 */
export async function checkLink(
  request: APIRequestContext,
  url: string,
  timeout: number = 10000
): Promise<LinkCheckResult> {
  try {
    // Try HEAD request first (faster, doesn't download body)
    let response;
    try {
      response = await request.head(url, { timeout });
    } catch (error) {
      // If HEAD fails, try GET
      response = await request.get(url, { timeout });
    }

    const status = response.status();
    const statusText = response.statusText();
    const isBroken = status >= 400;

    return {
      url,
      status,
      statusText,
      isBroken,
    };
  } catch (error: any) {
    // Network errors, timeouts, etc.
    return {
      url,
      status: 0,
      statusText: 'Error',
      isBroken: true,
      error: error?.message || 'Unknown error',
    };
  }
}

/**
 * Check multiple links in parallel
 */
export async function checkLinks(
  request: APIRequestContext,
  urls: string[],
  concurrency: number = 10
): Promise<LinkCheckResult[]> {
  const results: LinkCheckResult[] = [];
  
  // Process links in batches to avoid overwhelming the server
  for (let i = 0; i < urls.length; i += concurrency) {
    const batch = urls.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(url => checkLink(request, url))
    );
    results.push(...batchResults);
  }

  return results;
}

/**
 * Check all links on a page for broken links
 * Returns only broken links with element information
 */
export async function checkBrokenLinks(
  page: Page,
  request: APIRequestContext,
  baseUrl?: string,
  concurrency: number = 10
): Promise<LinkCheckResult[]> {
  // Extract all links with element information
  const linkMap = await extractLinksWithElements(page, baseUrl);
  const links = Array.from(linkMap.keys());
  
  console.log(`Found ${links.length} unique links to check`);

  // Check all links
  const results = await checkLinks(request, links, concurrency);

  // Add element information to results and filter to only broken links
  const brokenLinks = results
    .filter(result => result.isBroken)
    .map(result => {
      const elements = linkMap.get(result.url) || [];
      return {
        ...result,
        elements: elements.length > 0 ? elements : undefined,
      };
    });

  return brokenLinks;
}

/**
 * Format broken links results for reporting with element information
 */
export function formatBrokenLinksReport(brokenLinks: LinkCheckResult[]): string {
  if (brokenLinks.length === 0) {
    return '✅ No broken links found!';
  }

  let report = `❌ Found ${brokenLinks.length} broken link(s):\n\n`;
  
  for (const link of brokenLinks) {
    report += `${'─'.repeat(80)}\n`;
    report += `🔗 Broken URL: ${link.url}\n`;
    report += `   Status: ${link.status} ${link.statusText}\n`;
    if (link.error) {
      report += `   Error: ${link.error}\n`;
    }
    
    // Show which elements on the page link to this broken URL
    if (link.elements && link.elements.length > 0) {
      report += `\n   📍 Found on page (${link.elements.length} element(s)):\n\n`;
      
      link.elements.forEach((element, index) => {
        report += `   Element ${index + 1}:\n`;
        report += `      Selector: ${element.selector}\n`;
        report += `      Link Text: ${element.text || '(empty or no text)'}\n`;
        report += `      Tag: <${element.tagName}>\n`;
        report += `      HTML: ${element.html.substring(0, 150)}${element.html.length > 150 ? '...' : ''}\n`;
        report += `      Original href: ${element.href}\n`;
        report += '\n';
      });
    } else {
      report += `\n   ⚠️  No element information available (link may be dynamically generated)\n\n`;
    }
  }

  report += `${'─'.repeat(80)}\n`;
  return report;
}


