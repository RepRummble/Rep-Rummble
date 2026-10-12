import { useMemo, useState, type FormEvent } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { CreditCard, ShieldCheck } from 'lucide-react';
import api, { type BillingView } from '../../config/api';

const brandName = (brand: string) => brand.charAt(0).toUpperCase() + brand.slice(1);

/**
 * The payment method used for renewals. The card is typed into Stripe's own secure fields, which
 * send it straight to Stripe: it never touches our server, we only keep the brand and last four digits.
 */
export default function PaymentMethodManager({ billing, onChange }: { billing: BillingView; onChange: (b: BillingView) => void }) {
  const [clientSecret, setClientSecret] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const stripePromise = useMemo(() => (billing.publishableKey ? loadStripe(billing.publishableKey) : null), [billing.publishableKey]);
  const card = billing.paymentMethod;

  if (!billing.configured) {
    return <p className="dash-muted">Adding a payment method will be available when online billing goes live. We will let you know.</p>;
  }

  const start = async () => {
    setBusy(true); setError('');
    const { data, error: err } = await api.billing.startCardSetup();
    setBusy(false);
    if (err || !data) { setError(err || 'Could not start adding a card. Please try again.'); return; }
    setClientSecret(data.clientSecret);
  };

  const remove = async () => {
    if (!window.confirm('Remove this payment method?')) return;
    setBusy(true); setError('');
    const { data, error: err } = await api.billing.removeCard();
    setBusy(false);
    if (err || !data) { setError(err || 'Could not remove the card.'); return; }
    onChange(data);
  };

  return (
    <div className="bl-pm">
      {card ? (
        <div className="pf-row">
          <div>
            <strong><CreditCard size={16} /> {brandName(card.brand)} ending in {card.last4}</strong>
            <small>Expires {String(card.expMonth).padStart(2, '0')}/{card.expYear} · used for renewals</small>
          </div>
          {!clientSecret && (
            <div className="bl-actions">
              <button className="rr-btn rr-btn-outline" disabled={busy} onClick={start}>Replace card</button>
              <button className="rr-btn rr-btn-outline" disabled={busy} onClick={remove}>Remove</button>
            </div>
          )}
        </div>
      ) : (
        !clientSecret && (
          <div className="pf-row">
            <div><strong><CreditCard size={16} /> No payment method yet</strong><small>Add a card so your plan can renew automatically.</small></div>
            <button className="rr-btn rr-btn-primary" disabled={busy} onClick={start}>{busy ? 'Starting…' : 'Add card'}</button>
          </div>
        )
      )}

      {clientSecret && stripePromise && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe', variables: { colorPrimary: '#0f766e', borderRadius: '12px' } } }}>
          <CardForm
            onDone={(b) => { setClientSecret(''); onChange(b); }}
            onCancel={() => { setClientSecret(''); setError(''); }}
          />
        </Elements>
      )}

      {error && <p className="pf-status is-error" role="alert">{error}</p>}
      <p className="bl-secure"><ShieldCheck size={14} /> Card details are handled by Stripe. We never see or store your full card number.</p>
    </div>
  );
}

function CardForm({ onDone, onCancel }: { onDone: (b: BillingView) => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true); setError('');
    const result = await stripe.confirmSetup({
      elements,
      redirect: 'if_required',
      confirmParams: { return_url: `${window.location.origin}/dashboard/profile?section=payment` },
    });
    if (result.error) { setBusy(false); setError(result.error.message || 'We could not save that card.'); return; }
    const { data, error: err } = await api.billing.syncCard();
    setBusy(false);
    if (err || !data) { setError(err || 'The card was saved but we could not refresh this page. Please reload.'); return; }
    onDone(data);
  };

  return (
    <form className="bl-card-form" onSubmit={submit} aria-label="Add a payment method">
      <PaymentElement options={{ layout: 'tabs' }} />
      {error && <p className="pf-status is-error" role="alert">{error}</p>}
      <div className="bl-actions">
        <button type="button" className="rr-btn rr-btn-outline" onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className="rr-btn rr-btn-primary" disabled={!stripe || busy}>{busy ? 'Saving…' : 'Save card'}</button>
      </div>
    </form>
  );
}
