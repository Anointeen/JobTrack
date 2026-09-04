import { describe, it, expect } from 'vitest';
import {
  defaultAttachments,
  documentTypePlural,
  fileExtension,
  filterDocuments,
  formatFileSize,
  formatUploadDate,
  groupDocumentsByType,
  isFileDocument,
  validateDocumentFile,
  validateDocumentUrl
} from './documents';
import { makeDocument, makePortfolioLink } from '../test/factories';
import { MAX_DOCUMENT_BYTES } from '../types';

/**
 * Document rules live here rather than in the components, so what can and
 * cannot be saved is testable without rendering anything — the same split
 * salary.ts and calendar.ts use.
 */

/** A stand-in File; jsdom's File is enough for name and size. */
const fileOf = (name: string, size: number): File => {
  const f = new File(['x'], name, { type: 'application/octet-stream' });
  Object.defineProperty(f, 'size', { value: size });
  return f;
};

describe('isFileDocument', () => {
  it('is true for the types backed by an upload', () => {
    expect(isFileDocument('resume')).toBe(true);
    expect(isFileDocument('cover_letter')).toBe(true);
  });

  it('is false for a portfolio link, which has no file', () => {
    expect(isFileDocument('portfolio_link')).toBe(false);
  });
});

describe('validateDocumentFile', () => {
  it('accepts the supported formats', () => {
    for (const name of ['cv.pdf', 'cv.PDF', 'cv.doc', 'cv.docx']) {
      expect(validateDocumentFile(fileOf(name, 1024))).toBeNull();
    }
  });

  it('rejects an unsupported format', () => {
    expect(validateDocumentFile(fileOf('cv.exe', 1024))).toMatch(/not supported/i);
    expect(validateDocumentFile(fileOf('cv.png', 1024))).toMatch(/not supported/i);
  });

  it('rejects a file with no extension at all', () => {
    expect(validateDocumentFile(fileOf('resume', 1024))).toMatch(/not supported/i);
  });

  it('rejects an empty file', () => {
    expect(validateDocumentFile(fileOf('cv.pdf', 0))).toMatch(/empty/i);
  });

  it('rejects a file over the size limit, and names the limit', () => {
    const error = validateDocumentFile(fileOf('cv.pdf', MAX_DOCUMENT_BYTES + 1));
    expect(error).toMatch(/10\.0 MB/);
  });

  it('accepts a file exactly on the limit', () => {
    expect(validateDocumentFile(fileOf('cv.pdf', MAX_DOCUMENT_BYTES))).toBeNull();
  });

  it('asks for a file when none was chosen', () => {
    expect(validateDocumentFile(null)).toMatch(/choose a file/i);
  });
});

describe('validateDocumentUrl', () => {
  it('accepts http and https', () => {
    expect(validateDocumentUrl('https://example.test/me')).toBeNull();
    expect(validateDocumentUrl('http://example.test')).toBeNull();
  });

  it('trims surrounding whitespace before judging', () => {
    expect(validateDocumentUrl('  https://example.test  ')).toBeNull();
  });

  it('rejects an empty value', () => {
    expect(validateDocumentUrl('   ')).toMatch(/enter the link/i);
  });

  it('rejects something that is not a URL', () => {
    expect(validateDocumentUrl('my portfolio')).toMatch(/valid url/i);
  });

  it('rejects script-bearing schemes rather than sanitising them', () => {
    // These would otherwise be rendered into an href and run in the user's
    // own browser when followed.
    expect(validateDocumentUrl('javascript:alert(1)')).toMatch(/http/i);
    expect(validateDocumentUrl('data:text/html,<script>alert(1)</script>')).toMatch(/http/i);
    expect(validateDocumentUrl('file:///etc/passwd')).toMatch(/http/i);
  });
});

describe('formatFileSize', () => {
  it('scales the unit to the size', () => {
    expect(formatFileSize(512)).toBe('512 B');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(3 * 1024 * 1024)).toBe('3.0 MB');
  });

  it('returns nothing for a nonsense size', () => {
    expect(formatFileSize(-1)).toBe('');
    expect(formatFileSize(NaN)).toBe('');
  });
});

describe('fileExtension', () => {
  it('lowercases and drops the dot', () => {
    expect(fileExtension('Resume.PDF')).toBe('pdf');
    expect(fileExtension('user-1/abc.docx')).toBe('docx');
  });

  it('is empty when there is no extension', () => {
    expect(fileExtension('resume')).toBe('');
  });
});

describe('formatUploadDate', () => {
  it('renders a readable date', () => {
    expect(formatUploadDate('2026-02-01T00:00:00.000Z')).toMatch(/2026/);
  });

  it('returns nothing for an unparseable value', () => {
    expect(formatUploadDate('not-a-date')).toBe('');
  });
});

describe('filtering and grouping', () => {
  const docs = [
    makeDocument({ id: 'r1', doc_type: 'resume' }),
    makeDocument({ id: 'c1', doc_type: 'cover_letter' }),
    makePortfolioLink({ id: 'p1' })
  ];

  it('returns everything when no filter is applied', () => {
    expect(filterDocuments(docs, 'All')).toHaveLength(3);
  });

  it('narrows to a single type', () => {
    expect(filterDocuments(docs, 'resume').map(d => d.id)).toEqual(['r1']);
    expect(filterDocuments(docs, 'portfolio_link').map(d => d.id)).toEqual(['p1']);
  });

  it('groups by type without losing anything', () => {
    const grouped = groupDocumentsByType(docs);
    expect(grouped.resume.map(d => d.id)).toEqual(['r1']);
    expect(grouped.cover_letter.map(d => d.id)).toEqual(['c1']);
    expect(grouped.portfolio_link.map(d => d.id)).toEqual(['p1']);
  });

  it('names each type in the plural for filters and empty states', () => {
    expect(documentTypePlural('resume')).toBe('Resumes');
    expect(documentTypePlural('cover_letter')).toBe('Cover letters');
    expect(documentTypePlural('portfolio_link')).toBe('Portfolio links');
  });
});

describe('defaultAttachments', () => {
  it('offers the default resume and cover letter', () => {
    const docs = [
      makeDocument({ id: 'r1', doc_type: 'resume', is_default: true }),
      makeDocument({ id: 'r2', doc_type: 'resume' }),
      makeDocument({ id: 'c1', doc_type: 'cover_letter', is_default: true })
    ];
    expect(defaultAttachments(docs).map(d => d.id).sort()).toEqual(['c1', 'r1']);
  });

  it('offers nothing when no default is set', () => {
    expect(defaultAttachments([makeDocument({ is_default: false })])).toEqual([]);
  });

  it('never auto-attaches a portfolio link, even one marked default', () => {
    // A link is not something you send with an application, and defaulting it
    // on would put it on every application the user ever creates.
    const docs = [makePortfolioLink({ id: 'p1', is_default: true })];
    expect(defaultAttachments(docs)).toEqual([]);
  });
});
