import { Link } from 'react-router-dom';
import { usePageMeta } from '../hooks/usePageMeta';
import LegalDoc, { type LegalSection } from '../components/site/LegalDoc';

const policySections: LegalSection[] = [
  {
    id: 'intro',
    title: 'Who We Are',
    summary: 'Reprummble and our commitment to your privacy',
    details: (
      <>
        <p>
          Reprummble ("we," "our," or "us") operates the Reprummble website and
          mobile application (the "Service"). We are the data controller responsible
          for your personal data under applicable data protection laws, including the
          General Data Protection Regulation (GDPR) and the California Consumer
          Privacy Act (CCPA).
        </p>
        <p>
          This Privacy Policy explains exactly what data we collect, why we collect
          it, how long we keep it, and the rights you have over it. We are committed
          to full transparency — if anything is unclear, contact us at{' '}
          <strong>privacy@reprummble.com</strong>.
        </p>
        <p className="highlight-box">
          <strong>The short version:</strong> We collect only what we need to run the
          Service, we never sell your data, and you can delete everything at any time.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'Data We Collect',
    summary: 'Account info, health data, usage signals, and cookies',
    details: (
      <>
        <h4>Account & Identity</h4>
        <ul>
          <li>Name and email address when you register</li>
          <li>Profile photo (optional)</li>
          <li>Password (stored as a one-way hash — we cannot read it)</li>
          <li>Basic profile details from Google, Apple, or Facebook if you use them to sign in</li>
          <li>Whether you have verified your email address (we email you a confirmation link when you sign up)</li>
        </ul>
        <h4>Health & Fitness Data</h4>
        <ul>
          <li>Workout logs, exercise types, sets, reps, and duration</li>
          <li>Meal entries, food photos, and nutrition estimates</li>
          <li>Body metrics — weight, height, and measurements you enter</li>
          <li>Sleep, HRV, resting heart rate, and recovery scores from wearables</li>
          <li>Goals and personal targets you set</li>
        </ul>
        <h4>Business & Referral Data</h4>
        <ul>
          <li>
            If you apply to collaborate as a business: your business name, type, city, size,
            contact email, and any message you write in the application
          </li>
          <li>
            If you run a business account: the names and email addresses of members and team
            members you add, and the workout and meal plans, foods, and settings you create
          </li>
          <li>Your personal invite code, and which accounts joined using it</li>
        </ul>
        <h4>Device & Wearable Data</h4>
        <ul>
          <li>Data synced from Apple Watch, Oura Ring, Garmin, Whoop, Fitbit, and other connected devices</li>
          <li>We only import data you explicitly authorise through each device's permission screen</li>
        </ul>
        <h4>Usage & Technical Data</h4>
        <ul>
          <li>Pages visited, features used, and session duration</li>
          <li>Device type, operating system, browser version, and IP address</li>
          <li>Crash reports and error logs to fix bugs</li>
        </ul>
        <h4>Cookies & Tracking</h4>
        <ul>
          <li><strong>Essential cookies</strong> — Required for authentication and session management</li>
          <li><strong>Analytics cookies</strong> — Aggregate, anonymised usage statistics (opt-out available)</li>
          <li>We do not use advertising or cross-site tracking cookies</li>
        </ul>
      </>
    ),
  },
  {
    id: 'use',
    title: 'How We Use Your Data',
    summary: 'Running the service, personalisation, and product improvement',
    details: (
      <>
        <p>We use your data only for the following purposes:</p>
        <ul>
          <li>
            <strong>Provide and operate the Service</strong> — Creating your account,
            authenticating you, and delivering the features you use.
          </li>
          <li>
            <strong>Personalise your experience</strong> — Tailoring training plans,
            nutrition targets, and recommendations to your goals and progress.
          </li>
          <li>
            <strong>Generate health insights</strong> — Analysing your data to surface
            trends, readiness scores, and actionable weekly reports.
          </li>
          <li>
            <strong>Process payments</strong> — Securely handling subscription billing
            through a third-party payment processor, once online billing is available.
          </li>
          <li>
            <strong>Send service communications</strong> — Transactional emails such as
            password resets, billing receipts, and security alerts. Marketing emails
            only with your explicit consent.
          </li>
          <li>
            <strong>Improve the product</strong> — Aggregated, anonymised analytics to
            understand which features work and which need fixing.
          </li>
          <li>
            <strong>Run business accounts and referrals</strong> — Reviewing applications to
            collaborate, giving approved businesses access to their dashboard, and applying
            the discount you earn when a friend joins through your invite link.
          </li>
          <li>
            <strong>Provide customer support</strong> — Responding to your questions via
            live chat and email.
          </li>
          <li>
            <strong>Prevent fraud and abuse</strong> — Detecting suspicious activity to
            protect the security of all users.
          </li>
        </ul>
        <p>
          We rely on the following legal bases under GDPR: <strong>performance of a
          contract</strong> (to provide the Service you signed up for),{' '}
          <strong>legitimate interests</strong> (analytics, security, product
          improvement), and <strong>consent</strong> (marketing communications).
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who We Share Data With',
    summary: 'We never sell your data. Limited sharing with trusted processors only.',
    details: (
      <>
        <p className="highlight-box">
          <strong>We do not sell, rent, or trade your personal data or health data. Ever.</strong>
        </p>
        <p>
          We share data only with the following categories of third parties, under strict
          contractual data-processing agreements:
        </p>
        <ul>
          <li>
            <strong>Cloud infrastructure</strong> — Our servers run on trusted providers
            (e.g. AWS, Supabase). Your data is encrypted in transit and at rest.
          </li>
          <li>
            <strong>Payment processor</strong> — When online billing opens, a third-party
            payment processor will handle payment card data. We will not store full card
            numbers.
          </li>
          <li>
            <strong>Email delivery</strong> — Transactional email providers for sending
            account notifications.
          </li>
          <li>
            <strong>Analytics</strong> — Aggregate, anonymised usage data with analytics
            tools. No personally identifiable data is shared.
          </li>
          <li>
            <strong>Gyms, coaches, and other businesses you join</strong> — Only the limited
            activity summary described under "Gyms, Coaches & Other Businesses" below.
          </li>
          <li>
            <strong>At your request</strong> — If you choose to share a health report
            with your doctor or coach, we share only what you select.
          </li>
          <li>
            <strong>Legal obligations</strong> — If required by law, court order, or to
            protect the rights and safety of users or the public.
          </li>
          <li>
            <strong>Business transfers</strong> — In the event of a merger or acquisition,
            you will be notified before your data is transferred to a new entity.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'business',
    title: 'Gyms, Coaches & Other Businesses',
    summary: 'What a business can see if you join Reprummble through them',
    details: (
      <>
        <p>
          Some people use Reprummble through a gym, coach, nutritionist, clinic, employer,
          or club (a "Business"). A Business can invite you by email and assign you workout
          or meal plans.
        </p>
        <p className="highlight-box">
          <strong>Nothing is shared until you sign up and verify that email address.</strong>{' '}
          Being invited does not give a Business access to anything about you.
        </p>
        <h4>What a Business can see</h4>
        <ul>
          <li>The name and email address they invited you with</li>
          <li>The workout and meal plans they have assigned to you</li>
          <li>
            A summary of your workout activity: how many workouts you completed recently,
            the date of your last workout, and how that compares with your assigned plan
          </li>
        </ul>
        <h4>What a Business cannot see</h4>
        <ul>
          <li>Your meal logs, food photos, and nutrition entries</li>
          <li>Wearable data such as sleep, heart rate, and recovery scores</li>
          <li>Your body measurements, goals, messages, or payment details</li>
        </ul>
        <h4>Who at the Business can see it</h4>
        <p>
          The Business owner decides which team members (coaches, nutritionists, viewers)
          can see member information. Each role has limited permissions, and a Business can
          only see its own members.
        </p>
        <h4>Stopping sharing</h4>
        <p>
          Ask the Business to remove you from their member list, or contact us at{' '}
          <strong>privacy@reprummble.com</strong> and we will help. Removing your Reprummble
          account also ends the link.
        </p>
        <p>
          Businesses decide how to use the information they receive and must follow our
          Terms and applicable law. We review every Business application and can withdraw a
          Business's access at any time.
        </p>
        <h4>If you are a Business</h4>
        <p>
          We use your application details to review your request and to contact you about
          it, and we keep them while your business account is active and for a reasonable
          period afterwards. You are responsible for having the right to add the people you
          invite and for how you use the data you receive.
        </p>
      </>
    ),
  },
  {
    id: 'referrals',
    title: 'Referrals',
    summary: 'What happens to your data when you invite a friend or join through an invite',
    details: (
      <>
        <p>
          Every account has a personal invite code. When someone creates a new account
          through your link, we record that connection so we can give you each a discount
          toward your next subscription.
        </p>
        <ul>
          <li>
            <strong>You see:</strong> how many friends joined through your link and the
            discount you have earned. We do not show you their names or details.
          </li>
          <li>
            <strong>Your friend sees:</strong> nothing about you beyond the discount they
            receive.
          </li>
          <li>We do not use referral data for advertising.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'security',
    title: 'How We Protect Your Data',
    summary: 'Encryption, access controls, and continuous monitoring',
    details: (
      <>
        <p>We implement multiple layers of security:</p>
        <ul>
          <li>
            <strong>Encryption in transit</strong> — All data sent between your device
            and our servers uses TLS 1.2 or higher.
          </li>
          <li>
            <strong>Encryption at rest</strong> — Sensitive data including health records
            is encrypted in our databases.
          </li>
          <li>
            <strong>Password hashing</strong> — Passwords are stored using bcrypt with
            a high work factor. We cannot see your password.
          </li>
          <li>
            <strong>Access controls</strong> — Strict role-based access. Only employees
            with a legitimate need can access user data, and all access is logged.
          </li>
          <li>
            <strong>Security monitoring</strong> — Automated alerting for anomalous
            activity and attempted breaches.
          </li>
          <li>
            <strong>Regular reviews</strong> — We periodically review security practices
            and update them as threats evolve.
          </li>
        </ul>
        <p>
          If you discover a security vulnerability, please contact us immediately at{' '}
          <strong>security@reprummble.com</strong>. Do not disclose it publicly until
          we have had the opportunity to address it.
        </p>
        <p>
          No system is 100% secure. In the event of a data breach that affects your
          rights, we will notify you within 72 hours as required by GDPR.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your Rights',
    summary: 'Access, correct, delete, port, restrict, or object at any time',
    details: (
      <>
        <p>
          Depending on your location, you have some or all of the following rights over
          your personal data:
        </p>
        <ul>
          <li>
            <strong>Access</strong> — Request a copy of all personal data we hold about
            you (data subject access request).
          </li>
          <li>
            <strong>Correction</strong> — Ask us to fix inaccurate or incomplete
            information.
          </li>
          <li>
            <strong>Erasure</strong> — Request deletion of your account and all associated
            data ("right to be forgotten").
          </li>
          <li>
            <strong>Data portability</strong> — Download your data in a machine-readable
            format (JSON or CSV).
          </li>
          <li>
            <strong>Restriction</strong> — Ask us to pause processing while a dispute is
            resolved.
          </li>
          <li>
            <strong>Objection</strong> — Object to processing based on legitimate interests,
            including direct marketing.
          </li>
          <li>
            <strong>Withdraw consent</strong> — Where processing is based on consent, you
            can withdraw it at any time without affecting previous processing.
          </li>
        </ul>
        <p>
          CCPA rights (California residents): Right to know, right to delete, right to
          opt out of sale (we do not sell data), and right to non-discrimination for
          exercising rights.
        </p>
        <p>
          To exercise any right, use the in-app settings, start a live chat, or email{' '}
          <strong>privacy@reprummble.com</strong>. We respond within 30 days (GDPR) or
          45 days (CCPA).
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How Long We Keep Data',
    summary: 'Active accounts kept; deleted within 30 days of closure',
    details: (
      <>
        <p>We retain data only as long as necessary:</p>
        <ul>
          <li>
            <strong>Active account data</strong> — Kept for as long as your account
            exists or as needed to provide the Service.
          </li>
          <li>
            <strong>Health and fitness logs</strong> — Retained until you delete them or
            your account is closed.
          </li>
          <li>
            <strong>Account deletion</strong> — All personal data is permanently deleted
            within 30 days of account closure, unless a longer retention period is
            required by law (e.g. tax or financial records retained for 7 years).
          </li>
          <li>
            <strong>Anonymised analytics</strong> — Aggregate, de-identified usage data
            may be retained indefinitely as it cannot be linked back to you.
          </li>
          <li>
            <strong>Support records</strong> — Chat and email records retained for 2 years
            to resolve disputes and improve support quality.
          </li>
        </ul>
        <p>
          You can delete individual entries (workouts, meals, body metrics) at any time
          within the app without closing your account.
        </p>
      </>
    ),
  },
  {
    id: 'international',
    title: 'International Transfers',
    summary: 'Data may be processed outside your country with appropriate safeguards',
    details: (
      <>
        <p>
          Reprummble operates globally. Your data may be processed in countries outside
          your own, including the United States, where our cloud infrastructure is
          hosted.
        </p>
        <p>
          Where we transfer personal data outside the European Economic Area (EEA), we
          ensure adequate protection is in place through:
        </p>
        <ul>
          <li>
            <strong>Standard Contractual Clauses (SCCs)</strong> — EU-approved contracts
            with our data processors.
          </li>
          <li>
            <strong>Adequacy decisions</strong> — Transfers to countries recognised by
            the European Commission as providing adequate protection.
          </li>
        </ul>
        <p>
          You can request details of the safeguards applicable to your data transfer by
          contacting <strong>privacy@reprummble.com</strong>.
        </p>
      </>
    ),
  },
  {
    id: 'thirdparty',
    title: 'Third-Party Integrations',
    summary: 'Wearables and health apps have their own privacy policies',
    details: (
      <>
        <p>
          Connecting wearables and health apps (Apple Health, Google Fit, Oura, Garmin
          Connect, Whoop, Fitbit) is entirely optional. When you connect a device:
        </p>
        <ul>
          <li>
            <strong>You control what is shared</strong> — You grant permissions through
            the third-party's own authorisation screen.
          </li>
          <li>
            <strong>We import only what you allow</strong> — We request only the minimum
            permissions needed for the features you use.
          </li>
          <li>
            <strong>You can disconnect at any time</strong> — Revoking access in app
            settings stops future imports and we delete previously synced data on request.
          </li>
          <li>
            <strong>Independent policies apply</strong> — Each service has its own privacy
            policy. We recommend reviewing them before connecting.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Age Requirements',
    summary: 'Service is for users 16 and older',
    details: (
      <>
        <p>
          Reprummble is not intended for users under 16 years of age. By creating an
          account you confirm you are at least 16.
        </p>
        <p>
          We do not knowingly collect personal data from children under 16. If you
          believe we have inadvertently collected such data, please contact us at{' '}
          <strong>privacy@reprummble.com</strong> and we will delete it promptly.
        </p>
        <p>
          Users aged 16–18 should obtain parental or guardian consent before using the
          Service, as required by the laws of their jurisdiction.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Policy Updates',
    summary: 'We notify you before significant changes take effect',
    details: (
      <>
        <p>
          We review this Privacy Policy at least annually and whenever our practices
          change. When we make updates:
        </p>
        <ul>
          <li>We update the "Last updated" date at the top of this page.</li>
          <li>
            For minor clarifications, no further notice is required beyond this page.
          </li>
          <li>
            For material changes (new types of data collection, new sharing partners, or
            reduced rights), we will notify you by email and/or in-app notification at
            least 14 days before the changes take effect.
          </li>
          <li>
            Where required by law, we will seek fresh consent before processing your
            data under new terms.
          </li>
        </ul>
        <p>
          Continued use of the Service after changes take effect constitutes your
          acceptance of the updated policy.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact & Complaints',
    summary: 'Reach our privacy team or file a regulator complaint',
    details: (
      <>
        <p>
          For any questions, requests, or concerns about this Privacy Policy or how
          we handle your data:
        </p>
        <ul>
          <li>
            <strong>Live chat</strong> — Fastest response, available on every page of
            the app.
          </li>
          <li>
            <strong>Email</strong> — privacy@reprummble.com (respond within 2 business
            days).
          </li>
          <li>
            <strong>Support page</strong> — <Link to="/contact">reprummble.com/contact</Link>
          </li>
        </ul>
        <p>
          If you are not satisfied with our response, you have the right to lodge a
          complaint with your local data protection authority (e.g. the ICO in the UK,
          or your EU Member State's supervisory authority).
        </p>
      </>
    ),
  },
];

export default function Privacy() {
  usePageMeta({
    title: 'Privacy Policy',
    description: 'How Reprummble collects, uses, and protects your personal data, and what gyms and coaches can see.',
    canonical: '/privacy',
  });
  return (
    <LegalDoc
      badge="Privacy Policy"
      title="Your data, explained clearly."
      updated="October 2026"
      lead="We do not sell your data. Ever. Here is what we collect, why, who can see it, and the choices you have."
      sections={policySections}
    />
  );
}
