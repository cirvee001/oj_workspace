import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, LogOut, Moon, Search, Sun } from 'lucide-react';
import { Avatar, IconButton } from '@/components/ui';
import { firstName } from '@/lib/format';
import { cn } from '@/lib/cn';
import { useGo } from '@/hooks/useGo';
import { bellCount } from '@/store/derived';
import { useApp, useMe } from '@/store/hooks';
import { isCurrentStaff } from '@/store/selectors';
import { setBranch, signOut, switchUser } from '@/store/actions/session';
import { toggleTheme, useThemeStore } from '@/store/ui/themeStore';
import { CommandPalette } from './CommandPalette';

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const s = useApp();
  const go = useGo();
  const theme = useThemeStore((t) => t.theme);
  const [paletteOpen, setPaletteOpen] = useState(false);

  /* ⌘K / Ctrl+K opens search from anywhere. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 md:px-8">
      <IconButton icon="menu" label="Menu" variant="surface" onClick={onMenu} className="md:hidden" />
      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-10 max-w-md min-w-0 flex-1 items-center gap-2 rounded-ctl border border-border bg-surface px-3.5 text-body-13 text-text-muted transition-colors hover:border-border-strong hover:text-text-secondary"
      >
        <Search size={16} className="shrink-0" aria-hidden="true" />
        <span className="truncate">
          <span className="sm:hidden">Search</span>
          <span className="hidden sm:inline">Search clients, orders, staff, fabric…</span>
        </span>
        <kbd className="ml-auto hidden rounded-tag border border-border px-1.5 py-0.5 font-mono text-[10px] sm:block">Ctrl K</kbd>
      </button>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <IconButton
          icon="bell"
          label="Notifications"
          variant="surface"
          count={bellCount(s)}
          onClick={() => go('notifications')}
        />
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Use light theme' : 'Use dark theme'}
          title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
          className="hidden size-10 place-items-center rounded-ctl border border-border bg-surface text-text-secondary transition-colors hover:border-border-strong hover:text-text sm:grid"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <UserMenu />
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  );
}

/** The person pill: who you are, plus the demo's branch and role switchers. */
function UserMenu() {
  const s = useApp();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-ctl border border-border bg-surface py-1 pr-3 pl-1 transition-colors hover:border-border-strong"
      >
        <Avatar name={me.name} size="sm" className="rounded-[7px] bg-text text-surface" />
        <span className="hidden max-w-40 text-left leading-tight md:block">
          <span className="block truncate text-body-13 font-semibold text-text">{me.name}</span>
          <span className="block truncate text-body-12 text-text-muted">{me.roleName}</span>
        </span>
        <ChevronDown size={14} className={cn('text-text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="menu" className="absolute top-[calc(100%+8px)] right-0 z-40 w-72 animate-scale-in rounded-card bg-surface p-2 shadow-2xl">
          <p className="px-2.5 pt-1.5 pb-1.5 text-eyebrow text-text-muted">Branch</p>
          <div className="grid grid-cols-3 gap-1 px-1 pb-2">
            {s.branches.map((b) => (
              <button
                key={b.id}
                type="button"
                disabled={me.role !== 'owner'}
                onClick={() => setBranch(b.id)}
                className={cn(
                  'h-8 rounded-ctl border text-body-13 font-medium transition-colors disabled:cursor-not-allowed',
                  b.id === s.branch ? 'border-text bg-text text-surface' : 'border-border text-text-secondary hover:border-border-strong hover:text-text disabled:opacity-50',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
          <div className="border-t border-border pt-2">
            <p className="px-2.5 pt-1 pb-1.5 text-eyebrow text-text-muted">View the system as</p>
            <ul className="max-h-64 overflow-y-auto">
              {s.staff.filter(isCurrentStaff).map((x) => (
                <li key={x.id}>
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={x.id === me.id}
                    onClick={() => {
                      setOpen(false);
                      switchUser(x.id);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-ctl px-2.5 py-2 text-left text-body-13 hover:bg-surface-hover"
                  >
                    <span className="w-3.5 shrink-0 text-accent">{x.id === me.id && <Check size={14} />}</span>
                    <span className="min-w-0 flex-1 truncate">
                      <span className="font-semibold text-text">{firstName(x.name)}</span>
                      <span className="text-text-muted"> · {x.roleName}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-1 border-t border-border pt-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => toggleTheme()}
              className="flex w-full items-center gap-2.5 rounded-ctl px-2.5 py-2 text-left text-body-13 font-medium text-text-secondary hover:bg-surface-hover hover:text-text sm:hidden"
            >
              <Moon size={15} /> Switch theme
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-ctl px-2.5 py-2 text-left text-body-13 font-medium text-danger-text hover:bg-danger-fill"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
