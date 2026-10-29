/** App-wide feedback surfaces: the toast and the prompt/confirm dialog. */
import { useState } from 'react';
import { CircleCheck } from 'lucide-react';
import { useToastStore } from '@/store/ui/toastStore';
import { useDialogStore, type DialogRequest } from '@/store/ui/dialogStore';
import { Button } from './Button';
import { Input } from './Form';
import { Modal } from './Sheet';

export function Toaster() {
  const { message, action, key } = useToastStore();
  if (!message) return null;
  return (
    <div
      key={key}
      role="status"
      aria-live="polite"
      className="no-print fixed bottom-[calc(24px+env(safe-area-inset-bottom,0px))] left-1/2 z-70 flex w-max max-w-[min(460px,92vw)] -translate-x-1/2 animate-slide-up items-start gap-3 rounded-tile bg-text px-4 py-3 text-body-14 text-surface shadow-toast"
    >
      <CircleCheck size={18} className="mt-px shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-medium">{message}</p>
        {action && <p className="mt-0.5 text-body-13 opacity-70">{action}</p>}
      </div>
    </div>
  );
}

export function DialogHost() {
  const current = useDialogStore((s) => s.current);
  if (!current) return null;
  return current.kind === 'prompt' ? <PromptDialog key={current.title} req={current} /> : <ConfirmDialog req={current} />;
}

function PromptDialog({ req }: { req: Extract<DialogRequest, { kind: 'prompt' }> }) {
  const [value, setValue] = useState(req.defaultValue ?? '');
  const formId = `prompt-${req.title.length}`;
  return (
    <Modal
      title={req.title}
      description={req.message}
      onClose={() => req.resolve(null)}
      elevated
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => req.resolve(null)}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            {req.confirmLabel ?? 'OK'}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={(e) => {
          e.preventDefault();
          req.resolve(value);
        }}
      >
        <Input
          autoFocus
          type={req.inputType ?? 'text'}
          step="any"
          value={value}
          placeholder={req.placeholder}
          aria-label={req.title}
          onChange={(e) => setValue(e.target.value)}
        />
      </form>
    </Modal>
  );
}

function ConfirmDialog({ req }: { req: Extract<DialogRequest, { kind: 'confirm' }> }) {
  return (
    <Modal
      title={req.title}
      description={req.message}
      onClose={() => req.resolve(false)}
      elevated
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={() => req.resolve(false)}>
            Cancel
          </Button>
          <Button autoFocus onClick={() => req.resolve(true)}>
            {req.confirmLabel ?? 'OK'}
          </Button>
        </>
      }
    />
  );
}
