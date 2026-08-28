CREATE OR REPLACE FUNCTION get_gst_dashboard(p_tenant_id UUID, p_start_date DATE, p_end_date DATE)
RETURNS JSON AS $$
DECLARE
    -- Output Tax Variables
    v_b2b RECORD;
    v_b2c RECORD;
    v_cdnr RECORD;
    v_cdnu RECORD;
    
    -- Input Tax Credit (ITC) Variables
    v_itc_purchases RECORD;
    v_itc_reversals RECORD;
    
    -- Head-Wise Calculations
    v_gross_cgst NUMERIC := 0;
    v_gross_sgst NUMERIC := 0;
    v_gross_igst NUMERIC := 0;
    
    v_ret_cgst NUMERIC := 0;
    v_ret_sgst NUMERIC := 0;
    v_ret_igst NUMERIC := 0;
    
    v_net_output_cgst NUMERIC := 0;
    v_net_output_sgst NUMERIC := 0;
    v_net_output_igst NUMERIC := 0;
    v_total_output_tax NUMERIC := 0;
    
    v_net_itc_cgst NUMERIC := 0;
    v_net_itc_sgst NUMERIC := 0;
    v_net_itc_igst NUMERIC := 0;
    v_total_itc NUMERIC := 0;
    
    -- Final Net Payable
    v_payable_cgst NUMERIC := 0;
    v_payable_sgst NUMERIC := 0;
    v_payable_igst NUMERIC := 0;
    v_net_gst_payable NUMERIC := 0;
    
    -- JSON Holders
    v_hsn_summary JSON;
    v_breakdown JSON;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM tenant_memberships 
        WHERE user_id = auth.uid() AND tenant_id = p_tenant_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Unauthorized: Access to this tenant is denied.';
    END IF;
    -- =========================================================================
    -- 1. B2B SALES (Customers WITH GSTIN)
    -- =========================================================================
    SELECT
        COUNT(DISTINCT b.id) AS record_count,
        COALESCE(SUM(b.subtotal), 0) AS taxable_value,
        COALESCE(SUM(b.cgst_total), 0) AS cgst,
        COALESCE(SUM(b.sgst_total), 0) AS sgst,
        COALESCE(SUM(b.igst_total), 0) AS igst,
        COALESCE(SUM(b.cgst_total + b.sgst_total + b.igst_total), 0) AS total_tax
    INTO v_b2b
    FROM bills b
    JOIN customers c ON b.customer_id = c.id
    WHERE b.tenant_id = p_tenant_id 
      AND b.bill_date BETWEEN p_start_date AND p_end_date
      AND b.status NOT IN ('draft', 'cancelled') 
      AND b.is_gst_bill = true
      AND c.gstin IS NOT NULL 
      AND TRIM(c.gstin) != '';

    -- =========================================================================
    -- 2. B2C SALES (Customers WITHOUT GSTIN / Retail)
    -- =========================================================================
    SELECT
        COUNT(DISTINCT b.id) AS record_count,
        COALESCE(SUM(b.subtotal), 0) AS taxable_value,
        COALESCE(SUM(b.cgst_total), 0) AS cgst,
        COALESCE(SUM(b.sgst_total), 0) AS sgst,
        COALESCE(SUM(b.igst_total), 0) AS igst,
        COALESCE(SUM(b.cgst_total + b.sgst_total + b.igst_total), 0) AS total_tax
    INTO v_b2c
    FROM bills b
    JOIN customers c ON b.customer_id = c.id
    WHERE b.tenant_id = p_tenant_id 
      AND b.bill_date BETWEEN p_start_date AND p_end_date
      AND b.status NOT IN ('draft', 'cancelled') 
      AND b.is_gst_bill = true
      AND (c.gstin IS NULL OR TRIM(c.gstin) = '');

    -- =========================================================================
    -- 3A. B2B CREDIT NOTES / CDNR (Exact Line Tax Math for Registered Returns)
    -- =========================================================================
    WITH cdnr_lines AS (
        SELECT 
            sr.id AS return_id,
            (sri.return_qty * bli.unit_price * (1.0 - (COALESCE(bli.discount_pct, 0) / 100.0))) AS line_taxable,
            bli.gst_rate,
            b.is_interstate
        FROM sales_returns sr
        JOIN sales_return_items sri ON sr.id = sri.sales_return_id
        JOIN bill_line_items bli ON sri.bill_line_item_id = bli.id
        JOIN bills b ON sr.original_bill_id = b.id
        JOIN customers c ON b.customer_id = c.id
        WHERE sr.tenant_id = p_tenant_id 
          AND DATE(sr.created_at) BETWEEN p_start_date AND p_end_date
          AND b.is_gst_bill = true
          AND c.gstin IS NOT NULL 
          AND TRIM(c.gstin) != ''
    )
    SELECT
        COUNT(DISTINCT return_id) AS record_count,
        COALESCE(SUM(line_taxable), 0) AS taxable_value,
        COALESCE(SUM(CASE WHEN is_interstate THEN 0 ELSE (line_taxable * (gst_rate / 200.0)) END), 0) AS cgst,
        COALESCE(SUM(CASE WHEN is_interstate THEN 0 ELSE (line_taxable * (gst_rate / 200.0)) END), 0) AS sgst,
        COALESCE(SUM(CASE WHEN is_interstate THEN (line_taxable * (gst_rate / 100.0)) ELSE 0 END), 0) AS igst,
        COALESCE(SUM(line_taxable * (gst_rate / 100.0)), 0) AS total_tax
    INTO v_cdnr
    FROM cdnr_lines;

    -- =========================================================================
    -- 3B. B2C CREDIT NOTES / CDNU (Exact Line Tax Math for Retail Returns)
    -- =========================================================================
    WITH cdnu_lines AS (
        SELECT 
            sr.id AS return_id,
            (sri.return_qty * bli.unit_price * (1.0 - (COALESCE(bli.discount_pct, 0) / 100.0))) AS line_taxable,
            bli.gst_rate,
            b.is_interstate
        FROM sales_returns sr
        JOIN sales_return_items sri ON sr.id = sri.sales_return_id
        JOIN bill_line_items bli ON sri.bill_line_item_id = bli.id
        JOIN bills b ON sr.original_bill_id = b.id
        JOIN customers c ON b.customer_id = c.id
        WHERE sr.tenant_id = p_tenant_id 
          AND DATE(sr.created_at) BETWEEN p_start_date AND p_end_date
          AND b.is_gst_bill = true
          AND (c.gstin IS NULL OR TRIM(c.gstin) = '')
    )
    SELECT
        COUNT(DISTINCT return_id) AS record_count,
        COALESCE(SUM(line_taxable), 0) AS taxable_value,
        COALESCE(SUM(CASE WHEN is_interstate THEN 0 ELSE (line_taxable * (gst_rate / 200.0)) END), 0) AS cgst,
        COALESCE(SUM(CASE WHEN is_interstate THEN 0 ELSE (line_taxable * (gst_rate / 200.0)) END), 0) AS sgst,
        COALESCE(SUM(CASE WHEN is_interstate THEN (line_taxable * (gst_rate / 100.0)) ELSE 0 END), 0) AS igst,
        COALESCE(SUM(line_taxable * (gst_rate / 100.0)), 0) AS total_tax
    INTO v_cdnu
    FROM cdnu_lines;

    -- =========================================================================
    -- 4. INPUT TAX CREDIT (Purchases from purchase_orders)
    -- =========================================================================
    SELECT
        COUNT(DISTINCT po.id) AS record_count,
        COALESCE(SUM(po.subtotal), 0) AS taxable_value,
        COALESCE(SUM(po.cgst_total), 0) AS cgst,
        COALESCE(SUM(po.sgst_total), 0) AS sgst,
        COALESCE(SUM(po.igst_total), 0) AS igst,
        COALESCE(SUM(po.cgst_total + po.sgst_total + po.igst_total), 0) AS total_tax
    INTO v_itc_purchases
    FROM purchase_orders po
    WHERE po.tenant_id = p_tenant_id 
      AND po.order_date BETWEEN p_start_date AND p_end_date
      AND po.status NOT IN ('draft', 'cancelled') 
      AND po.is_gst_supply = true;

    -- =========================================================================
    -- 5. ITC REVERSALS (Purchase Returns / Debit Notes)
    -- =========================================================================
    WITH pr_lines AS (
        SELECT 
            pr.id AS return_id,
            (pri.return_qty * pli.unit_cost * (1.0 - (COALESCE(pli.discount_pct, 0) / 100.0))) AS line_taxable,
            pli.gst_rate,
            po.is_interstate
        FROM purchase_returns pr
        JOIN purchase_return_items pri ON pr.id = pri.purchase_return_id
        JOIN po_line_items pli ON pri.po_line_item_id = pli.id
        JOIN purchase_orders po ON pr.original_po_id = po.id
        WHERE pr.tenant_id = p_tenant_id 
          AND DATE(pr.created_at) BETWEEN p_start_date AND p_end_date
          AND po.is_gst_supply = true
    )
    SELECT
        COUNT(DISTINCT return_id) AS record_count,
        COALESCE(SUM(line_taxable), 0) AS taxable_value,
        COALESCE(SUM(CASE WHEN is_interstate THEN 0 ELSE (line_taxable * (gst_rate / 200.0)) END), 0) AS cgst,
        COALESCE(SUM(CASE WHEN is_interstate THEN 0 ELSE (line_taxable * (gst_rate / 200.0)) END), 0) AS sgst,
        COALESCE(SUM(CASE WHEN is_interstate THEN (line_taxable * (gst_rate / 100.0)) ELSE 0 END), 0) AS igst,
        COALESCE(SUM(line_taxable * (gst_rate / 100.0)), 0) AS total_tax
    INTO v_itc_reversals
    FROM pr_lines;

    -- =========================================================================
    -- 6. HSN SUMMARY (GSTR-1 Table 12 Compliant)
    -- =========================================================================
    SELECT COALESCE(
        json_agg(
            json_build_object(
                'hsn_code', t.hsn_code,
                'unit', t.unit,
                'gst_rate', t.gst_rate,
                'total_qty', t.total_qty,
                'taxable_value', t.taxable_value,
                'cgst', t.cgst,
                'sgst', t.sgst,
                'igst', t.igst,
                'total_tax', t.total_tax
            ) ORDER BY t.taxable_value DESC
        ), '[]'::json
    ) INTO v_hsn_summary
    FROM (
        SELECT 
            COALESCE(NULLIF(TRIM(bli.hsn_code), ''), 'N/A') AS hsn_code,
            COALESCE(bli.unit, 'Pcs') AS unit,
            COALESCE(bli.gst_rate, 0) AS gst_rate,
            SUM(bli.qty) AS total_qty,
            SUM(bli.line_total - (bli.cgst + bli.sgst + bli.igst)) AS taxable_value,
            SUM(bli.cgst) AS cgst,
            SUM(bli.sgst) AS sgst,
            SUM(bli.igst) AS igst,
            SUM(bli.cgst + bli.sgst + bli.igst) AS total_tax
        FROM bills b
        JOIN bill_line_items bli ON b.id = bli.bill_id
        WHERE b.tenant_id = p_tenant_id 
          AND b.bill_date BETWEEN p_start_date AND p_end_date
          AND b.status NOT IN ('draft', 'cancelled') 
          AND b.is_gst_bill = true
        GROUP BY COALESCE(NULLIF(TRIM(bli.hsn_code), ''), 'N/A'), COALESCE(bli.unit, 'Pcs'), COALESCE(bli.gst_rate, 0)
    ) t;

    -- =========================================================================
    -- 7. HEAD-WISE MATHEMATICAL BALANCING
    -- =========================================================================
    -- Net Output Liability (Sales - Sales Returns)
    v_net_output_cgst := (v_b2b.cgst + v_b2c.cgst) - (v_cdnr.cgst + v_cdnu.cgst);
    v_net_output_sgst := (v_b2b.sgst + v_b2c.sgst) - (v_cdnr.sgst + v_cdnu.sgst);
    v_net_output_igst := (v_b2b.igst + v_b2c.igst) - (v_cdnr.igst + v_cdnu.igst);
    v_total_output_tax := v_net_output_cgst + v_net_output_sgst + v_net_output_igst;

    -- Net Eligible ITC (Purchases - Purchase Returns)
    v_net_itc_cgst := v_itc_purchases.cgst - v_itc_reversals.cgst;
    v_net_itc_sgst := v_itc_purchases.sgst - v_itc_reversals.sgst;
    v_net_itc_igst := v_itc_purchases.igst - v_itc_reversals.igst;
    v_total_itc := v_net_itc_cgst + v_net_itc_sgst + v_net_itc_igst;

    -- Head-Wise Net Payable (Output - ITC)
    v_payable_cgst := v_net_output_cgst - v_net_itc_cgst;
    v_payable_sgst := v_net_output_sgst - v_net_itc_sgst;
    v_payable_igst := v_net_output_igst - v_net_itc_igst;
    v_net_gst_payable := v_total_output_tax - v_total_itc;

    -- =========================================================================
    -- 8. BUILD BREAKDOWN ROWS (Compatible with Table Component)
    -- =========================================================================
    v_breakdown := json_build_array(
        json_build_object(
            'id', 'row-b2b',
            'description', 'B2B Invoices (4A, 4B, 4C)',
            'record_count', v_b2b.record_count,
            'taxable_value', v_b2b.taxable_value,
            'cgst', v_b2b.cgst,
            'sgst', v_b2b.sgst,
            'igst', v_b2b.igst,
            'total_tax', v_b2b.total_tax
        ),
        json_build_object(
            'id', 'row-b2c',
            'description', 'B2C Invoices (Table 7)',
            'record_count', v_b2c.record_count,
            'taxable_value', v_b2c.taxable_value,
            'cgst', v_b2c.cgst,
            'sgst', v_b2c.sgst,
            'igst', v_b2c.igst,
            'total_tax', v_b2c.total_tax
        ),
        json_build_object(
            'id', 'row-cdnr',
            'description', 'B2B Credit Notes (CDNR - 9B)',
            'record_count', v_cdnr.record_count,
            'taxable_value', -v_cdnr.taxable_value,
            'cgst', -v_cdnr.cgst,
            'sgst', -v_cdnr.sgst,
            'igst', -v_cdnr.igst,
            'total_tax', -v_cdnr.total_tax
        ),
        json_build_object(
            'id', 'row-cdnu',
            'description', 'B2C Credit Notes (CDNU)',
            'record_count', v_cdnu.record_count,
            'taxable_value', -v_cdnu.taxable_value,
            'cgst', -v_cdnu.cgst,
            'sgst', -v_cdnu.sgst,
            'igst', -v_cdnu.igst,
            'total_tax', -v_cdnu.total_tax
        ),
        json_build_object(
            'id', 'row-itc',
            'description', 'Purchase Invoices (Eligible ITC)',
            'record_count', v_itc_purchases.record_count,
            'taxable_value', v_itc_purchases.taxable_value,
            'cgst', v_itc_purchases.cgst,
            'sgst', v_itc_purchases.sgst,
            'igst', v_itc_purchases.igst,
            'total_tax', v_itc_purchases.total_tax
        ),
        json_build_object(
            'id', 'row-debit',
            'description', 'Purchase Returns (ITC Reversals)',
            'record_count', v_itc_reversals.record_count,
            'taxable_value', -v_itc_reversals.taxable_value,
            'cgst', -v_itc_reversals.cgst,
            'sgst', -v_itc_reversals.sgst,
            'igst', -v_itc_reversals.igst,
            'total_tax', -v_itc_reversals.total_tax
        )
    );

    -- =========================================================================
    -- 9. CONSTRUCT FINAL PAYLOAD
    -- =========================================================================
    RETURN json_build_object(
        'period', to_char(p_start_date, 'Mon YYYY'),
        'total_output_tax', v_total_output_tax,
        'total_input_tax_credit', v_total_itc,
        'net_gst_payable', v_net_gst_payable,
        'head_summary', json_build_object(
            'output', json_build_object('cgst', v_net_output_cgst, 'sgst', v_net_output_sgst, 'igst', v_net_output_igst, 'total', v_total_output_tax),
            'itc', json_build_object('cgst', v_net_itc_cgst, 'sgst', v_net_itc_sgst, 'igst', v_net_itc_igst, 'total', v_total_itc),
            'net_payable', json_build_object('cgst', v_payable_cgst, 'sgst', v_payable_sgst, 'igst', v_payable_igst, 'total', v_net_gst_payable)
        ),
        'breakdown', v_breakdown,
        'hsn_summary', v_hsn_summary
    );
END;
$$ LANGUAGE plpgsql;

REVOKE EXECUTE ON FUNCTION get_gst_dashboard(UUID, DATE, DATE) FROM public, anon;
GRANT EXECUTE ON FUNCTION get_gst_dashboard(UUID, DATE, DATE) TO authenticated;