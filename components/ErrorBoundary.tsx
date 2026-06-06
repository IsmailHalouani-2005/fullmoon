'use client';

import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        console.error('ErrorBoundary:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#1a1b26] flex flex-col items-center justify-center p-8 text-center font-montserrat">
                    <div className="mb-6 text-6xl select-none">🌕</div>
                    <h1 className="text-[#D1A07A] font-enchanted text-5xl mb-4 tracking-wider">
                        Quelque chose s{"'"}est cassé
                    </h1>
                    <p className="text-slate-400 text-sm mb-2 max-w-md leading-relaxed">
                        Une erreur inattendue s{"'"}est produite. Vos données de partie ne sont pas perdues.
                    </p>
                    {this.state.error && (
                        <p className="text-slate-600 text-xs mb-8 font-mono max-w-md truncate">
                            {this.state.error.message}
                        </p>
                    )}
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/play'; }}
                        className="bg-[#D1A07A] text-dark font-bold px-8 py-3 rounded-xl hover:bg-[#b08465] transition-colors shadow-lg"
                    >
                        Retourner au village
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
