import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Download, RefreshCw, Search, XCircle } from "lucide-react";
import { api } from "../sellora/api-client";

type Payment = {
  id: string; productName: string; quantity: number; unit: string;
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
      const matchesQuery = !q || [p.id,p.productName,p.customerName,p.customerEmail,p.customerPhone,p.razorpayOrderId,p.razorpayPaymentId].some(v => String(v || "").toLowerCase().includes(q));
      return matchesStatus && matchesDate && matchesQuery;
    });
  }, [payments, query, status, range]);

  const paid = payments.filter(p => p.status === "PAID");
  const pending = payments.filter(p => ["CREATED","PENDING","AUTHORIZED"].includes(p.status));
  const failed = payments.filter(p => ["FAILED","REFUNDED","PARTIALLY_REFUNDED"].includes(p.status));
  const collected = paid.reduce((sum,p) => sum + Number(p.amount), 0);
  function exportCsv() {
    const columns = ["Order reference","Customer","Phone","Email","Product","Quantity","Amount","Currency","Status","Razorpay order ID","Razorpay payment ID","Created at","Paid at"];
    const rows = filtered.map(p => [p.id,p.customerName,p.customerPhone || "",p.customerEmail || "",p.productName,p.quantity,p.amount,p.currency,p.status,p.razorpayOrderId,p.razorpayPaymentId || "",p.createdAt,p.paidAt || ""]);
    const csv = [columns,...rows].map(row => row.map(v => '"' + String(v ?? "").replace(/"/g,'""') + '"').join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], {type:"text/csv;charset=utf-8;"}));
    const a = document.createElement("a"); a.href=url; a.download="sellora-payments.csv"; a.click(); URL.revokeObjectURL(url);
  }

  return <div className="sl-payments-page">
    <section className="sl-stat-grid sl-payment-stats">
      <div><span>TOTAL COLLECTED</span><CheckCircle2/><strong>{money(collected)}</strong><small>Successful payments only</small></div>
      <div><span>SUCCESSFUL</span><CheckCircle2/><strong>{paid.length}</strong><small>Captured and verified</small></div>
      <div><span>PENDING</span><Clock3/><strong>{pending.length}</strong><small>Awaiting confirmation</small></div>
      <div><span>FAILED / REFUNDED</span><XCircle/><strong>{failed.length}</strong><small>Needs review if applicable</small></div>
    </section>
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div><h3>Transaction history</h3><p>Payments processed through Razorpay and recorded in your Sellora workspace.</p></div>
        <div className="sl-payment-actions">
          <button className="sl-button sl-button-outline" type="button" onClick={() => void load(true)} disabled={refreshing}><RefreshCw size={15}/>{refreshing ? "Refreshing…" : "Refresh"}</button>
          <button className="sl-button" type="button" onClick={exportCsv} disabled={!filtered.length}><Download size={15}/> Export CSV</button>
        </div>
      </div>
      <div className="sl-payment-filters">
        <label className="sl-payment-search"><Search size={16}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, product or payment ID"/></label>
        <select value={status} onChange={e=>setStatus(e.target.value)} aria-label="Filter payment status">
          <option value="ALL">All statuses</option><option value="PAID">Paid</option><option value="CREATED">Created</option><option value="PENDING">Pending</option><option value="AUTHORIZED">Authorized</option><option value="FAILED">Failed</option><option value="REFUNDED">Refunded</option>
        </select>
        <select value={range} onChange={e=>setRange(e.target.value)} aria-label="Filter payment date">
          <option value="ALL">All time</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option>
        </select>
      </div>
      {error && <div className="sl-payment-error" role="alert">{error}</div>}
      {loading ? <div className="sl-empty"><RefreshCw size={24}/><p>Loading payment records…</p></div> : filtered.length ? <div className="sl-payment-table-wrap"><table className="sl-payment-table">
        <thead><tr><th>Customer / Order</th><th>Product</th><th>Amount</th><th>Status</th><th>Payment reference</th><th>Date</th></tr></thead>
        <tbody>{filtered.map(p=><tr key={p.id}>
          <td><b>{p.customerName}</b><small>{p.customerPhone || p.customerEmail || p.id}</small></td>
          <td><b>{p.productName}</b><small>{p.quantity} {p.unit}</small></td>
          <td className="sl-payment-amount">{money(p.amount,p.currency)}</td>
          <td><span className={"sl-payment-status status-"+p.status.toLowerCase()}>{p.status.replaceAll("_"," ")}</span></td>
          <td><small>Order: {p.razorpayOrderId}</small><small>Payment: {p.razorpayPaymentId || "Not received yet"}</small></td>
          <td><small>{dateTime(p.createdAt)}</small>{p.paidAt && <small>Paid {dateTime(p.paidAt)}</small>}</td>
        </tr>)}</tbody>
      </table></div> : <div className="sl-empty"><CheckCircle2 size={28}/><h3>{payments.length ? "No matching payments" : "No payments yet"}</h3><p>{payments.length ? "Change the search or filters to see other transactions." : "Once a customer pays through a published catalogue using Razorpay, the transaction will appear here."}</p>{!payments.length && <button className="sl-button sl-button-outline" onClick={onSettings}>Configure Razorpay</button>}</div>}
      <p className="sl-payment-footnote">Only payments verified by Sellora are counted as collected. Refund totals are not included until refund tracking is enabled.</p>
    </section>
  </div>;
}
