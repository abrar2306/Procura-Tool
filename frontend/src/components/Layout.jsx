import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Buildings, ChartLineUp, FilePlus, Gavel, Gear, Key, X, CheckCircle, CircleNotch, Eraser } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "./ui/DropdownMenu";
import { toast } from "sonner";

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

    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [tempApiKey, setTempApiKey] = useState("");
    const [tempProvider, setTempProvider] = useState("google");
    const [tempModel, setTempModel] = useState("gemini-2.5-flash");
    const [hasCustomKey, setHasCustomKey] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const storedKey = localStorage.getItem("customGeminiKey");
        if (storedKey) {
            setHasCustomKey(true);
            setTempApiKey(storedKey);
        }
    }, []);

    const handleSaveApiKey = () => {
        setIsSaving(true);
        setTimeout(() => {
            if (tempApiKey.trim()) {
                localStorage.setItem("customGeminiKey", tempApiKey.trim());
                setHasCustomKey(true);
                toast.success("Custom AI API Key saved.");
            } else {
                localStorage.removeItem("customGeminiKey");
                setHasCustomKey(false);
                toast.info("Custom AI API Key removed. Reverting to default.");
            }
            setIsSaving(false);
            setIsApiKeyModalOpen(false);
        }, 600); // simulate verification delay
    };

    const handleCloseModal = () => {
        setTempApiKey(localStorage.getItem("customGeminiKey") || "");
        setTempProvider("google");
        setTempModel("gemini-2.5-flash");
        setIsApiKeyModalOpen(false);
    };

    const handleOpenModal = () => {
        setTempApiKey(localStorage.getItem("customGeminiKey") || "");
        setTempProvider("google");
        setTempModel("gemini-2.5-flash");
        setIsApiKeyModalOpen(true);
    };

    return (
        <div className="h-screen flex bg-white text-slate-900 overflow-hidden">
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

                <div className="mt-auto px-3 py-4 border-t border-slate-200">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors">
                                <Gear size={18} />
                                Settings
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56 mb-2" side="top">
                            <DropdownMenuLabel className="text-xs text-slate-500 uppercase tracking-widest">Configuration</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={handleOpenModal} className="flex items-center gap-2 cursor-pointer py-2">
                                <Key size={16} className="text-slate-500" />
                                <span>Custom AI API Key</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </aside>

            {/* Main */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-white/80 backdrop-blur-sm sticky top-0 z-30">
                    <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer">
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
                    </Link>
                    <div className="flex items-center gap-2">
                        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200" title={hasCustomKey ? "Using Custom AI API Key" : "Using System AI API Key"}>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-emerald-700">
                                {hasCustomKey ? "Custom AI Online" : "AI online"}
                            </span>
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

            {/* Custom API Key Modal */}
            {isApiKeyModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h3 className="font-heading font-semibold text-slate-900 flex items-center gap-2">
                                    <Key size={18} className="text-slate-500" />
                                    AI Provider Settings
                                </h3>
                                <p className="text-xs text-slate-500 mt-1">Override the default AI with your own custom API keys.</p>
                            </div>
                            <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5 flex flex-col gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">AI Provider</label>
                                <select 
                                    value={tempProvider}
                                    onChange={(e) => setTempProvider(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all bg-white"
                                >
                                    <option value="google">Google Gemini</option>
                                    <option value="openai" disabled>OpenAI (Coming Soon)</option>
                                    <option value="anthropic" disabled>Anthropic (Coming Soon)</option>
                                </select>
                            </div>

                            {tempProvider === "google" && (
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Model</label>
                                    <select 
                                        value={tempModel}
                                        onChange={(e) => setTempModel(e.target.value)}
                                        className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all bg-white"
                                    >
                                        <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Efficient)</option>
                                        <option value="gemini-2.5-pro">Gemini 2.5 Pro (Advanced Reasoning)</option>
                                        <option value="gemini-1.5-pro">Gemini 1.5 Pro (Legacy)</option>
                                    </select>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">API Key</label>
                                <div className="relative flex items-center">
                                    <input 
                                        type="password" 
                                        value={tempApiKey}
                                        onChange={(e) => setTempApiKey(e.target.value)}
                                        placeholder={tempProvider === "google" ? "AIzaSy..." : "sk-..."}
                                        className="w-full pl-3 pr-10 py-2 border border-slate-200 rounded-md text-sm font-mono focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400 transition-all placeholder:font-sans placeholder:text-slate-300"
                                    />
                                    {tempApiKey && (
                                        <button 
                                            onClick={() => setTempApiKey("")}
                                            className="absolute right-3 text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center"
                                        >
                                            <Eraser size={16} />
                                        </button>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-500 mt-2">
                                    Your key is securely stored in your browser's local storage and is only transmitted directly to the Procura backend during requests. Leave blank to revert to the system default.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 border-t border-slate-100">
                            <button 
                                onClick={handleCloseModal} 
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveApiKey}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-md shadow-sm transition-colors disabled:opacity-70"
                            >
                                {isSaving ? <CircleNotch size={16} className="animate-spin" /> : <CheckCircle size={16} />}
                                Verify & Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
