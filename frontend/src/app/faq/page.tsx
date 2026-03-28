import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export const metadata = {
  title: "FAQ | BioLens",
  description: "Frequently asked questions about BioLens material intelligence.",
};

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100" style={{ fontFamily: "var(--font-manrope)" }}>
      <Nav />

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-white mb-2">Frequently Asked Questions</h1>
        <p className="text-sm text-slate-400 mb-10">Everything you need to know about BioLens and how it works.</p>

        <div className="space-y-3">
          {/* Q1 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>What is BioLens?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              BioLens is a free material intelligence tool that reveals what everyday products are really made of and what that means for your health and economy. We analyze product materials, score their petroleum dependency, and assess health concerns across 14 categories so you can make informed decisions about the products you use.
            </div>
          </details>

          {/* Q2 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>How does the Petroload Index work?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              The Petroload Index scores products from 0 to 100 based on their petroleum dependency. A score of 0 means the product is fully bio-based, while a score of 100 means it is fully petrochemical. We analyze the primary materials in a product and their chemical composition to calculate this score. The index helps consumers understand how much of a product originates from fossil fuel feedstocks.
            </div>
          </details>

          {/* Q3 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>What do the health ratings mean?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              We assess materials across 14 health concern categories including endocrine disruption, carcinogenicity, microplastic shedding, and chemical exposure pathways. Ratings are derived from published research and regulatory databases, not marketing claims. Each concern category has a severity level and confidence score so you can see how strong the evidence is for each potential risk.
            </div>
          </details>

          {/* Q4 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>Is BioLens free?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              Yes. BioLens is free for consumers. We believe material transparency should be accessible to everyone. There are no paywalls, no premium tiers required for basic material intelligence, and no advertising.
            </div>
          </details>

          {/* Q5 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>Where does your data come from?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              Our material intelligence is built on published research, regulatory databases (EPA, ECHA, IARC), Open Food Facts, Open Beauty Facts, and proprietary material analysis. We index over 998 materials with 9,604 concern assessments. Our data is continuously updated as new research is published and new products are indexed.
            </div>
          </details>

          {/* Q6 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>Is this medical advice?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              No. BioLens provides material-level intelligence based on published research. It is not a medical assessment of any specific product&apos;s safety for any individual. Individual risk depends on factors like exposure duration, quantity, personal health conditions, and other variables that BioLens cannot evaluate. Consult qualified professionals for health decisions.
            </div>
          </details>

          {/* Q7 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>How do you make money?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              BioLens is currently funded independently. We have no brand sponsorships and no advertising. Our material intelligence is not influenced by any commercial interest. Future revenue may come from premium features and our marketplace partner FiberFoundry, but core material transparency will always remain free.
            </div>
          </details>

          {/* Q8 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>Can I scan a barcode?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              Yes. BioLens supports barcode scanning to look up products directly. Enter a UPC or GTIN in the search bar, and BioLens will match it against our product database to retrieve material composition, Petroload Index, and health concern data for that product.
            </div>
          </details>

          {/* Q9 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>What is FiberFoundry?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              FiberFoundry is our marketplace partner that curates bio-based product alternatives. When BioLens identifies a petrochemical-heavy product, FiberFoundry offers vetted replacements made from more sustainable, bio-based materials. FiberFoundry independently verifies the material claims of the products it lists.
            </div>
          </details>

          {/* Q10 */}
          <details className="group bg-[#0c1829] border border-[#1e3a5f] rounded-lg">
            <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-white flex items-center justify-between list-none">
              <span>How can I contribute?</span>
              <span className="text-cyan-400 text-lg transition-transform group-open:rotate-45">+</span>
            </summary>
            <div className="px-6 pb-5 text-sm text-slate-300 leading-relaxed border-t border-[#1e3a5f] pt-4">
              We welcome contributions from researchers, material scientists, and anyone passionate about material transparency. Contact us at{" "}
              <a href="mailto:eric@esandassociates.com" className="text-cyan-400 hover:underline">
                eric@esandassociates.com
              </a>{" "}
              if you would like to contribute material data, report inaccuracies, suggest products for indexing, or explore partnership opportunities with BioLens.
            </div>
          </details>
        </div>
      </main>

      <Footer />
    </div>
  );
}
