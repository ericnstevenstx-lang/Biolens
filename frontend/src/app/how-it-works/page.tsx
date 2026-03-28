import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

const steps = [
  {
    number: 1,
    title: "Search a product",
    description:
      "Type any everyday product: a hoodie, toothbrush, rope, blanket, or cutting board.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
    ),
  },
  {
    number: 2,
    title: "Identify the material",
    description:
      "BioLens looks up the product and identifies its likely primary material composition.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 0 1-1.591.659H9.061a2.25 2.25 0 0 1-1.591-.659L5 14.5m14 0V5.846a2.25 2.25 0 0 0-1.883-2.22m-13.234 0A2.233 2.233 0 0 0 5 5.846V14.5" />
      </svg>
    ),
  },
  {
    number: 3,
    title: "Understand the classification",
    description:
      "Learn whether the material is petroleum-based, plant-based, or a transition material, and what that means.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
      </svg>
    ),
  },
  {
    number: 4,
    title: "Discover alternatives",
    description:
      "BioLens shows you better material options so you can make more informed choices.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    number: 5,
    title: "Assess health risks",
    description:
      "See endocrine disruption, carcinogenicity, microplastic shedding, and chemical exposure pathways for each material.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
      </svg>
    ),
  },
  {
    number: 6,
    title: "Understand economic impact",
    description:
      "Capital flow analysis shows tariff exposure, foreign supply chain leakage, and domestic production alternatives.",
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <Nav />

      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-16 pb-10 text-center">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
          How BioLens Works
        </h1>
        <p className="text-slate-400 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          Six steps to understand any product&apos;s material composition, health risks, and economic impact.
        </p>
      </section>

      {/* Steps */}
      <section className="max-w-3xl mx-auto px-4 pb-16">
        <div className="space-y-6">
          {steps.map((step) => (
            <div
              key={step.number}
              className="relative bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-6 flex gap-5 items-start"
            >
              {/* Step Number */}
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-sm">
                {step.number}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-cyan-400">{step.icon}</span>
                  <h3 className="text-lg font-semibold text-slate-100">
                    {step.title}
                  </h3>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Divider between core steps and intelligence layers */}
        <div className="flex items-center gap-4 my-10">
          <div className="flex-1 h-px bg-[#1e3a5f]" />
          <span className="text-xs text-slate-500 uppercase tracking-widest">Intelligence Layers</span>
          <div className="flex-1 h-px bg-[#1e3a5f]" />
        </div>

        {/* Note about intelligence layers */}
        <p className="text-center text-slate-500 text-sm mb-8">
          Steps 5 and 6 represent deeper analysis, powered by health science data and economic modeling.
        </p>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 pb-20 text-center">
        <h2 className="text-2xl font-bold mb-3">Ready to try it?</h2>
        <p className="text-slate-400 text-sm mb-6">
          Search any product and see what it&apos;s really made of.
        </p>
        <Link
          href="/"
          className="inline-block px-8 py-3 bg-cyan-500 hover:bg-cyan-400 text-[#070b12] font-semibold text-sm rounded-lg transition-colors"
        >
          Try BioLens Now
        </Link>
      </section>

      <Footer />
    </div>
  );
}
