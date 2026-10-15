import { useEffect, useMemo, useState } from "react";
import { RefreshCw, ShieldCheck, LogOut, Search, Building2, CreditCard, History, Users, SlidersHorizontal, CheckCircle2 } from "lucide-react";
import { api } from "../sellora/api-client";

type BusinessRow = {
  id:string; name:string; slug:string; email?:string|null; phone?:string|null; createdAt:string;
  owner?:{email:string}|null; counts:{products:number;catalogues:number;orders:number};
  subscription:null|{id:string;status:string;interval:string;amount:string;dueAt:string;lastPaidAt?:string|null;isLocked:boolean};
  recentPayments:Array<{id:string;amount:string;interval:string;status:string;paidAt?:string|null;createdAt:string;razorpayPaymentId?:string|null;razorpayOrderId?:string|null}>;
};
type PaymentRow = {id:string;businessId:string;businessName:string;businessSlug:string;customerEmail:string;interval:string;amount:string;currency:string;status:string;razorpayOrderId:string;razorpayPaymentId?:string|null;paidAt?:string|null;createdAt:string};
type AuditRow = {id:string;action:string;actorUserId:string;details:unknown;createdAt:string;subscription?:{business?:{name:string;slug:string}|null}|null};
type Prices = {MONTHLY:number;YEARLY:number};
const dateLabel=(v?:string|null)=>v?new Date(v).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"}):"—";
const inr=(v:number|string)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(v)||0);
type Tab="overview"|"customers"|"payments"|"pricing"|"audit";

export function PlatformOwnerDashboard({token,user,onSignOut}:{token:string;user:string;onSignOut:()=>void}) {
  const [businesses,setBusinesses]=useState<BusinessRow[]>([]);
  const [payments,setPayments]=useState<PaymentRow[]>([]);
  const [audit,setAudit]=useState<AuditRow[]>([]);
  const [prices,setPrices]=useState<Prices>({MONTHLY:249,YEARLY:2490});
  const [draftPrices,setDraftPrices]=useState<Prices>({MONTHLY:249,YEARLY:2490});
  const [query,setQuery]=useState("");
  const [tab,setTab]=useState<Tab>("overview");
  const [busy,setBusy]=useState(false);
  const [savingPrices,setSavingPrices]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");

  async function refresh(){
    setBusy(true);setError("");
    try{
      const [b,p,a,pr]=await Promise.all([
        api("/platform/owner/businesses",{},token),
        api("/platform/owner/payments",{},token),
        api("/platform/owner/audit",{},token),
        api("/platform/owner/pricing",{},token)
      ]);
      setBusinesses(b);setPayments(p.payments||[]);setAudit(a);setPrices(pr);setDraftPrices(pr);
    }catch(e){setError(e instanceof Error?e.message:"Could not load platform data.");}
    finally{setBusy(false);}
  }
  useEffect(()=>{void refresh();},[token]);
  const filteredBusinesses=useMemo(()=>businesses.filter(b=>[b.name,b.slug,b.email,b.owner?.email,b.phone].join(" ").toLowerCase().includes(query.trim().toLowerCase())),[businesses,query]);
  const filteredPayments=useMemo(()=>payments.filter(p=>[p.businessName,p.businessSlug,p.customerEmail,p.razorpayPaymentId,p.razorpayOrderId,p.status].join(" ").toLowerCase().includes(query.trim().toLowerCase())),[payments,query]);
  const paid=payments.filter(p=>p.status==="PAID");
  const collected=paid.reduce((sum,p)=>sum+Number(p.amount||0),0);
  const nav: Array<{id:Tab;label:string;icon:any}>=[
    {id:"overview",label:"Overview",icon:Building2},
    {id:"customers",label:"Customers",icon:Users},
    {id:"payments",label:"Razorpay payments",icon:CreditCard},
    {id:"pricing",label:"Pricing control",icon:SlidersHorizontal},
    {id:"audit",label:"Audit history",icon:History}
  ];
  async function updateSubscription(b:BusinessRow,patch:Record<string,string>){
    setError("");setNotice("");
    try{
      await api("/platform/owner/businesses/"+encodeURIComponent(b.id)+"/subscription",{method:"PATCH",body:JSON.stringify(patch)},token);
      setNotice("Subscription updated for "+b.name+". The change was recorded in audit history.");
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:"Could not update subscription.");}
  }
  async function savePrices(){
    setSavingPrices(true);setError("");setNotice("");
    try{
      const next=await api("/platform/owner/pricing",{method:"PATCH",body:JSON.stringify({MONTHLY:Number(draftPrices.MONTHLY),YEARLY:Number(draftPrices.YEARLY)})},token);
      setPrices(next);setDraftPrices(next);setNotice("Pricing saved. New prices will be used on the homepage, checkout and future subscription orders.");
    }catch(e){setError(e instanceof Error?e.message:"Could not save pricing.");}
    finally{setSavingPrices(false);}
  }
  return <div className="sl-app sl-platform-admin">
    <style>{`
      .sl-platform-admin .sl-main{padding:clamp(22px,3vw,42px);max-width:none;min-width:0}
      .sl-platform-admin .sl-workspace-top{align-items:center;margin-bottom:24px;gap:20px}
      .sl-platform-admin .sl-workspace-top h1{font-size:clamp(25px,2.4vw,34px);line-height:1.2;letter-spacing:-.035em;margin:7px 0 0}
      .sl-platform-admin .sl-section-card{border:1px solid #e4e9e2;border-radius:16px;background:#fff;padding:22px;box-shadow:0 3px 12px rgba(23,35,24,.035);min-width:0}
      .sl-platform-admin .sl-admin-search{display:flex;align-items:center;gap:12px;min-width:0}
      .sl-platform-admin .sl-admin-search input,.sl-platform-admin .sl-pricing-field input{flex:1;min-width:0;width:100%;height:44px;border:1px solid #dce3da;border-radius:10px;padding:0 14px;outline:none}
      .sl-platform-admin .sl-admin-search input:focus,.sl-platform-admin .sl-pricing-field input:focus{border-color:#599c56;box-shadow:0 0 0 3px rgba(89,156,86,.13)}
      .sl-platform-admin .sl-admin-count{white-space:nowrap;font-size:13px;color:#667064;background:#f4f7f2;border-radius:999px;padding:7px 11px}
      .sl-platform-admin .sl-admin-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}
      .sl-platform-admin .sl-admin-metric{background:#f6f8f4;border:1px solid #edf0ea;border-radius:12px;padding:17px;min-width:0}
      .sl-platform-admin .sl-admin-metric small{display:block;color:#788174;font-size:12px;margin-bottom:8px}
      .sl-platform-admin .sl-admin-metric b{font-size:clamp(20px,2vw,27px);line-height:1.2;overflow-wrap:anywhere}
      .sl-platform-admin .sl-admin-business{margin-bottom:15px;overflow:hidden}
      .sl-platform-admin .sl-admin-business .sl-section-head{align-items:flex-start;gap:16px;margin-bottom:18px}
      .sl-platform-admin .sl-admin-business .sl-section-head h3{font-size:20px;letter-spacing:-.02em;margin:0 0 7px}
      .sl-platform-admin .sl-admin-business .sl-section-head p{font-size:13px;line-height:1.6;overflow-wrap:anywhere;margin:0}
      .sl-platform-admin .sl-admin-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
      .sl-platform-admin .sl-admin-controls label,.sl-platform-admin .sl-pricing-field{display:flex;flex-direction:column;gap:8px;font-size:13px;font-weight:600;color:#485247;min-width:0}
      .sl-platform-admin .sl-admin-controls input,.sl-platform-admin .sl-admin-controls select{height:42px;width:100%;min-width:0;border:1px solid #dce3da;border-radius:9px;padding:0 11px;background:#fff;color:#29342b;font:inherit}
      .sl-platform-admin .sl-admin-submeta{font-size:12px;color:#737d70;margin:14px 0 0}
      .sl-platform-admin .sl-admin-table-wrap{overflow:auto;width:100%}
      .sl-platform-admin .sl-admin-table{width:100%;border-collapse:collapse;min-width:700px}
      .sl-platform-admin .sl-admin-table th,.sl-platform-admin .sl-admin-table td{text-align:left;padding:13px 12px;border-bottom:1px solid #edf0ea;font-size:13px;vertical-align:top}
      .sl-platform-admin .sl-admin-table th{color:#6b7567;font-size:11px;text-transform:uppercase;letter-spacing:.05em;background:#fafbf9}
      .sl-platform-admin .sl-admin-table td small{display:block;color:#758071;margin-top:4px;overflow-wrap:anywhere}
      .sl-platform-admin .sl-status{display:inline-flex;border-radius:999px;padding:5px 9px;background:#eef7eb;color:#347a35;font-size:11px;font-weight:800}
      .sl-platform-admin .sl-status.pending{background:#fff5df;color:#8c6200}.sl-platform-admin .sl-status.failed{background:#fff0ef;color:#a12d27}
      .sl-platform-admin .sl-pricing-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;margin:20px 0}
      .sl-platform-admin .sl-pricing-card{border:1px solid #e4e9e2;border-radius:14px;padding:20px;background:#fafcf9}
      .sl-platform-admin .sl-pricing-card h3{margin:0 0 18px;font-size:18px}
      .sl-platform-admin .sl-pricing-field input{font-size:18px;font-weight:700}
      .sl-platform-admin .sl-admin-sidebar-nav button{font-size:14px}
      @media(max-width:900px){.sl-platform-admin .sl-admin-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.sl-platform-admin .sl-admin-controls,.sl-platform-admin .sl-pricing-grid{grid-template-columns:1fr}.sl-platform-admin .sl-section-card{padding:17px}}
      @media(max-width:560px){.sl-platform-admin .sl-main{padding:18px 14px}.sl-platform-admin .sl-admin-search{flex-wrap:wrap}.sl-platform-admin .sl-admin-search input{flex-basis:100%}.sl-platform-admin .sl-admin-count{margin-left:auto}.sl-platform-admin .sl-workspace-top{align-items:flex-start}}
    `}</style>
    <aside className="sl-sidebar">
      <div style={{fontSize:22,fontWeight:800,letterSpacing:"-0.04em"}}>sellora<span style={{color:"#599c56"}}>.</span></div>
      <span className="sl-workspace-label">PLATFORM ADMIN</span>
      <div className="sl-business-chip"><span style={{background:"#599c56"}}><ShieldCheck size={18}/></span><div><b>Platform Owner</b><small>Restricted access</small></div></div>
      <nav className="sl-nav sl-admin-sidebar-nav">{nav.map(item=>{const Icon=item.icon;return <button key={item.id} className={tab===item.id?"active":""} onClick={()=>{setTab(item.id);setQuery("");}}><Icon size={17}/>{item.label}</button>;})}</nav>
      <div className="sl-sidebar-bottom"><b className="sl-user-email">{user}</b><button className="sl-signout" onClick={onSignOut}><LogOut size={15}/> Sign out</button></div>
    </aside>
    <main className="sl-main">
      <header className="sl-workspace-top"><div><span className="sl-kicker">SELLORA PLATFORM</span><h1>{nav.find(n=>n.id===tab)?.label}</h1></div><button className="sl-button sl-button-outline" disabled={busy} onClick={()=>void refresh()}><RefreshCw size={15}/> Refresh</button></header>
      {error&&<div className="sl-error" role="alert">{error}</div>}{notice&&<div className="sl-notice" role="status">{notice}</div>}
      {tab==="overview"&&<>
        <div className="sl-admin-metrics">
          <div className="sl-admin-metric"><small>Total payments collected</small><b>{inr(collected)}</b></div>
          <div className="sl-admin-metric"><small>Successful payments</small><b>{paid.length}</b></div>
          <div className="sl-admin-metric"><small>Total customers</small><b>{businesses.length}</b></div>
          <div className="sl-admin-metric"><small>Active subscriptions</small><b>{businesses.filter(b=>b.subscription&&!b.subscription.isLocked).length}</b></div>
        </div>
        <section className="sl-section-card"><div className="sl-section-head"><div><h3>Recent Razorpay payments</h3><p>Collected amounts count only payments marked PAID after verification.</p></div><button className="sl-button sl-button-outline" onClick={()=>setTab("payments")}>View all payments</button></div>
          <div className="sl-admin-table-wrap"><table className="sl-admin-table"><thead><tr><th>Customer</th><th>Plan</th><th>Amount</th><th>Status</th><th>Paid / created</th></tr></thead><tbody>{payments.slice(0,8).map(p=><tr key={p.id}><td><b>{p.businessName}</b><small>{p.customerEmail||p.businessSlug}</small></td><td>{p.interval}</td><td>{inr(p.amount)}</td><td><span className={"sl-status "+(p.status==="PAID"?"":p.status==="CREATED"?"pending":"failed")}>{p.status}</span></td><td>{dateLabel(p.paidAt||p.createdAt)}</td></tr>)}</tbody></table></div>
          {!payments.length&&<p>No subscription payments recorded yet.</p>}
        </section>
      </>}
      {tab==="customers"&&<>
        <section className="sl-section-card" style={{marginBottom:16}}><div className="sl-admin-search"><Search size={18} color="#788174"/><input aria-label="Search customers" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by business, owner email, slug or phone"/><span className="sl-admin-count">{filteredBusinesses.length} customers</span></div></section>
        {filteredBusinesses.map(b=><section className="sl-section-card sl-admin-business" key={b.id}>
          <div className="sl-section-head"><div><h3>{b.name}</h3><p>{b.slug} · {b.owner?.email||b.email||"No owner email"} · {b.phone||"No phone"} · Joined {dateLabel(b.createdAt)}</p></div><span className={"sl-status "+(b.subscription&&!b.subscription.isLocked?"":"pending")}>{b.subscription&&!b.subscription.isLocked?"Active":"Payment required"}</span></div>
          <div className="sl-admin-metrics"><div className="sl-admin-metric"><small>Products</small><b>{b.counts.products}</b></div><div className="sl-admin-metric"><small>Catalogues</small><b>{b.counts.catalogues}</b></div><div className="sl-admin-metric"><small>Orders</small><b>{b.counts.orders}</b></div><div className="sl-admin-metric"><small>Plan</small><b>{b.subscription?.interval||"Not set"}</b></div></div>
          <div className="sl-admin-controls">
            <label>Billing interval<select defaultValue={b.subscription?.interval||"MONTHLY"} onChange={e=>void updateSubscription(b,{interval:e.target.value})}><option value="MONTHLY">Monthly · {inr(prices.MONTHLY)}</option><option value="YEARLY">Yearly · {inr(prices.YEARLY)}</option></select></label>
            <label>Due date<input type="date" defaultValue={b.subscription?.dueAt?new Date(b.subscription.dueAt).toLocaleDateString("en-CA",{timeZone:"Asia/Kolkata"}):""} onBlur={e=>{if(e.target.value)void updateSubscription(b,{dueAt:new Date(e.target.value+"T18:29:59.999Z").toISOString()});}}/></label>
            <label>Access override<select defaultValue={b.subscription?.status==="ACTIVE"?"ACTIVE":"LOCKED"} onChange={e=>void updateSubscription(b,{status:e.target.value})}><option value="ACTIVE">Active</option><option value="LOCKED">Locked</option></select></label>
          </div>
          <p className="sl-admin-submeta">Due {dateLabel(b.subscription?.dueAt)} · Last payment {dateLabel(b.subscription?.lastPaidAt)} · {b.recentPayments.length} recent payment records</p>
        </section>)}
        {!filteredBusinesses.length&&<section className="sl-section-card">No customers found.</section>}
      </>}
      {tab==="payments"&&<>
        <div className="sl-admin-metrics"><div className="sl-admin-metric"><small>Total collected</small><b>{inr(collected)}</b></div><div className="sl-admin-metric"><small>Successful</small><b>{paid.length}</b></div><div className="sl-admin-metric"><small>Pending / failed</small><b>{payments.length-paid.length}</b></div><div className="sl-admin-metric"><small>All records</small><b>{payments.length}</b></div></div>
        <section className="sl-section-card"><div className="sl-admin-search" style={{marginBottom:16}}><Search size={18} color="#788174"/><input aria-label="Search payments" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search customer, Razorpay order/payment ID or status"/><span className="sl-admin-count">{filteredPayments.length} records</span></div>
          <div className="sl-admin-table-wrap"><table className="sl-admin-table"><thead><tr><th>Customer</th><th>Amount</th><th>Plan</th><th>Status</th><th>Razorpay payment ID</th><th>Order ID</th><th>Date</th></tr></thead><tbody>{filteredPayments.map(p=><tr key={p.id}><td><b>{p.businessName}</b><small>{p.customerEmail||p.businessSlug}</small></td><td>{inr(p.amount)}</td><td>{p.interval}</td><td><span className={"sl-status "+(p.status==="PAID"?"":p.status==="CREATED"?"pending":"failed")}>{p.status}</span></td><td>{p.razorpayPaymentId||"—"}</td><td>{p.razorpayOrderId||"—"}</td><td>{dateLabel(p.paidAt||p.createdAt)}</td></tr>)}</tbody></table></div>
          {!filteredPayments.length&&<p>No payment records match this search.</p>}
        </section>
      </>}
      {tab==="pricing"&&<section className="sl-section-card" style={{maxWidth:850}}>
        <div className="sl-section-head"><div><h3>Subscription pricing</h3><p>These are the platform prices used for public pricing, new checkout orders and renewal payments.</p></div></div>
        <div className="sl-pricing-grid">
          <div className="sl-pricing-card"><h3>Monthly plan</h3><label className="sl-pricing-field">Price (INR)<input type="number" min="1" step="1" value={draftPrices.MONTHLY} onChange={e=>setDraftPrices(p=>({...p,MONTHLY:Number(e.target.value)}))}/></label><p>Customer-facing price: <b>{inr(prices.MONTHLY)} / month</b></p></div>
          <div className="sl-pricing-card"><h3>Yearly plan</h3><label className="sl-pricing-field">Price (INR)<input type="number" min="1" step="1" value={draftPrices.YEARLY} onChange={e=>setDraftPrices(p=>({...p,YEARLY:Number(e.target.value)}))}/></label><p>Customer-facing price: <b>{inr(prices.YEARLY)} / year</b></p></div>
        </div>
        <p style={{fontSize:13,color:"#667064",lineHeight:1.7}}>Price changes apply to new orders immediately after saving. Existing payment records remain unchanged for accurate accounting; already-created Razorpay orders retain their original amount.</p>
        <button className="sl-button" disabled={savingPrices||!Number.isFinite(draftPrices.MONTHLY)||!Number.isFinite(draftPrices.YEARLY)||draftPrices.MONTHLY<1||draftPrices.YEARLY<1} onClick={()=>void savePrices()}>{savingPrices?"Saving…":"Save pricing"} <CheckCircle2 size={16}/></button>
      </section>}
      {tab==="audit"&&<section className="sl-section-card">{audit.length?audit.map(event=><article key={event.id} style={{padding:"14px 0",borderBottom:"1px solid #edf0ea"}}><b>{event.action.replaceAll("_"," ")}</b><p style={{margin:"5px 0",fontSize:13}}>{event.subscription?.business?.name||"Platform event"} · {dateLabel(event.createdAt)}</p><small style={{overflowWrap:"anywhere"}}>{JSON.stringify(event.details||{})}</small></article>):<p>No audit events recorded yet.</p>}</section>}
    </main>
  </div>;
}
