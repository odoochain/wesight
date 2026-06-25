import { useEffect, useState } from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const FRELLMAPI_URL = 'http://localhost:3001';

export default function FreeLLMApiPanel() {
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setChecking(true);
      try {
        const res = await fetch(`${FRELLMAPI_URL}/api/auth/status`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!cancelled) setReachable(res.ok);
      } catch {
        if (!cancelled) setReachable(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-secondary">
        Checking connection to FreeLLMAPI…
      </div>
    );
  }

  if (reachable === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-secondary">
        <p>FreeLLMAPI is not running.</p>
        <p className="text-xs">Start the chain first, then try again.</p>
        <button
          onClick={() => window.electron?.shell?.openExternal(FRELLMAPI_URL)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-raised px-3 py-2 text-xs text-foreground hover:bg-surface-hover transition-colors"
        >
          Open in browser <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <iframe
      src={FRELLMAPI_URL}
      title="FreeLLMAPI Dashboard"
      sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
      className="h-full w-full rounded-xl border border-border bg-white"
    />
  );
}
