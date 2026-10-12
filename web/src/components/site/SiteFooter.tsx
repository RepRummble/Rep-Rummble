import { Link } from 'react-router-dom';
import StoreButtons from './StoreButtons';

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
            <div className="rr-footer-apps">
              <h4>Get the app</h4>
              <StoreButtons variant="dark" />
            </div>
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
              <li><Link to="/collaborate">Collaboration</Link></li>
              <li><Link to="/collaborate#apply">Apply to collaborate</Link></li>
              <li><Link to="/business">Business dashboard</Link></li>
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
