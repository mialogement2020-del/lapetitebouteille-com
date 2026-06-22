
# LPB Accounting & Reporting System — Implementation Plan

This is a very large module (12 sub-systems). I recommend shipping it in **6 phases** so each phase is testable and stays within a reasonable build window. You approve phase by phase.

---

## Foundations (shared across all phases)

**New shared library — `src/lib/reporting/`**
- `pdfGenerator.ts` — pdfmake-based generator with LPB branded header (logo, date, user, report type, pagination, totals, signature block).
- `excelExporter.ts` — xlsx (SheetJS) export with typed columns + totals row.
- `csvExporter.ts` — CSV with locale-safe escaping.
- `printView.tsx` — A4 portrait/landscape print layout with `@media print` CSS.
- `reportFilters.tsx` — shared filter bar (date range, vendor, country, category, product, warehouse, region).
- `useReportExport.ts` — hook returning `{ exportPDF, exportExcel, exportCSV, print }`.

**New DB tables (via migration)**
- `report_archive` — id, user_id, report_type, params jsonb, file_url, format, created_at, scope (admin/vendor/wholesaler/ambassador).
- `scheduled_reports` — id, user_id, report_type, cadence (daily/weekly/monthly/quarterly), delivery (email/notification/archive), params jsonb, next_run, last_run, active.
- RLS: owners see their own rows; admins see all. GRANTs included.

**Storage bucket**: `reports` (private) for archived PDF/XLSX files.

**RBAC**: leverage existing `admin_permissions` + role checks (`admin`, `vendor`, `wholesaler`, `ambassador`). New permission keys: `reports.view_all`, `reports.export`, `reports.schedule`.

---

## Phase 1 — Foundations + Inventory Export (§1, §7, §8)
- Build the shared lib above.
- `src/components/admin/reports/InventoryReports.tsx` with tabs: Current, Movements, History, Low Stock, Out of Stock, Reserved, Damaged, Warehouse, Regional.
- Export buttons: PDF / Excel / CSV / Print on every tab.
- Filters bar wired to existing inventory queries.
- Add "Reports" entry in admin sidebar.

## Phase 2 — Sales Reporting (§2, §10)
- `SalesReports.tsx`: Daily / Weekly / Monthly / Quarterly / Annual.
- Columns: Revenue, COGS, Profit, Taxes, Discounts, Shipping, Commissions, MLM payouts.
- Executive dashboard view with charts + export to PDF/Excel.

## Phase 3 — Marketplace (Vendor) + Wholesaler Reports (§3, §4, §12 partial)
- Vendor portal: `vendor/reports` page — only own data (RLS enforced).
- Sales, product performance, best sellers, orders, customers, refunds, commissions.
- Wholesaler portal: `wholesaler/reports` — bulk sales, outstanding invoices, Net 15/30/60 aging, regional perf, top products.

## Phase 4 — MLM Reports (§5)
- Ambassador portal: `ambassador/reports` — earnings, commission history, network activity, bonuses, withdrawals, leaderboard.
- Admin-wide MLM rollups.

## Phase 5 — Accounting Export Center + ERP-ready exports (§6, §13)
- `AccountingCenter.tsx`: one-click exports for Sales, Expenses, Taxes, Inventory, Vendors, Wholesalers, MLM commissions, Refunds, Donations, Social impact.
- Export schemas mapped to standardized columns (chart-of-accounts friendly) compatible with QuickBooks IIF/CSV, Odoo CSV, Sage CSV, Zoho Books CSV. SAP/ERPNext use the same neutral CSV.

## Phase 6 — Scheduled Reports + Archive (§9, §11)
- Edge function `run-scheduled-reports` triggered by pg_cron (hourly): generates due reports, stores in `reports` bucket, writes to `report_archive`, sends email via Resend + dashboard notification.
- `ReportArchive.tsx`: search, filter by date/type, re-download, reprint.
- UI to create/edit schedules.

---

## Technical notes
- PDF: `pdfmake` (better Unicode + tables than jsPDF for FR content).
- Excel: `xlsx` (SheetJS community).
- Print: dedicated `/print/:reportId` route rendering a paginated A4 layout; uses `window.print()`.
- All currency in FCFA; locale-aware via existing i18n (FR/EN).
- All new UI strings use `useTranslation()` with new namespace `reports.*`.

---

## What I need from you
1. **Approve the phased approach** (or ask me to compress phases).
2. Confirm **Phase 1 starts now** (Foundations + Inventory Export). I'll come back for approval before Phase 2.
3. Any specific ERP target to prioritize first? (default: QuickBooks + Odoo CSV).
