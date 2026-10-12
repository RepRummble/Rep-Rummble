import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import './App.css';
import Layout from './components/Layout';
import Home from './pages/Home';
import Features from './pages/Features';
import Pricing from './pages/Pricing';
import ForGyms from './pages/ForGyms';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Wearables from './pages/Wearables';
import Profile from './pages/Profile';
import Referral from './pages/Referral';
import Payment from './pages/Payment';
import FAQ from './pages/FAQ';
import Contact from './pages/Contact';
import Privacy from './pages/Privacy';
import Terms from './pages/Terms';
import NotFound from './pages/NotFound';
import AgentDashboard from './pages/agent/AgentDashboard';
import AuthCallback from './pages/AuthCallback';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="features" element={<Features />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="for-gyms" element={<ForGyms />} />
          <Route path="services" element={<Navigate to="/features" replace />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="wearables" element={<Wearables />} />
          <Route path="plans" element={<Navigate to="/pricing" replace />} />
          <Route path="profile" element={<Profile />} />
          <Route path="referral" element={<Referral />} />
          <Route path="payment" element={<Payment />} />
          <Route path="faq" element={<FAQ />} />
          <Route path="contact" element={<Contact />} />
          <Route path="signin" element={<Navigate to="/?auth=signin" replace />} />
          <Route path="signup" element={<Navigate to="/?auth=signup" replace />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="terms" element={<Terms />} />
          <Route path="agent" element={<AgentDashboard />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
