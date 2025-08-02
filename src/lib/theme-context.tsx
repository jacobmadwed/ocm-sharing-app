import { createContext, useContext, createSignal, createEffect, ParentComponent } from 'solid-js';

interface ThemeContextType {
  isDark: () => boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>();

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const ThemeProvider: ParentComponent = (props) => {
  const getInitialTheme = () => {
    const stored = localStorage.getItem('theme');
    if (stored) return stored === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  };

  const [isDark, setIsDark] = createSignal(getInitialTheme());

  createEffect(() => {
    const darkMode = isDark();
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  });

  const toggleTheme = () => {
    setIsDark(!isDark());
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {props.children}
    </ThemeContext.Provider>
  );
};