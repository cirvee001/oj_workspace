/**
 * Clocking in. Not every tailor owns a smartphone, so anything that depends on
 * the worker having one is the wrong way round. The shop owns the camera; the
 * worker carries a printed badge.
 *
 *   Badge    — worker holds their printed card to the shop tablet. No phone needed.
 *   Poster   — a printed code on the wall, for staff who do have phones.
 *   Location — phone GPS, for anyone off-site or on delivery.
 *   Number   — typing the badge number. Weakest, and flagged as such.
 */
import { TODAY, clockTime } from '@/lib/dates';
import { GEO_RADIUS_M, currentPosition, formatDistance, haversine } from '@/lib/geo';
import { getState, update } from '../appStore';
import { branchName, branchStaff, me, myBranch, nameOf } from '../selectors';
import { toast } from '../ui/toastStore';
import { printDocument } from '../ui/printStore';
import { addLog } from './core';

/** Late is after 08:10. */
const isLateAt = (t: string) => Number(t.slice(0, 2)) > 8 || (t.slice(0, 2) === '08' && Number(t.slice(3)) > 10);

/** Clock in if they are not in yet, otherwise clock out. */
export function recordClock(staffId: string, how: string): void {
  const s = getState();
  const t = clockTime();
  const who = nameOf(s, staffId);
  const rec = s.attendance.find((a) => a.staff === staffId && a.date === TODAY);
  if (!rec) {
    const late = isLateAt(t);
    update((d) => {
      d.attendance.unshift({ staff: staffId, date: TODAY, in: t, out: null, late, how });
      addLog(d, who + ' clocked in', t + ' · ' + how + (late ? ' · late' : ''));
    });
    toast('Good morning, ' + who + '.', (late ? 'You are marked late. ' : 'You are on time. ') + 'Checked by ' + how + '.');
  } else if (!rec.out) {
    update((d) => {
      d.attendance.find((a) => a.staff === staffId && a.date === TODAY)!.out = t;
      addLog(d, who + ' clocked out', t + ' · ' + how);
    });
    toast('Goodbye, ' + who + '.', 'Clocked out at ' + t + '.');
  } else {
    toast(who + ' already clocked out today.');
  }
}

/** A badge QR was read by the shop tablet. Payload is `FBOS-ID|<staffId>|<badge>`. */
export function badgeScanned(payload: string): void {
  const s = getState();
  const [kind, id, badge] = String(payload).split('|');
  if (kind !== 'FBOS-ID') {
    toast('That is not a staff badge.', 'Hold the card flat to the camera.');
    return;
  }
  const who = s.staff.find((x) => x.id === id && x.badge === badge && !x.left);
  if (!who) {
    toast('That badge is not recognised.', 'It may have been cancelled. See a manager.');
    return;
  }
  if (who.branch !== myBranch(s) && me(s).role !== 'owner') {
    toast(who.name + ' works at ' + branchName(s, who.branch) + ', not here.', 'Clock in at your own branch.');
    return;
  }
  recordClock(who.id, 'badge at the shop');
}

/** Typed badge number. Returns false when the number is not recognised. */
export function clockByBadgeNumber(badge: string): boolean {
  const who = getState().staff.find((x) => x.badge === badge && !x.left);
  if (!who) {
    toast('That badge number was not recognised.', 'Check the card, or see a manager.');
    return false;
  }
  recordClock(who.id, 'typed badge number');
  return true;
}

/** A printed poster cannot expire, so a poster scan also checks the phone is at the shop. */
export async function posterScan(staffId: string): Promise<void> {
  const b = getState().branches.find((x) => x.id === myBranch(getState()))!;
  if (b.lat == null || b.lng == null) {
    toast('The poster works, but this branch has no location saved.',
      'Save the branch location so a photographed poster cannot be used from home.');
    recordClock(staffId, 'wall poster (location not checked)');
    return;
  }
  if (!navigator.geolocation) {
    recordClock(staffId, 'wall poster');
    return;
  }
  try {
    const p = await currentPosition();
    const dist = haversine({ lat: p.coords.latitude, lng: p.coords.longitude }, { lat: b.lat, lng: b.lng });
    if (dist <= GEO_RADIUS_M) recordClock(staffId, 'wall poster, ' + Math.round(dist) + ' m away');
    else toast('You scanned the poster but you are ' + formatDistance(dist) + ' from the shop.', 'A photo of the poster is not enough on its own.');
  } catch {
    recordClock(staffId, 'wall poster (location refused)');
  }
}

const locationError = (err: unknown) =>
  (err as GeolocationPositionError)?.code === 1 ? 'You said no to location.' : 'Could not find your location.';

/** Save where the phone is now as this branch's location. */
export async function saveBranchSpot(): Promise<void> {
  if (!navigator.geolocation) {
    toast('This device cannot do location.', 'Use a badge instead.');
    return;
  }
  try {
    const p = await currentPosition();
    const branchId = myBranch(getState());
    let name = '';
    update((d) => {
      const b = d.branches.find((x) => x.id === branchId)!;
      b.lat = p.coords.latitude;
      b.lng = p.coords.longitude;
      name = b.name;
      addLog(d, 'Saved the location of ' + b.name, b.lat.toFixed(5) + ', ' + b.lng.toFixed(5));
    });
    toast(name + '’s location saved.', 'Staff must be within ' + GEO_RADIUS_M + ' m.');
  } catch (err) {
    toast(locationError(err), 'Badges work without any of this.');
  }
}

export type GeoClockResult =
  | { kind: 'ok'; distance: number; accuracy: number }
  | { kind: 'far'; distance: number }
  | { kind: 'error' };

/** Clock in by phone location: must be within GEO_RADIUS_M of the branch pin. */
export async function geoClock(staffId: string): Promise<GeoClockResult> {
  const b = getState().branches.find((x) => x.id === myBranch(getState()))!;
  if (b.lat == null || b.lng == null) {
    toast('Save the branch location first.');
    return { kind: 'error' };
  }
  if (!navigator.geolocation) {
    toast('This device cannot do location.');
    return { kind: 'error' };
  }
  try {
    const p = await currentPosition();
    const distance = haversine({ lat: p.coords.latitude, lng: p.coords.longitude }, { lat: b.lat, lng: b.lng });
    if (distance <= GEO_RADIUS_M) {
      recordClock(staffId, 'phone location, ' + Math.round(distance) + ' m away');
      return { kind: 'ok', distance, accuracy: Math.round(p.coords.accuracy || 0) };
    }
    toast('Too far from the shop to clock in.', 'Come in first, then try again.');
    return { kind: 'far', distance };
  } catch (err) {
    toast(locationError(err), 'Use your badge at the shop instead.');
    return { kind: 'error' };
  }
}

/* ---------------- printing ---------------- */

export function printBadges(): void {
  const s = getState();
  const count = branchStaff(s).length;
  printDocument({ kind: 'badges' });
  update((d) => addLog(d, 'Printed staff badges', count + ' cards for ' + branchName(d, myBranch(d))));
  toast('Badge sheet sent to the printer.', 'Cut them out and clip one to each apron.');
}

export function printPoster(): void {
  printDocument({ kind: 'poster' });
  update((d) => addLog(d, 'Printed the clock-in poster', branchName(d, myBranch(d))));
  toast('Poster sent to the printer.', 'Stick it at eye height by the door.');
}
