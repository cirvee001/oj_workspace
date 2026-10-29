/**
 * The clock-in tablet. The shop does the scanning, not the worker: a printed
 * badge works without a phone. Four ways in, from strongest to weakest.
 */
import { useEffect, useRef, useState } from 'react';
import type { Branch, ClockMode, Staff } from '@/types/domain';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DashGrid,
  EmptyState,
  Icon,
  Field,
  KeyValue,
  KeyValueList,
  Keypad,
  List,
  ListItem,
  PageHeader,
  QrCode,
  Select,
  Tabs,
} from '@/components/ui';
import { TODAY } from '@/lib/dates';
import { firstName } from '@/lib/format';
import { GEO_RADIUS_M, canScanCodes, formatDistance } from '@/lib/geo';
import { badgePayload, posterPayload } from '@/lib/qr';
import {
  badgeScanned,
  clockByBadgeNumber,
  geoClock,
  posterScan,
  printBadges,
  printPoster,
  saveBranchSpot,
  type GeoClockResult,
} from '@/store/actions/attendance';
import { setClockMode } from '@/store/actions/session';
import { useApp } from '@/store/hooks';
import { branchStaff, myBranch, nameOf } from '@/store/selectors';

const MODES: readonly { value: ClockMode; label: string }[] = [
  { value: 'badge', label: 'Badge at the shop' },
  { value: 'poster', label: 'Wall poster' },
  { value: 'location', label: 'Phone location' },
  { value: 'number', label: 'Type the number' },
];

const BADGE_DIGITS = 6;

export function ClockInPage() {
  const s = useApp();
  const branch = s.branches.find((b) => b.id === myBranch(s));
  const staff = branchStaff(s);
  const mode = s.clockMode || 'badge';
  if (!branch) return <></>;

  return (
    <>
      <PageHeader
        title="Clock in"
        description="The shop does the scanning, not the worker. Anyone with a printed badge can clock in without owning a phone."
        actions={
          <>
            <Button variant="secondary" leftIcon="printer" onClick={printBadges}>
              Print badges
            </Button>
            <Button variant="secondary" leftIcon="printer" onClick={printPoster}>
              Print wall poster
            </Button>
          </>
        }
      />

      <Tabs
        aria-label="How to clock in"
        options={MODES}
        value={mode}
        onChange={setClockMode}
        className="mb-4 max-w-full overflow-x-auto"
      />

      <DashGrid>
        {mode === 'badge' && <BadgeMode staff={staff} />}
        {mode === 'poster' && <PosterMode branch={branch} staff={staff} />}
        {mode === 'location' && <LocationMode key={branch.id} branch={branch} staff={staff} />}
        {mode === 'number' && <NumberMode staff={staff} />}
        <WhoIsIn total={staff.length} />
      </DashGrid>
    </>
  );
}

/* ---------------- badge ---------------- */

function BadgeMode({ staff }: { staff: Staff[] }) {
  const [scanning, setScanning] = useState(false);
  return (
    <Card>
      <CardHeader
        title="Hold your badge to the screen"
        description="This tablet sits by the workshop door. Staff show the card clipped to their apron — no phone, no PIN to remember, nothing to share."
      />
      <CardBody>
        <div className="grid min-h-56 place-items-center rounded-tile border-2 border-dashed border-border-strong bg-surface-sunken p-6 text-center">
          {canScanCodes ? (
            scanning ? (
              <CameraScanner onStop={() => setScanning(false)} />
            ) : (
              <div className="flex flex-col items-center">
                <span className="stitch mb-4 grid size-14 place-items-center rounded-full border text-accent">
                  <Icon name="photo" size={24} />
                </span>
                <Button leftIcon="photo" onClick={() => setScanning(true)}>
                  Open the camera
                </Button>
                <p className="mt-2.5 text-body-12 text-text-muted">The tablet camera reads the badge.</p>
              </div>
            )
          ) : (
            <Alert title="This browser cannot use the camera to read codes" className="text-left">
              On the shop tablet (Chrome on Android) the camera opens here. Until then, use the badge number below.
            </Alert>
          )}
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <p className="mb-3 text-body-13 text-text-secondary">Try it — pretend each of these is holding their badge up to the camera:</p>
          <div className="flex flex-wrap items-center gap-2">
            {staff.slice(0, 5).map((x) => (
              <Button key={x.id} variant="secondary" size="sm" onClick={() => badgeScanned(badgePayload(x.id, x.badge))}>
                {firstName(x.name)}’s badge
              </Button>
            ))}
          </div>
          <p className="mt-3 text-body-13">
            <Button variant="link" onClick={() => badgeScanned('FBOS-ID|ghost|000000')}>
              Try a badge that was never issued
            </Button>
          </p>
        </div>
      </CardBody>
    </Card>
  );
}

interface DetectedCode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedCode[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

/** Live camera view that reads a badge QR, then stops itself. Cleans up on unmount. */
function CameraScanner({ onStop }: { onStop: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  const onStopRef = useRef(onStop);
  useEffect(() => {
    onStopRef.current = onStop;
  }, [onStop]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: number | undefined;
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
      stream = null;
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((st) => {
        const v = videoRef.current;
        if (cancelled || !v) {
          st.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = st;
        v.srcObject = st;
        void v.play().catch(() => {});
        const Detector = (window as unknown as { BarcodeDetector: BarcodeDetectorCtor }).BarcodeDetector;
        const det = new Detector({ formats: ['qr_code'] });
        timer = window.setInterval(() => {
          det
            .detect(v)
            .then((codes) => {
              if (cancelled || !codes.length) return;
              stop();
              onStopRef.current();
              badgeScanned(codes[0].rawValue);
            })
            .catch(() => {});
        }, 350);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return stop;
  }, []);

  if (failed) {
    return (
      <Alert tone="danger" title="The camera did not open" className="text-left">
        Allow camera access, or use the badge number instead.
      </Alert>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <video ref={videoRef} playsInline muted className="w-full max-w-80 rounded-tile bg-black" />
      <p className="mt-2.5 text-body-12 text-text-muted">Hold the badge steady in the frame.</p>
      <Button variant="secondary" size="sm" className="mt-2.5" onClick={onStop}>
        Stop
      </Button>
    </div>
  );
}

/* ---------------- poster ---------------- */

function PosterMode({ branch, staff }: { branch: Branch; staff: Staff[] }) {
  return (
    <Card>
      <CardHeader
        title={branch.name + ' wall poster'}
        description="Print it once and stick it by the door. Staff with phones scan it on the way in."
      />
      <CardBody>
        <div className="grid place-items-center rounded-tile bg-surface-sunken p-6">
          {/* Always white so the code scans in either theme. */}
          <div className="rounded-tile bg-white p-4 shadow-card">
            <QrCode value={posterPayload(branch.id)} size={200} />
          </div>
        </div>
        <Alert title="A printed code cannot expire, so pair it with location" className="mt-4">
          Anyone could photograph the poster. Because of that, a poster scan also checks the phone is at the shop before it
          counts.
        </Alert>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {staff.slice(0, 4).map((x) => (
            <Button key={x.id} variant="secondary" size="sm" onClick={() => void posterScan(x.id)}>
              {firstName(x.name)} scans it
            </Button>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------------- location ---------------- */

type GeoStatus = { kind: 'idle' } | { kind: 'checking' } | { kind: 'finding' } | GeoClockResult;

function LocationMode({ branch, staff }: { branch: Branch; staff: Staff[] }) {
  const [who, setWho] = useState(staff[0]?.id ?? '');
  const [status, setStatus] = useState<GeoStatus>({ kind: 'idle' });
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const set = branch.lat != null && branch.lng != null;

  const check = async () => {
    if (!who) return;
    setStatus({ kind: 'checking' });
    const r = await geoClock(who);
    if (mounted.current) setStatus(r.kind === 'error' ? { kind: 'idle' } : r);
  };

  const savePin = async () => {
    if (navigator.geolocation) setStatus({ kind: 'finding' });
    await saveBranchSpot();
    if (mounted.current) setStatus({ kind: 'idle' });
  };

  return (
    <Card>
      <CardHeader
        title="Clock in from your phone"
        description={
          set
            ? 'The phone has to be within ' + GEO_RADIUS_M + ' metres of ' + branch.name + '.'
            : 'This branch has no location saved. Stand at the shop and save it once.'
        }
      />
      <CardBody className="space-y-4">
        {set && (
          <div className="rounded-tile bg-surface-sunken px-4 py-1">
            <KeyValueList>
              <KeyValue label="Branch pin">
                {branch.lat!.toFixed(5)}, {branch.lng!.toFixed(5)}
              </KeyValue>
              <KeyValue label="Allowed distance">{GEO_RADIUS_M} m</KeyValue>
            </KeyValueList>
          </div>
        )}
        <Field label="Who is clocking in">
          <Select value={who} onChange={(e) => setWho(e.target.value)}>
            {staff.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </Select>
        </Field>
        <div className="flex flex-wrap items-center gap-2">
          {set && (
            <Button leftIcon="build" onClick={() => void check()}>
              Check where I am
            </Button>
          )}
          <Button variant="secondary" onClick={() => void savePin()}>
            {set ? 'Move the pin to where I am' : 'Save this spot as ' + branch.name}
          </Button>
        </div>
        {status.kind === 'checking' && <Alert title="Checking where you are…" />}
        {status.kind === 'finding' && <Alert title="Finding you…" />}
        {status.kind === 'ok' && (
          <Alert tone="success" title={'You are at ' + branch.name}>
            {Math.round(status.distance)} m away, accurate to about {status.accuracy} m.
          </Alert>
        )}
        {status.kind === 'far' && (
          <Alert tone="danger" title={'Too far from ' + branch.name}>
            About {formatDistance(status.distance)} away. You must be within {GEO_RADIUS_M} m.
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}

/* ---------------- typed number ---------------- */

function NumberMode({ staff }: { staff: Staff[] }) {
  const [pin, setPin] = useState('');
  const example = staff[2] ?? staff[0];

  const submit = (value: string) => {
    setPin('');
    if (value) clockByBadgeNumber(value);
  };

  useEffect(() => {
    if (pin.length !== BADGE_DIGITS) return;
    const t = window.setTimeout(() => submit(pin), 200);
    return () => window.clearTimeout(t);
  }, [pin]);

  return (
    <Card>
      <CardHeader title="Type the badge number" description="Use it only when the badge is not to hand." />
      <CardBody>
        <Alert tone="warning" title="The weakest way in">
          A number can be read out over the phone to someone at home. Every clock-in this way is marked, so you can see who
          keeps using it.
        </Alert>
        <div className="mt-5 rounded-tile bg-surface-sunken px-4 py-6">
          <Keypad
            label="Badge number"
            length={pin.length}
            max={BADGE_DIGITS}
            onDigit={(n) => setPin((p) => (p.length < BADGE_DIGITS ? p + n : p))}
            onDelete={() => setPin((p) => p.slice(0, -1))}
            onSubmit={() => submit(pin)}
          />
          {example && (
            <p className="mt-4 text-center text-body-12 text-text-muted">
              Try <span className="font-semibold text-text-secondary tabular-nums">{example.badge}</span> ({firstName(example.name)})
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/* ---------------- who is in ---------------- */

function WhoIsIn({ total }: { total: number }) {
  const s = useApp();
  /* Only this branch's staff, so the count matches the "/total" roster. */
  const roster = new Set(branchStaff(s).map((x) => x.id));
  const inToday = s.attendance.filter((a) => a.date === TODAY && roster.has(a.staff));
  return (
    <Card>
      <CardHeader
        title="Who is in today"
        actions={<Badge tone={inToday.length ? 'accent' : 'neutral'}>{inToday.length + '/' + total}</Badge>}
        divided
      />
      {inToday.length ? (
        <List bare>
          {inToday.map((a) => (
            <ListItem
              key={a.staff}
              leading={<Avatar name={nameOf(s, a.staff)} />}
              title={nameOf(s, a.staff)}
              description={
                <span className="tabular-nums">
                  {'in at ' + a.in + (a.out ? ' · out at ' + a.out : ' · still here') + (a.how ? ' · ' + a.how : '')}
                </span>
              }
              trailing={a.late ? <Badge tone="warning">late</Badge> : <Badge tone="success">on time</Badge>}
            />
          ))}
        </List>
      ) : (
        <EmptyState size="sm" icon="clock" title="Nobody in yet" message="Clock-ins appear here as they happen." />
      )}
    </Card>
  );
}
