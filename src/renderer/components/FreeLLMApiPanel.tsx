import { EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid';
import {
  ArrowPathIcon,
  ArrowTopRightOnSquareIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';

const FRELLMAPI_URL = 'http://localhost:3001';

// ─── Types ──────────────────────────────────────────────────────────────────

interface ApiKeyEntry {
  id: number;
  platform: string;
  label: string | null;
  maskedKey: string;
  baseUrl: string | null;
  status: 'healthy' | 'rate_limited' | 'invalid' | 'error' | 'unknown';
  enabled: boolean;
  createdAt: string;
  lastCheckedAt: string | null;
}

interface HealthEntry {
  keyId: number;
  platform: string;
  label: string | null;
  status: ApiKeyEntry['status'];
  enabled: boolean;
  lastCheckedAt: string | null;
}

interface HealthPlatform {
  platform: string;
  totalKeys: number;
  healthyKeys: number;
  invalidKeys: number;
}

interface HealthSnapshot {
  platforms: HealthPlatform[];
  keys: HealthEntry[];
}

type Tab = 'keys' | 'health' | 'dashboard';

// ─── Helpers ────────────────────────────────────────────────────────────────

const PLATFORM_DISPLAY: Record<string, string> = {
  google: 'Google Gemini',
  groq: 'Groq',
  cerebras: 'Cerebras',
  nvidia: 'NVIDIA',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
  github: 'GitHub',
  cohere: 'Cohere',
  cloudflare: 'Cloudflare',
  zhipu: 'Zhipu (GLM)',
  ollama: 'Ollama',
  kilo: 'Kilo',
  pollinations: 'Pollinations',
  llm7: 'LLM7',
  huggingface: 'HuggingFace',
  opencode: 'OpenCode',
  custom: 'Custom',
};

function platformLabel(p: string): string {
  return PLATFORM_DISPLAY[p] ?? p;
}

function statusColor(s: string): string {
  switch (s) {
    case 'healthy': return 'text-green-500';
    case 'rate_limited': return 'text-yellow-500';
    case 'invalid': return 'text-red-500';
    case 'error': return 'text-red-400';
    default: return 'text-claude-textSecondary dark:text-claude-darkTextSecondary';
  }
}

function statusDot(s: string): string {
  switch (s) {
    case 'healthy': return 'bg-green-500';
    case 'rate_limited': return 'bg-yellow-500';
    case 'invalid': return 'bg-red-500';
    case 'error': return 'bg-red-400';
    default: return 'bg-gray-400';
  }
}

function relativeTime(iso: string | null): string {
  if (!iso) return '—';
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function FreeLLMApiPanel() {
  // Connection
  const [reachable, setReachable] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  // Auth
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Keys
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [keysLoading, setKeysLoading] = useState(false);
  const [keysError, setKeysError] = useState('');

  // Add key form
  const [addPlatform, setAddPlatform] = useState('');
  const [addKey, setAddKey] = useState('');
  const [addLabel, setAddLabel] = useState('');
  const [addBaseUrl, setAddBaseUrl] = useState('');
  const [addModel, setAddModel] = useState('');
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addMode, setAddMode] = useState<'builtin' | 'custom'>('builtin');
  const [showAddKeyText, setShowAddKeyText] = useState(false);

  // Health
  const [health, setHealth] = useState<HealthSnapshot | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  const [healthError, setHealthError] = useState('');
  const [checkingAll, setCheckingAll] = useState(false);
  const [checkingKey, setCheckingKey] = useState<number | null>(null);

  // Tab
  const [tab, setTab] = useState<Tab>('keys');

  // ── Auth helpers ────────────────────────────────────────────────────────

  async function apiFetch(path: string, init?: RequestInit) {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`${FRELLMAPI_URL}${path}`, {
      ...init,
      headers: { ...headers, ...(init?.headers as Record<string, string> ?? {}) },
    });
    if (res.status === 401) {
      setAuthToken(null);
      throw new Error('Session expired');
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as any)?.error?.message ?? `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ── Bootstrap ───────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setChecking(true);
      try {
        const res = await fetch(`${FRELLMAPI_URL}/api/auth/status`, {
          signal: AbortSignal.timeout(3000),
        });
        if (!cancelled) {
          setReachable(res.ok);
          if (res.ok) {
            const body = await res.json();
            setNeedsSetup(body.needsSetup ?? false);
          }
        }
      } catch {
        if (!cancelled) setReachable(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  // Auto-login with known credentials or prompt
  useEffect(() => {
    if (!reachable || authToken) return;
    // Try pre-configured token from env-like source
    const presetToken = (window as any).__FRELLMAPI_TOKEN__;
    if (presetToken) {
      setAuthToken(presetToken);
      return;
    }
  }, [reachable, authToken]);

  // Load keys once authenticated
  useEffect(() => {
    if (!authToken) return;
    loadKeys();
  }, [authToken]);

  async function loadKeys() {
    setKeysLoading(true);
    setKeysError('');
    try {
      const data = await apiFetch('/api/keys');
      setKeys(data);
    } catch (e: any) {
      if (e.message !== 'Session expired') setKeysError(e.message);
    } finally {
      setKeysLoading(false);
    }
  }

  async function loadHealth() {
    setHealthLoading(true);
    setHealthError('');
    try {
      const data = await apiFetch('/api/health');
      setHealth(data);
    } catch (e: any) {
      if (e.message !== 'Session expired') setHealthError(e.message);
    } finally {
      setHealthLoading(false);
    }
  }

  // ── Auth actions ────────────────────────────────────────────────────────

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      const endpoint = needsSetup ? '/api/auth/setup' : '/api/auth/login';
      const res = await fetch(`${FRELLMAPI_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail, password: authPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error((body as any)?.error?.message ?? `HTTP ${res.status}`);
      }
      setAuthToken(body.token);
    } catch (e: any) {
      setAuthError(e.message);
    } finally {
      setAuthLoading(false);
    }
  }

  // ── Key CRUD ────────────────────────────────────────────────────────────

  async function handleAddKey(e: React.FormEvent) {
    e.preventDefault();
    setAddError('');
    setAddSaving(true);
    try {
      if (addMode === 'custom') {
        await apiFetch('/api/keys/custom', {
          method: 'POST',
          body: JSON.stringify({
            baseUrl: addBaseUrl.trim(),
            model: addModel.trim(),
            apiKey: addKey.trim() || undefined,
            displayName: addLabel.trim() || undefined,
          }),
        });
      } else {
        await apiFetch('/api/keys', {
          method: 'POST',
          body: JSON.stringify({
            platform: addPlatform,
            key: addKey.trim() || undefined,
            label: addLabel.trim() || undefined,
          }),
        });
      }
      setAddPlatform('');
      setAddKey('');
      setAddLabel('');
      setAddBaseUrl('');
      setAddModel('');
      setShowAddForm(false);
      await loadKeys();
    } catch (e: any) {
      setAddError(e.message);
    } finally {
      setAddSaving(false);
    }
  }

  async function handleDeleteKey(id: number) {
    try {
      await apiFetch(`/api/keys/${id}`, { method: 'DELETE' });
      await loadKeys();
    } catch { /* ignore */ }
  }

  async function handleToggleKey(id: number, enabled: boolean) {
    try {
      await apiFetch(`/api/keys/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled }),
      });
      await loadKeys();
    } catch { /* ignore */ }
  }

  async function handleCheckAll() {
    setCheckingAll(true);
    try {
      await apiFetch('/api/health/check-all', { method: 'POST' });
      await loadHealth();
      await loadKeys();
    } catch { /* ignore */ }
    finally { setCheckingAll(false); }
  }

  async function handleCheckKey(keyId: number) {
    setCheckingKey(keyId);
    try {
      await apiFetch(`/api/health/check/${keyId}`, { method: 'POST' });
      await loadHealth();
      await loadKeys();
    } catch { /* ignore */ }
    finally { setCheckingKey(null); }
  }

  // ── Render: connection check ────────────────────────────────────────────

  if (checking) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-claude-textSecondary dark:text-claude-darkTextSecondary">
        Checking connection to FreeLLMAPI…
      </div>
    );
  }

  if (reachable === false) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-sm text-claude-textSecondary dark:text-claude-darkTextSecondary">
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

  // ── Render: login form ──────────────────────────────────────────────────

  if (!authToken) {
    return (
      <div className="flex h-full items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl border border-claude-border dark:border-claude-darkBorder bg-claude-surface dark:bg-claude-darkSurface p-6 space-y-4"
        >
          <h3 className="text-sm font-semibold text-claude-text dark:text-claude-darkText text-center">
            {needsSetup ? 'Create FreeLLMAPI Admin Account' : 'Login to FreeLLMAPI'}
          </h3>
          <div>
            <label className="block text-xs font-medium text-claude-text dark:text-claude-darkText mb-1">Email</label>
            <input
              type="email"
              value={authEmail}
              onChange={e => setAuthEmail(e.target.value)}
              required
              className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 text-xs text-claude-text dark:text-claude-darkText focus:border-claude-accent focus:ring-1 focus:ring-claude-accent/30"
              placeholder="admin@local"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-claude-text dark:text-claude-darkText mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                required
                minLength={8}
                className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 pr-10 text-xs text-claude-text dark:text-claude-darkText focus:border-claude-accent focus:ring-1 focus:ring-claude-accent/30"
                placeholder="Min 8 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 inset-y-0 flex items-center text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-claude-accent"
              >
                {showPassword ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {authError && (
            <p className="text-xs text-red-500">{authError}</p>
          )}
          <button
            type="submit"
            disabled={authLoading}
            className="w-full rounded-xl bg-claude-accent hover:bg-claude-accentHover text-white text-xs font-medium py-2 px-4 disabled:opacity-50 transition-colors"
          >
            {authLoading ? 'Logging in…' : needsSetup ? 'Create Account' : 'Login'}
          </button>
          <p className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary text-center">
            FreeLLMAPI dashboard session — stored locally, expires in 30 days
          </p>
        </form>
      </div>
    );
  }

  // ── Render: main panel ──────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-claude-border dark:border-claude-darkBorder px-4 py-2 shrink-0">
        {(['keys', 'health', 'dashboard'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { setTab(t); if (t === 'health' && !health) loadHealth(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              tab === t
                ? 'bg-claude-accent/10 text-claude-accent'
                : 'text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-claude-text dark:hover:text-claude-darkText'
            }`}
          >
            {t === 'keys' ? 'API Keys' : t === 'health' ? 'Health' : 'Dashboard'}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setAuthToken(null)}
          className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-red-500 transition-colors"
        >
          Logout
        </button>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'keys' && <KeysTab />}
        {tab === 'health' && <HealthTab />}
      </div>
    </div>
  );

  // ── Dashboard tab (original iframe) ─────────────────────────────────────

  function DashboardTab() {
    return (
      <iframe
        src={FRELLMAPI_URL}
        title="FreeLLMAPI Dashboard"
        sandbox="allow-forms allow-scripts allow-same-origin allow-popups"
        className="h-full w-full rounded-xl border border-claude-border dark:border-claude-darkBorder bg-white min-h-[500px]"
      />
    );
  }

  // ── Keys tab ────────────────────────────────────────────────────────────

  function KeysTab() {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-claude-text dark:text-claude-darkText">
            API Keys ({keys.length})
          </h3>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="inline-flex items-center gap-1 rounded-lg bg-claude-accent hover:bg-claude-accentHover text-white text-xs font-medium px-3 py-1.5 transition-colors"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Add Key
          </button>
        </div>

        {/* Add form */}
        {showAddForm && (
          <form
            onSubmit={handleAddKey}
            className="rounded-xl border border-claude-border dark:border-claude-darkBorder bg-claude-surface dark:bg-claude-darkSurface p-4 space-y-3"
          >
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAddMode('builtin')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  addMode === 'builtin'
                    ? 'bg-claude-accent/10 text-claude-accent'
                    : 'text-claude-textSecondary dark:text-claude-darkTextSecondary'
                }`}
              >
                Built-in Platform
              </button>
              <button
                type="button"
                onClick={() => setAddMode('custom')}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  addMode === 'custom'
                    ? 'bg-claude-accent/10 text-claude-accent'
                    : 'text-claude-textSecondary dark:text-claude-darkTextSecondary'
                }`}
              >
                Custom Provider
              </button>
            </div>

            {addMode === 'builtin' ? (
              <>
                <div>
                  <label className="block text-[11px] font-medium text-claude-text dark:text-claude-darkText mb-1">Platform</label>
                  <select
                    value={addPlatform}
                    onChange={e => setAddPlatform(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 text-xs text-claude-text dark:text-claude-darkText"
                  >
                    <option value="">Select platform…</option>
                    {Object.entries(PLATFORM_DISPLAY).filter(([k]) => k !== 'custom').map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-claude-text dark:text-claude-darkText mb-1">API Key</label>
                  <div className="relative">
                    <input
                      type={showAddKeyText ? 'text' : 'password'}
                      value={addKey}
                      onChange={e => setAddKey(e.target.value)}
                      className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 pr-10 text-xs text-claude-text dark:text-claude-darkText"
                      placeholder="sk-…"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddKeyText(!showAddKeyText)}
                      className="absolute right-2 inset-y-0 flex items-center text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-claude-accent"
                    >
                      {showAddKeyText ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-claude-text dark:text-claude-darkText mb-1">Base URL</label>
                    <input
                      type="url"
                      value={addBaseUrl}
                      onChange={e => setAddBaseUrl(e.target.value)}
                      required
                      className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 text-xs text-claude-text dark:text-claude-darkText"
                      placeholder="http://127.0.0.1:8001/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-claude-text dark:text-claude-darkText mb-1">Model</label>
                    <input
                      type="text"
                      value={addModel}
                      onChange={e => setAddModel(e.target.value)}
                      required
                      className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 text-xs text-claude-text dark:text-claude-darkText"
                      placeholder="deepseek-v4-pro"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-claude-text dark:text-claude-darkText mb-1">API Key (optional)</label>
                  <div className="relative">
                    <input
                      type={showAddKeyText ? 'text' : 'password'}
                      value={addKey}
                      onChange={e => setAddKey(e.target.value)}
                      className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 pr-10 text-xs text-claude-text dark:text-claude-darkText"
                      placeholder="sk-… (leave empty for keyless)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddKeyText(!showAddKeyText)}
                      className="absolute right-2 inset-y-0 flex items-center text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-claude-accent"
                    >
                      {showAddKeyText ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-[11px] font-medium text-claude-text dark:text-claude-darkText mb-1">Label (optional)</label>
              <input
                type="text"
                value={addLabel}
                onChange={e => setAddLabel(e.target.value)}
                className="block w-full rounded-xl bg-claude-surfaceInset dark:bg-claude-darkSurfaceInset border border-claude-border dark:border-claude-darkBorder px-3 py-2 text-xs text-claude-text dark:text-claude-darkText"
                placeholder="My key"
              />
            </div>

            {addError && <p className="text-xs text-red-500">{addError}</p>}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1.5 text-xs text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-claude-text dark:hover:text-claude-darkText"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addSaving}
                className="rounded-lg bg-claude-accent hover:bg-claude-accentHover text-white text-xs font-medium px-4 py-1.5 disabled:opacity-50 transition-colors"
              >
                {addSaving ? 'Saving…' : 'Save Key'}
              </button>
            </div>
          </form>
        )}

        {/* Key list */}
        {keysLoading ? (
          <div className="text-center text-xs text-claude-textSecondary dark:text-claude-darkTextSecondary py-8">
            Loading…
          </div>
        ) : keysError ? (
          <div className="text-center text-xs text-red-500 py-8">{keysError}</div>
        ) : keys.length === 0 ? (
          <div className="text-center text-xs text-claude-textSecondary dark:text-claude-darkTextSecondary py-8">
            No API keys configured. Click "Add Key" to add one.
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map(k => (
              <div
                key={k.id}
                className="flex items-center gap-3 rounded-xl border border-claude-border dark:border-claude-darkBorder bg-claude-surface dark:bg-claude-darkSurface px-4 py-3"
              >
                {/* Status dot */}
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${statusDot(k.status)}`} title={k.status} />

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-claude-text dark:text-claude-darkText">
                      {k.label || platformLabel(k.platform)}
                    </span>
                    <span className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary">
                      {k.platform}
                    </span>
                    {k.baseUrl && (
                      <span className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary truncate max-w-[200px]">
                        {k.baseUrl}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary font-mono">
                      {k.maskedKey}
                    </span>
                    <span className={`text-[10px] ${statusColor(k.status)}`}>
                      {k.status}
                    </span>
                    <span className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary">
                      checked {relativeTime(k.lastCheckedAt)}
                    </span>
                  </div>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => handleToggleKey(k.id, !k.enabled)}
                  className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                    k.enabled
                      ? 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                      : 'bg-gray-500/10 text-gray-500 hover:bg-gray-500/20'
                  }`}
                >
                  {k.enabled ? 'Enabled' : 'Disabled'}
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDeleteKey(k.id)}
                  className="p-1 text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-red-500 transition-colors"
                  title="Delete key"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Health tab ──────────────────────────────────────────────────────────

  function HealthTab() {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-claude-text dark:text-claude-darkText">Key Health</h3>
          <button
            onClick={handleCheckAll}
            disabled={checkingAll}
            className="inline-flex items-center gap-1 rounded-lg border border-claude-border dark:border-claude-darkBorder px-3 py-1.5 text-xs text-claude-text dark:text-claude-darkText hover:bg-claude-surfaceHover dark:hover:bg-claude-darkSurfaceHover disabled:opacity-50 transition-colors"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${checkingAll ? 'animate-spin' : ''}`} />
            {checkingAll ? 'Checking…' : 'Check All'}
          </button>
        </div>

        {healthLoading ? (
          <div className="text-center text-xs text-claude-textSecondary dark:text-claude-darkTextSecondary py-8">Loading…</div>
        ) : healthError ? (
          <div className="text-center text-xs text-red-500 py-8">{healthError}</div>
        ) : !health ? (
          <div className="text-center text-xs text-claude-textSecondary dark:text-claude-darkTextSecondary py-8">
            Click "Check All" to run a health scan.
          </div>
        ) : (
          <>
            {/* Platform summary */}
            {health.platforms.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {health.platforms.map(p => (
                  <div
                    key={p.platform}
                    className="rounded-xl border border-claude-border dark:border-claude-darkBorder bg-claude-surface dark:bg-claude-darkSurface p-3"
                  >
                    <div className="text-xs font-medium text-claude-text dark:text-claude-darkText">
                      {platformLabel(p.platform)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-green-600 dark:text-green-400">
                        {p.healthyKeys} healthy
                      </span>
                      <span className="text-[10px] text-red-500">
                        {p.invalidKeys} invalid
                      </span>
                      <span className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary">
                        {p.totalKeys} total
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Key list */}
            {health.keys.length > 0 && (
              <div className="space-y-1.5">
                {health.keys.map(k => (
                  <div
                    key={k.keyId}
                    className="flex items-center gap-3 rounded-xl border border-claude-border dark:border-claude-darkBorder bg-claude-surface dark:bg-claude-darkSurface px-3 py-2"
                  >
                    <div className={`h-2 w-2 rounded-full shrink-0 ${statusDot(k.status)}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs text-claude-text dark:text-claude-darkText">
                        {k.label || platformLabel(k.platform)}
                      </span>
                      <span className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary ml-2">
                        {k.platform}
                      </span>
                    </div>
                    <span className={`text-[10px] ${statusColor(k.status)}`}>{k.status}</span>
                    <span className="text-[10px] text-claude-textSecondary dark:text-claude-darkTextSecondary">
                      {relativeTime(k.lastCheckedAt)}
                    </span>
                    <button
                      onClick={() => handleCheckKey(k.keyId)}
                      disabled={checkingKey === k.keyId}
                      className="p-1 text-claude-textSecondary dark:text-claude-darkTextSecondary hover:text-claude-accent disabled:opacity-50"
                      title="Check this key"
                    >
                      <ArrowPathIcon className={`h-3.5 w-3.5 ${checkingKey === k.keyId ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    );
  }
}
