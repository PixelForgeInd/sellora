import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, CreditCard, RefreshCw, ShieldAlert, RotateCcw, Home, XCircle } from "lucide-react";
import { api } from "../sellora/api-client";

type SubscriptionData = {
  id: string; status: string; interval: string; amount: string; currency: string;
  currentPeriodStart: string; currentPeriodEnd: string; dueAt: string; lastPaidAt?: string | null;
  isLocked: boolean; isPastDue?: boolean; gracePeriodActive?: boolean; gracePeriodEndsAt?: string; paymentConfigured?: boolean; prices: { MONTHLY: number; YEARLY: number };
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
  const [selectedInterval, setSelectedInterval] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  async function refresh() {
    setError("");
    try { setSubscription(await api("/workspace/subscription", {}, token)); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load subscription."); }
  }
  useEffect(() => { void refresh(); }, [token]);
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
              setNotice("Payment received. Waiting for Razorpay to confirm the final payment status…");
              let verified: any = null;
              let lastStatus = "pending";
              // Poll the server-side Razorpay payment lookup for up to two minutes.
              // The server activates the subscription only after Razorpay reports "captured".
              for (let attempt = 0; attempt < 24; attempt += 1) {
                verified = await api("/workspace/subscription/verify", { method:"POST", body:JSON.stringify(response) }, token);
                if (verified.success) break;
                lastStatus = verified.providerStatus || "pending";
                if (!verified.pending) {
                  throw new Error(verified.message || "Razorpay did not confirm a successful payment. Your workspace remains inactive.");
                }
                if (attempt < 23) {
                  setNotice(`Razorpay is confirming your payment (check ${attempt + 1} of 24)…`);
                  await new Promise(resolveWait => window.setTimeout(resolveWait, 5000));
                }
              }
              if (!verified?.success) {
                throw new Error(`Razorpay has not confirmed this payment after two minutes (last status: ${lastStatus}). Your subscription has not been activated. Please check payment history before retrying.`);
              }
              setNotice("Welcome to Sellora! Your payment is verified and your subscription is now active.");
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
  return <section className="sl-section-card sl-renewal-subscription-card">
    <style>{`.sl-renewal-app .sl-renewal-subscription-card{position:relative;isolation:isolate;border:3px solid transparent!important;background:linear-gradient(#fff,#fff) padding-box,linear-gradient(115deg,#599c56,#71d4ae,#7588f5,#d2a3ff,#599c56) border-box!important;background-size:auto,300% 300%!important;animation:sl-renewal-card-enter .8s cubic-bezier(.2,.75,.25,1) both,sl-renewal-border-flow 7s ease infinite!important}
      .sl-renewal-app .sl-renewal-subscription-card:before{content:none!important}
      .sl-renewal-app .sl-renewal-subscription-card:after{content:none!important}
      .sl-renewal-app .sl-renewal-subscription-card .sl-section-head{animation:sl-renewal-card-enter .65s .08s both}
      .sl-renewal-app .sl-renewal-subscription-card .sl-analytics-metrics>span{animation:sl-renewal-card-enter .55s both;transition:transform .25s ease,box-shadow .25s ease!important}
      .sl-renewal-app .sl-renewal-subscription-card .sl-analytics-metrics>span:nth-child(1){animation-delay:.12s}
      .sl-renewal-app .sl-renewal-subscription-card .sl-analytics-metrics>span:nth-child(2){animation-delay:.2s}
      .sl-renewal-app .sl-renewal-subscription-card .sl-analytics-metrics>span:nth-child(3){animation-delay:.28s}
      .sl-renewal-app .sl-renewal-subscription-card .sl-analytics-metrics>span:nth-child(4){animation-delay:.36s}
      .sl-renewal-app .sl-renewal-subscription-card .sl-analytics-metrics>span:hover{transform:translateY(-5px) scale(1.015)!important;box-shadow:0 12px 26px rgba(53,101,67,.15)!important}
      .sl-renewal-app .sl-renewal-subscription-card article.sl-section-card{animation:sl-renewal-card-enter .65s both;transition:transform .25s ease,box-shadow .25s ease!important}
      .sl-renewal-app .sl-renewal-subscription-card article.sl-section-card:nth-child(1){animation-delay:.24s}
      .sl-renewal-app .sl-renewal-subscription-card article.sl-section-card:nth-child(2){animation-delay:.38s}
      .sl-renewal-app .sl-renewal-subscription-card article.sl-section-card:hover{transform:translateY(-7px)!important;box-shadow:0 20px 36px rgba(57,91,76,.16)!important}
      .sl-renewal-app .sl-renewal-subscription-card article.sl-section-card .sl-button{background:linear-gradient(105deg,#38864a,#65b86c)!important;background-size:180% auto!important;color:#fff!important;border:0!important;box-shadow:0 7px 18px rgba(61,145,77,.25)!important;transition:background-position .35s ease,transform .2s ease,box-shadow .2s ease!important}
      .sl-renewal-app .sl-renewal-subscription-card article.sl-section-card:nth-child(2) .sl-button{background-image:linear-gradient(105deg,#4c5fd0,#8275ed,#5368c9)!important;box-shadow:0 7px 18px rgba(83,104,201,.25)!important}
      .sl-renewal-app .sl-renewal-subscription-card article.sl-section-card .sl-button:hover:not(:disabled){background-position:100% center!important;transform:translateY(-3px) scale(1.025)!important;box-shadow:0 12px 25px rgba(61,105,80,.28)!important}
      .sl-renewal-app .sl-renewal-subscription-card .sl-section-head .sl-button{animation:sl-renewal-refresh-glow 3s ease-in-out infinite}
      .sl-renewal-app .sl-renewal-subscription-card [role=alert]{animation:sl-renewal-alert-pop .55s cubic-bezier(.2,.8,.2,1) both}
      @keyframes sl-renewal-card-enter{from{opacity:0;transform:translateY(24px) scale(.985)}to{opacity:1;transform:translateY(0) scale(1)}}
      @keyframes sl-renewal-border-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes sl-renewal-refresh-glow{0%,100%{box-shadow:0 0 0 0 rgba(89,156,86,0)}50%{box-shadow:0 0 0 5px rgba(89,156,86,.1)}}
      @keyframes sl-renewal-alert-pop{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      @media(prefers-reduced-motion:reduce){.sl-renewal-app .sl-renewal-subscription-card,.sl-renewal-app .sl-renewal-subscription-card:before,.sl-renewal-app .sl-renewal-subscription-card .sl-section-head,.sl-renewal-app .sl-renewal-subscription-card .sl-analytics-metrics>span,.sl-renewal-app .sl-renewal-subscription-card article.sl-section-card,.sl-renewal-app .sl-renewal-subscription-card .sl-section-head .sl-button,.sl-renewal-app .sl-renewal-subscription-card [role=alert]{animation:none!important;transition:none!important}}`}</style>
    <div className="sl-section-head"><div><h3>Sellora subscription</h3><p>One plan with monthly or annual billing. Secure payment is verified by the server.</p></div><button className="sl-button sl-button-outline" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15}/> Refresh</button></div>
    {error && <p role="alert" style={{color:"#b42318"}}>{error}</p>}
    {notice && <p role="status" className="sl-notice">{notice}</p>}
    {subscription && <>
      <div className="sl-analytics-metrics">
        <span><small>Status</small><b>{subscription.isLocked ? "Locked" : "Active"}</b></span>
        <span><small>Current billing</small><b>{subscription.interval === "YEARLY" ? `₹${subscription.prices.YEARLY.toLocaleString("en-IN")} / year` : `₹${subscription.prices.MONTHLY.toLocaleString("en-IN")} / month`}</b></span>
        <span><small>Renew by</small><b>{fmtDate(subscription.dueAt)}</b></span>
        <span><small>Last verified payment</small><b>{fmtDate(subscription.lastPaidAt)}</b></span>
      </div>
      {subscription.isLocked ? <div role="alert" style={{display:"flex",gap:10,alignItems:"flex-start",marginTop:16,padding:16,borderRadius:12,background:"#fff1f0",border:"1px solid #f2c7c3",color:"#a12d27"}}><ShieldAlert size={20}/><div><b>Your Sellora subscription has expired</b><p style={{margin:"6px 0 0",lineHeight:1.6}}>Please make the payment of ₹{(subscription.interval === "YEARLY" ? subscription.prices.YEARLY : subscription.prices.MONTHLY).toLocaleString("en-IN")} to continue using Sellora. Your workspace is temporarily locked until the payment is verified.</p></div></div> : subscription.gracePeriodActive ? <div role="status" style={{display:"flex",gap:10,alignItems:"flex-start",marginTop:16,padding:16,borderRadius:12,background:"#fff8e8",border:"1px solid #f1d89c",color:"#805b12"}}><ShieldAlert size={20}/><div><b>Payment due — 1-day grace period</b><p style={{margin:"6px 0 0",lineHeight:1.6}}>Please make the payment of ₹{subscription.interval === "YEARLY" ? "2,490" : "249"} by {fmtDate(subscription.gracePeriodEndsAt)} to continue using Sellora without interruption.</p></div></div> : subscription.isPastDue ? <p role="status" style={{display:"flex",gap:8,alignItems:"center",marginTop:16,color:"#9a6700"}}><ShieldAlert size={18}/> Your renewal date has arrived. Please renew within the 1-day grace period.</p> : null}
      <style>{`.sl-renewal-app .sl-renewal-plan-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-top:24px;align-items:stretch}\n.sl-renewal-app .sl-renewal-plan{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:12px;min-width:0;overflow:hidden;padding:30px!important;border-radius:20px!important;transition:transform .25s ease,box-shadow .25s ease!important}\n.sl-renewal-app .sl-renewal-plan h2{font-size:clamp(30px,3vw,38px)!important;line-height:1.15!important;letter-spacing:-.04em;margin:8px 0!important}\n.sl-renewal-app .sl-renewal-plan h2 small{font-size:16px!important;letter-spacing:0}\n.sl-renewal-app .sl-renewal-plan .sl-renewal-plan-label{font-size:12px;font-weight:800;letter-spacing:.16em}\n.sl-renewal-app .sl-renewal-plan .sl-renewal-plan-description{font-size:15px;line-height:1.7;margin:0;color:#596b60}\n.sl-renewal-app .sl-renewal-plan .sl-renewal-plan-details{display:flex;flex-wrap:wrap;gap:8px;margin:2px 0 8px}\n.sl-renewal-app .sl-renewal-plan .sl-renewal-plan-details span{display:inline-flex;align-items:center;gap:6px;border-radius:999px;padding:7px 11px;font-size:12px;font-weight:700}\n.sl-renewal-app .sl-renewal-plan .sl-button{min-height:46px;padding:0 20px!important;font-size:14px!important;font-weight:800!important;margin-top:auto}\n.sl-renewal-app .sl-renewal-plan-monthly{border:1px solid #b8dfc0!important;background:linear-gradient(145deg,#fff 0%,#f0fbf2 100%)!important;box-shadow:0 10px 28px rgba(50,132,69,.09)!important}\n.sl-renewal-app .sl-renewal-plan-monthly .sl-renewal-plan-label{color:#28743d}\n.sl-renewal-app .sl-renewal-plan-monthly .sl-renewal-plan-details span{background:#e0f5e5;color:#286b39}\n.sl-renewal-app .sl-renewal-plan-yearly{border:2px solid #7a78f2!important;background:linear-gradient(145deg,#fff 0%,#f1f0ff 55%,#edf6ff 100%)!important;box-shadow:0 16px 36px rgba(91,87,205,.17)!important}\n.sl-renewal-app .sl-renewal-plan-yearly:before{content:"";position:absolute;top:0;left:0;right:0;height:7px;background:linear-gradient(90deg,#5b66e8,#9b6cf3,#ec82bd)}\n.sl-renewal-app .sl-renewal-plan-yearly .sl-renewal-plan-label{color:#5551c7}\n.sl-renewal-app .sl-renewal-plan-yearly .sl-renewal-plan-details span{background:#e5e4ff;color:#4b46b8}\n.sl-renewal-app .sl-renewal-plan-yearly .sl-renewal-plan-details .sl-renewal-discount{background:linear-gradient(100deg,#d7f8dc,#c6f3d1);color:#176b32;border:1px solid #8cdaa0;font-weight:900;box-shadow:0 3px 12px rgba(46,160,78,.14)}\n.sl-renewal-app .sl-renewal-recommended{display:inline-flex;align-items:center;gap:5px;border-radius:999px;background:linear-gradient(100deg,#5658d8,#9365ed);color:#fff;padding:8px 12px;font-size:11px;font-weight:900;letter-spacing:.06em;box-shadow:0 6px 16px rgba(87,82,208,.28);position:absolute;top:18px;right:18px}\n.sl-renewal-app .sl-renewal-plan-yearly .sl-button{background:linear-gradient(100deg,#4c5cdb,#8464ed)!important;box-shadow:0 8px 18px rgba(90,83,218,.28)!important}
        .sl-renewal-app .sl-renewal-yearly-breakdown{width:100%;display:grid;gap:9px;padding:14px;border:1px solid #dcd9ff;border-radius:14px;background:rgba(255,255,255,.72);box-sizing:border-box}.sl-renewal-app .sl-renewal-yearly-breakdown>div{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;color:#5b5d82}.sl-renewal-app .sl-renewal-yearly-breakdown strong{color:#3f45ad}.sl-renewal-app .sl-renewal-yearly-breakdown .sl-renewal-yearly-effective{padding-top:9px;border-top:1px solid #e2e0ff;color:#4547a9;font-weight:700}.sl-renewal-app .sl-renewal-yearly-benefits{list-style:none;display:grid;gap:12px;padding:0;margin:4px 0 8px;width:100%}.sl-renewal-app .sl-renewal-yearly-benefits li{display:flex;gap:10px;align-items:flex-start;color:#4c5876;font-size:13px;line-height:1.45}.sl-renewal-app .sl-renewal-yearly-benefits li>span{display:grid;place-items:center;flex:0 0 22px;height:22px;border-radius:50%;background:#dff7e5;color:#24753a;font-weight:900}.sl-renewal-app .sl-renewal-yearly-benefits strong{display:block;color:#323b78;font-size:13px}.sl-renewal-app .sl-renewal-yearly-benefits small{display:block;margin-top:2px;color:#69718b;font-size:12px}@media(max-width:700px){.sl-renewal-app .sl-renewal-yearly-breakdown{padding:12px}.sl-renewal-app .sl-renewal-yearly-benefits{gap:10px}}\n.sl-renewal-app .sl-renewal-plan:hover{transform:translateY(-5px)!important}\n@media(max-width:700px){.sl-renewal-app .sl-renewal-plan-grid{grid-template-columns:1fr;gap:16px}.sl-renewal-app .sl-renewal-plan{padding:24px!important}.sl-renewal-app .sl-renewal-recommended{position:static;align-self:flex-start;order:-1}.sl-renewal-app .sl-renewal-plan-yearly h2{font-size:32px!important}}\n@media(prefers-reduced-motion:reduce){.sl-renewal-app .sl-renewal-plan{transition:none!important}`}</style>
      <div className="sl-renewal-plan-grid">
        <article className="sl-section-card sl-renewal-plan sl-renewal-plan-monthly">
          <span className="sl-renewal-plan-label">MONTHLY PLAN</span>
          <h2>₹{subscription.prices.MONTHLY.toLocaleString("en-IN")} <small>/ month</small></h2>
          <p className="sl-renewal-plan-description">Pay month by month with flexibility. Ideal if you prefer to keep your commitment short.</p>
          <div className="sl-renewal-plan-details"><span>✓ Flexible monthly billing</span><span>✓ No annual commitment</span></div>
          <button className="sl-button" disabled={busy} onClick={() => void pay("MONTHLY")}><CreditCard size={17}/> {busy ? "Processing…" : "Choose monthly"}</button>
        </article>
        <article className="sl-section-card sl-renewal-plan sl-renewal-plan-yearly">
          <span className="sl-renewal-recommended">✦ RECOMMENDED</span>
          <span className="sl-renewal-plan-label">YEARLY PLAN</span>
          <h2>₹{subscription.prices.YEARLY.toLocaleString("en-IN")} <small>/ year</small></h2>
          <p className="sl-renewal-plan-description">Get 12 months of Sellora for the price of 10.</p>
          <div className="sl-renewal-plan-details"><span className="sl-renewal-discount">✦ 2 MONTHS FREE</span><span>Save ₹{Math.max(0, subscription.prices.MONTHLY * 12 - subscription.prices.YEARLY).toLocaleString("en-IN")} per year</span></div>
          <div className="sl-renewal-yearly-breakdown">
            <div><span>Regular yearly price</span><s>₹{(subscription.prices.MONTHLY * 12).toLocaleString("en-IN")}</s></div>
            <div className="sl-renewal-yearly-effective"><span>Just</span><strong>₹{Math.round(subscription.prices.YEARLY / 12).toLocaleString("en-IN")} / month</strong></div>
          </div>
          <button className="sl-button" disabled={busy} onClick={() => void pay("YEARLY")}><CreditCard size={17}/> {busy ? "Processing…" : "Get yearly plan"}</button>
        </article>
      </div>
      <div style={{marginTop:24}}><h4 style={{display:"flex",gap:8,alignItems:"center"}}><CalendarClock size={17}/> Payment history</h4>
        {subscription.recentPayments.length ? subscription.recentPayments.map(payment=><p key={payment.id} style={{fontSize:13,padding:"10px 0",borderBottom:"1px solid var(--sl-border,#e5e7eb)"}}>₹{payment.amount} · {payment.interval} · {payment.status} · {fmtDate(payment.paidAt || payment.createdAt)} {payment.status === "PAID" && <CheckCircle2 size={13}/>}</p>) : <p>No subscription payments yet.</p>}
      </div>
    </>}
  </section>;
}
