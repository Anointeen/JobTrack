import React from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { SearchX } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Skeleton } from '../common/Skeleton';
import { ApplicationDetailModal } from './ApplicationDetailModal';
import { useApplications } from '../../context/ApplicationsContext';
import { useApplicationForm } from '../../context/ApplicationFormContext';
import { useToast } from '../../context/ToastContext';

/**
 * Route component for /applications/:id.
 *
 * The detail view stays a modal over the list — that UX already worked well and
 * keeps the list's scroll position and filters — but it now has a real URL, so
 * it is linkable, refresh-safe and closed by the browser Back button.
 *
 * Nothing here weakens ownership: the id is only ever looked up inside the
 * current user's own loaded set, and Supabase RLS remains the authoritative
 * boundary. An id belonging to another user simply is not found.
 */
export const ApplicationDetailRoute: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { getById, loading, loaded, removeApplication, refresh } = useApplications();
  const { openEditForm } = useApplicationForm();
  const { addToast } = useToast();

  // Set while a delete is in flight. The row disappears from the cache as soon
  // as the refresh lands, which would otherwise flash "not found" for a frame
  // before the navigation back to the list happens.
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Returning to the list preserves whatever filters were active.
  const closeToList = () => navigate(`/applications${location.search}`);

  const application = id ? getById(id) : undefined;

  // Still loading: do not claim "not found" before the data has arrived.
  if (!loaded && loading) {
    return (
      <Modal isOpen onClose={closeToList} title="Loading application…" maxWidth="720px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <Skeleton height="28px" width="60%" />
          <Skeleton height="18px" width="40%" />
          <Skeleton height="120px" />
        </div>
      </Modal>
    );
  }

  // Mid-delete: the navigation back to the list is already queued.
  if (!application && isDeleting) return null;

  if (!application) {
    return (
      <Modal isOpen onClose={closeToList} title="Application not found" maxWidth="480px">
        <div style={{ textAlign: 'center', padding: '0.5rem 0 1rem 0' }}>
          <div
            style={{
              width: '56px', height: '56px', borderRadius: '50%',
              backgroundColor: 'var(--bg-subtle)', color: 'var(--text-subtle)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem'
            }}
          >
            <SearchX size={28} />
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-heading)', marginBottom: '0.5rem' }}>
            We couldn't find that application
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            It may have been deleted, or the link may be incorrect. Only applications in your
            own account can be opened here.
          </p>
          <Link to="/applications" className="btn btn-primary">
            Back to Applications
          </Link>
        </div>
      </Modal>
    );
  }

  return (
    <ApplicationDetailModal
      application={application}
      isOpen
      onClose={closeToList}
      onEdit={app => {
        closeToList();
        openEditForm(app);
      }}
      onDelete={async applicationId => {
        setIsDeleting(true);
        try {
          await removeApplication(applicationId);
          addToast('info', 'Application Deleted', 'The job application has been removed.');
          closeToList();
        } catch (err: any) {
          setIsDeleting(false);
          addToast('error', 'Delete Error', err?.message || 'Could not delete application.');
        }
      }}
      onStatusChanged={async updated => {
        await refresh();
        addToast('success', 'Status Updated', `Status changed to ${updated.status}.`);
      }}
    />
  );
};
