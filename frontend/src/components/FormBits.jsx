import React from "react";

export const Field = ({ label, value, onChange, placeholder, type = "text", testid }) => (
    <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</label>
        <input
            data-testid={testid}
            type={type}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
    </div>
);

export const Section = ({ title, children }) => (
    <div className="mb-6">
        <div className="text-xs font-heading font-bold uppercase tracking-widest text-slate-900 mb-3 pb-2 border-b border-slate-200">{title}</div>
        <div className="grid md:grid-cols-2 gap-4">{children}</div>
    </div>
);

export const Select = ({ label, value, onChange, options, testid }) => (
    <div>
        <label className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">{label}</label>
        <select
            data-testid={testid}
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
            <option value="">Select…</option>
            {options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
    </div>
);
