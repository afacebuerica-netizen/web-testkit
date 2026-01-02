# Naming Conventions Optimization Proposal

## Current Issues

### 1. Test Artifact Folders
**Current**: `url-audit-Audit-Test-for-h-e59b5-com-broken-links-check-only-chromium`
- ❌ Hash-based, not human-readable
- ❌ Hard to identify test type
- ❌ No timestamp
- ❌ Very long names

### 2. JSON Report Files
**Current**: `test-results.json`
- ❌ Overwrites on each run (no history)
- ❌ No timestamp
- ❌ Can't tell which test type it contains

### 3. HTML Reports
**Current**: `index.html` + `index-YYYY-MM-DDTHH-MM-SS.html`
- ✅ Has timestamps
- ⚠️ Could be more descriptive

## Proposed Naming Conventions

### Option 1: Descriptive + URL + Timestamp (Recommended)

#### Test Artifact Folders
```
Format: <test-type>-<url-slug>-<timestamp>-<browser>

Examples:
- comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29-chromium/
- seo-check-mexicocitydating-com-2025-01-02-03-40-15-chromium/
- broken-links-mexicocitydating-com-tour-page-2025-01-02-03-42-30-chromium/
- accessibility-anewbride-com-2025-01-02-03-45-00-chromium/
```

#### JSON Report Files
```
Format: <test-type>-<url-slug>-<timestamp>.json (with latest symlink/copy)

Examples:
- comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29.json
- seo-check-mexicocitydating-com-2025-01-02-03-40-15.json
- broken-links-mexicocitydating-com-tour-page-2025-01-02-03-42-30.json
- test-results-latest.json (symlink to most recent)
```

#### HTML Reports
```
Format: <test-type>-<url-slug>-<timestamp>.html (with latest copy)

Examples:
- comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29.html
- seo-check-mexicocitydating-com-2025-01-02-03-40-15.html
- broken-links-mexicocitydating-com-tour-page-2025-01-02-03-42-30.html
- index.html (latest copy)
```

#### URL Slug Format
- **Root URL**: `domain-com` (e.g., `mexicocitydating-com`)
- **With Path**: `domain-com-path-segment` (e.g., `mexicocitydating-com-tour-page`)
- **Multiple Paths**: `domain-com-path1-path2` (e.g., `anewbride-com-tour-things`)
- **Special Characters**: Replaced with hyphens, dots removed

### Option 2: Short + URL + Sequential (Alternative)

#### Test Artifact Folders
```
Format: <test-type>-<url-slug>-<run-number>-<browser>

Examples:
- comprehensive-audit-mexicocitydating-com-001-chromium/
- seo-check-mexicocitydating-com-002-chromium/
- broken-links-mexicocitydating-com-tour-003-chromium/
```

#### JSON Report Files
```
Format: <test-type>-<url-slug>-run-<number>.json

Examples:
- comprehensive-audit-mexicocitydating-com-run-001.json
- seo-check-mexicocitydating-com-run-002.json
```

### Option 3: URL-Safe + Descriptive (Most Readable)

#### Test Artifact Folders
```
Format: <test-type>_<url-slug>_<date>_<time>_<browser>

Examples:
- comprehensive_audit_mexicocitydating_com_2025-01-02_03-37-29_chromium/
- seo_check_mexicocitydating_com_2025-01-02_03-37-29_chromium/
- broken_links_mexicocitydating_com_tour_page_2025-01-02_03-37-29_chromium/
```

#### JSON Report Files
```
Format: <test-type>_<url-slug>_<date>_<time>.json

Examples:
- comprehensive_audit_mexicocitydating_com_2025-01-02_03-37-29.json
- seo_check_mexicocitydating_com_2025-01-02_03-37-29.json
- latest.json (symlink)
```

## Recommended Structure (Option 1 - With URL)

```
test-results/
└── mexicocitydating.com/
    ├── comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29-chromium/
    │   ├── video.webm
    │   └── error-context.md
    ├── seo-check-mexicocitydating-com-2025-01-02-03-40-15-chromium/
    │   └── video.webm
    ├── broken-links-mexicocitydating-com-tour-page-2025-01-02-03-42-30-chromium/
    │   └── video.webm
    ├── comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29.json
    ├── seo-check-mexicocitydating-com-2025-01-02-03-40-15.json
    ├── broken-links-mexicocitydating-com-tour-page-2025-01-02-03-42-30.json
    └── test-results-latest.json → (symlink to most recent)

playwright-report/
└── mexicocitydating.com/
    ├── comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29.html
    ├── seo-check-mexicocitydating-com-2025-01-02-03-40-15.html
    ├── broken-links-mexicocitydating-com-tour-page-2025-01-02-03-42-30.html
    ├── index.html (latest copy)
    └── data/
        └── ...
```

### Example with Multiple URLs

```
test-results/
├── mexicocitydating.com/
│   ├── comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29-chromium/
│   └── comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29.json
├── mexicocitydating.com/tour/
│   ├── comprehensive-audit-mexicocitydating-com-tour-page-2025-01-02-04-15-00-chromium/
│   └── comprehensive-audit-mexicocitydating-com-tour-page-2025-01-02-04-15-00.json
└── anewbride.com/
    ├── seo-check-anewbride-com-2025-01-02-05-20-00-chromium/
    └── seo-check-anewbride-com-2025-01-02-05-20-00.json
```

## Benefits

✅ **Human-readable**: Instantly know what test type, which URL, and when it ran
✅ **Sortable**: Chronological order by filename
✅ **No overwriting**: Each test run gets unique name
✅ **Easy filtering**: Can filter by test type, URL, or date
✅ **History preserved**: All test runs kept
✅ **Clear organization**: Test type and URL are obvious from name
✅ **URL identification**: Know exactly which page/site was tested without opening files
✅ **Multi-site friendly**: Easy to identify tests from different sites

## Implementation Notes

1. **Test Type Extraction**: Extract from test name/describe block
2. **URL Slug Generation**: Convert URL to filesystem-safe slug
   - Domain: `mexicocitydating.com` → `mexicocitydating-com`
   - Path: `/tour/page.html` → `tour-page`
   - Full: `https://mexicocitydating.com/tour/page.html` → `mexicocitydating-com-tour-page`
3. **Timestamp Format**: `YYYY-MM-DD-HH-MM-SS` (sortable, readable)
4. **Browser Suffix**: Keep browser name for multi-browser testing
5. **Latest Symlink**: Create symlink/copy of most recent for easy access
6. **Backward Compatible**: Keep existing structure working during transition

## URL Slug Generation Rules

```javascript
// Examples:
https://mexicocitydating.com/ 
  → mexicocitydating-com

https://mexicocitydating.com/tour/
  → mexicocitydating-com-tour

https://mexicocitydating.com/tour/things-to-consider.html
  → mexicocitydating-com-tour-things-to-consider

https://www.anewbride.com/about/team.html
  → anewbride-com-about-team

https://example.com/path/with/multiple/segments/
  → example-com-path-with-multiple-segments
```

**Rules:**
- Remove `www.` prefix
- Replace dots (`.`) with hyphens (`-`)
- Replace slashes (`/`) with hyphens (`-`)
- Remove file extensions (`.html`, `.php`, etc.)
- Convert to lowercase
- Limit total length to ~100 characters (truncate if needed)
- Remove special characters (keep only alphanumeric and hyphens)

## Test Type Mapping

| Test Name Pattern | Short Name |
|-----------------|------------|
| "comprehensive audit" | `comprehensive-audit` |
| "SEO checks only" | `seo-check` |
| "broken links check only" | `broken-links` |
| "accessibility check only" | `accessibility` |

## Real-World Examples

### Example 1: Root URL Test
**URL**: `https://mexicocitydating.com/`
**Test**: Comprehensive audit
**Timestamp**: `2025-01-02-03-37-29`

**Result**:
- Folder: `comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29-chromium/`
- JSON: `comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29.json`
- HTML: `comprehensive-audit-mexicocitydating-com-2025-01-02-03-37-29.html`

### Example 2: Page with Path
**URL**: `https://mexicocitydating.com/tour/things-to-consider.html`
**Test**: SEO check
**Timestamp**: `2025-01-02-04-15-00`

**Result**:
- Folder: `seo-check-mexicocitydating-com-tour-things-to-consider-2025-01-02-04-15-00-chromium/`
- JSON: `seo-check-mexicocitydating-com-tour-things-to-consider-2025-01-02-04-15-00.json`
- HTML: `seo-check-mexicocitydating-com-tour-things-to-consider-2025-01-02-04-15-00.html`

### Example 3: Multiple Path Segments
**URL**: `https://anewbride.com/about/team/members.html`
**Test**: Broken links check
**Timestamp**: `2025-01-02-05-30-45`

**Result**:
- Folder: `broken-links-anewbride-com-about-team-members-2025-01-02-05-30-45-chromium/`
- JSON: `broken-links-anewbride-com-about-team-members-2025-01-02-05-30-45.json`
- HTML: `broken-links-anewbride-com-about-team-members-2025-01-02-05-30-45.html`

### Example 4: Different Sites, Same Test
**URL 1**: `https://mexicocitydating.com/`
**URL 2**: `https://anewbride.com/`
**Test**: Comprehensive audit
**Timestamp**: `2025-01-02-06-00-00`

**Result**:
```
test-results/
├── mexicocitydating.com/
│   └── comprehensive-audit-mexicocitydating-com-2025-01-02-06-00-00-chromium/
└── anewbride.com/
    └── comprehensive-audit-anewbride-com-2025-01-02-06-00-00-chromium/
```

**Benefits**: Easy to identify which site each test belongs to!

