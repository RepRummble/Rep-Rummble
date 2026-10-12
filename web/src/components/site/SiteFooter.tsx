import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="rr-footer">
      <div className="rr-container">
        <div className="rr-footer-grid">
          <div>
            <Link to="/" className="rr-logo" aria-label="Reprummble home">
              <span className="rr-logo-mark">RR</span>
              <span className="rr-logo-name">Reprummble</span>
            </Link>
            <p>Training, nutrition, and recovery in one app — at a price that works for every household, and a platform that grows local gyms.</p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link to="/features">Features</Link></li>
              <li><Link to="/pricing">Pricing</Link></li>
              <li><Link to="/faq">FAQ</Link></li>
            </ul>
          </div>
          <div>
            <h4>Business</h4>
            <ul>
              <li><Link to="/for-gyms">For gyms & coaches</Link></li>
              <li><Link to="/for-gyms#apply">Become a partner</Link></li>
              <li><Link to="/contact">Contact sales</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link to="/contact">Support</Link></li>
              <li><Link to="/privacy">Privacy</Link></li>
              <li><Link to="/terms">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="rr-footer-bottom">
          <span>© {new Date().getFullYear()} Reprummble. All rights reserved.</span>
          <span>Made for everyday athletes and the gyms that train them.</span>
        </div>
      </div>
    </footer>
  );
}
