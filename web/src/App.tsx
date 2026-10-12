import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import Home from './pages/Home';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import Collaborate from './pages/Collaborate';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import AgentDashboard from './pages/agent/AgentDashboard';
import AuthCallback from './pages/AuthCallback';
import OAuthConsent from './pages/OAuthConsent';
import AccountLayout from './pages/account/AccountLayout';
import AccountDashboard from './pages/account/Dashboard';
import AccountReports from './pages/account/Reports';
import AccountWearables from './pages/account/Wearables';
import AccountReferral from './pages/account/Referral';
import AccountBilling from './pages/account/Billing';
import AccountProfile from './pages/account/Profile';
import InviteRedirect from './pages/account/InviteRedirect';
import ReferralClaimer from './components/ReferralClaimer';
import BusinessLayout from './pages/business/BusinessLayout';
import BusinessApplications from './pages/admin/Applications';
import BusinessOverview from './pages/business/Overview';
import BusinessMembers from './pages/business/Members';
import BusinessWorkouts from './pages/business/WorkoutPlans';
import BusinessNutrition from './pages/business/Nutrition';
import BusinessReports from './pages/business/Reports';
import BusinessSettings from './pages/business/Settings';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <ReferralClaimer />
      <Routes>
        <Route path="dashboard" element={<AccountLayout />}>
          <Route index element={<AccountDashboard />} />
          <Route path="reports" element={<AccountReports />} />
          <Route path="wearables" element={<AccountWearables />} />
          <Route path="referral" element={<AccountReferral />} />
          <Route path="billing" element={<AccountBilling />} />
          <Route path="profile" element={<AccountProfile />} />
        </Route>
        <Route path="admin/applications" element={<BusinessApplications />} />
        <Route path="business" element={<BusinessLayout />}>
          <Route index element={<BusinessOverview />} />
          <Route path="members" element={<BusinessMembers />} />
          <Route path="workouts" element={<BusinessWorkouts />} />
          <Route path="nutrition" element={<BusinessNutrition />} />
          <Route path="reports" element={<BusinessReports />} />
          <Route path="settings" element={<BusinessSettings />} />
        </Route>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="features" element={<Features />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="collaborate" element={<Collaborate />} />
          <Route path="for-gyms" element={<Navigate to="/collaborate" replace />} />
          <Route path="services" element={<Navigate to="/features" replace />} />
          <Route path="analytics" element={<Navigate to="/dashboard" replace />} />
          <Route path="reports" element={<Navigate to="/dashboard/reports" replace />} />
          <Route path="wearables" element={<Navigate to="/dashboard/wearables" replace />} />
          <Route path="invite/:code" element={<InviteRedirect />} />
          <Route path="plans" element={<Navigate to="/pricing" replace />} />
          {/* Workout content now lives only in the app; send old links home. */}
          {['workouts', 'programs', 'challenges', 'exercises'].map((path) => (
            <Route key={path} path={`${path}/*`} element={<Navigate to="/" replace />} />
          ))}
          <Route path="profile" element={<Navigate to="/dashboard/profile" replace />} />
          <Route path="referral" element={<Navigate to="/dashboard/referral" replace />} />
          <Route path="payment" element={<Navigate to="/dashboard/billing" replace />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="contact" element={<Contact />} />
          <Route path="signin" element={<Navigate to="/?auth=signin" replace />} />
          <Route path="signup" element={<Navigate to="/?auth=signup" replace />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="agent" element={<AgentDashboard />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="oauth/consent" element={<OAuthConsent />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
