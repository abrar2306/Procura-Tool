import React, { useState } from "react";
import { CheckCircle, Warning, XCircle, CaretDown, CaretRight } from "@phosphor-icons/react";
import PriceGauge from "./PriceGauge";

const scoreColor = (n) => {
    if (n >= 75) return { text: "text-emerald-700", bar: "bg-emerald-500" };
    if (n >= 55) return { text: "text-amber-700", bar: "bg-amber-500" };
    return { text: "text-rose-700", bar: "bg-rose-500" };
};

const verdictChip = (v) => {
    const map = {
        competitive: "bg-emerald-50 text-emerald-700 border-emerald-200",
        excellent: "bg-emerald-50 text-emerald-700 border-emerald-200",
        fair: "bg-emerald-50 text-emerald-700 border-emerald-200",
        expensive: "bg-amber-50 text-amber-700 border-amber-200",
        "very-expensive": "bg-rose-50 text-rose-700 border-rose-200",
    };
    return `inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold border ${map[v] || "bg-slate-100 text-slate-600 border-slate-200"}`;
};

const riskDot = (r) => ({
    high: "bg-rose-500",
    medium: "bg-amber-500",
    low: "bg-emerald-500",
}[r] || "bg-slate-400");

const assessmentDot = (a) => ({
    strong: "bg-emerald-500",
    adequate: "bg-sky-500",
    weak: "bg-rose-500",
}[a] || "bg-slate-400");

const RecIcon = ({ v }) => {
    if (v === "accept") return <CheckCircle size={22} weight="fill" className="text-emerald-600" />;
    if (v === "reject") return <XCircle size={22} weight="fill" className="text-rose-600" />;
    return <Warning size={22} weight="fill" className="text-amber-600" />;
};

/** Overall pricing verdict gauge — a simple 4-zone bar with a marker. */
const PricingVerdictGauge = ({ verdict, savings }) => {
    // Map verdict to a normalized position on the scale (0-100)
    const positions = {
        competitive: 15,
        fair: 40,
        expensive: 70,
        "very-expensive": 92,
    };
    const pos = positions[verdict] ?? 50;

    return (
        <div className="w-full" data-testid="pricing-verdict-gauge">
            <div className="relative h-3 rounded-full overflow-hidden bg-slate-100">
                <div className="absolute inset-y-0 left-0 w-1/4 bg-emerald-400" />
                <div className="absolute inset-y-0 left-1/4 w-1/4 bg-emerald-300" />
                <div className="absolute inset-y-0 left-1/2 w-1/4 bg-amber-400" />
                <div className="absolute inset-y-0 left-3/4 w-1/4 bg-rose-500" />
                <div
                    className="absolute -top-1 h-5 w-[3px] bg-slate-900 rounded-full shadow"
                    style={{ left: `calc(${pos}% - 1.5px)` }}
                />
            </div>
            <div className="mt-1.5 flex justify-between text-[9px] uppercase tracking-widest font-semibold">
                <span className="text-emerald-700">Competitive</span>
                <span className="text-emerald-700">Fair</span>
                <span className="text-amber-700">Expensive</span>
                <span className="text-rose-700">Very expensive</span>
            </div>
            {savings > 0 && (
                <div className="mt-3 text-xs text-slate-600">
                    Est. savings opportunity:{" "}
                    <span className="font-mono-data font-bold text-slate-900">{savings}%</span>
                </div>
            )}
        </div>
    );
};

/** Collapsible text section — trims to preview and toggles full view. */
const Collapsible = ({ label, children, defaultOpen = false, preview }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div>
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-500 font-semibold hover:text-slate-900 transition"
                data-testid={`collapsible-${label.toLowerCase().replace(/\s+/g, "-")}`}
            >
                {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
                {label}
            </button>
            {open ? (
                <div className="mt-2 text-sm text-slate-700 leading-relaxed">{children}</div>
            ) : preview ? (
                <div className="mt-1.5 text-xs text-slate-500 leading-relaxed line-clamp-2">{preview}</div>
            ) : null}
        </div>
    );
};

export default function AnalysisReport({ analysis }) {
    if (!analysis) return null;
    const s = analysis.overall_procurement_score || 0;
    const sc = scoreColor(s);
    const execSummary = analysis.executive_summary || "";
    const previewSummary = execSummary.length > 140 ? execSummary.slice(0, 140) + "…" : execSummary;

    return (
        <div className="space-y-4" data-testid="analysis-report">
            {/* Score + Final rec + Pricing gauge — all above the fold */}
            <div className="grid md:grid-cols-3 gap-4">
                {/* Score */}
                <div className="border border-slate-200 rounded-lg p-5 bg-white">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Procurement score</div>
                    <div className="mt-2 flex items-baseline gap-1.5">
                        <div className={`text-5xl font-heading font-bold font-mono-data ${sc.text}`}>{s}</div>
                        <div className="text-slate-400 text-sm">/ 100</div>
                    </div>
                    <div className="mt-2 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${sc.bar} rounded-full transition-all`} style={{ width: `${s}%` }} />
                    </div>
                </div>

                {/* Final recommendation */}
                <div className="border border-slate-200 rounded-lg p-5 bg-white">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Recommendation</div>
                    <div className="mt-3 flex items-center gap-3">
                        <RecIcon v={analysis.final_recommendation} />
                        <div className="text-lg font-heading font-bold text-slate-900 capitalize leading-tight">
                            {(analysis.final_recommendation || "—").replace(/-/g, " ")}
                        </div>
                    </div>
                    <div className="text-xs text-slate-600 mt-2 leading-relaxed line-clamp-3">{analysis.recommendation_summary}</div>
                </div>

                {/* Pricing verdict gauge */}
                <div className="border border-slate-200 rounded-lg p-5 bg-white">
                    <div className="flex items-center justify-between mb-3">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Pricing</div>
                        <span className={verdictChip(analysis.pricing_assessment?.verdict)}>{analysis.pricing_assessment?.verdict || "—"}</span>
                    </div>
                    <PricingVerdictGauge
                        verdict={analysis.pricing_assessment?.verdict}
                        savings={analysis.pricing_assessment?.estimated_savings_opportunity_pct || 0}
                    />
                </div>
            </div>

            {/* Executive + Commercial + Pricing rationale — collapsibles */}
            <div className="border border-slate-200 rounded-lg p-5 bg-white space-y-4">
                <Collapsible label="Executive summary" defaultOpen={false} preview={previewSummary}>
                    <p className="whitespace-pre-wrap">{execSummary}</p>
                </Collapsible>
                {analysis.commercial_summary && (
                    <Collapsible label="Commercial summary" preview={analysis.commercial_summary.slice(0, 140) + (analysis.commercial_summary.length > 140 ? "…" : "")}>
                        <p>{analysis.commercial_summary}</p>
                    </Collapsible>
                )}
                {analysis.pricing_assessment?.rationale && (
                    <Collapsible label="Why this verdict" preview={analysis.pricing_assessment.rationale.slice(0, 140) + (analysis.pricing_assessment.rationale.length > 140 ? "…" : "")}>
                        <p>{analysis.pricing_assessment.rationale}</p>
                    </Collapsible>
                )}
                {analysis.historical_benchmark && (
                    <Collapsible label="Historical benchmark" preview={analysis.historical_benchmark.slice(0, 140) + (analysis.historical_benchmark.length > 140 ? "…" : "")}>
                        <p>{analysis.historical_benchmark}</p>
                    </Collapsible>
                )}
            </div>

            {/* Resource benchmark — visual gauges per role */}
            {analysis.resource_benchmark?.length > 0 && (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <div className="font-heading font-semibold text-slate-900">Resource cost benchmarking</div>
                            <div className="text-xs text-slate-500 mt-0.5">
                                Fair vendor range = market cost × 1.22–1.35 (22–35% margin)
                            </div>
                        </div>
                        <div className="hidden md:flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-400 inline-block" /> Fair</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> Expensive</span>
                            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Very expensive</span>
                        </div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {analysis.resource_benchmark.map((r, i) => (
                            <div key={i} className="px-5 py-4 grid md:grid-cols-[minmax(0,1.2fr)_minmax(0,2fr)_auto] gap-4 items-center">
                                <div>
                                    <div className="text-sm font-medium text-slate-900">{r.role}</div>
                                    <div className="text-xs text-slate-500 mt-0.5 capitalize">
                                        {r.experience_level} · {r.count || 1}×
                                        {r.benchmark_source && (
                                            <span className="ml-1 text-slate-400">· src: {r.benchmark_source}</span>
                                        )}
                                    </div>
                                </div>
                                <PriceGauge
                                    market={r.market_cost_monthly}
                                    fairMin={r.fair_vendor_min}
                                    fairMax={r.fair_vendor_max}
                                    expensiveCeiling={r.expensive_ceiling}
                                    vendor={r.vendor_quoted_monthly}
                                />
                                <div className="flex flex-col items-end gap-1">
                                    <span className={verdictChip(r.competitiveness)}>{r.competitiveness}</span>
                                    {r.vendor_quoted_monthly > 0 && (
                                        <span className="text-xs font-mono-data text-slate-600">{r.margin_pct}% margin</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SLA — compact chip grid */}
            {analysis.sla_review?.findings?.length > 0 && (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                        <div className="font-heading font-semibold text-slate-900">SLA review</div>
                        <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${assessmentDot(analysis.sla_review.overall_rating)}`} />
                            <span className="text-xs uppercase tracking-widest font-semibold text-slate-700">
                                {analysis.sla_review.overall_rating}
                            </span>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {analysis.sla_review.findings.map((f, i) => (
                            <SlaFindingCard key={i} f={f} />
                        ))}
                    </div>
                </div>
            )}

            {/* Contract risk — compact cards with severity dots */}
            {analysis.contract_risk?.length > 0 && (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-200 font-heading font-semibold text-slate-900">
                        Contract risk
                    </div>
                    <div className="divide-y divide-slate-100">
                        {analysis.contract_risk.map((c, i) => (
                            <ContractRiskCard key={i} c={c} />
                        ))}
                    </div>
                </div>
            )}

            {/* Cost optimization & Negotiation — compact lists */}
            <div className="grid md:grid-cols-2 gap-4">
                {analysis.cost_optimization?.length > 0 && (
                    <div className="border border-slate-200 rounded-lg p-5 bg-white">
                        <div className="font-heading font-semibold text-slate-900 mb-3 text-sm">Cost optimization</div>
                        <ul className="space-y-1.5">
                            {analysis.cost_optimization.map((o, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                    <span>{o}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {analysis.negotiation_strategy?.length > 0 && (
                    <div className="border border-slate-200 rounded-lg p-5 bg-white">
                        <div className="font-heading font-semibold text-slate-900 mb-3 text-sm">Negotiation strategy</div>
                        <ol className="space-y-1.5 list-decimal list-inside">
                            {analysis.negotiation_strategy.map((n, i) => (
                                <li key={i} className="text-sm text-slate-700 leading-relaxed">{n}</li>
                            ))}
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
}

const SlaFindingCard = ({ f }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="px-5 py-3">
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${assessmentDot(f.assessment)}`} />
                    <span className="text-sm font-medium text-slate-900 truncate">{f.area}</span>
                </div>
                <span className={verdictChip(f.assessment === "strong" ? "fair" : f.assessment === "weak" ? "very-expensive" : "expensive")}>
                    {f.assessment}
                </span>
            </div>
            <div className="mt-1 text-xs text-slate-600">
                <span className="font-mono-data text-slate-900">{f.commitment || "—"}</span>
                {f.benchmark && <span className="text-slate-400"> · benchmark: {f.benchmark}</span>}
            </div>
            {f.recommendation && (
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-widest text-blue-700 font-semibold hover:text-blue-900"
                    data-testid={`sla-${f.area}-toggle`}
                >
                    {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
                    Recommendation
                </button>
            )}
            {open && f.recommendation && (
                <div className="mt-1 text-xs text-blue-800 leading-relaxed">{f.recommendation}</div>
            )}
        </div>
    );
};

const ContractRiskCard = ({ c }) => {
    const [open, setOpen] = useState(false);
    return (
        <div className="px-5 py-3">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${riskDot(c.risk_level)}`} />
                    <span className="text-sm font-medium text-slate-900 truncate">{c.clause}</span>
                </div>
                <span className={`text-[10px] uppercase tracking-widest font-bold ${
                    c.risk_level === "high" ? "text-rose-700" :
                    c.risk_level === "medium" ? "text-amber-700" : "text-emerald-700"
                }`}>
                    {c.risk_level}
                </span>
            </div>
            <button
                onClick={() => setOpen((v) => !v)}
                className="mt-1.5 flex items-center gap-1 text-[10px] uppercase tracking-widest text-slate-500 font-semibold hover:text-slate-900"
                data-testid={`risk-${(c.clause || "").toLowerCase().replace(/\s+/g, "-")}-toggle`}
            >
                {open ? <CaretDown size={12} weight="bold" /> : <CaretRight size={12} weight="bold" />}
                Details
            </button>
            {open && (
                <div className="mt-1.5 space-y-1">
                    {c.description && <div className="text-xs text-slate-600 leading-relaxed">{c.description}</div>}
                    {c.recommendation && <div className="text-xs text-blue-700 leading-relaxed">→ {c.recommendation}</div>}
                </div>
            )}
        </div>
    );
};
