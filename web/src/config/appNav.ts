import type { Area } from '../pages/business/api';

export interface NavItem {
  to: string;
  label: string;
  /** Match only this exact path (for the index page of a section). */
  end?: boolean;
  /** For business pages: the permission area needed to see the link. */
  area?: Area;
}

/** Top-bar menu for signed-in members. (Account settings and Billing are in the avatar menu.) */
export const MEMBER_NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', end: true },
  { to: '/dashboard/reports', label: 'Reports' },
  { to: '/dashboard/wearables', label: 'Wearables' },
  { to: '/dashboard/referral', label: 'Referral' },
];

/** Top-bar menu for people who run an approved business. Links are filtered by their role. */
export const BUSINESS_NAV: NavItem[] = [
  { to: '/business', label: 'Overview', end: true, area: 'reports' },
  { to: '/business/members', label: 'Members', area: 'members' },
  { to: '/business/workouts', label: 'Workout plans', area: 'plans' },
  { to: '/business/nutrition', label: 'Nutrition', area: 'nutrition' },
  { to: '/business/reports', label: 'Reports', area: 'reports' },
  { to: '/business/settings', label: 'Settings' },
];

/** Pages that live inside the signed-in app: they get the member/business bar and no public footer. */
export const APP_PREFIXES = ['/dashboard', '/business', '/admin'];
export const isAppPath = (pathname: string) => APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
