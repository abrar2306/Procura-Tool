import React from "react";
import { CheckCircle, Warning, XCircle } from "@phosphor-icons/react";

const scoreColor = (n) => {
    if (n >= 75) return { bg: "bg-emerald-500", text: "text-emerald-700", bar: "bg-emerald-500" };
    if (n >= 55) return { bg: "bg-amber-500", text: "text-amber-700", bar: "bg-amber-500" };
    return { bg: "bg-rose-500", text: "text-rose-700", bar: "bg-rose-500" };
};

const verdictBadge = (v) => {
    const map = {
        competitive: "bg-emerald-50 text-emerald-700 border-emerald-200",
        fair: "bg-sky-50 text-sky-700 border-sky-200",
        expensive: "bg-amber-50 text-amber-700 border-amber-200",
        "very-expensive": "bg-rose-50 text-rose-700 border-rose-200",
    };
    return `inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-bold border ${map[v] || "bg-slate-100 text-slate-600 border-slate-200"}`;
};

const riskBadge = (r) => ({
    high: "bg-rose-50 text-rose-700 border-rose-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    low: "bg-emerald-50 text-emerald-700 border-emerald-200",
}[r] || "bg-slate-100 text-slate-600 border-slate-200");

const assessmentBadge = (a) => ({
    strong: "bg-emerald-50 text-emerald-700 border-emerald-200",
    adequate: "bg-sky-50 text-sky-700 border-sky-200",
    weak: "bg-rose-50 text-rose-700 border-rose-200",
}[a] || "bg-slate-100 text-slate-600 border-slate-200");

const RecIcon = ({ v }) => {
    if (v === "accept") return <CheckCircle size={22} weight="fill" className="text-emerald-600" />;
    if (v === "reject") return <XCircle size={22} weight="fill" className="text-rose-600" />;
    return <Warning size={22} weight="fill" className="text-amber-600" />;
};

export default function AnalysisReport({ analysis }) {
    if (!analysis) return null;
    const s = analysis.overall_procurement_score || 0;
    const sc = scoreColor(s);

    return (
        <div className="space-y-6" data-testid="analysis-report">
            {/* Score + Final rec */}
            <div className="grid md:grid-cols-3 gap-4">
                <div className="md:col-span-2 border border-slate-200 rounded-lg p-6 bg-white">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Executive summary</div>
                    <p className="mt-2 text-slate-700 leading-relaxed text-sm whitespace-pre-wrap">{analysis.executive_summary}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-6 bg-white">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Procurement score</div>
                    <div className="mt-3 flex items-baseline gap-1.5">
                        <div className={`text-5xl font-heading font-bold font-mono-data ${sc.text}`}>{s}</div>
                        <div className="text-slate-400 text-sm">/ 100</div>
                    </div>
                    <div className="mt-3 h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div className={`h-full ${sc.bar} rounded-full transition-all`} style={{ width: `${s}%` }} />
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex items-center gap-3">
                        <RecIcon v={analysis.final_recommendation} />
                        <div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Final recommendation</div>
                            <div className="text-sm font-heading font-bold text-slate-900 capitalize">{(analysis.final_recommendation || "").replace(/-/g, " ")}</div>
                        </div>
                    </div>
                    <div className="text-xs text-slate-600 mt-2 leading-relaxed">{analysis.recommendation_summary}</div>
                </div>
            </div>

            {/* Commercial + Pricing */}
            <div className="grid md:grid-cols-2 gap-4">
                <div className="border border-slate-200 rounded-lg p-6 bg-white">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Commercial summary</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{analysis.commercial_summary}</p>
                </div>
                <div className="border border-slate-200 rounded-lg p-6 bg-white">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Pricing assessment</div>
                        <span className={verdictBadge(analysis.pricing_assessment?.verdict)}>{analysis.pricing_assessment?.verdict || "—"}</span>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">{analysis.pricing_assessment?.rationale}</p>
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-baseline gap-2">
                        <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Est. savings</div>
                        <div className="font-mono-data font-bold text-slate-900">{analysis.pricing_assessment?.estimated_savings_opportunity_pct || 0}%</div>
                    </div>
                </div>
            </div>

            {analysis.historical_benchmark && (
                <div className="border border-slate-200 rounded-lg p-6 bg-white">
                    <div className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">Historical benchmark comparison</div>
                    <p className="text-sm text-slate-700 leading-relaxed">{analysis.historical_benchmark}</p>
                </div>
            )}

            {/* Resource benchmark table */}
            {analysis.resource_benchmark?.length > 0 && (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <div className="font-heading font-semibold text-slate-900">Resource cost benchmarking</div>
                        <div className="text-xs text-slate-500 mt-0.5">Estimated market cost vs. vendor quoted rate</div>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-6 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Role</th>
                                <th className="text-left px-6 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Level</th>
                                <th className="text-right px-6 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Market cost/mo</th>
                                <th className="text-right px-6 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Fair vendor</th>
                                <th className="text-right px-6 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Vendor quoted</th>
                                <th className="text-right px-6 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Margin</th>
                                <th className="text-left px-6 py-2.5 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Verdict</th>
                            </tr>
                        </thead>
                        <tbody>
                            {analysis.resource_benchmark.map((r, i) => (
                                <tr key={i} className="border-b border-slate-100">
                                    <td className="px-6 py-3 text-slate-900 font-medium">{r.role}</td>
                                    <td className="px-6 py-3 text-slate-600 capitalize">{r.experience_level}</td>
                                    <td className="px-6 py-3 text-right font-mono-data text-slate-900">${r.market_cost_monthly?.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right font-mono-data text-slate-600">${r.expected_vendor_price?.toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right font-mono-data font-bold text-slate-900">${Math.round(r.vendor_quoted_monthly || 0).toLocaleString()}</td>
                                    <td className="px-6 py-3 text-right font-mono-data text-slate-900">{r.margin_pct}%</td>
                                    <td className="px-6 py-3">
                                        <span className={verdictBadge(r.competitiveness)}>{r.competitiveness}</span>
                                        {r.benchmark_source && (
                                            <div className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">
                                                src: {r.benchmark_source}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* SLA */}
            {analysis.sla_review?.findings?.length > 0 && (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                        <div>
                            <div className="font-heading font-semibold text-slate-900">SLA Review</div>
                            <div className="text-xs text-slate-500 mt-0.5">Compared to industry benchmark standards</div>
                        </div>
                        <span className={assessmentBadge(analysis.sla_review.overall_rating)}>{analysis.sla_review.overall_rating}</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {analysis.sla_review.findings.map((f, i) => (
                            <div key={i} className="px-6 py-4 grid md:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Area</div>
                                    <div className="text-sm font-medium text-slate-900 mt-0.5">{f.area}</div>
                                    <span className={`mt-2 inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${assessmentBadge(f.assessment)}`}>{f.assessment}</span>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Vendor commitment</div>
                                    <div className="text-sm text-slate-700 mt-0.5">{f.commitment}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Benchmark</div>
                                    <div className="text-sm text-slate-700 mt-0.5">{f.benchmark}</div>
                                </div>
                                <div>
                                    <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Recommendation</div>
                                    <div className="text-sm text-slate-700 mt-0.5">{f.recommendation}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Contract risk */}
            {analysis.contract_risk?.length > 0 && (
                <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200">
                        <div className="font-heading font-semibold text-slate-900">Contract risk review</div>
                        <div className="text-xs text-slate-500 mt-0.5">Clauses that warrant negotiation</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {analysis.contract_risk.map((c, i) => (
                            <div key={i} className="px-6 py-4">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="text-sm font-medium text-slate-900">{c.clause}</div>
                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border shrink-0 ${riskBadge(c.risk_level)}`}>
                                        {c.risk_level} risk
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 mt-1">{c.description}</div>
                                <div className="text-sm text-blue-700 mt-2 font-medium">→ {c.recommendation}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Cost optimization & Negotiation */}
            <div className="grid md:grid-cols-2 gap-4">
                {analysis.cost_optimization?.length > 0 && (
                    <div className="border border-slate-200 rounded-lg p-6 bg-white">
                        <div className="font-heading font-semibold text-slate-900 mb-3">Cost optimization opportunities</div>
                        <ul className="space-y-2">
                            {analysis.cost_optimization.map((o, i) => (
                                <li key={i} className="flex gap-2 text-sm text-slate-700 leading-relaxed">
                                    <div className="w-1 h-1 rounded-full bg-emerald-500 mt-2 shrink-0" />
                                    {o}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {analysis.negotiation_strategy?.length > 0 && (
                    <div className="border border-slate-200 rounded-lg p-6 bg-white">
                        <div className="font-heading font-semibold text-slate-900 mb-3">Negotiation strategy</div>
                        <ol className="space-y-2 list-decimal list-inside">
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
