import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReview, updateReview, analyzeReview } from "../lib/api";
import { findCategory, CATEGORY_LABELS } from "../lib/categories";
import { toast } from "sonner";
import { ArrowLeft, ChatCircleDots, FileText, Sparkle, Gauge, ShieldCheck, Warning, Cube } from "@phosphor-icons/react";
import UploadZone from "../components/UploadZone";
import LicenseSkuForm from "../components/LicenseSkuForm";
import ExtractedDataEditor from "../components/ExtractedDataEditor";
import AnalysisReport from "../components/AnalysisReport";
import ChatSidebar from "../components/ChatSidebar";
import ProposalComparison from "../components/ProposalComparison";

const TAB_LIST = [
    { id: "input", label: "Input", icon: FileText },
    { id: "extracted", label: "Extracted Data", icon: Cube },
    { id: "analysis", label: "Advisory Report", icon: Gauge },
];

export default function ReviewDetail() {
    const { id } = useParams();
    const nav = useNavigate();
    const [review, setReview] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("input");
    const [analyzing, setAnalyzing] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const load = async () => {
        try {
            const r = await getReview(id);
            setReview(r);
            if (r.analysis) setTab("analysis");
            else if (r.extracted_data && Object.keys(r.extracted_data).length > 0) setTab("extracted");
        } catch {
            toast.error("Failed to load review");
        } finally { setLoading(false); }
    };

    useEffect(() => { load(); }, [id]);

    if (loading) return <div className="p-10 text-slate-500">Loading…</div>;
    if (!review) return <div className="p-10 text-slate-500">Review not found.</div>;

    const cat = findCategory(review.procurement_type, review.category);
    const isForm = cat?.workflow === "form";

    const saveForm = async (formData) => {
        setSaving(true);
        try {
            const r = await updateReview(id, { form_data: formData });
            setReview(r);
        } finally { setSaving(false); }
    };
    const saveExtracted = async (extracted) => {
        setSaving(true);
        try {
            const r = await updateReview(id, { extracted_data: extracted });
            setReview(r);
        } finally { setSaving(false); }
    };

    const runAnalysis = async () => {
        setAnalyzing(true);
        toast.info("Running AI procurement analysis… (this can take ~30-60s)");
        try {
            await analyzeReview(id);
            // Poll until status changes from 'analyzing'
            const deadline = Date.now() + 3 * 60 * 1000;
            let finalReview = null;
            while (Date.now() < deadline) {
                await new Promise((r) => setTimeout(r, 4000));
                const r = await getReview(id);
                if (r.status === "analyzed") { finalReview = r; break; }
                if (r.status === "error") {
                    throw new Error(r.analysis_error || "Analysis failed");
                }
            }
            if (!finalReview) throw new Error("Analysis timed out. Please try again.");
            setReview(finalReview);
            setTab("analysis");
            toast.success("Analysis complete");
        } catch (e) {
            toast.error("Analysis failed: " + (e.response?.data?.detail || e.message));
        } finally { setAnalyzing(false); }
    };

    const hasInput = isForm
        ? (Object.keys(review.form_data || {}).some((k) => review.form_data[k]) ||
           (review.documents || []).length > 0)
        : (review.documents || []).length > 0;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <button onClick={() => nav("/")} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2" data-testid="back-to-dashboard">
                        <ArrowLeft size={14} /> Back to dashboard
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="font-heading text-3xl font-bold text-slate-900 truncate">{review.project_name || "Untitled"}</h1>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                            {CATEGORY_LABELS[review.category]}
                        </span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{review.procurement_type === "software" ? "Software" : "Hardware"} procurement</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        data-testid="open-chat-button"
                        onClick={() => setChatOpen(true)}
                        className="inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-sm font-medium px-4 py-2 rounded-md text-slate-700"
                    >
                        <ChatCircleDots size={16} /> AI Assistant
                    </button>
                    <button
                        data-testid="run-analysis-button"
                        onClick={runAnalysis}
                        disabled={analyzing || !hasInput}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-4 py-2 rounded-md"
                    >
                        <Sparkle size={16} weight="fill" /> {analyzing ? "Analyzing…" : review.analysis ? "Re-run analysis" : "Run AI analysis"}
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-slate-200 mb-6">
                {TAB_LIST.map((t) => {
                    const active = tab === t.id;
                    const Icon = t.icon;
                    return (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            data-testid={`tab-${t.id}`}
                            className={`flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-colors ${
                                active ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-900"
                            }`}
                        >
                            <Icon size={16} weight={active ? "fill" : "regular"} /> {t.label}
                        </button>
                    );
                })}
                {saving && <span className="text-xs text-slate-400 ml-auto">Saving…</span>}
            </div>

            {tab === "input" && (
                <div className="animate-step">
                    {isForm ? (
                        <div className="space-y-4">
                            {/* Auto-fill from documents (optional) */}
                            <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-5">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <div className="font-heading font-semibold text-slate-900">Auto-fill from a document</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            Upload a vendor quote, license order form, or pricing PDF/Word/Excel — Procura extracts the fields and pre-fills the form below.
                                        </div>
                                    </div>
                                </div>
                                <UploadZone
                                    reviewId={id}
                                    onUploaded={(r) => { setReview(r); toast.success("Form auto-filled from document"); }}
                                    title="Drop a quote, PO, or license order form"
                                    subtitle="PDF, DOCX, XLSX, CSV, TXT — fields already filled won't be overwritten"
                                    submitLabel="Extract & auto-fill"
                                    compact
                                    testidPrefix="upload-autofill"
                                />
                            </div>

                            <div className="border border-slate-200 rounded-lg bg-white p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <div>
                                        <div className="font-heading font-semibold text-slate-900">Commercial form</div>
                                        <div className="text-xs text-slate-500 mt-0.5">Fill in the procurement details to run AI analysis</div>
                                    </div>
                                    <button
                                        onClick={() => saveForm(review.form_data || {})}
                                        className="text-xs font-medium border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md"
                                        data-testid="save-form-button"
                                    >
                                        Save draft
                                    </button>
                                </div>
                                <LicenseSkuForm
                                    data={review.form_data || {}}
                                    onChange={(fd) => setReview({ ...review, form_data: fd })}
                                    procurementType={review.procurement_type}
                                />
                                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={() => saveForm(review.form_data || {}).then(() => toast.success("Saved"))}
                                        className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md"
                                        data-testid="save-and-analyze-button"
                                    >
                                        Save
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2">
                                <UploadZone reviewId={id} onUploaded={(r) => { setReview(r); setTab("extracted"); toast.success("Data extracted"); }} />
                            </div>
                            <div className="border border-slate-200 rounded-lg bg-white p-5">
                                <div className="font-heading font-semibold text-slate-900 mb-2">Uploaded documents</div>
                                {(review.documents || []).length === 0 ? (
                                    <div className="text-xs text-slate-500">No documents uploaded yet.</div>
                                ) : (
                                    <ul className="space-y-2">
                                        {review.documents.map((d) => (
                                            <li key={d.id} className="flex items-center gap-2 text-sm">
                                                <FileText size={14} className="text-slate-400" />
                                                <span className="text-slate-800 truncate flex-1">{d.filename}</span>
                                                <span className="text-[10px] text-slate-400 font-mono-data">{(d.size / 1024).toFixed(0)}KB</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {tab === "extracted" && (
                <div className="animate-step">
                    <div className="border border-slate-200 rounded-lg bg-white p-6">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <div className="font-heading font-semibold text-slate-900">Extracted data</div>
                                <div className="text-xs text-slate-500 mt-0.5">AI-extracted information. Review and correct before analysis.</div>
                            </div>
                            <button
                                onClick={() => saveExtracted(review.extracted_data || {}).then(() => toast.success("Saved"))}
                                className="text-xs font-medium border border-slate-300 hover:bg-slate-50 px-3 py-1.5 rounded-md"
                                data-testid="save-extracted-button"
                            >
                                Save changes
                            </button>
                        </div>
                        <ExtractedDataEditor
                            data={review.extracted_data || {}}
                            onChange={(d) => setReview({ ...review, extracted_data: d })}
                            procurementType={review.procurement_type}
                        />
                    </div>
                </div>
            )}

            {tab === "analysis" && (
                <div className="animate-step space-y-6">
                    {review.analysis ? (
                        <>
                            <AnalysisReport analysis={review.analysis} />
                            {/* Proposal comparison — only for document-driven categories (services / hardware support) */}
                            {!isForm && (
                                <ProposalComparison review={review} onReviewUpdate={setReview} />
                            )}
                        </>
                    ) : (
                        <div className="border border-slate-200 border-dashed rounded-lg p-16 text-center bg-slate-50/50">
                            <Sparkle size={40} weight="duotone" className="mx-auto text-blue-500" />
                            <div className="mt-3 font-heading font-semibold text-slate-900">Ready when you are</div>
                            <div className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                                Once you&apos;ve provided the input, run the AI analysis to generate a full advisory report with pricing benchmark, SLA review, contract risk assessment, and negotiation strategy.
                            </div>
                            <button
                                onClick={runAnalysis}
                                disabled={analyzing || !hasInput}
                                data-testid="empty-run-analysis"
                                className="mt-5 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-md"
                            >
                                <Sparkle size={16} weight="fill" /> {analyzing ? "Analyzing…" : "Run AI analysis"}
                            </button>
                        </div>
                    )}
                </div>
            )}

            <ChatSidebar reviewId={id} open={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
    );
}
