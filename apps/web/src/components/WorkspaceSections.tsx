import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CreditCard,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  LogOut,
  MessageCircle,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import { Brand, Button as Btn, ErrorMessage as Err } from "./ui";
import { SiteHeader } from "./SiteHeader";
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
export type CatalogueForm = {
  title: string;
  description: string;
  shareImageUrl: string;
  shareImageFile: File | null;
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
  const [authHeaderLanguage, setAuthHeaderLanguage] = useState<"en" | "ta">("en");
  const isSignup = mode === "signup";
  const isForgot = mode === "forgot";
  const isReset = mode === "reset";
  const heading = isSignup
    ? "One catalogue. A world of possibilities."
    : isForgot
      ? "Let’s get you back in."
      : isReset
        ? "A fresh start."
        : "Welcome back to Sellora.";
  const description = isSignup
    ? "Bring your products together in one beautiful, shareable catalogue."
    : isForgot
      ? "Enter your email and we’ll send you a secure password reset link."
      : isReset
        ? "Choose a strong new password for your account."
        : "Your products, catalogues and next big sale are waiting.";

  return (
    <div className="sl-auth-new">
      <SiteHeader
        language={authHeaderLanguage}
        onToggleLanguage={() =>
          setAuthHeaderLanguage(authHeaderLanguage === "en" ? "ta" : "en")
        }
        showLanguageToggle
      />
      <main className="sl-auth-new__layout">
        <section className="sl-auth-new__story" aria-label="About Sellora">
          <div className="sl-auth-new__orb sl-auth-new__orb--one" />
          <div className="sl-auth-new__orb sl-auth-new__orb--two" />
          <div className="sl-auth-new__story-inner">
            <span className="sl-auth-new__eyebrow">
              <span className="sl-auth-new__eyebrow-dot" />
              YOUR PRODUCTS. YOUR BRAND.
            </span>
            <h1>
              One catalogue.
              <br />
              <em>More possibilities.</em>
            </h1>
            <p className="sl-auth-new__intro">
              A polished, shareable product catalogue for your business. No design
              tools or technical skills required.
            </p>
            <div className="sl-auth-new__benefits">
              <div><span><Check size={15} /></span><p><strong>Set up in minutes</strong><small>Get your catalogue ready without the hassle.</small></p></div>
              <div><span><Check size={15} /></span><p><strong>Made for your industry</strong><small>Showcase products the way you want.</small></p></div>
              <div><span><Check size={15} /></span><p><strong>One simple link</strong><small>Share your catalogue anywhere.</small></p></div>
            </div>
            <div className="sl-auth-new__signature">
              <span className="sl-auth-new__signature-mark">S</span>
              <span>SELLORA <i /> DIGITAL CATALOGUES. SMARTER SALES.</span>
            </div>
          </div>
        </section>
        <section className="sl-auth-new__form-panel">
          <div className="sl-auth-new__glow" />
          <div className="sl-auth-new__card">
            <div className="sl-auth-new__mobile-brand"><Brand /></div>
            <span className="sl-auth-new__form-kicker">
              {isSignup ? "YOUR CATALOGUE JOURNEY STARTS HERE" : isForgot ? "ACCOUNT RECOVERY" : isReset ? "SECURE YOUR ACCOUNT" : "GOOD TO SEE YOU AGAIN"}
            </span>
            <h2>{isSignup ? <>Create your<br /><span>Sellora account.</span></> : heading}</h2>
            <p className="sl-auth-new__form-description">{description}</p>
            <Err text={error} />
            {notice && <p className="sl-auth-new__notice" role="status">{notice}</p>}
            <form className="sl-auth-new__form" onSubmit={auth}>
              {mode !== "reset" && (
                <label>
                  <span>Email address</span>
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
                  <span>{isReset ? "New password" : "Password"}</span>
                  <div className="sl-auth-new__password">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={isSignup || isReset ? 8 : 1}
                      autoComplete={isSignup || isReset ? "new-password" : "current-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isSignup || isReset ? "At least 8 characters" : "Enter your password"}
                    />
                    <button
                      type="button"
                      className="sl-auth-new__eye"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      aria-pressed={showPassword}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </label>
              )}
              {mode === "login" && (
                <div className="sl-auth-new__forgot">
                  <button type="button" onClick={() => { setMode("forgot"); setError(""); }}>Forgot password?</button>
                </div>
              )}
              <button className="sl-auth-new__submit" type="submit" disabled={busy}>
                <span>{busy ? "Please wait…" : isSignup ? "Create account" : isForgot ? "Send reset link" : isReset ? "Reset password" : "Log in"}</span>
                {!busy && <ArrowRight size={17} />}
              </button>
            </form>
            <div className="sl-auth-new__switch">
              <span>{isForgot || isReset ? "Remember your password?" : isSignup ? "Already have an account?" : "New to Sellora?"}</span>
              <button type="button" onClick={() => { setMode(isSignup || isForgot || isReset ? "login" : "signup"); setError(""); }}>
                {isSignup ? "Log in" : isForgot || isReset ? "Back to log in" : "Create account"}
              </button>
            </div>
            <div className="sl-auth-new__privacy"><span className="sl-auth-new__privacy-dot">✓</span>Your workspace is private to your account.</div>
          </div>
        </section>
      </main>
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
                    industry:
                      v === "other"
                        ? ""
                        : cats.find((c) => c[0] === v)?.[2] || "General",
                  });
                }}
              >
                {cats.map((c) => (
                  <option key={c[0]} value={c[0]}>
                    {c[1]}
                  </option>
                ))}
              </select>
              {bform.productCategory === "other" && (
                <input
                  required
                  maxLength={100}
                  value={bform.industry}
                  onChange={(e) =>
                    setBform({ ...bform, industry: e.target.value })
                  }
                  placeholder="Enter your product category"
                  aria-label="Specify what you sell"
                />
              )}
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
              </select>
            </label>
          </div>
          <div className="sl-form-row">
            <label>
              Phone number *
              <input
                type="tel"
                required
                minLength={7}
                maxLength={30}
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
  access: string;
  onImported: () => Promise<void>;
  startProduct: (product?: Product) => void;
  deleteProduct: (product: Product) => Promise<void>;
  uploadProductImage: (product: Product, file: File) => Promise<void>;
  removeProductImage: (product: Product) => Promise<void>;
};
export function ProductSection({
  category,
  products,
  access,
  onImported,
  startProduct,
  deleteProduct,
  uploadProductImage,
  removeProductImage,
}: ProductSectionProps) {
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importRows, setImportRows] = useState<Record<string, unknown>[]>([]);
  const [importMode, setImportMode] = useState<"CREATE_ONLY" | "UPSERT">(
    "CREATE_ONLY",
  );
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [productFilter, setProductFilter] = useState<
    "ALL" | "WITH_IMAGE" | "WITHOUT_IMAGE"
  >("ALL");
  const [pageSize, setPageSize] = useState<25 | 50>(25);
  const [currentPage, setCurrentPage] = useState(1);
  const filteredProducts = products.filter((product) => {
    const term = productSearch.trim().toLowerCase();
    const searchable = [
      product.name,
      product.sku,
      ...Object.entries(product.fields || {}).flatMap(([key, value]) => [
        key,
        String(value ?? ""),
      ]),
    ]
      .join(" ")
      .toLowerCase();
    const matchesSearch = !term || searchable.includes(term);
    const matchesFilter =
      productFilter === "ALL" ||
      (productFilter === "WITH_IMAGE"
        ? Boolean(product.imageUrl)
        : !product.imageUrl);
    return matchesSearch && matchesFilter;
  });
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function parseCsv(text: string): Record<string, unknown>[] {
    text = text.replace(/^\uFEFF/, "");
    const matrix: string[][] = [];
    let row: string[] = [];
    let cell = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      if (quoted && char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') quoted = !quoted;
      else if (char === "," && !quoted) {
        row.push(cell);
        cell = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && text[i + 1] === "\n") i += 1;
        row.push(cell);
        if (row.some((value) => value.trim())) matrix.push(row);
        row = [];
        cell = "";
      } else cell += char;
    }
    row.push(cell);
    if (row.some((value) => value.trim())) matrix.push(row);
    if (matrix.length < 2)
      throw new Error(
        "CSV must contain a header and at least one product row.",
      );
    const headers = matrix[0].map((value, index) => {
      const key = value.trim();
      if (!key) throw new Error("Every CSV column needs a header.");
      if (matrix[0].indexOf(value) !== index)
        throw new Error("CSV column headers must be unique.");
      return key;
    });
    if (!headers.some((header) => header.toLowerCase() === "name"))
      throw new Error('CSV needs a "name" column.');
    return matrix
      .slice(1)
      .map((values) =>
        Object.fromEntries(
          headers.map((header, index) => [header, values[index] ?? ""]),
        ),
      );
  }

  function exportProductsCsv() {
    if (!products.length) return;
    const standardHeaders = [
      "id",
      "name",
      "sku",
      "description",
      "price",
      "currency",
      "unit",
      "imageUrl",
      "stockEnabled",
      "stockQuantity",
    ];
    const customHeaders = Array.from(
      new Set(products.flatMap((product) => Object.keys(product.fields || {}))),
    ).filter((key) => !standardHeaders.includes(key));
    const headers = [...standardHeaders, ...customHeaders];
    const quote = (value: unknown) => {
      const text =
        value == null
          ? ""
          : Array.isArray(value)
            ? value.join("; ")
            : String(value);
      return /[",\r\n]/.test(text)
        ? '"' + text.replace(/"/g, '""') + '"'
        : text;
    };
    const rows = products.map((product) => {
      const values: Record<string, unknown> = {
        id: product.id,
        name: product.name,
        sku: product.sku,
        description: product.description,
        price: product.price,
        currency: product.currency,
        unit: product.unit,
        imageUrl: product.imageUrl,
        stockEnabled: product.stockEnabled,
        stockQuantity: product.stockQuantity,
        ...(product.fields || {}),
      };
      return headers.map((header) => quote(values[header])).join(",");
    });
    const csv =
      "\uFEFF" + [headers.map(quote).join(","), ...rows].join("\r\n") + "\r\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sellora-products-export.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function downloadImportTemplate() {
    setImportBusy(true);
    setImportError("");
    setImportNotice("");
    try {
      const response = await fetch(
        (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(
          /\/$/,
          "",
        ) + "/workspace/products/bulk-import/template",
        { headers: { Authorization: "Bearer " + access } },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || "Could not build your import template.",
        );
      const quote = (value: unknown) => {
        const text = value == null ? "" : String(value);
        return /[",\r\n]/.test(text)
          ? '"' + text.replace(/"/g, '""') + '"'
          : text;
      };
      const csv =
        [
          result.headers.map(quote).join(","),
          result.headers
            .map((header: string) => quote(result.sampleRow[header] ?? ""))
            .join(","),
        ].join("\r\n") + "\r\n";
      const blob = new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "sellora-product-import-template.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setImportNotice(
        "Downloaded a template with " +
          result.headers.length +
          " columns, including " +
          result.fields.length +
          " fields configured for your business. Replace the sample row before importing.",
      );
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : "Could not download the template.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  async function previewImport() {
    if (!importRows.length) {
      setImportError("Choose a CSV file first.");
      return;
    }
    setImportBusy(true);
    setImportError("");
    setImportNotice("");
    setImportPreview(null);
    try {
      const response = await fetch(
        (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(
          /\/$/,
          "",
        ) + "/workspace/products/bulk-import",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + access,
          },
          body: JSON.stringify({
            mode: importMode,
            commit: false,
            rows: importRows,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok && response.status !== 422)
        throw new Error(result.error || "Could not validate the import.");
      setImportPreview(result);
      if (result.invalidRows === 0)
        setImportNotice(
          "Preview passed. Review the row count, then confirm import.",
        );
    } catch (error) {
      setImportError(
        error instanceof Error ? error.message : "Could not preview import.",
      );
    } finally {
      setImportBusy(false);
    }
  }

  async function commitImport() {
    if (!importPreview || importPreview.invalidRows !== 0) return;
    if (
      !window.confirm(
        "Import " + importRows.length + " products into this business?",
      )
    )
      return;
    setImportBusy(true);
    setImportError("");
    setImportNotice("");
    try {
      const response = await fetch(
        (import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(
          /\/$/,
          "",
        ) + "/workspace/products/bulk-import",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + access,
          },
          body: JSON.stringify({
            mode: importMode,
            commit: true,
            rows: importRows,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Import failed.");
      setImportNotice(
        "Imported " +
          result.created +
          " new products" +
          (result.updated ? " and updated " + result.updated : "") +
          ".",
      );
      setImportFile(null);
      setImportRows([]);
      setImportPreview(null);
      await onImported();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
  }

  return (
    <section className="sl-section-card">
      <div className="sl-section-head">
        <div>
          <h3>Product library</h3>
          <p>Suggested fields are tailored to {category.toLowerCase()}.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn
            kind="outline"
            disabled={!products.length}
            onClick={exportProductsCsv}
          >
            <Download size={15} /> Export CSV
          </Btn>
          <Btn
            kind="outline"
            disabled={importBusy}
            onClick={() => void downloadImportTemplate()}
          >
            <Download size={15} /> Sample CSV
          </Btn>
          <Btn onClick={() => startProduct()}>
            <Plus size={16} /> Add product
          </Btn>
        </div>
      </div>
      <div
        className="sl-import-panel"
        style={{
          marginTop: 20,
          padding: 22,
          border: "1px solid #e2e9e1",
          borderRadius: 16,
          background: "#fbfcfa",
          color: "#293a30",
          display: "grid",
          gap: 18,
        }}
      >
        <div>
          <b
            style={{
              display: "block",
              fontSize: 18,
              fontWeight: 750,
              marginBottom: 8,
            }}
          >
            Bulk import products
          </b>
          <p
            style={{
              color: "#778276",
              lineHeight: 1.6,
              margin: 0,
              fontSize: 14,
            }}
          >
            Download a sample CSV generated from your business settings. It
            includes all standard product fields plus every custom field
            configured for your account. Edit the sample row, then validate it
            before importing.
          </p>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 14,
            alignItems: "end",
          }}
        >
          <div style={{ display: "grid", gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 650, color: "#405a47" }}>
              CSV file
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <input
                id="sl-product-csv"
                type="file"
                accept=".csv,text/csv"
                style={{
                  position: "absolute",
                  width: 1,
                  height: 1,
                  opacity: 0,
                  overflow: "hidden",
                }}
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0] || null;
                  event.currentTarget.value = "";
                  setImportFile(file);
                  setImportRows([]);
                  setImportPreview(null);
                  setImportError("");
                  setImportNotice("");
                  if (!file) return;
                  if (file.size > 2 * 1024 * 1024) {
                    setImportError("CSV must be 2 MB or smaller.");
                    setImportFile(null);
                    return;
                  }
                  void file.text().then((text) => {
                    try {
                      setImportRows(parseCsv(text));
                    } catch (error) {
                      setImportError(
                        error instanceof Error
                          ? error.message
                          : "Invalid CSV file.",
                      );
                    }
                  });
                }}
              />
              <label
                htmlFor="sl-product-csv"
                className="sl-button sl-button-outline"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  minHeight: 42,
                  padding: "0 16px",
                  borderRadius: 10,
                  fontWeight: 650,
                }}
              >
                Choose CSV file
              </label>
              <span style={{ color: "#778276", fontSize: 13 }}>
                {importFile ? importFile.name : "CSV only · Up to 2 MB"}
              </span>
            </div>
          </div>
          <label
            style={{
              display: "grid",
              gap: 8,
              fontSize: 13,
              fontWeight: 650,
              color: "#405a47",
            }}
          >
            Import mode
            <select
              value={importMode}
              onChange={(event) => {
                setImportMode(event.target.value as "CREATE_ONLY" | "UPSERT");
                setImportPreview(null);
              }}
              style={{
                width: "100%",
                minHeight: 44,
                padding: "0 12px",
                border: "1px solid #dce5da",
                borderRadius: 10,
                background: "#fff",
                color: "#293a30",
                fontSize: 14,
                outlineColor: "#599c56",
              }}
            >
              <option value="CREATE_ONLY">Create only (safe default)</option>
              <option value="UPSERT">Update matching SKU</option>
            </select>
          </label>
        </div>
        {importFile && (
          <div
            style={{
              padding: "11px 14px",
              borderRadius: 10,
              background: "#f0f6ef",
              border: "1px solid #dcebd9",
              color: "#405a47",
              fontSize: 13,
            }}
          >
            <b>{importRows.length}</b> product rows ready to validate
          </div>
        )}
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <Btn
            kind="outline"
            disabled={importBusy || !importRows.length}
            onClick={() => void previewImport()}
          >
            {importBusy ? "Checking…" : "Validate & preview"}
          </Btn>
          {importPreview && importPreview.invalidRows === 0 && (
            <Btn disabled={importBusy} onClick={() => void commitImport()}>
              {importBusy ? "Importing…" : "Confirm import"}
            </Btn>
          )}
        </div>
        {importError && (
          <p
            role="alert"
            style={{
              color: "#b42318",
              margin: 0,
              padding: "10px 12px",
              background: "#fff5f4",
              borderRadius: 8,
            }}
          >
            {importError}
          </p>
        )}
        {importNotice && (
          <p role="status" className="sl-notice">
            {importNotice}
          </p>
        )}
        {importPreview && (
          <div
            role="status"
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px solid #e2e9e1",
              background: "#fff",
            }}
          >
            <b
              style={{
                color: importPreview.invalidRows ? "#b42318" : "#357744",
              }}
            >
              {importPreview.validRows} valid · {importPreview.invalidRows}{" "}
              invalid
            </b>
            {importPreview.rows
              ?.filter((row: any) => !row.valid)
              .slice(0, 20)
              .map((row: any) => (
                <p
                  key={row.rowNumber}
                  style={{ margin: "8px 0 0", color: "#b42318", fontSize: 13 }}
                >
                  Row {row.rowNumber}: {row.errors.join(" ")}
                </p>
              ))}
          </div>
        )}
      </div>
      {products.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px, 1fr) auto auto",
            gap: 12,
            alignItems: "center",
            marginTop: 22,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              minHeight: 44,
              padding: "0 12px",
              border: "1px solid #dce5da",
              borderRadius: 10,
              background: "#fff",
            }}
          >
            <Search size={17} color="#778276" />
            <input
              aria-label="Search products"
              value={productSearch}
              onChange={(event) => {
                setProductSearch(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search product name, SKU or details"
              style={{
                width: "100%",
                border: 0,
                outline: 0,
                background: "transparent",
                minWidth: 0,
              }}
            />
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#405a47",
              fontSize: 13,
              fontWeight: 650,
            }}
          >
            <SlidersHorizontal size={16} /> Filter
            <select
              aria-label="Filter products"
              value={productFilter}
              onChange={(event) => {
                setProductFilter(event.target.value as typeof productFilter);
                setCurrentPage(1);
              }}
              style={{
                minHeight: 44,
                padding: "0 10px",
                border: "1px solid #dce5da",
                borderRadius: 10,
                background: "#fff",
                color: "#293a30",
              }}
            >
              <option value="ALL">All products</option>
              <option value="WITH_IMAGE">With image</option>
              <option value="WITHOUT_IMAGE">Without image</option>
            </select>
          </label>
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "#405a47",
              fontSize: 13,
              whiteSpace: "nowrap",
            }}
          >
            Show
            <select
              aria-label="Products per page"
              value={pageSize}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as 25 | 50);
                setCurrentPage(1);
              }}
              style={{
                minHeight: 44,
                padding: "0 10px",
                border: "1px solid #dce5da",
                borderRadius: 10,
                background: "#fff",
                color: "#293a30",
              }}
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            per page
          </label>
        </div>
      )}
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
      ) : filteredProducts.length === 0 ? (
        <div className="sl-empty" style={{ padding: 28 }}>
          <Search size={26} />
          <h3>No products match your search</h3>
          <p>Try a different search term or change the filter.</p>
          <Btn
            kind="outline"
            onClick={() => {
              setProductSearch("");
              setProductFilter("ALL");
              setCurrentPage(1);
            }}
          >
            Clear search and filters
          </Btn>
        </div>
      ) : (
        <>
          {visibleProducts.map((p) => (
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
          ))}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
              marginTop: 18,
              paddingTop: 14,
              borderTop: "1px solid #e2e9e1",
            }}
          >
            <span style={{ color: "#778276", fontSize: 13 }}>
              Showing{" "}
              {filteredProducts.length ? (currentPage - 1) * pageSize + 1 : 0}–
              {Math.min(currentPage * pageSize, filteredProducts.length)} of{" "}
              {filteredProducts.length} products
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Btn
                kind="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft size={15} /> Previous
              </Btn>
              <span
                style={{
                  color: "#405a47",
                  fontSize: 13,
                  minWidth: 72,
                  textAlign: "center",
                }}
              >
                Page {currentPage} of {totalPages}
              </span>
              <Btn
                kind="outline"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setCurrentPage((page) => Math.min(totalPages, page + 1))
                }
              >
                Next <ChevronRight size={15} />
              </Btn>
            </div>
          </div>
        </>
      )}
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
              shareImageUrl: "",
              shareImageFile: null,
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
                shareImageUrl: "",
                shareImageFile: null,
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
