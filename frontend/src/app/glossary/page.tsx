"use client";
import { useState, useMemo } from "react";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

/* ------------------------------------------------------------------ */
/*  Glossary data                                                      */
/* ------------------------------------------------------------------ */

type Term = { term: string; slug: string; definition: string };
type Category = { category: string; terms: Term[] };

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[()\/]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const glossaryData: Category[] = [
  {
    category: "Material Classifications",
    terms: [
      {
        term: "Bio-based",
        slug: "bio-based",
        definition:
          "Materials derived primarily from biological/plant sources with minimal petrochemical processing.",
      },
      {
        term: "Bridge / Transitional",
        slug: "bridge-transitional",
        definition:
          "Materials that blend bio-based and synthetic properties, often representing a step between petrochemical and bio-based alternatives.",
      },
      {
        term: "Synthetic",
        slug: "synthetic",
        definition:
          "Materials manufactured through chemical processes, often from petrochemical feedstocks.",
      },
      {
        term: "Petrochemical",
        slug: "petrochemical",
        definition:
          "Materials derived directly from petroleum, natural gas, or coal tar processing.",
      },
    ],
  },
  {
    category: "BioLens Metrics",
    terms: [
      {
        term: "Petroload Index",
        slug: "petroload-index",
        definition:
          "A 0\u2013100 score measuring a product\u2019s petroleum dependency. Lower scores indicate more bio-based composition.",
      },
      {
        term: "Material Health Score",
        slug: "material-health-score",
        definition:
          "An inverse toxicity score (0\u2013100) derived from concern assessments across 14 health dimensions.",
      },
      {
        term: "Capital Flow",
        slug: "capital-flow",
        definition:
          "Analysis of where consumer dollars go \u2014 domestic retention vs foreign supply chain leakage.",
      },
      {
        term: "Tariff Exposure",
        slug: "tariff-exposure",
        definition:
          "The percentage of product cost subject to import duties, Section 301 tariffs, or trade restrictions.",
      },
    ],
  },
  {
    category: "Health Concerns",
    terms: [
      {
        term: "Endocrine Disruption",
        slug: "endocrine-disruption",
        definition:
          "Interference with hormonal signaling systems including estrogen, androgen, or thyroid pathways.",
      },
      {
        term: "Carcinogenicity",
        slug: "carcinogenicity",
        definition:
          "Potential to contribute to cancer risk through mutagenic, genotoxic, or tumor-promoting mechanisms.",
      },
      {
        term: "Microplastic Shedding",
        slug: "microplastic-shedding",
        definition:
          "Release of micro- or nano-scale particles during use, washing, or degradation.",
      },
      {
        term: "Leachate Risk",
        slug: "leachate-risk",
        definition:
          "Chemical migration from materials into surrounding environment, food, or skin contact.",
      },
      {
        term: "VOC Off-Gassing",
        slug: "voc-off-gassing",
        definition:
          "Release of volatile organic compounds into indoor air during normal product use.",
      },
      {
        term: "PFAS",
        slug: "pfas",
        definition:
          'Per- and polyfluoroalkyl substances \u2014 persistent "forever chemicals" used in waterproofing and stain resistance.',
      },
    ],
  },
  {
    category: "Trade & Regulatory",
    terms: [
      {
        term: "Section 301",
        slug: "section-301",
        definition:
          "US trade provision imposing additional tariffs on goods from specific countries (primarily China).",
      },
      {
        term: "FEOC",
        slug: "feoc",
        definition:
          "Foreign Entity of Concern \u2014 designation restricting government procurement from certain foreign sources.",
      },
      {
        term: "UFLPA",
        slug: "uflpa",
        definition:
          "Uyghur Forced Labor Prevention Act \u2014 prohibits imports produced with forced labor in Xinjiang.",
      },
      {
        term: "BABA",
        slug: "baba",
        definition:
          "Build America Buy America \u2014 federal procurement preference for domestic materials.",
      },
      {
        term: "HTS Code",
        slug: "hts-code",
        definition:
          "Harmonized Tariff Schedule code \u2014 classifies imported goods for duty rate determination.",
      },
      {
        term: "INCI",
        slug: "inci",
        definition:
          "International Nomenclature of Cosmetic Ingredients \u2014 standardized naming system for cosmetic/personal care ingredients.",
      },
    ],
  },
  {
    category: "Materials (Common)",
    terms: [
      {
        term: "Polypropylene (PP)",
        slug: "polypropylene-pp",
        definition:
          "Petrochemical thermoplastic used in packaging, containers, textiles. Recyclable (#5).",
      },
      {
        term: "Polyethylene (PE)",
        slug: "polyethylene-pe",
        definition:
          "Most common plastic. HDPE (#2) and LDPE (#4) used in bottles, bags, containers.",
      },
      {
        term: "PET (Polyethylene Terephthalate)",
        slug: "pet-polyethylene-terephthalate",
        definition:
          "Petrochemical polyester used in bottles, clothing, packaging (#1).",
      },
      {
        term: "Nylon (Polyamide)",
        slug: "nylon-polyamide",
        definition:
          "Synthetic polymer used in textiles, carpets, engineering plastics.",
      },
      {
        term: "Hemp",
        slug: "hemp",
        definition:
          "Plant-based fiber with low petrochemical processing requirements.",
      },
      {
        term: "Bamboo",
        slug: "bamboo",
        definition:
          "Fast-growing grass fiber, bio-based but processing may involve chemicals (viscose process).",
      },
      {
        term: "Organic Cotton",
        slug: "organic-cotton",
        definition:
          "Cotton grown without synthetic pesticides or fertilizers.",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function GlossaryPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return glossaryData;
    return glossaryData
      .map((cat) => ({
        ...cat,
        terms: cat.terms.filter(
          (t) =>
            t.term.toLowerCase().includes(q) ||
            t.definition.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.terms.length > 0);
  }, [search]);

  const totalTerms = filtered.reduce((n, c) => n + c.terms.length, 0);

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100">
      <Nav />

      <main className="max-w-3xl mx-auto px-4 pt-16 pb-20">
        {/* Title */}
        <div className="mb-10 text-center">
          <p className="text-xs uppercase tracking-[0.28em] text-cyan-300/80 mb-3">
            Reference
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Glossary
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Material science, health concern, trade, and BioLens-specific terms
            used throughout our intelligence reports.
          </p>
        </div>

        {/* Search */}
        <div className="mb-10">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search terms or definitions..."
            className="w-full bg-[#0c1829] border border-[#1e3a5f] rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition-colors"
            autoFocus
          />
          {search && (
            <p className="text-xs text-slate-500 mt-2">
              {totalTerms} term{totalTerms !== 1 ? "s" : ""} matching &ldquo;
              {search}&rdquo;
            </p>
          )}
        </div>

        {/* Terms */}
        {filtered.length === 0 ? (
          <div className="bg-[#0c1829] border border-[#1e3a5f] rounded-xl p-8 text-center text-slate-500 text-sm">
            No terms match your search.
          </div>
        ) : (
          <div className="space-y-12">
            {filtered.map((cat) => (
              <section key={cat.category}>
                <h2 className="text-lg font-bold text-cyan-400 mb-4 border-b border-[#1e3a5f] pb-2">
                  {cat.category}
                </h2>
                <div className="space-y-3">
                  {cat.terms.map((t) => (
                    <div
                      key={t.slug}
                      id={t.slug}
                      className="bg-[#0c1829] border border-[#1e3a5f] rounded-lg p-4 scroll-mt-16"
                    >
                      <a
                        href={`#${t.slug}`}
                        className="text-sm font-semibold text-slate-200 hover:text-cyan-400 transition-colors"
                      >
                        {t.term}
                      </a>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                        {t.definition}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
