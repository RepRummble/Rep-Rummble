import { useEffect, useState } from 'react';
import api, { type ReferralSummary } from '../../config/api';

export default function Referral() {
  const [data, setData] = useState<ReferralSummary | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api.referrals.me().then((res) => (res.data ? setData(res.data) : setError(res.error || 'Could not load your referral link.')));
  }, []);

  const copy = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard blocked: the link stays selectable in the box */ }
  };

  const pct = data?.rewardPercent ?? 5;

  return (
    <>
      <div className="dash-head"><h1>Referral</h1><p>Invite a friend. You each get {pct}% off your next subscription.</p></div>

      <section className="dash-card">
        <h2>Your invite link</h2>
        <div className="dash-linkbox">
          <input type="text" value={data?.link ?? ''} readOnly placeholder="Loading your link…" aria-label="Your invite link" onFocus={(e) => e.currentTarget.select()} />
          <button className="rr-btn rr-btn-primary" onClick={copy} disabled={!data}>{copied ? 'Copied' : 'Copy'}</button>
        </div>
        {error && <p className="dash-error" role="alert">{error}</p>}
      </section>

      {data && (
        <div className="dash-kpis">
          <div className="dash-kpi"><small>Discount ready</small><strong>{data.availablePercent}%</strong><span>on your next subscription</span></div>
          <div className="dash-kpi"><small>Friends joined</small><strong>{data.invited}</strong><span>{data.rewarded} earned you a reward</span></div>
          <div className="dash-kpi"><small>Per friend</small><strong>{data.rewardPercent}%</strong><span>for you and for them</span></div>
          <div className="dash-kpi"><small>Maximum</small><strong>{data.maxPercent}%</strong><span>discounts stack up to this</span></div>
        </div>
      )}

      <section className="dash-card">
        <h2>How it works</h2>
        <div className="dash-steps">
          <div><strong>1. Share</strong><span>Send your invite link to a friend.</span></div>
          <div><strong>2. They join</strong><span>They create a new account through your link.</span></div>
          <div><strong>3. You both save</strong><span>You each get {pct}% off your next subscription. Discounts stack up to {data?.maxPercent ?? 25}%.</span></div>
        </div>
        <p className="dash-muted">Invite links work for brand-new accounts only, and the discount applies when online billing opens.</p>
      </section>
    </>
  );
}
