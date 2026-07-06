import React from "react";
import { Field, Section, Select } from "./FormBits";

// Standard software license metrics used by major publishers (Microsoft, Oracle, SAP, IBM, etc.)
const LICENSE_METRICS = [
    "Per Named User",
    "Per Concurrent User",
    "Per Device",
    "Per Core",
    "Per Processor / CPU",
    "Per Server",
    "Per Instance",
    "Per Virtual Machine",
    "Per Full Use Equivalent (FUE)",
    "Site License",
    "Enterprise License",
    "Per Transaction / API Call",
    "Per GB / Storage",
    "Custom",
];

const LICENSE_TYPES = ["Subscription", "Perpetual", "Term License", "SaaS", "Consumption-based"];

export default function LicenseSkuForm({ data, onChange, procurementType }) {
    const set = (k, v) => onChange({ ...data, [k]: v });
    const isHardware = procurementType === "hardware";

    // Live-computed unit price preview (not sent from client — backend recomputes authoritatively)
    const qty = Number(data.quantity) || 0;
    const total = Number(data.total_price) || 0;
    const computedUnit = qty > 0 && total > 0 ? (total / qty) : null;

    return (
        <div>
            <Section title="General information">
                <Field label="Project name" value={data.project_name} onChange={(v) => set("project_name", v)} testid="form-project-name" />
                <Field label="Country" value={data.country} onChange={(v) => set("country", v)} testid="form-country" />
                <Select label="Currency" value={data.currency} onChange={(v) => set("currency", v)} options={["USD", "EUR", "GBP", "INR", "AED", "SGD"]} testid="form-currency" />
                <Field label="Procurement date" value={data.procurement_date} onChange={(v) => set("procurement_date", v)} type="date" testid="form-date" />
            </Section>

            <Section title="Vendor information">
                <Field label={isHardware ? "OEM" : "OEM / Publisher"} value={data.oem} onChange={(v) => set("oem", v)} testid="form-oem" />
                <Field label="Reseller" value={data.reseller} onChange={(v) => set("reseller", v)} testid="form-reseller" />
                <Field label="Product name" value={data.product_name} onChange={(v) => set("product_name", v)} testid="form-product" />
                <Field label={isHardware ? "Model number" : "Product version"} value={data.product_version} onChange={(v) => set("product_version", v)} testid="form-version" />
                <Field label={isHardware ? "Part number" : "SKU"} value={data.sku} onChange={(v) => set("sku", v)} testid="form-sku" />
                {!isHardware && <Select label="License type" value={data.license_type} onChange={(v) => set("license_type", v)} options={LICENSE_TYPES} testid="form-license-type" />}
                {!isHardware && <Select label="License metric" value={data.license_metric} onChange={(v) => set("license_metric", v)} options={LICENSE_METRICS} testid="form-license-metric" />}
                {isHardware && <Field label="Configuration" value={data.configuration} onChange={(v) => set("configuration", v)} testid="form-config" />}
                {isHardware && <Field label="Support level" value={data.support_level} onChange={(v) => set("support_level", v)} testid="form-support-level" />}
            </Section>

            <Section title="Commercial information">
                <Field label="Quantity" value={data.quantity} onChange={(v) => set("quantity", v)} type="number" testid="form-quantity" />
                <Field label="Total price" value={data.total_price} onChange={(v) => set("total_price", v)} type="number" testid="form-total-price" />
                <Field label="Contract duration (months)" value={data.contract_duration} onChange={(v) => set("contract_duration", v)} testid="form-duration" />
                <Select label="Support included" value={data.support_included} onChange={(v) => set("support_included", v)} options={["Yes", "No", "Partial"]} testid="form-support-included" />
                {isHardware && <Field label="Warranty" value={data.warranty} onChange={(v) => set("warranty", v)} testid="form-warranty" />}
                {isHardware && <Field label="Delivery timeline" value={data.delivery_timeline} onChange={(v) => set("delivery_timeline", v)} testid="form-delivery" />}
            </Section>

            {computedUnit !== null && (
                <div className="mt-2 mb-4 px-4 py-3 rounded-md border border-blue-200 bg-blue-50 flex items-center justify-between">
                    <div>
                        <div className="text-[10px] uppercase tracking-widest text-blue-700 font-semibold">Auto-calculated unit price</div>
                        <div className="text-xs text-slate-600 mt-0.5">Derived at analysis time: total price ÷ quantity</div>
                    </div>
                    <div className="font-mono-data font-bold text-slate-900 text-lg" data-testid="computed-unit-price">
                        {data.currency || ""} {computedUnit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                </div>
            )}
        </div>
    );
}
