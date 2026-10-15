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
  return <div className="sl-app">
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
          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}><Search size={17}/><input aria-label="Search businesses" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search business, slug, email or phone" style={{flex:"1 1 260px"}}/><span>{filtered.length} businesses</span></div>
        </div>
        {filtered.map(b => <section className="sl-section-card" key={b.id} style={{marginBottom:16}}>
          <div className="sl-section-head"><div><h3>{b.name}</h3><p>{b.slug} · {b.owner?.email || b.email || "No owner email"} · Created {dateLabel(b.createdAt)}</p></div><span className={b.subscription && !b.subscription.isLocked ? "sl-published" : "sl-draft"}>{b.subscription && !b.subscription.isLocked ? "Active" : "Locked"}</span></div>
          <div className="sl-analytics-metrics">
            <span><small>Products</small><b>{b.counts.products}</b></span><span><small>Catalogues</small><b>{b.counts.catalogues}</b></span><span><small>Orders</small><b>{b.counts.orders}</b></span><span><small>Plan</small><b>{b.subscription?.interval || "Not set"}</b></span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:12,marginTop:16}}>
            <label>Billing interval<select defaultValue={b.subscription?.interval || "MONTHLY"} onChange={e=>void updateSubscription(b,{interval:e.target.value})}><option value="MONTHLY">Monthly · ₹249</option><option value="YEARLY">Yearly · ₹2,490</option></select></label>
            <label>Due date (India time)<input type="date" defaultValue={b.subscription?.dueAt ? new Date(b.subscription.dueAt).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}) : ""} onBlur={e=>{if(e.target.value) void updateSubscription(b,{dueAt:new Date(e.target.value+"T18:29:59.999Z").toISOString()});}} /></label>
            <label>Access override<select defaultValue={b.subscription?.status || "ACTIVE"} onChange={e=>void updateSubscription(b,{status:e.target.value})}><option value="ACTIVE">Active</option><option value="LOCKED">Locked</option></select></label>
          </div>
          <p style={{fontSize:13,color:"var(--sl-muted,#6b7280)"}}>Due {dateLabel(b.subscription?.dueAt)} · Last payment {dateLabel(b.subscription?.lastPaidAt)}</p>
          <div><b style={{display:"flex",gap:7,alignItems:"center"}}><CreditCard size={15}/> Recent subscription payments</b>
            {b.recentPayments.length ? b.recentPayments.map(p=><p key={p.id} style={{fontSize:13,margin:"8px 0"}}>₹{p.amount} · {p.interval} · {p.status} · {dateLabel(p.paidAt || p.createdAt)}</p>) : <p style={{fontSize:13}}>No payments recorded.</p>}
          </div>
        </section>)}
        {!filtered.length && <div className="sl-section-card">No matching businesses.</div>}
      </> : <section className="sl-section-card">
        {audit.length ? audit.map(event=><article key={event.id} style={{padding:"14px 0",borderBottom:"1px solid var(--sl-border,#e5e7eb)"}}><b>{event.action.replaceAll("_"," ")}</b><p style={{margin:"5px 0",fontSize:13}}>{event.subscription?.business?.name || "Platform event"} · {dateLabel(event.createdAt)}</p><small>{JSON.stringify(event.details || {})}</small></article>) : <p>No audit events recorded yet.</p>}
      </section>}
    </main>
  </div>;
}
