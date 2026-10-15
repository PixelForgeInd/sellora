import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, CreditCard, RefreshCw, ShieldAlert } from "lucide-react";
import { api } from "../sellora/api-client";

type SubscriptionData = {
  id: string; status: string; interval: string; amount: string; currency: string;
  currentPeriodStart: string; currentPeriodEnd: string; dueAt: string; lastPaidAt?: string | null;
  isLocked: boolean; prices: { MONTHLY: number; YEARLY: number };
  recentPayments: Array<{ id: string; interval: string; amount: string; status: string; createdAt: string; paidAt?: string | null }>;
};
const fmtDate = (v?: string | null) => v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
let razorpayScriptPromise: Promise<void> | null = null;
function loadRazorpay() {
  if ((window as any).Razorpay) return Promise.resolve();
  if (!razorpayScriptPromise) razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => { razorpayScriptPromise = null; reject(new Error("Could not load secure payment checkout.")); };
    document.body.appendChild(script);
  });
  return razorpayScriptPromise;
}
export function SubscriptionSection({ token, onRenewed }: { token: string; onRenewed?: () => Promise<void> }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function refresh() {
    setError("");
    try { setSubscription(await api("/workspace/subscription", {}, token)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load subscription."); }
  }
  useEffect(() => { void refresh(); }, [token]);
  async function pay(interval: "MONTHLY" | "YEARLY") {
    setBusy(true); setError(""); setNotice("");
    try {
      await loadRazorpay();
      const order = await api("/workspace/subscription/order", { method:"POST", body:JSON.stringify({ interval }) }, token);
      const Razorpay = (window as any).Razorpay;
      await new Promise<void>((resolve, reject) => {
        const checkout = new Razorpay({
          key: order.keyId,
          amount: order.amount,
          currency: order.currency,
          name: "Sellora",
          description: interval === "YEARLY" ? "Sellora annual subscription" : "Sellora monthly subscription",
          order_id: order.orderId,
          theme: { color: "#599c56" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const verified = await api("/workspace/subscription/verify", { method:"POST", body:JSON.stringify(response) }, token);
              if (!verified.success) throw new Error("Payment verification was not confirmed.");
              setNotice("Payment verified. Your Sellora access is active.");
              await refresh();
              if (onRenewed) await onRenewed();
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => resolve() }
        });
        checkout.on("payment.failed", (event: any) => reject(new Error(event?.error?.description || "Payment failed. If money was deducted, contact support before retrying.")));
        checkout.open();
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start subscription payment."); }
    finally { setBusy(false); }
  }
  if (!subscription && !error) return <section className="sl-section-card">Loading subscription…</section>;
  return <section className="sl-section-card">
    <div className="sl-section-head"><div><h3>Sellora subscription</h3><p>One plan with monthly or annual billing. Secure payment is verified by the server.</p></div><button className="sl-button sl-button-outline" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15}/> Refresh</button></div>
    {error && <p role="alert" style={{color:"#b42318"}}>{error}</p>}
    {notice && <p role="status" className="sl-notice">{notice}</p>}
    {subscription && <>
      <div className="sl-analytics-metrics">
        <span><small>Status</small><b>{subscription.isLocked ? "Locked" : "Active"}</b></span>
        <span><small>Current billing</small><b>{subscription.interval === "YEARLY" ? "₹2,490 / year" : "₹249 / month"}</b></span>
        <span><small>Renew by</small><b>{fmtDate(subscription.dueAt)}</b></span>
        <span><small>Last verified payment</small><b>{fmtDate(subscription.lastPaidAt)}</b></span>
      </div>
      {subscription.isLocked ? <p role="alert" style={{display:"flex",gap:8,alignItems:"center",marginTop:16,color:"#b42318"}}><ShieldAlert size={18}/> Your subscription is overdue and access is locked. Pay below to restore your workspace and public catalogue after payment verification.</p> : new Date(subscription.dueAt).getTime() < Date.now() ? <p role="status" style={{display:"flex",gap:8,alignItems:"center",marginTop:16,color:"#9a6700"}}><ShieldAlert size={18}/> Payment is due. Please renew within 24 hours to avoid your workspace and public catalogue being locked.</p> : null}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:14,marginTop:20}}>
        <article className="sl-section-card"><span className="sl-kicker">MONTHLY</span><h2>₹249 <small>/ month</small></h2><p>Flexible monthly renewal.</p><button className="sl-button" disabled={busy} onClick={() => void pay("MONTHLY")}><CreditCard size={16}/> {busy ? "Processing…" : "Pay monthly"}</button></article>
        <article className="sl-section-card"><span className="sl-kicker">YEARLY · SAVE ₹498</span><h2>₹2,490 <small>/ year</small></h2><p>12 months for the price of 10.</p><button className="sl-button" disabled={busy} onClick={() => void pay("YEARLY")}><CreditCard size={16}/> {busy ? "Processing…" : "Pay yearly"}</button></article>
      </div>
      <div style={{marginTop:24}}><h4 style={{display:"flex",gap:8,alignItems:"center"}}><CalendarClock size={17}/> Payment history</h4>
        {subscription.recentPayments.length ? subscription.recentPayments.map(payment=><p key={payment.id} style={{fontSize:13,padding:"10px 0",borderBottom:"1px solid var(--sl-border,#e5e7eb)"}}>₹{payment.amount} · {payment.interval} · {payment.status} · {fmtDate(payment.paidAt || payment.createdAt)} {payment.status === "PAID" && <CheckCircle2 size={13}/>}</p>) : <p>No subscription payments yet.</p>}
      </div>
    </>}
  </section>;
}
