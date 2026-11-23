import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { usePageMeta } from '../hooks/usePageMeta';
import Waitlist from '../components/site/Waitlist';
import { FOUNDER, FOUNDER_PUBLISHED } from '../content/founder';

const PRINCIPLES = [
  { t: 'Real data only', d: 'The app shows what you logged and what your devices reported. If there is no reading, it says so. It never fills a screen with sample numbers.' },
  { t: 'Scores you can check', d: 'Recovery, Sleep and Strain come from written formulas, and each score lists the readings that moved it. We publish the maths.' },
  { t: 'Your data is yours', d: 'We do not sell it. You can disconnect a device or delete your account in the app, and your records are removed.' },
  { t: 'Works with what you own', d: 'Apple Watch, Galaxy Watch, Fitbit, WHOOP and Oura connect directly. You do not need any of them to use the app.' },
];

export default function About() {
  usePageMeta({
    title: 'About',
    description: 'Why we are building Reprummble: one honest, affordable app for training, nutrition and recovery, with scores you can check and data you control.',
    canonical: '/about',
  });
  return (
    <div className="rr-page">
      <header className="rr-pagehead">
        <div className="rr-container">
          <span className="rr-eyebrow">About</span>
          <h1>Fitness that is honest <span className="rr-gradient-text">and affordable.</span></h1>
          <p>Training, nutrition and recovery usually mean five apps, five subscriptions and a lot of guessing. Reprummble puts them in one place, starts free, and shows its working.</p>
        </div>
      </header>

      <section className="rr-section" style={{ paddingTop: 8 }}>
        <div className="rr-container rr-post">
          {FOUNDER_PUBLISHED && (
            <section className="rr-founder" aria-labelledby="founder-title">
              <h2 id="founder-title">{FOUNDER.title}</h2>
              {FOUNDER.paragraphs.map((p) => <p key={p}>{p}</p>)}
              <p className="rr-founder-sign"><strong>{FOUNDER.signOff}</strong><br /><span>{FOUNDER.name} · {FOUNDER.role}</span></p>
            </section>
          )}
          <h2>What we are building</h2>
          <p>One app for your whole routine: workouts from an AI coach or an offline coach that works with no internet, meal logging from a photo, daily Recovery, Sleep and Strain scores from the watch or ring you already wear, and 30, 60 and 90-day challenges you can take on with friends.</p>
          <p>We also work with local gyms and coaches. They publish programs, their members get Pro included, and they keep most of every program sale.</p>

          <h2>What we believe</h2>
          <div className="rr-principles">
            {PRINCIPLES.map((p) => <div key={p.t} className="rr-principle"><h3>{p.t}</h3><p>{p.d}</p></div>)}
          </div>

          <h2>Where we are</h2>
          <p>Reprummble is young. The website is live and you can start free today. The iPhone and Android apps are coming soon. If you would like to know the moment they are out, leave your email.</p>
          <div style={{ margin: '8px 0 24px' }}><Waitlist variant="light" source="waitlist-about" /></div>

          <h2>Get in touch</h2>
          <p>Questions, feedback or a bug? Write to <strong>support@reprummble.com</strong>, or use the <Link to="/contact">contact page</Link>. Privacy questions go to <strong>privacy@reprummble.com</strong>. If you run a gym or coach, see <Link to="/collaborate">how to collaborate</Link>.</p>
          <p><Link className="rr-btn rr-btn-primary" to="/?auth=signup">Start free <ArrowRight size={16} /></Link></p>
        </div>
      </section>
    </div>
  );
}
