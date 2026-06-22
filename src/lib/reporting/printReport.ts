import type { ReportColumn, ReportMeta } from "./types";

export function printReport<T extends Record<string, any>>(
  meta: ReportMeta,
  columns: ReportColumn<T>[],
  rows: T[],
) {
  const win = window.open("", "_blank", "width=900,height=700");
  if (!win) return;

  const orientation = meta.orientation ?? "portrait";
  const filtersHtml = meta.filters
    ? Object.entries(meta.filters)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `<span><strong>${k}:</strong> ${v}</span>`)
        .join(" &nbsp;•&nbsp; ")
    : "";

  const head = columns.map((c) => `<th>${c.label}</th>`).join("");
  const body = rows
    .map((row) => {
      const tds = columns
        .map((c) => {
          const raw = c.value ? c.value(row) : (row as any)[c.key];
          const v = raw === null || raw === undefined ? "" : String(raw);
          return `<td style="${c.numeric ? "text-align:right" : ""}">${v}</td>`;
        })
        .join("");
      return `<tr>${tds}</tr>`;
    })
    .join("");

  let totalsRow = "";
  if (meta.totals) {
    const tds = columns
      .map((c, i) => {
        const isLabel = i === 0 && !(c.key in meta.totals!);
        const v = isLabel ? "TOTAL" : meta.totals![c.key] ?? "";
        return `<td style="${c.numeric ? "text-align:right;" : ""}font-weight:bold">${v}</td>`;
      })
      .join("");
    totalsRow = `<tr class="totals">${tds}</tr>`;
  }

  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${meta.title}</title>
<style>
  @page { size: A4 ${orientation}; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Helvetica, Arial, sans-serif; color: #111; margin: 0; padding: 16px; }
  .brand { background:#141414; color:#d4af37; padding:14px 18px; display:flex; justify-content:space-between; align-items:flex-end; }
  .brand h1 { margin: 0; font-size: 18px; letter-spacing: 1px; }
  .brand h2 { margin: 4px 0 0; font-size: 12px; font-weight: 400; color:#e6e6e6; }
  .meta { font-size: 10px; color:#cccccc; text-align: right; }
  .filters { margin: 10px 2px; font-size: 11px; color:#555; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
  th { background:#d4af37; color:#141414; text-align:left; padding:6px 8px; }
  td { border-bottom: 1px solid #eee; padding: 5px 8px; }
  tr:nth-child(even) td { background: #fafafa; }
  tr.totals td { border-top: 2px solid #141414; background:#fffbe6; }
  .footer { margin-top: 18px; display:flex; justify-content:space-between; font-size: 10px; color:#666; }
  .sig { margin-top: 28px; display:flex; gap:60px; }
  .sig div { border-top: 1px solid #d4af37; padding-top: 4px; font-size: 10px; color:#666; width: 200px; }
  @media print { .no-print { display:none; } }
</style></head><body>
  <div class="brand">
    <div>
      <h1>LA PETITE BOUTEILLE</h1>
      <h2>${meta.title}${meta.subtitle ? " — " + meta.subtitle : ""}</h2>
    </div>
    <div class="meta">
      Généré le ${new Date().toLocaleString("fr-FR")}<br/>
      ${meta.generatedBy ? "Par " + meta.generatedBy : ""}
    </div>
  </div>
  ${filtersHtml ? `<div class="filters">${filtersHtml}</div>` : ""}
  <table>
    <thead><tr>${head}</tr></thead>
    <tbody>${body}${totalsRow}</tbody>
  </table>
  <div class="sig">
    <div>Préparé par</div>
    <div>Approuvé par</div>
  </div>
  <div class="footer">
    <span>La Petite Bouteille — Rapport confidentiel</span>
    <span>${rows.length} ligne(s)</span>
  </div>
  <script>window.addEventListener('load', () => { setTimeout(() => window.print(), 250); });<\/script>
</body></html>`);
  win.document.close();
}