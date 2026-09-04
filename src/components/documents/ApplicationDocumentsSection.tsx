import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, FileText, Paperclip, Plus, X } from 'lucide-react';
import { CareerDocument } from '../../types';
import { useDocuments } from '../../context/DocumentsContext';
import { useToast } from '../../context/ToastContext';
import { DocumentTypeBadge } from './DocumentTypeBadge';
import { isFileDocument } from '../../lib/documents';

interface ApplicationDocumentsSectionProps {
  applicationId: string;
}

/**
 * The documents attached to one application, on the detail view.
 *
 * Read *and* manage: the detail view is where a user goes to check what they
 * sent, and being able to see it but not fix it would be a strange place to
 * stop. Attaching here and attaching in the form both go through the same
 * context methods, so the two cannot diverge.
 */
export const ApplicationDocumentsSection: React.FC<ApplicationDocumentsSectionProps> = ({
  applicationId
}) => {
  const {
    documents, documentsFor, attachDocuments, detachDocument, getDownloadUrl
  } = useDocuments();
  const { addToast } = useToast();

  const [adding, setAdding] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const attached = documentsFor(applicationId);
  const attachedIds = new Set(attached.map(d => d.id));
  const available = documents.filter(d => !attachedIds.has(d.id));

  // Minted at click time: the bucket is private and the signature is
  // short-lived, so a URL rendered with the list would already be stale.
  const open = async (doc: CareerDocument) => {
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

  const attach = async (documentId: string) => {
    setBusyId(documentId);
    try {
      await attachDocuments(applicationId, [documentId]);
      setAdding(false);
    } catch (err: any) {
      addToast('error', 'Could not attach', err?.message || 'The document could not be attached.');
    } finally {
      setBusyId(null);
    }
  };

  const detach = async (doc: CareerDocument) => {
    setBusyId(doc.id);
    try {
      await detachDocument(applicationId, doc.id);
    } catch (err: any) {
      addToast('error', 'Could not detach', err?.message || 'The document could not be detached.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section aria-labelledby="application-documents-heading" style={{ marginBottom: '1.75rem' }}>
      <div className="application-documents-head">
        <h3
          id="application-documents-heading"
          style={{ fontSize: '1rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Paperclip size={18} color="var(--primary-text)" />
          Documents
        </h3>

        {available.length > 0 && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setAdding(v => !v)}
            aria-expanded={adding}
          >
            <Plus size={14} /> Attach
          </button>
        )}
      </div>

      {attached.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
          {documents.length === 0 ? (
            <>
              No documents attached. Add a resume or cover letter in the{' '}
              <Link to="/documents" className="event-app-link" style={{ display: 'inline-flex' }}>
                <FileText size={12} aria-hidden="true" />
                <span>document hub</span>
              </Link>{' '}
              to attach it here.
            </>
          ) : (
            'No documents attached to this application yet.'
          )}
        </p>
      ) : (
        <ul className="application-documents-list">
          {attached.map(doc => (
            <li key={doc.id} className="application-document-row">
              <span className="application-document-name">{doc.name}</span>
              <DocumentTypeBadge docType={doc.doc_type} />

              {isFileDocument(doc.doc_type) ? (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => open(doc)}
                  disabled={busyId === doc.id || !doc.storage_path}
                >
                  <Download size={14} /> {busyId === doc.id ? 'Opening…' : 'View'}
                </button>
              ) : (
                <a
                  className="btn btn-ghost btn-sm"
                  href={doc.external_url ?? '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink size={14} /> Open
                </a>
              )}

              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => detach(doc)}
                disabled={busyId === doc.id}
                aria-label={`Detach ${doc.name}`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {adding && available.length > 0 && (
        <div className="application-documents-picker">
          {available.map(doc => (
            <button
              key={doc.id}
              type="button"
              className="application-document-add"
              onClick={() => attach(doc.id)}
              disabled={busyId === doc.id}
            >
              <Plus size={13} aria-hidden="true" />
              <span className="application-document-name">{doc.name}</span>
              <DocumentTypeBadge docType={doc.doc_type} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
