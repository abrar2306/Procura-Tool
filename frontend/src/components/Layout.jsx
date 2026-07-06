import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Buildings, ChartLineUp, FilePlus, Gavel, Sparkle, Database } from "@phosphor-icons/react";

const NavItem = ({ to, icon: Icon, label, active }) => (
    <Link
        to={to}
        data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
        className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }`}
    >
        <Icon size={18} weight={active ? "fill" : "regular"} />
        {label}
    </Link>
);

export default function Layout({ children }) {
    const location = useLocation();
    const navigate = useNavigate();
    const path = location.pathname;

    return (
        <div className="min-h-screen flex bg-white text-slate-900">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 bg-slate-50/60">
                <div className="px-6 py-6 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-md bg-slate-900 flex items-center justify-center">
                            <Gavel size={20} weight="duotone" color="#fff" />
                        </div>
                        <div>
                            <div className="font-heading font-bold text-slate-900 leading-tight">Procura</div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">IT Advisory</div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 px-3 py-4 space-y-1">
                    <div className="px-3 pb-2 text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Workspace</div>
                    <NavItem to="/" icon={ChartLineUp} label="Dashboard" active={path === "/"} />
                    <NavItem to="/review/new" icon={FilePlus} label="New Review" active={path === "/review/new"} />
                </nav>

                <div className="p-4 m-3 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 text-xs font-heading font-bold text-slate-900">
                        <Sparkle size={14} weight="fill" className="text-blue-600" />
                        AI-powered
                    </div>
                    <div className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Claude Sonnet 4.5 analyzes contracts, SLAs, and pricing to deliver consulting-grade recommendations.
                    </div>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-md bg-gradient-to-br from-slate-900 to-slate-700 flex items-center justify-center shadow-sm">
                            <Gavel size={16} weight="duotone" color="#fff" />
                        </div>
                        <div className="leading-tight">
                            <div className="font-heading font-bold text-slate-900 text-base">Procura</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <Buildings size={11} className="text-slate-400" />
                                IT Procurement Advisory Platform
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-700">AI online</span>
                        </div>
                        <button
                            onClick={() => navigate("/review/new")}
                            data-testid="header-new-review-button"
                            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-slate-900 text-white px-3.5 py-2 rounded-md hover:bg-slate-800 hover:shadow-md transition-all"
                        >
                            <FilePlus size={13} weight="bold" /> New Review
                        </button>
                    </div>
                </header>
                <main className="flex-1 overflow-y-auto">{children}</main>
            </div>
        </div>
    );
}
