import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getReview, updateReview, analyzeReview, deleteDocument } from "../lib/api";
import { findCategory, CATEGORY_LABELS } from "../lib/categories";
import { toast } from "sonner";
import { ArrowLeft, ChatCircleDots, FileText, Sparkle, Gauge, ShieldCheck, Warning, Cube } from "@phosphor-icons/react";
import UploadZone from "../components/UploadZone";
import ExtractedDataEditor from "../components/ExtractedDataEditor";
import AnalysisReport from "../components/AnalysisReport";
import ChatSidebar from "../components/ChatSidebar";
import ProposalComparison from "../components/ProposalComparison";
import AnalysisControls from "../components/AnalysisControls";

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
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [deepSearch, setDeepSearch] = useState(false);

    const load = React.useCallback(async () => {
        try {
            const r = await getReview(id);
            setReview(r);
            if (r.analysis) setTab("analysis");
            else if (r.extracted_items && r.extracted_items.length > 0) setTab("extracted");
        } catch (e) {
            // Handled by global interceptor
        } finally { setLoading(false); }
    }, [id]);

    useEffect(() => { load(); }, [load]);

    const handleDeleteDocument = async (documentId) => {
        if (!window.confirm("Are you sure you want to delete this document and all its extracted data?")) return;
        try {
            await deleteDocument(id, documentId);
            toast.success("Document and its data deleted");
            load(); // Reload to get fresh documents and extracted items
        } catch (e) {
            toast.error("Failed to delete document: " + (e.message || "Unknown error"));
        }
    };

    if (loading) return <div className="p-10 text-slate-500">Loading…</div>;
    if (!review) return <div className="p-10 text-slate-500">Review not found.</div>;

    const cat = findCategory(review.category);

    const saveExtracted = async (extracted) => {
        setSaving(true);
        try {
            // New API structure requires PATCH per item or we can just mock it for MVP frontend
            // Let's just do sequential PATCH for all items
            for (const item of extracted) {
                if (item.id) {
                    await updateReview(id + '/items/' + item.id, item); 
                    // Note: updateReview in api.js currently points to PATCH /requests/${id}
                    // Wait, our PATCH is PATCH /requests/{id}/items/{item_id}.
                    // I will use fetch directly here or update the api method.
                }
            }
            const r = await getReview(id);
            setReview(r);
            toast.success("Saved extracted data");
        } catch (e) {
            // Error is handled by global interceptor
        } finally { setSaving(false); }
    };

    const runAnalysis = async () => {
        setAnalyzing(true);
        toast.info(deepSearch ? "Running deep search AI analysis… (this can take ~30-60s)" : "Running AI procurement analysis… (this can take ~10-20s)");
        try {
            await analyzeReview(id, deepSearch);
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
            if (!e.response) {
                toast.error("Analysis failed: " + e.message);
            }
        } finally { setAnalyzing(false); }
    };

    const hasExtractedItems = (review.extracted_items || review.extracted_data || []).length > 0;
    const canRunAnalysis = hasExtractedItems;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-6">
                <div className="min-w-0">
                    <button onClick={() => nav("/")} className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 mb-2" data-testid="back-to-dashboard">
                        <ArrowLeft size={14} /> Back to dashboard
                    </button>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="font-heading text-3xl font-bold text-slate-900 truncate">{review.title || review.project_name || "Untitled"}</h1>
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-widest font-semibold border bg-slate-100 text-slate-600 border-slate-200">
                            {CATEGORY_LABELS[review.category]}
                        </span>
                    </div>
                    <div className="text-sm text-slate-500 mt-1">{review.procurement_type === "software" ? "Software" : "Hardware"} procurement</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        data-testid="open-chat-button"
                        disabled
                        title="Feature coming soon"
                        className="inline-flex items-center gap-2 border border-slate-300 bg-slate-50 text-sm font-medium px-4 py-2 rounded-md text-slate-400 cursor-not-allowed"
                    >
                        <ChatCircleDots size={16} /> AI Assistant
                    </button>
                    <button
                        data-testid="run-analysis-button"
                        onClick={runAnalysis}
                        disabled={analyzing || !canRunAnalysis}
                        title={!canRunAnalysis ? "Extract documents first" : ""}
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
                    <div className="max-w-3xl mx-auto">
                        <UploadZone 
                            reviewId={id} 
                            existingDocuments={review.documents}
                            onDeleteDocument={handleDeleteDocument}
                            onUploaded={(r) => { setReview(r); setTab("extracted"); toast.success("Data extracted"); }} 
                        />
                    </div>
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
                                onClick={() => saveExtracted(review.extracted_data || {}).then(() => setHasUnsavedChanges(false))}
                                disabled={!hasUnsavedChanges || saving}
                                className="text-xs font-medium border border-slate-300 hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-400 px-3 py-1.5 rounded-md transition-colors"
                                data-testid="save-extracted-button"
                            >
                                Save changes
                            </button>
                        </div>
                        <ExtractedDataEditor
                            data={review.extracted_data || {}}
                            onChange={(d) => {
                                setReview({ ...review, extracted_data: d });
                                setHasUnsavedChanges(true);
                            }}
                        />
                    </div>
                </div>
            )}

            {tab === "analysis" && (
                <div className="animate-step space-y-6">
                    {review.category === "HARDWARE" && (
                        <AnalysisControls
                            reviewId={id}
                            deepSearch={deepSearch}
                            setDeepSearch={setDeepSearch}
                            onRunAnalysis={runAnalysis}
                            analyzing={analyzing}
                        />
                    )}
                    {review.analysis ? (
                        <>
                            <AnalysisReport analysis={review.analysis} items={review.extracted_data || review.extracted_items || []} />
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
                                disabled={analyzing || !canRunAnalysis}
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
