import { RefreshCw } from 'lucide-react';
import {
  SiAndroid, SiApple, SiAppstore, SiFirefoxbrowser, SiGooglechrome, SiGoogleplay, SiSafari,
} from 'react-icons/si';

const CARDS = [
  {
    key: 'mobile',
    title: 'iPhone & Android',
    desc: 'Train with guided workouts, log meals with a photo, and sync your wearable on the go.',
    stage: (
      <div className="rr-sync-phones" aria-hidden="true">
        <div className="rr-sync-phone"><SiApple size={30} /><span>iPhone</span></div>
        <div className="rr-sync-phone is-back"><SiAndroid size={30} color="#3ddc84" /><span>Android</span></div>
      </div>
    ),
    badges: [
      { icon: SiAppstore, label: 'App Store', color: '#0d96f6' },
      { icon: SiGoogleplay, label: 'Google Play', color: '#34a853' },
    ],
  },
  {
    key: 'web',
    title: 'Web',
    desc: 'Manage your account and billing, and see your progress on a bigger screen.',
    stage: (
      <div className="rr-sync-browser" aria-hidden="true">
        <div className="rr-sync-browser-bar"><i /><i /><i /><span>reprummble.com</span></div>
        <div className="rr-sync-browser-body">
          <b /><b className="is-short" /><div><i /><i /><i /></div>
        </div>
      </div>
    ),
    badges: [
      { icon: SiGooglechrome, label: 'Chrome', color: '#4285f4' },
      { icon: SiSafari, label: 'Safari', color: '#0fb5ee' },
      { icon: SiFirefoxbrowser, label: 'Firefox', color: '#ff7139' },
    ],
  },
  {
    key: 'sync',
    title: 'Always in sync',
    desc: 'Finish a workout on one device and it shows up everywhere. No exporting, no manual sync.',
    stage: (
      <div className="rr-sync-flow" aria-hidden="true">
        <span className="rr-sync-node"><SiApple size={22} /></span>
        <span className="rr-sync-link"><RefreshCw size={18} /></span>
        <span className="rr-sync-node"><SiAndroid size={22} color="#3ddc84" /></span>
        <span className="rr-sync-pill">Synced just now</span>
      </div>
    ),
    badges: [],
  },
];

export default function DeviceSync() {
  return (
    <div className="rr-sync" data-stagger>
      {CARDS.map(({ key, title, desc, stage, badges }) => (
        <article className="rr-sync-card" key={key}>
          <div className="rr-sync-stage">{stage}</div>
          <h3>{title}</h3>
          <p>{desc}</p>
          {badges.length > 0 && (
            <ul className="rr-sync-badges" aria-label={`Available on ${badges.map((b) => b.label).join(', ')}`}>
              {badges.map(({ icon: Icon, label, color }) => (
                <li key={label}><Icon size={16} color={color} aria-hidden="true" /> {label}</li>
              ))}
            </ul>
          )}
        </article>
      ))}
    </div>
  );
}
