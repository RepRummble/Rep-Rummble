import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import { PRICING, PREMIUM_UPGRADE, fmtPrice } from '../config/pricing';
import Faq from '../components/site/Faq';
import { openChat } from '../components/chat/openChat';

const SECTIONS = [
  {
    title: 'Getting started',
    items: [
      { q: 'Is Reprummble really free?', a: `Yes. The Free plan costs nothing and needs no card. Pro (${fmtPrice(PRICING.proMonthly)}/month) unlocks unlimited logging, your personalized AI plan, and wearable sync, with a ${PRICING.trialDays}-day free trial.` },
      { q: 'Do I need gym equipment?', a: 'No. Many workouts use only your bodyweight. Tell us what you have (nothing, dumbbells, bands, or a full gym) and your plan uses just that.' },
      { q: 'I am a complete beginner. Where do I start?', a: 'Sign up and answer a few questions about your goal, schedule, and equipment. Reprummble starts you with easier variations, short sessions, and plenty of rest while you learn the moves.' },
      { q: 'Where do the workouts live?', a: 'In the iPhone and Android app. This website is for signing up, pricing, billing, and contacting us.' },
    ],
  },
  {
    title: 'Devices & syncing',
    items: [
      { q: 'Can I use the same account on my phone and the web?', a: 'Yes. Sign in with the same account on iPhone, Android, and reprummble.com. Your plan, progress, and subscription stay in sync automatically.' },
      { q: 'Which wearables work?', a: 'On iPhone, Reprummble reads Apple Health, which includes Apple Watch and any device whose app syncs to Apple Health, such as Garmin, Oura, Whoop, Fitbit, and Polar. Android Health Connect support is coming.' },
      { q: 'My data is missing. What should I do?', a: 'Open your wearable\'s own app and make sure it is syncing to Apple Health, then check that Reprummble has permission to read it in your phone\'s Health settings. Still stuck? Ask Rumi or contact support.' },
    ],
  },
  {
    title: 'Plans & billing',
    items: [
      { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your account settings or by contacting support. You keep your paid features until the end of the current billing period.' },
      { q: 'Can I get a refund?', a: 'If you cancel within 7 days of your first paid charge and have not significantly used the service, you can request a full refund. Purchases made through the App Store or Google Play follow those stores\' refund policies.' },
      { q: 'What does Premium add?', a: `Everything in Pro, plus 1-on-1 coach check-ins twice a month, a custom nutrition plan, PDF progress reports, and priority support. Members of partner gyms get Pro included and can upgrade to Premium for ${fmtPrice(PREMIUM_UPGRADE)}/month.` },
    ],
  },
  {
    title: 'Referrals',
    items: [
      { q: 'How do referrals work?', a: 'Share your invite link from your dashboard. When a friend creates a new account through it, you each get 5% off your next subscription. Discounts stack up to 25%.' },
      { q: 'When does my referral discount apply?', a: 'It is saved to your account and applies to your next subscription payment once online billing opens. Invite links only work for brand-new accounts.' },
    ],
  },
  {
    title: 'Privacy & safety',
    items: [
      { q: 'Do you sell my data?', a: 'No. We do not sell, rent, or trade your personal or health data, and you can delete your account and data at any time.' },
      { q: 'Is Reprummble medical advice?', a: 'No. Reprummble gives general fitness and nutrition guidance. For pain, injuries, pregnancy, medications, or medical conditions, talk to a qualified professional first.' },
    ],
  },
  {
    title: 'For businesses',
    items: [
      { q: 'I run a gym or coaching business. How do I work with you?', a: `It is free to join. Your members get Pro included, you manage everything from a business dashboard, and you keep ${PRICING.gymPayoutPercent}% of program sales. See the Collaboration page to apply.` },
      { q: 'What happens after I apply?', a: 'We review every application personally and reply within two business days. Once approved, your business dashboard opens with your Reprummble account, and you can add coaches and nutritionists to your team.' },
    ],
  },
];

export default function FAQPage() {
  usePageMeta({
    title: 'FAQ',
    description: 'Answers about Reprummble plans, billing, syncing across devices, wearables, privacy, and working with us as a business.',
    canonical: '/faq',
  });

  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">FAQ</span>
          <h1>Questions, <span className="rr-gradient-text">answered.</span></h1>
          <p>Everything about plans, syncing, billing, and privacy. Can't find it? Rumi answers instantly, or you can write to us.</p>
          <div className="rr-hero-ctas">
            <button type="button" className="rr-btn rr-btn-primary rr-btn-lg" onClick={() => openChat()}><MessageCircle size={18} /> Ask Rumi</button>
            <Link className="rr-btn rr-btn-outline rr-btn-lg" to="/contact">Contact us</Link>
          </div>
        </div>
      </header>

      <section className="rr-section" style={{ paddingTop: 16 }}>
        <div className="rr-container" style={{ display: 'grid', gap: 48 }}>
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h2 style={{ fontSize: 24, maxWidth: 820, margin: '0 auto 16px' }}>{s.title}</h2>
              <Faq items={s.items} />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
