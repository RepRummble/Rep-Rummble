import type { ReactNode } from 'react';

const IOS_URL = import.meta.env.VITE_IOS_APP_URL || '';
const ANDROID_URL = import.meta.env.VITE_ANDROID_APP_URL || '';

function StoreLink({ href, label, mini, icon, variant }: {
  href: string; label: string; mini: string; icon: ReactNode; variant: 'dark' | 'light';
}) {
  const cls = `rr-store rr-store-${variant}${href ? '' : ' is-pending'}`;
  const content = (
    <>
      {icon}
      <span className="rr-store-text">
        <span className="rr-store-mini">{mini}</span>
        <span className="rr-store-name">{label}</span>
      </span>
    </>
  );
  if (!href) {
    return <span className={cls} aria-disabled="true" title="Store link goes live at launch">{content}</span>;
  }
  return (
    <a className={cls} href={href} target="_blank" rel="noopener noreferrer" aria-label={`${mini} ${label}`}>
      {content}
    </a>
  );
}

export default function StoreButtons({ variant = 'dark' }: { variant?: 'dark' | 'light' }) {
  return (
    <div className="rr-stores">
      <StoreLink
        href={IOS_URL}
        variant={variant}
        mini="Download on the"
        label="App Store"
        icon={
          <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
            <path d="M17.56 13.9c.02 2.4 2.1 3.2 2.12 3.2-.02.05-.33 1.16-1.09 2.3-.66.99-1.36 1.98-2.44 2-1.06.02-1.4-.63-2.61-.63-1.2 0-1.58.61-2.57.65-1.05.04-1.86-1.06-2.53-2.05-1.38-2-2.43-5.64-1.02-8.1.7-1.22 1.95-2 3.3-2.02 1.03-.02 2 .7 2.61.7.62 0 1.79-.86 3.01-.73.51.02 1.95.2 2.87 1.5-.07.04-1.71 1-1.69 2.98zM14.52 4.24c.55-.66.92-1.58.82-2.49-.79.03-1.74.53-2.3 1.19-.51.58-.96 1.52-.84 2.41.89.07 1.77-.45 2.32-1.11z" />
          </svg>
        }
      />
      <StoreLink
        href={ANDROID_URL}
        variant={variant}
        mini="Get it on"
        label="Google Play"
        icon={
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path fill="#34A853" d="M3.6 1.8 13.4 12 3.6 22.2c-.4-.2-.6-.6-.6-1.1V2.9c0-.5.2-.9.6-1.1z" />
            <path fill="#FBBC04" d="m16.7 15.3-3.3-3.3 3.3-3.3 3.7 2.1c1 .6 1 1.9 0 2.5l-3.7 2z" />
            <path fill="#4285F4" d="M16.7 15.3 13.4 12 3.6 22.2c.4.2.8.2 1.2 0l11.9-6.9z" />
            <path fill="#EA4335" d="M16.7 8.7 4.8 1.8c-.4-.2-.8-.2-1.2 0L13.4 12l3.3-3.3z" />
          </svg>
        }
      />
    </div>
  );
}
