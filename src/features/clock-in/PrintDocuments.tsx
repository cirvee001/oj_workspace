/**
 * Printable clock-in documents: a sheet of staff ID badges and the wall
 * poster. Sized in millimetres for paper; rendered inside the print-only area.
 * Colours are fixed (black on white) on purpose: these go on paper, not screen.
 */
import { Logo, QrCode } from '@/components/ui';
import { BRAND_NAME } from '@/config/constants';
import { badgePayload, posterPayload } from '@/lib/qr';
import { useApp } from '@/store/hooks';
import { branchName, branchStaff, myBranch } from '@/store/selectors';

/** One ID card per staff member at the current branch, two to a row. */
export function BadgeSheetPrint() {
  const s = useApp();
  const staff = branchStaff(s);
  return (
    <div className="grid grid-cols-2 gap-[8mm] font-sans text-[#101828]">
      {staff.map((x) => (
        <div key={x.id} className="break-inside-avoid rounded-[4mm] border border-[#d0d5dd] p-[6mm]">
          <div className="flex items-center gap-[3mm] border-b border-[#eaecf0] pb-[3mm]">
            <Logo className="size-[9mm]" />
            <div className="min-w-0">
              <div className="font-display text-[4mm] leading-tight font-semibold tracking-[-0.01em]">{BRAND_NAME}</div>
              <div className="text-[3.1mm] text-[#667085]">{branchName(s, x.branch)}</div>
            </div>
          </div>
          <div className="flex items-center gap-[4mm] py-[4mm]">
            <QrCode value={badgePayload(x.id, x.badge)} quiet={1} className="size-[26mm] shrink-0" />
            <div className="min-w-0">
              <div className="font-display text-[4.8mm] leading-[1.15] font-semibold tracking-[-0.02em]">{x.name}</div>
              <div className="mt-[1mm] text-[3.3mm] text-[#667085]">{x.roleName}</div>
              <div className="mt-[2.5mm] inline-block rounded-full border border-[#d0d5dd] px-[2.5mm] py-[0.6mm] text-[3.6mm] font-semibold tabular-nums">
                No. {x.badge}
              </div>
            </div>
          </div>
          <div className="border-t border-[#eaecf0] pt-[2.5mm] text-[2.9mm] leading-[1.4] text-[#667085]">
            Hold this to the tablet by the workshop door to clock in and out. If you lose it, tell a manager the same day.
          </div>
        </div>
      ))}
    </div>
  );
}

/** The "Clock in here" poster for the current branch's wall. */
export function PosterPrint() {
  const s = useApp();
  const id = myBranch(s);
  return (
    <div className="py-[10mm] text-center font-sans text-[#101828]">
      <Logo className="mx-auto size-[18mm]" />
      <h1 className="mt-[6mm] mb-[2mm] font-display text-[18mm] leading-none font-semibold tracking-[-0.03em]">Clock in here</h1>
      <p className="mb-[8mm] text-[5mm] text-[#667085]">
        {branchName(s, id)} · {BRAND_NAME}
      </p>
      <QrCode value={posterPayload(id)} quiet={1} className="mx-auto size-[90mm]" />
      <ol className="mt-[8mm] inline-block list-decimal pl-[1.5em] text-left text-[5.5mm] leading-[1.9]">
        <li>Open the camera on your phone.</li>
        <li>Point it at this square.</li>
        <li>Tap the link that appears.</li>
      </ol>
      <p className="mx-auto mt-[8mm] max-w-[130mm] text-[4.6mm] leading-normal text-[#667085]">
        No phone? Show your staff badge to the tablet by the workshop door instead.
      </p>
    </div>
  );
}
