import type { IconType } from 'react-icons';
import { SiApple, SiFitbit } from 'react-icons/si';

// Brands without an icon in react-icons render as a wordmark. To use an official
// logo instead, put the SVG in web/public/brands/ and set `img: '/brands/oura.svg'`.
type Brand = { name: string; icon?: IconType; img?: string; wordmark?: string; color: string };

const BRANDS: Brand[] = [
  { name: 'Apple Health', icon: SiApple, color: '#0b1220' },
  { name: 'Garmin', wordmark: 'GARMIN', color: '#007cc3' },
  { name: 'Oura', wordmark: 'ŌURA', color: '#0b1220' },
  { name: 'Whoop', wordmark: 'WHOOP', color: '#0b1220' },
  { name: 'Fitbit', icon: SiFitbit, color: '#00b0b9' },
  { name: 'Polar', wordmark: 'POLAR', color: '#d10027' },
];

function BrandChip({ brand, index }: { brand: Brand; index: number }) {
  const Icon = brand.icon;
  return (
    <li className="rr-device" style={{ animationDelay: `${(index % BRANDS.length) * -0.7}s` }}>
      {brand.img ? (
        <img src={brand.img} alt="" className="rr-device-img" />
      ) : Icon ? (
        <Icon className="rr-device-icon" style={{ color: brand.color }} aria-hidden="true" />
      ) : (
        <span className="rr-device-wordmark" style={{ color: brand.color }} aria-hidden="true">{brand.wordmark}</span>
      )}
      {(Icon || brand.img) && <span className="rr-device-name">{brand.name}</span>}
    </li>
  );
}

export default function DeviceMarquee() {
  return (
    <section className="rr-devices" aria-label="Compatible devices">
      <div className="rr-devices-glow" aria-hidden="true" />
      <div className="rr-container">
        <div className="rr-devices-glass">
          <p className="rr-devices-label">
            <span className="rr-eyebrow-dot" /> Works with the wearables you already own
            <small>Garmin, Oura, Whoop, Fitbit, and Polar sync through Apple Health</small>
          </p>
          <div className="rr-marquee">
            {/* Two copies make the loop seamless; the second is hidden from screen readers. */}
            <ul className="rr-marquee-track">
              {BRANDS.map((b, i) => <BrandChip brand={b} index={i} key={b.name} />)}
            </ul>
            <ul className="rr-marquee-track" aria-hidden="true">
              {BRANDS.map((b, i) => <BrandChip brand={b} index={i} key={b.name} />)}
            </ul>
          </div>
          <span className="sr-only">{BRANDS.map((b) => b.name).join(', ')}</span>
        </div>
      </div>
    </section>
  );
}
