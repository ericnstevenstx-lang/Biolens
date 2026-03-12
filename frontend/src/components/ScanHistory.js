import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight, Trash2, X } from "lucide-react";
import { getPetroloadLevel, getCategoryClass } from "@/lib/biolens";

export default function ScanHistory({ history, onClear }) {
  const navigate = useNavigate();

  if (!history || history.length === 0) return null;

  const formatTime = (ts) => {
    try {
      const d = new Date(ts);
      const now = new Date();
      const diffMs = now - d;
      const diffMin = Math.floor(diffMs / 60000);
      if (diffMin < 1) return "Just now";
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return `${diffHr}h ago`;
      const diffDay = Math.floor(diffHr / 24);
      if (diffDay === 1) return "Yesterday";
      return `${diffDay}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <div data-testid="scan-history" className="animate-fade-up">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" style={{ color: '#86868B' }} />
          <h3
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
          >
            Recent Scans
          </h3>
        </div>
        <button
          data-testid="clear-history-button"
          onClick={onClear}
          className="flex items-center gap-1 text-xs font-medium transition-colors duration-200 px-2 py-1 rounded-lg"
          style={{ fontFamily: "'Inter', sans-serif", color: '#86868B' }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#BE123C'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#86868B'}
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {history.slice(0, 8).map((item) => {
          const petroLevel = getPetroloadLevel(item.petroloadScore);
          const catClass = getCategoryClass(item.materialClass);

          return (
            <button
              key={item.id}
              data-testid={`history-item-${item.id}`}
              onClick={() => navigate(`/results?q=${encodeURIComponent(item.query)}`)}
              className="flex-shrink-0 bg-white rounded-xl p-4 border card-lift text-left"
              style={{
                borderColor: '#E5E5E5',
                width: '180px',
              }}
            >
              <span className={`category-badge ${catClass} mb-2 inline-block`} style={{ fontSize: '0.65rem', padding: '2px 8px' }}>
                {item.materialClass || "Unknown"}
              </span>
              <p
                className="text-sm font-semibold mb-1 truncate"
                style={{ fontFamily: "'Inter', sans-serif", color: '#1D1D1F' }}
              >
                {item.query}
              </p>
              <p
                className="text-xs mb-2"
                style={{ fontFamily: "'Manrope', sans-serif", color: '#1D1D1F' }}
              >
                {item.materialName || "—"}
              </p>
              <div className="flex items-center justify-between">
                {item.petroloadScore != null ? (
                  <span
                    className="text-xs font-semibold"
                    style={{ fontFamily: "'Inter', sans-serif", color: petroLevel.color }}
                  >
                    {item.petroloadScore}/100
                  </span>
                ) : (
                  <span className="text-xs" style={{ color: '#86868B' }}>—</span>
                )}
                <span className="text-xs" style={{ color: '#86868B', fontFamily: "'Inter', sans-serif" }}>
                  {formatTime(item.timestamp)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
