import React, { useCallback, useState } from "react";
import { CloudArrowUp, File, X } from "@phosphor-icons/react";
import { uploadDocuments } from "../lib/api";
import { toast } from "sonner";

export default function UploadZone({
    reviewId,
    onUploaded,
    uploadFn = uploadDocuments,
    title = "Drop procurement documents here",
    subtitle = "SOW, MSA, SLA, proposals, pricing sheets",
    submitLabel = "Upload & extract",
    compact = false,
    testidPrefix = "upload",
    existingDocuments = [],
    onDeleteDocument,
}) {
    const [dragOver, setDragOver] = useState(false);
    const [files, setFiles] = useState([]);
    const [uploading, setUploading] = useState(false);

    const doUpload = async () => {
        if (!files.length) return;
        setUploading(true);
        try {
            const r = await uploadFn(reviewId, files);
            toast.success(`Extracted data from ${files.length} document(s)`);
            setFiles([]);
            onUploaded && onUploaded(r);
        } catch (e) {
            if (!e.response) {
                toast.error("Upload failed: " + e.message);
            }
        } finally {
            setUploading(false);
        }
    };

    const onDrop = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
        const dropped = Array.from(e.dataTransfer.files);
        setFiles((prev) => [...prev, ...dropped]);
    }, []);

    const handlePick = (e) => {
        const picked = Array.from(e.target.files || []);
        setFiles((prev) => [...prev, ...picked]);
    };

    const zonePadding = compact ? "p-6" : "p-10";
    const iconSize = compact ? 32 : 48;

    return (
        <div>
            <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`border-2 border-dashed rounded-lg ${zonePadding} text-center transition-colors ${
                    dragOver ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50/60"
                }`}
                data-testid={`${testidPrefix}-drop-zone`}
            >
                <CloudArrowUp size={iconSize} weight="duotone" className="mx-auto text-slate-400" />
                <div className={`mt-2 font-heading font-semibold text-slate-900 ${compact ? "text-sm" : ""}`}>{title}</div>
                <div className="text-xs text-slate-500 mt-1">{subtitle}</div>
                
                <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                    {["PDF", "DOCX", "XLSX", "CSV", "TXT"].map(ext => (
                        <span key={ext} className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px] font-bold font-mono-data uppercase tracking-wider">{ext}</span>
                    ))}
                </div>

                <label className="inline-block mt-4 cursor-pointer">
                    <span className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors">
                        Browse files
                    </span>
                    <input
                        type="file"
                        multiple
                        accept=".pdf,.docx,.xlsx,.csv,.txt,.pptx,.ppt"
                        onChange={handlePick}
                        className="hidden"
                        data-testid={`${testidPrefix}-file-input`}
                    />
                </label>
            </div>

            {files.length > 0 && (
                <div className="mt-4 space-y-2">
                    {files.map((f, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-md bg-white">
                            <File size={18} className="text-slate-500" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-slate-900 truncate">{f.name}</div>
                                <div className="text-xs text-slate-500 font-mono-data">{(f.size / 1024).toFixed(1)} KB</div>
                            </div>
                            {!uploading && (
                                <button
                                    onClick={() => setFiles(files.filter((_, idx) => idx !== i))}
                                    className="text-slate-400 hover:text-rose-600 transition-colors"
                                    data-testid={`${testidPrefix}-remove-file-${i}`}
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        onClick={doUpload}
                        disabled={uploading}
                        data-testid={`${testidPrefix}-submit-button`}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-sm font-medium py-2.5 rounded-md transition-colors flex justify-center items-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                Extracting information with AI…
                            </>
                        ) : (
                            `${submitLabel} (${files.length})`
                        )}
                    </button>
                </div>
            )}
            
            {existingDocuments.length > 0 && (
                <div className="mt-6 border-t border-slate-200 pt-4">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">Previously Uploaded</div>
                    <div className="space-y-2">
                        {existingDocuments.map((f, i) => (
                            <div key={f.id || i} className="flex items-center gap-3 p-2.5 border border-slate-200 rounded-md bg-slate-50">
                                <File size={18} className="text-slate-400" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-slate-700 truncate">{f.file_name}</div>
                                    <div className="text-xs text-slate-400 font-mono-data">{((f.file_size_bytes || 0) / 1024).toFixed(1)} KB</div>
                                </div>
                                {onDeleteDocument && (
                                    <button
                                        onClick={() => onDeleteDocument(f.id)}
                                        className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded transition-colors"
                                        title="Delete file and extracted data"
                                    >
                                        <X size={16} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
