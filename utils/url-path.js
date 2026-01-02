/**
 * Utility functions for generating folder paths based on URLs
 */

/**
 * Generate a safe folder name from a URL
 * @param {string} url - The URL to parse
 * @returns {object} - Object with domain and pathSegments
 */
function parseUrlToPath(url) {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace(/^www\./, ''); // Remove www. prefix
    
    // Get pathname and remove leading/trailing slashes, then split
    const pathname = urlObj.pathname.replace(/^\/+|\/+$/g, '');
    let pathSegments = pathname ? pathname.split('/').filter(Boolean) : [];
    
    // Remove filename if it exists (has extension like .html, .php, etc.)
    if (pathSegments.length > 0) {
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Check if last segment looks like a filename (has extension and no special chars that suggest it's a directory)
      if (lastSegment.includes('.') && !lastSegment.match(/^[a-zA-Z0-9_-]+$/)) {
        // Remove the filename, keep only directory structure
        pathSegments = pathSegments.slice(0, -1);
      }
    }
    
    return {
      domain,
      pathSegments,
      fullPath: pathSegments.length > 0 ? pathSegments.join('/') : '',
    };
  } catch (error) {
    throw new Error(`Invalid URL: ${url} - ${error.message}`);
  }
}

/**
 * Generate folder path for test results based on URL
 * @param {string} url - The URL being tested
 * @param {string} baseDir - Base directory (e.g., 'test-results' or 'playwright-report')
 * @returns {string} - Full folder path
 */
function getUrlBasedPath(url, baseDir = 'test-results') {
  const { domain, pathSegments } = parseUrlToPath(url);
  const path = require('path');
  
  if (pathSegments.length === 0) {
    // Root URL, just use domain
    return path.join(baseDir, domain);
  } else {
    // Has path, use domain as root and path segments as subdirectories
    return path.join(baseDir, domain, ...pathSegments);
  }
}

/**
 * Get the directory name (last segment) for file naming
 * @param {string} url - The URL being tested
 * @returns {string} - Directory name (last path segment or 'root')
 */
function getUrlDirectoryName(url) {
  const { pathSegments } = parseUrlToPath(url);
  return pathSegments.length > 0 ? pathSegments[pathSegments.length - 1] : 'root';
}

/**
 * Generate a URL slug for use in filenames
 * Converts URL to a filesystem-safe string
 * @param {string} url - The URL to convert
 * @param {object} options - Options for slug generation
 * @param {number} options.maxLength - Maximum length of slug (default: 100)
 * @param {boolean} options.includePath - Include path segments (default: true)
 * @returns {string} - URL slug (e.g., "mexicocitydating-com" or "mexicocitydating-com-tour-page")
 */
function getUrlSlug(url, options = {}) {
  const { maxLength = 100, includePath = true } = options;
  
  try {
    const { domain, pathSegments } = parseUrlToPath(url);
    
    // Convert domain: replace dots with hyphens
    let slug = domain.replace(/\./g, '-');
    
    // Add path segments if requested
    if (includePath && pathSegments.length > 0) {
      // Join path segments with hyphens, remove file extensions
      const pathSlug = pathSegments
        .map(segment => {
          // Remove file extension if present
          return segment.replace(/\.[^.]+$/, '');
        })
        .filter(segment => segment.length > 0) // Remove empty segments
        .join('-');
      
      if (pathSlug) {
        slug += '-' + pathSlug;
      }
    }
    
    // Clean up: remove special characters, keep only alphanumeric and hyphens
    slug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    // Truncate if too long
    if (slug.length > maxLength) {
      slug = slug.substring(0, maxLength).replace(/-+$/, ''); // Remove trailing hyphens
    }
    
    return slug;
  } catch (error) {
    // Fallback: create a safe slug from the URL string
    return url
      .toLowerCase()
      .replace(/https?:\/\//g, '')
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, maxLength);
  }
}

module.exports = {
  parseUrlToPath,
  getUrlBasedPath,
  getUrlDirectoryName,
  getUrlSlug,
};

