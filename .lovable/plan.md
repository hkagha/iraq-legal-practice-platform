

## Plan: Fix invoice creation for lawyers

### Root cause
The `invoices`, `invoice_line_items`, and `payments` tables only allow `firm_admin` to insert/update/delete (policies `admin_manage_invoices`, `admin_manage_line_items`, `admin_manage_payments`). When a **lawyer** or **paralegal** clicks "Save" on `/billing/new`, the INSERT is silently blocked by RLS — and the form ignores the error, so the user just sees nothing happen (or a navigate to a broken URL).

A secondary issue: `InvoiceFormPage.handleSave` doesn't check the error from the INSERT, so when RLS fails the user gets no feedback at all.

### Fix

**1. Database migration — broaden billing RLS to all billing-capable staff**

Replace the three `admin_manage_*` policies with policies that allow `firm_admin`, `lawyer`, `paralegal`, and `accountant` to INSERT/UPDATE/DELETE billing rows in their organization:

```sql
-- invoices
DROP POLICY admin_manage_invoices ON public.invoices;
CREATE POLICY staff_manage_invoices ON public.invoices
  FOR ALL TO authenticated
  USING (organization_id = get_user_org_id(auth.uid())
         AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'))
  WITH CHECK (organization_id = get_user_org_id(auth.uid())
         AND get_user_role(auth.uid()) IN ('firm_admin','lawyer','paralegal','accountant'));

-- same pattern for invoice_line_items and payments
```

This matches how `cases`, `clients`, and `time_entries` already work (lawyers can already log time and create cases — they should be able to invoice that work).

**2. `src/pages/InvoiceFormPage.tsx` — surface real errors**

In `handleSave`, capture the error from the INSERT/UPDATE and show it via toast:

```ts
const { data: newInv, error } = await supabase.from('invoices').insert(invoiceData).select().single();
if (error || !newInv) {
  toast({ title: error?.message || 'Failed to create invoice', variant: 'destructive' });
  setSaving(false);
  return;
}
```

Same treatment on the line-items insert and the edit-mode update. This way any future RLS or constraint issue is visible immediately instead of failing silently.

### Files

- **Migration**: drop and recreate the three `admin_manage_*` policies on `invoices`, `invoice_line_items`, `payments` to permit `firm_admin`, `lawyer`, `paralegal`, `accountant`.
- **Edit** `src/pages/InvoiceFormPage.tsx`: error handling in `handleSave`.

### Outcome

- Lawyers (and paralegals/accountants) can create, edit, send, and record payments on invoices for their org's clients.
- Firm admins keep full access; super admin keeps full access; clients keep read-only access to their own invoices.
- If anything else fails during invoice save, the user gets an actual error toast instead of a silent dead-end.

