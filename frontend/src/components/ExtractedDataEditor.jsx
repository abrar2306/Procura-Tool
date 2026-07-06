import React from "react";
import { Field, Section } from "./FormBits";
import { Plus, Trash } from "@phosphor-icons/react";

export default function ExtractedDataEditor({ data, onChange, procurementType }) {
    const d = data || { commercial: {}, contract: {}, sla: {}, hardware: {}, resources: [] };
    const setSection = (sec, val) => onChange({ ...d, [sec]: { ...(d[sec] || {}), ...val } });
    const setResources = (rs) => onChange({ ...d, resources: rs });

    return (
        <div>
            {procurementType !== "hardware" && (
                <>
                    <Section title="Commercial information">
                        <Field label="Vendor name" value={d.commercial?.vendor_name} onChange={(v) => setSection("commercial", { vendor_name: v })} testid="ex-vendor" />
                        <Field label="Service name" value={d.commercial?.service_name} onChange={(v) => setSection("commercial", { service_name: v })} testid="ex-service" />
                        <Field label="Billing model" value={d.commercial?.billing_model} onChange={(v) => setSection("commercial", { billing_model: v })} testid="ex-billing" />
                        <Field label="Hourly rate" value={d.commercial?.hourly_rate} onChange={(v) => setSection("commercial", { hourly_rate: v })} testid="ex-hourly" />
                        <Field label="Monthly cost" value={d.commercial?.monthly_cost} onChange={(v) => setSection("commercial", { monthly_cost: v })} testid="ex-monthly" />
                        <Field label="Fixed cost" value={d.commercial?.fixed_cost} onChange={(v) => setSection("commercial", { fixed_cost: v })} testid="ex-fixed" />
                        <Field label="Contract duration" value={d.commercial?.contract_duration} onChange={(v) => setSection("commercial", { contract_duration: v })} testid="ex-duration" />
                        <Field label="Total value" value={d.commercial?.total_value} onChange={(v) => setSection("commercial", { total_value: v })} testid="ex-total" />
                        <Field label="Currency" value={d.commercial?.currency} onChange={(v) => setSection("commercial", { currency: v })} testid="ex-currency" />
                    </Section>

                    <div className="mb-6">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200">
                            <div className="text-xs font-heading font-bold uppercase tracking-widest text-slate-900">Resources</div>
                            <button
                                onClick={() => setResources([...(d.resources || []), { role: "", experience_level: "mid", count: 1, location: "", monthly_rate: "" }])}
                                data-testid="add-resource-button"
                                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900"
                            >
                                <Plus size={14} /> Add resource
                            </button>
                        </div>
                        <div className="space-y-2">
                            {(d.resources || []).map((r, i) => (
                                <div key={i} className="grid md:grid-cols-6 gap-2 items-end p-3 border border-slate-200 rounded-md bg-slate-50/50">
                                    <div className="md:col-span-2">
                                        <Field label="Role" value={r.role} onChange={(v) => { const rs = [...d.resources]; rs[i] = { ...rs[i], role: v }; setResources(rs); }} testid={`res-role-${i}`} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">Level</label>
                                        <select
                                            value={r.experience_level || "mid"}
                                            onChange={(e) => { const rs = [...d.resources]; rs[i] = { ...rs[i], experience_level: e.target.value }; setResources(rs); }}
                                            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm bg-white"
                                            data-testid={`res-level-${i}`}
                                        >
                                            <option value="junior">Junior</option>
                                            <option value="mid">Mid</option>
                                            <option value="senior">Senior</option>
                                        </select>
                                    </div>
                                    <Field label="Count" value={r.count} onChange={(v) => { const rs = [...d.resources]; rs[i] = { ...rs[i], count: v }; setResources(rs); }} type="number" testid={`res-count-${i}`} />
                                    <Field label="Monthly rate" value={r.monthly_rate} onChange={(v) => { const rs = [...d.resources]; rs[i] = { ...rs[i], monthly_rate: v }; setResources(rs); }} testid={`res-rate-${i}`} />
                                    <button
                                        onClick={() => setResources(d.resources.filter((_, idx) => idx !== i))}
                                        className="h-9 rounded-md border border-slate-300 hover:bg-rose-50 hover:border-rose-300 hover:text-rose-600 text-slate-500 transition-colors flex items-center justify-center"
                                        data-testid={`res-remove-${i}`}
                                    >
                                        <Trash size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Section title="Contract information">
                        <Field label="Payment terms" value={d.contract?.payment_terms} onChange={(v) => setSection("contract", { payment_terms: v })} testid="ct-payment" />
                        <Field label="Warranty" value={d.contract?.warranty} onChange={(v) => setSection("contract", { warranty: v })} testid="ct-warranty" />
                        <Field label="Penalty clauses" value={d.contract?.penalty_clauses} onChange={(v) => setSection("contract", { penalty_clauses: v })} testid="ct-penalty" />
                        <Field label="Termination clauses" value={d.contract?.termination_clauses} onChange={(v) => setSection("contract", { termination_clauses: v })} testid="ct-termination" />
                        <Field label="Price escalation" value={d.contract?.price_escalation} onChange={(v) => setSection("contract", { price_escalation: v })} testid="ct-escalation" />
                        <Field label="Auto renewal" value={d.contract?.auto_renewal} onChange={(v) => setSection("contract", { auto_renewal: v })} testid="ct-renewal" />
                        <Field label="Liability" value={d.contract?.liability} onChange={(v) => setSection("contract", { liability: v })} testid="ct-liability" />
                        <Field label="Service credits" value={d.contract?.service_credits} onChange={(v) => setSection("contract", { service_credits: v })} testid="ct-credits" />
                    </Section>

                    <Section title="SLA information">
                        <Field label="Availability" value={d.sla?.availability} onChange={(v) => setSection("sla", { availability: v })} testid="sla-availability" />
                        <Field label="Response time" value={d.sla?.response_time} onChange={(v) => setSection("sla", { response_time: v })} testid="sla-response" />
                        <Field label="Resolution time" value={d.sla?.resolution_time} onChange={(v) => setSection("sla", { resolution_time: v })} testid="sla-resolution" />
                        <Field label="Severity matrix" value={d.sla?.severity_matrix} onChange={(v) => setSection("sla", { severity_matrix: v })} testid="sla-severity" />
                        <Field label="Escalation matrix" value={d.sla?.escalation_matrix} onChange={(v) => setSection("sla", { escalation_matrix: v })} testid="sla-escalation" />
                        <Field label="Support hours" value={d.sla?.support_hours} onChange={(v) => setSection("sla", { support_hours: v })} testid="sla-hours" />
                        <Field label="Exclusions" value={d.sla?.exclusions} onChange={(v) => setSection("sla", { exclusions: v })} testid="sla-exclusions" />
                    </Section>
                </>
            )}

            {procurementType === "hardware" && (
                <Section title="Hardware information">
                    <Field label="OEM" value={d.hardware?.oem} onChange={(v) => setSection("hardware", { oem: v })} testid="hw-oem" />
                    <Field label="Product" value={d.hardware?.product} onChange={(v) => setSection("hardware", { product: v })} testid="hw-product" />
                    <Field label="Model number" value={d.hardware?.model_number} onChange={(v) => setSection("hardware", { model_number: v })} testid="hw-model" />
                    <Field label="Part number" value={d.hardware?.part_number} onChange={(v) => setSection("hardware", { part_number: v })} testid="hw-part" />
                    <Field label="Configuration" value={d.hardware?.configuration} onChange={(v) => setSection("hardware", { configuration: v })} testid="hw-config" />
                    <Field label="Quantity" value={d.hardware?.quantity} onChange={(v) => setSection("hardware", { quantity: v })} testid="hw-qty" />
                    <Field label="Warranty" value={d.hardware?.warranty} onChange={(v) => setSection("hardware", { warranty: v })} testid="hw-warranty" />
                    <Field label="Support level" value={d.hardware?.support_level} onChange={(v) => setSection("hardware", { support_level: v })} testid="hw-support" />
                    <Field label="Delivery timeline" value={d.hardware?.delivery_timeline} onChange={(v) => setSection("hardware", { delivery_timeline: v })} testid="hw-delivery" />
                    <Field label="Unit price" value={d.hardware?.unit_price} onChange={(v) => setSection("hardware", { unit_price: v })} testid="hw-unit" />
                    <Field label="Total price" value={d.hardware?.total_price} onChange={(v) => setSection("hardware", { total_price: v })} testid="hw-total" />
                </Section>
            )}
        </div>
    );
}
