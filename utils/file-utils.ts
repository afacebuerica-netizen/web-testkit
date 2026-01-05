import * as fs from 'fs';
import * as path from 'path';
import { URL } from 'url';

/**
 * Generate a safe filename from a URL
 * Example: https://example.com/page.html -> page.json
 * Example: https://example.com/about -> about.json
 */
export function getFilenameFromUrl(url: string, extension: string = 'json'): string {
  try {
    const urlObj = new URL(url);
    let filename = urlObj.pathname;
    
    // Remove leading slash
    if (filename.startsWith('/')) {
      filename = filename.substring(1);
    }
    
    // If empty (root path), use domain name
    if (!filename || filename === '/') {
      filename = urlObj.hostname.replace(/\./g, '-');
    } else {
      // Extract just the last part of the path (the filename)
      const pathParts = filename.split('/').filter(part => part.length > 0);
      filename = pathParts[pathParts.length - 1];
      
      // Remove .html extension if present
      if (filename.endsWith('.html')) {
        filename = filename.substring(0, filename.length - 5);
      }
      
      // If no extension was present and it's still a path, use the last part
      if (filename.includes('/')) {
        const parts = filename.split('/');
        filename = parts[parts.length - 1];
      }
    }
    
    // Sanitize filename: remove invalid characters
    filename = filename.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
    
    // Ensure filename is not empty
    if (!filename || filename.trim().length === 0) {
      filename = 'index';
    }
    
    // Add extension
    return `${filename}.${extension}`;
  } catch (error) {
    // If URL parsing fails, use a default name
    return `report-${Date.now()}.${extension}`;
  }
}

/**
 * Ensure directory exists, create if it doesn't
 */
export function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Write JSON data to a file
 */
export function writeJsonFile(filePath: string, data: any): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Write text data to a file
 */
export function writeTextFile(filePath: string, data: string): void {
  ensureDirectoryExists(path.dirname(filePath));
  fs.writeFileSync(filePath, data, 'utf8');
}
