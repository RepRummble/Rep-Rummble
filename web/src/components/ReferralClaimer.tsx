import { useEffect } from 'react';
import { supabase } from '../config/supabase';
import api from '../config/api';

const KEY = 'rr_referral_code';

/**
 * A visitor who arrived through an invite link has the code saved in this browser.
 * Once they have an account, send it to the server so both people get their reward.
 */
export default function ReferralClaimer() {
  useEffect(() => {
    let running = false;
    const claim = async () => {
      let code: string | null = null;
      try { code = localStorage.getItem(KEY); } catch { /* storage blocked */ }
      if (!code || running) return;
      running = true;
      const res = await api.referrals.claim(code);
      // Keep the code only if we could not reach the server; any real answer is final.
      const unreachable = !res.data && /network|failed to fetch|unavailable|verify/i.test(res.error || '');
      if (!unreachable) {
        try { localStorage.removeItem(KEY); } catch { /* ignore */ }
      }
      running = false;
    };

    supabase.auth.getSession().then(({ data: { session } }) => { if (session) claim(); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) claim();
    });
    return () => subscription.unsubscribe();
  }, []);
  return null;
}
