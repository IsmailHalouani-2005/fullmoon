import { create } from 'zustand';

interface ThemeStore {
    isDarkMode: boolean;
    toggleDarkMode: () => void;
}

export const useThemeStore = create<ThemeStore>((set, get) => ({
    isDarkMode: false,
    toggleDarkMode: () => {
        const next = !get().isDarkMode;
        set({ isDarkMode: next });
        if (typeof window !== 'undefined') {
            localStorage.setItem('theme', next ? 'dark' : 'light');
            // Toggle class on <html> so CSS/body background changes everywhere
            document.documentElement.classList.toggle('dark', next);
        }
    },
}));

// Initialize from localStorage on the client
if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
        useThemeStore.setState({ isDarkMode: false });
    }
}
