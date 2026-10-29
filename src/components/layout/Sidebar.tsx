import { NavLink } from 'react-router-dom';
import { ChevronsLeft, X } from 'lucide-react';
import { BrandMark, Icon } from '@/components/ui';
import { NAV, PATHS, canSeeScreen, type NavItem } from '@/config/navigation';
import { navBadge } from '@/store/derived';
import { useApp } from '@/store/hooks';
import { cn } from '@/lib/cn';

interface SidebarProps {
  /** Desktop: slim icon rail instead of the full menu. */
  collapsed: boolean;
  onCollapse: (v: boolean) => void;
  /** Phone: the menu slides in. */
  drawerOpen: boolean;
  onDrawerClose: () => void;
}

export function Sidebar({ collapsed, onCollapse, drawerOpen, onDrawerClose }: SidebarProps) {
  return (
    <>
      <aside
        className={cn(
          'relative hidden min-h-0 shrink-0 flex-col bg-panel-dark text-panel-dark-text transition-[width] duration-200 md:flex',
          collapsed ? 'w-16' : 'w-62',
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center', collapsed ? 'justify-center px-2' : 'px-5')}>
          <BrandMark compact={collapsed} inverted />
          <button
            type="button"
            onClick={() => onCollapse(!collapsed)}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!collapsed}
            className={cn(
              'grid size-7 place-items-center rounded-ctl text-panel-dark-muted transition-colors hover:bg-panel-dark-hover hover:text-panel-dark-text',
              collapsed ? 'absolute top-4.5 -right-3.5 z-20 border border-border bg-surface text-text-muted shadow-sm hover:bg-surface-hover hover:text-text' : 'ml-auto',
            )}
          >
            <ChevronsLeft size={16} className={cn('transition-transform duration-200', collapsed && 'rotate-180')} />
          </button>
        </div>
        <nav aria-label="Main" className={cn('min-h-0 flex-1 overflow-y-auto pt-1 pb-4', collapsed ? 'px-2' : 'px-3')}>
          <NavGroups rail={collapsed} onNavigate={() => undefined} />
        </nav>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden" onClick={onDrawerClose}>
          <div className="absolute inset-0 animate-in bg-black/40" />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="relative flex h-full w-70 max-w-[85vw] animate-in flex-col bg-panel-dark text-panel-dark-text shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-16 items-center px-4">
              <BrandMark inverted />
              <button
                type="button"
                onClick={onDrawerClose}
                aria-label="Close menu"
                className="ml-auto grid size-9 place-items-center rounded-ctl text-panel-dark-muted hover:bg-panel-dark-hover hover:text-panel-dark-text"
              >
                <X size={18} />
              </button>
            </div>
            <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3 pb-6">
              <NavGroups rail={false} onNavigate={onDrawerClose} />
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

function NavGroups({ rail, onNavigate }: { rail: boolean; onNavigate: () => void }) {
  const s = useApp();
  return (
    <>
      {NAV.map((group, gi) => {
        const items = group.items.filter((i) => canSeeScreen(s, i.key));
        if (!items.length) return null;
        return (
          <div key={gi} className={cn(gi > 0 && 'mt-4')}>
            {rail ? (
              gi > 0 && <div className="mx-3 mb-3 border-t border-panel-dark-raised" />
            ) : (
              group.label && <p className="px-3 pb-2 text-eyebrow text-panel-dark-muted/80">{group.label}</p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => (
                <NavEntry key={item.key} item={item} count={navBadge(s, item.key)} rail={rail} onNavigate={onNavigate} />
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

function NavEntry({ item, count, rail, onNavigate }: { item: NavItem; count: number; rail: boolean; onNavigate: () => void }) {
  return (
    <li>
      <NavLink
        to={PATHS[item.key]}
        end={item.key === 'today'}
        onClick={onNavigate}
        title={rail ? item.label : undefined}
        aria-label={rail ? (count ? `${item.label} (${count})` : item.label) : undefined}
        className={({ isActive }) =>
          cn(
            'relative flex h-9 items-center gap-3 rounded-ctl text-body-14 transition-colors',
            rail ? 'justify-center' : 'px-3',
            isActive
              ? 'bg-panel-dark-raised font-medium text-panel-dark-text before:absolute before:inset-y-2 before:-left-3 before:w-[3px] before:rounded-r-full before:bg-panel-dark-text'
              : 'text-panel-dark-muted hover:bg-panel-dark-hover hover:text-panel-dark-text',
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon name={item.icon} size={17} className={isActive ? 'text-panel-dark-text' : undefined} />
            {!rail && <span className="min-w-0 flex-1 truncate">{item.label}</span>}
            {count > 0 &&
              (rail ? (
                <span className="absolute top-1.5 right-2 size-2 rounded-full bg-panel-dark-text ring-2 ring-panel-dark" aria-hidden="true" />
              ) : (
                <span
                  className={cn(
                    'text-[11px] font-semibold tabular-nums',
                    isActive ? 'text-panel-dark-text' : 'text-panel-dark-text/80',
                  )}
                >
                  {count}
                </span>
              ))}
          </>
        )}
      </NavLink>
    </li>
  );
}
