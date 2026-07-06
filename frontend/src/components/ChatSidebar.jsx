import React, { useEffect, useRef, useState } from "react";
import { PaperPlaneTilt, Sparkle, X, User } from "@phosphor-icons/react";
import { getChatHistory, streamChat } from "../lib/api";

const suggestions = [
    "Why is this proposal expensive?",
    "What are the biggest negotiation opportunities?",
    "Which SLA clauses should be improved?",
    "Which contract clauses are risky?",
    "Summarize this proposal.",
    "Recommend whether we should accept this.",
];

export default function ChatSidebar({ reviewId, open, onClose }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [streaming, setStreaming] = useState(false);
    const listRef = useRef(null);

    useEffect(() => {
        if (open && reviewId) {
            getChatHistory(reviewId).then((d) => setMessages(d.history || []));
        }
    }, [open, reviewId]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

    const send = async (text) => {
        const q = (text ?? input).trim();
        if (!q || streaming) return;
        setInput("");
        setMessages((m) => [...m, { role: "user", content: q, timestamp: new Date().toISOString() }]);
        setMessages((m) => [...m, { role: "assistant", content: "", timestamp: new Date().toISOString() }]);
        setStreaming(true);
        await streamChat(
            reviewId,
            q,
            (delta) => setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + delta };
                return copy;
            }),
            () => setStreaming(false),
            (err) => {
                setStreaming(false);
                setMessages((m) => {
                    const copy = [...m];
                    copy[copy.length - 1] = { ...copy[copy.length - 1], content: `[error: ${err}]` };
                    return copy;
                });
            }
        );
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-40 flex" data-testid="chat-sidebar">
            <div className="flex-1 bg-slate-900/30 backdrop-blur-sm" onClick={onClose} />
            <div className="w-full max-w-md bg-white border-l border-slate-200 flex flex-col animate-chat-in shadow-2xl">
                <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center">
                            <Sparkle size={16} weight="fill" color="#fff" />
                        </div>
                        <div>
                            <div className="text-sm font-heading font-bold text-slate-900">AI Procurement Assistant</div>
                            <div className="text-[10px] uppercase tracking-widest text-slate-500">Claude Sonnet 4.5</div>
                        </div>
                    </div>
                    <button onClick={onClose} data-testid="close-chat-button" className="text-slate-400 hover:text-slate-900">
                        <X size={18} />
                    </button>
                </div>

                <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center py-8">
                            <Sparkle size={32} weight="duotone" className="mx-auto text-blue-500" />
                            <div className="mt-3 font-heading font-semibold text-slate-900">Ask about this procurement</div>
                            <div className="text-xs text-slate-500 mt-1">Grounded in your uploaded docs & the AI analysis.</div>
                            <div className="mt-6 space-y-2 text-left">
                                {suggestions.map((s) => (
                                    <button
                                        key={s}
                                        onClick={() => send(s)}
                                        data-testid={`chat-suggestion-${s.slice(0, 20).replace(/\s+/g, "-")}`}
                                        className="w-full text-left px-3 py-2 rounded-md border border-slate-200 hover:border-slate-400 hover:bg-slate-50 text-sm text-slate-700 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                            {m.role === "assistant" && (
                                <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                                    <Sparkle size={14} weight="fill" color="#fff" />
                                </div>
                            )}
                            <div className={`max-w-[80%] rounded-lg px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed ${
                                m.role === "user" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-800"
                            }`}>
                                {m.content || <span className="text-slate-400">…</span>}
                            </div>
                            {m.role === "user" && (
                                <div className="w-7 h-7 rounded-md bg-slate-200 flex items-center justify-center shrink-0">
                                    <User size={14} className="text-slate-600" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <div className="p-3 border-t border-slate-200">
                    <div className="flex gap-2">
                        <input
                            data-testid="chat-input"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && send()}
                            placeholder="Ask about pricing, SLA, risks…"
                            className="flex-1 px-3 py-2 rounded-md border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            disabled={streaming}
                        />
                        <button
                            onClick={() => send()}
                            disabled={streaming || !input.trim()}
                            data-testid="chat-send-button"
                            className="w-10 h-10 rounded-md bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 flex items-center justify-center text-white transition-colors"
                        >
                            <PaperPlaneTilt size={16} weight="fill" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
