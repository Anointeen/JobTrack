import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { CareerDocument } from '../../types';
import { DocumentTypeBadge } from './DocumentTypeBadge';

interface DocumentAttachSectionProps {
  documents: CareerDocument[];
  /** Ids currently ticked. */
  selectedIds: string[];
  onToggle: (documentId: string) => void;
  /** Explains where the pre-ticked defaults came from, on a new application. */
  defaultsNote?: string | null;
}

/**
 * The attach-documents control inside the application form.
 *
 * A checkbox list rather than a multi-select: the set is small, every option
 * needs a type badge beside it, and a native multi-select is famously hard to
 * operate. It only *selects* from the existing library — uploading happens on
 * the documents screen, which is one job in one place rather than a second
 * upload path to keep in step.
 */
export const DocumentAttachSection: React.FC<DocumentAttachSectionProps> = ({
  documents,
  selectedIds,
  onToggle,
  defaultsNote
}) => (
  <fieldset className="event-link-fieldset">
    <legend className="form-label">
      Documents <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Optional)</span>
    </legend>

    {documents.length === 0 ? (
      <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
        You have no documents yet.{' '}
        <Link to="/documents" className="event-app-link" style={{ display: 'inline-flex' }}>
          <FileText size={12} aria-hidden="true" />
          <span>Add a resume or cover letter</span>
        </Link>{' '}
        and it will be available here.
      </p>
    ) : (
      <>
        <div className="document-attach-list">
          {documents.map(doc => (
            <label key={doc.id} className="document-attach-option" htmlFor={`attach-${doc.id}`}>
              <input
                id={`attach-${doc.id}`}
                type="checkbox"
                checked={selectedIds.includes(doc.id)}
                onChange={() => onToggle(doc.id)}
              />
              <span className="document-attach-name">{doc.name}</span>
              <DocumentTypeBadge docType={doc.doc_type} />
            </label>
          ))}
        </div>

        {defaultsNote && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-subtle)' }}>{defaultsNote}</span>
        )}
      </>
    )}
  </fieldset>
);
