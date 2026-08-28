import {
  Brand,
  Category,
  InventoryItem,
  InventoryItemDetail,
  StockMovementWithDetails,
} from "@/types/inventory";
import React from "react";
import { supabase } from "../supabase/client";
import { ItemFormData } from "../validations/itemSchema";
import {
  BrandFormData,
  CategoryFormData,
} from "../validations/categoryBrandSchema";
import { StockAdjustmentFormData } from "../validations/stockAdjustmentSchema";

export async function fetchInventoryItems(
  tenantId: string,
): Promise<InventoryItem[]> {
  // Query the dynamic View instead of the base table
  const { data, error } = await supabase
    .from("inventory_summary")
    .select(
      `
        *,
        categories ( name ),
        brands ( name )
    `,
    )
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Database Error fetching items:", error.message);
    throw new Error("Failed to fetch inventory");
  }
  // 1. Define exactly what Supabase returns by extending YOUR interface.
  // We temporarily "Omit" the flat names, and add the nested objects + extra DB fields.
  type DBItem = Omit<InventoryItem, "category_name" | "brand_name"> & {
    tenant_id: string;
    created_at: string;
    updated_at: string;
    categories: { name: string } | null;
    brands: { name: string } | null;
  };

  // 2. Safely cast the raw data to our strict database type
  const rawItems = (data || []) as unknown as DBItem[];

  // 3. Destructure! We pull out the extra DB fields and the nested objects.
  // Everything else (id, name, sku, sell_price, etc.) is perfectly bundled into "...rest"
  return rawItems.map(
    ({ categories, brands, tenant_id, created_at, updated_at, ...rest }) => ({
      ...rest, // Automatically maps all the standard fields!
      category_name: categories?.name || null,
      brand_name: brands?.name || null,
    }),
  );
}

export async function fetchItemById(
  tenantId: string,
  itemId: string,
): Promise<InventoryItemDetail> {
  // Query the View
  const { data, error } = await supabase
    .from("inventory_summary")
    .select(
      `
        *,
        categories ( name ),
        brands( name )
    `,
    )
    .eq("tenant_id", tenantId)
    .eq("id", itemId)
    .single();

  if (error) {
    console.error("Database Error fetching single item:", error.message);
    throw new Error("Failed to fetch item details");
  }

  // Fetch all active physical stock batches for this item
  const { data: batches } = await supabase
    .from("item_batches")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("item_id", itemId)
    .order("created_at", { ascending: true });

  return {
    id: data.id,
    name: data.name,
    sku: data.sku,
    barcode: data.barcode,
    hsn_code: data.hsn_code,
    unit: data.unit,
    // buy_price: data.buy_price,
    default_sell_price: data.default_sell_price,
    gst_rate: data.gst_rate,
    total_stock_qty: data.total_stock_qty,
    low_stock_threshold: data.low_stock_threshold,
    description: data.description,
    images: data.images || [], // Fallback to empty array if null
    is_active: data.is_active,
    category_id: data.category_id,
    brand_id: data.brand_id,
    category_name: data.categories?.name || "Uncategorized",
    brand_name: data.brands?.name || "No Brand",
    batches: batches || [], // Append the physical stock batches to the details
  };
}

export async function createInventoryItem(
  tenantId: string,
  data: ItemFormData,
) {
  // Extract volatile stock/pricing data so it doesn't hit the base catalog table
  const { buy_price, stock_qty, ...insertData } = data;

  const { data: newItem, error } = await supabase
    .from("items")
    .insert({
      ...insertData,
      id: data.id,
      tenant_id: tenantId,
      images: data.images || [],
    })
    .select()
    .single();

  if (error) {
    console.error("Database Error creating item:", error.message);
    throw new Error(error.message || "Failed to create product.");
  }

  // Create the "Opening Stock" Batch automatically
  if (stock_qty > 0 || (buy_price !== undefined && buy_price > 0)) {
    const { error: batchError } = await supabase.from("item_batches").insert({
      tenant_id: tenantId,
      item_id: newItem.id,
      po_id: null, // No PO because it's manual opening stock
      batch_number: "OPENING-STOCK",
      buy_price: buy_price || 0,
      sell_price: insertData.default_sell_price,
      stock_qty: stock_qty || 0,
    });

    if (batchError) {
      console.error("Error creating opening stock batch:", batchError.message);
    }
  }

  return newItem;
}

export async function updateInventoryItem(
  tenantId: string,
  itemId: string,
  data: ItemFormData,
) {
  // UPDATE: Strip out buy_price and stock_qty so they don't break the update payload
  const { id, buy_price, stock_qty, ...updateData } = data;

  const { data: currentItem } = await supabase
    .from("items")
    .select("images")
    .eq("tenant_id", tenantId)
    .eq("id", itemId)
    .single<{ images: string[] | null }>();

  const { data: result, error } = await supabase
    .from("items")
    .update({
      ...updateData,
      images: data.images || [],
    })
    .eq("tenant_id", tenantId)
    .eq("id", itemId)
    .select()
    .single();

  if (error) {
    console.error("Database Error updating item:", error.message);
    throw new Error(error.message || "Failed to update product.");
  }

  const oldImages: string[] = currentItem?.images || [];
  const newImages: string[] = data.images || [];
  const orphanedUrls = oldImages.filter((oldUrl: string) => !newImages.includes(oldUrl));

  if (orphanedUrls.length > 0) {
    fetch("/api/upload/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: orphanedUrls }),
    }).catch(console.error);
  }

  return result;
}

export async function deleteInventoryItem(tenantId: string, itemId: string) {
  // 1. Fetch the item first to get its image URLs BEFORE deleting it
  const { data: itemData } = await supabase
    .from("items")
    .select("images")
    .eq("tenant_id", tenantId)
    .eq("id", itemId)
    .single();

  const { error } = await supabase
    .from("items")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", itemId);

  if (error) {
    console.error("Database Error deleting item:", error.message);
    throw new Error(error.message || "Failed to delete product.");
  }

  if (itemData?.images && itemData.images.length > 0) {
    // We don't await this so the UI updates instantly while the server cleans up in the background
    fetch("/api/upload/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: itemData.images }),
    }).catch(console.error);
  }

  return true;
}

// ====================================================================
// Category & Brand Functions
// ====================================================================

export async function fetchCategories(tenantId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching categories:", error.message);
    throw new Error("Failed to fetch categories");
  }

  return data as unknown as Category[];
}

export async function fetchBrands(tenantId: string): Promise<Brand[]> {
  const { data, error } = await supabase
    .from("brands")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching brands:", error.message);
    throw new Error("Failed to fetch brands");
  }

  return data as unknown as Brand[];
}

export async function createCategory(tenantId: string, data: CategoryFormData) {
  const { data: result, error } = await supabase
    .from("categories")
    .insert({
      tenant_id: tenantId,
      name: data.name,
      slug: data.slug,
      parent_id: data.parent_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Database Error creating category:", error.message);
    throw new Error(error.message || "Failed to create category.");
  }

  return result;
}

export async function updateCategory(
  tenantId: string,
  categoryId: string,
  data: CategoryFormData,
) {
  console.log("[DEBUG] 3. API updateCategory received data:", {
    tenantId,
    categoryId,
    data,
  });

  const updatePayload = {
    name: data.name,
    slug: data.slug,
    parent_id: data.parent_id || null,
  };

  console.log("[DEBUG] 4. Payload sending to Supabase:", updatePayload);

  const { data: result, error } = await supabase
    .from("categories")
    .update(updatePayload)
    .eq("tenant_id", tenantId)
    .eq("id", categoryId)
    .select()
    .single();

  console.log("[DEBUG] 5. Supabase Result:", { result, error });

  if (error) {
    console.error("Database Error updating category:", error.message);
    throw new Error(error.message || "Failed to update category.");
  }

  return result;
}

export async function deleteCategory(tenantId: string, categoryId: string) {
  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", categoryId);

  if (error) {
    console.error("Database Error deleting category:", error.message);
    // Note: If you try to delete a category that has items attached, Postgres will block it
    // depending on your ON DELETE constraints. It's good to provide a clean message.
    if (error.code === "23503") {
      // Foreign key violation
      throw new Error(
        "Cannot delete category because it is currently linked to products.",
      );
    }
    throw new Error(error.message || "Failed to delete category.");
  }

  return true;
}

// Brand

export async function createBrand(tenantId: string, data: BrandFormData) {
  const { data: result, error } = await supabase
    .from("brands")
    .insert({
      tenant_id: tenantId,
      name: data.name,
      logo_url: data.logo_url || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Database Error creating brand:", error.message);
    throw new Error(error.message || "Failed to create brand.");
  }

  return result;
}

export async function updateBrand(
  tenantId: string,
  brandId: string,
  data: BrandFormData,
) {
  console.log("[DEBUG] 3. API updateBrand received data:", {
    tenantId,
    brandId,
    data,
  });

  const updatePayload = {
    name: data.name,
    logo_url: data.logo_url || null,
  };

  console.log("[DEBUG] 4. Payload sending to Supabase:", updatePayload);

  const { data: result, error } = await supabase
    .from("brands")
    .update(updatePayload)
    .eq("tenant_id", tenantId)
    .eq("id", brandId)
    .select()
    .single();

  console.log("[DEBUG] 5. Supabase Result:", { result, error });

  if (error) {
    console.error("Database Error updating brand:", error.message);
    throw new Error(error.message || "Failed to update brand.");
  }

  return result;
}

export async function deleteBrand(tenantId: string, brandId: string) {
  const { error } = await supabase
    .from("brands")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", brandId);

  if (error) {
    console.error("Database Error deleting brand:", error.message);
    if (error.code === "23503") {
      // Foreign key violation
      throw new Error(
        "Cannot delete brand because it is currently linked to products.",
      );
    }
    throw new Error(error.message || "Failed to delete brand.");
  }

  return true;
}

export async function fetchAllStockMovements(tenantId: string): Promise<StockMovementWithDetails[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      *,
      items ( name ),
      users ( full_name )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Database Error fetching all stock movements:", error.message);
    throw new Error("Failed to fetch stock movements.");
  }

  return data as unknown as StockMovementWithDetails[];
}

export async function fetchItemStockMovements(tenantId: string, itemId: string): Promise<StockMovementWithDetails[]> {
  const { data, error } = await supabase
    .from('stock_movements')
    .select(`
      *,
      users ( full_name )
    `)
    .eq('tenant_id', tenantId)
    .eq('item_id', itemId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(`Database Error fetching stock movements for item ${itemId}:`, error.message);
    throw new Error("Failed to fetch item stock history.");
  }

  // We cast it to the same type for consistency, even though we don't strictly need the item name here
  return data as unknown as StockMovementWithDetails[];
}

export async function createStockAdjustment(
  tenantId: string,
  data: StockAdjustmentFormData,
) {
  console.log(`\n=== [DEBUG - createStockAdjustment] ===`);
  console.log(`[DEBUG] Payload:`, JSON.stringify(data, null, 2));

  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    throw new Error("Not authenticated");
  }

  //Double check the Gatekeeper Math(losses must match allocations)
  if (data.qty_change < 0) {
    const allocatedQty = data.batch_allocations.reduce(
      (sum, b) => sum + b.qty,
      0,
    );
    if (Math.abs(data.qty_change) !== allocatedQty) {
      throw new Error(
        `Critical Math Mismatch: Shrinkage is ${data.qty_change}, but batches allocated equal ${allocatedQty}.`,
      );
    }
  }

  // Call the Postgres RPC
  const { data: movementId, error } = await supabase.rpc('reconcile_inventory_stock', {
    p_tenant_id: tenantId,
    p_item_id: data.item_id,
    p_qty_change: data.qty_change,
    p_reason: data.reason,
    p_allocations: data.batch_allocations,
    p_new_buy_price: data.new_batch_buy_price
  });

  if (error) {
    console.error("[API Error] Failed to reconcile stock:", error.message);
    throw new Error(error.message || "Failed to adjust inventory stock.");
  }

  console.log(`[DEBUG] Successfully adjusted stock. Movement Log ID: ${movementId}`);
  console.log(`=== [DEBUG - createStockAdjustment END] ===\n`);

  return movementId;
}
