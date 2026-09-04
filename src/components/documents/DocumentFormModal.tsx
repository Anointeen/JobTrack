import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { CareerDocumentInput, DocumentType, DOCUMENT_TYPES } from '../../types';
import {
  DOCUMENT_ACCEPT_ATTRIBUTE,
  formatFileSize,
  isFileDocument,
  validateDocumentFile,
  validateDocumentUrl
} from '../../lib/documents';
import { FileText, Link as LinkIcon, Upload } from 'lucide-react';

interface DocumentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Uploads the chosen file and returns its storage path. Only called for the
   * file-backed types, and only once validation has passed.
   */
  onUpload: (file: File) => Promise<string>;
  onSave: (data: CareerDocumentInput) => Promise<void>;
}

/**
 * Add a document: either an uploaded resume/cover letter, or a portfolio link.
 *
 * One modal rather than two, because the two differ in a single field. The
 * type picker decides whether a file input or a URL input is shown, and the
 * database CHECK constraint added in migration 0005 enforces the same pairing
 * server-side.
 */
export const DocumentFormModal: React.FC<DocumentFormModalProps> = ({
  isOpen,
  onClose,
  onUpload,
  onSave
}) => {
  const [name, setName] = useState('');
  const [docType, setDocType] = useState<DocumentType>('resume');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setName('');
    setDocType('resume');
    setFile(null);
    setExternalUrl('');
    setIsDefault(false);
    setErrors({});
  }, [isOpen]);

  const needsFile = isFileDocument(docType);

  const validate = () => {
    const errs: Record<string, string> = {};

    // Mirrors the length(trim(name)) > 0 CHECK from migration 0005.
    if (!name.trim()) errs.name = 'Give this document a name.';

    if (needsFile) {
      const fileError = validateDocumentFile(file);
      if (fileError) errs.file = fileError;
    } else {
      const urlError = validateDocumentUrl(externalUrl);
      if (urlError) errs.externalUrl = urlError;
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setSubmitting(true);

      // The file is uploaded first: if storage rejects it there is no row to
      // clean up, whereas a row written first would point at nothing.
      const storagePath = needsFile && file ? await onUpload(file) : null;

      await onSave({
        name: name.trim(),
        doc_type: docType,
        storage_path: storagePath,
        external_url: needsFile ? null : externalUrl.trim(),
        is_default: isDefault
      });
      onClose();
    } catch (err: any) {
      setErrors({
        form: err?.message || 'We couldn\'t save this document. Please check your connection and try again.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Document" maxWidth="560px">
      {errors.form && (
        <div
          role="alert"
          style={{
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--meta-danger-bg)',
            border: '1px solid var(--rose-200)',
            color: 'var(--meta-danger-text)',
            fontSize: '0.84375rem',
            marginBottom: '1rem'
          }}
        >
          {errors.form}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="document-type">
            Type <span className="required">*</span>
          </label>
          <select
            id="document-type"
            className="input-control"
            value={docType}
            onChange={e => {
              setDocType(e.target.value as DocumentType);
              // The other branch's error no longer applies to what is on screen.
              setErrors({});
            }}
          >
            {DOCUMENT_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="document-name">
            Name <span className="required">*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <FileText
              size={18}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
            />
            <input
              id="document-name"
              type="text"
              className={`input-control ${errors.name ? 'input-error' : ''}`}
              placeholder="e.g. Resume v2 — Backend focus"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ paddingLeft: '2.375rem' }}
              required
            />
          </div>
          {errors.name && <span className="form-error">{errors.name}</span>}
        </div>

        {needsFile ? (
          <div className="form-group">
            <label className="form-label" htmlFor="document-file">
              File <span className="required">*</span>
            </label>
            <input
              id="document-file"
              type="file"
              accept={DOCUMENT_ACCEPT_ATTRIBUTE}
              className={`input-control ${errors.file ? 'input-error' : ''}`}
              onChange={e => {
                setFile(e.target.files?.[0] ?? null);
                setErrors(prev => ({ ...prev, file: '' }));
              }}
            />
            {errors.file && <span className="form-error">{errors.file}</span>}
            <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>
              {file
                ? `${file.name} · ${formatFileSize(file.size)}`
                : 'PDF, DOC or DOCX, up to 10 MB. Stored privately — only you can open it.'}
            </span>
          </div>
        ) : (
          <div className="form-group">
            <label className="form-label" htmlFor="document-url">
              Link <span className="required">*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <LinkIcon
                size={18}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }}
              />
              <input
                id="document-url"
                type="url"
                className={`input-control ${errors.externalUrl ? 'input-error' : ''}`}
                placeholder="https://your-portfolio.com"
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
                style={{ paddingLeft: '2.375rem' }}
              />
            </div>
            {errors.externalUrl && <span className="form-error">{errors.externalUrl}</span>}
          </div>
        )}

        {needsFile && (
          <label className="document-default-toggle" htmlFor="document-is-default">
            <input
              id="document-is-default"
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
            />
            <span>
              Use as my default {docType === 'resume' ? 'resume' : 'cover letter'}, and
              offer it when I add an application
            </span>
          </label>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? 'Saving...' : (<><Upload size={16} /> Save Document</>)}
          </button>
        </div>
      </form>
    </Modal>
  );
};
