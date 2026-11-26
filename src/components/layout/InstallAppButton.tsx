import { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import { toast } from 'react-hot-toast';

/** Chrome and Edge's install event; not in the DOM typings. */
interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type NavigatorWithInstall = Navigator & { install?: () => Promise<void> };

const supportsWebInstall = typeof (Navigator.prototype as NavigatorWithInstall).install === 'function';

/**
 * "Install app" in the sidebar. Shown only when the browser can actually
 * install (navigator.install, or Chrome/Edge's beforeinstallprompt), and
 * never once the app is already running installed. Elsewhere, people can
 * still use their browser's own "Add to Home Screen".
 */
export default function InstallAppButton() {
    const deferred = useRef<BeforeInstallPromptEvent | null>(null);
    const [available, setAvailable] = useState(supportsWebInstall);
    const [busy, setBusy] = useState(false);
    const installed = typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches;

    useEffect(() => {
        const onPrompt = (e: Event) => {
            e.preventDefault();
            deferred.current = e as BeforeInstallPromptEvent;
            setAvailable(true);
        };
        const onInstalled = () => { deferred.current = null; setAvailable(false); };
        window.addEventListener('beforeinstallprompt', onPrompt);
        window.addEventListener('appinstalled', onInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', onPrompt);
            window.removeEventListener('appinstalled', onInstalled);
        };
    }, []);

    if (installed || !available) return null;

    const install = async () => {
        if (busy) return;
        setBusy(true);
        try {
            if (supportsWebInstall) {
                // Called straight from the click so the browser sees the user's gesture.
                await (navigator as NavigatorWithInstall).install!();
                setAvailable(false);
            } else if (deferred.current) {
                // The event works once: take it before awaiting the choice.
                const promptEvent = deferred.current;
                deferred.current = null;
                await promptEvent.prompt();
                const { outcome } = await promptEvent.userChoice;
                if (outcome === 'accepted') toast.success('Commit is installed.');
                if (!deferred.current) setAvailable(false);
            }
        } catch (err) {
            if ((err as Error).name !== 'AbortError') toast.error('Couldn’t start the install. Use your browser’s menu instead.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            onClick={install}
            aria-disabled={busy}
            className="mx-2.5 mb-2 flex h-9 items-center gap-2.5 rounded-[8px] px-2.5 text-[14px] font-medium text-white/80 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white/60"
        >
            <Download className="h-4 w-4" aria-hidden />
            Install app
        </button>
    );
}
