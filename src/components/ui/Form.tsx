import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/cn';

/* The focus halo is drawn on the shell, not the bare input inside it. */
const SHELL =
  'flex h-10 w-full min-w-0 items-center gap-2 rounded-ctl border border-border-strong bg-surface px-3.5 text-body-14 ' +
  'transition-[border-color,box-shadow] hover:border-border-interactive focus-within:border-accent focus-within:ring-4 focus-within:ring-accent-subtle ' +
  'has-[:disabled]:cursor-not-allowed has-[:disabled]:bg-surface-sunken';
const FIELD = 'w-full min-w-0 bg-transparent text-text outline-none placeholder:text-text-muted focus-visible:outline-none disabled:cursor-not-allowed';

/** Responsive form grid: two columns on wide screens. */
export function FormGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2', className)}>{children}</div>;
}

interface FieldProps {
  label: ReactNode;
  /** Helper text under the control. */
  hint?: ReactNode;
  optional?: boolean;
  /** Span both columns of a FormGrid. */
  full?: boolean;
  children: ReactNode;
  className?: string;
}

/** Label + control + hint. Wires the label's `htmlFor` to the single child control. */
export function Field({ label, hint, optional, full, children, className }: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const only = Children.count(children) === 1 ? Children.only(children) : null;
  const control =
    only && isValidElement(only)
      ? cloneElement(only as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
          id: (only.props as { id?: string }).id ?? id,
          'aria-describedby': hint ? hintId : undefined,
        })
      : children;
  const forId = only && isValidElement(only) ? ((only.props as { id?: string }).id ?? id) : undefined;
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', full && 'sm:col-span-2', className)}>
      <label htmlFor={forId} className="text-body-13 font-medium text-text-label">
        {label}
        {optional && <span className="ml-1 font-normal text-text-muted">(optional)</span>}
      </label>
      {control}
      {hint && (
        <p id={hintId} className="text-body-12 text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
}

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  /** Static text on the leading edge: "₦". */
  prefix?: ReactNode;
  suffix?: ReactNode;
  leftIcon?: ReactNode;
  invalid?: boolean;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { prefix, suffix, leftIcon, invalid, className, containerClassName, ...rest },
  ref,
) {
  return (
    <div className={cn(SHELL, invalid && 'border-danger-500', containerClassName)}>
      {leftIcon && <span className="shrink-0 text-text-muted">{leftIcon}</span>}
      {prefix && <span className="shrink-0 text-text-secondary tabular-nums">{prefix}</span>}
      <input ref={ref} aria-invalid={invalid || undefined} className={cn(FIELD, className)} {...rest} />
      {suffix && <span className="shrink-0 text-text-secondary">{suffix}</span>}
    </div>
  );
});

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  containerClassName?: string;
  size?: never;
}

export function Select({ className, containerClassName, children, ...rest }: SelectProps) {
  return (
    <div className={cn(SHELL, 'relative pr-9', containerClassName)}>
      <select className={cn(FIELD, 'appearance-none truncate', className)} {...rest}>
        {children}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3.5 text-text-muted" aria-hidden="true" />
    </div>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-24 w-full resize-y rounded-ctl border border-border-strong bg-surface px-3.5 py-2.5 text-body-14 text-text placeholder:text-text-muted',
        'transition-[border-color,box-shadow] focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent-subtle focus-visible:outline-none',
        className,
      )}
      {...rest}
    />
  );
}

/** Pill search field. */
export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Input
      type="search"
      leftIcon={<Search size={16} aria-hidden="true" />}
      containerClassName={cn('max-w-sm', className)}
      {...rest}
    />
  );
}

interface TabsProps<T extends string> {
  options: readonly { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  /** Stretch to fill the width. */
  stretch?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

/**
 * Editorial tabs: plain labels on a hairline, the active one underlined in
 * ink. Counts sit beside the label in small figures.
 */
export function Tabs<T extends string>({ options, value, onChange, stretch, size = 'md', className, ...rest }: TabsProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={rest['aria-label']}
      className={cn('inline-flex max-w-full gap-5 overflow-x-auto overflow-y-hidden border-b border-border [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', stretch && 'flex w-full gap-0', className)}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-0.5',
              size === 'sm' ? 'pb-1.5 text-body-12' : 'pb-2.5 text-body-14',
              stretch && 'flex-1',
              on ? 'text-text after:bg-accent' : 'text-text-muted after:bg-transparent hover:text-text',
            )}
          >
            {o.label}
            {o.count !== undefined && (
              <span className={cn('text-[11px] tabular-nums', on ? 'text-accent' : 'text-text-muted')}>{o.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  /** Show the label next to the switch (otherwise it is for screen readers only). */
  showLabel?: boolean;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, showLabel, disabled }: SwitchProps) {
  return (
    <label className={cn('inline-flex items-center gap-2.5', disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={showLabel ? undefined : label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-10 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-border-interactive')}
      >
        <span className={cn('absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow-sm transition-transform', checked && 'translate-x-4')} />
      </button>
      {showLabel && <span className="text-body-14 text-text">{label}</span>}
    </label>
  );
}
