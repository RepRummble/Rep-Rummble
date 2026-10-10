import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const STORAGE_KEY = 'rr_cookie_consent';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="cookie-banner" role="dialog" aria-label="Cookie consent">
      <p className="cookie-banner-text">
        We use cookies to improve your experience and analyse site traffic.{' '}
        <Link to="/privacy" className="cookie-banner-link">Learn more</Link>.
      </p>
      <div className="cookie-banner-actions">
        <button className="ghost-btn cookie-decline-btn" onClick={decline} type="button">
          Decline
        </button>
        <button className="solid-btn cookie-accept-btn" onClick={accept} type="button">
          Accept
        </button>
      </div>
    </div>
  );
}
