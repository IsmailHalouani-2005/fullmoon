'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    success: (msg: string) => void;
    error:   (msg: string) => void;
    info:    (msg: string) => void;
    warning: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue>({
    success: () => {}, error: () => {}, info: () => {}, warning: () => {},
});

let _id = 0;

const STYLES: Record<ToastType, string> = {
    success: 'border-green-500  bg-green-950  text-green-100',
    error:   'border-red-500    bg-red-950    text-red-100',
    warning: 'border-orange-400 bg-orange-950 text-orange-100',
    info:    'border-[#D1A07A]  bg-[#1a1612]  text-[#D1A07A]',
};

const ICONS: Record<ToastType, string> = {
    success: '✓', error: '✕', warning: '⚠', info: 'ℹ',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const add = useCallback((message: string, type: ToastType) => {
        const id = ++_id;
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
    }, []);

    const success = useCallback((msg: string) => add(msg, 'success'), [add]);
    const error   = useCallback((msg: string) => add(msg, 'error'),   [add]);
    const info    = useCallback((msg: string) => add(msg, 'info'),    [add]);
    const warning = useCallback((msg: string) => add(msg, 'warning'), [add]);

    return (
        <ToastContext.Provider value={{ success, error, info, warning }}>
            {children}

            {/* Rendu des toasts — coin inférieur droit, au-dessus de tout */}
            <div className="fixed bottom-6 right-6 z-[99999] flex flex-col gap-2 pointer-events-none font-montserrat">
                {toasts.map(t => (
                    <div
                        key={t.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl text-sm font-semibold max-w-xs backdrop-blur-sm ${STYLES[t.type]}`}
                        style={{ animation: 'toast-in 0.25s ease-out' }}
                    >
                        <span className="text-base font-bold flex-shrink-0">{ICONS[t.type]}</span>
                        <span className="leading-snug">{t.message}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);
