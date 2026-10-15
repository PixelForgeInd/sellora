import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, LogOut, Search, Building2, Clock3, CreditCard, History } from "lucide-react";
import { api } from "../sellora/api-client";

type BusinessRow = {
  id: string; name: string; slug: string; email?: string | null; phone?: string | null; createdAt: string;
  owner?: { email: string } | null;
  counts: { products: number; catalogues: number; orders: number };
  subscription: null | { id: string; status: string; interval: string; amount: string; dueAt: string; lastPaidAt?: string | null; isLocked: boolean };
  recentPayments: Array<{ id: string; amount: string; interval: string; status: string; paidAt?: string | null; createdAt: string; razorpayPaymentId?: string | null }>;
};
type AuditRow = { id: string; action: string; actorUserId: string; details: unknown; createdAt: string; subscription?: { business?: { name: string; slug: string } | null } | null };

const dateLabel = (value?: string | null) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
export function PlatformOwnerDashboard({ token, user, onSignOut }: { token: string; user: string; onSignOut: () => void }) {
  const [businesses, setBusinesses] = useState<BusinessRow[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"businesses" | "audit">("businesses");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function refresh() {
    setBusy(true); setError("");
    try {
      const [b, a] = await Promise.all([
        api("/platform/owner/businesses", {}, token),
        api("/platform/owner/audit", {}, token),
      ]);
      setBusinesses(b); setAudit(a);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load platform data."); }
    finally { setBusy(false); }
  }
  useEffect(() => { void refresh(); }, [token]);
  const filtered = useMemo(() => businesses.filter(b => [b.name, b.slug, b.email, b.owner?.email, b.phone].join(" ").toLowerCase().includes(query.trim().toLowerCase())), [businesses, query]);
  async function updateSubscription(business: BusinessRow, patch: Record<string, string>) {
    setError(""); setNotice("");
    try {
      await api("/platform/owner/businesses/" + encodeURIComponent(business.id) + "/subscription", {
        method: "PATCH", body: JSON.stringify(patch)
      }, token);
      setNotice("Subscription updated for " + business.name + ". The change was recorded in the audit log.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update subscription."); }
  }
  return <div className="sl-app sl-platform-admin">
    <style>{`
      .sl-platform-admin .sl-main{padding:clamp(22px,3vw,42px);max-width:none;min-width:0}
      .sl-platform-admin .sl-workspace-top{align-items:center;margin-bottom:26px;gap:20px}
      .sl-platform-admin .sl-workspace-top h1{font-size:clamp(25px,2.4vw,34px);line-height:1.2;letter-spacing:-.035em;margin:7px 0 0}
      .sl-platform-admin .sl-section-card{border:1px solid #e4e9e2;border-radius:16px;background:#fff;padding:24px;box-shadow:0 3px 12px rgba(23,35,24,.035)}
      .sl-platform-admin .sl-admin-search{display:flex;align-items:center;gap:12px;min-width:0}
      .sl-platform-admin .sl-admin-search input{flex:1;min-width:180px;width:100%;height:44px;border:1px solid #dce3da;border-radius:10px;padding:0 14px;outline:none}
      .sl-platform-admin .sl-admin-search input:focus{border-color:#599c56;box-shadow:0 0 0 3px rgba(89,156,86,.13)}
      .sl-platform-admin .sl-admin-count{white-space:nowrap;font-size:13px;color:#667064;background:#f4f7f2;border-radius:999px;padding:7px 11px}
      .sl-platform-admin .sl-admin-business{margin-bottom:16px;overflow:hidden}
      .sl-platform-admin .sl-admin-business .sl-section-head{align-items:flex-start;gap:16px;margin-bottom:20px}
      .sl-platform-admin .sl-admin-business .sl-section-head h3{font-size:21px;letter-spacing:-.02em;margin:0 0 7px}
      .sl-platform-admin .sl-admin-business .sl-section-head p{font-size:13px;line-height:1.6;overflow-wrap:anywhere;margin:0}
      .sl-platform-admin .sl-admin-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px}
      .sl-platform-admin .sl-admin-metric{background:#f6f8f4;border:1px solid #edf0ea;border-radius:12px;padding:15px 16px;min-width:0}
      .sl-platform-admin .sl-admin-metric small{display:block;color:#788174;font-size:12px;margin-bottom:8px}
      .sl-platform-admin .sl-admin-metric b{font-size:23px;line-height:1.2;overflow-wrap:anywhere}
      .sl-platform-admin .sl-admin-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .sl-platform-admin .sl-admin-controls label{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600;color:#485247;min-width:0}
      .sl-platform-admin .sl-admin-controls input,.sl-platform-admin .sl-admin-controls select{height:42px;width:100%;min-width:0;border:1px solid #dce3da;border-radius:9px;padding:0 11px;background:#fff;color:#29342b;font:inherit}
      .sl-platform-admin .sl-admin-submeta{font-size:12px;color:#737d70;margin:14px 0 20px}
      .sl-platform-admin .sl-admin-payment{border:1px solid #e7ebe5;background:#fcfdfb;border-radius:12px;padding:18px}
      .sl-platform-admin .sl-admin-payment p{font-size:13px;line-height:1.6;margin:8px 0;color:#596256}
      .sl-platform-admin .sl-admin-payment-title{display:flex;align-items:center;gap:9px;font-size:14px}
      .sl-platform-admin .sl-admin-payment-title svg{color:#599c56}
      .sl-platform-admin .sl-sidebar{border-right:1px solid #e7ebe5}
      .sl-platform-admin .sl-sidebar .sl-nav{gap:6px}
      .sl-platform-admin .sl-sidebar .sl-nav button{border-radius:10px}
      @media(max-width:900px){.sl-platform-admin .sl-admin-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.sl-platform-admin .sl-admin-controls{grid-template-columns:1fr}.sl-platform-admin .sl-section-card{padding:18px}}
      @media(max-width:560px){.sl-platform-admin .sl-main{padding:18px 14px}.sl-platform-admin .sl-admin-search{flex-wrap:wrap}.sl-platform-admin .sl-admin-search input{flex-basis:100%}.sl-platform-admin .sl-admin-count{margin-left:auto}.sl-platform-admin .sl-workspace-top{align-items:flex-start}}
    `}</style>
    <aside className="sl-sidebar">
      <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.04em"}}>sellora<span style={{color:"#599c56"}}>.</span></div>
      <span className="sl-workspace-label">PLATFORM ADMIN</span>
      <div className="sl-business-chip"><span style={{background:"#599c56"}}><ShieldCheck size={18}/></span><div><b>Platform Owner</b><small>Restricted access</small></div></div>
      <nav className="sl-nav">
        <button className={tab === "businesses" ? "active" : ""} onClick={() => setTab("businesses")}><Building2 size={17}/> Businesses</button>
        <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")}><History size={17}/> Audit history</button>
      </nav>
      <div className="sl-sidebar-bottom"><b className="sl-user-email">{user}</b><button className="sl-signout" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div>
    </aside>
    <main className="sl-main">
      <header className="sl-workspace-top"><div><span className="sl-kicker">SELLORA PLATFORM</span><h1>{tab === "businesses" ? "Business & subscriptions" : "Audit history"}</h1></div><button className="sl-button sl-button-outline" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15}/> Refresh</button></header>
      {error && <div className="sl-error" role="alert">{error}</div>}
      {notice && <div className="sl-notice" role="status">{notice}</div>}
      {tab === "businesses" ? <>
        <div className="sl-section-card" style={{marginBottom:18}}>
          <div className="sl-admin-search"><Search size={18} color="#788174"/><input aria-label="Search businesses" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by business, slug, email or phone"/><span className="sl-admin-count">{filtered.length} businesses</span></div>
        </div>
        {filtered.map(b => <section className="sl-section-card sl-admin-business" key={b.id}>
          <div className="sl-section-head"><div><h3>{b.name}</h3><p>{b.slug} · {b.owner?.email || b.email || "No owner email"} · Created {dateLabel(b.createdAt)}</p></div><span className={b.subscription && !b.subscription.isLocked ? "sl-published" : "sl-draft"}>{b.subscription && !b.subscription.isLocked ? "Active" : "Locked"}</span></div>
          <div className="sl-admin-metrics">
            <div className="sl-admin-metric"><small>Products</small><b>{b.counts.products}</b></div><div className="sl-admin-metric"><small>Catalogues</small><b>{b.counts.catalogues}</b></div><div className="sl-admin-metric"><small>Orders</small><b>{b.counts.orders}</b></div><div className="sl-admin-metric"><small>Plan</small><b>{b.subscription?.interval || "Not set"}</b></div>
          </div>
          <div className="sl-admin-controls">
            <label>Billing interval<select defaultValue={b.subscription?.interval || "MONTHLY"} onChange={e=>void updateSubscription(b,{interval:e.target.value})}><option value="MONTHLY">Monthly · ₹249</option><option value="YEARLY">Yearly · ₹2,490</option></select></label>
            <label>Due date (India time)<input type="date" defaultValue={b.subscription?.dueAt ? new Date(b.subscription.dueAt).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}) : ""} onBlur={e=>{if(e.target.value) void updateSubscription(b,{dueAt:new Date(e.target.value+"T18:29:59.999Z").toISOString()});}} /></label>
            <label>Access override<select defaultValue={b.subscription?.status || "ACTIVE"} onChange={e=>void updateSubscription(b,{status:e.target.value})}><option value="ACTIVE">Active</option><option value="LOCKED">Locked</option></select></label>
          </div>
          <p className="sl-admin-submeta">Due {dateLabel(b.subscription?.dueAt)} · Last payment {dateLabel(b.subscription?.lastPaidAt)}</p>
          <div className="sl-admin-payment"><b className="sl-admin-payment-title"><CreditCard size={16}/> Razorpay billing & payment history</b>
            <p >Billing method: Razorpay checkout (manual renewal) · {b.subscription?.interval === "YEARLY" ? "₹2,490/year" : "₹249/month"}</p>
            <p style={{fontSize:13,margin:"8px 0"}}>Payment due: {dateLabel(b.subscription?.dueAt)} · One calendar day grace period, then access is locked until payment is verified.</p>
            <b >Recent Razorpay payments</b>
            {b.recentPayments.length ? b.recentPayments.map(p=><p key={p.id} style={{fontSize:13,margin:"8px 0"}}>₹{p.amount} · {p.interval} · {p.status} · {dateLabel(p.paidAt || p.createdAt)}{p.razorpayPaymentId ? <><br/><span style={{color:"var(--sl-muted,#6b7280)"}}>Payment ID: {p.razorpayPaymentId}</span></> : null}</p>) : <p >No payments recorded.</p>}
          </div>
        </section>)}
        {!filtered.length && <div className="sl-section-card">No matching businesses.</div>}
      </> : <section className="sl-section-card">
        {audit.length ? audit.map(event=><article key={event.id} style={{padding:"14px 0",borderBottom:"1px solid var(--sl-border,#e5e7eb)"}}><b>{event.action.replaceAll("_"," ")}</b><p style={{margin:"5px 0",fontSize:13}}>{event.subscription?.business?.name || "Platform event"} · {dateLabel(event.createdAt)}</p><small>{JSON.stringify(event.details || {})}</small></article>) : <p>No audit events recorded yet.</p>}
      </section>}
    </main>
  </div>;
}
