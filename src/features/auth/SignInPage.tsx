/**
 * Three ways in, because the people using this are not all the same. Office
 * staff have a password. Shop-floor staff have a 6-digit badge number and a
 * tablet. Management may be on the company Google account.
 */
import { useEffect, useState } from 'react';
import { Lock, User } from 'lucide-react';
import { Alert, Avatar, BrandMark, Button, Field, Input, Keypad, Tabs } from '@/components/ui';
import { useApp } from '@/store/hooks';
import { openSheet } from '@/store/ui/sheetStore';
import { signInAs, signInWithBadge, signInWithPassword, signInWithSso } from '@/store/actions/session';

type Method = 'password' | 'pin' | 'sso';

const METHODS = [
  { value: 'password', label: 'Password' },
  { value: 'pin', label: 'Badge number' },
  { value: 'sso', label: 'Company account' },
] as const;

const DEMO_ACCOUNTS: { id: string; label: string; note: string }[] = [
  { id: 'tunde', label: 'Owner', note: 'sees everything' },
  { id: 'grace', label: 'Operations', note: 'runs the day' },
  { id: 'ngozi', label: 'Branch Manager', note: 'one branch' },
  { id: 'musa', label: 'Production', note: 'the workshop' },
  { id: 'bisi', label: 'Store', note: 'fabric only' },
  { id: 'amaka', label: 'Tailor', note: 'own jobs only' },
  { id: 'sade', label: 'Sales', note: 'orders & enquiries' },
  { id: 'joy', label: 'Finance', note: 'the money' },
  { id: 'peter', label: 'HR', note: 'people only' },
];

export function SignInPage() {
  const s = useApp();
  const [method, setMethod] = useState<Method>('password');
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-panel-dark p-12 pb-20 text-panel-dark-text lg:flex lg:flex-col lg:justify-between">
        <BrandMark inverted />
        <div>
          <p className="text-eyebrow text-panel-dark-muted">Ikeja · Lekki · Abuja</p>
          <h2 className="mt-4 max-w-[13ch] font-display text-[44px] leading-[1.08]">
            Everything the business does, in one place.
          </h2>
          <p className="mt-6 max-w-[42ch] text-body-15 text-panel-dark-muted">
            Orders, fabric, the workshop, the staff and the money — without calling four people to find out what is happening.
          </p>
        </div>
        {/* A tailor's tape along the foot of the panel. */}
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-8 border-t border-panel-dark-raised"
          style={{
            backgroundImage:
              'repeating-linear-gradient(to right, rgb(255 255 255 / 0.35) 0 1px, transparent 1px 40px), repeating-linear-gradient(to right, rgb(255 255 255 / 0.18) 0 1px, transparent 1px 8px)',
            backgroundSize: '100% 14px, 100% 7px',
            backgroundRepeat: 'no-repeat',
          }}
        />
      </div>

      {/* Form */}
      <div className="flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-105">
          <BrandMark className="mb-8 lg:hidden" />
          <h1 className="font-display text-[32px] leading-[38px] text-text">Sign in</h1>
          <p className="mt-1.5 mb-6 text-body-14 text-text-secondary">Welcome back. Choose how you want to sign in.</p>

          <div className="rounded-card bg-surface p-5 shadow-card sm:p-6">
            <Tabs
              options={METHODS}
              value={method}
              onChange={(m) => {
                setMethod(m);
                setError(null);
              }}
              stretch
              aria-label="Sign-in method"
              className="mb-5"
            />
            {error && <Alert tone="danger" title={error} className="mb-4" />}
            {method === 'password' && <PasswordForm onError={setError} />}
            {method === 'pin' && <BadgeForm onError={setError} />}
            {method === 'sso' && (
              <div className="space-y-2.5">
                <p className="mb-4 text-body-13 text-text-secondary">
                  Management accounts are linked to the company workspace. This is a demonstration, so it signs you in as the owner.
                </p>
                {(['google', 'microsoft'] as const).map((p) => (
                  <Button key={p} variant="secondary" size="lg" fullWidth className="justify-start" onClick={() => signInWithSso(p)}>
                    <span className="grid size-6 place-items-center rounded-tag border border-border text-body-12 font-semibold">{p === 'google' ? 'G' : 'M'}</span>
                    Continue with {p === 'google' ? 'Google Workspace' : 'Microsoft 365'}
                  </Button>
                ))}
                <p className="pt-2 text-body-12 text-text-muted">Single sign-on means one place to remove someone&rsquo;s access the day they leave.</p>
              </div>
            )}
          </div>

          <div className="mt-8">
            <p className="mb-3 text-body-13 text-text-secondary">Have a look around as any of these — each one sees a different system:</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {DEMO_ACCOUNTS.map(({ id, label, note }) => {
                const st = s.staff.find((x) => x.id === id);
                if (!st) return null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => signInAs(id)}
                    className="flex items-center gap-2.5 rounded-tile bg-surface p-2.5 text-left shadow-card ring-accent transition hover:ring-2"
                  >
                    <Avatar name={st.name} size="sm" />
                    <span className="min-w-0">
                      <b className="block truncate text-body-13 font-semibold text-text">{label}</b>
                      <span className="block truncate text-body-12 text-text-muted">{note}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PasswordForm({ onError }: { onError: (e: string | null) => void }) {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        const r = signInWithPassword(user, pass);
        onError(r.ok ? null : r.error);
      }}
    >
      <Field label="Work email or username">
        <Input autoComplete="username" placeholder="tunde" leftIcon={<User size={16} />} value={user} onChange={(e) => setUser(e.target.value)} />
      </Field>
      <Field label="Password">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          leftIcon={<Lock size={16} />}
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-body-13 text-text-secondary">
          <input type="checkbox" defaultChecked className="size-4 accent-[var(--color-accent)]" />
          Keep me signed in
        </label>
        <Button variant="link" size="sm" onClick={() => openSheet({ type: 'forgotPassword' })}>
          Forgotten your password?
        </Button>
      </div>
      <Button type="submit" size="lg" fullWidth>
        Sign in
      </Button>
    </form>
  );
}

function BadgeForm({ onError }: { onError: (e: string | null) => void }) {
  const [pin, setPin] = useState('');

  const submit = (value: string) => {
    const r = signInWithBadge(value);
    if (!r.ok) {
      setPin('');
      onError(r.error);
    }
  };

  /* Six digits is a whole badge number: try it straight away. */
  useEffect(() => {
    if (pin.length !== 6) return;
    const t = setTimeout(() => submit(pin), 150);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <Keypad
      label="For staff on the shop floor. Use the 6-digit number printed on your badge."
      length={pin.length}
      onDigit={(n) => {
        onError(null);
        setPin((p) => (p.length < 6 ? p + n : p));
      }}
      onDelete={() => setPin((p) => p.slice(0, -1))}
      onSubmit={() => submit(pin)}
    />
  );
}
