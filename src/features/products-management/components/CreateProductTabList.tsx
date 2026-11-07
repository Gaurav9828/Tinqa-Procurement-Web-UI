import React from 'react';
import { ModalTabList } from '../../../components/ui/TabbedModal';
import type { CREATE_PRODUCT_TABS, CreateProductTab, TabStatus } from '../utils/createProductTabs';

interface CreateProductTabListProps {
    tabs: typeof CREATE_PRODUCT_TABS;
    activeTab: CreateProductTab;
    statusOf: (id: CreateProductTab) => TabStatus;
    onSelect: (id: CreateProductTab) => void;
}

/** The parts of the product form: the shared modal tab list under the product form's ids. */
export const CreateProductTabList: React.FC<CreateProductTabListProps> = (props) => (
    <ModalTabList idPrefix="create-product" label="Product form sections" {...props} />
);
