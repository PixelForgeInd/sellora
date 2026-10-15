import { useEffect, useState } from "react";
import { api } from "../sellora/api-client";
import { Button as Btn } from "./ui";

type Props = {
  setError?: (message: string) => void;
  setNotice?: (message: string) => void;
};

const datePickerStyles = (
  <style>{`
      .sl-section-card .sl-report-date-input {
        box-sizing: border-box;
        min-height: 42px;
        min-width: 150px;
        padding: 10px 12px;
        border: 1px solid #dce5da;
        border-radius: 10px;
        background: transparent;
        color: #26372d;
        font: inherit;
        font-size: 14px;
        line-height: 1.35;
        box-shadow: none;
        accent-color: #599c56;
        color-scheme: light;
        cursor: pointer;
        transition: border-color 150ms ease, background-color 150ms ease;
      }
      .sl-section-card .sl-report-date-input:hover {
        border-color: #cbd8c8;
        background: #fff;
      }
      .sl-section-card .sl-report-date-input:focus,
      .sl-section-card .sl-report-date-input:focus-visible {
        outline: none;
        border-color: #599c56;
        box-shadow: 0 0 0 3px rgba(89, 156, 86, 0.14);
        background: #fff;
      }
      .sl-section-card .sl-report-date-input::-webkit-calendar-picker-indicator {
        cursor: pointer;
        opacity: 0.65;
        margin-left: 8px;
      }
      @media (max-width: 640px) {
        .sl-section-card .sl-report-date-input {
          width: 100%;
          min-width: 0;
        }
      }
    `}</style>
);

export function EnquiriesSection({
  setError = () => {},
  setNotice = () => {},
}: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  async function refresh() {
    setBusy(true);
    try {
      setItems(await api("/workspace/enquiries"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load enquiries.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function update(id: string, status: string) {
    try {
      const saved = await api(
        "/workspace/enquiries/" + encodeURIComponent(id),
        { method: "PATCH", body: JSON.stringify({ status }) },
      );
      setItems((old) => old.map((x) => (x.id === id ? saved : x)));
      setNotice("Enquiry status updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update enquiry.");
    }
  }
  return (
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div>
          <h3>Customer enquiries</h3>
          <p>
            Enquiries submitted from published catalogues, including the product
            that interested the customer.
          </p>
        </div>
        <Btn kind="outline" onClick={() => void refresh()}>
          Refresh
        </Btn>
      </div>
      {busy ? (
        <p>Loading enquiries…</p>
      ) : !items.length ? (
        <div className="sl-empty">
          <h3>No enquiries yet</h3>
          <p>
            Once a customer submits the enquiry form on a published catalogue,
            it will appear here.
          </p>
        </div>
      ) : (
        items.map((item) => (
          <article
            key={item.id}
            className="sl-product-row"
            style={{ alignItems: "flex-start", flexWrap: "wrap" }}
          >
            <div className="sl-product-name" style={{ minWidth: 220, flex: 1 }}>
              <b>
                {item.reference} · {item.customerName}
              </b>
              <small>
                {item.companyName || "Individual customer"} ·{" "}
                {item.phone || item.email || "No contact"} ·{" "}
                {new Date(item.createdAt).toLocaleString()}
              </small>
              <small>
                {item.catalogue?.title || "Catalogue"}
                {item.product?.name ? " · Product: " + item.product.name : ""}
              </small>
              <p>{item.message}</p>
            </div>
            <select
              aria-label={"Status for " + item.reference}
              value={item.status}
              onChange={(e) => void update(item.id, e.target.value)}
            >
              {["NEW", "CONTACTED", "QUOTATION_SENT", "CONVERTED", "LOST"].map(
                (s) => (
                  <option key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </option>
                ),
              )}
            </select>
          </article>
        ))
      )}
    </section>
  );
}

export function InventorySection({
  setError = () => {},
  setNotice = () => {},
}: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  async function refresh() {
    try {
      const result = await api("/workspace/inventory");
      setProducts(result.products);
      setMovements(result.movements);
      setQuantities(
        Object.fromEntries(
          result.products.map((p: any) => [
            p.id,
            p.stockQuantity == null ? "0" : String(p.stockQuantity),
          ]),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load inventory.");
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  async function save(product: any) {
    const quantity = Number(quantities[product.id]);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Enter a valid non-negative stock quantity.");
      return;
    }
    setBusy(true);
    try {
      await api(
        "/workspace/inventory/" + encodeURIComponent(product.id) + "/adjust",
        {
          method: "POST",
          body: JSON.stringify({
            quantity,
            reason: "ADJUSTMENT",
            note: "Dashboard stock adjustment",
          }),
        },
      );
      await refresh();
      setNotice("Stock updated for " + product.name + ".");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update stock.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div>
          <h3>Inventory</h3>
          <p>
            Enable stock limits by setting a quantity. Checkout validates and
            reserves stock for enabled products.
          </p>
        </div>
        <Btn kind="outline" onClick={() => void refresh()}>
          Refresh
        </Btn>
      </div>
      {!products.length ? (
        <p>Add products before managing stock.</p>
      ) : (
        products.map((p) => (
          <article
            key={p.id}
            className="sl-product-row"
            style={{ flexWrap: "wrap" }}
          >
            <div className="sl-product-name" style={{ flex: 1, minWidth: 180 }}>
              <b>{p.name}</b>
              <small>
                {p.sku || "No SKU"} ·{" "}
                {p.stockEnabled ? "Stock tracked" : "Stock tracking disabled"}
              </small>
            </div>
            <label>
              Available quantity{" "}
              <input
                type="number"
                min="0"
                step="0.001"
                value={quantities[p.id] ?? "0"}
                onChange={(e) =>
                  setQuantities((old) => ({ ...old, [p.id]: e.target.value }))
                }
              />
            </label>
            <Btn disabled={busy} onClick={() => void save(p)}>
              Save stock
            </Btn>
          </article>
        ))
      )}
      <h3 style={{ marginTop: 24 }}>Recent stock movements</h3>
      {!movements.length ? (
        <p>No stock movements recorded yet.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Product</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Order</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td>{new Date(m.createdAt).toLocaleString()}</td>
                  <td>{m.product.name}</td>
                  <td>
                    {Number(m.quantityDelta) > 0 ? "+" : ""}
                    {m.quantityDelta}
                  </td>
                  <td>{m.reason.replaceAll("_", " ")}</td>
                  <td>{m.order?.orderNumber || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function CustomersSection({ setError = () => {} }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    api("/workspace/customers")
      .then(setCustomers)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load customers."),
      )
      .finally(() => setBusy(false));
  }, []);
  return (
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div>
          <h3>Customers</h3>
          <p>Customer profiles, prior catalogue orders and enquiries.</p>
        </div>
        <Btn
          kind="outline"
          onClick={() => {
            setBusy(true);
            api("/workspace/customers")
              .then(setCustomers)
              .catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Could not load customers.",
                ),
              )
              .finally(() => setBusy(false));
          }}
        >
          Refresh
        </Btn>
      </div>
      {busy ? (
        <p>Loading customers…</p>
      ) : !customers.length ? (
        <div className="sl-empty">
          <h3>No customers yet</h3>
          <p>
            Customers are added when they place a catalogue order or send an
            enquiry.
          </p>
        </div>
      ) : (
        customers.map((c) => (
          <details key={c.id} className="sl-order-card">
            <summary>
              <span>
                <b>{c.name}</b>
                <small>
                  {c.phone || c.email || "No contact details"} ·{" "}
                  {c.orders.length} orders · {c.enquiries.length} enquiries
                </small>
              </span>
              <span>
                <small>{c.email || ""}</small>
              </span>
            </summary>
            <div className="sl-order-detail">
              <p>
                <b>Address:</b> {c.address || "Not provided"}
              </p>
              <h4>Order history</h4>
              {!c.orders.length ? (
                <p>No orders yet.</p>
              ) : (
                c.orders.map((o: any) => (
                  <p key={o.id}>
                    {o.orderNumber} ·{" "}
                    {new Date(o.createdAt).toLocaleDateString()} · {o.status} /{" "}
                    {o.paymentStatus} · {o.currency} {o.totalAmount}
                  </p>
                ))
              )}
              <h4>Enquiry history</h4>
              {!c.enquiries.length ? (
                <p>No enquiries yet.</p>
              ) : (
                c.enquiries.map((e: any) => (
                  <p key={e.id}>
                    {e.reference} · {e.status} · {e.message}
                  </p>
                ))
              )}
            </div>
          </details>
        ))
      )}
    </section>
  );
}

export function ReportsSection({ setError = () => {} }: Props) {
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  async function refresh() {
    setBusy(true);
    try {
      const start = new Date(from + "T00:00:00").toISOString();
      const end = new Date(to + "T23:59:59.999").toISOString();
      setReport(
        await api(
          "/workspace/reports?from=" +
            encodeURIComponent(start) +
            "&to=" +
            encodeURIComponent(end),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load reports.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
  }, []);
  return (
    <section className="sl-section-card">
      {datePickerStyles}
      <div className="sl-section-head">
        <div>
          <h3>Sales & payment reports</h3>
          <p>
            Choose a date range to prepare a report. Report figures and order
            details are not displayed on this page.
          </p>
        </div>
      </div>
      <div className="sl-orders-filters sl-report-date-filters">
        <label>
          From{" "}
          <input
            className="sl-report-date-input sl-orders-date-input"
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label>
          To{" "}
          <input
            className="sl-report-date-input"
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <Btn disabled={busy} onClick={() => void refresh()}>
          {busy ? "Loading…" : "Apply dates"}
        </Btn>
      </div>
      <div className="sl-report-private-note">
        <p>Report figures and order details are hidden in this view.</p>
      </div>
    </section>
  );
}
function moneyINR(value: unknown) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}
