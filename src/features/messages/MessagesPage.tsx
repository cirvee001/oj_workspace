import { useState } from 'react';
import { Badge, Button, DetailCard, FocusPanel, PageHeader, type FocusItem } from '@/components/ui';
import { useApp } from '@/store/hooks';
import { customerOf } from '@/store/selectors';
import { openSheet } from '@/store/ui/sheetStore';
import { useOpenCustomer } from '@/hooks/useGo';

export function MessagesPage() {
  const s = useApp();
  const openCustomer = useOpenCustomer();
  const [selected, setSelected] = useState<string | null>(null);

  const items: FocusItem[] = s.chats.map((c) => {
    const name = customerOf(s, c.customer).name;
    const last = c.messages[c.messages.length - 1];
    const text = last?.text ?? '';
    return {
      key: c.id,
      avatarName: name,
      title: name,
      detail: text.slice(0, 70) + (text.length > 70 ? '…' : ''),
      trailing: !c.assigned ? (
        <Badge size="sm" tone="danger">
          nobody has replied
        </Badge>
      ) : (
        <span className="flex flex-col items-end gap-1">
          <Badge size="sm">{c.channel}</Badge>
          {last?.at && <span className="text-[11px] font-normal opacity-70">{last.at}</span>}
        </span>
      ),
    };
  });

  const chat = selected ? s.chats.find((c) => c.id === selected) : undefined;
  const detail = chat && (
    <DetailCard
      eyebrow={chat.channel + (chat.assigned ? '' : ' · nobody has replied')}
      title={customerOf(s, chat.customer).name}
      subtitle={customerOf(s, chat.customer).phone}
      actions={
        <>
          <Button leftIcon="chat" onClick={() => openSheet({ type: 'chat', id: chat.id })}>
            Open conversation
          </Button>
          <Button variant="secondary" leftIcon="staff" onClick={() => openCustomer(chat.customer)}>
            Open their record
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-2">
        {chat.messages.slice(-4).map((m, i) => (
          <div
            key={i}
            className={
              'max-w-[85%] rounded-tile px-3 py-2 text-body-13 leading-snug ' +
              (m.from === 'us' ? 'self-end rounded-br-[3px] bg-text text-surface' : 'self-start rounded-bl-[3px] bg-surface-sunken text-text')
            }
          >
            {m.text}
            <span className="mt-0.5 block text-[11px] opacity-70">{m.at}</span>
          </div>
        ))}
      </div>
    </DetailCard>
  );

  return (
    <>
      <PageHeader
        title="Messages"
        description="WhatsApp, Instagram and the website chat in one place. Everything said stays on the customer’s record."
      />
      <FocusPanel
        title="Conversations"
        description={s.chats.filter((c) => !c.assigned).length + ' waiting for a reply'}
        items={items}
        selectedKey={selected}
        onSelect={setSelected}
        detail={detail}
        emptyList="No conversations yet."
        emptyDetail="Pick a conversation to see the latest messages."
      />
    </>
  );
}
