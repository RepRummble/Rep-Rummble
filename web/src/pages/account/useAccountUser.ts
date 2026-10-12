import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { DEV_BYPASS_AUTH, DEV_USER } from '../../config/devAuth';
import { supabase } from '../../config/supabase';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  metadata: Record<string, unknown>;
  /** When the account was created (ISO), if known. */
  createdAt?: string;
  emailVerified: boolean;
}

/** Loads the signed-in user once for the whole dashboard. */
export function useAccountUserLoader() {
  const [user, setUser] = useState<AccountUser | null>(null);
  useEffect(() => {
    if (DEV_BYPASS_AUTH) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser({ id: DEV_USER.id, email: DEV_USER.email, name: DEV_USER.name, metadata: {}, emailVerified: true });
      return;
    }
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) return;
      const m = (u.user_metadata || {}) as Record<string, unknown>;
      setUser({ id: u.id, email: u.email || '', name: String(m.displayName || m.full_name || ''), metadata: m, createdAt: u.created_at, emailVerified: !!u.email_confirmed_at });
    });
  }, []);
  return [user, setUser] as const;
}

export const useAccountUser = () => useOutletContext<{ user: AccountUser | null; setUser: (u: AccountUser) => void }>();
