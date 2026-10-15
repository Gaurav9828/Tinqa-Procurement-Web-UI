import React, { useState } from 'react';
import { UserCheck, RefreshCw, BookOpen } from 'lucide-react';
import { useEmployeeList } from '../hooks/useEmployeeList';
import { useEmployeeActions } from '../hooks/useEmployeeActions';
import { useEmployeeDetails } from '../hooks/useEmployeeDetails';
import type { EmployeeResponse } from '../types/employee.types';
import { EmployeeFilterBar } from '../components/EmployeeFilterBar';
import { EmployeeTable } from '../components/EmployeeTable';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { EmployeeDetailsModal } from '../components/EmployeeDetailsModal';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { EmployeeAccessModal } from '../components/EmployeeAccessModal';
import { AccessCatalogModal } from '../components/AccessCatalogModal';
import { useAccess } from '../../../hooks/useAccess';

export const EmployeeManagementPage: React.FC = () => {
    const {
        employees,
        totalPages,
        totalElements,
        isLoading,
        filters,
        updateSearch,
        updateStatus,
        updatePage,
        refetch,
    } = useEmployeeList();

    const {
        isSubmitting,
        isSelf,
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
    const [employeeForAccess, setEmployeeForAccess] = useState<EmployeeResponse | null>(null);
    const [isCatalogOpen, setIsCatalogOpen] = useState(false);
    const { can } = useAccess();

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
                        <UserCheck className="w-6 h-6 text-[#0071e3]" /> Employee Management
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">
                        Manage personnel profiles, their designation and admin level, and approval-based deletion requests.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setIsCatalogOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors cursor-pointer"
                    >
                        <BookOpen className="w-3.5 h-3.5" /> Roles &amp; permissions
                    </button>
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

            {/* Filter Toolbar */}
            <EmployeeFilterBar
                searchQuery={filters.search || ''}
                selectedStatus={filters.status || ''}
                onSearchChange={updateSearch}
                onStatusChange={updateStatus}
                onOpenCreateModal={can('EMPLOYEE_CREATE') ? handleOpenCreate : undefined}
            />

            {/* Data Table */}
            <EmployeeTable
                employees={employees}
                isLoading={isLoading}
                isSelf={isSelf}
                onView={(id) => fetchDetails(id)}
                onEdit={handleOpenEdit}
                onDelete={(emp) => setEmployeeToDelete(emp)}
                onManageAccess={(emp) => setEmployeeForAccess(emp)}
            />

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
                isSelfEdit={employeeToEdit ? isSelf(employeeToEdit) : false}
                existingEmployees={employees}
                isSubmitting={isSubmitting}
                onClose={() => setIsFormModalOpen(false)}
                onSubmitCreate={createEmployee}
                onSubmitUpdate={(id, data) => updateEmployee(id, data, employeeToEdit ?? undefined)}
            />

            <DeleteConfirmationModal
                isOpen={Boolean(employeeToDelete)}
                employee={employeeToDelete}
                isSubmitting={isSubmitting}
                onClose={() => setEmployeeToDelete(null)}
                onRequestDeletion={requestDeletion}
                onFinalizeDelete={finalizeDelete}
                onUpdateStatus={async (id, status) => (await updateEmployee(id, { status }, employeeToDelete ?? undefined)).ok}
            />

            <EmployeeAccessModal
                employee={employeeForAccess}
                isSelf={employeeForAccess ? isSelf(employeeForAccess) : false}
                isSubmitting={isSubmitting}
                onClose={() => setEmployeeForAccess(null)}
                onSave={(id, payload) => updateEmployee(id, payload, employeeForAccess ?? undefined)}
            />

            <AccessCatalogModal isOpen={isCatalogOpen} onClose={() => setIsCatalogOpen(false)} />

            {/* Read Details Modal */}
            <EmployeeDetailsModal
                employee={selectedDetailsEmployee}
                isLoading={isDetailsLoading}
                onClose={clearDetails}
            />

        </div>
    );
};