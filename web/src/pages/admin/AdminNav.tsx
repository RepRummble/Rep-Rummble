import { NavLink } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { admin } from './adminApi';

/** The tabs of the staff area, with a count of what is waiting. */
export default function AdminNav() {
  const [n, setN] = useState<{ leads: number; openCheckIns: number; openNutrition: number } | null>(null);
  useEffect(() => { admin.status().then((r) => { if (r.data) setN(r.data); }); }, []);
  const tab = (to: string, label: string, count?: number) => (
    <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : '')}>{label}{count ? <span className="dash-pill">{count}</span> : null}</NavLink>
  );
  return (
    <nav className="dash-tabs" aria-label="Staff area">
      {tab('/admin/applications', 'Applications')}
      {tab('/admin/waitlist', 'Waitlist', n?.leads)}
      {tab('/admin/checkins', 'Check-ins', n?.openCheckIns)}
      {tab('/admin/nutrition', 'Nutrition plans', n?.openNutrition)}
    </nav>
  );
}
