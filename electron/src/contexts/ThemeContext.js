import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useEffect, useState } from 'react';
const ThemeContext = createContext(undefined);
export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState('system');
    const [effectiveTheme, setEffectiveTheme] = useState('light');
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
            setThemeState(savedTheme);
        }
    }, []);
    useEffect(() => {
        const updateEffectiveTheme = () => {
            if (theme === 'system') {
                const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                setEffectiveTheme(systemPrefersDark ? 'dark' : 'light');
            }
            else {
                setEffectiveTheme(theme);
            }
        };
        updateEffectiveTheme();
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
            if (theme === 'system') {
                updateEffectiveTheme();
            }
        };
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [theme]);
    useEffect(() => {
        const root = document.documentElement;
        if (effectiveTheme === 'dark') {
            root.classList.add('dark');
        }
        else {
            root.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme, effectiveTheme]);
    const setTheme = (newTheme) => {
        setThemeState(newTheme);
    };
    const toggleTheme = () => {
        setThemeState((current) => {
            if (current === 'system')
                return 'light';
            if (current === 'light')
                return 'dark';
            return 'system';
        });
    };
    const value = {
        theme,
        effectiveTheme,
        setTheme,
        toggleTheme,
    };
    return _jsx(ThemeContext.Provider, { value: value, children: children });
}
export { ThemeContext };
