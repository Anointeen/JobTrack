import React, { useMemo, useState } from 'react';
import {
  AlertCircle, Download, ExternalLink, FileText, Plus, Star, Trash2
} from 'lucide-react';
import { CareerDocument, DocumentType, DOCUMENT_TYPES } from '../../types';
import { useDocuments } from '../../context/DocumentsContext';
import { useToast } from '../../context/ToastContext';
import { DocumentTypeBadge } from './DocumentTypeBadge';
import { DocumentFormModal } from './DocumentFormModal';
import { Skeleton } from '../common/Skeleton';
import {
  documentTypePlural,
  filterDocuments,
  formatUploadDate,
  isFileDocument
} from '../../lib/documents';

export const DocumentsView: React.FC = () => {
  const {
    documents, loading, loaded, error,
    createDocument, uploadFile, setDefault, removeDocument, getDownloadUrl, links
  } = useDocuments();
  const { addToast } = useToast();

  const [filter, setFilter] = useState<DocumentType | 'All'>('All');
  const [showForm, setShowForm] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => filterDocuments(documents, filter), [documents, filter]);

  const countFor = (type: DocumentType | 'All') =>
    type === 'All' ? documents.length : documents.filter(d => d.doc_type === type).length;

  /** How many applications a document is attached to. */
  const attachedCount = (documentId: string) =>
    links.filter(l => l.document_id === documentId).length;

  /**
   * Opens a stored file through a freshly signed URL.
   *
   * The URL is minted at click time rather than rendered into the page: the
   * bucket is private and the signature is short-lived, so a link created when
   * the list rendered would already be stale by the time it was used.
   */
  const openDocument = async (doc: CareerDocument) => {
    if (!doc.storage_path) return;
    setBusyId(doc.id);
    try {
      const url = await getDownloadUrl(doc.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      addToast('error', 'Could not open', err?.message || 'That file could not be opened.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleDefault = async (doc: CareerDocument) => {
    setBusyId(doc.id);
    try {
      await setDefault(doc.id, doc.doc_type, !doc.is_default);
      addToast(
        'success',
        doc.is_default ? 'Default cleared' : 'Default set',
        doc.is_default
          ? `"${doc.name}" is no longer your default.`
          : `"${doc.name}" will be offered when you add an application.`
      );
    } catch (err: any) {
      addToast('error', 'Could not update', err?.message || 'The default could not be changed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (doc: CareerDocument) => {
    setBusyId(doc.id);
    try {
      await removeDocument(doc);
      addToast('success', 'Document deleted', `"${doc.name}" was removed.`);
      setConfirmingDelete(null);
    } catch (err: any) {
      addToast('error', 'Could not delete', err?.message || 'The document could not be deleted.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div className="documents-page-header">
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-heading)' }}>
            Resumes &amp; Cover Letters Hub
          </h1>
          <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Organize versions of your CV, portfolio links, and tailored cover letters in one central vault.
          </p>
        </div>

        <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={18} /> Add Document
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="card"
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
            borderColor: 'var(--rose-500)',
            backgroundColor: 'var(--meta-danger-bg)',
            color: 'var(--meta-danger-text)'
          }}
        >
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span style={{ fontSize: '0.875rem' }}>{error}</span>
        </div>
      )}

      {/* Type filter. A radio group, not buttons: these are states of one
          setting, so arrow keys move between them. */}
      <div className="document-filters" role="radiogroup" aria-label="Filter documents by type">
        {(['All', ...DOCUMENT_TYPES.map(t => t.value)] as (DocumentType | 'All')[]).map(value => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={filter === value}
            className={`document-filter ${filter === value ? 'is-active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {value === 'All' ? 'All' : documentTypePlural(value)}
            <span className="document-filter-count">{countFor(value)}</span>
          </button>
        ))}
      </div>

      {loading && !loaded ? (
        <div className="document-grid">
          <Skeleton height="150px" borderRadius="var(--radius-lg)" />
          <Skeleton height="150px" borderRadius="var(--radius-lg)" />
          <Skeleton height="150px" borderRadius="var(--radius-lg)" />
        </div>
      ) : visible.length === 0 ? (
        <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center' }}>
          <div className="document-empty-icon" aria-hidden="true">
            <FileText size={28} />
          </div>
          <h2 style={{ fontSize: '1.125rem', color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            {documents.length === 0
              ? 'Your document vault is empty'
              : `No ${documentTypePlural(filter as DocumentType).toLowerCase()} yet`}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 1.25rem auto' }}>
            Upload a resume or cover letter, or add a link to your portfolio. You can attach
            them to applications and mark one of each as your default.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={18} /> Add Document
          </button>
        </div>
      ) : (
        <ul className="document-grid">
          {visible.map(doc => {
            const attached = attachedCount(doc.id);
            const busy = busyId === doc.id;
            return (
              <li key={doc.id} className="card document-card">
                <div className="document-card-head">
                  <DocumentTypeBadge docType={doc.doc_type} />
                  {doc.is_default && (
                    <span className="chip evt-emerald" title="Offered when you add an application">
                      <Star size={11} aria-hidden="true" />
                      <span className="chip-text">Default</span>
                    </span>
                  )}
                </div>

                <h3 className="document-card-name">{doc.name}</h3>

                <p className="document-card-meta">
                  Added {formatUploadDate(doc.created_at)}
                  {attached > 0 && ` · on ${attached} application${attached === 1 ? '' : 's'}`}
                </p>

                <div className="document-card-actions">
                  {isFileDocument(doc.doc_type) ? (
                    <button
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => openDocument(doc)}
                      disabled={busy || !doc.storage_path}
                    >
                      <Download size={14} /> {busy ? 'Opening…' : 'View'}
                    </button>
                  ) : (
                    <a
                      className="btn btn-outline btn-sm"
                      href={doc.external_url ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink size={14} /> Open link
                    </a>
                  )}

                  {isFileDocument(doc.doc_type) && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => toggleDefault(doc)}
                      disabled={busy}
                      aria-pressed={doc.is_default}
                    >
                      <Star size={14} /> {doc.is_default ? 'Unset default' : 'Set as default'}
                    </button>
                  )}

                  {confirmingDelete === doc.id ? (
                    <span className="document-card-confirm">
                      <span>Delete?</span>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(doc)}
                        disabled={busy}
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setConfirmingDelete(null)}
                        disabled={busy}
                      >
                        Keep
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm document-card-delete"
                      onClick={() => setConfirmingDelete(doc.id)}
                      disabled={busy}
                      aria-label={`Delete ${doc.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <DocumentFormModal
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onUpload={uploadFile}
        onSave={async data => {
          await createDocument(data);
          addToast('success', 'Document added', `"${data.name}" is in your vault.`);
        }}
      />
    </div>
  );
};
