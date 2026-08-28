export type MovementType = 'purchase' | 'sale' | 'return_in' | 'return_out' | 'adjustment';
export type MovementReferenceType = 'bill' | 'purchase_order' | 'sales_return' | 'purchase_return' | 'manual_adjustment' | 'opening_stock';

export interface ItemBatch {
    id: string;
    tenant_id: string;
    item_id: string;
    po_id: string | null;
    batch_number: string | null;
    buy_price: number;
    sell_price: number;
    stock_qty: number;
    created_at: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    hsn_code: string | null;
    unit: string;
    // buy_price: number;
    default_sell_price: number;
    gst_rate: number | null;
    total_stock_qty: number;
    low_stock_threshold: number;
    description: string | null;
    images: string[];
    is_active: boolean;
    category_id: string | null;
    brand_id: string | null;
    category_name: string | null;
    brand_name: string | null;

    batches?: ItemBatch[];
}

export interface InventoryItemDetail {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    hsn_code: string | null;
    unit: string;
    // buy_price: number;
    default_sell_price: number;
    gst_rate: number | null;
    total_stock_qty: number;
    low_stock_threshold: number;
    description: string | null;
    images: string[];
    is_active: boolean;
    category_id: string | null; 
    brand_id: string | null;
    category_name: string | null;
    brand_name: string | null;

    batches?: ItemBatch[];
}

export interface Category {
    id: string;
    name: string;
    slug: string;
    parent_id: string | null;
    created_at: string;
}

export interface Brand {
    id: string;
    name: string;
    logo_url: string | null;
    created_at: string;
}

export interface StockMovement {
    id: string;
    tenant_id: string;
    item_id: string;
    supplier_id: string | null;
    
    type: MovementType;
    
    qty_change: number; 
    qty_before: number;
    qty_after: number;
    
    reference_id: string | null;
    reference_type: MovementReferenceType | null;
    note: string | null;
    
    created_by: string | null; 
    created_at: string;
}

export interface StockMovementWithDetails extends StockMovement {
    // Joined from the 'items' table
    items?: {
        name: string;
    } | null;
    
    // Joined from the 'users' table
    users?: {
        full_name: string;
    } | null;
}

export interface ItemVelocityReport {
    item_id: string;
    name: string;
    total_in: number;
    total_out: number;
    net_movement: number;
}

export interface StockRunwayReport {
    item_id: string;
    name: string;
    current_stock: number;
    avg_daily_sales: number;
    days_left: number; // calculated as current_stock / avg_daily_sales
}