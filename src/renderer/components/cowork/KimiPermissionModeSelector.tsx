import {
  CheckIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import {
  KimiCodePermissionMode,
  type KimiCodePermissionMode as KimiCodePermissionModeType,
} from '@shared/cowork/constants';
import React from 'react';
import { useSelector } from 'react-redux';

import { coworkService } from '../../services/cowork';
import { i18nService } from '../../services/i18n';
import type { RootState } from '../../store';
import ClickInfoPopover from '../ui/ClickInfoPopover';

interface KimiPermissionModeSelectorProps {
  dropdownDirection?: 'up' | 'down';
  disabled?: boolean;
}

const OPTIONS: Array<{
  value: KimiCodePermissionModeType;
  labelKey: string;
  hintKey: string;
}> = [
  {
    value: KimiCodePermissionMode.Auto,
    labelKey: 'coworkAgentKimiCodePermissionAuto',
    hintKey: 'coworkAgentKimiCodePermissionAutoHint',
  },
  {
    value: KimiCodePermissionMode.Yolo,
    labelKey: 'coworkAgentKimiCodePermissionYolo',
    hintKey: 'coworkAgentKimiCodePermissionYoloHint',
  },
  {
    value: KimiCodePermissionMode.Plan,
    labelKey: 'coworkAgentKimiCodePermissionPlan',
    hintKey: 'coworkAgentKimiCodePermissionPlanHint',
  },
];

const KimiPermissionModeSelector: React.FC<KimiPermissionModeSelectorProps> = ({
  dropdownDirection = 'up',
  disabled = false,
}) => {
  const selectedMode = useSelector((state: RootState) => state.cowork.config.kimiCodePermissionMode)
    ?? KimiCodePermissionMode.Auto;
  const [isOpen, setIsOpen] = React.useState(false);
  const [isUpdating, setIsUpdating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const selectedOption = OPTIONS.find((option) => option.value === selectedMode) ?? OPTIONS[0];
  const dropdownPositionClass = dropdownDirection === 'up'
    ? 'bottom-full mb-1'
    : 'top-full mt-1';

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

  const selectMode = async (mode: KimiCodePermissionModeType) => {
    if (disabled || isUpdating || mode === selectedMode) {
      setIsOpen(false);
      return;
    }
    setIsUpdating(true);
    setError(null);
    try {
      const ok = await coworkService.updateConfig({ kimiCodePermissionMode: mode });
      if (ok) {
        setIsOpen(false);
      } else {
        setError(i18nService.t('coworkAgentKimiCodePermissionUpdateFailed'));
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((value) => !value)}
        disabled={disabled || isUpdating}
        className={`flex h-8 items-center gap-2 rounded-lg px-2.5 text-sm text-foreground transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-60 ${isOpen ? 'bg-surface-raised' : ''}`}
        title={i18nService.t('coworkAgentKimiCodePermissionTitle')}
        aria-label={i18nService.t('coworkAgentKimiCodePermissionTitle')}
      >
        <ShieldCheckIcon className="h-4 w-4 text-secondary" />
        <span className="max-w-[64px] truncate font-medium">
          {i18nService.t(selectedOption.labelKey)}
        </span>
        <ChevronDownIcon className="h-4 w-4 text-secondary" />
      </button>

      {isOpen && (
        <div className={`absolute right-0 ${dropdownPositionClass} z-50 w-52 overflow-hidden rounded-xl border border-border bg-surface shadow-popover popover-enter`}>
          <div className="border-b border-border px-3.5 py-2.5">
            <div className="text-xs font-medium text-foreground">
              {i18nService.t('coworkAgentKimiCodePermissionTitle')}
            </div>
          </div>
          {error && (
            <div className="border-b border-border px-3.5 py-2 text-xs text-red-600 dark:text-red-400">
              {error}
            </div>
          )}
          <div className="py-1">
            {OPTIONS.map((option) => {
              const active = option.value === selectedMode;
              const label = i18nService.t(option.labelKey);
              const hint = i18nService.t(option.hintKey);
              return (
                <div
                  key={option.value}
                  role="button"
                  tabIndex={isUpdating ? -1 : 0}
                  aria-disabled={isUpdating}
                  onClick={() => {
                    if (!isUpdating) void selectMode(option.value);
                  }}
                  onKeyDown={(event) => {
                    if (isUpdating || (event.key !== 'Enter' && event.key !== ' ')) return;
                    event.preventDefault();
                    void selectMode(option.value);
                  }}
                  className={`flex w-full cursor-pointer items-center justify-between gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface-raised ${isUpdating ? 'cursor-wait opacity-60' : ''} ${active ? 'bg-surface-raised/70' : ''}`}
                >
                  <span className="min-w-0 truncate text-sm font-medium text-foreground">
                    {label}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    <ClickInfoPopover
                      ariaLabel={label}
                      position="left"
                      content={(
                        <div className="max-w-xs space-y-1">
                          <div className="text-xs font-semibold text-white">{label}</div>
                          <div className="text-xs leading-5 text-white/85">{hint}</div>
                        </div>
                      )}
                    />
                    {active && <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default KimiPermissionModeSelector;
