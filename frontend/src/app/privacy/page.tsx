import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Policy | BioLens",
  description: "BioLens privacy policy. How we collect, use, and protect your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100" style={{ fontFamily: "var(--font-manrope)" }}>
      <Nav />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
        <p className="text-xs text-slate-500 mb-10">Last updated: March 2026</p>

        <div className="space-y-8">
          {/* Introduction */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Introduction</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              BioLens is operated by ES&amp;A (Eric Stevens &amp; Associates). We are committed to protecting your privacy and being transparent about the data we collect. This Privacy Policy describes how we gather, use, and safeguard information when you use the BioLens platform.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Information We Collect</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              BioLens collects minimal data necessary to operate the service and improve material intelligence:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span><strong className="text-white">Search queries</strong> &mdash; The material names, product names, and barcodes you search for. These are stored anonymously to improve our material database and search relevance.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span><strong className="text-white">Product lookups</strong> &mdash; When you scan or search for a product, we record the lookup to track which products are most requested and to prioritize data coverage.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span><strong className="text-white">Anonymous usage analytics</strong> &mdash; Page views, feature usage patterns, and aggregate traffic data. This helps us understand how people use BioLens and where to focus improvements.</span>
              </li>
            </ul>
          </section>

          {/* Information We Do NOT Collect */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Information We Do NOT Collect</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              BioLens is designed to operate without personal data. We do not collect:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Personal identification information (names, email addresses, phone numbers)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Payment or financial information</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Location or geolocation data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Social media profiles or login credentials</span>
              </li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Data Sharing</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We do not sell, rent, or trade your data to third parties. Anonymous, aggregate usage data may be used internally to improve BioLens material intelligence and product coverage. We will never monetize user search data or share it with advertisers.
            </p>
          </section>

          {/* Infrastructure and Service Providers */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Infrastructure &amp; Service Providers</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              BioLens uses the following third-party services to operate:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span><strong className="text-white">Supabase</strong> &mdash; Database storage and backend services. Data is stored securely with row-level security policies.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span><strong className="text-white">Vercel</strong> &mdash; Web hosting and content delivery. Vercel processes standard HTTP request logs as part of normal web hosting operations.</span>
              </li>
            </ul>
            <p className="text-sm text-slate-300 leading-relaxed mt-4">
              These providers have their own privacy policies and are bound by their respective data processing agreements. We select providers that maintain strong security and privacy standards.
            </p>
          </section>

          {/* Cookies */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Cookies</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              BioLens uses minimal cookies strictly for session management and core functionality. We do not use advertising cookies, tracking pixels, or third-party analytics cookies. No cookie consent banner is required because we do not engage in cross-site tracking or behavioral profiling.
            </p>
          </section>

          {/* Data Retention */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Data Retention</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Anonymous search data and product lookup records are retained indefinitely for the purpose of improving BioLens material intelligence, expanding product coverage, and refining concern assessments. Because this data is anonymous and cannot be linked to any individual, it poses no privacy risk to users.
            </p>
          </section>

          {/* GDPR and CCPA */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">GDPR &amp; CCPA Compliance</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              BioLens is committed to compliance with the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).
            </p>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              Because BioLens does not collect personal identification information, most GDPR and CCPA provisions regarding personal data do not apply. However, we honor the spirit of these regulations:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span>We are transparent about what data we collect and why.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span>We collect the minimum data necessary to operate the service.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span>We do not sell user data under any circumstance.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5">&#x2022;</span>
                <span>Users may request data deletion at any time.</span>
              </li>
            </ul>
          </section>

          {/* Right to Deletion */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Right to Deletion</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              If you believe any data associated with your usage should be removed, you may contact us to request deletion. While we do not collect personally identifiable information, we will make reasonable efforts to honor deletion requests for any data you can identify.
            </p>
          </section>

          {/* Changes to This Policy */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Changes to This Policy</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time. Changes will be reflected on this page with an updated revision date. Continued use of BioLens after changes constitutes acceptance of the revised policy.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">Contact</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              For privacy-related questions, data deletion requests, or concerns, contact us at:{" "}
              <a href="mailto:eric@esandassociates.com" className="text-cyan-400 hover:underline">
                eric@esandassociates.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
