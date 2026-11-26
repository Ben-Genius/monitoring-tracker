import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * A strip at the top of the app while the device has no connection. Site
 * teams often lose signal; without this, saves just fail with a generic error.
 */
export default function OfflineNotice() {
    const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

    useEffect(() => {
        const update = () => setOffline(!navigator.onLine);
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
        return () => {
            window.removeEventListener('online', update);
            window.removeEventListener('offline', update);
        };
    }, []);

    return (
        <div role="status" aria-live="polite">
            {offline && (
                <p className="flex items-center justify-center gap-2 bg-ink px-4 py-2 text-[13px] font-medium text-white dark:bg-slate-800">
                    <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
                    You’re offline. Anything you change won’t save until you reconnect.
                </p>
            )}
        </div>
    );
}
