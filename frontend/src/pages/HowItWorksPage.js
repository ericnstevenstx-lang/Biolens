import { useNavigate } from "react-router-dom";
import { Search, ScanLine, Layers, Sparkles, ArrowRight } from "lucide-react";

const STEPS = [
  {
    number: "1",
    icon: <Search className="w-6 h-6" />,
    title: "Search a product",
    description: "Type any everyday product — a hoodie, toothbrush, rope, blanket, or cutting board.",
  },
  {
    number: "2",
    icon: <ScanLine className="w-6 h-6" />,
    title: "Identify the material",
    description: "BioLens looks up the product and identifies its likely primary material composition.",
  },
  {
    number: "3",
    icon: <Layers className="w-6 h-6" />,
    title: "Understand the classification",
    description: "Learn whether the material is petroleum-based, plant-based, or a transition material — and what that means.",
  },
  {
    number: "4",
    icon: <Sparkles className="w-6 h-6" />,
    title: "Discover alternatives",
    description: "BioLens shows you better material options so you can make more informed choices.",
  },
];

export default function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div data-testid="how-it-works-page" className="pt-28 pb-24 px-6 md:px-12 lg:px-24 min-h-screen">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="max-w-2xl mb-20 animate-fade-up">
          <h1
            className="text-4xl sm:text-5xl font-semibold leading-tight mb-4"
            style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
          >
            How BioLens works
          </h1>
          <p
            className="text-base md:text-lg leading-relaxed"
            style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
          >
            Four simple steps to understand any product's material composition and make better choices.
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6 md:space-y-8">
          {STEPS.map((step, idx) => (
            <div
              key={step.number}
              data-testid={`how-step-${step.number}`}
              className={`animate-fade-up delay-${(idx + 1) * 100}`}
            >
              <div
                className="bg-white rounded-2xl p-8 md:p-10 border card-lift"
                style={{ borderColor: '#E5E5E5' }}
              >
                <div className="flex items-start gap-6 md:gap-8">
                  {/* Step number */}
                  <div
                    className="step-circle flex-shrink-0"
                    style={{
                      backgroundColor: idx === 0 ? '#1D1D1F' : 'rgba(29, 29, 31, 0.06)',
                      color: idx === 0 ? '#F5F5F7' : '#1D1D1F',
                    }}
                  >
                    {step.number}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div style={{ color: '#B45309' }}>{step.icon}</div>
                      <h3
                        className="text-xl md:text-2xl font-semibold"
                        style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
                      >
                        {step.title}
                      </h3>
                    </div>
                    <p
                      className="text-sm md:text-base leading-relaxed"
                      style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-20 text-center animate-fade-up delay-600">
          <h2
            className="text-2xl sm:text-3xl font-semibold mb-4"
            style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
          >
            Ready to try it?
          </h2>
          <p
            className="text-sm mb-8"
            style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
          >
            Search any product and see what it's really made of.
          </p>
          <button
            data-testid="hiw-cta-try-biolens"
            onClick={() => navigate("/")}
            className="btn-pill btn-primary"
          >
            Try BioLens
            <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
