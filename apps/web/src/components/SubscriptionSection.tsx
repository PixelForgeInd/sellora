import { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, CreditCard, RefreshCw, ShieldAlert, RotateCcw, Home, XCircle, Download } from "lucide-react";
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
  function downloadBill(payment: SubscriptionData["recentPayments"][number]) {
    const amount = Number(payment.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const date = fmtDate(payment.paidAt || payment.createdAt);
    const billWindow = window.open("", "_blank", "width=760,height=850");
    if (!billWindow) {
      setError("Please allow pop-ups to download your bill.");
      return;
    }
    const safe = (value: string) => value.replace(/[&<>"]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[ch] || ch));
    billWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Sellora payment receipt</title><style>
      body{font-family:Arial,sans-serif;color:#26382b;margin:0;padding:42px;background:#f5f8f4}
      .receipt{max-width:680px;margin:auto;background:#fff;border:1px solid #dce7dc;border-radius:16px;padding:36px}
      .brand{font-size:28px;font-weight:800;color:#347c43}.muted{color:#647267}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid #e3ebe2;padding-bottom:22px}
      h1{font-size:22px;margin:24px 0 8px}.row{display:flex;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid #e9eee8}
      .total{font-size:22px;font-weight:800;color:#1f6031}.status{color:#24743b;font-weight:700}.foot{margin-top:28px;font-size:12px;color:#6b776d;line-height:1.6}
      .print{margin:22px auto 0;display:block;padding:12px 20px;border:0;border-radius:8px;background:#39874a;color:#fff;font-weight:700;cursor:pointer}
      @media print{body{padding:0;background:#fff}.receipt{border:0;border-radius:0}.print{display:none}}
    </style></head><body><main class="receipt"><div class="top"><div><div class="brand">Sellora</div><div class="muted">Digital Catalogues. Smarter Sales.</div></div><div style="text-align:right"><strong>PAYMENT RECEIPT</strong><div class="muted">${safe(date)}</div></div></div>
    <h1>Subscription payment receipt</h1><p class="muted">Receipt for your Sellora subscription payment.</p>
    <div class="row"><span>Receipt / Payment ID</span><strong>${safe(payment.id)}</strong></div>
    <div class="row"><span>Plan</span><strong>${safe(payment.interval)} subscription</strong></div>
    <div class="row"><span>Payment date</span><strong>${safe(date)}</strong></div>
    <div class="row"><span>Payment status</span><strong class="status">${safe(payment.status)}</strong></div>
    <div class="row"><span>Total paid</span><strong class="total">₹${amount} ${safe(subscription?.currency || "INR")}</strong></div>
    <p class="foot">This receipt was generated by Sellora from the payment history available in your account. Keep it for your records. For a tax invoice or billing details, contact Sellora support.</p>
    <button class="print" onclick="window.print()">Download / Save as PDF</button></main></body></html>`);
    billWindow.document.close();
    billWindow.focus();
  }
  if (!subscription && !error) return <section className="sl-section-card">Loading payment history…</section>;
  return <section className="sl-section-card sl-renewal-subscription-card">
    <style>{`.sl-renewal-app .sl-renewal-subscription-card{padding:clamp(20px,3vw,32px)!important}.sl-renewal-app .sl-renewal-payment-history h3{margin:0 0 8px;font-size:28px;color:#214e31}.sl-renewal-app .sl-renewal-payment-intro{margin:0 0 24px;color:#647267;font-size:15px;line-height:1.6}.sl-renewal-app .sl-renewal-payment-list{border-top:1px solid #dfe8df}.sl-renewal-app .sl-renewal-payment-row{display:grid;grid-template-columns:minmax(110px,.7fr) minmax(100px,.7fr) minmax(100px,.6fr) minmax(160px,1fr) auto;align-items:center;gap:14px;padding:18px 0;border-bottom:1px solid #dfe8df;font-size:15px}.sl-renewal-app .sl-renewal-payment-amount{font-size:20px;font-weight:900;color:#1d492b}.sl-renewal-app .sl-renewal-payment-meta,.sl-renewal-app .sl-renewal-payment-row time{font-size:14px;color:#526258}.sl-renewal-app .sl-renewal-payment-status{display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:850;text-transform:capitalize;color:#8a5a12}.sl-renewal-app .sl-renewal-payment-status.paid{color:#26743b}.sl-renewal-app .sl-renewal-download{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:40px;padding:0 13px;border:1px solid #cfe0cf;border-radius:9px;background:#f5fbf5;color:#286b39;font-size:13px;font-weight:800;cursor:pointer;white-space:nowrap}.sl-renewal-app .sl-renewal-download:hover{background:#e6f5e8}.sl-renewal-app .sl-renewal-payment-empty{padding:22px;border:1px dashed #cbdccb;border-radius:12px;background:#f8fcf8;color:#526258;font-size:15px;line-height:1.6}@media(max-width:760px){.sl-renewal-app .sl-renewal-payment-row{grid-template-columns:1fr auto;gap:8px 12px}.sl-renewal-app .sl-renewal-payment-row time{grid-column:1/-1}.sl-renewal-app .sl-renewal-payment-row .sl-renewal-download{grid-column:1/-1;justify-self:start}.sl-renewal-app .sl-renewal-payment-amount{font-size:22px}}`}</style>
    <div className="sl-renewal-payment-history">
      <div className="sl-section-head"><div><h3>Payment history</h3><p className="sl-renewal-payment-intro">View your subscription transactions and download a receipt for your records.</p></div><button className="sl-button sl-button-outline" disabled={busy} onClick={() => void refresh()}><RefreshCw size={15}/> Refresh</button></div>
      {error && <p role="alert" style={{color:"#b42318"}}>{error}</p>}
      {notice && <p role="status" className="sl-notice">{notice}</p>}
      {subscription && (subscription.recentPayments.length ? <div className="sl-renewal-payment-list">{subscription.recentPayments.map(payment=><div className="sl-renewal-payment-row" key={payment.id}><strong className="sl-renewal-payment-amount">₹{Number(payment.amount).toLocaleString("en-IN")}</strong><span className="sl-renewal-payment-meta">{payment.interval} plan</span><span className={`sl-renewal-payment-status ${payment.status.toLowerCase()}`}>{payment.status === "PAID" && <CheckCircle2 size={16}/>} {payment.status}</span><time>{fmtDate(payment.paidAt || payment.createdAt)}</time><button type="button" className="sl-renewal-download" onClick={() => downloadBill(payment)}><Download size={15}/> Download bill</button></div>)}</div> : <p className="sl-renewal-payment-empty">No subscription payments yet. Completed subscription payments will appear here.</p>)}
    </div>
  </section>;
}
