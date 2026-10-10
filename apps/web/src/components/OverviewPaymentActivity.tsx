import { useCallback, useEffect, useState } from "react";
import { CreditCard, RefreshCw } from "lucide-react";
import { api } from "../sellora/api-client";

type PaymentOrder = {
  id: string;
  productName: string;
  quantity: number;
  unit: string;
  amount: string | number;
  currency: string;
  customerName: string;
  status: string;
  createdAt: string;
};

export function OverviewPaymentActivity() {
  const [orders, setOrders] = useState<PaymentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPayments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api("/workspace/payment-orders");
      setOrders(Array.isArray(result) ? result : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPayments();
  }, [loadPayments]);

  return (
    <section className="sl-section-card sl-settings-page">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div>
          <span className="sl-kicker">PAYMENT ACTIVITY</span>
          <h3>Recent payments</h3>
          <p>Payments recorded for this business.</p>
        </div>
        <button className="sl-button" type="button" onClick={() => void loadPayments()} disabled={loading}>
          <RefreshCw size={15} /> {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {loading ? (
        <p className="sl-muted">Loading recent payments…</p>
      ) : error ? (
        <p className="sl-muted" role="alert">{error}</p>
      ) : orders.length === 0 ? (
        <p className="sl-muted">No payment orders yet. Completed checkout attempts will appear here.</p>
      ) : (
        <div className="sl-industry-fields">
          {orders.slice(0, 5).map((order) => (
            <div className="sl-industry-field" key={order.id}>
              <span>
                <b><CreditCard size={14} /> {order.productName} · {order.quantity} {order.unit}</b>
                <small>{order.customerName} · {new Date(order.createdAt).toLocaleString()} · Ref {order.id.slice(-8)}</small>
              </span>
              <span>
                <b>{order.currency} {Number(order.amount).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
                <small className={order.status === "PAID" ? "sl-published" : "sl-draft"}>{order.status}</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
