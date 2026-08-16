import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  /** Retained for the development-only details block. */
  error: Error | null;
}

/**
 * Catches unexpected rendering errors so a crash shows a recovery screen
 * instead of a blank page.
 *
 * Deliberately a class component: `getDerivedStateFromError` and
 * `componentDidCatch` have no hook equivalent.
 *
 * Styling uses the CSS custom properties directly rather than ThemeContext.
 * The theme is applied as `data-theme` on <html> by the anti-flash script in
 * index.html, so the tokens resolve even when the React tree — including the
 * theme provider — is the thing that failed.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Kept to the console: there is no error-reporting service wired up, and
    // inventing one would be out of scope.
    console.error('Unhandled rendering error:', error, info.componentStack);
  }

  /** Clears the error and re-renders — enough for a transient failure. */
  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.assign('/');
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    // Stack traces and messages can leak implementation detail, so they are
    // shown only in development. Production gets the recovery actions alone.
    const showDetails = import.meta.env.DEV && this.state.error;

    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-app, #f8fafc)',
          color: 'var(--text-main, #0f172a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
          fontFamily: 'var(--font-sans, system-ui, sans-serif)'
        }}
      >
        <div style={{ maxWidth: '520px', width: '100%', textAlign: 'center' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              backgroundColor: 'var(--rose-50, #fff1f2)',
              color: 'var(--rose-600, #e11d48)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
              fontSize: '1.75rem'
            }}
            aria-hidden="true"
          >
            !
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 800,
              color: 'var(--text-heading, #0f172a)',
              marginBottom: '0.5rem'
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              fontSize: '0.9375rem',
              color: 'var(--text-muted, #64748b)',
              lineHeight: 1.6,
              marginBottom: '1.75rem'
            }}
          >
            JobTrack hit an unexpected problem while displaying this page. Your saved
            applications are unaffected — nothing has been lost.
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={this.handleRetry}>
              Try again
            </button>
            <button type="button" className="btn btn-secondary btn-lg" onClick={this.handleReload}>
              Reload JobTrack
            </button>
          </div>

          {showDetails && (
            <details
              style={{
                marginTop: '2rem',
                textAlign: 'left',
                backgroundColor: 'var(--bg-subtle, #f8fafc)',
                border: '1px solid var(--border-color, #e2e8f0)',
                borderRadius: 'var(--radius-md, 10px)',
                padding: '0.875rem 1rem'
              }}
            >
              <summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
                Error details (development only)
              </summary>
              <pre
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  color: 'var(--text-muted, #64748b)',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'break-word'
                }}
              >
                {this.state.error?.stack || this.state.error?.message}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}
