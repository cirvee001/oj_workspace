import { useEffect, useRef, useState } from 'react';
import { Button, IconButton, Input, Sheet } from '@/components/ui';
import { useApp } from '@/store/hooks';
import { can, customerOf } from '@/store/selectors';
import { sendChatReply } from '@/store/actions/sales';
import { useOpenCustomer } from '@/hooks/useGo';

const FORM_ID = 'chat-reply-form';

export function ChatSheet({ id }: { id: string }) {
  const s = useApp();
  const openCustomer = useOpenCustomer();
  const [text, setText] = useState('');
  const scroller = useRef<HTMLDivElement>(null);
  const c = s.chats.find((x) => x.id === id);
  const count = c?.messages.length ?? 0;

  // Keep the newest message in view as replies arrive.
  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  if (!c) return null;

  const send = () => {
    if (sendChatReply(id, text)) setText('');
  };
  const canReply = can(s, 'chat');

  return (
    <Sheet
      title={customerOf(s, c.customer).name}
      tag={c.channel}
      description="Everything said here stays on the customer’s record."
      footer={
        <div className="flex w-full flex-col gap-3">
          {canReply ? (
            <form
              id={FORM_ID}
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send();
              }}
            >
              <Input
                placeholder="Write a reply"
                aria-label="Write a reply"
                containerClassName="flex-1"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <IconButton
                type="submit"
                icon="send"
                label="Send"
                variant="primary"
              />
            </form>
          ) : (
            <p className="text-body-13 text-text-muted">You can read this but not reply.</p>
          )}
          <div className="flex justify-end">
            <Button variant="secondary" size="sm" leftIcon="staff" onClick={() => openCustomer(c.customer)}>
              Open their record
            </Button>
          </div>
        </div>
      }
    >
      <div ref={scroller} className="-mx-2 flex max-h-96 flex-col gap-2.5 overflow-y-auto px-2 py-1">
        {c.messages.map((m, i) => (
          <div
            key={i}
            className={
              'max-w-[78%] rounded-tile px-3.5 py-2.5 text-body-14 leading-snug ' +
              (m.from === 'us'
                ? 'self-end rounded-br-[3px] bg-text text-surface'
                : 'self-start rounded-bl-[3px] bg-surface-sunken text-text')
            }
          >
            {m.text}
            <span className={'mt-1 block text-[11px] ' + (m.from === 'us' ? 'text-surface/60' : 'text-text-muted')}>{m.at}</span>
          </div>
        ))}
      </div>
    </Sheet>
  );
}
