import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, CreditCard, RefreshCw, ShieldAlert, RotateCcw, Home, XCircle } from "lucide-react";
import { api } from "../sellora/api-client";

type SubscriptionData = {
  id: string; status: string; interval: string; amount: string; currency: string;
  currentPeriodStart: string; currentPeriodEnd: string; dueAt: string; lastPaidAt?: string | null;
  isLocked: boolean; paymentConfigured?: boolean; prices: { MONTHLY: number; YEARLY: number };
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
export function SubscriptionSection({ token, onRenewed, requirePayment = false }: { token: string; onRenewed?: () => Promise<void>; requirePayment?: boolean }) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const [selectedInterval, setSelectedInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  async function refresh() {
    setError("");
    try { setSubscription(await api("/workspace/subscription", {}, token)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load subscription."); }
  }
  useEffect(() => { void refresh(); }, [token]);
  useEffect(() => {
    if (requirePayment && subscription && !autoStarted && !busy && !subscription.paymentConfigured) {
      setError("Subscription payments are not configured. Please contact Sellora support.");
      setPaymentFailed(true);
      setAutoStarted(true);
    } else if (requirePayment && subscription && subscription.paymentConfigured && !autoStarted && !busy) {
      setAutoStarted(true);
      void pay(selectedInterval);
    }
  }, [requirePayment, subscription, autoStarted, busy]);
  async function pay(interval: "MONTHLY" | "YEARLY") {
    setBusy(true); setError(""); setNotice(""); setPaymentFailed(false); setSelectedInterval(interval);
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
          modal: { ondismiss: () => reject(new Error("Payment was cancelled before completion. You can try again when ready.")) }
        });
        checkout.on("payment.failed", (event: any) => reject(new Error(event?.error?.description || "Payment failed. If money was deducted, contact support before retrying.")));
        checkout.open();
      });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start subscription payment."); setPaymentFailed(true); }
    finally { setBusy(false); }
  }
  if (paymentFailed) return <section className="sl-section-card sl-payment-failed">
    <style>{`
      .sl-payment-failed{max-width:680px;margin:7vh auto;text-align:center;padding:clamp(28px,5vw,54px)!important;border-radius:22px!important}
      .sl-payment-failed .sl-fail-orbit{width:94px;height:94px;border-radius:50%;margin:0 auto 22px;display:grid;place-items:center;background:#fff0ef;color:#c43d3d;position:relative;animation:sl-fail-pulse 1.8s ease-in-out infinite}
      .sl-payment-failed .sl-fail-orbit:after{content:"";position:absolute;inset:-7px;border:1px dashed #efb6b2;border-radius:50%;animation:sl-fail-spin 9s linear infinite}
      .sl-payment-failed h2{font-size:clamp(25px,4vw,34px);margin:0 0 10px;color:#28362b;letter-spacing:-.03em}
      .sl-payment-failed p{color:#667164;line-height:1.7;margin:0 auto 12px;max-width:460px}
      .sl-payment-failed .sl-fail-error{font-size:13px;color:#a83232;background:#fff6f5;border:1px solid #f5d9d7;border-radius:10px;padding:11px 13px;margin:20px auto;max-width:500px;overflow-wrap:anywhere}
      .sl-payment-failed .sl-fail-actions{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:24px}
      .sl-payment-failed .sl-fail-actions button{min-height:46px;padding:0 18px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:700;cursor:pointer}
      .sl-payment-failed .sl-fail-retry{background:#599c56;color:white;border:1px solid #599c56}
      .sl-payment-failed .sl-fail-home{background:white;color:#354334;border:1px solid #dfe6dc}
      @keyframes sl-fail-pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(196,61,61,.12)}50%{transform:scale(1.04);box-shadow:0 0 0 12px rgba(196,61,61,0)}}
      @keyframes sl-fail-spin{to{transform:rotate(360deg)}}
      @media(prefers-reduced-motion:reduce){.sl-payment-failed .sl-fail-orbit,.sl-payment-failed .sl-fail-orbit:after{animation:none}}
    `}</style>
    <div className="sl-fail-orbit"><XCircle size={46}/></div>
    <span className="sl-kicker">PAYMENT NOT COMPLETED</span>
    <h2>We couldn’t confirm your payment</h2>
    <p>Your Sellora workspace is not active yet. You have not been charged by Sellora again from this screen. If your bank shows a debit, check your payment status before retrying.</p>
    {error && <div className="sl-fail-error" role="alert">{error}</div>}
    <div className="sl-fail-actions">
      <button className="sl-fail-retry" disabled={busy} onClick={() => {setPaymentFailed(false); void pay(selectedInterval);}}><RotateCcw size={16}/>{busy ? "Opening checkout…" : "Try payment again"}</button>
      <button className="sl-fail-home" onClick={() => { sessionStorage.removeItem("sellora_token"); window.location.href = "/"; }}><Home size={16}/> Back to home</button>
    </div>
  </section>;
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
