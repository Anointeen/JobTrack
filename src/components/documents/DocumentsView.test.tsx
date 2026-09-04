import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { makeDocument, makePortfolioLink } from '../../test/factories';
import type { CareerDocument } from '../../types';

/**
 * Documents screen integration tests.
 *
 * The context is mocked at its boundary — the screen's job is to present the
 * library and route the user's intent, not to fetch or upload. Filtering, the
 * empty states, the default toggle and the delete confirmation all run for
 * real.
 */

const mocks = vi.hoisted(() => ({
  documents: [] as CareerDocument[],
  links: [] as any[],
  loading: false,
  loaded: true,
  error: null as string | null,
  createDocument: vi.fn(),
  uploadFile: vi.fn(),
  setDefault: vi.fn(),
  removeDocument: vi.fn(),
  getDownloadUrl: vi.fn(),
  addToast: vi.fn()
}));

vi.mock('../../context/DocumentsContext', () => ({
  useDocuments: () => ({
    documents: mocks.documents,
    links: mocks.links,
    loading: mocks.loading,
    loaded: mocks.loaded,
    error: mocks.error,
    createDocument: mocks.createDocument,
    uploadFile: mocks.uploadFile,
    setDefault: mocks.setDefault,
    removeDocument: mocks.removeDocument,
    getDownloadUrl: mocks.getDownloadUrl
  })
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ addToast: mocks.addToast })
}));

import { DocumentsView } from './DocumentsView';

const setup = (documents: CareerDocument[] = []) => {
  mocks.documents = documents;
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <DocumentsView />
    </MemoryRouter>
  );
  return { user };
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.documents = [];
  mocks.links = [];
  mocks.loading = false;
  mocks.loaded = true;
  mocks.error = null;
  mocks.createDocument.mockResolvedValue(makeDocument());
  mocks.uploadFile.mockResolvedValue('user-1/uploaded.pdf');
  mocks.setDefault.mockResolvedValue(undefined);
  mocks.removeDocument.mockResolvedValue(undefined);
  mocks.getDownloadUrl.mockResolvedValue('https://signed.test/file.pdf');
  window.open = vi.fn() as any;
});

describe('the hub replaces the placeholder', () => {
  it('renders the real hub, not a coming-soon panel', () => {
    setup();
    expect(screen.getByRole('heading', { name: /resumes & cover letters hub/i })).toBeInTheDocument();
    expect(screen.queryByText(/coming soon/i)).not.toBeInTheDocument();
  });

  it('has a real empty state with a way out of it', () => {
    setup();
    expect(screen.getByText(/your document vault is empty/i)).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /add document/i }).length).toBeGreaterThan(0);
  });

  it('surfaces a load failure instead of an empty vault', () => {
    mocks.error = 'Your documents could not be loaded.';
    setup();
    expect(screen.getByRole('alert')).toHaveTextContent(/could not be loaded/i);
  });
});

describe('listing documents', () => {
  const library = [
    makeDocument({ id: 'r1', name: 'Resume v2', doc_type: 'resume' }),
    makeDocument({ id: 'c1', name: 'Cover letter — Globex', doc_type: 'cover_letter' }),
    makePortfolioLink({ id: 'p1', name: 'My portfolio' })
  ];

  it('shows every document with its type badge', () => {
    setup(library);
    expect(screen.getByText('Resume v2')).toBeInTheDocument();
    expect(screen.getByText('Cover letter — Globex')).toBeInTheDocument();
    expect(screen.getByText('My portfolio')).toBeInTheDocument();
    expect(screen.getByText('Portfolio link')).toBeInTheDocument();
  });

  it('shows the upload date', () => {
    setup([makeDocument({ name: 'Resume v2', created_at: '2026-02-01T00:00:00.000Z' })]);
    expect(screen.getByText(/added .*2026/i)).toBeInTheDocument();
  });

  it('marks the default document', () => {
    setup([makeDocument({ name: 'Resume v2', is_default: true })]);
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('says how many applications a document is attached to', () => {
    mocks.links = [
      { id: 'l1', document_id: 'r1', application_id: 'a1' },
      { id: 'l2', document_id: 'r1', application_id: 'a2' }
    ];
    setup([makeDocument({ id: 'r1', name: 'Resume v2' })]);
    expect(screen.getByText(/on 2 applications/i)).toBeInTheDocument();
  });
});

describe('filtering by type', () => {
  const library = [
    makeDocument({ id: 'r1', name: 'Resume v2', doc_type: 'resume' }),
    makeDocument({ id: 'c1', name: 'Cover letter', doc_type: 'cover_letter' }),
    makePortfolioLink({ id: 'p1', name: 'My portfolio' })
  ];

  it('is a radio group, so the filters are one setting', () => {
    setup(library);
    const group = screen.getByRole('radiogroup', { name: /filter documents by type/i });
    expect(within(group).getAllByRole('radio')).toHaveLength(4);
    expect(screen.getByRole('radio', { name: /^All/ })).toHaveAttribute('aria-checked', 'true');
  });

  it('narrows the list to one type', async () => {
    const { user } = setup(library);
    await user.click(screen.getByRole('radio', { name: /resumes/i }));

    expect(screen.getByText('Resume v2')).toBeInTheDocument();
    expect(screen.queryByText('Cover letter')).not.toBeInTheDocument();
    expect(screen.queryByText('My portfolio')).not.toBeInTheDocument();
  });

  it('counts each type', () => {
    setup(library);
    const all = screen.getByRole('radio', { name: /^All/ });
    expect(all).toHaveTextContent('3');
  });

  it('has a distinct empty state for a filter that matches nothing', async () => {
    const { user } = setup([makeDocument({ doc_type: 'resume' })]);
    await user.click(screen.getByRole('radio', { name: /cover letters/i }));

    expect(screen.getByText(/no cover letters yet/i)).toBeInTheDocument();
  });
});

describe('document actions', () => {
  it('opens a stored file through a freshly signed URL', async () => {
    // The bucket is private, so a URL rendered with the list would be stale by
    // the time it was clicked.
    const { user } = setup([makeDocument({ id: 'r1', name: 'Resume v2', storage_path: 'user-1/a.pdf' })]);

    await user.click(screen.getByRole('button', { name: /view/i }));

    await waitFor(() => expect(mocks.getDownloadUrl).toHaveBeenCalledWith('user-1/a.pdf'));
    expect(window.open).toHaveBeenCalledWith(
      'https://signed.test/file.pdf', '_blank', 'noopener,noreferrer'
    );
  });

  it('links straight out for a portfolio link, with no signing step', () => {
    setup([makePortfolioLink({ name: 'My portfolio', external_url: 'https://example.test/me' })]);

    const link = screen.getByRole('link', { name: /open link/i });
    expect(link).toHaveAttribute('href', 'https://example.test/me');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(mocks.getDownloadUrl).not.toHaveBeenCalled();
  });

  it('toggles the default on', async () => {
    const { user } = setup([makeDocument({ id: 'r1', doc_type: 'resume', is_default: false })]);
    await user.click(screen.getByRole('button', { name: /set as default/i }));

    await waitFor(() => expect(mocks.setDefault).toHaveBeenCalledWith('r1', 'resume', true));
  });

  it('toggles the default off again', async () => {
    const { user } = setup([makeDocument({ id: 'r1', doc_type: 'resume', is_default: true })]);
    await user.click(screen.getByRole('button', { name: /unset default/i }));

    await waitFor(() => expect(mocks.setDefault).toHaveBeenCalledWith('r1', 'resume', false));
  });

  it('offers no default toggle for a portfolio link', () => {
    setup([makePortfolioLink()]);
    expect(screen.queryByRole('button', { name: /set as default/i })).not.toBeInTheDocument();
  });

  it('asks for confirmation before deleting', async () => {
    const doc = makeDocument({ id: 'r1', name: 'Resume v2' });
    const { user } = setup([doc]);

    await user.click(screen.getByRole('button', { name: /delete resume v2/i }));
    expect(mocks.removeDocument).not.toHaveBeenCalled();
    expect(screen.getByText(/delete\?/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^yes$/i }));
    await waitFor(() => expect(mocks.removeDocument).toHaveBeenCalledWith(doc));
  });

  it('lets the user back out of deleting', async () => {
    const { user } = setup([makeDocument({ name: 'Resume v2' })]);

    await user.click(screen.getByRole('button', { name: /delete resume v2/i }));
    await user.click(screen.getByRole('button', { name: /^keep$/i }));

    expect(mocks.removeDocument).not.toHaveBeenCalled();
  });

  it('reports a failed open rather than doing nothing visible', async () => {
    mocks.getDownloadUrl.mockRejectedValue(new Error('Signing failed'));
    const { user } = setup([makeDocument({ storage_path: 'user-1/a.pdf' })]);

    await user.click(screen.getByRole('button', { name: /view/i }));
    await waitFor(() => expect(mocks.addToast).toHaveBeenCalledWith(
      'error', 'Could not open', expect.stringMatching(/signing failed/i)
    ));
  });
});

describe('adding a document', () => {
  it('opens the add form', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);
    expect(await screen.findByRole('heading', { name: /add document/i })).toBeInTheDocument();
  });

  it('uploads the file then saves the row, in that order', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);

    await user.type(await screen.findByLabelText(/^name/i), 'Resume v3');
    const file = new File(['cv'], 'cv.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText(/^file/i), file);
    await user.click(screen.getByRole('button', { name: /save document/i }));

    await waitFor(() => expect(mocks.uploadFile).toHaveBeenCalledWith(file));
    const payload = mocks.createDocument.mock.calls[0][0];
    expect(payload.name).toBe('Resume v3');
    expect(payload.doc_type).toBe('resume');
    expect(payload.storage_path).toBe('user-1/uploaded.pdf');
    expect(payload.external_url).toBeNull();
  });

  it('saves a portfolio link with no upload at all', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);

    await user.selectOptions(await screen.findByLabelText(/^type/i), 'portfolio_link');
    await user.type(screen.getByLabelText(/^name/i), 'My portfolio');
    await user.type(screen.getByLabelText(/^link/i), 'https://example.test/me');
    await user.click(screen.getByRole('button', { name: /save document/i }));

    await waitFor(() => expect(mocks.createDocument).toHaveBeenCalled());
    const payload = mocks.createDocument.mock.calls[0][0];
    expect(payload.doc_type).toBe('portfolio_link');
    expect(payload.external_url).toBe('https://example.test/me');
    expect(payload.storage_path).toBeNull();
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it('swaps the file input for a URL input when the type changes', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);

    expect(await screen.findByLabelText(/^file/i)).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText(/^type/i), 'portfolio_link');

    expect(screen.queryByLabelText(/^file/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^link/i)).toBeInTheDocument();
  });

  it('rejects a document with no name', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);

    // fireEvent.submit, not a click: native  would block the submit
    // before the component's own validation could run.
    const form = (await screen.findByRole('button', { name: /save document/i })).closest('form')!;
    fireEvent.submit(form);

    expect(await screen.findByText(/give this document a name/i)).toBeInTheDocument();
    expect(mocks.createDocument).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);

    await user.type(await screen.findByLabelText(/^name/i), 'Sneaky');
    // user.upload honours the input's , so a rejected extension never
    // reaches component state. fireEvent puts it there directly, which is what
    // exercises the validator rather than the browser filter.
    fireEvent.change(screen.getByLabelText(/^file/i), {
      target: { files: [new File(['x'], 'payload.exe', { type: 'application/octet-stream' })] }
    });
    await user.click(screen.getByRole('button', { name: /save document/i }));

    expect(await screen.findByText(/not supported/i)).toBeInTheDocument();
    expect(mocks.uploadFile).not.toHaveBeenCalled();
  });

  it('rejects a non-http link', async () => {
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);

    await user.selectOptions(await screen.findByLabelText(/^type/i), 'portfolio_link');
    await user.type(screen.getByLabelText(/^name/i), 'Sneaky');
    // type="url" blocks most rubbish, so the form is submitted directly to
    // reach the component's own check.
    const form = screen.getByRole('button', { name: /save document/i }).closest('form')!;
    const input = screen.getByLabelText(/^link/i) as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
    setter.call(input, 'javascript:alert(1)');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    (form as HTMLFormElement).requestSubmit?.();

    expect(await screen.findByText(/must start with http/i)).toBeInTheDocument();
    expect(mocks.createDocument).not.toHaveBeenCalled();
  });

  it('keeps the form open and reports a failed save', async () => {
    mocks.createDocument.mockRejectedValue(new Error('Storage unavailable'));
    const { user } = setup();
    await user.click(screen.getAllByRole('button', { name: /add document/i })[0]);

    await user.type(await screen.findByLabelText(/^name/i), 'Resume v3');
    await user.upload(screen.getByLabelText(/^file/i), new File(['cv'], 'cv.pdf'));
    await user.click(screen.getByRole('button', { name: /save document/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/storage unavailable/i);
  });
});
