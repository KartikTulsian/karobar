import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// 1. Setup Supabase Client for backend verification
// Use your local Supabase URL and the SERVICE ROLE KEY (not the anon key) 
// so the test can bypass RLS and verify the math freely.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const supabase = createClient(supabaseUrl, supabaseKey);

// Test Data based on your seed.sql
const TENANT_ID = '11111111-1111-1111-1111-111111111111'; // Ravi Auto Parts

test.describe('Phase 1: Core Billing & Return Lifecycle', () => {

    let createdBillId = '';
    let originalAmountDue = 0;
    let customerId = '';

    // await test.step('Setup: Login to the application', async () => {
    //     await page.goto('/login');
    //     await page.getByPlaceholder('Email').fill(LOGIN_EMAIL);
    //     await page.getByPlaceholder('Password').fill(LOGIN_PASS);
    //     await page.getByRole('button', { name: 'Sign In' }).click();
    //     await expect(page).toHaveURL('/dashboard');
    // });
    test('Execute Full Lifecycle', async ({ page }) => {

        // ====================================================================
        // STEP 1: CREATE CUSTOMER
        // ====================================================================
        await test.step('Create a new Registered Customer', async () => {
            // Navigate to the customers page (assuming standard route)
            await page.goto('/people/customers');

            // Assuming there's an 'Add Customer' button that opens the CustomerForm modal/page
            await page.getByRole('button', { name: /Add Customer/i }).click();

            // Fill out the CustomerForm
            await page.getByPlaceholder('e.g. Rahul Sharma').fill('E2E Automation Customer');
            await page.getByPlaceholder('10-digit number').fill('9999999999');
            await page.getByRole('button', { name: 'Save Customer' }).click();

            // Wait for DB to reflect the new customer
            await page.waitForTimeout(1000);
            const { data: customer } = await supabase
                .from('customers')
                .select('id')
                .eq('name', 'E2E Automation Customer')
                .order('created_at', { ascending: false })
                .limit(1)
                .single();

            customerId = customer!.id;
            expect(customerId).toBeDefined();
        });

        // ====================================================================
        // STEP 2: CREATE GST BILL (2 Items, 4-5 Qty)
        // ====================================================================
        await test.step('Create GST Invoice', async () => {
            await page.goto('/billing/new');

            // 1. Select Customer from custom dropdown
            await page.getByPlaceholder('Search by name...').fill('E2E Automation');
            await page.getByText('E2E Automation Customer').click();

            // 2. Add Item 1: Castrol (Qty 4)
            await page.getByPlaceholder('Search item...').first().fill('Castrol GTX 5W-30');
            await page.getByText('Castrol GTX 5W-30 Engine Oil 1L').click();
            await page.locator('input[name="bill_line_items.0.qty"]').fill('4');

            // 3. Add Item Row & Add Item 2: Mahle Filter (Qty 5)
            await page.getByRole('button', { name: /Add Item Row/i }).click();
            await page.getByPlaceholder('Search item...').nth(1).fill('Mahle Air Filter');
            await page.getByText('Mahle Air Filter (Maruti Swift)').click();
            await page.locator('input[name="bill_line_items.1.qty"]').fill('5');

            // Save Bill
            await page.getByRole('button', { name: 'Save & Issue Bill' }).click();

            // DB Verification
            await page.waitForTimeout(1000);
            const { data: bills } = await supabase
                .from('bills')
                .select('id, grand_total, amount_due')
                .eq('customer_id', customerId)
                .order('created_at', { ascending: false })
                .limit(1);

            createdBillId = bills![0].id;
            originalAmountDue = bills![0].amount_due;

            expect(createdBillId).toBeDefined();
            expect(originalAmountDue).toBeGreaterThan(0);
        });

        // ====================================================================
        // STEP 3: INITIAL RETURN (2 Qty each)
        // ====================================================================
        await test.step('Initial Sales Return', async () => {
            await page.goto('/billing/sales-returns');

            // Assuming an 'Add New' or 'New Return' button exists as per your screenshot
            await page.getByRole('button', { name: /New Return/i }).click();

            // Search and select the bill in the SalesReturnForm
            await page.getByPlaceholder('Search by Bill Number or Customer...').fill('E2E Automation Customer');
            await page.locator('li').filter({ hasText: 'E2E Automation Customer' }).first().click();

            // Set quantities to return
            await page.locator('input[name="return_items.0.return_qty"]').fill('2');
            await page.locator('input[name="return_items.1.return_qty"]').fill('2');

            // Note: The form defaults to "Cash / UPI" refund_method, which is fine for now.
            await page.getByRole('button', { name: 'Process Return' }).click();

            // Better than waitForTimeout(1000)
            await page.getByRole('button', { name: 'Process Return' }).click();

            // Wait for the API route to explicitly finish returning a success response
            await page.waitForResponse(response => response.url().includes('/api/billing') && response.status() === 200);
            // Force strict multi-tenant checks like this:
            const { data: updatedBill } = await supabase
                .from('bills')
                .select('amount_due')
                .eq('id', createdBillId)
                .eq('tenant_id', TENANT_ID) // Strictly enforced
                .single();
            expect(updatedBill!.amount_due).toBeLessThan(originalAmountDue);

            originalAmountDue = updatedBill!.amount_due; // Set new baseline
        });

        // ====================================================================
        // STEP 4: PARTIAL PAYMENT (50%)
        // ====================================================================
        await test.step('Record 50% Partial Payment', async () => {
            await page.goto('/finance/payments'); // Assuming PaymentForm lives here

            // Select Customer context
            await page.locator('select[name="entity_type"]').selectOption('customer');
            await page.locator('select[name="entity_id"]').selectOption(customerId);

            const halfPayment = originalAmountDue / 2;

            // Fill Amount and Commit
            await page.locator('input[name="total_amount"]').fill(halfPayment.toString());
            await page.getByRole('button', { name: 'Commit Entry Transaction' }).click();

            // Handle the confirmation modal you built in PaymentForm
            await page.getByRole('button', { name: 'Yes, Save Payment' }).click();

            // DB Verification
            await page.waitForTimeout(1000);
            const { data: bill } = await supabase.from('bills').select('amount_due, amount_paid').eq('id', createdBillId).single();
            const { data: customer } = await supabase.from('customers').select('outstanding_due').eq('id', customerId).single();

            expect(bill!.amount_paid).toBe(halfPayment);
            expect(customer!.outstanding_due).toBe(bill!.amount_due);
        });

        // ====================================================================
        // STEP 5 & 6: EDIT RETURN (Escalate then De-escalate)
        // ====================================================================
        await test.step('Escalate and De-escalate Return via Modal', async () => {
            await page.goto('/billing/sales-returns');

            // Find the edit button for our customer in the ReturnsTable
            // We look for the table row containing our customer, then click the Edit button (first button)
            const row = page.getByRole('row', { name: /E2E Automation Customer/i }).first();
            await row.getByRole('button').first().click();

            // Modal is now open. Escalate Qty to 3.
            await page.locator('input[name="return_items.0.return_qty"]').fill('3');
            await page.getByRole('button', { name: 'Process Return' }).click();

            // Wait for DB, then assert the bill due dropped further
            await page.waitForTimeout(1000);
            const { data: escalatedBill } = await supabase.from('bills').select('amount_due').eq('id', createdBillId).single();
            expect(escalatedBill!.amount_due).toBeLessThan(originalAmountDue / 2);

            // Re-open the modal and De-escalate Qty down to 1
            await page.goto('/billing/sales-returns');
            await page.getByRole('row', { name: /E2E Automation Customer/i }).first().getByRole('button').first().click();
            await page.locator('input[name="return_items.0.return_qty"]').fill('1');
            await page.getByRole('button', { name: 'Process Return' }).click();

            // Wait for DB, then assert the bill due bounced back up
            await page.waitForTimeout(1000);
            const { data: deescalatedBill } = await supabase.from('bills').select('amount_due').eq('id', createdBillId).single();
            expect(deescalatedBill!.amount_due).toBeGreaterThan(escalatedBill!.amount_due);
        });

        // ====================================================================
        // STEP 7: DELETE PAYMENT
        // ====================================================================
        await test.step('Delete Payment', async () => {
            await page.goto('/finance/payments'); // Navigate to wherever payment history/deletion lives

            // ASSUMPTION: You have a delete button on the payment history row
            await page.getByRole('row', { name: /E2E Automation Customer/i }).first().getByRole('button', { name: /Delete/i }).click();
            // Assuming a confirmation modal pops up
            await page.getByRole('button', { name: /Confirm/i }).click();

            // DB Verification
            await page.waitForTimeout(1000);
            const { data: revertedBill } = await supabase.from('bills').select('amount_paid, amount_due').eq('id', createdBillId).single();

            expect(revertedBill!.amount_paid).toBe(0);
            expect(revertedBill!.amount_due).toBeGreaterThan(0);
        });

        // ====================================================================
        // STEP 8: STAGGERED SETTLEMENT (Pay in full across 2 payments)
        // ====================================================================
        await test.step('Settle Bill in Two Payments', async () => {
            const { data: bill } = await supabase.from('bills').select('amount_due').eq('id', createdBillId).single();
            const firstInstalment = Math.floor(bill!.amount_due / 2);
            const finalInstalment = bill!.amount_due - firstInstalment;

            // Payment 1
            await page.goto('/finance/payments');
            await page.locator('select[name="entity_type"]').selectOption('customer');
            await page.locator('select[name="entity_id"]').selectOption(customerId);
            await page.locator('input[name="total_amount"]').fill(firstInstalment.toString());
            await page.getByRole('button', { name: 'Commit Entry Transaction' }).click();
            await page.getByRole('button', { name: 'Yes, Save Payment' }).click();

            await page.waitForTimeout(1000); // Wait for modal to close and state to reset

            // Payment 2
            await page.goto('/finance/payments'); // Refresh to reset form
            await page.locator('select[name="entity_type"]').selectOption('customer');
            await page.locator('select[name="entity_id"]').selectOption(customerId);
            await page.locator('input[name="total_amount"]').fill(finalInstalment.toString());
            await page.getByRole('button', { name: 'Commit Entry Transaction' }).click();
            await page.getByRole('button', { name: 'Yes, Save Payment' }).click();

            // Final DB Verification
            await page.waitForTimeout(1000);
            const { data: closedBill } = await supabase.from('bills').select('amount_due, status').eq('id', createdBillId).single();
            const { data: finalCustomer } = await supabase.from('customers').select('outstanding_due').eq('id', customerId).single();

            expect(closedBill!.amount_due).toBe(0);
            expect(closedBill!.status).toBe('paid');
            expect(finalCustomer!.outstanding_due).toBe(0); // Debt perfectly cleared!
        });
    });
});