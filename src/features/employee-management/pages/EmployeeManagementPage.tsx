import React, { useState } from 'react';
import { UserCheck, RefreshCw } from 'lucide-react';
import { Alert } from '../../../components/ui/Alert'; // Adjust import path as needed
import { useEmployeeList } from '../hooks/useEmployeeList';
import { useEmployeeActions } from '../hooks/useEmployeeActions';
import { useEmployeeDetails } from '../hooks/useEmployeeDetails';
import type { EmployeeResponse } from '../types/employee.types';
import { EmployeeFilterBar } from '../components/EmployeeFilterBar';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';

export const EmployeeManagementPage: React.FC = () => {
    const {
        employees,
        totalPages,
        totalElements,
        isLoading,
        error,
        filters,
        updateSearch,
        updateStatus,
        updatePage,
        refetch,
    } = useEmployeeList();

    const {
        isSubmitting,
        actionError,
        actionSuccess,
        userRole,
        clearMessages,
        createEmployee,
        updateEmployee,
        requestDeletion,
        finalizeDelete,
    } = useEmployeeActions(refetch);

    const {
        employee: selectedDetailsEmployee,
        isLoading: isDetailsLoading,
        fetchDetails,
        clearDetails,
    } = useEmployeeDetails();

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [employeeToEdit, setEmployeeToEdit] = useState<EmployeeResponse | null>(null);
    const [employeeToDelete, setEmployeeToDelete] = useState<EmployeeResponse | null>(null);

    const handleOpenCreate = () => {
        setEmployeeToEdit(null);
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (emp: EmployeeResponse) => {
        setEmployeeToEdit(emp);
        setIsFormModalOpen(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-black dark:text-white flex items-center gap-2">
                        <UserCheck className="w-6 h-6 text-[#0071e3]" /> Employee Directory
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                        Manage personnel profiles, employment statuses, and multi-tier approval deletion requests.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => refetch()}
                        className="p-2 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl text-gray-500 transition-colors cursor-pointer"
                        title="Refresh List"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <span className="px-3 py-1 rounded-full text-xs font-mono font-semibold bg-blue-500/10 text-[#0071e3] border border-blue-500/20">
                        Total: {totalElements}
                    </span>
                </div>
            </div>

            {/* Notifications */}
            {actionError && (
                <Alert
                    type="error"
                    message={actionError}
                    onClose={clearMessages}
                />
            )}
            {actionSuccess && (
                <Alert
                    type="success"
                    message={actionSuccess}
                    onClose={clearMessages}
                />
            )}

            {/* Filter Toolbar */}
            <EmployeeFilterBar
                searchQuery={filters.search || ''}
                selectedStatus={filters.status || ''}
                onSearchChange={updateSearch}
                onStatusChange={updateStatus}
                onOpenCreateModal={handleOpenCreate}
            />

            {/* Data Table */}
            {error ? (
                <Alert
                    type="error"
                    message={error}
                />
            ) : (
                <EmployeeTable
                    employees={employees}
                    isLoading={isLoading}
                    userRole={userRole}
                    onView={(id) => fetchDetails(id)}
                    onEdit={handleOpenEdit}
                    onDelete={(emp) => setEmployeeToDelete(emp)}
                />
            )}

            {/* Pagination Bar */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                    <span>
                        Page {(filters.page || 0) + 1} of {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={(filters.page || 0) === 0}
                            onClick={() => updatePage((filters.page || 0) - 1)}
                            className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                            Previous
                        </button>
                        <button
                            disabled={(filters.page || 0) + 1 >= totalPages}
                            onClick={() => updatePage((filters.page || 0) + 1)}
                            className="px-3 py-1 bg-black/5 dark:bg-white/5 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}

            <EmployeeFormModal
                isOpen={isFormModalOpen}
                employeeToEdit={employeeToEdit}
                userRole={userRole}
                existingEmployees={employees}
                isSubmitting={isSubmitting}
                onClose={() => setIsFormModalOpen(false)}
                onSubmitCreate={createEmployee}
                onSubmitUpdate={updateEmployee}
            />

            <DeleteConfirmationModal
                isOpen={Boolean(employeeToDelete)}
                employee={employeeToDelete}
                userRole={userRole}
                isSubmitting={isSubmitting}
                onClose={() => setEmployeeToDelete(null)}
                onRequestDeletion={requestDeletion}
                onFinalizeDelete={finalizeDelete}
                onUpdateStatus={(id, status) => updateEmployee(id, { status })}
            />

            {/* Read Details Modal */}
            <EmployeeDetailsModal
                employee={selectedDetailsEmployee}
                isLoading={isDetailsLoading}
                onClose={clearDetails}
            />

        </div>
    );
};