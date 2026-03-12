import { DollarSign, Users, Wind, Droplets, Info } from "lucide-react";
import { computeImpact } from "@/lib/impact";

function StatBlock({ icon, label, value, unit, color }) {
  return (
    <div className="flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ backgroundColor: `${color}10`, color }}
      >
        {icon}
      </div>
      <div>
        <p
          className="text-xs font-medium uppercase tracking-wider"
          style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
        >
          {label}
        </p>
        <p className="flex items-baseline gap-1 mt-0.5">
          <span
            className="text-xl font-semibold tabular-nums"
            style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
          >
            {value}
          </span>
          {unit && (
            <span
              className="text-xs font-medium"
              style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
            >
              {unit}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default function PurchaseImpact({ result }) {
  const impact = computeImpact(result);
  if (!impact) return null;

  const showMicroplastic = impact.shedsMicroplastics && impact.microplasticGrams > 0;
  const isPetro = result.materialClass === "Petro-Based";

  return (
    <div
      data-testid="purchase-impact-section"
      className="bg-white rounded-2xl p-8 md:p-12 border animate-fade-up delay-300"
      style={{ borderColor: '#E5E5E5' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3
          className="text-sm font-semibold uppercase tracking-wider"
          style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
        >
          Estimated Material Impact
        </h3>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(29, 29, 31, 0.05)' }}>
          <Info className="w-3 h-3" style={{ color: '#86868B' }} />
          <span className="text-[0.65rem] font-medium" style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}>
            Material-level estimates
          </span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {isPetro && (
          <StatBlock
            icon={<DollarSign className="w-4 h-4" />}
            label="Est. Petro Cost per Unit"
            value={`$${impact.petroDollarsPerUnit}`}
            unit="petroleum input"
            color="#EF4444"
          />
        )}

        <StatBlock
          icon={<Users className="w-4 h-4" />}
          label="Jobs Multiplier"
          value={`${impact.jobsSupported}x`}
          unit={isPetro ? "fewer vs plant-based" : "vs petro-based"}
          color="#B45309"
        />

        {impact.carbonImprovement > 0 && (
          <StatBlock
            icon={<Wind className="w-4 h-4" />}
            label="Carbon Proxy Savings"
            value={impact.carbonImprovement}
            unit="kg CO₂e / kg switched"
            color="#22C55E"
          />
        )}

        {showMicroplastic && (
          <StatBlock
            icon={<Droplets className="w-4 h-4" />}
            label="Microplastic Shedding"
            value={impact.microplasticGrams}
            unit="g per wash cycle"
            color="#F97316"
          />
        )}
      </div>

      {/* Disclaimer */}
      <p
        className="mt-6 text-xs leading-relaxed"
        style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
      >
        Impact values are estimated from material classification and petroload scores.
        {isPetro
          ? " Switching to plant-based or natural alternatives can significantly reduce petroleum dependency and environmental impact."
          : " This material already has a lower environmental footprint than petroleum-based alternatives."
        }
      </p>
    </div>
  );
}
