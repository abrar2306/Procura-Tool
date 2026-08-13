import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listReviews, updateReview, bulkDeleteReviews, deleteReview } from "../lib/api";
import { CATEGORY_LABELS } from "../lib/categories";
import { Pencil, Trash, CheckSquare, Square, X } from "lucide-react";
import { toast } from "sonner";

export default function Reviews() {
    const nav = useNavigate();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    
    // Bulk Select mode
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    
    // Modal state
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [editTitle, setEditTitle] = useState("");

    const fetchReviews = () => {
        setLoading(true);
        listReviews()
            .then((d) => { setReviews(d); setLoading(false); })
            .catch(() => { setError(true); setLoading(false); });
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const toggleSelectAll = (e) => {
        e.stopPropagation();
        if (selectedIds.size === reviews.length && reviews.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(reviews.map(r => r.id)));
        }
    };

    const toggleSelect = (id, e) => {
        if (e) e.stopPropagation();
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Are you sure you want to delete ${selectedIds.size} review(s)?`)) return;
        try {
            await bulkDeleteReviews({ ids: Array.from(selectedIds) });
            toast.success(`Deleted ${selectedIds.size} review(s)`);
            setSelectedIds(new Set());
            setSelectMode(false);
            fetchReviews();
        } catch (e) {
            console.error(e);
        }
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm("Are you sure you want to delete this review?")) return;
        try {
            await deleteReview(id);
            toast.success("Review deleted");
            fetchReviews();
        } catch (e) {
            console.error(e);
        }
    };

    const openEditModal = (r, e) => {
        e.stopPropagation();
        setEditId(r.id);
        setEditTitle(r.title || r.project_name || "");
        setEditModalOpen(true);
    };

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        try {
            await updateReview(editId, { title: editTitle });
            toast.success("Review updated");
            setEditModalOpen(false);
            fetchReviews();
        } catch (e) {
            console.error(e);
        }
    };

    const StatusBadge = ({ status }) => {
        const map = {
            draft: "bg-slate-100 text-slate-600 border-slate-200",
            analyzed: "bg-emerald-50 text-emerald-700 border-emerald-200",
            error: "bg-red-50 text-red-700 border-red-200",
        };
        const activeStatus = status || "draft";
        return (
            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-semibold border ${map[activeStatus] || map.draft}`}>
                {activeStatus}
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-step">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="font-heading text-3xl font-bold text-slate-900">Reviews</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage and organize your procurement reviews.</p>
                </div>
                <div className="flex items-center gap-3">
                    {selectMode ? (
                        <>
                            <button
                                onClick={() => {
                                    setSelectMode(false);
                                    setSelectedIds(new Set());
                                }}
                                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBulkDelete}
                                disabled={selectedIds.size === 0}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
                            >
                                Delete {selectedIds.size > 0 ? `[${selectedIds.size}]` : ""}
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={() => setSelectMode(true)}
                            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors"
                        >
                            Select
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                {loading ? (
                    <div className="p-12 text-center text-slate-500 text-sm">Loading reviews...</div>
                ) : error ? (
                    <div className="p-12 text-center">
                        <div className="text-slate-500 text-sm">Failed to load reviews.</div>
                        <button
                            onClick={fetchReviews}
                            className="mt-4 inline-flex items-center px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-md transition-colors"
                        >
                            Retry
                        </button>
                    </div>
                ) : reviews.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="text-slate-500 text-sm">No reviews found.</div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200">
                                    {selectMode && (
                                        <th className="w-12 px-6 py-3 text-left">
                                            <button 
                                                onClick={toggleSelectAll} 
                                                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                            >
                                                {selectedIds.size === reviews.length && reviews.length > 0 ? (
                                                    <CheckSquare size={18} className="text-blue-600" />
                                                ) : (
                                                    <Square size={18} />
                                                )}
                                            </button>
                                        </th>
                                    )}
                                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Review Name</th>
                                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Category</th>
                                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Status</th>
                                    <th className="text-left px-6 py-4 text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Date Created</th>
                                    <th className="text-right px-6 py-4 w-24"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {reviews.map((r) => {
                                    const displayName = r.title || r.project_name;
                                    const fallbackName = `Review #${r.id.slice(0, 6)}`;
                                    const finalName = displayName || fallbackName;

                                    return (
                                        <tr
                                            key={r.id}
                                            className="group border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                                            onClick={(e) => {
                                                if (selectMode) {
                                                    toggleSelect(r.id, e);
                                                } else {
                                                    nav(`/review/${r.id}`);
                                                }
                                            }}
                                        >
                                            {selectMode && (
                                                <td className="px-6 py-4">
                                                    <div className="text-slate-400 hover:text-slate-600 transition-colors">
                                                        {selectedIds.has(r.id) ? (
                                                            <CheckSquare size={18} className="text-blue-600" />
                                                        ) : (
                                                            <Square size={18} />
                                                        )}
                                                    </div>
                                                </td>
                                            )}
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-900 line-clamp-1">{finalName}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {CATEGORY_LABELS?.[r.category] || r.category || "Uncategorized"}
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={r.status} />
                                            </td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">
                                                {new Date(r.created_at).toLocaleDateString(undefined, {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {!selectMode && (
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => openEditModal(r, e)}
                                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors focus:outline-none"
                                                            title="Edit Review"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={(e) => handleDelete(r.id, e)}
                                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors focus:outline-none"
                                                            title="Delete Review"
                                                        >
                                                            <Trash size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm transition-opacity">
                    <div 
                        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900 text-lg">Edit Review</h3>
                            <button 
                                onClick={() => setEditModalOpen(false)} 
                                className="text-slate-400 hover:text-slate-600 transition-colors focus:outline-none p-1 rounded-md hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-6">
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    Review Title
                                </label>
                                <input
                                    type="text"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                                    placeholder="Enter review title"
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setEditModalOpen(false)}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors focus:outline-none"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none shadow-sm"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
