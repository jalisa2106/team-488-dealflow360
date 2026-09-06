'use client';
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  success: (msg: string) => void;
  error: (msg: string) => void;
  confirm: (msg: string) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<{ msg: string; resolve: (val: boolean) => void } | null>(null);

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const success = useCallback((msg: string) => addToast(msg, 'success'), [addToast]);
  const error = useCallback((msg: string) => addToast(msg, 'error'), [addToast]);
  const confirm = useCallback((msg: string) => {
    return new Promise<boolean>((resolve) => {
      setConfirmState({ msg, resolve });
    });
  }, []);

  return (
    <ToastContext.Provider value={{ success, error, confirm }}>
      {children}
      {toasts.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 9999
        }}>
          {toasts.map(toast => (
            <div
              key={toast.id}
              style={{
                padding: '12px 20px',
                borderRadius: 8,
                background: toast.type === 'success' ? '#10b981' : '#ef4444',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                fontSize: 14,
                fontWeight: 500,
                minWidth: 200,
                animation: 'slideIn 0.3s ease-out forwards'
              }}
            >
              {toast.message}
            </div>
          ))}
        </div>
      )}
      
      {confirmState && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: 'var(--surface)', padding: 24, borderRadius: 12,
            width: 400, maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 18, color: 'var(--fg)' }}>Confirm Action</h3>
            <p style={{ margin: '0 0 24px', color: 'var(--fg-muted)' }}>{confirmState.msg}</p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => {
                confirmState.resolve(false);
                setConfirmState(null);
              }}>Cancel</button>
              <button className="btn btn-primary" onClick={() => {
                confirmState.resolve(true);
                setConfirmState(null);
              }}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
