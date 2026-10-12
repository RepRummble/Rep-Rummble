import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';

/** Invite links (reprummble.com/invite/<code>) remember the code and open the sign-up window. */
export default function InviteRedirect() {
  const { code = '' } = useParams();
  useEffect(() => {
    try { if (/^[\w-]{1,32}$/.test(code)) localStorage.setItem('rr_referral_code', code); } catch { /* storage blocked */ }
  }, [code]);
  return <Navigate to="/?auth=signup" replace />;
}
