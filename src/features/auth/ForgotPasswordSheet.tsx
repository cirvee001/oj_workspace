import { Button, Sheet } from '@/components/ui';
import { closeSheet } from '@/store/ui/sheetStore';

export function ForgotPasswordSheet() {
  return (
    <Sheet title="Forgotten password" size="sm" footer={<Button onClick={closeSheet}>Got it</Button>}>
      <p className="text-body-14 text-text">
        For the demo, everyone&rsquo;s password is <b>fashion</b>.
      </p>
      <p className="mt-3 text-body-13 text-text-secondary">
        In the real system this sends a reset link to your work email, and the link expires in 30 minutes. Shop-floor staff
        who have no email address are reset by a manager instead, which is recorded in the activity log.
      </p>
    </Sheet>
  );
}
