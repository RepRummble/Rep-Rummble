import { useOutletContext } from 'react-router-dom';
import { can, type Area, type BusinessInfo, type Role } from './api';

export interface BusinessContext {
  business: BusinessInfo;
  role: Role;
}

/** The signed-in person's approved business and role, provided by BusinessLayout. */
export function useBusiness() {
  const ctx = useOutletContext<BusinessContext>();
  return { ...ctx, allowed: (area: Area, mode: 'read' | 'write' = 'write') => can(ctx.role, area, mode) };
}
