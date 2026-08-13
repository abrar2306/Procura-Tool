import React, { useState } from "react";
import { formatProductName } from "../lib/formatProductName";
import {
    CheckCircle,
    Warning,
    WarningOctagon,
    ArrowsClockwise,
    Eye,
    CurrencyDollar,
    Target,
    CheckSquareOffset,
    Scales,
    Lightning,
    CaretDown,
    CaretUp,
    ShieldCheck,
    Info,
    TrendUp,
    ListNumbers,
    ArrowRight,
    Tag,
    WarningCircle,
    TrendDown,
    ChartBar,
} from "@phosphor-icons/react";
import PriceGauge from "./PriceGauge";
import CountUp from "react-countup";
import SourcePills from "./SourcePills";
import SourceDetailPanel from "./SourceDetailPanel";

/* ──────────────────────────────────────────────
   CONSTANTS & HELPERS
   ────────────────────────────────────────────── */

const SCORE_TIERS = [
    { min: 85, label: "Commercially Favorable", color: "emerald", desc: "Pricing is competitive — proceed with confidence" },
    { min: 70, label: "Negotiate",              color: "blue",    desc: "Broadly acceptable but negotiation is recommended" },
    { min: 50, label: "Review Required",        color: "amber",   desc: "Significant gaps require human review" },
    { min: 0,  label: "Escalate",               color: "rose",    desc: "Critical issues — escalate to senior procurement" },
];

const getTier = (score) => SCORE_TIERS.find((t) => score >= t.min) || SCORE_TIERS[SCORE_TIERS.length - 1];

const RING_COLORS = {
    emerald: { stroke: "#059669", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-800 border-emerald-300" },
    blue:    { stroke: "#0066FF", bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200",    badge: "bg-blue-100 text-blue-800 border-blue-300"    },
    amber:  { stroke: "#D97706", bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200",   badge: "bg-amber-100 text-amber-800 border-amber-300"  },
    rose:   { stroke: "#E11D48", bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200",    badge: "bg-rose-100 text-rose-800 border-rose-300"    },
};

const RECOMMENDATION_ICONS = {
    COMMERCIALLY_FAVORABLE: CheckCircle,
    NEGOTIATE: ArrowsClockwise,
    REVIEW_REQUIRED: Eye,
    ESCALATE: WarningOctagon,
};

const DIMENSION_META = {
    price:                { icon: CurrencyDollar,   label: "Price Competitiveness",   max: 60, desc: "How vendor pricing compares to benchmark medians" },
    benchmark_confidence: { icon: Target,           label: "Benchmark Confidence",    max: 20, desc: "Reliability of the benchmark data match" },
    completeness:         { icon: CheckSquareOffset, label: "Data Completeness",       max: 10, desc: "Whether all required commercial fields were provided" },
    consistency:          { icon: Scales,            label: "Arithmetic Consistency",  max: 10, desc: "Whether quantities × unit prices = line totals" },
};

const REASON_CODE_LABELS = {
    NO_RELIABLE_BENCHMARK:       { label: "No reliable benchmark data found for comparison",                      severity: "warning" },
    UNIT_MISMATCH:               { label: "Currency or billing unit mismatch between vendor quote and benchmark", severity: "critical" },
    MISSING_CRITICAL_FIELD:      { label: "Some line items are missing critical commercial details",              severity: "warning" },
    ARITHMETIC_FAILURE:          { label: "Arithmetic inconsistency detected in pricing",                         severity: "critical" },
    LOW_EXTRACTION_CONFIDENCE:   { label: "AI extraction confidence is low — manual verification needed",         severity: "warning" },
    LOW_PRICE_SCOPE_RISK:        { label: "Unusually low price may indicate scope gaps or exclusions",            severity: "info" },
};

const SEVERITY_STYLES = {
    critical: { bg: "bg-rose-50",  border: "border-rose-200",  icon: "text-rose-600",  text: "text-rose-800",  label: "Critical" },
    warning:  { bg: "bg-amber-50", border: "border-amber-200", icon: "text-amber-600", text: "text-amber-800", label: "Warning"  },
    info:     { bg: "bg-sky-50",   border: "border-sky-200",   icon: "text-sky-600",   text: "text-sky-800",   label: "Info"     },
};

/* ──────────────────────────────────────────────
   SCORE RING COMPONENT
   ────────────────────────────────────────────── */

function ScoreRing({ score, color }) {
    const size = 160;
    const strokeWidth = 10;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(score / 100, 1);
    const offset = circumference * (1 - progress);

    return (
        <div className="relative" style={{ width: size, height: size }} data-testid="score-ring">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
                {/* Background track */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth}
                    strokeLinecap="round"
                />
                {/* Animated progress arc */}
                <circle
                    cx={size / 2} cy={size / 2} r={radius}
                    fill="none"
                    stroke={RING_COLORS[color]?.stroke || "#0066FF"}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    className="animate-score-ring"
                    style={{
                        "--ring-circumference": circumference,
                        "--ring-offset": offset,
                    }}
                />
            </svg>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-heading font-bold text-4xl text-slate-900 font-mono-data leading-none" data-testid="score-value">
                    <CountUp end={score} duration={1.5} />
                </span>
                <span className="text-xs text-slate-400 font-medium mt-1">out of 100</span>
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────
   SCORE BREAKDOWN BAR
   ────────────────────────────────────────────── */

function BreakdownBar({ dimensionKey, score, maximum }) {
    const meta = DIMENSION_META[dimensionKey] || { icon: Info, label: dimensionKey.replace(/_/g, " "), max: maximum, desc: "" };
    const Icon = meta.icon;
    const pct = maximum > 0 ? Math.round((score / maximum) * 100) : 0;
    const barColor = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500";
    const barBg = pct >= 80 ? "bg-emerald-100" : pct >= 50 ? "bg-amber-100" : "bg-rose-100";

    return (
        <div className="p-4 border border-slate-100 rounded-lg bg-white hover:shadow-sm transition-shadow" data-testid={`breakdown-${dimensionKey}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-md flex items-center justify-center ${barBg}`}>
                        <Icon size={16} weight="duotone" className={pct >= 80 ? "text-emerald-700" : pct >= 50 ? "text-amber-700" : "text-rose-700"} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-900">{meta.label}</div>
                        <div className="text-[11px] text-slate-400 leading-tight">{meta.desc}</div>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <div className="font-mono-data font-semibold text-sm text-slate-900">{score} <span className="text-slate-400 font-normal text-xs">/ {maximum}</span></div>
                    <div className="font-mono-data text-[11px] text-slate-400">{pct}%</div>
                </div>
            </div>
            {/* Bar */}
            <div className={`w-full h-2 rounded-full ${barBg} overflow-hidden`}>
                <div
                    className={`h-full rounded-full ${barColor} transition-all duration-700 ease-out`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

/* ──────────────────────────────────────────────
   MAIN COMPONENT
   ────────────────────────────────────────────── */

export default function AnalysisReport({ analysis: data, items: propItems }) {
    const [methodologyOpen, setMethodologyOpen] = useState(false);
    const [lineItemsExpanded, setLineItemsExpanded] = useState(false);
    const [selectedSourceItem, setSelectedSourceItem] = useState(null);

    if (!data) return null;

    const recommendation = data.recommendation || "UNKNOWN";
    const overallScore = data.overall_score || data.overall_procurement_score || 0;
    const summary = data.summary || "No executive summary provided.";
    const breakdown = data.score_breakdown || {};
    const negotiationActions = data.negotiation_actions || [];
    const flags = data.flags || data.warnings || [];
    const reasonCodes = data.reason_codes || [];
    const items = data.analysis_payload?.items || data.items || propItems || [];
    const scoreVersion = data.score_version || "";

    const tier = getTier(overallScore);
    const colors = RING_COLORS[tier.color];
    const RecommendationIcon = RECOMMENDATION_ICONS[recommendation] || Eye;

    // Categorize warnings by severity
    const categorizedFlags = [];
    // First, add reason-code-based flags
    const addedReasonLabels = new Set();
    reasonCodes.forEach((code) => {
        const info = REASON_CODE_LABELS[code];
        if (info) {
            categorizedFlags.push({ text: info.label, severity: info.severity, source: "reason" });
            addedReasonLabels.add(info.label);
        }
    });
    // Then add raw flags that aren't duplicates
    flags.forEach((flag) => {
        if (!addedReasonLabels.has(flag) && flag !== "LOW_PRICE_SCOPE_RISK") {
            const severity = flag.includes("mismatch") || flag.includes("Arithmetic") ? "critical"
                : flag.includes("Missing") || flag.includes("No reliable") || flag.includes("Low extraction") ? "warning"
                : "info";
            categorizedFlags.push({ text: flag, severity, source: "flag" });
        }
    });

    // Sort: critical first, then warning, then info
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    categorizedFlags.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    // Commercial Overview calculations
    let tqv = 0;
    let fmv = 0;
    let stretchTarget = 0;
    let premiumExposure = 0;
    let analyzedComponents = 0;

    items.forEach((item) => {
        const extracted = item.extracted_item || item || {};
        const benchmark = item.benchmark_match || {};
        const isMatched = benchmark.match_status === "MATCHED";

        const quantity = Number(extracted.quantity) || 1;
        const unitPrice = Number(extracted.unit_price) || 0;
        const lineTotal = Number(extracted.line_total) || (quantity * unitPrice) || 0;

        tqv += lineTotal;
        analyzedComponents += quantity;

        if (isMatched && benchmark.benchmark_median != null) {
            const med = Number(benchmark.benchmark_median);
            const low = Number(benchmark.benchmark_low) || med;
            const high = Number(benchmark.benchmark_high);

            fmv += quantity * med;
            stretchTarget += quantity * low;
            
            if (high != null && unitPrice > high) {
                premiumExposure += (unitPrice - high) * quantity;
            }
        } else {
            // Fallback to vendor quoted price if no reliable benchmark
            fmv += lineTotal;
            stretchTarget += lineTotal;
        }
    });

    const savingsValue = Math.max(0, tqv - fmv);
    const savingsPercent = tqv > 0 ? ((savingsValue / tqv) * 100).toFixed(1) : 0;

    return (
        <div className="space-y-6" data-testid="advisory-report">
            {/* ═══════════════════════════════════════════════
                SECTION 1: Executive Header — Score Ring + Verdict
               ═══════════════════════════════════════════════ */}
            <div 
                className={`relative overflow-hidden p-6 md:p-8 rounded-2xl border bg-gradient-to-br from-white to-slate-50 shadow-sm ${colors.border} animate-section-1`} 
                data-testid="executive-header"
            >
                {/* Subtle background accent */}
                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl ${colors.bg} opacity-40 blur-3xl pointer-events-none rounded-full transform translate-x-1/3 -translate-y-1/3`} />

                <div className="relative z-10 flex flex-col md:flex-row md:items-stretch gap-8">
                    {/* Score Ring */}
                    <div className="shrink-0 flex items-center justify-center">
                        <ScoreRing score={overallScore} color={tier.color} />
                    </div>

                    {/* Divider for md+ screens */}
                    <div className="hidden md:block w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent self-stretch mx-2" />

                    {/* Verdict Text */}
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                            <div>
                                <div className="text-[10px] uppercase tracking-[0.25em] font-bold text-slate-400 mb-2 flex items-center gap-2">
                                    <span className="w-4 h-px bg-slate-300"></span>
                                    Procurement Advisory Verdict
                                </div>
                                <div className="flex items-center gap-3 flex-wrap mt-1">
                                    <div className={`animate-badge-pop inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-bold border shadow-sm ${colors.badge}`}>
                                        <RecommendationIcon size={16} weight="fill" />
                                        {recommendation.replace(/_/g, " ").split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                                    </div>
                                    {scoreVersion && (
                                        <span className="text-[11px] font-mono-data font-medium text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-sm">
                                            {scoreVersion}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <p className="text-[15px] text-slate-700 leading-relaxed max-w-3xl font-medium border-l-2 pl-4 py-1" style={{ borderColor: RING_COLORS[tier.color].stroke }}>
                            {tier.desc}
                        </p>

                        {/* Score tier legend (Premium horizontal layout) */}
                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center gap-x-6 gap-y-3">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Score Tiers:</span>
                            {SCORE_TIERS.map((t) => {
                                const isActive = overallScore >= t.min && overallScore < (SCORE_TIERS[SCORE_TIERS.indexOf(t) - 1]?.min || 101);
                                return (
                                    <div key={t.min} className={`flex items-center gap-2 text-[11px] ${isActive ? `${RING_COLORS[t.color].text} font-bold bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200` : "text-slate-500 font-medium"}`}>
                                        <span className={`w-2 h-2 rounded-full shadow-inner`} style={{ backgroundColor: RING_COLORS[t.color].stroke }} />
                                        <span>{t.min}+ <span className="opacity-80">{t.label}</span></span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                SECTION 1.5: Commercial Overview (Sleek Compact Dashboard)
               ═══════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-slate-100 animate-section-1" data-testid="commercial-overview">
                
                {/* TQV */}
                <div className="flex-1 p-6 flex flex-col justify-center">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Total Quoted Value</div>
                    <div className="text-3xl font-light text-slate-800 font-mono-data tracking-tight">
                        <CountUp end={Math.round(tqv)} duration={1.5} prefix="$" separator="," />
                    </div>
                </div>

                {/* FMV */}
                <div className="flex-1 p-6 bg-slate-50/50 flex flex-col justify-center">
                    <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5">Fair Market Value</div>
                    <div className="text-3xl font-light text-slate-800 font-mono-data tracking-tight">
                        <CountUp end={Math.round(fmv)} duration={1.5} prefix="$" separator="," />
                    </div>
                </div>

                {/* Savings Potential */}
                <div className="flex-1 p-6 relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/80 to-white opacity-70 pointer-events-none" />
                    <div className="relative z-10">
                        <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                            <TrendDown size={14} weight="bold" /> Savings Potential
                        </div>
                        <div className="flex items-baseline gap-2.5">
                            <div className="text-3xl font-semibold text-emerald-700 font-mono-data tracking-tight">
                                <CountUp end={Math.round(savingsValue)} duration={1.5} prefix="$" separator="," />
                            </div>
                            <div className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                                <CountUp end={parseFloat(savingsPercent)} duration={1.5} suffix="%" decimals={1} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Metrics */}
                <div className="flex-1 p-6 flex flex-col justify-center gap-3 bg-slate-50/30">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Stretch Target</span>
                        <span className="text-sm font-semibold text-slate-800 font-mono-data">
                            <CountUp end={Math.round(stretchTarget)} duration={1.5} prefix="$" separator="," />
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Premium Risk</span>
                        <span className="text-sm font-semibold text-rose-600 font-mono-data">
                            <CountUp end={Math.round(premiumExposure)} duration={1.5} prefix="$" separator="," />
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Components</span>
                        <span className="text-sm font-semibold text-slate-800 font-mono-data">
                            <CountUp end={analyzedComponents} duration={1.5} separator="," />
                        </span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                SECTION 2: Executive Summary
               ═══════════════════════════════════════════════ */}
            <div className="animate-section-2 bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="executive-summary">
                <div className="border-l-4 border-l-blue-600 p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-3">
                        <ShieldCheck size={18} weight="duotone" className="text-blue-600" />
                        <h3 className="font-heading font-semibold text-slate-900 text-base">Executive Summary</h3>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-line max-w-4xl">
                        {summary}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                SECTION 3: Score Breakdown — Visual Bars
               ═══════════════════════════════════════════════ */}
            <div className="animate-section-3 bg-white border border-slate-200 rounded-xl p-6 md:p-8" data-testid="score-breakdown">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="font-heading font-semibold text-slate-900 text-base">Score Breakdown</h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">How your procurement score is distributed across key dimensions</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-4 text-[10px] text-slate-400 font-medium">
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥ 80%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> 50–79%</span>
                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500" /> &lt; 50%</span>
                    </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    {Object.entries(breakdown).map(([key, value]) => (
                        <BreakdownBar
                            key={key}
                            dimensionKey={key}
                            score={value.score}
                            maximum={value.maximum}
                        />
                    ))}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════
                SECTION 4: Recommended Actions
               ═══════════════════════════════════════════════ */}
            {negotiationActions.length > 0 && (
                <div className="animate-section-4 bg-white border border-slate-200 rounded-xl p-6 md:p-8" data-testid="recommended-actions">
                    <div className="flex items-center gap-2 mb-5">
                        <Lightning size={18} weight="duotone" className="text-blue-600" />
                        <h3 className="font-heading font-semibold text-slate-900 text-base">Recommended Actions</h3>
                        <span className="ml-auto text-[10px] uppercase tracking-widest font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                            {negotiationActions.length} {negotiationActions.length === 1 ? "action" : "actions"}
                        </span>
                    </div>
                    <div className="space-y-3">
                        {negotiationActions.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-4 rounded-lg border border-blue-100 bg-blue-50/40 hover:bg-blue-50 transition-colors" data-testid={`action-${idx}`}>
                                <div className="shrink-0 w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center mt-0.5">
                                    <span className="text-xs font-bold text-white font-mono-data">{idx + 1}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-800 leading-relaxed font-medium">{action}</p>
                                </div>
                                <ArrowRight size={14} className="text-blue-400 shrink-0 mt-1" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                SECTION 5: Warnings & Risk Flags
               ═══════════════════════════════════════════════ */}
            <div className="animate-section-5 bg-white border border-slate-200 rounded-xl p-6 md:p-8" data-testid="warnings-section">
                <div className="flex items-center gap-2 mb-5">
                    <Warning size={18} weight="duotone" className="text-amber-500" />
                    <h3 className="font-heading font-semibold text-slate-900 text-base">Warnings & Risk Flags</h3>
                    {categorizedFlags.length > 0 && (
                        <span className="ml-auto text-[10px] uppercase tracking-widest font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            {categorizedFlags.length} {categorizedFlags.length === 1 ? "flag" : "flags"}
                        </span>
                    )}
                </div>
                {categorizedFlags.length > 0 ? (
                    <div className="space-y-2.5">
                        {categorizedFlags.map((flag, idx) => {
                            const style = SEVERITY_STYLES[flag.severity] || SEVERITY_STYLES.info;
                            const FlagIcon = flag.severity === "critical" ? WarningOctagon : flag.severity === "warning" ? WarningCircle : Info;
                            return (
                                <div key={idx} className={`flex items-start gap-3 p-3.5 rounded-lg border ${style.bg} ${style.border}`} data-testid={`flag-${idx}`}>
                                    <FlagIcon size={16} weight="fill" className={`${style.icon} shrink-0 mt-0.5`} />
                                    <div className="flex-1 min-w-0">
                                        <span className={`text-sm ${style.text} leading-relaxed`}>{flag.text}</span>
                                    </div>
                                    <span className={`shrink-0 text-[9px] uppercase tracking-widest font-bold ${style.text} opacity-60`}>
                                        {style.label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                        <CheckCircle size={18} weight="fill" className="text-emerald-600" />
                        <span className="text-sm text-emerald-800 font-medium">No warnings or risk flags identified. The proposal appears clean.</span>
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════
                SECTION 6: Line Items & Benchmark Comparison
               ═══════════════════════════════════════════════ */}
            {items.length > 0 && (
                <div className="animate-section-6 bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="line-items">
                    <div className="px-6 md:px-8 py-5 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <ListNumbers size={18} weight="duotone" className="text-slate-600" />
                            <h3 className="font-heading font-semibold text-slate-900 text-base">Line Items & Benchmark Comparison</h3>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">
                            {items.length} {items.length === 1 ? "item" : "items"}
                        </span>
                    </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="py-3 px-6 text-[10px] uppercase tracking-widest font-semibold text-slate-500 w-[40%]">Item Scope</th>
                                        <th className="py-3 px-6 text-[10px] uppercase tracking-widest font-semibold text-slate-500">Unit Price</th>
                                        <th className="py-3 px-6 text-[10px] uppercase tracking-widest font-semibold text-slate-500">Total</th>
                                        <th className="py-3 px-6 text-[10px] uppercase tracking-widest font-semibold text-slate-500 w-[30%]">Benchmark Health</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(lineItemsExpanded ? items : items.slice(0, 5)).map((item, idx) => {
                                        const extracted = item.extracted_item || item || {};
                                        const benchmark = item.benchmark_match || {};
                                        const isMatched = benchmark.match_status === "MATCHED";
                                        const name = extracted.name || extracted.role || extracted.normalized_description || extracted.raw_description || "Unknown Item";
                                        const currency = extracted.currency || "$";
                                        const unitPrice = extracted.unit_price;
                                        const quantity = extracted.quantity;
                                        const lineTotal = extracted.line_total || (quantity && unitPrice ? quantity * unitPrice : null);
                                        const warnings = (item.warnings || []).filter(w => w !== "LOW_PRICE_SCOPE_RISK");

                                        return (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors group" data-testid={`line-item-${idx}`}>
                                                <td className="py-4 px-6 align-top">
                                                    <div className="flex flex-col gap-1.5">
                                                        <div className="font-semibold text-slate-900 text-[13px] leading-snug">{formatProductName(name)}</div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            {extracted.category && (
                                                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold bg-slate-100 text-slate-500">
                                                                    {extracted.category}
                                                                </span>
                                                            )}
                                                            <span className="text-[11px] text-slate-500 font-medium">
                                                                Qty: <span className="font-mono-data font-semibold text-slate-700">{quantity || "—"}</span>
                                                                {extracted.duration != null && ` · ${extracted.duration}mo`}
                                                            </span>
                                                        </div>
                                                        {warnings.length > 0 && (
                                                            <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 w-fit">
                                                                <Warning size={12} weight="fill" className="text-amber-500" />
                                                                <span>{warnings.length} warning{warnings.length > 1 ? "s" : ""}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 align-top">
                                                    <div className="font-mono-data font-semibold text-[13px] text-slate-900">
                                                        {unitPrice != null ? `${currency}${unitPrice.toLocaleString()}` : "—"}
                                                    </div>
                                                    {benchmark.applied_discount > 0 && (
                                                        <div className="text-[10px] text-emerald-700 font-semibold mt-1 inline-flex items-center gap-0.5 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                            <TrendDown size={10} weight="bold"/> {benchmark.applied_discount}% off
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-4 px-6 align-top font-mono-data font-semibold text-[13px] text-slate-900">
                                                    {lineTotal != null ? `${currency}${lineTotal.toLocaleString()}` : "—"}
                                                </td>
                                                <td className="py-4 px-6 align-top">
                                                    {isMatched && unitPrice != null && benchmark.benchmark_median != null ? (
                                                        <div className="w-full">
                                                            <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono-data mb-1.5">
                                                                <span title="Benchmark Low">L {benchmark.benchmark_low?.toLocaleString() || "—"}</span>
                                                                <span title="Market Price" className="font-bold text-slate-500">M {benchmark.benchmark_median.toLocaleString()}</span>
                                                                <span title="Benchmark High">H {benchmark.benchmark_high?.toLocaleString() || "—"}</span>
                                                            </div>
                                                            <PriceGauge
                                                                market={benchmark.benchmark_median}
                                                                fairMin={benchmark.benchmark_low || benchmark.benchmark_median * 0.85}
                                                                fairMax={benchmark.benchmark_high || benchmark.benchmark_median * 1.15}
                                                                expensiveCeiling={(benchmark.benchmark_high || benchmark.benchmark_median * 1.15) * 1.15}
                                                                vendor={unitPrice}
                                                                compact={true}
                                                            />
                                                            <div className="text-[10px] font-medium text-slate-400 mt-2 flex flex-col gap-1.5">
                                                                <div className="flex items-center gap-1">
                                                                    <CheckCircle size={12} weight="fill" className="text-emerald-500" />
                                                                    {benchmark.match_confidence || 0}% match via {benchmark.match_method?.replace(/_/g, " ").toLowerCase() || "unknown"}
                                                                </div>
                                                                {benchmark.sources && benchmark.sources.length > 0 && (
                                                                    <div className="mt-1">
                                                                        <SourcePills 
                                                                            sources={benchmark.sources} 
                                                                            onClick={() => setSelectedSourceItem({ extracted: extracted, benchmark: benchmark })} 
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200">
                                                            <Info size={12} /> No market data found
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        {items.length > 5 && (
                            <button 
                                onClick={() => setLineItemsExpanded(!lineItemsExpanded)}
                                className="w-full py-3 bg-slate-50 hover:bg-slate-100 transition-colors border-t border-slate-200 flex items-center justify-center gap-2 group"
                            >
                                <span className="text-[10px] uppercase tracking-widest font-semibold text-slate-500 group-hover:text-slate-700 transition-colors">
                                    {lineItemsExpanded ? "Show Less" : `View All ${items.length} Items`}
                                </span>
                                {lineItemsExpanded ? (
                                    <CaretUp size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                ) : (
                                    <CaretDown size={14} className="text-slate-400 group-hover:text-slate-600 transition-colors" />
                                )}
                            </button>
                        )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════
                SECTION 7: Score Interpretation Legend
               ═══════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden" data-testid="methodology-section">
                <button
                    onClick={() => setMethodologyOpen(!methodologyOpen)}
                    className="w-full px-6 md:px-8 py-4 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
                    data-testid="methodology-toggle"
                >
                    <div className="flex items-center gap-2">
                        <Info size={16} weight="duotone" className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">How is this score calculated?</span>
                    </div>
                    {methodologyOpen ? <CaretUp size={16} className="text-slate-400" /> : <CaretDown size={16} className="text-slate-400" />}
                </button>
                {methodologyOpen && (
                    <div className="px-6 md:px-8 pb-6 border-t border-slate-100 animate-step">
                        <div className="mt-5 space-y-5">
                            {/* Scoring dimensions */}
                            <div>
                                <h4 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Scoring Dimensions</h4>
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {Object.entries(DIMENSION_META).map(([key, meta]) => {
                                        const Icon = meta.icon;
                                        return (
                                            <div key={key} className="flex items-start gap-2.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                                <Icon size={16} weight="duotone" className="text-slate-500 mt-0.5 shrink-0" />
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-800">{meta.label} <span className="text-slate-400 font-normal font-mono-data text-xs">({meta.max} pts)</span></div>
                                                    <div className="text-[11px] text-slate-500 leading-relaxed mt-0.5">{meta.desc}</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Recommendation thresholds */}
                            <div>
                                <h4 className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-3">Recommendation Thresholds</h4>
                                <div className="space-y-2">
                                    {SCORE_TIERS.map((t) => {
                                        const TierIcon = RECOMMENDATION_ICONS[
                                            t.label === "Commercially Favorable" ? "COMMERCIALLY_FAVORABLE"
                                            : t.label === "Negotiate" ? "NEGOTIATE"
                                            : t.label === "Review Required" ? "REVIEW_REQUIRED"
                                            : "ESCALATE"
                                        ];
                                        return (
                                            <div key={t.min} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                                                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: RING_COLORS[t.color].stroke }} />
                                                <TierIcon size={14} weight="fill" className={RING_COLORS[t.color].text} />
                                                <span className="text-sm font-semibold text-slate-800 min-w-24">{t.min}–{t === SCORE_TIERS[0] ? "100" : SCORE_TIERS[SCORE_TIERS.indexOf(t) - 1].min - 1}</span>
                                                <span className={`text-sm font-medium ${RING_COLORS[t.color].text}`}>{t.label}</span>
                                                <span className="text-[11px] text-slate-500 ml-auto hidden sm:inline">{t.desc}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Note */}
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-sky-50 border border-sky-200">
                                <Info size={14} weight="fill" className="text-sky-600 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-sky-800 leading-relaxed">
                                    Scores are calculated deterministically using rule-based benchmark matching and arithmetic validation.
                                    If benchmark data is limited or any critical fields are missing, the system automatically flags the review
                                    for human validation, regardless of the numeric score. The AI-generated executive summary contextualizes
                                    the numeric results but does not alter the scoring.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <SourceDetailPanel 
                isOpen={!!selectedSourceItem}
                onClose={() => setSelectedSourceItem(null)}
                item={selectedSourceItem?.extracted}
                sources={selectedSourceItem?.benchmark?.sources}
            />
        </div>
    );
}
