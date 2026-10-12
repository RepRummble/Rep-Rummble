import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import LegalDoc, { type LegalSection } from '../components/site/LegalDoc';

const termsSections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    summary: 'By using Reprummble you agree to these Terms',
    details: (
      <>
        <p>
          By accessing or using the Reprummble website or mobile application (the
          "Service"), you confirm that you have read, understood, and agree to be
          bound by these Terms of Service ("Terms") and our{' '}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>
        <p>
          If you do not agree to these Terms, you must not use the Service. If you
          are using the Service on behalf of an organisation, you represent that you
          have authority to bind that organisation to these Terms.
        </p>
        <p>
          These Terms form a legally binding agreement between you and Reprummble.
          If any provision is found to be unenforceable, the remaining provisions
          continue in full force.
        </p>
      </>
    ),
  },
  {
    id: 'service',
    title: 'What We Provide',
    summary: 'Training, nutrition, recovery tools and analytics',
    details: (
      <>
        <p>
          Reprummble is a health and fitness platform that provides tools for
          tracking workouts, nutrition, recovery, and progress. The Service includes:
        </p>
        <ul>
          <li>
            <strong>Personalised training plans</strong> — AI-built programmes that
            adapt to your goals, schedule, and available equipment.
          </li>
          <li>
            <strong>Nutrition logging and tracking</strong> — Meal logging, macro
            tracking, and AI-powered food estimates.
          </li>
          <li>
            <strong>Recovery and readiness scoring</strong> — Sleep, HRV, and
            resting heart rate analysis.
          </li>
          <li>
            <strong>Wearable device integration</strong> — Sync with Apple Watch,
            Oura Ring, Garmin, Whoop, Fitbit, and compatible devices.
          </li>
          <li>
            <strong>Analytics and reports</strong> — Weekly insights, progress
            charts, and shareable health reports.
          </li>
          <li>
            <strong>Challenges and community</strong> — Group challenges, leaderboards,
            and coach nudges.
          </li>
          <li>
            <strong>Customer support</strong> — Live chat and email assistance.
          </li>
        </ul>
        <p>
          We may update, expand, or discontinue features at any time. We will give
          reasonable notice before removing core features that paying subscribers rely on.
        </p>
      </>
    ),
  },
  {
    id: 'medical',
    title: 'Medical Disclaimer',
    summary: 'Reprummble is not a medical service — always consult a professional',
    details: (
      <>
        <div className="highlight-box">
          <p>
            <strong>
              Reprummble is not a medical device, medical service, or healthcare
              provider. Nothing in the Service constitutes medical advice, diagnosis,
              or treatment.
            </strong>
          </p>
        </div>
        <p>
          All content, including training plans, nutrition estimates, readiness
          scores, and AI recommendations, is provided for general informational and
          educational purposes only.
        </p>
        <p>
          <strong>Always consult a qualified healthcare professional</strong> before
          starting a new exercise programme, making changes to your diet, or acting
          on any health information provided by the Service — particularly if you
          have pre-existing medical conditions, allergies, injuries, or chronic illness.
        </p>
        <p>
          Nutritional information is estimated by AI and may not be accurate for all
          foods, brands, or portion sizes. Do not use these estimates as the sole
          basis for medical decisions, especially if you have diabetes, eating
          disorders, or other diet-sensitive conditions.
        </p>
        <p>
          <strong>
            Reprummble is not liable for any injury, illness, or health outcome
            resulting from use of, or reliance on, information provided through the
            Service.
          </strong>
        </p>
      </>
    ),
  },
  {
    id: 'account',
    title: 'Account Registration',
    summary: 'You are responsible for your account and its security',
    details: (
      <>
        <p>To access most features you must create an account. You agree to:</p>
        <ul>
          <li>Provide accurate, current, and complete registration information.</li>
          <li>
            Keep your login credentials confidential and not share them with any
            third party.
          </li>
          <li>
            Notify us immediately at <strong>support@reprummble.com</strong> if you
            suspect unauthorised access to your account.
          </li>
          <li>
            Be solely responsible for all activity that occurs under your account.
          </li>
          <li>Use the Service only for lawful purposes and in accordance with these Terms.</li>
          <li>Not create more than one account without our express permission.</li>
          <li>
            Verify your email address using the link we send when you sign up. Some
            features, such as team access and invitations from a business, only work with a
            verified email.
          </li>
        </ul>
        <p>
          <strong>Age requirement:</strong> You must be at least 16 years old to
          create an account. Users under 18 should obtain parental or guardian
          consent. We do not knowingly allow children under 16 to use the Service.
        </p>
        <p>
          We reserve the right to suspend or terminate accounts that provide false
          information or violate these Terms.
        </p>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Subscriptions & Billing',
    summary: 'Free trial, recurring billing, cancellations, and refunds',
    details: (
      <>
        <h4>Free Trial</h4>
        <p>
          New users may access a free trial period. No credit card is required to
          start. After the trial ends, continued access to paid features requires
          an active subscription.
        </p>

        <h4>Subscription Plans</h4>
        <ul>
          <li>
            <strong>Free</strong> — No charge, with limited access to core tracking features.
          </li>
          <li>
            <strong>Pro</strong> — Paid monthly; full access to personalized training
            plans, AI meal analysis, wearable sync, recovery scores, and advanced analytics.
            Pro may be included for members of participating partner gyms.
          </li>
          <li>
            <strong>Premium</strong> — Paid monthly; includes everything in Pro plus
            coach check-ins, custom nutrition plans, and priority support.
          </li>
          <li>
            <strong>Partner gym programs</strong> — Optional programs sold by partner
            gyms and coaches, priced individually by the partner.
          </li>
        </ul>
        <p>
          Current prices are displayed on the <Link to="/pricing">Pricing page</Link>.
          All prices are shown inclusive of applicable taxes where required by law.
        </p>

        <h4>Automatic Renewal</h4>
        <p>
          Paid subscriptions renew automatically at the end of each billing period
          unless cancelled before the renewal date. We will send a reminder before
          annual renewals.
        </p>

        <h4>Price Changes</h4>
        <p>
          We may change subscription prices with at least 30 days' notice. Existing
          subscribers will be notified by email before any price change affects their
          billing.
        </p>

        <h4>Cancellation</h4>
        <p>
          You may cancel at any time through the app settings or by contacting
          support. Cancellation takes effect at the end of the current billing period.
          You retain access to paid features until then.
        </p>

        <h4>Refunds</h4>
        <ul>
          <li>
            If you cancel within 7 days of the first paid charge and have not
            significantly used the Service, you may request a full refund.
          </li>
          <li>
            Refunds for in-app purchases made through Apple App Store or Google Play
            are governed by their respective refund policies.
          </li>
          <li>No refunds are provided for partial billing periods.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'business',
    title: 'Business Accounts & Collaboration',
    summary: 'Rules for gyms, coaches, and other businesses that use Reprummble',
    details: (
      <>
        <p>
          Businesses (gyms, studios, coaches, nutritionists, clinics, employers, clubs, and
          similar) can apply to collaborate with Reprummble. This section applies in
          addition to the rest of these Terms.
        </p>
        <h4>Applying and approval</h4>
        <ul>
          <li>
            Applying does not guarantee approval. We review every application, may ask for
            more information, and may approve or decline it.
          </li>
          <li>
            Access to the business dashboard begins when we approve your application. We
            may suspend or withdraw it at any time, for example if these Terms are broken
            or members are put at risk. We will tell you when we do.
          </li>
          <li>You must give us accurate information and keep it up to date.</li>
        </ul>
        <h4>Your responsibilities</h4>
        <ul>
          <li>
            Only add people you have the right to invite, and only use member information
            to look after those members.
          </li>
          <li>
            Choose team members and roles carefully. You are responsible for what your team
            does in your account, and for removing people who should no longer have access.
          </li>
          <li>
            Do not share, sell, or use member information for marketing or any purpose
            unrelated to training and nutrition support, and follow applicable privacy and
            health-data laws.
          </li>
          <li>
            The plans and advice you give are yours, not Reprummble's. You are responsible
            for them being safe and suitable. Reprummble is not a medical provider.
          </li>
        </ul>
        <h4>Money</h4>
        <p>
          Any revenue share, pricing, or payout arrangement is agreed with Reprummble in
          writing during onboarding and is not created by these Terms or by the marketing
          pages on our website.
        </p>
      </>
    ),
  },
  {
    id: 'referrals',
    title: 'Referral Program',
    summary: 'How invite discounts work, and what is not allowed',
    details: (
      <>
        <ul>
          <li>
            When a friend creates a <strong>new</strong> account through your invite link,
            you and your friend each earn a 5% discount toward your next subscription.
          </li>
          <li>
            Discounts add up to a maximum of 25% per person. After you reach that, further
            referrals still reward your friend, but no more discount is added to you.
          </li>
          <li>
            Invite links work only for accounts created in the last seven days, and each
            account can use one invite. You cannot use your own link.
          </li>
          <li>
            Discounts have no cash value, cannot be transferred or sold, and apply to a
            future subscription payment once online billing is available.
          </li>
        </ul>
        <p>
          We may withhold, cancel, or change rewards, or close accounts, if we believe the
          program is being abused, for example by creating fake or duplicate accounts. We
          may change or end the program at any time; discounts already earned stay valid
          for the next subscription payment unless they were obtained by abuse.
        </p>
      </>
    ),
  },
  {
    id: 'content',
    title: 'Your Content',
    summary: 'You own your data; we need a limited licence to run the Service',
    details: (
      <>
        <p>
          You retain full ownership of all content you create or upload ("Your
          Content"), including workout logs, meal photos, body metrics, personal
          notes, and progress data.
        </p>
        <p>
          By uploading Your Content, you grant Reprummble a non-exclusive,
          royalty-free, worldwide licence to use, store, display, and process it
          solely for the purpose of providing and improving the Service. We do not
          use your personal health data for advertising or sell it to third parties.
        </p>
        <p>You agree not to upload content that:</p>
        <ul>
          <li>Violates any applicable law or the rights of any third party.</li>
          <li>
            Infringes intellectual property rights (copyright, trademark, patents).
          </li>
          <li>Contains malware, spyware, viruses, or other harmful code.</li>
          <li>Is defamatory, obscene, harassing, threatening, or abusive.</li>
          <li>Is false or misleading.</li>
        </ul>
        <p>
          We may remove content that violates these Terms without notice, and may
          terminate accounts of repeat offenders.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable',
    title: 'Acceptable Use',
    summary: 'Fair use rules that protect all members',
    details: (
      <>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any applicable local, national, or international law or regulation.</li>
          <li>
            Attempt to gain unauthorised access to our systems, other users' accounts,
            or related infrastructure.
          </li>
          <li>
            Interfere with, disrupt, or degrade the performance of the Service or its
            underlying infrastructure.
          </li>
          <li>
            Reverse engineer, decompile, disassemble, or otherwise attempt to derive
            the source code of the Service.
          </li>
          <li>
            Use automated tools, bots, scrapers, or crawlers to access the Service
            without prior written permission.
          </li>
          <li>Impersonate any person or entity, or misrepresent your affiliation.</li>
          <li>
            Engage in spam, phishing, or any fraudulent activity targeting other users
            or Reprummble staff.
          </li>
          <li>
            Publicly disclose security vulnerabilities before we have had a reasonable
            opportunity to address them.
          </li>
          <li>
            Use the Service for commercial purposes without our express written consent.
          </li>
        </ul>
        <p>
          Violation may result in immediate suspension or permanent termination of your
          account, and we reserve the right to pursue legal remedies where appropriate.
        </p>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Intellectual Property',
    summary: 'Reprummble owns its software, branding, and content',
    details: (
      <>
        <p>
          The Reprummble name, logo, app design, algorithms, software, database
          structure, written content, and all other materials (excluding Your Content)
          are owned by or licensed to Reprummble and protected by copyright, trademark,
          and other intellectual property laws.
        </p>
        <p>We grant you a limited, non-exclusive, non-transferable licence to use the
          Service for personal, non-commercial purposes, subject to these Terms.
        </p>
        <p>You agree not to:</p>
        <ul>
          <li>Copy, reproduce, modify, or create derivative works based on our software or content.</li>
          <li>Distribute, sublicence, sell, or commercially exploit the Service.</li>
          <li>Use our trademarks, logos, or brand elements without prior written permission.</li>
          <li>Remove, obscure, or alter any copyright, trademark, or proprietary notices.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'thirdparty',
    title: 'Third-Party Services',
    summary: 'Integrations with wearables, payment processors, and health apps',
    details: (
      <>
        <p>
          The Service integrates with third-party platforms including, but not limited
          to, Apple Health, Google Fit, Oura Ring, Garmin Connect, Whoop, Fitbit,
          and payment processors.
        </p>
        <p>
          <strong>We are not responsible for:</strong>
        </p>
        <ul>
          <li>The content, accuracy, or availability of third-party services.</li>
          <li>Their privacy practices, data handling, or terms of service.</li>
          <li>
            Any harm arising from your use of third-party services, including billing
            issues with payment processors.
          </li>
        </ul>
        <p>
          You must review and comply with the terms and privacy policies of any
          third-party service you connect to Reprummble. We provide links to their
          policies in the relevant integration settings.
        </p>
      </>
    ),
  },
  {
    id: 'warranties',
    title: 'Disclaimers',
    summary: 'The Service is provided "as is" without guarantees',
    details: (
      <>
        <p className="highlight-box">
          <strong>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICE IS
            PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EXPRESS OR IMPLIED.
          </strong>
        </p>
        <p>We do not warrant that:</p>
        <ul>
          <li>The Service will be uninterrupted, error-free, or available at all times.</li>
          <li>The Service is completely free from viruses or other harmful components.</li>
          <li>AI-generated nutrition estimates, training suggestions, or health insights are accurate for your specific circumstances.</li>
          <li>All features will function correctly on all devices or operating systems.</li>
          <li>Data from wearable integrations will be complete or error-free.</li>
        </ul>
        <p>
          All AI-generated recommendations are estimates provided for informational
          purposes only. They should not replace professional medical, nutritional,
          or fitness advice.
        </p>
      </>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    summary: 'Our liability is limited to fees paid in the last 12 months',
    details: (
      <>
        <p>
          <strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW,</strong>{' '}
          Reprummble and its officers, directors, employees, and agents shall not be
          liable for any indirect, incidental, special, consequential, or punitive
          damages, including but not limited to:
        </p>
        <ul>
          <li>Loss of profits, revenue, data, or business.</li>
          <li>Personal injury or health outcomes from following Service recommendations.</li>
          <li>Unauthorised access to or alteration of your data.</li>
          <li>
            Errors or downtime in third-party integrations (wearables, payment
            processors, health apps).
          </li>
          <li>Deletion of your data due to technical failure.</li>
        </ul>
        <p>
          Our total aggregate liability for any claims arising from these Terms or
          your use of the Service shall not exceed the total subscription fees you
          paid to us in the 12 months preceding the claim, or £50 (whichever is
          greater).
        </p>
        <p>
          Nothing in these Terms excludes liability for death or personal injury
          caused by our negligence, fraud, or fraudulent misrepresentation, or any
          liability that cannot be excluded by law.
        </p>
      </>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    summary: 'Either party may end the relationship; your data is deleted within 30 days',
    details: (
      <>
        <p>
          <strong>Termination by you:</strong> You may close your account at any
          time through app settings or by contacting{' '}
          <strong>support@reprummble.com</strong>. If you have an active paid
          subscription, cancellation takes effect at the end of your current billing
          period.
        </p>
        <p>
          <strong>Termination by us:</strong> We may suspend or terminate your
          account immediately if you:
        </p>
        <ul>
          <li>Materially breach these Terms.</li>
          <li>Engage in fraudulent, abusive, or illegal behaviour.</li>
          <li>Remain inactive for more than 24 consecutive months on a free plan.</li>
        </ul>
        <p>
          We will provide notice where practically possible, except where immediate
          termination is required to protect the Service or other users.
        </p>
        <p>
          <strong>Effect of termination:</strong> Upon account closure, your access
          to the Service ends immediately. Your personal data will be deleted within
          30 days per our Privacy Policy, unless retention is required by law.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to These Terms',
    summary: 'We notify you before material changes take effect',
    details: (
      <>
        <p>
          We may update these Terms to reflect changes in the law, new features, or
          evolving business practices.
        </p>
        <ul>
          <li>
            <strong>Minor changes</strong> (typo corrections, clarifications) — Updated
            on this page with the revised date.
          </li>
          <li>
            <strong>Material changes</strong> (new obligations, reduced rights, price
            increases) — Notified by email and/or in-app message at least 14 days
            before they take effect.
          </li>
        </ul>
        <p>
          If you disagree with material changes, you may close your account before the
          changes take effect and receive a pro-rated refund for unused subscription
          time. Continued use after the effective date constitutes acceptance.
        </p>
      </>
    ),
  },
  {
    id: 'law',
    title: 'Governing Law & Disputes',
    summary: 'English law applies; disputes resolved through negotiation first',
    details: (
      <>
        <p>
          These Terms are governed by and construed in accordance with the laws of
          England and Wales, without regard to conflict-of-law principles.
        </p>
        <p>
          <strong>Dispute resolution:</strong> We want to resolve any disagreements
          quickly and fairly. If you have a complaint:
        </p>
        <ol>
          <li>
            <strong>Contact us first</strong> — Email <strong>support@reprummble.com</strong>{' '}
            and we aim to respond within 5 business days.
          </li>
          <li>
            <strong>Formal escalation</strong> — If unresolved, disputes will be
            referred to binding arbitration under the rules of a mutually agreed
            arbitration body, except where prohibited by law.
          </li>
          <li>
            <strong>Court proceedings</strong> — Either party may seek injunctive or
            other urgent equitable relief in the courts of England and Wales.
          </li>
        </ol>
        <p>
          If you are a consumer resident in the EU or UK, you may also submit a
          complaint through the EU Online Dispute Resolution platform or your local
          consumer protection authority.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact & Support',
    summary: 'Questions? Our team is here to help',
    details: (
      <>
        <p>
          If you have questions about these Terms, your account, or anything else:
        </p>
        <ul>
          <li>
            <strong>Live chat</strong> — Click the chat button in the corner for the
            fastest response.
          </li>
          <li>
            <strong>Support email</strong> — support@reprummble.com
          </li>
          <li>
            <strong>Legal queries</strong> — legal@reprummble.com
          </li>
          <li>
            <strong>Contact form</strong> — <Link to="/contact">reprummble.com/contact</Link>
          </li>
        </ul>
        <p>We typically respond within 24–48 hours on business days.</p>
      </>
    ),
  },
];

export default function Terms() {
  usePageMeta({
    title: 'Terms of Service',
    description: 'The rules and conditions for using Reprummble, including business accounts and referrals.',
    canonical: '/terms',
  });
  return (
    <LegalDoc
      badge="Terms of Service"
      title="Clear, fair rules for using Reprummble."
      updated="October 2026"
      lead="A plain-English guide to what you can expect from us, and what we expect from you. Please read it before signing up."
      sections={termsSections}
    />
  );
}
