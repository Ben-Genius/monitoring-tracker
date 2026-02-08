import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { Button } from './ui/button';

export default function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();

    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-lg transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? (
                <Moon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
            ) : (
                <Sun className="h-4 w-4 text-slate-400 dark:text-slate-300" />
            )}
        </Button>
    );
}
