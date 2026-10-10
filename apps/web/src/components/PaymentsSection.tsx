import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Download, RefreshCw, Search, XCircle } from "lucide-react";
import { api } from "../sellora/api-client";

type Payment = {
  id: string; orderNumber?: string; recordType?: string; productName: string; quantity: number; unit: string;
  items?: { productName: string; sku?: string | null; quantity: number; unit: string; unitPrice: string; lineTotal: string }[];
  subtotal?: string; taxAmount?: string; totalAmount?: string; address?: string | null; notes?: string | null;
  amount: string; currency: string; customerName: string; customerEmail?: string | null;
  customerPhone?: string | null; status: string; razorpayOrderId: string;
  razorpayPaymentId?: string | null; createdAt: string; paidAt?: string | null;
};

const money = (amount: string | number, currency = "INR") =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(amount || 0));
const dateTime = (value?: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";

export function PaymentsSection({ onSettings }: { onSettings: () => void }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [range, setRange] = useState("ALL");

  const load = useCallback(async (refresh = false) => {
    refresh ? setRefreshing(true) : setLoading(true);
    setError("");
    try { setPayments(await api("/workspace/payment-orders")); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load payments."); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const cutoff = range === "ALL" ? 0 : Date.now() - Number(range) * 86400000;
    return payments.filter(p => {
      const matchesStatus = status === "ALL" || p.status === status;
      const matchesDate = new Date(p.createdAt).getTime() >= cutoff;
      const matchesQuery = !q || [p.id,p.orderNumber,p.productName,p.customerName,p.customerEmail,p.customerPhone,p.razorpayOrderId,p.razorpayPaymentId].some(v => String(v || "").toLowerCase().includes(q));
      return matchesStatus && matchesDate && matchesQuery;
    });
  }, [payments, query, status, range]);

  const paid = payments.filter(p => p.status === "PAID");
  const pending = payments.filter(p => ["CREATED","PENDING","AUTHORIZED"].includes(p.status));
  const failed = payments.filter(p => ["FAILED","REFUNDED","PARTIALLY_REFUNDED"].includes(p.status));
  const collected = paid.reduce((sum,p) => sum + Number(p.amount), 0);
  function exportCsv() {
    const columns = ["Order reference","Record type","Customer","Phone","Email","Products and quantities","Subtotal","Tax","Total","Currency","Status","Delivery address","Notes","Razorpay order ID","Razorpay payment ID","Created at","Paid at"];
    const rows = filtered.map(p => [p.orderNumber || p.id,p.recordType || "PAYMENT_ORDER",p.customerName,p.customerPhone || "",p.customerEmail || "",(p.items || []).map(i => `${i.productName} (SKU: ${i.sku || "—"}) × ${i.quantity} @ ${i.unitPrice} = ${i.lineTotal}`).join(" | ") || `${p.productName} × ${p.quantity}`,p.subtotal ?? p.amount,p.taxAmount ?? "0",p.totalAmount ?? p.amount,p.currency,p.status,p.address || "",p.notes || "",p.razorpayOrderId,p.razorpayPaymentId || "",p.createdAt,p.paidAt || ""]);
    const csv = [columns,...rows].map(row => row.map(v => '"' + String(v ?? "").replace(/"/g,'""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
    const a = document.createElement("a"); a.href=url; a.download="sellora-payments.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="sl-payments-page">
    <style>{`
      .sl-payment-actions{display:flex;gap:8px;flex-wrap:wrap}
      .sl-button{display:inline-flex;align-items:center;justify-content:center;gap:7px;border:1px solid var(--sl-border,#dce3dc);border-radius:10px;padding:10px 13px;background:var(--sl-primary,#599c56);color:#fff;font:inherit;font-size:13px;font-weight:600;cursor:pointer}
      .sl-button-outline{background:transparent;color:inherit}
      .sl-button:disabled{opacity:.55;cursor:not-allowed}
      .sl-payment-filters{display:grid;grid-template-columns:minmax(220px,1fr) 170px 150px;gap:10px;margin:20px 0}
      .sl-payment-search{display:flex;align-items:center;gap:9px;border:1px solid var(--sl-border,#dce3dc);border-radius:10px;padding:0 12px;min-height:42px}
      .sl-payment-search input{border:0;outline:0;background:transparent;color:inherit;width:100%;min-width:0;font:inherit}
      .sl-payment-filters select{border:1px solid var(--sl-border,#dce3dc);border-radius:10px;padding:10px;background:transparent;color:inherit;min-width:0}
      .sl-payment-table-wrap{width:100%;overflow-x:auto}
      .sl-payment-table{width:100%;border-collapse:collapse;font-size:13px;text-align:left}
      .sl-payment-table th{color:var(--sl-muted,#68746b);font-size:11px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;background:rgba(128,128,128,.05)}
      .sl-payment-table th,.sl-payment-table td{padding:14px 12px;border-bottom:1px solid var(--sl-border,#e4e9e4);vertical-align:top}
      .sl-payment-table td b,.sl-payment-table td small{display:block}
      .sl-payment-table td small{font-size:11px;color:var(--sl-muted,#68746b);margin-top:4px;overflow-wrap:anywhere;max-width:220px}
      .sl-payment-amount{font-weight:700;white-space:nowrap}
      .sl-payment-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:700;background:#eef1ed;color:#475247;white-space:nowrap}
      .sl-payment-status.status-paid{background:#e1f5e8;color:#17663a}
      .sl-payment-status.status-failed,.sl-payment-status.status-refunded{background:#fde8e7;color:#a52c2c}
      .sl-payment-status.status-created,.sl-payment-status.status-pending,.sl-payment-status.status-authorized{background:#fff3d7;color:#805b00}
      .sl-payment-error{padding:12px;border-radius:10px;background:#fff0ef;color:#a52c2c;margin:12px 0}
      .sl-payment-footnote{font-size:11px;color:var(--sl-muted,#68746b);margin-top:18px}
      @media(max-width:760px){.sl-payment-filters{grid-template-columns:1fr}.sl-payment-actions{width:100%}.sl-payment-actions .sl-button{flex:1}.sl-payment-stats{grid-template-columns:repeat(2,minmax(0,1fr))}.sl-payment-table{min-width:850px}}
    `}</style>
    <section className="sl-stat-grid sl-payment-stats">
      <div><span>TOTAL COLLECTED</span><CheckCircle2/><strong>{money(collected)}</strong><small>Successful payments only</small></div>
      <div><span>SUCCESSFUL</span><CheckCircle2/><strong>{paid.length}</strong><small>Captured and verified</small></div>
      <div><span>PENDING</span><Clock3/><strong>{pending.length}</strong><small>Awaiting confirmation</small></div>
      <div><span>FAILED / REFUNDED</span><XCircle/><strong>{failed.length}</strong><small>Needs review if applicable</small></div>
    </section>
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div><h3>Transaction history</h3><p>All catalogue checkout orders and Razorpay payment records for your business.</p></div>
        <div className="sl-payment-actions">
          <button className="sl-button sl-button-outline" type="button" onClick={() => void load(true)} disabled={refreshing}><RefreshCw size={15}/>{refreshing ? "Refreshing…" : "Refresh"}</button>
          <button className="sl-button" type="button" onClick={exportCsv} disabled={!filtered.length}><Download size={15}/> Export CSV</button>
        </div>
      </div>
      <div className="sl-payment-filters">
        <label className="sl-payment-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, product or payment ID"/></label>
        <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter payment status">
          <option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="CREATED">Created</option><option value="PENDING">Pending</option><option value="AUTHORIZED">Authorized</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option><option value="CANCELLED">Cancelled</option>
        </select>
        <select value={range} onChange={e=>setRange(e.target.value)} aria-label="Filter payment date">
          <option value="ALL">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
        </select>
      </div>
      {error && <div className="sl-payment-error" role="alert">{error}</div>}
      {loading ? <div className="sl-empty"><RefreshCw size={24}/><p>Loading payment records…</p></div> : filtered.length ? <div className="sl-payment-table-wrap"><table className="sl-payment-table">
        <thead><tr><th>Customer / Order</th><th>Product</th><th>Amount</th><th>Status</th><th>Payment reference</th><th>Date</th></tr></thead>
        <tbody>{filtered.map(p=><tr key={p.id}>
          <td><b>{p.customerName}</b><small>{p.orderNumber || p.id}</small><small>{p.customerPhone || p.customerEmail || ""}</small></td>
          <td><b>{p.items?.length ? `${p.items.length} product line${p.items.length===1?"":"s"}` : p.productName}</b>{p.items?.length ? p.items.map((item,i)=><small key={item.productName+"-"+i}>{item.productName} · Qty {item.quantity} × {money(item.unitPrice,p.currency)}</small>) : <small>{p.quantity} {p.unit}</small>}</td>
          <td className="sl-payment-amount">{money(p.totalAmount ?? p.amount,p.currency)}{Number(p.taxAmount||0)>0&&<small>Subtotal {money(p.subtotal||"0",p.currency)} + tax {money(p.taxAmount||"0",p.currency)}</small>}</td>
          <td><span className={"sl-payment-status status-"+p.status.toLowerCase()}>{p.status.replaceAll("_"," ")}</span></td>
          <td><small>Order: {p.razorpayOrderId || "—"}</small><small>Payment: {p.razorpayPaymentId || "Not received yet"}</small></td>
          <td><small>{dateTime(p.createdAt)}</small>{p.paidAt && <small>Paid {dateTime(p.paidAt)}</small>}</td>
        </tr>)}</tbody>
      </table></div> : <div className="sl-empty"><CheckCircle2 size={28}/><h3>{payments.length ? "No matching payments" : "No orders or payments yet"}</h3><p>{payments.length ? "Change the search or filters to see other transactions." : "Published catalogue checkout orders and legacy Razorpay payment records will appear here. Try Refresh if you recently received an order."}</p>{!payments.length && <button className="sl-button sl-button-outline" onClick={onSettings}>Configure Razorpay</button>}</div>}
      <p className="sl-payment-footnote">Only payments verified by Sellora are counted as collected. Refund totals are not included until refund tracking is enabled.</p>
    </section>
  </div>;
}
