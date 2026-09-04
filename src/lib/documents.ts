import {
  ACCEPTED_DOCUMENT_EXTENSIONS,
  CareerDocument,
  DocumentType,
  DOCUMENT_TYPES,
  MAX_DOCUMENT_BYTES
} from '../types';

/**
 * Presentation and validation for the document hub.
 *
 * Kept out of the components so the rules that decide whether a document can
 * be saved are testable without rendering anything, matching how salary.ts and
 * calendar.ts are organised.
 */

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  resume: 'Resume',
  cover_letter: 'Cover letter',
  portfolio_link: 'Portfolio link'
};

/**
 * Badge tone per document type, as a CSS class.
 *
 * Reuses the event-tone classes from the calendar rather than defining a third
 * set of colour pairs: those already resolve to theme-aware tokens that clear
 * WCAG AA in both themes.
 */
export const DOCUMENT_TYPE_TONE: Record<DocumentType, string> = {
  resume: 'evt-indigo',
  cover_letter: 'evt-sky',
  portfolio_link: 'evt-purple'
};

/** True for the types backed by an uploaded file rather than a URL. */
export const isFileDocument = (docType: DocumentType): boolean =>
  docType === 'resume' || docType === 'cover_letter';

/** The `accept` attribute for the upload input. */
export const DOCUMENT_ACCEPT_ATTRIBUTE = ACCEPTED_DOCUMENT_EXTENSIONS.join(',');

/** "2.4 MB", "812 KB". */
export const formatFileSize = (bytes: number): string => {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** "3 Sep 2026". */
export const formatUploadDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

/** The extension of a stored path or filename, lowercased, without the dot. */
export const fileExtension = (nameOrPath: string): string => {
  const dot = nameOrPath.lastIndexOf('.');
  return dot > -1 ? nameOrPath.slice(dot + 1).toLowerCase() : '';
};

/**
 * Rejects a file the upload cannot accept.
 *
 * Extension rather than MIME type: browsers disagree on the type they report
 * for .doc and .docx, and an empty or generic type would reject legitimate
 * files. Storage policies and the bucket's own limits remain the authority.
 */
export const validateDocumentFile = (file: File | null): string | null => {
  if (!file) return 'Choose a file to upload.';

  const ext = `.${fileExtension(file.name)}`;
  if (!ACCEPTED_DOCUMENT_EXTENSIONS.includes(ext as typeof ACCEPTED_DOCUMENT_EXTENSIONS[number])) {
    return `That file type is not supported. Upload a ${ACCEPTED_DOCUMENT_EXTENSIONS.join(', ')} file.`;
  }
  if (file.size === 0) return 'That file is empty.';
  if (file.size > MAX_DOCUMENT_BYTES) {
    return `That file is ${formatFileSize(file.size)}. The limit is ${formatFileSize(MAX_DOCUMENT_BYTES)}.`;
  }
  return null;
};

/**
 * Rejects a portfolio URL the form cannot accept.
 *
 * Only http and https: a `javascript:` URL rendered into a link is a script
 * the user's own browser would run, and `data:` can carry markup just as
 * happily. Anything else is refused rather than sanitised.
 */
export const validateDocumentUrl = (raw: string): string | null => {
  const value = raw.trim();
  if (!value) return 'Enter the link to your portfolio.';

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return 'Enter a valid URL, including https://.';
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'Links must start with http:// or https://.';
  }
  return null;
};

/** Groups a library by type, preserving the order documents arrived in. */
export const groupDocumentsByType = (
  documents: CareerDocument[]
): Record<DocumentType, CareerDocument[]> => {
  const grouped = {
    resume: [] as CareerDocument[],
    cover_letter: [] as CareerDocument[],
    portfolio_link: [] as CareerDocument[]
  };
  for (const doc of documents) {
    const bucket = grouped[doc.doc_type];
    if (bucket) bucket.push(doc);
  }
  return grouped;
};

/** Documents of a type, or all of them when no filter is applied. */
export const filterDocuments = (
  documents: CareerDocument[],
  filter: DocumentType | 'All'
): CareerDocument[] =>
  filter === 'All' ? documents : documents.filter(d => d.doc_type === filter);

/** The plural label for a type, used by filters and empty states. */
export const documentTypePlural = (docType: DocumentType): string =>
  DOCUMENT_TYPES.find(t => t.value === docType)?.plural ?? 'Documents';

/**
 * The documents to offer automatically on a brand-new application: the user's
 * default resume and cover letter, where they have set one.
 *
 * Portfolio links are excluded deliberately — a link is not something you
 * "send with" an application in the way a tailored CV is, and defaulting it on
 * would attach it to every application the user ever creates.
 */
export const defaultAttachments = (documents: CareerDocument[]): CareerDocument[] =>
  documents.filter(d => d.is_default && isFileDocument(d.doc_type));
