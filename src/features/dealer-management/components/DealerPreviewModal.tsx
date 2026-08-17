import React from 'react';
import { X, Building2, Phone, Mail, MapPin, Tag } from 'lucide-react';
import type { DealerResponse } from '../types/dealer.types';

interface DealerPreviewModalProps {
    isOpen: boolean;
    dealer: DealerResponse | null;
    onClose: () => void;
}

export const DealerPreviewModal: React.FC<DealerPreviewModalProps> = ({ isOpen, dealer, onClose }) => {
    if (!isOpen || !dealer) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl p-6 shadow-2xl space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-3">
                    <h3 className="text-base font-bold text-black dark:text-white flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-[#0071e3]" /> Dealer Details
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg">
                        <X className="w-4 h-4 text-gray-400" />
                    </button>
                </div>

                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-bold text-black dark:text-white">{dealer.name}</p>
                        <p className="text-gray-400 font-mono">GSTIN: {dealer.gstin || 'N/A'}</p>
                    </div>

                    <div className="space-y-1.5 text-gray-600 dark:text-gray-300">
                        <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-[#0071e3]" />
                            <span>{dealer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Phone className="w-4 h-4 text-[#0071e3]" />
                            <span>{dealer.phone}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <MapPin className="w-4 h-4 text-[#0071e3] shrink-0 mt-0.5" />
                            <span>
                                {[dealer.address, dealer.city, dealer.state, dealer.pincode].filter(Boolean).join(', ') || 'No address details'}
                            </span>
                        </div>
                    </div>

                    <div className="border-t border-black/5 dark:border-white/5 pt-2">
                        <p className="font-semibold text-black dark:text-white mb-1.5 flex items-center gap-1">
                            <Tag className="w-3.5 h-3.5 text-[#0071e3]" /> Mapped Categories:
                        </p>
                        <div className="flex flex-wrap gap-1">
                            {dealer.categories && dealer.categories.length > 0 ? (
                                dealer.categories.map((cat) => (
                                    <span key={cat.id} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-[#0071e3] font-medium">
                                        {cat.name}
                                    </span>
                                ))
                            ) : (
                                <span className="text-gray-400">No categories mapped</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-black/5 dark:bg-white/10 rounded-xl font-semibold text-black dark:text-white"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};