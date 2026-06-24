import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import React from 'react';
import { createPortal } from 'react-dom';

interface ClickInfoPopoverProps {
  content: React.ReactNode;
  ariaLabel: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  maxWidth?: number;
  buttonClassName?: string;
}

const ClickInfoPopover: React.FC<ClickInfoPopoverProps> = ({
  content,
  ariaLabel,
  position = 'left',
  maxWidth = 320,
  buttonClassName = '',
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [popoverStyle, setPopoverStyle] = React.useState<React.CSSProperties | null>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const popoverRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = React.useCallback(() => {
    if (!buttonRef.current || !popoverRef.current) return;

    const anchorRect = buttonRef.current.getBoundingClientRect();
    const popoverRect = popoverRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const margin = 8;
    const gap = 8;

    const positions = {
      top: {
        top: anchorRect.top - popoverRect.height - gap,
        left: anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2,
      },
      bottom: {
        top: anchorRect.bottom + gap,
        left: anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2,
      },
      left: {
        top: anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2,
        left: anchorRect.left - popoverRect.width - gap,
      },
      right: {
        top: anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2,
        left: anchorRect.right + gap,
      },
    };

    const fallbackMap: Record<NonNullable<ClickInfoPopoverProps['position']>, Array<NonNullable<ClickInfoPopoverProps['position']>>> = {
      top: ['top', 'bottom', 'left', 'right'],
      bottom: ['bottom', 'top', 'left', 'right'],
      left: ['left', 'right', 'top', 'bottom'],
      right: ['right', 'left', 'top', 'bottom'],
    };
    const fits = (candidate: { top: number; left: number }) =>
      candidate.top >= margin &&
      candidate.left >= margin &&
      candidate.top + popoverRect.height <= viewportHeight - margin &&
      candidate.left + popoverRect.width <= viewportWidth - margin;

    let chosen = positions[position];
    for (const key of fallbackMap[position]) {
      const candidate = positions[key];
      if (fits(candidate)) {
        chosen = candidate;
        break;
      }
    }

    const left = Math.min(
      Math.max(chosen.left, margin),
      viewportWidth - popoverRect.width - margin,
    );
    const top = Math.min(
      Math.max(chosen.top, margin),
      viewportHeight - popoverRect.height - margin,
    );

    setPopoverStyle({
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      maxWidth,
      width: 'max-content',
    });
  }, [maxWidth, position]);

  React.useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
  }, [content, isOpen, updatePosition]);

  React.useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    const handleUpdate = () => updatePosition();

    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate, true);
    };
  }, [isOpen, updatePosition]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        title={ariaLabel}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-secondary transition-colors hover:bg-surface-raised hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 ${buttonClassName}`}
      >
        <QuestionMarkCircleIcon className="h-3.5 w-3.5" />
      </button>
      {isOpen && content && createPortal(
        <div
          ref={popoverRef}
          className="z-[120] rounded-md border border-black/70 bg-zinc-900 px-3 py-2 text-xs leading-5 text-white shadow-2xl"
          style={popoverStyle ?? { maxWidth }}
          onClick={(event) => event.stopPropagation()}
        >
          {content}
        </div>,
        document.body,
      )}
    </>
  );
};

export default ClickInfoPopover;
