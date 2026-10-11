import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CreditCard,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Trash2,
} from "lucide-react";
import { Brand, Button as Btn, ErrorMessage as Err } from "./ui";
import {
  categories as cats,
  fallbackFields as fallback,
} from "../sellora/catalogue-fields";
import { formatMoney as money } from "../sellora/formatters";
import type { Business, Catalogue, Product } from "../sellora/types";

type BusinessForm = {
  name: string;
  industry: string;
  productCategory: string;
  businessModel: string;
  phone: string;
  website: string;
  brandColor: string;
  sellingMode: "CATALOG_ONLY" | "ONLINE_PAYMENTS";
};
type CatalogueForm = {
  title: string;
  description: string;
  productIds: string[];
};

type AuthScreenProps = {
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  mode: string;
  setMode: (value: string) => void;
  error: string;
  setError: (value: string) => void;
  busy: boolean;
  auth: (event: FormEvent) => Promise<void>;
  notice?: string;
};
export function AuthScreen({
  email,
  setEmail,
  password,
  setPassword,
  showPassword,
  setShowPassword,
  mode,
  setMode,
  error,
  setError,
  busy,
  auth,
  notice = "",
}: AuthScreenProps) {
  return (
    <div className="sl-auth-layout">
      <section className="sl-auth-story">
        <Brand />
        <div className="sl-story-content">
          <span className="sl-kicker">YOUR PRODUCTS. YOUR BRAND.</span>
          <h1>
            One catalogue.
            <br />
            <em>More possibilities.</em>
          </h1>
          <p>
            Create a polished, shareable product catalogue for your business. No
            design tools or technical skills required.
          </p>
          <div className="sl-story-points">
            <span>
              <Check size={16} /> Set up in minutes
            </span>
            <span>
              <Check size={16} /> Fields for your industry
            </span>
            <span>
              <Check size={16} /> Share one simple link
            </span>
          </div>
        </div>
        <small>SELLORA · DIGITAL CATALOGUES. SMARTER SALES.</small>
      </section>
      <section className="sl-auth-main">
        <div className="sl-auth-card">
          <Brand />
          <span className="sl-kicker">
            {mode === "signup"
              ? "START YOUR WORKSPACE"
              : mode === "forgot"
                ? "PASSWORD RECOVERY"
                : mode === "reset"
                  ? "CHOOSE A NEW PASSWORD"
                  : "WELCOME BACK"}
          </span>
          <h2>
            {mode === "signup"
              ? "Create your Sellora account"
              : mode === "forgot"
                ? "Reset your password"
                : mode === "reset"
                  ? "Set a new password"
                  : "Log in to Sellora"}
          </h2>
          <p>
            {mode === "signup"
              ? "Your catalogue journey starts here."
              : mode === "forgot"
                ? "We will email a secure reset link if the account exists."
                : mode === "reset"
                  ? "Choose a password you have not used before."
                  : "Continue managing products and catalogues."}
          </p>
          <Err text={error} />
          {notice && (
            <p className="sl-notice" role="status">
              {notice}
            </p>
          )}
          <form className="sl-form" onSubmit={auth}>
            {mode !== "reset" && (
              <label>
                Email address
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </label>
            )}
            {mode !== "forgot" && (
              <label>
                {mode === "reset" ? "New password" : "Password"}
                <div className="sl-password-wrap">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={mode === "signup" || mode === "reset" ? 8 : 1}
                    autoComplete={
                      mode === "signup" || mode === "reset"
                        ? "new-password"
                        : "current-password"
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      mode === "signup" || mode === "reset"
                        ? "At least 8 characters"
                        : "Your password"
                    }
                  />
                  <button
                    className="sl-password-toggle"
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
            )}
            <Btn type="submit" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "forgot"
                    ? "Send reset link"
                    : mode === "reset"
                      ? "Reset password"
                      : "Log in"}{" "}
              <ArrowRight size={16} />
            </Btn>
          </form>
          {mode === "login" && (
            <p className="sl-auth-switch">
              <button
                type="button"
                onClick={() => {
                  setMode("forgot");
                  setError("");
                }}
              >
                Forgot password?
              </button>
            </p>
          )}
          <p className="sl-auth-switch">
            {mode === "forgot" || mode === "reset"
              ? "Remember your password?"
              : mode === "signup"
                ? "Already have an account?"
                : "New to Sellora?"}{" "}
            <button
              type="button"
              onClick={() => {
                setMode(
                  mode === "signup" || mode === "forgot" || mode === "reset"
                    ? "login"
                    : "signup",
                );
                setError("");
              }}
            >
              {mode === "signup"
                ? "Log in"
                : mode === "forgot" || mode === "reset"
                  ? "Back to log in"
                  : "Create account"}
            </button>
          </p>
          <small className="sl-muted">
            Your workspace is private to your account.
          </small>
        </div>
      </section>
    </div>
  );
}

type OnboardingScreenProps = {
  bform: BusinessForm;
  setBform: Dispatch<SetStateAction<BusinessForm>>;
  error: string;
  busy: boolean;
  createBusiness: (event: FormEvent) => Promise<void>;
  signOut: () => void;
};
export function OnboardingScreen({
  bform,
  setBform,
  error,
  busy,
  createBusiness,
  signOut,
}: OnboardingScreenProps) {
  return (
    <div className="sl-onboarding-page">
      <header className="sl-topbar">
        <Brand />
        <div className="sl-onboarding-actions">
          <button onClick={signOut} className="sl-text-button">
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </header>
      <div className="sl-onboarding-card">
        <span className="sl-kicker">BUSINESS SETUP</span>
        <h1>Tell us about your business.</h1>
        <p>
          We'll use this information to suggest the right product fields for
          your catalogue.
        </p>
        <Err text={error} />
        <form className="sl-form" onSubmit={createBusiness}>
          <label>
            Business name
            <input
              required
              minLength={2}
              value={bform.name}
              onChange={(e) => setBform({ ...bform, name: e.target.value })}
              placeholder="e.g. Ganeshaa Sutra"
            />
          </label>
          <div className="sl-form-row">
            <label>
              What do you sell?
              <select
                value={bform.productCategory}
                onChange={(e) => {
                  const v = e.target.value;
                  setBform({
                    ...bform,
                    productCategory: v,
                    industry: cats.find((c) => c[0] === v)?.[2] || "General",
                  });
                }}
              >
                {cats.map((c) => (
                  <option key={c[0]} value={c[0]}>
                    {c[1]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Business model
              <select
                value={bform.businessModel}
                onChange={(e) =>
                  setBform({ ...bform, businessModel: e.target.value })
                }
              >
                <option>B2B</option>
                <option>B2C</option>
                <option>B2B2C</option>
              </select>
            </label>
          </div>
          <div className="sl-form-row">
            <label>
              Phone (optional)
              <input
                value={bform.phone}
                onChange={(e) => setBform({ ...bform, phone: e.target.value })}
                placeholder="+91…"
              />
            </label>
            <label>
              Website (optional)
              <input
                type="url"
                value={bform.website}
                onChange={(e) =>
                  setBform({ ...bform, website: e.target.value })
                }
                placeholder="https://…"
              />
            </label>
          </div>
          <label>
            Brand colour
            <div className="sl-color-field">
              <input
                type="color"
                value={bform.brandColor}
                onChange={(e) =>
                  setBform({ ...bform, brandColor: e.target.value })
                }
              />
              <span>{bform.brandColor.toUpperCase()}</span>
            </div>
          </label>
          <div className="sl-field-divider">HOW DO YOU WANT TO SELL?</div>
          <label
            className={
              "sl-mode-option" +
              (bform.sellingMode === "CATALOG_ONLY" ? " selected" : "")
            }
          >
            <input
              type="radio"
              name="onboardingSellingMode"
              value="CATALOG_ONLY"
              checked={bform.sellingMode === "CATALOG_ONLY"}
              onChange={() =>
                setBform({ ...bform, sellingMode: "CATALOG_ONLY" })
              }
            />
            <span>
              <b>
                <BookOpen size={18} /> Catalogue only
              </b>
              <small>Share products and collect enquiries.</small>
            </span>
          </label>
          <label
            className={
              "sl-mode-option" +
              (bform.sellingMode === "ONLINE_PAYMENTS" ? " selected" : "")
            }
          >
            <input
              type="radio"
              name="onboardingSellingMode"
              value="ONLINE_PAYMENTS"
              checked={bform.sellingMode === "ONLINE_PAYMENTS"}
              onChange={() =>
                setBform({ ...bform, sellingMode: "ONLINE_PAYMENTS" })
              }
            />
            <span>
              <b>
                <CreditCard size={18} /> Catalogue + online payments
              </b>
              <small>
                Choose online checkout; you can connect a gateway after setup.
                This is the default.
              </small>
            </span>
          </label>
          <div className="sl-template-preview">
            <BookOpen size={18} />
            <span>
              <b>Suggested fields</b>
              <small>
                {(fallback[bform.productCategory] || fallback.other)
                  .map((f) => f.label)
                  .join(" · ")}
              </small>
            </span>
          </div>
          <Btn type="submit" disabled={busy}>
            {busy ? "Setting up…" : "Create my workspace"}{" "}
            <ArrowRight size={16} />
          </Btn>
        </form>
      </div>
    </div>
  );
}

type ProductSectionProps = {
  category: string;
  products: Product[];
  startProduct: (product?: Product) => void;
  deleteProduct: (product: Product) => Promise<void>;
  uploadProductImage: (product: Product, file: File) => Promise<void>;
  removeProductImage: (product: Product) => Promise<void>;
};
export function ProductSection({
  category,
  products,
  startProduct,
  deleteProduct,
  uploadProductImage,
  removeProductImage,
}: ProductSectionProps) {
  const [stock, setStock] = useState<Record<string, string>>({});
  const [movements, setMovements] = useState<any[]>([]);
  const [stockBusy, setStockBusy] = useState("");
  async function refreshStock() {
    try {
      const result = await api("/workspace/inventory");
      setStock(
        Object.fromEntries(
          result.products.map((p: any) => [p.id, String(p.stockQuantity ?? 0)]),
        ),
      );
      setMovements(result.movements || []);
    } catch {
      // Product management remains usable if stock data cannot be refreshed.
    }
  }
  useEffect(() => {
    void refreshStock();
  }, []);
  async function saveStock(product: Product) {
    const quantity = Number(stock[product.id] ?? "0");
    if (!Number.isFinite(quantity) || quantity < 0) return;
    setStockBusy(product.id);
    try {
      await api(
        "/workspace/inventory/" + encodeURIComponent(product.id) + "/adjust",
        {
          method: "POST",
          body: JSON.stringify({
            quantity,
            reason: "ADJUSTMENT",
            note: "Product page stock adjustment",
          }),
        },
      );
      await refreshStock();
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Could not update stock.",
      );
    } finally {
      setStockBusy("");
    }
  }
  return (
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div>
          <h3>Product library</h3>
          <p>Suggested fields are tailored to {category.toLowerCase()}.</p>
        </div>
        <Btn onClick={() => startProduct()}>
          <Plus size={16} /> Add product
        </Btn>
      </div>
      {!products.length ? (
        <div className="sl-empty">
          <Package size={30} />
          <h3>Your product library is empty</h3>
          <p>
            Add a product with an image, price and industry-specific details.
          </p>
          <Btn onClick={() => startProduct()}>
            <Plus size={15} /> Add your first product
          </Btn>
        </div>
      ) : (
        products.map((p) => (
          <article className="sl-product-row" key={p.id}>
            <div className="sl-product-thumb">
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" />
              ) : (
                <Package size={22} />
              )}
            </div>
            <div className="sl-product-name">
              <b>{p.name}</b>
              <small>
                {p.sku || "No SKU"} ·{" "}
                {Object.entries(p.fields || {})
                  .filter(([, v]) => v !== "")
                  .slice(0, 3)
                  .map(([k, v]) => k + ": " + v)
                  .join(" · ")}
              </small>
            </div>
            <strong>{money(p.price, p.currency, p.unit)}</strong>
            <div className="sl-product-stock">
              <span className="sl-muted">Stock quantity</span>
              <div className="sl-product-stock-controls">
                <input
                  className="sl-stock-input"
                  style={{
                    width: 132,
                    minWidth: 0,
                    boxSizing: "border-box",
                    border: "1px solid #dce5da",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#26372d",
                    padding: "11px 13px",
                    font: "inherit",
                    outline: "none",
                    boxShadow: "0 1px 2px rgba(20, 35, 25, 0.04)",
                  }}
                  type="number"
                  min="0"
                  step="0.001"
                  aria-label={"Stock quantity for " + p.name}
                  value={stock[p.id] ?? String(p.stockQuantity ?? 0)}
                  onChange={(e) =>
                    setStock((old) => ({ ...old, [p.id]: e.target.value }))
                  }
                />
                <Btn
                  disabled={stockBusy === p.id}
                  onClick={() => void saveStock(p)}
                >
                  {stockBusy === p.id ? "Saving…" : "Save stock"}
                </Btn>
              </div>
              <small>
                {p.stockEnabled
                  ? "Stock tracking enabled"
                  : "Stock tracking will enable when quantity is saved"}
              </small>
            </div>
            <label
              className="sl-button sl-button-outline"
              style={{ cursor: "pointer" }}
            >
              Upload image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                style={{ display: "none" }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadProductImage(p, file);
                  e.currentTarget.value = "";
                }}
              />
            </label>
            {p.imageUrl && (
              <Btn kind="danger" onClick={() => void removeProductImage(p)}>
                Remove image
              </Btn>
            )}
            <Btn kind="outline" onClick={() => startProduct(p)}>
              Edit
            </Btn>
            <button
              className="sl-icon-action"
              onClick={() => void deleteProduct(p)}
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </article>
        ))
      )}
      <div className="sl-stock-movements">
        <div className="sl-section-head">
          <div>
            <h3>Recent stock movements</h3>
            <p>
              Stock adjustments and order-related changes for your products.
            </p>
          </div>
          <Btn kind="outline" onClick={() => void refreshStock()}>
            Refresh stock
          </Btn>
        </div>
        {!movements.length ? (
          <p className="sl-muted">No stock movements recorded yet.</p>
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
                    <td>{String(m.reason).replaceAll("_", " ")}</td>
                    <td>{m.order?.orderNumber || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

type CatalogueSectionProps = {
  business: Business;
  products: Product[];
  catalogues: Catalogue[];
  setCform: Dispatch<SetStateAction<CatalogueForm>>;
  setEditingCatalogue: (id: string) => void;
  setError: (value: string) => void;
  setModal: (value: string) => void;
  setPreview: (catalogue: Catalogue) => void;
  editCatalogue: (catalogue: Catalogue) => void;
  publish: (catalogue: Catalogue) => Promise<void>;
  share: (catalogue: Catalogue) => Promise<void>;
  shareWhatsApp: (catalogue: Catalogue) => void;
  analytics: Record<string, any>;
  analyticsBusy: string;
  loadAnalytics: (catalogue: Catalogue) => Promise<void>;
};
export function CatalogueSection({
  business,
  products,
  catalogues,
  setCform,
  setEditingCatalogue,
  setError,
  setModal,
  setPreview,
  editCatalogue,
  publish,
  share,
  shareWhatsApp,
  analytics,
  analyticsBusy,
  loadAnalytics,
}: CatalogueSectionProps) {
  const [selectedCatalogueId, setSelectedCatalogueId] = useState("");
  return (
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div>
          <h3>Digital catalogues</h3>
          <p>Create, preview and publish catalogues for your customers.</p>
        </div>
        <Btn
          onClick={() => {
            setEditingCatalogue("");
            setCform({
              title: business.name + " Product Catalogue",
              description: "",
              productIds: products.map((p) => p.id),
            });
            setError("");
            setModal("catalogue");
          }}
        >
          <Plus size={16} /> New catalogue
        </Btn>
      </div>
      {!catalogues.length ? (
        <div className="sl-empty">
          <BookOpen size={30} />
          <h3>Your first catalogue is one step away</h3>
          <p>Choose your products and publish a link for customers.</p>
          <Btn
            onClick={() => {
              setEditingCatalogue("");
              setCform({
                title: business.name + " Product Catalogue",
                description: "",
                productIds: products.map((p) => p.id),
              });
              setModal("catalogue");
            }}
          >
            <Plus size={15} /> Create catalogue
          </Btn>
        </div>
      ) : (
        <div className="sl-catalogue-grid">
          {catalogues.map((c) => (
            <article
              className={
                "sl-catalogue-card" +
                (selectedCatalogueId === c.id ? " is-selected" : "")
              }
              key={c.id}
            >
              <button
                type="button"
                aria-expanded={selectedCatalogueId === c.id}
                onClick={() => {
                  const next = selectedCatalogueId === c.id ? "" : c.id;
                  setSelectedCatalogueId(next);
                  if (next) void loadAnalytics(c);
                }}
                className="sl-catalogue-cover sl-catalogue-open"
                style={{ background: business.brandColor }}
              >
                <span>{business.name.toUpperCase()}</span>
                <BookOpen size={29} />
                <b>{c.title}</b>
                <small>{c.items.length} PRODUCTS · CLICK FOR ANALYTICS</small>
              </button>
              <div className="sl-catalogue-card-body">
                <div className="sl-catalogue-title">
                  <b>{c.title}</b>
                  <span className={c.isPublished ? "sl-published" : "sl-draft"}>
                    {c.isPublished ? "Published" : "Draft"}
                  </span>
                </div>
                <p>{c.description || "A catalogue from " + business.name}</p>
                {selectedCatalogueId === c.id && (
                  <div className="sl-catalogue-analytics-detail">
                    <div className="sl-section-head">
                      <div>
                        <h4>Catalogue analytics</h4>
                        <p>Performance for this catalogue link</p>
                      </div>
                      <Btn
                        kind="outline"
                        disabled={analyticsBusy === c.id}
                        onClick={() => void loadAnalytics(c)}
                      >
                        {analyticsBusy === c.id ? "Loading…" : "Refresh"}
                      </Btn>
                    </div>
                    {analytics[c.id] ? (
                      <div className="sl-analytics-metrics">
                        <span>
                          <small>Catalogue opens</small>
                          <b>{analytics[c.id].views ?? 0}</b>
                        </span>
                        <span>
                          <small>Unique visitors</small>
                          <b>{analytics[c.id].uniqueVisitors ?? 0}</b>
                        </span>
                        <span>
                          <small>Product details opened</small>
                          <b>{analytics[c.id].productOpens ?? 0}</b>
                        </span>
                        <span>
                          <small>Add to cart</small>
                          <b>{analytics[c.id].addToCart ?? 0}</b>
                        </span>
                        <span>
                          <small>Checkout starts</small>
                          <b>{analytics[c.id].checkoutStarted ?? 0}</b>
                        </span>
                        <span>
                          <small>Payment gateway opened</small>
                          <b>{analytics[c.id].paymentGatewayOpened ?? 0}</b>
                        </span>
                        <span>
                          <small>Orders recorded</small>
                          <b>{analytics[c.id].orders ?? 0}</b>
                        </span>
                        <span>
                          <small>Payments confirmed</small>
                          <b>{analytics[c.id].paymentsConfirmed ?? 0}</b>
                        </span>
                      </div>
                    ) : analyticsBusy === c.id ? (
                      <p>Loading catalogue metrics…</p>
                    ) : (
                      <p>
                        Analytics could not be loaded yet. Use Refresh to try
                        again.
                      </p>
                    )}
                  </div>
                )}
                <div className="sl-catalogue-actions">
                  <Btn kind="outline" onClick={() => setPreview(c)}>
                    <ExternalLink size={14} /> Preview
                  </Btn>
                  <Btn kind="outline" onClick={() => editCatalogue(c)}>
                    Edit
                  </Btn>
                  <Btn onClick={() => void publish(c)}>
                    {c.isPublished ? "Unpublish" : "Publish"}
                  </Btn>
                  {c.isPublished && (
                    <>
                      <Btn kind="quiet" onClick={() => void share(c)}>
                        <Copy size={14} /> Copy link
                      </Btn>
                      <Btn kind="quiet" onClick={() => shareWhatsApp(c)}>
                        <MessageCircle size={14} /> WhatsApp
                      </Btn>
                    </>
                  )}
                </div>
                {c.isPublished && (
                  <a
                    className="sl-public-link"
                    href={"/c/" + c.slug}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {location.origin}/c/{c.slug} <Copy size={12} />
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
