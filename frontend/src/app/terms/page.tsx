import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Terms of Service | BioLens",
  description: "BioLens terms of service. Usage terms, disclaimers, and legal information.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100" style={{ fontFamily: "var(--font-manrope)" }}>
      <Nav />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Terms of Service</h1>
        <p className="text-xs text-slate-500 mb-10">Last updated: March 2026</p>

        <div className="space-y-8">
          {/* Acceptance */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">1. Acceptance of Terms</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              By accessing or using BioLens, you agree to be bound by these Terms of Service. If you do not agree to these terms, you should not use BioLens. BioLens is operated by ES&amp;A (Eric Stevens &amp; Associates). We reserve the right to modify these terms at any time, and continued use of the service constitutes acceptance of any changes.
            </p>
          </section>

          {/* Service Description */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">2. Service Description</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              BioLens is a material intelligence platform that provides information about the composition of everyday products, including petrochemical dependency scores, health concern assessments, and material classifications. This information is provided for educational and informational purposes only.
            </p>
          </section>

          {/* Not Medical or Safety Advice */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">3. Not Medical or Safety Advice</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              BioLens does not provide medical advice, safety certification, or regulatory compliance assessments. The material intelligence presented on BioLens is not a substitute for professional medical, toxicological, or safety guidance.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              Users should verify critical health and safety information with qualified professionals, including physicians, toxicologists, and relevant regulatory authorities, before making decisions based on BioLens data.
            </p>
          </section>

          {/* Data Accuracy */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">4. Data Accuracy and Limitations</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              BioLens data is derived from public sources including regulatory databases, published research, and open product databases. While we strive for accuracy, our data may contain inaccuracies, omissions, or outdated information.
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">&#x26A0;</span>
                <span>Material classifications are estimates based on available data, not guarantees of exact product composition.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">&#x26A0;</span>
                <span>Petroload Index scores represent modeled estimates of petroleum dependency, not laboratory-verified measurements.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">&#x26A0;</span>
                <span>Health concern assessments reflect published research findings and may not account for all individual risk factors, exposure levels, or product-specific formulations.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">&#x26A0;</span>
                <span>Product manufacturers may change formulations without notice. BioLens data reflects information available at the time of indexing.</span>
              </li>
            </ul>
          </section>

          {/* Intellectual Property */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">5. Intellectual Property</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              The BioLens platform, including its material intelligence methodology, Petroload Index scoring system, concern assessment framework, data models, and user interface design, is the proprietary intellectual property of ES&amp;A (Eric Stevens &amp; Associates).
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              You may not reproduce, distribute, modify, create derivative works of, publicly display, or commercially exploit any portion of BioLens content, data, or methodology without prior written consent from ES&amp;A.
            </p>
          </section>

          {/* User Conduct */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">6. User Conduct</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              When using BioLens, you agree not to:
            </p>
            <ul className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Scrape, crawl, or systematically extract data from BioLens for commercial purposes without authorization.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Misrepresent BioLens data as certified safety assessments, medical advice, or regulatory compliance documentation.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Attempt to interfere with, disrupt, or compromise the integrity of BioLens systems or data.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&#x2717;</span>
                <span>Use BioLens in any manner that violates applicable laws or regulations.</span>
              </li>
            </ul>
          </section>

          {/* Limitation of Liability */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">7. Limitation of Liability</h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              BioLens is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              In no event shall ES&amp;A (Eric Stevens &amp; Associates), its officers, directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of BioLens, including but not limited to damages for loss of profits, data, goodwill, or other intangible losses.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              ES&amp;A&apos;s total liability for any claims arising under these terms shall not exceed the amount you paid to use BioLens (which, as a free service, is zero dollars).
            </p>
          </section>

          {/* Third-Party Links */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">8. Third-Party Links and Services</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              BioLens may contain links to third-party websites or services, including our marketplace partner FiberFoundry. We are not responsible for the content, privacy practices, or terms of service of any third-party sites. Your interactions with third-party services are governed by their respective terms and policies.
            </p>
          </section>

          {/* Governing Law */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">9. Governing Law</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              These Terms of Service shall be governed by and construed in accordance with the laws of the State of Texas, United States, without regard to its conflict of law provisions. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the courts located in Texas.
            </p>
          </section>

          {/* Termination */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">10. Termination</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              We reserve the right to suspend or terminate access to BioLens at our sole discretion, without notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties, or for any other reason.
            </p>
          </section>

          {/* Contact */}
          <section className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-cyan-400 mb-3">11. Contact</h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              For questions about these Terms of Service, contact us at:{" "}
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
