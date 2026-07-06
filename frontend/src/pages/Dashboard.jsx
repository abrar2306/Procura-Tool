import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listReviews } from "../lib/api";
import { CATEGORY_LABELS } from "../lib/categories";
import { ArrowRight, FileText, Gauge, TrendUp, Vault, Sparkle } from "@phosphor-icons/react";

const StatCard = ({ icon: Icon, label, value, sub }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-5" data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}>
        <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">{label}</div>
            <Icon size={16} className="text-slate-400" />
        </div>
        <div className="mt-3 text-3xl font-heading font-bold text-slate-900 font-mono-data">{value}</div>
        {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
);

const StatusBadge = ({ status }) => {
    const map = {
        draft: "bg-slate-100 text-slate-600 border-slate-200",
        analyzed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    };
    return (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold border ${map[status] || map.draft}`}>
            {status}
        </span>
    );
};

export default function Dashboard() {
    const nav = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        listReviews().then((d) => { setReviews(d); setLoading(false); }).catch(() => setLoading(false));
    }, []);

    const analyzed = reviews.filter((r) => r.status === "analyzed");
    const avgScore = analyzed.length
        ? Math.round(analyzed.reduce((s, r) => s + (r.analysis?.overall_procurement_score || 0), 0) / analyzed.length)
        : 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-step">
            {/* Hero */}
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white mb-8">
                <div className="absolute inset-0 bg-grid-slate opacity-70 pointer-events-none" />
                <div className="relative p-8 lg:p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                        <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-semibold uppercase tracking-widest mb-3">
                            <Sparkle size={12} weight="fill" /> AI Procurement Advisor
                        </div>
                        <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
                            Consultant-grade procurement<br />analysis, on demand.
                        </h1>
                        <p className="text-slate-600 mt-4 max-w-xl leading-relaxed">
                            Upload a proposal, SOW, or SLA — or fill in a commercial form. Get commercial benchmarking, SLA review,
                            contract risk analysis, and a negotiation strategy in minutes.
                        </p>
                        <div className="flex gap-3 mt-6">
                            <button
                                data-testid="hero-start-review-button"
                                onClick={() => nav("/review/new")}
                                className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
                            >
                                Start a new review <ArrowRight size={16} />
                            </button>
                            <a href="#recent" className="inline-flex items-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium px-5 py-2.5 rounded-md transition-colors">
                                View recent
                            </a>
                        </div>
                    </div>
                    <div className="hidden lg:block shrink-0">
                        <div className="w-72 rounded-lg border border-slate-200 bg-white p-5">
                            <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Sample verdict</div>
                            <div className="mt-2 font-heading text-2xl font-bold text-slate-900">Accept with negotiation</div>
                            <div className="flex items-center gap-2 mt-3">
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full w-[72%] bg-emerald-500 rounded-full" />
                                </div>
                                <div className="font-mono-data text-sm font-bold text-slate-900">72</div>
                            </div>
                            <div className="text-xs text-slate-500 mt-2">Procurement score / 100</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard icon={FileText} label="Total Reviews" value={reviews.length} sub="All-time" />
                <StatCard icon={Gauge} label="Analyzed" value={analyzed.length} sub="With AI verdict" />
                <StatCard icon={TrendUp} label="Avg. Score" value={avgScore || "—"} sub="Out of 100" />
                <StatCard icon={Vault} label="Active" value={reviews.filter((r) => r.status === "draft").length} sub="In progress" />
            </div>

            {/* Recent */}
            <div id="recent" className="bg-white border border-slate-200 rounded-lg">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <div className="font-heading font-semibold text-slate-900">Recent procurement reviews</div>
                        <div className="text-xs text-slate-500 mt-0.5">Continue where you left off, or open a completed review</div>
                    </div>
                </div>
                {loading ? (
                    <div className="p-8 text-center text-slate-500 text-sm">Loading…</div>
                ) : reviews.length === 0 ? (
                    <div className="p-10 text-center">
                        <div className="text-slate-500 text-sm">No reviews yet. Start your first procurement review.</div>
                        <button
                            data-testid="empty-start-review-button"
                            onClick={() => nav("/review/new")}
                            className="mt-4 inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md"
                        >
                            Create your first review <ArrowRight size={14} />
                        </button>
                    </div>
                ) : (
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="text-left px-6 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Project</th>
                                <th className="text-left px-6 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Category</th>
                                <th className="text-left px-6 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Score</th>
                                <th className="text-left px-6 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Status</th>
                                <th className="text-left px-6 py-3 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Created</th>
                                <th className="text-right px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {reviews.map((r) => (
                                <tr
                                    key={r.id}
                                    className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => nav(`/review/${r.id}`)}
                                    data-testid={`review-row-${r.id}`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="font-medium text-slate-900">{r.project_name || "Untitled project"}</div>
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">{CATEGORY_LABELS[r.category] || r.category}</td>
                                    <td className="px-6 py-4 font-mono-data font-semibold text-slate-900">
                                        {r.analysis?.overall_procurement_score ?? "—"}
                                    </td>
                                    <td className="px-6 py-4"><StatusBadge status={r.status} /></td>
                                    <td className="px-6 py-4 text-slate-500 text-xs">{new Date(r.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-right">
                                        <ArrowRight size={16} className="text-slate-400 inline" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
