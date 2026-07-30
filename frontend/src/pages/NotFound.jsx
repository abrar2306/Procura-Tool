import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            <WarningCircle size={64} weight="duotone" className="text-slate-300 mb-4" />
            <h1 className="font-heading text-4xl font-bold text-slate-900 mb-2">Page not found</h1>
            <p className="text-slate-500 mb-8 max-w-md">
                The page you are looking for doesn't exist or has been moved.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors">
                <ArrowLeft size={16} /> Back to Dashboard
            </Link>
        </div>
    );
}
