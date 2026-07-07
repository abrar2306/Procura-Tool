import React from "react";

/**
 * Horizontal 4-zone price gauge with a marker for the vendor's quoted value.
 *
 *   [ green (below)  ][ green (fair)  ][ yellow (expensive) ][ red (very-expensive) ]
 *   0             fairMin           fairMax          expensiveCeiling         2×fairMax
 *                              ▲ vendor marker
 *
 * All numeric inputs are absolute values (e.g. USD/month). The gauge auto-scales.
 */
export default function PriceGauge({
    market,
    fairMin,
    fairMax,
    expensiveCeiling,
    vendor,
    compact = false,
}) {
    if (!market || !fairMin || !fairMax) return null;

    // The scale runs from 0 to max(vendor, expensiveCeiling + headroom)
    const upperBound = Math.max(
        expensiveCeiling * 1.25,
        (vendor || 0) * 1.1,
        fairMax * 1.6
    );
    const pct = (v) => Math.min(100, Math.max(0, (v / upperBound) * 100));

    const marketPct = pct(market);
    const fairMinPct = pct(fairMin);
    const fairMaxPct = pct(fairMax);
    const expPct = pct(expensiveCeiling);
    const vendorPct = vendor > 0 ? pct(vendor) : null;

    const height = compact ? "h-2" : "h-3";
    const trackHeight = compact ? "h-2" : "h-3";

    return (
        <div className="w-full" data-testid="price-gauge">
            {/* Track */}
            <div className={`relative w-full ${trackHeight} rounded-full overflow-hidden bg-slate-100`}>
                {/* Green (below fair) 0 → fairMin */}
                <div
                    className="absolute top-0 left-0 h-full bg-emerald-200"
                    style={{ width: `${fairMinPct}%` }}
                />
                {/* Green (fair) fairMin → fairMax */}
                <div
                    className="absolute top-0 h-full bg-emerald-400"
                    style={{ left: `${fairMinPct}%`, width: `${fairMaxPct - fairMinPct}%` }}
                />
                {/* Yellow (expensive) fairMax → expensiveCeiling */}
                <div
                    className="absolute top-0 h-full bg-amber-400"
                    style={{ left: `${fairMaxPct}%`, width: `${expPct - fairMaxPct}%` }}
                />
                {/* Red (very-expensive) expensiveCeiling → 100% */}
                <div
                    className="absolute top-0 h-full bg-rose-500"
                    style={{ left: `${expPct}%`, width: `${100 - expPct}%` }}
                />
                {/* Market cost tick */}
                <div
                    className="absolute top-0 h-full w-px bg-slate-700/60"
                    style={{ left: `${marketPct}%` }}
                    title={`Market cost $${market.toLocaleString()}`}
                />
                {/* Vendor marker */}
                {vendorPct !== null && (
                    <div
                        className="absolute -top-1 w-[3px] bg-slate-900 rounded-full shadow"
                        style={{
                            left: `calc(${vendorPct}% - 1.5px)`,
                            height: compact ? "16px" : "20px",
                        }}
                        data-testid="price-gauge-marker"
                    />
                )}
            </div>

            {/* Legend row (values under the gauge) */}
            {!compact && (
                <div className="mt-2 flex items-center justify-between text-[10px] font-mono-data text-slate-500">
                    <span>$0</span>
                    <span className="text-emerald-700 font-semibold">
                        Fair: ${fairMin.toLocaleString()}–${fairMax.toLocaleString()}
                    </span>
                    {vendorPct !== null && (
                        <span className="text-slate-900 font-semibold">
                            Vendor: ${Math.round(vendor).toLocaleString()}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
