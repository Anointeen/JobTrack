import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastMessage } from '../types';
import { ToastContainer } from '../components/common/Toast';

interface ToastContextType {
  addToast: (type: ToastMessage['type'], title: string, message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * Owns toast state and renders the container.
 *
 * Toasts previously lived in AppLayout and were handed down through a render
 * prop. Routed pages are rendered by an <Outlet />, so they cannot receive
 * props from the layout — a context keeps every screen able to raise a toast
 * without threading callbacks through the router.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback(
    (type: ToastMessage['type'], title: string, message: string) => {
      const newToast: ToastMessage = {
        id: 'toast-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        type,
        title,
        message
      };
      setToasts(prev => [...prev, newToast]);
    },
    []
  );

  // Stable identity: ToastItem keys an auto-dismiss effect on this callback.
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
