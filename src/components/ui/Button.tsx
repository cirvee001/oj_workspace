import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon, type IconName } from './Icon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'link';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading icon, by name or as a node. */
  leftIcon?: IconName | ReactNode;
  rightIcon?: IconName | ReactNode;
  fullWidth?: boolean;
}

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-ctl font-medium whitespace-nowrap select-none ' +
  'transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent shadow-[inset_0_-1px_0_rgb(0_0_0/0.15)] hover:bg-accent-hover',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-hover',
  ghost: 'bg-transparent text-text-secondary hover:bg-surface-hover hover:text-text',
  danger: 'bg-danger-600 text-white hover:bg-danger-700',
  link: 'h-auto! px-0! bg-transparent text-accent hover:text-accent-hover hover:underline underline-offset-4 decoration-2',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-body-13',
  md: 'h-10 px-4 text-body-14',
  lg: 'h-11 px-5 text-body-15',
};

const ICON_SIZE: Record<ButtonSize, number> = { sm: 14, md: 16, lg: 17 };

function renderIcon(icon: IconName | ReactNode, size: number) {
  return typeof icon === 'string' ? <Icon name={icon as IconName} size={size} /> : icon;
}

export function Button({
  variant = 'primary',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {leftIcon && renderIcon(leftIcon, ICON_SIZE[size])}
      {children}
      {rightIcon && renderIcon(rightIcon, ICON_SIZE[size])}
    </button>
  );
}

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: IconName;
  /** Accessible name; also the tooltip. */
  label: string;
  size?: 'sm' | 'md';
  /** `surface` floats on the canvas with a card shadow; `ghost` sits inside a card; `primary` is a solid accent action. */
  variant?: 'surface' | 'ghost' | 'primary';
  /** Small count bubble in the corner. */
  count?: number;
}

/** Round icon-only button. */
export function IconButton({ icon, label, size = 'md', variant = 'ghost', count, className, type = 'button', ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={count ? `${label} (${count})` : label}
      title={label}
      className={cn(
        'relative grid shrink-0 place-items-center rounded-ctl text-text-secondary transition-colors hover:text-text',
        size === 'sm' ? 'size-8' : 'size-10',
        variant === 'surface' && 'border border-border bg-surface hover:border-border-strong',
        variant === 'ghost' && 'hover:bg-surface-hover',
        variant === 'primary' && 'bg-accent text-on-accent hover:bg-accent-hover hover:text-on-accent',
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size === 'sm' ? 16 : 18} />
      {!!count && (
        <span className="absolute -top-0.5 -right-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-accent px-1 text-[10px] leading-none font-semibold text-on-accent ring-2 ring-canvas">
          {count}
        </span>
      )}
    </button>
  );
}
