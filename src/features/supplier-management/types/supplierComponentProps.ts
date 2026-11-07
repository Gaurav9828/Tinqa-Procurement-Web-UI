import type {
    CategoryResponse,
    SupplierResponse,
    CreateSupplierRequest,
    UpdateSupplierRequest,
} from './supplier.types';

export interface HeaderColumnFilterProps {
    title: string;
    options: string[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
}

export interface SupplierStatusBadgeProps {
    isActive: boolean;
}

export interface SupplierPreviewModalProps {
    isOpen: boolean;
    supplier: SupplierResponse | null;
    onClose: () => void;
}

export interface SupplierFormModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    apiError?: string | null;
    categories: CategoryResponse[];
    suppliers?: SupplierResponse[];
    initialData: SupplierResponse | null;
    onClose: () => void;
    onSubmit: (data: CreateSupplierRequest | UpdateSupplierRequest) => Promise<boolean>;
}