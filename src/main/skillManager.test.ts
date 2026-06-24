/**
 * Unit tests for pure utility functions and parsers in skillManager.ts.
 *
 * Logic is mirrored inline because skillManager.ts imports Electron APIs
 * which cannot be loaded outside the Electron main process.
 */
import yaml from 'js-yaml';
import path from 'path';
import { expect,test } from 'vitest';

// ---------------------------------------------------------------------------
// Mirror of parseFrontmatter from skillManager.ts
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

const parseFrontmatter = (raw: string): { frontmatter: Record<string, unknown>; content: string } => {
  const normalized = raw.replace(/^\uFEFF/, '');
  const match = normalized.match(FRONTMATTER_RE);
  if (!match) {
    return { frontmatter: {}, content: normalized };
  }

  let frontmatter: Record<string, unknown> = {};
  try {
    const parsed = yaml.load(match[1]);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch {
    // YAML parse error — return empty frontmatter
  }

  const content = normalized.slice(match[0].length);
  return { frontmatter, content };
};

// ---------------------------------------------------------------------------
// Mirror of isTruthy from skillManager.ts
// ---------------------------------------------------------------------------

const isTruthy = (value?: unknown): boolean => {
  if (value === true) return true;
  if (!value) return false;
  if (typeof value !== 'string') return false;
  const normalized = value.trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
};

// ---------------------------------------------------------------------------
// Mirror of extractDescription from skillManager.ts
// ---------------------------------------------------------------------------

const extractDescription = (content: string): string => {
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    return trimmed.replace(/^#+\s*/, '');
  }
  return '';
};

// ---------------------------------------------------------------------------
// Mirror of normalizeFolderName from skillManager.ts
// ---------------------------------------------------------------------------

const normalizeFolderName = (name: string): string => {
  const normalized = name.replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '');
  return normalized || 'skill';
};

// ---------------------------------------------------------------------------
// Mirror of isZipFile from skillManager.ts
// ---------------------------------------------------------------------------

const isZipFile = (filePath: string): boolean => path.extname(filePath).toLowerCase() === '.zip';

// ---------------------------------------------------------------------------
// Mirror of compareVersions from skillManager.ts
// ---------------------------------------------------------------------------

const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map(s => parseInt(s, 10) || 0);
  const pb = b.split('.').map(s => parseInt(s, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
};

// ---------------------------------------------------------------------------
// Mirror of deriveRepoName from skillManager.ts
// ---------------------------------------------------------------------------

const deriveRepoName = (source: string): string => {
  const cleaned = source.replace(/[#?].*$/, '');
  const base = cleaned.split('/').filter(Boolean).pop() || 'skill';
  return normalizeFolderName(base.replace(/\.git$/, ''));
};

// ---------------------------------------------------------------------------
// Mirror of extractErrorMessage from skillManager.ts
// ---------------------------------------------------------------------------

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
};

// ---------------------------------------------------------------------------
// Mirror of parseGithubRepoSource from skillManager.ts
// ---------------------------------------------------------------------------

type GithubRepoSource = { owner: string; repo: string };

const parseGithubRepoSource = (repoUrl: string): GithubRepoSource | null => {
  const trimmed = repoUrl.trim();

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?\/?$/i);
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname.toLowerCase())) {
      return null;
    }

    const segments = parsedUrl.pathname
      .replace(/\.git$/i, '')
      .split('/')
      .filter(Boolean);
    if (segments.length < 2) {
      return null;
    }

    return { owner: segments[0], repo: segments[1] };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Mirror of normalizeGithubSubpath from skillManager.ts
// ---------------------------------------------------------------------------

const normalizeGithubSubpath = (value: string): string | null => {
  const trimmed = value.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return null;
  const segments = trimmed
    .split('/')
    .filter(Boolean)
    .map(segment => {
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    });
  if (segments.some(segment => segment === '.' || segment === '..')) {
    return null;
  }
  return segments.join('/');
};

// ---------------------------------------------------------------------------
// Mirror of parseGithubTreeOrBlobUrl from skillManager.ts
// ---------------------------------------------------------------------------

type NormalizedGitSource = {
  repoUrl: string;
  sourceSubpath?: string;
  ref?: string;
  repoNameHint?: string;
};

const parseGithubTreeOrBlobUrl = (source: string): NormalizedGitSource | null => {
  try {
    const parsedUrl = new URL(source);
    if (!['github.com', 'www.github.com'].includes(parsedUrl.hostname)) {
      return null;
    }

    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    if (segments.length < 5) {
      return null;
    }

    const [owner, repoRaw, mode, ref, ...rest] = segments;
    if (!owner || !repoRaw || !ref || (mode !== 'tree' && mode !== 'blob')) {
      return null;
    }

    const repo = repoRaw.replace(/\.git$/i, '');
    const sourceSubpath = normalizeGithubSubpath(rest.join('/'));
    if (!repo || !sourceSubpath) {
      return null;
    }

    return {
      repoUrl: `https://github.com/${owner}/${repo}.git`,
      sourceSubpath,
      ref: decodeURIComponent(ref),
      repoNameHint: repo,
    };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Mirror of isNpmPackageSpec from skillManager.ts
// ---------------------------------------------------------------------------

const isNpmPackageSpec = (source: string): boolean => {
  if (source.startsWith('.') || source.startsWith('/') || source.startsWith('~')) return false;
  try { new URL(source); return false; } catch { /* not a URL */ }

  if (/^@[\w-]+\/[\w.-]+(@[\w.^~>=<*-]+)?$/.test(source)) return true;
  if (/^[\w.-]+(@[\w.^~>=<*-]+)?$/.test(source) && !source.includes('/')) return true;

  return false;
};

// ---------------------------------------------------------------------------
// Mirror of isRemoteZipUrl from skillManager.ts
// ---------------------------------------------------------------------------

const isRemoteZipUrl = (source: string): boolean => {
  try {
    const url = new URL(source);
    return (url.protocol === 'http:' || url.protocol === 'https:')
      && url.pathname.toLowerCase().endsWith('.zip');
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------------------
// Mirror of resolveWithin from skillManager.ts
// ---------------------------------------------------------------------------

const resolveWithin = (root: string, target: string): string => {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(root, target);
  if (resolvedTarget === resolvedRoot) return resolvedTarget;
  if (!resolvedTarget.startsWith(resolvedRoot + path.sep)) {
    throw new Error('Invalid target path');
  }
  return resolvedTarget;
};

// ---------------------------------------------------------------------------
// Mirror of parseClawhubUrl from skillManager.ts
// ---------------------------------------------------------------------------

const parseClawhubUrl = (source: string): { name: string } | null => {
  try {
    const url = new URL(source);
    if (url.hostname !== 'clawhub.ai' && url.hostname !== 'www.clawhub.ai') return null;
    const segments = url.pathname.split('/').filter(Boolean);
    // Format: /skills/{owner}/{name}
    if (segments.length >= 3 && segments[0] === 'skills') {
      return { name: segments[2] };
    }
    // Format: /skills/{name}
    if (segments.length >= 2 && segments[0] === 'skills') {
      return { name: segments[1] };
    }
    // Format: /{owner}/{name} (no /skills/ prefix)
    if (segments.length >= 2) {
      return { name: segments[1] };
    }
    return null;
  } catch {
    return null;
  }
};

const parseSkillHubSource = (source: string): { slug: string } | null => {
  const trimmed = source.trim();
  if (trimmed.startsWith('skillhub:')) {
    const slug = trimmed.slice('skillhub:'.length).trim();
    return slug ? { slug } : null;
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase();
    if (!['skillhub.lol', 'www.skillhub.lol', 'skillhub.club', 'www.skillhub.club'].includes(host)) {
      return null;
    }
    const segments = url.pathname.split('/').filter(Boolean);
    const skillIndex = segments.indexOf('skills');
    if (skillIndex < 0 || !segments[skillIndex + 1]) {
      return null;
    }
    return { slug: decodeURIComponent(segments[skillIndex + 1]) };
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// /{owner}/{name} format
// ---------------------------------------------------------------------------

test('clawhub: /{owner}/{name} extracts skill name', () => {
  expect(parseClawhubUrl('https://clawhub.ai/steipete/slack')).toEqual({ name: 'slack' });
});

test('clawhub: /{owner}/{name} with www prefix', () => {
  expect(parseClawhubUrl('https://www.clawhub.ai/steipete/slack')).toEqual({ name: 'slack' });
});

test('clawhub: /{owner}/{name} with trailing slash', () => {
  expect(parseClawhubUrl('https://clawhub.ai/anthropic/web-search/')).toEqual({ name: 'web-search' });
});

// ---------------------------------------------------------------------------
// /skills/{owner}/{name} format
// ---------------------------------------------------------------------------

test('clawhub: /skills/{owner}/{name} extracts skill name', () => {
  expect(parseClawhubUrl('https://clawhub.ai/skills/steipete/slack')).toEqual({ name: 'slack' });
});

test('clawhub: /skills/{owner}/{name} with trailing slash', () => {
  expect(parseClawhubUrl('https://clawhub.ai/skills/anthropic/web-search/')).toEqual({ name: 'web-search' });
});

// ---------------------------------------------------------------------------
// /skills/{name} format
// ---------------------------------------------------------------------------

test('clawhub: /skills/{name} extracts skill name', () => {
  expect(parseClawhubUrl('https://clawhub.ai/skills/slack')).toEqual({ name: 'slack' });
});

// ---------------------------------------------------------------------------
// Rejected inputs
// ---------------------------------------------------------------------------

test('clawhub: non-clawhub hostname returns null', () => {
  expect(parseClawhubUrl('https://github.com/steipete/slack')).toBeNull();
});

test('clawhub: root path returns null', () => {
  expect(parseClawhubUrl('https://clawhub.ai/')).toBeNull();
});

test('clawhub: single segment path returns null', () => {
  expect(parseClawhubUrl('https://clawhub.ai/about')).toBeNull();
});

test('clawhub: invalid URL returns null', () => {
  expect(parseClawhubUrl('not-a-url')).toBeNull();
});

test('clawhub: empty string returns null', () => {
  expect(parseClawhubUrl('')).toBeNull();
});

test('skillhub: scheme source extracts slug', () => {
  expect(parseSkillHubSource('skillhub:docs-writer')).toEqual({ slug: 'docs-writer' });
});

test('skillhub: web URL extracts slug', () => {
  expect(parseSkillHubSource('https://skillhub.lol/skills/docs-writer')).toEqual({ slug: 'docs-writer' });
});

test('skillhub: API host URL extracts slug', () => {
  expect(parseSkillHubSource('https://skillhub.club/skills/docs-writer')).toEqual({ slug: 'docs-writer' });
});

test('skillhub: non-skillhub input returns null', () => {
  expect(parseSkillHubSource('https://github.com/owner/repo')).toBeNull();
});

// ===========================================================================
// parseFrontmatter
// ===========================================================================

test('parseFrontmatter: extracts name and description from YAML frontmatter', () => {
  const { frontmatter, content } = parseFrontmatter(
    '---\nname: my-skill\ndescription: A useful skill\n---\n\n# My Skill\n\nInstructions here.'
  );
  expect(frontmatter).toEqual({ name: 'my-skill', description: 'A useful skill' });
  expect(content).toEqual('\n# My Skill\n\nInstructions here.');
});

test('parseFrontmatter: returns empty frontmatter when no frontmatter present', () => {
  const { frontmatter, content } = parseFrontmatter('# My Skill\n\nNo frontmatter here.');
  expect(frontmatter).toEqual({});
  expect(content).toEqual('# My Skill\n\nNo frontmatter here.');
});

test('parseFrontmatter: strips BOM prefix before parsing', () => {
  const { frontmatter, content } = parseFrontmatter(
    '\uFEFF---\nname: bom-skill\n---\nContent after BOM.'
  );
  expect(frontmatter).toEqual({ name: 'bom-skill' });
  expect(content).toEqual('Content after BOM.');
});

test('parseFrontmatter: returns empty frontmatter for malformed YAML', () => {
  const { frontmatter, content } = parseFrontmatter(
    '---\n* invalid: [yaml\n---\n\nContent after bad YAML.'
  );
  expect(frontmatter).toEqual({});
  expect(content).toEqual('\nContent after bad YAML.');
});

test('parseFrontmatter: ignores frontmatter that parses as array', () => {
  const { frontmatter, content } = parseFrontmatter(
    '---\n- item1\n- item2\n---\nContent after array frontmatter.'
  );
  expect(frontmatter).toEqual({});
  expect(content).toEqual('Content after array frontmatter.');
});

test('parseFrontmatter: ignores frontmatter that parses as scalar', () => {
  const { frontmatter, content } = parseFrontmatter(
    '---\nsimple string\n---\nContent after scalar frontmatter.'
  );
  expect(frontmatter).toEqual({});
  expect(content).toEqual('Content after scalar frontmatter.');
});

test('parseFrontmatter: handles empty content after frontmatter', () => {
  const { frontmatter, content } = parseFrontmatter('---\nversion: "1.0"\n---');
  expect(frontmatter).toEqual({ version: '1.0' });
  expect(content).toEqual('');
});

test('parseFrontmatter: preserves version field in frontmatter', () => {
  const { frontmatter } = parseFrontmatter(
    '---\nname: versioned\nversion: "2.0.1"\n---\n\nInstructions.'
  );
  expect(frontmatter).toEqual({ name: 'versioned', version: '2.0.1' });
});

// ===========================================================================
// isTruthy
// ===========================================================================

test('isTruthy: returns true for boolean true', () => {
  expect(isTruthy(true)).toBe(true);
});

test('isTruthy: returns true for string "true"', () => {
  expect(isTruthy('true')).toBe(true);
  expect(isTruthy('  TRUE  ')).toBe(true);
});

test('isTruthy: returns true for string "yes"', () => {
  expect(isTruthy('yes')).toBe(true);
  expect(isTruthy('YES')).toBe(true);
});

test('isTruthy: returns true for string "1"', () => {
  expect(isTruthy('1')).toBe(true);
});

test('isTruthy: returns false for boolean false', () => {
  expect(isTruthy(false)).toBe(false);
});

test('isTruthy: returns false for falsy values', () => {
  expect(isTruthy(undefined)).toBe(false);
  expect(isTruthy(null)).toBe(false);
  expect(isTruthy('')).toBe(false);
  expect(isTruthy(0)).toBe(false);
});

test('isTruthy: returns false for non-true strings', () => {
  expect(isTruthy('false')).toBe(false);
  expect(isTruthy('no')).toBe(false);
  expect(isTruthy('0')).toBe(false);
  expect(isTruthy('maybe')).toBe(false);
});

test('isTruthy: returns false for non-string non-boolean values', () => {
  expect(isTruthy(42)).toBe(false);
  expect(isTruthy({})).toBe(false);
  expect(isTruthy([])).toBe(false);
});

// ===========================================================================
// extractDescription
// ===========================================================================

test('extractDescription: returns first non-empty line as description', () => {
  expect(extractDescription('# My Skill\n\nMore content.')).toBe('My Skill');
});

test('extractDescription: strips multiple hash markers', () => {
  expect(extractDescription('### Section Title\nBody.')).toBe('Section Title');
});

test('extractDescription: skips leading empty lines', () => {
  expect(extractDescription('\n\n  # First Content\nBody.')).toBe('First Content');
});

test('extractDescription: returns empty string for empty content', () => {
  expect(extractDescription('')).toBe('');
});

test('extractDescription: returns empty string for whitespace-only content', () => {
  expect(extractDescription('   \n  \n')).toBe('');
});

// ===========================================================================
// normalizeFolderName
// ===========================================================================

test('normalizeFolderName: replaces special characters with hyphens', () => {
  expect(normalizeFolderName('my skill name!')).toBe('my-skill-name');
});

test('normalizeFolderName: removes leading and trailing hyphens', () => {
  expect(normalizeFolderName('---test---')).toBe('test');
});

test('normalizeFolderName: preserves underscores and numbers', () => {
  expect(normalizeFolderName('skill_v2')).toBe('skill_v2');
});

test('normalizeFolderName: returns "skill" when all characters are invalid', () => {
  expect(normalizeFolderName('!@#$%')).toBe('skill');
});

test('normalizeFolderName: returns "skill" for empty input', () => {
  expect(normalizeFolderName('')).toBe('skill');
});

// ===========================================================================
// isZipFile
// ===========================================================================

test('isZipFile: returns true for .zip extension', () => {
  expect(isZipFile('archive.zip')).toBe(true);
});

test('isZipFile: returns true for .ZIP (case insensitive)', () => {
  expect(isZipFile('ARCHIVE.ZIP')).toBe(true);
});

test('isZipFile: returns false for non-zip extensions', () => {
  expect(isZipFile('file.tar.gz')).toBe(false);
  expect(isZipFile('skill.md')).toBe(false);
});

test('isZipFile: returns false for files without extension', () => {
  expect(isZipFile('noext')).toBe(false);
});

// ===========================================================================
// compareVersions
// ===========================================================================

test('compareVersions: returns 1 when a > b', () => {
  expect(compareVersions('1.0.1', '1.0.0')).toBe(1);
  expect(compareVersions('2.0.0', '1.9.9')).toBe(1);
});

test('compareVersions: returns -1 when a < b', () => {
  expect(compareVersions('1.0.0', '2.0.0')).toBe(-1);
  expect(compareVersions('0.9.0', '1.0.0')).toBe(-1);
});

test('compareVersions: returns 0 when versions are equal', () => {
  expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
});

test('compareVersions: handles different segment lengths', () => {
  expect(compareVersions('1.0', '1.0.0')).toBe(0);
  expect(compareVersions('1.0.1', '1.0')).toBe(1);
});

test('compareVersions: treats non-numeric segments as 0', () => {
  expect(compareVersions('1.0.alpha', '1.0.0')).toBe(0);
  expect(compareVersions('1.0.beta', '1.0.alpha')).toBe(0);
});

test('compareVersions: handles pre-release-type suffixes in version strings', () => {
  expect(compareVersions('1', '2')).toBe(-1);
  expect(compareVersions('10', '2')).toBe(1);
});

// ===========================================================================
// deriveRepoName
// ===========================================================================

test('deriveRepoName: extracts repo name from HTTPS URL', () => {
  expect(deriveRepoName('https://github.com/owner/my-skill')).toBe('my-skill');
});

test('deriveRepoName: strips .git suffix', () => {
  expect(deriveRepoName('https://github.com/owner/repo.git')).toBe('repo');
});

test('deriveRepoName: strips query parameters and hash', () => {
  expect(deriveRepoName('https://github.com/owner/repo?ref=branch#readme')).toBe('repo');
});

test('deriveRepoName: returns "skill" for empty URL', () => {
  expect(deriveRepoName('')).toBe('skill');
});

test('deriveRepoName: normalizes special characters in name', () => {
  expect(deriveRepoName('https://github.com/owner/my skill')).toBe('my-skill');
});

// ===========================================================================
// extractErrorMessage
// ===========================================================================

test('extractErrorMessage: returns message from Error instance', () => {
  expect(extractErrorMessage(new Error('something failed'))).toBe('something failed');
});

test('extractErrorMessage: converts plain string to string', () => {
  expect(extractErrorMessage('plain error')).toBe('plain error');
});

test('extractErrorMessage: converts null to "null"', () => {
  expect(extractErrorMessage(null)).toBe('null');
});

test('extractErrorMessage: converts numbers to string', () => {
  expect(extractErrorMessage(42)).toBe('42');
});

// ===========================================================================
// parseGithubRepoSource
// ===========================================================================

test('parseGithubRepoSource: parses standard HTTPS GitHub URL', () => {
  expect(parseGithubRepoSource('https://github.com/owner/repo')).toEqual({
    owner: 'owner',
    repo: 'repo',
  });
});

test('parseGithubRepoSource: accepts www.github.com', () => {
  expect(parseGithubRepoSource('https://www.github.com/org/pkg')).toEqual({
    owner: 'org',
    repo: 'pkg',
  });
});

test('parseGithubRepoSource: strips .git suffix from repo name', () => {
  expect(parseGithubRepoSource('https://github.com/owner/repo.git')).toEqual({
    owner: 'owner',
    repo: 'repo',
  });
});

test('parseGithubRepoSource: parses SSH GitHub URL', () => {
  expect(parseGithubRepoSource('git@github.com:owner/repo')).toEqual({
    owner: 'owner',
    repo: 'repo',
  });
});

test('parseGithubRepoSource: parses SSH GitHub URL with .git suffix', () => {
  expect(parseGithubRepoSource('git@github.com:owner/repo.git')).toEqual({
    owner: 'owner',
    repo: 'repo',
  });
});

test('parseGithubRepoSource: returns null for non-GitHub host', () => {
  expect(parseGithubRepoSource('https://gitlab.com/owner/repo')).toBeNull();
});

test('parseGithubRepoSource: returns null for invalid URL', () => {
  expect(parseGithubRepoSource('not-a-url')).toBeNull();
});

test('parseGithubRepoSource: returns null for single-segment path', () => {
  expect(parseGithubRepoSource('https://github.com/owner')).toBeNull();
});

// ===========================================================================
// normalizeGithubSubpath
// ===========================================================================

test('normalizeGithubSubpath: returns normalized path', () => {
  expect(normalizeGithubSubpath('src/skills/my-skill')).toBe('src/skills/my-skill');
});

test('normalizeGithubSubpath: strips leading and trailing slashes', () => {
  expect(normalizeGithubSubpath('/src/skills/my-skill/')).toBe('src/skills/my-skill');
});

test('normalizeGithubSubpath: returns null for empty string', () => {
  expect(normalizeGithubSubpath('')).toBeNull();
  expect(normalizeGithubSubpath('   ')).toBeNull();
});

test('normalizeGithubSubpath: rejects ".." segments', () => {
  expect(normalizeGithubSubpath('src/../etc')).toBeNull();
});

test('normalizeGithubSubpath: rejects "." segments', () => {
  expect(normalizeGithubSubpath('src/./file')).toBeNull();
});

test('normalizeGithubSubpath: decodes URL-encoded characters', () => {
  expect(normalizeGithubSubpath('src%2Fskills/my%20skill')).toBe('src/skills/my skill');
});

// ===========================================================================
// parseGithubTreeOrBlobUrl
// ===========================================================================

test('parseGithubTreeOrBlobUrl: parses tree URL with subpath', () => {
  const result = parseGithubTreeOrBlobUrl('https://github.com/owner/repo/tree/main/skills/my-skill');
  expect(result).toEqual({
    repoUrl: 'https://github.com/owner/repo.git',
    sourceSubpath: 'skills/my-skill',
    ref: 'main',
    repoNameHint: 'repo',
  });
});

test('parseGithubTreeOrBlobUrl: parses blob URL with file path', () => {
  const result = parseGithubTreeOrBlobUrl('https://github.com/owner/repo/blob/dev/README.md');
  expect(result).toEqual({
    repoUrl: 'https://github.com/owner/repo.git',
    sourceSubpath: 'README.md',
    ref: 'dev',
    repoNameHint: 'repo',
  });
});

test('parseGithubTreeOrBlobUrl: strips .git suffix from repo name', () => {
  const result = parseGithubTreeOrBlobUrl('https://github.com/owner/repo.git/tree/main/my-skill');
  expect(result?.repoUrl).toBe('https://github.com/owner/repo.git');
  expect(result?.repoNameHint).toBe('repo');
});

test('parseGithubTreeOrBlobUrl: returns null for non-GitHub host', () => {
  expect(parseGithubTreeOrBlobUrl('https://gitlab.com/owner/repo/tree/main/file')).toBeNull();
});

test('parseGithubTreeOrBlobUrl: returns null for too few segments', () => {
  expect(parseGithubTreeOrBlobUrl('https://github.com/owner/repo')).toBeNull();
});

test('parseGithubTreeOrBlobUrl: returns null for non-tree/non-blob mode', () => {
  expect(parseGithubTreeOrBlobUrl('https://github.com/owner/repo/commits/main')).toBeNull();
});

test('parseGithubTreeOrBlobUrl: rejects subpath with ".."', () => {
  expect(parseGithubTreeOrBlobUrl('https://github.com/owner/repo/tree/main/../etc')).toBeNull();
});

test('parseGithubTreeOrBlobUrl: returns null for invalid URL', () => {
  expect(parseGithubTreeOrBlobUrl('not-a-url')).toBeNull();
});

// ===========================================================================
// isNpmPackageSpec
// ===========================================================================

test('isNpmPackageSpec: returns true for simple package name', () => {
  expect(isNpmPackageSpec('lodash')).toBe(true);
});

test('isNpmPackageSpec: returns true for scoped package', () => {
  expect(isNpmPackageSpec('@scope/package')).toBe(true);
});

test('isNpmPackageSpec: returns true for package with version', () => {
  expect(isNpmPackageSpec('lodash@4.0.0')).toBe(true);
  expect(isNpmPackageSpec('@scope/package@1.2.3')).toBe(true);
});

test('isNpmPackageSpec: returns false for HTTP URL', () => {
  expect(isNpmPackageSpec('https://example.com/pkg.tar.gz')).toBe(false);
});

test('isNpmPackageSpec: returns false for local path', () => {
  expect(isNpmPackageSpec('./local-dir')).toBe(false);
  expect(isNpmPackageSpec('/absolute/path')).toBe(false);
  expect(isNpmPackageSpec('~/home-dir')).toBe(false);
});

test('isNpmPackageSpec: returns false for GitHub owner/repo shorthand', () => {
  expect(isNpmPackageSpec('owner/repo')).toBe(false);
});

test('isNpmPackageSpec: returns false for empty string', () => {
  expect(isNpmPackageSpec('')).toBe(false);
});

// ===========================================================================
// isRemoteZipUrl
// ===========================================================================

test('isRemoteZipUrl: returns true for HTTPS zip URL', () => {
  expect(isRemoteZipUrl('https://example.com/skill.zip')).toBe(true);
});

test('isRemoteZipUrl: returns true for HTTP zip URL', () => {
  expect(isRemoteZipUrl('http://example.com/skill.zip')).toBe(true);
});

test('isRemoteZipUrl: returns false for non-zip URL', () => {
  expect(isRemoteZipUrl('https://example.com/skill.tar.gz')).toBe(false);
});

test('isRemoteZipUrl: returns false for local path', () => {
  expect(isRemoteZipUrl('./local.zip')).toBe(false);
  expect(isRemoteZipUrl('C:\\file.zip')).toBe(false);
});

test('isRemoteZipUrl: returns false for invalid URL', () => {
  expect(isRemoteZipUrl('not-a-url')).toBe(false);
});

// ===========================================================================
// resolveWithin
// ===========================================================================

test('resolveWithin: resolves path within root', () => {
  const result = resolveWithin('/app/skills', 'my-skill');
  expect(result).toBe(path.resolve('/app/skills/my-skill'));
});

test('resolveWithin: rejects path traversal attempts', () => {
  expect(() => resolveWithin('/app/skills', '../../etc/passwd')).toThrow('Invalid target path');
});

test('resolveWithin: allows the root directory itself', () => {
  expect(() => resolveWithin('/app/skills', '.')).not.toThrow();
});

test('resolveWithin: rejects paths that resolve outside root via resolve', () => {
  // /app/skills/../other resolves to /app/other which is outside /app/skills
  expect(() => resolveWithin('/app/skills', '../other')).toThrow('Invalid target path');
});

test('resolveWithin: accepts same directory as root', () => {
  const result = resolveWithin('/app/skills/my-skill', 'subdir');
  expect(result).toBe(path.resolve('/app/skills/my-skill/subdir'));
});
