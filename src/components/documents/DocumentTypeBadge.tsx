import React from 'react';
import { DocumentType } from '../../types';
import { DOCUMENT_TYPE_LABEL, DOCUMENT_TYPE_TONE } from '../../lib/documents';

interface DocumentTypeBadgeProps {
  docType: DocumentType;
}

/**
 * The badge naming a document's type.
 *
 * Built on the shared `.chip` class, like the priority, tag and event badges,
 * so it inherits the same shape and ellipsis behaviour. The label is always
 * present — colour never carries the meaning on its own.
 */
export const DocumentTypeBadge: React.FC<DocumentTypeBadgeProps> = ({ docType }) => (
  <span className={`chip ${DOCUMENT_TYPE_TONE[docType] ?? 'evt-slate'}`}>
    <span className="chip-text">{DOCUMENT_TYPE_LABEL[docType] ?? 'Document'}</span>
  </span>
);
