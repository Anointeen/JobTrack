import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { ToastMessage } from '../../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 4500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return <CheckCircle2 size={20} color="var(--emerald-600)" />;
      case 'error': return <AlertCircle size={20} color="var(--rose-600)" />;
      case 'warning': return <AlertTriangle size={20} color="var(--amber-600)" />;
      case 'info': return <Info size={20} color="var(--sky-600)" />;
    }
  };

  return (
    <div className={`toast toast-${toast.type}`}>
      <div style={{ marginTop: '2px', flexShrink: 0 }}>
        {getIcon()}
      </div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-heading)' }}>{toast.title}</h4>
        <p style={{ fontSize: '0.84375rem', color: 'var(--text-muted)', marginTop: '2px' }}>{toast.message}</p>
      </div>
      <button 
        className="btn btn-ghost btn-sm" 
        onClick={() => onDismiss(toast.id)}
        style={{ padding: '2px', alignSelf: 'flex-start' }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
