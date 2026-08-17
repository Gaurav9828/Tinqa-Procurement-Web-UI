import type {
    CategoryResponse,
    DealerResponse,
    CreateDealerRequest,
    UpdateDealerRequest,
} from './dealer.types';

export interface HeaderColumnFilterProps {
    title: string;
    options: string[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
}

export interface DealerStatusBadgeProps {
    isActive: boolean;
}

export interface DealerFilterBarProps {
    searchQuery: string;
    selectedCategoryId?: number;
    categories: CategoryResponse[];
    onSearchChange: (q: string) => void;
    onCategoryChange: (id?: number) => void;
    onOpenCreateDealerModal: () => void;
    onOpenCreateCategoryModal: () => void;
}

export interface DealerCategoryFormModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    onClose: () => void;
    onSubmit: (data: { name: string; description?: string }) => Promise<boolean>;
}

export interface DealerPreviewModalProps {
    isOpen: boolean;
    dealer: DealerResponse | null;
    onClose: () => void;
}

export interface DealerFormModalProps {
    isOpen: boolean;
    isSubmitting: boolean;
    apiError?: string | null;
    categories: CategoryResponse[];
    dealers?: DealerResponse[];
    initialData: DealerResponse | null;
    onClose: () => void;
    onSubmit: (data: CreateDealerRequest | UpdateDealerRequest) => Promise<boolean>;
}