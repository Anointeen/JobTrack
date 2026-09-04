import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  ApplicationDocumentLink,
  CareerDocument,
  CareerDocumentInput,
  DocumentType
} from '../types';
import { dataService } from '../lib/dataService';
import { useAuth } from './AuthContext';

interface DocumentsContextType {
  documents: CareerDocument[];
  /** Every application→document link this user owns. */
  links: ApplicationDocumentLink[];
  loading: boolean;
  error: string | null;
  loaded: boolean;
  refresh: () => Promise<void>;

  createDocument: (data: CareerDocumentInput) => Promise<CareerDocument>;
  uploadFile: (file: File) => Promise<string>;
  setDefault: (id: string, docType: DocumentType, isDefault: boolean) => Promise<void>;
  removeDocument: (doc: CareerDocument) => Promise<void>;
  /** A short-lived signed URL for a stored file. */
  getDownloadUrl: (storagePath: string) => Promise<string>;

  attachDocuments: (applicationId: string, documentIds: string[]) => Promise<void>;
  detachDocument: (applicationId: string, documentId: string) => Promise<void>;
  /** The documents attached to one application, in library order. */
  documentsFor: (applicationId: string) => CareerDocument[];
  /** The user's default document of a type, if they have set one. */
  defaultFor: (docType: DocumentType) => CareerDocument | undefined;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

/**
 * Single source of truth for the signed-in user's document library and the
 * links between documents and applications.
 *
 * Shaped like ApplicationsProvider and CalendarProvider. The /documents screen,
 * the application form's attach section and the application detail view all
 * read the same two lists, so holding them once keeps those views consistent
 * and means moving between them issues no extra requests.
 *
 * Where this sits in ProtectedLayout matters: ApplicationFormModal consumes it,
 * and that modal is rendered *by* ApplicationFormProvider, so this provider has
 * to be an ancestor of that one. Getting that relationship backwards is what
 * silently broke the calendar prompt.
 *
 * Every read is scoped to the authenticated user id and additionally enforced
 * server-side by RLS — this cache is a convenience, never a security boundary.
 */
export const DocumentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, needsOnboarding } = useAuth();

  const [documents, setDocuments] = useState<CareerDocument[]>([]);
  const [links, setLinks] = useState<ApplicationDocumentLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Both lists together: the detail view needs the links to know what is
      // attached and the documents to render them, and a partial load would
      // show an attachment with no name.
      const [docs, docLinks] = await Promise.all([
        dataService.getDocuments(user.id),
        dataService.getApplicationDocuments(user.id)
      ]);
      setDocuments(docs);
      setLinks(docLinks);
      setLoaded(true);
    } catch (err: any) {
      console.error('Error fetching documents:', err);
      setError(err?.message || 'Your documents could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !needsOnboarding) {
      void refresh();
    }
    if (!user) {
      // Clear on sign-out so a different account never sees stale rows.
      setDocuments([]);
      setLinks([]);
      setLoaded(false);
      setError(null);
    }
  }, [user, needsOnboarding, refresh]);

  const uploadFile = useCallback(
    async (file: File) => {
      if (!user) throw new Error('You must be signed in to upload a document.');
      return dataService.uploadDocumentFile(user.id, file);
    },
    [user]
  );

  const createDocument = useCallback(
    async (data: CareerDocumentInput) => {
      if (!user) throw new Error('You must be signed in to add a document.');
      const created = await dataService.createDocument(user.id, data);
      await refresh();
      return created;
    },
    [user, refresh]
  );

  const setDefault = useCallback(
    async (id: string, docType: DocumentType, isDefault: boolean) => {
      if (!user) throw new Error('You must be signed in to change your default.');
      await dataService.setDefaultDocument(user.id, id, docType, isDefault);
      await refresh();
    },
    [user, refresh]
  );

  const removeDocument = useCallback(
    async (doc: CareerDocument) => {
      if (!user) throw new Error('You must be signed in to delete a document.');
      await dataService.deleteDocument(user.id, doc);
      await refresh();
    },
    [user, refresh]
  );

  const getDownloadUrl = useCallback(
    async (storagePath: string) => dataService.getDocumentUrl(storagePath),
    []
  );

  const attachDocuments = useCallback(
    async (applicationId: string, documentIds: string[]) => {
      if (!user) throw new Error('You must be signed in to attach a document.');
      await dataService.attachDocuments(user.id, applicationId, documentIds);
      await refresh();
    },
    [user, refresh]
  );

  const detachDocument = useCallback(
    async (applicationId: string, documentId: string) => {
      if (!user) throw new Error('You must be signed in to detach a document.');
      await dataService.detachDocument(user.id, applicationId, documentId);
      await refresh();
    },
    [user, refresh]
  );

  const documentsFor = useCallback(
    (applicationId: string) => {
      const attached = new Set(
        links.filter(l => l.application_id === applicationId).map(l => l.document_id)
      );
      return documents.filter(d => attached.has(d.id));
    },
    [documents, links]
  );

  const defaultFor = useCallback(
    (docType: DocumentType) => documents.find(d => d.doc_type === docType && d.is_default),
    [documents]
  );

  return (
    <DocumentsContext.Provider
      value={{
        documents,
        links,
        loading,
        loaded,
        error,
        refresh,
        createDocument,
        uploadFile,
        setDefault,
        removeDocument,
        getDownloadUrl,
        attachDocuments,
        detachDocument,
        documentsFor,
        defaultFor
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentsContext);
  if (!context) {
    throw new Error('useDocuments must be used within a DocumentsProvider');
  }
  return context;
};
