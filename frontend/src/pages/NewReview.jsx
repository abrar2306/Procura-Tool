import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PROCUREMENT_TYPES, CATEGORIES } from "../lib/categories";
import { createReview } from "../lib/api";
import { ArrowRight, ArrowLeft, CheckCircle, Package, Cube, FileText, HandCoins } from "@phosphor-icons/react";

const iconFor = (id) => ({
    license_sku: HandCoins,
    services: FileText,
    hardware_product: Cube,
    hardware_support: FileText,
}[id] || FileText);

const StepDot = ({ n, label, active, done }) => (
    <div className="flex items-center gap-2">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${
            done ? "bg-emerald-600 text-white border-emerald-600" :
            active ? "bg-slate-900 text-white border-slate-900" :
            "bg-white text-slate-400 border-slate-300"
        }`}>
            {done ? <CheckCircle size={14} weight="fill" /> : n}
        </div>
        <span className={`text-xs font-medium ${active || done ? "text-slate-900" : "text-slate-400"}`}>{label}</span>
    </div>
);

export default function NewReview() {
    const nav = useNavigate();
    const [step, setStep] = useState(1);
    const [ptype, setPtype] = useState(null);
    const [category, setCategory] = useState(null);
    const [projectName, setProjectName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const canNextStep1 = !!ptype;
    const canNextStep2 = !!category;
    const canSubmit = projectName.trim().length > 0;

    const submit = async () => {
        setSubmitting(true);
        try {
            const r = await createReview({
                procurement_type: ptype,
                category,
                project_name: projectName,
            });
            nav(`/review/${r.id}`);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            {/* Stepper */}
            <div className="flex items-center gap-6 mb-8">
                <StepDot n={1} label="Type" active={step === 1} done={step > 1} />
                <div className="flex-1 h-px bg-slate-200" />
                <StepDot n={2} label="Category" active={step === 2} done={step > 2} />
                <div className="flex-1 h-px bg-slate-200" />
                <StepDot n={3} label="Details" active={step === 3} done={false} />
            </div>

            {step === 1 && (
                <div className="animate-step">
                    <div className="mb-8">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Step 1 of 3</div>
                        <h2 className="font-heading text-3xl font-bold text-slate-900">Select procurement type</h2>
                        <p className="text-slate-500 mt-2">Choose whether you&apos;re buying software or hardware. We&apos;ll tailor the workflow accordingly.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {PROCUREMENT_TYPES.map((t) => {
                            const Icon = t.id === "software" ? Package : Cube;
                            const selected = ptype === t.id;
                            return (
                                <button
                                    key={t.id}
                                    data-testid={`type-option-${t.id}`}
                                    onClick={() => setPtype(t.id)}
                                    className={`text-left p-6 rounded-lg border transition-all ${
                                        selected ? "border-slate-900 ring-2 ring-slate-900/10 bg-white" : "border-slate-200 hover:border-slate-400 bg-white"
                                    }`}
                                >
                                    <Icon size={28} weight="duotone" className={selected ? "text-blue-600" : "text-slate-400"} />
                                    <div className="mt-3 font-heading font-semibold text-slate-900">{t.label}</div>
                                    <div className="text-sm text-slate-500 mt-1">{t.desc}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {step === 2 && (
                <div className="animate-step">
                    <div className="mb-8">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Step 2 of 3</div>
                        <h2 className="font-heading text-3xl font-bold text-slate-900">Select procurement category</h2>
                        <p className="text-slate-500 mt-2">The remaining workflow — form or document upload — adapts to your selection.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-3">
                        {(CATEGORIES[ptype] || []).map((c) => {
                            const Icon = iconFor(c.id);
                            const selected = category === c.id;
                            return (
                                <button
                                    key={c.id}
                                    data-testid={`category-option-${c.id}`}
                                    onClick={() => setCategory(c.id)}
                                    className={`text-left p-4 rounded-lg border flex items-start gap-3 transition-all ${
                                        selected ? "border-slate-900 ring-2 ring-slate-900/10 bg-white" : "border-slate-200 hover:border-slate-400 bg-white"
                                    }`}
                                >
                                    <div className={`w-9 h-9 rounded-md flex items-center justify-center ${selected ? "bg-slate-900" : "bg-slate-100"}`}>
                                        <Icon size={18} weight="duotone" className={selected ? "text-white" : "text-slate-600"} />
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900">{c.label}</div>
                                        <div className="text-xs text-slate-500 mt-0.5">
                                            {c.workflow === "form" ? "Guided commercial form" : "Document upload & AI extraction"}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {step === 3 && (
                <div className="animate-step">
                    <div className="mb-8">
                        <div className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Step 3 of 3</div>
                        <h2 className="font-heading text-3xl font-bold text-slate-900">Project details</h2>
                        <p className="text-slate-500 mt-2">Give this review a name so you can find it later.</p>
                    </div>
                    <div className="space-y-4 max-w-xl">
                        <div>
                            <label className="text-xs font-medium text-slate-700 uppercase tracking-wider">Project name *</label>
                            <input
                                data-testid="project-name-input"
                                value={projectName}
                                onChange={(e) => setProjectName(e.target.value)}
                                placeholder="e.g. SAP S/4HANA Managed Services Renewal"
                                className="mt-1.5 w-full px-3 py-2.5 rounded-md border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Navigation */}
            <div className="mt-10 flex items-center justify-between">
                <button
                    data-testid="wizard-back-button"
                    onClick={() => (step > 1 ? setStep(step - 1) : nav("/"))}
                    className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeft size={16} /> Back
                </button>
                {step < 3 ? (
                    <button
                        data-testid="wizard-next-button"
                        onClick={() => setStep(step + 1)}
                        disabled={(step === 1 && !canNextStep1) || (step === 2 && !canNextStep2)}
                        className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
                    >
                        Continue <ArrowRight size={16} />
                    </button>
                ) : (
                    <button
                        data-testid="wizard-submit-button"
                        onClick={submit}
                        disabled={!canSubmit || submitting}
                        className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
                    >
                        {submitting ? "Creating…" : "Create review"} <ArrowRight size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
