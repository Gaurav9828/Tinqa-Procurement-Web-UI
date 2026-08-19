import React from 'react';
import {
  X,
  FileText,
  UserCheck,
  Check,
  Clock,
  HardDrive,
  Tag,
  Mail,
  Phone,
  Building,
  Briefcase,
  User,
  Calendar,
  Download,
  Loader2,
  Package,
  ShoppingCart,
  Truck,
  IndianRupee,
  Hash,
  Boxes,
  UserRound,
} from 'lucide-react';

import type { UnifiedApprovalItem } from '../types/approval.types';

export interface PreviewModalProps {
  request: UnifiedApprovalItem | null;
  isOpen: boolean;
  isDownloading?: boolean;
  onClose: () => void;
  onApprove: (requestId: number) => void;
  onReject: (requestId: number) => void;
  onDownload?: (documentId: number, fileName: string) => void;
  formatTime: (isoString: string) => string;
}

export const ApprovalPreviewModal: React.FC<PreviewModalProps> = ({
  request,
  isOpen,
  isDownloading = false,
  onClose,
  onApprove,
  onReject,
  onDownload,
  formatTime,
}) => {
  if (!isOpen || !request) return null;

  /*
   * PROFILE uses requestId.
   * DOCUMENT, STOCKS and ORDERS use id.
   */
  const targetId =
    request.approvalType === 'PROFILE'
      ? request.requestId
      : request.id;

  const getHeaderConfig = () => {
    switch (request.approvalType) {
      case 'DOCUMENT':
        return {
          icon: <FileText className="w-5 h-5" />,
          iconClass: 'bg-blue-500/10 text-blue-500',
          title: 'Document Approval Details',
          subtitle: 'Document approval request',
        };

      case 'PROFILE':
        return {
          icon: <UserCheck className="w-5 h-5" />,
          iconClass: 'bg-purple-500/10 text-purple-500',
          title: 'Profile Update Details',
          subtitle: 'Employee profile approval request',
        };

      case 'STOCKS':
        return {
          icon: <Boxes className="w-5 h-5" />,
          iconClass: 'bg-orange-500/10 text-orange-500',
          title: 'Stock Approval Details',
          subtitle: 'Stock approval request',
        };

      case 'ORDERS':
        return {
          icon: <ShoppingCart className="w-5 h-5" />,
          iconClass: 'bg-cyan-500/10 text-cyan-500',
          title: 'Order Approval Details',
          subtitle: 'Order approval request',
        };
    }
  };

  const header = getHeaderConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-neutral-900 border border-black/10 dark:border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">

        {/* ============================================================
            HEADER
        ============================================================ */}
        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-black/[0.02] dark:bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${header.iconClass}`}>
              {header.icon}
            </div>

            <div>
              <h2 className="font-semibold text-lg text-black dark:text-white">
                {header.title}
              </h2>

              <p className="text-xs text-gray-500 dark:text-neutral-400">
                {header.subtitle}
              </p>

              <p className="text-xs text-gray-400 dark:text-neutral-500 font-mono mt-0.5">
                Ref ID: #{targetId}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-black/10 dark:hover:bg-white/10 text-gray-500 hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ============================================================
            CONTENT
        ============================================================ */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm">

          {/* ==========================================================
              DOCUMENT PREVIEW
          ========================================================== */}
          {request.approvalType === 'DOCUMENT' && (
            <div className="space-y-4">

              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 space-y-3">

                <div>
                  <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase">
                    File Name
                  </label>

                  <p className="font-semibold text-base text-black dark:text-white break-all">
                    {request.originalFileName || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">

                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">
                      File Size:
                    </span>

                    <p className="font-medium font-mono text-black dark:text-white mt-0.5">
                      {(request.fileSize / 1024).toFixed(1)} KB
                    </p>
                  </div>

                  <div>
                    <span className="text-gray-500 dark:text-neutral-400">
                      Content Type:
                    </span>

                    <p className="font-medium text-black dark:text-white mt-0.5">
                      {request.contentType || 'N/A'}
                    </p>
                  </div>

                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">

                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Tag className="w-3.5 h-3.5 text-blue-500" />
                    <span>Category</span>
                  </div>

                  <p className="font-medium text-black dark:text-white">
                    {request.category || 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <HardDrive className="w-3.5 h-3.5 text-purple-500" />
                    <span>Purpose</span>
                  </div>

                  <p className="font-medium text-black dark:text-white">
                    {request.purpose || 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <FileText className="w-3.5 h-3.5 text-cyan-500" />
                    <span>Document Type</span>
                  </div>

                  <p className="font-medium text-black dark:text-white">
                    {request.type || 'N/A'}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-black/10 dark:border-white/10 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Stage</span>
                  </div>

                  <p className="font-medium text-black dark:text-white">
                    {request.stage || 'N/A'}
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  Submitted at: {formatTime(request.createdAt)}
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onDownload?.(
                    request.id,
                    request.originalFileName
                  )
                }
                disabled={isDownloading}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-500/20 transition-colors w-full justify-center text-xs cursor-pointer disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading Document...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Document Attachment
                  </>
                )}
              </button>
            </div>
          )}

          {/* ==========================================================
              PROFILE PREVIEW
          ========================================================== */}
          {request.approvalType === 'PROFILE' && (
            <div className="space-y-4">

              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5 space-y-3">

                <div className="flex justify-between items-start gap-4">

                  <div>
                    <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium uppercase">
                      Requester Employee
                    </label>

                    <p className="font-semibold text-lg text-black dark:text-white">
                      {request.displayName ||
                        `${request.firstName || ''} ${request.lastName || ''}`.trim() ||
                        'N/A'}
                    </p>
                  </div>

                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 whitespace-nowrap">
                    Emp Code: {request.employeeCode || 'N/A'}
                  </span>

                </div>

                <p className="text-xs text-gray-500">
                  Requested by:{' '}
                  <span className="font-medium text-black dark:text-white">
                    @{request.requestedByUsername || 'N/A'}
                  </span>
                </p>

              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Mail className="w-4 h-4 text-blue-500 shrink-0" />
                  <div className="truncate">
                    <span className="text-gray-400 block text-[10px]">
                      Email
                    </span>
                    <span className="font-medium truncate text-black dark:text-white">
                      {request.personalEmail || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Phone className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">
                      Phone
                    </span>
                    <span className="font-medium text-black dark:text-white">
                      {request.primaryPhone || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Building className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">
                      Department
                    </span>
                    <span className="font-medium text-black dark:text-white">
                      {request.department || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4 text-purple-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">
                      Designation
                    </span>
                    <span className="font-medium text-black dark:text-white">
                      {request.designation || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <User className="w-4 h-4 text-rose-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">
                      Gender
                    </span>
                    <span className="font-medium text-black dark:text-white">
                      {request.gender || 'N/A'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 flex items-center gap-2.5">
                  <Calendar className="w-4 h-4 text-cyan-500 shrink-0" />
                  <div>
                    <span className="text-gray-400 block text-[10px]">
                      Date of Birth
                    </span>
                    <span className="font-medium text-black dark:text-white">
                      {request.dateOfBirth || 'N/A'}
                    </span>
                  </div>
                </div>

              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  Requested at: {formatTime(request.requestedAt)}
                </span>
              </div>

            </div>
          )}

          {/* ==========================================================
              STOCKS PREVIEW
          ========================================================== */}
          {request.approvalType === 'STOCKS' && (
            <div className="space-y-4">

              {/* Stock Summary */}
              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <label className="text-xs text-gray-500 dark:text-neutral-400 uppercase font-medium">
                      Item
                    </label>

                    <p className="font-semibold text-lg text-black dark:text-white">
                      {request.itemName || 'N/A'}
                    </p>
                  </div>

                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20 whitespace-nowrap">
                    {request.batchNumber || 'N/A'}
                  </span>

                </div>

                <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                  <UserRound className="w-3.5 h-3.5" />
                  <span>
                    Dealer:{' '}
                    <span className="font-medium text-black dark:text-white">
                      {request.dealerName || 'N/A'}
                    </span>
                  </span>
                </div>

              </div>

              {/* Stock Information */}
              <div className="grid grid-cols-2 gap-3">

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Hash className="w-4 h-4 text-orange-500" />
                    Batch Number
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    {request.batchNumber || 'N/A'}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <ShoppingCart className="w-4 h-4 text-blue-500" />
                    Order Number
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    {request.orderNumber || 'N/A'}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Package className="w-4 h-4 text-purple-500" />
                    Quantity
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    {request.totalOrderQuantity}{' '}
                    <span className="text-xs font-normal text-gray-500">
                      {request.unitType}
                    </span>
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
                    Unit Price
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    ₹{request.unitPrice?.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10 col-span-2">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
                    Total Price
                  </div>

                  <p className="font-semibold text-base mt-1 text-black dark:text-white">
                    ₹{request.totalPrice?.toLocaleString('en-IN')}
                  </p>
                </div>

              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  Created at: {formatTime(request.createdAt)}
                </span>
              </div>

            </div>
          )}

          {/* ==========================================================
              ORDERS PREVIEW
          ========================================================== */}
          {request.approvalType === 'ORDERS' && (
            <div className="space-y-4">

              {/* Order Summary */}
              <div className="p-4 rounded-xl bg-black/5 dark:bg-white/5">

                <div className="flex items-start justify-between gap-4">

                  <div>
                    <label className="text-xs text-gray-500 dark:text-neutral-400 uppercase font-medium">
                      Order Number
                    </label>

                    <p className="font-semibold text-lg text-black dark:text-white">
                      {request.orderNumber || 'N/A'}
                    </p>
                  </div>

                  <span className="font-mono text-xs px-2.5 py-1 rounded-md bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    Order #{request.id}
                  </span>

                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">
                      Dealer
                    </span>

                    <p className="font-medium text-black dark:text-white">
                      {request.dealerName || 'N/A'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase">
                      Item
                    </span>

                    <p className="font-medium text-black dark:text-white">
                      {request.itemName || 'N/A'}
                    </p>
                  </div>

                </div>

              </div>

              {/* Order Details */}
              <div className="grid grid-cols-2 gap-3">

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Package className="w-4 h-4 text-purple-500" />
                    Quantity
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    {request.orderQuantity}{' '}
                    <span className="text-xs font-normal text-gray-500">
                      {request.unitType}
                    </span>
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <IndianRupee className="w-4 h-4 text-emerald-500" />
                    Total Price
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    ₹{request.totalPrice?.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Truck className="w-4 h-4 text-blue-500" />
                    Shipment Price
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    ₹{request.shipmentPrice?.toLocaleString('en-IN')}
                  </p>
                </div>

                <div className="p-3 rounded-xl border border-black/10 dark:border-white/10">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-4 h-4 text-cyan-500" />
                    Order Date
                  </div>

                  <p className="font-semibold mt-1 text-black dark:text-white">
                    {request.orderDate
                      ? formatTime(request.orderDate)
                      : 'N/A'}
                  </p>
                </div>

              </div>

              {/* Total */}
              <div className="p-4 rounded-xl border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">

                <div className="flex items-center justify-between">

                  <span className="text-xs text-gray-500">
                    Order Total
                  </span>

                  <span className="text-lg font-bold text-black dark:text-white">
                    ₹{(
                      (request.totalPrice || 0) +
                      (request.shipmentPrice || 0)
                    ).toLocaleString('en-IN')}
                  </span>

                </div>

              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  Order Date: {formatTime(request.orderDate)}
                </span>
              </div>

            </div>
          )}

        </div>

        {/* ============================================================
            ACTION FOOTER
        ============================================================ */}
        <div className="p-4 border-t border-black/10 dark:border-white/10 flex justify-end gap-3 bg-black/[0.02] dark:bg-white/[0.02]">

          <button
            onClick={() => onReject(targetId)}
            className="px-4 py-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500 hover:text-white font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Reject
          </button>

          <button
            onClick={() => onApprove(targetId)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <Check className="w-4 h-4" />
            Approve
          </button>

        </div>

      </div>
    </div>
  );
};