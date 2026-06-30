import {
  CheckIcon,
  ChevronDownIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import {
  CoworkAgentEngine,
  ExternalAgentConfigSource,
} from '@shared/cowork/constants';
import React from 'react';
import { useSelector } from 'react-redux';

import { coworkService } from '../../services/cowork';
import { i18nService } from '../../services/i18n';
import type { RootState } from '../../store';
import type {
  CoworkAgentEngine as CoworkAgentEngineType,
  ExternalAgentEnvironmentSnapshot,
  ExternalAgentProviderAppType,
  ExternalAgentProviderListResult,
} from '../../types/cowork';
import ChevronRightIcon from '../icons/ChevronRightIcon';
import ClickInfoPopover from '../ui/ClickInfoPopover';

interface CoworkEngineSelectorProps {
  dropdownDirection?: 'up' | 'down';
  value?: CoworkAgentEngineType;
  readOnly?: boolean;
  readOnlyTitle?: string;
}

const ENGINE_OPTIONS: Array<{
  engine: CoworkAgentEngineType;
  labelKey: string;
  hintKey: string;
}> = [
  {
    engine: CoworkAgentEngine.ClaudeCode,
    labelKey: 'coworkAgentEngineClaudeCode',
    hintKey: 'coworkAgentEngineClaudeCodeHint',
  },
  {
    engine: CoworkAgentEngine.OpenClaw,
    labelKey: 'coworkAgentEngineOpenClaw',
    hintKey: 'coworkAgentEngineOpenClawHint',
  },
  {
    engine: CoworkAgentEngine.Hermes,
    labelKey: 'coworkAgentEngineHermes',
    hintKey: 'coworkAgentEngineHermesHint',
  },
  {
    engine: CoworkAgentEngine.OpenSquilla,
    labelKey: 'coworkAgentEngineOpenSquilla',
    hintKey: 'coworkAgentEngineOpenSquillaHint',
  },
  {
    engine: CoworkAgentEngine.KimiCode,
    labelKey: 'coworkAgentEngineKimiCode',
    hintKey: 'coworkAgentEngineKimiCodeHint',
  },
  {
    engine: CoworkAgentEngine.CodeBuddyCode,
    labelKey: 'coworkAgentEngineCodeBuddyCode',
    hintKey: 'coworkAgentEngineCodeBuddyCodeHint',
  },
  {
    engine: CoworkAgentEngine.YdCowork,
    labelKey: 'coworkAgentEngineClaudeLegacy',
    hintKey: 'coworkAgentEngineClaudeLegacyHint',
  },
  {
    engine: CoworkAgentEngine.Codex,
    labelKey: 'coworkAgentEngineCodex',
    hintKey: 'coworkAgentEngineCodexHint',
  },
  {
    engine: CoworkAgentEngine.CodexApp,
    labelKey: 'coworkAgentEngineCodexApp',
    hintKey: 'coworkAgentEngineCodexAppHint',
  },
  {
    engine: CoworkAgentEngine.OpenCode,
    labelKey: 'coworkAgentEngineOpenCode',
    hintKey: 'coworkAgentEngineOpenCodeHint',
  },
  {
    engine: CoworkAgentEngine.GrokBuild,
    labelKey: 'coworkAgentEngineGrokBuild',
    hintKey: 'coworkAgentEngineGrokBuildHint',
  },
  {
    engine: CoworkAgentEngine.QwenCode,
    labelKey: 'coworkAgentEngineQwenCode',
    hintKey: 'coworkAgentEngineQwenCodeHint',
  },
  {
    engine: CoworkAgentEngine.DeepSeekTui,
    labelKey: 'coworkAgentEngineDeepSeekTui',
    hintKey: 'coworkAgentEngineDeepSeekTuiHint',
  },
  {
    engine: CoworkAgentEngine.CodeBuddyCode,
    labelKey: 'coworkAgentEngineCodeBuddyCode',
    hintKey: 'coworkAgentEngineCodeBuddyCodeHint',
  },
];

const isCliEngine = (engine: CoworkAgentEngineType): boolean => {
  return engine === CoworkAgentEngine.ClaudeCode
    || engine === CoworkAgentEngine.OpenClaw
    || engine === CoworkAgentEngine.Codex
    || engine === CoworkAgentEngine.Hermes
    || engine === CoworkAgentEngine.OpenCode
    || engine === CoworkAgentEngine.GrokBuild
    || engine === CoworkAgentEngine.QwenCode
    || engine === CoworkAgentEngine.DeepSeekTui
    || engine === CoworkAgentEngine.OpenSquilla
    || engine === CoworkAgentEngine.KimiCode
    || engine === CoworkAgentEngine.CodeBuddyCode;
};

type CliEngineStatus = ExternalAgentEnvironmentSnapshot['engines'][number];

const resolveAuthMeta = (status: CliEngineStatus): { labelKey: string; dotClass: string; textClass: string } => {
  switch (status.authStatus) {
    case 'logged_in':
      return {
        labelKey: 'coworkAgentEngineAuthStatusLoggedIn',
        dotClass: 'bg-green-500',
        textClass: 'text-green-600 dark:text-green-400',
      };
    case 'expired':
      return {
        labelKey: 'coworkAgentEngineAuthStatusExpired',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'logged_out':
      return {
        labelKey: 'coworkAgentEngineAuthStatusLoggedOut',
        dotClass: 'bg-amber-500',
        textClass: 'text-amber-600 dark:text-amber-400',
      };
    case 'unconfigured':
      return {
        labelKey: 'coworkAgentEngineAuthStatusUnconfigured',
        dotClass: 'bg-red-500',
        textClass: 'text-red-600 dark:text-red-400',
      };
    case 'unknown':
    default:
      return {
        labelKey: 'coworkAgentEngineAuthStatusUnknown',
        dotClass: 'bg-primary animate-pulse',
        textClass: 'text-primary',
      };
  }
};

const getCliAppTypeForEngine = (engine: CoworkAgentEngineType): ExternalAgentProviderAppType | null => {
  if (engine === CoworkAgentEngine.ClaudeCode) return 'claude';
  if (engine === CoworkAgentEngine.Codex) return 'codex';
  if (engine === CoworkAgentEngine.OpenClaw) return 'openclaw';
  if (engine === CoworkAgentEngine.Hermes) return 'hermes';
  if (engine === CoworkAgentEngine.OpenCode) return 'opencode';
  if (engine === CoworkAgentEngine.GrokBuild) return 'grok';
  if (engine === CoworkAgentEngine.QwenCode) return 'qwen';
  if (engine === CoworkAgentEngine.DeepSeekTui) return 'deepseek_tui';
  if (engine === CoworkAgentEngine.OpenSquilla) return 'opensquilla';
  if (engine === CoworkAgentEngine.KimiCode) return 'kimi';
  if (engine === CoworkAgentEngine.CodeBuddyCode) return 'codebuddy';
  return null;
};

const ALL_CLI_APP_TYPES: ExternalAgentProviderAppType[] = [
  'openclaw',
  'hermes',
  'claude',
  'codex',
  'opencode',
  'grok',
  'qwen',
  'deepseek_tui',
  'opensquilla',
  'kimi',
  'codebuddy',
];

const SUBMENU_VIEWPORT_MARGIN = 12;
const CLAUDE_SOURCE_SUBMENU_ESTIMATED_HEIGHT = 180;

const getSubmenuTop = (
  itemElement: HTMLElement | null | undefined,
  menuElement: HTMLElement | null | undefined,
  submenuElement: HTMLElement | null | undefined,
  estimatedHeight: number,
): number => {
  if (!itemElement || !menuElement) return 0;
  const itemRect = itemElement.getBoundingClientRect();
  const menuRect = menuElement.getBoundingClientRect();
  const rawTop = itemRect.top - menuRect.top;
  const submenuHeight = Math.min(
    submenuElement?.offsetHeight || estimatedHeight,
    window.innerHeight - SUBMENU_VIEWPORT_MARGIN * 2,
  );
  const viewportMaxTop = window.innerHeight - SUBMENU_VIEWPORT_MARGIN - submenuHeight - menuRect.top;
  return Math.max(0, Math.min(rawTop, viewportMaxTop));
};

/**
 * Partial refreshes only include the requested app types. Keep previous engine
 * entries for omitted app types, and let next overwrite matching app types.
 */
const mergeSnapshots = (
  previous: ExternalAgentEnvironmentSnapshot | null,
  next: ExternalAgentEnvironmentSnapshot,
): ExternalAgentEnvironmentSnapshot => {
  if (!previous) return next;
  const enginesByAppType = new Map<ExternalAgentProviderAppType, ExternalAgentEnvironmentSnapshot['engines'][number]>();
  previous.engines.forEach((engine) => enginesByAppType.set(engine.appType, engine));
  next.engines.forEach((engine) => enginesByAppType.set(engine.appType, engine));
  return {
    ...previous,
    ...next,
    engines: ALL_CLI_APP_TYPES
      .map((appType) => enginesByAppType.get(appType))
      .filter((engine): engine is ExternalAgentEnvironmentSnapshot['engines'][number] => Boolean(engine)),
  };
};

const CoworkEngineSelector: React.FC<CoworkEngineSelectorProps> = ({
  dropdownDirection = 'down',
  value,
  readOnly = false,
  readOnlyTitle,
}) => {
  const selectedEngine = useSelector((state: RootState) => state.cowork.config.agentEngine);
  const coworkConfig = useSelector((state: RootState) => state.cowork.config);
  const effectiveEngine = value ?? selectedEngine;
  const [isOpen, setIsOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [pendingEngine, setPendingEngine] = React.useState<CoworkAgentEngineType | null>(null);
  const [switchError, setSwitchError] = React.useState<string | null>(null);
  const [snapshot, setSnapshot] = React.useState<ExternalAgentEnvironmentSnapshot | null>(null);
  const [providerLists, setProviderLists] = React.useState<Partial<Record<ExternalAgentProviderAppType, ExternalAgentProviderListResult>>>({});
  const [hoveredEngine, setHoveredEngine] = React.useState<CoworkAgentEngineType | null>(null);
  const [sourcePanelTop, setSourcePanelTop] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const sourcePanelRef = React.useRef<HTMLDivElement>(null);
  const engineItemRefs = React.useRef<Partial<Record<CoworkAgentEngineType, HTMLDivElement | null>>>({});
  const mountedRef = React.useRef(true);

  const selectedOption = ENGINE_OPTIONS.find((option) => option.engine === effectiveEngine)
    ?? ENGINE_OPTIONS[0];
  const effectiveAppType = React.useMemo(
    () => getCliAppTypeForEngine(effectiveEngine),
    [effectiveEngine],
  );

  const getConfigSourceForEngine = React.useCallback((engine: CoworkAgentEngineType) => {
    if (engine === CoworkAgentEngine.OpenClaw) return coworkConfig.openclawConfigSource;
    if (engine === CoworkAgentEngine.ClaudeCode) return coworkConfig.claudeCodeConfigSource;
    if (engine === CoworkAgentEngine.Codex) return coworkConfig.codexConfigSource;
    if (engine === CoworkAgentEngine.Hermes) return coworkConfig.hermesConfigSource;
    if (engine === CoworkAgentEngine.OpenCode) return coworkConfig.opencodeConfigSource;
    if (engine === CoworkAgentEngine.GrokBuild) return ExternalAgentConfigSource.LocalCli;
    if (engine === CoworkAgentEngine.QwenCode) return coworkConfig.qwenCodeConfigSource;
    if (engine === CoworkAgentEngine.DeepSeekTui) return coworkConfig.deepseekTuiConfigSource;
    if (engine === CoworkAgentEngine.OpenSquilla) return coworkConfig.opensquillaConfigSource;
    if (engine === CoworkAgentEngine.KimiCode) return coworkConfig.kimiCodeConfigSource;
    if (engine === CoworkAgentEngine.CodeBuddyCode) return coworkConfig.codeBuddyCodeConfigSource;
    return ExternalAgentConfigSource.WesightModel;
  }, [coworkConfig]);

  const loadProviderList = React.useCallback(async (appType: ExternalAgentProviderAppType) => {
    const result = await coworkService.listAgentProviders(appType);
    if (!mountedRef.current || !result.success) return;
    setProviderLists((prev) => ({
      ...prev,
      [appType]: result,
    }));
  }, []);

  const refreshLocalProviderLists = React.useCallback(() => {
    const appTypes = ENGINE_OPTIONS
      .filter((option) => getConfigSourceForEngine(option.engine) === ExternalAgentConfigSource.LocalCli)
      .map((option) => getCliAppTypeForEngine(option.engine))
      .filter((appType): appType is ExternalAgentProviderAppType => Boolean(appType));
    Array.from(new Set(appTypes)).forEach((appType) => {
      void loadProviderList(appType);
    });
  }, [getConfigSourceForEngine, loadProviderList]);

  const refreshSnapshot = React.useCallback((options: { forceRefresh?: boolean; appTypes?: ExternalAgentProviderAppType[] } = {}) => {
    const appTypes = options.appTypes ?? (effectiveAppType ? [effectiveAppType] : []);
    if (appTypes.length === 0) {
      setSnapshot(null);
      return Promise.resolve();
    }
    return coworkService.getAgentEngineSnapshot({
      ...options,
      appTypes,
    })
      .then((nextSnapshot) => {
        if (mountedRef.current && nextSnapshot) {
          setSnapshot((previous) => mergeSnapshots(previous, nextSnapshot));
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setSnapshot(null);
        }
      });
  }, [effectiveAppType]);

  React.useEffect(() => {
    mountedRef.current = true;
    void refreshSnapshot();
    const unsubscribe = coworkService.onAgentEnginesChanged((nextSnapshot) => {
      if (mountedRef.current) {
        setSnapshot((previous) => mergeSnapshots(previous, nextSnapshot));
      }
    });

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [refreshSnapshot]);

  React.useEffect(() => {
    if (!isOpen || readOnly) {
      return;
    }
    if (effectiveAppType) {
      void refreshSnapshot({ forceRefresh: true, appTypes: [effectiveAppType] });
    }
    refreshLocalProviderLists();
  }, [effectiveAppType, isOpen, readOnly, refreshLocalProviderLists, refreshSnapshot]);

  React.useEffect(() => {
    if (!effectiveAppType || readOnly) {
      return;
    }
    if (getConfigSourceForEngine(effectiveEngine) === ExternalAgentConfigSource.LocalCli) {
      void loadProviderList(effectiveAppType);
    }
  }, [effectiveAppType, effectiveEngine, getConfigSourceForEngine, loadProviderList, readOnly]);

  React.useEffect(() => {
    const handleProviderChanged = (event: Event) => {
      const appType = (event as CustomEvent<{ appType?: ExternalAgentProviderAppType }>).detail?.appType;
      if (appType) {
        void loadProviderList(appType);
        void refreshSnapshot({ forceRefresh: true, appTypes: [appType] });
      } else {
        refreshLocalProviderLists();
        void refreshSnapshot({ forceRefresh: true, appTypes: ALL_CLI_APP_TYPES });
      }
    };
    window.addEventListener('wesight-agent-provider-changed', handleProviderChanged);
    return () => {
      window.removeEventListener('wesight-agent-provider-changed', handleProviderChanged);
    };
  }, [loadProviderList, refreshLocalProviderLists, refreshSnapshot]);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) {
      setHoveredEngine(null);
      setSourcePanelTop(0);
    }
  }, [isOpen]);

  const dropdownPositionClass = dropdownDirection === 'up'
    ? 'bottom-full mb-1'
    : 'top-full mt-1';

  const selectEngine = async (
    engine: CoworkAgentEngineType,
    configSource?: ExternalAgentConfigSource,
  ) => {
    const nextClaudeCodeConfigSource = engine === CoworkAgentEngine.ClaudeCode
      ? configSource ?? ExternalAgentConfigSource.LocalCli
      : undefined;
    const isSameEngine = engine === selectedEngine;
    const isSameClaudeSource = nextClaudeCodeConfigSource === undefined
      || nextClaudeCodeConfigSource === coworkConfig.claudeCodeConfigSource;
    if (readOnly || isUpdating || (isSameEngine && isSameClaudeSource)) {
      setIsOpen(false);
      return;
    }
    setIsUpdating(true);
    setPendingEngine(engine);
    setSwitchError(null);
    try {
      const ok = await coworkService.updateConfig({
        agentEngine: engine,
        claudeCodeConfigSource: nextClaudeCodeConfigSource,
      });
      if (ok) {
        const appType = getCliAppTypeForEngine(engine);
        if (appType) {
          const nextSnapshot = await coworkService.getAgentEngineSnapshot({
            appTypes: [appType],
          });
          if (nextSnapshot) {
            setSnapshot((previous) => mergeSnapshots(previous, nextSnapshot));
          } else {
            setSnapshot(null);
          }
          if (getConfigSourceForEngine(engine) === ExternalAgentConfigSource.LocalCli) {
            void loadProviderList(appType);
          }
        } else {
          setSnapshot(null);
        }
        setIsOpen(false);
      } else {
        setSwitchError(i18nService.t('coworkAgentEngineSwitchFailed'));
      }
    } finally {
      setIsUpdating(false);
      setPendingEngine(null);
    }
  };

  const getCliStatus = (engine: CoworkAgentEngineType) => {
    return snapshot?.engines.find((item) => item.engine === engine) ?? null;
  };

  const getCurrentProvider = (appType: ExternalAgentProviderAppType) => {
    const list = providerLists[appType];
    const providers = list?.providers ?? [];
    const currentProviderId = list?.currentProviderId;
    if (currentProviderId) {
      return providers.find((provider) => provider.id === currentProviderId) ?? null;
    }
    return providers.find((provider) => provider.isCurrent)
      ?? providers[0]
      ?? null;
  };

  const getConfigSummary = (engine: CoworkAgentEngineType, status: CliEngineStatus | null): string | null => {
    const configSource = getConfigSourceForEngine(engine);
    if (!isCliEngine(engine)) return null;
    if (configSource !== ExternalAgentConfigSource.LocalCli) {
      return i18nService.t('coworkAgentConfigSourceWesightModel');
    }
    const appType = getCliAppTypeForEngine(engine);
    const provider = appType ? getCurrentProvider(appType) : null;
    const providerLabel = provider
      ? [provider.name, provider.summary.model].filter(Boolean).join(' · ')
      : status?.config.currentProviderName
        || status?.config.currentProviderId
        || i18nService.t('coworkAgentLocalModelUnknown');
    return `${i18nService.t('coworkAgentConfigSourceLocalCli')} · ${providerLabel}`;
  };

  const renderStatusPopoverDetail = (
    engine: CoworkAgentEngineType,
    status: CliEngineStatus | null,
    configSummary: string | null,
  ) => {
    if (engine === CoworkAgentEngine.CodexApp) {
      const codexAppStatus = snapshot?.codexApp;
      if (!codexAppStatus) return null;
      const ready = codexAppStatus.cliFound && codexAppStatus.appInstalled && codexAppStatus.appServerSupported;
      return (
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-green-500' : 'bg-amber-500'}`} />
          <span className="truncate">
            {i18nService.t(ready ? 'coworkAgentCodexAppReady' : 'coworkAgentCodexAppMissing')}
            {codexAppStatus.appRunning ? ` · ${i18nService.t('coworkAgentCodexAppRunning')}` : ''}
          </span>
        </div>
      );
    }
    if (!isCliEngine(engine) || !status) return null;
    if (!status.found) {
      return (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span className="truncate">
              {i18nService.t(status.checking ? 'coworkAgentEngineCliChecking' : 'coworkAgentEngineCliMissing')}
            </span>
          </div>
          {configSummary && (
            <div className="text-white/70">
              {configSummary}
            </div>
          )}
        </div>
      );
    }
    const authMeta = resolveAuthMeta(status);
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${authMeta.dotClass}`} />
          <span className="truncate">
            {i18nService.t(authMeta.labelKey)}
            {status.version ? ` · ${status.version}` : ''}
          </span>
        </div>
        {configSummary && (
          <div className="text-white/70">
            {configSummary}
          </div>
        )}
      </div>
    );
  };

  const showClaudeSourcePanel = hoveredEngine === CoworkAgentEngine.ClaudeCode;
  const renderInfoPopoverContent = (label: string, hint: string, detail?: React.ReactNode) => (
    <div className="max-w-xs space-y-1">
      <div className="text-xs font-semibold text-white">{label}</div>
      <div className="text-xs leading-5 text-white/85">{hint}</div>
      {detail && (
        <div className="border-t border-white/15 pt-1 text-[11px] leading-4 text-white/70">
          {detail}
        </div>
      )}
    </div>
  );
  const claudeSourceOptions = [
    {
      value: ExternalAgentConfigSource.LocalCli,
      labelKey: 'coworkAgentConfigSourceClaudeLocalShort',
      hintKey: 'coworkAgentConfigSourceClaudeLocalTooltip',
    },
    {
      value: ExternalAgentConfigSource.WesightModel,
      labelKey: 'coworkAgentConfigSourceWesightShort',
      hintKey: 'coworkAgentConfigSourceClaudeWesightTooltip',
    },
  ] as const;

  React.useEffect(() => {
    if (!showClaudeSourcePanel) return;
    setSourcePanelTop(getSubmenuTop(
      engineItemRefs.current[CoworkAgentEngine.ClaudeCode],
      dropdownRef.current,
      sourcePanelRef.current,
      CLAUDE_SOURCE_SUBMENU_ESTIMATED_HEIGHT,
    ));
  }, [showClaudeSourcePanel]);

  const activateEngineMenu = React.useCallback((engine: CoworkAgentEngineType) => {
    setHoveredEngine(engine);
    if (engine !== CoworkAgentEngine.ClaudeCode) return;
    setSourcePanelTop(getSubmenuTop(
      engineItemRefs.current[engine],
      dropdownRef.current,
      sourcePanelRef.current,
      CLAUDE_SOURCE_SUBMENU_ESTIMATED_HEIGHT,
    ));
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => {
          if (readOnly) return;
          setIsOpen((value) => !value);
        }}
        className={`flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-surface-raised ${isOpen ? 'bg-surface-raised' : ''}`}
        title={readOnlyTitle || i18nService.t('coworkAgentEngineSelect')}
        aria-label={readOnlyTitle || i18nService.t('coworkAgentEngineSelect')}
        disabled={isUpdating || readOnly}
      >
        <CpuChipIcon className="h-4 w-4 text-secondary" />
        <span className="max-w-[120px] truncate font-medium">
          {i18nService.t(selectedOption.labelKey)}
        </span>
        {!readOnly && <ChevronDownIcon className="h-4 w-4 text-secondary" />}
      </button>

      {isOpen && !readOnly && (
        <div
          ref={dropdownRef}
          className={`absolute right-0 ${dropdownPositionClass} z-50 w-60 max-w-[calc(100vw-2rem)] overflow-visible rounded-xl border border-border bg-surface shadow-popover popover-enter`}
          onMouseLeave={() => setHoveredEngine(null)}
        >
          {isUpdating && (
            <div className="border-b border-border px-3.5 py-3">
              <div className="flex items-center justify-between gap-3 text-xs text-secondary">
                <span>{i18nService.t('coworkAgentEngineSwitching')}</span>
                <span className="truncate text-[11px]">
                  {pendingEngine
                    ? i18nService.t(ENGINE_OPTIONS.find((option) => option.engine === pendingEngine)?.labelKey || selectedOption.labelKey)
                    : ''}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-primary/15">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
              </div>
            </div>
          )}
          {switchError && (
            <div className="border-b border-border px-3.5 py-2 text-xs text-red-600 dark:text-red-400">
              {switchError}
            </div>
          )}
          <div className="max-h-[360px] overflow-y-auto py-1">
            {ENGINE_OPTIONS.map((option) => {
                const active = option.engine === selectedEngine;
                const preview = option.engine === hoveredEngine;
                const pending = option.engine === pendingEngine;
                const hasSourceMenu = option.engine === CoworkAgentEngine.ClaudeCode;
                const status = getCliStatus(option.engine);
                const configSummary = status ? getConfigSummary(option.engine, status) : null;
                const statusDetail = renderStatusPopoverDetail(option.engine, status, configSummary);
                const label = i18nService.t(option.labelKey);
                const hint = i18nService.t(option.hintKey);
                return (
                  <div
                    key={option.engine}
                    ref={(element) => {
                      engineItemRefs.current[option.engine] = element;
                    }}
                    role="button"
                    tabIndex={isUpdating ? -1 : 0}
                    aria-disabled={isUpdating}
                    onMouseEnter={() => activateEngineMenu(option.engine)}
                    onFocus={() => activateEngineMenu(option.engine)}
                    onClick={() => {
                      if (!isUpdating) void selectEngine(option.engine);
                    }}
                    onKeyDown={(event) => {
                      if (isUpdating || (event.key !== 'Enter' && event.key !== ' ')) return;
                      event.preventDefault();
                      void selectEngine(option.engine);
                    }}
                    className={`w-full cursor-pointer px-3.5 py-2.5 text-left transition-colors hover:bg-surface-raised ${isUpdating ? 'cursor-wait opacity-60' : ''} ${active || preview ? 'bg-surface-raised/70' : ''}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {label}
                        </div>
                      </div>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <ClickInfoPopover
                          ariaLabel={label}
                          position="left"
                          content={renderInfoPopoverContent(label, hint, statusDetail)}
                        />
                        {pending ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                        ) : (
                          active && <CheckIcon className="h-4 w-4 text-primary" />
                        )}
                        {hasSourceMenu && <ChevronRightIcon className="h-3.5 w-3.5 text-secondary" />}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
          {showClaudeSourcePanel && (
            <div
              ref={sourcePanelRef}
              className="absolute right-full z-50 mr-1 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-popover"
              style={{ top: sourcePanelTop }}
            >
              <div className="border-b border-border px-3 py-2 text-xs font-medium text-secondary">
                {i18nService.t('coworkAgentConfigSourceTitle')}
              </div>
              <div className="space-y-1 p-2">
                {claudeSourceOptions.map((option) => {
                  const active = selectedEngine === CoworkAgentEngine.ClaudeCode
                    && coworkConfig.claudeCodeConfigSource === option.value;
                  const pending = pendingEngine === CoworkAgentEngine.ClaudeCode
                    && option.value !== coworkConfig.claudeCodeConfigSource;
                  const label = i18nService.t(option.labelKey);
                  const hint = i18nService.t(option.hintKey);
                  return (
                    <div
                      key={option.value}
                      role="button"
                      tabIndex={isUpdating ? -1 : 0}
                      aria-disabled={isUpdating}
                      onClick={() => {
                        if (!isUpdating) void selectEngine(CoworkAgentEngine.ClaudeCode, option.value);
                      }}
                      onKeyDown={(event) => {
                        if (isUpdating || (event.key !== 'Enter' && event.key !== ' ')) return;
                        event.preventDefault();
                        void selectEngine(CoworkAgentEngine.ClaudeCode, option.value);
                      }}
                      className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-surface-raised ${isUpdating ? 'cursor-wait opacity-60' : ''} ${active ? 'bg-primary/10 text-primary' : 'text-foreground'}`}
                    >
                      <span className="min-w-0 truncate text-xs font-medium">
                        {label}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        <ClickInfoPopover
                          ariaLabel={label}
                          position="left"
                          content={renderInfoPopoverContent(label, hint)}
                        />
                        {pending ? (
                          <span className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
                        ) : (
                          active && <CheckIcon className="h-4 w-4 shrink-0 text-primary" />
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CoworkEngineSelector;
