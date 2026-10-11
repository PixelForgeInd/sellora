import { useEffect, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { BookOpen, Check, CreditCard, Plus, Trash2 } from "lucide-react";
import { Button as Btn } from "./ui";
import { categories as cats } from "../sellora/catalogue-fields";
import type { Business, Field } from "../sellora/types";
import { api } from "../sellora/api-client";

type ProfileForm = {
  name: string;
  industry: string;
  productCategory: string;
  businessModel: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  logoUrl: string;
  brandColor: string;
};
type FieldForm = {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string;
};

type SettingsSectionProps = {
  business: Business;
  profileForm: ProfileForm;
  setProfileForm: Dispatch<SetStateAction<ProfileForm>>;
  saveBusinessProfile: (event: FormEvent) => Promise<void>;
  sellingMode: "CATALOG_ONLY" | "ONLINE_PAYMENTS";
  setSellingMode: (value: "CATALOG_ONLY" | "ONLINE_PAYMENTS") => void;
  saveSellingMode: (event: FormEvent) => Promise<void>;
  saveRazorpay: (
    event: FormEvent,
    keyId: string,
    keySecret: string,
  ) => Promise<void>;
  disconnectRazorpay: () => Promise<void>;
  fields: Field[];
  fieldForm: FieldForm;
  setFieldForm: Dispatch<SetStateAction<FieldForm>>;
  addIndustryField: (event: FormEvent) => Promise<void>;
  removeIndustryField: (field: Field) => Promise<void>;
  restoreIndustryFields: () => Promise<void>;
  busy: boolean;
  isPlatformOwner?: boolean;
};

export function SettingsSection({
  business,
  profileForm,
  setProfileForm,
  saveBusinessProfile,
  sellingMode,
  setSellingMode,
  saveSellingMode,
  saveRazorpay,
  disconnectRazorpay,
  fields,
  fieldForm,
  setFieldForm,
  addIndustryField,
  removeIndustryField,
  restoreIndustryFields,
  busy,
  isPlatformOwner = false,
}: SettingsSectionProps) {
  const [gatewayKeyId, setGatewayKeyId] = useState("");
  const [gatewayKeySecret, setGatewayKeySecret] = useState("");
  const [gatewayWebhookSecret, setGatewayWebhookSecret] = useState("");
  const [gatewayTestMode, setGatewayTestMode] = useState(true);
  const [gatewayStatus, setGatewayStatus] = useState(
    business.paymentGatewayStatus || "NOT_CONNECTED",
  );
  const [gatewaySecretSaved, setGatewaySecretSaved] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [gatewayBusy, setGatewayBusy] = useState(false);
  const [gatewayMessage, setGatewayMessage] = useState("");
  const [platformPaymentSettings, setPlatformPaymentSettings] = useState<any>(null);
  const [platformSettingsError, setPlatformSettingsError] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(false);
  const [taxRate, setTaxRate] = useState("0");
  const [taxBusy, setTaxBusy] = useState(false);
  const [taxMessage, setTaxMessage] = useState("");
  useEffect(() => {
    api("/workspace/business/tax-settings").then((v) => { setTaxEnabled(Boolean(v.enabled)); setTaxRate(String(v.rate ?? "0")); }).catch((err) => setTaxMessage(err instanceof Error ? err.message : "Could not load tax settings."));
  }, []);
  async function saveTaxSettings(e: FormEvent) {
    e.preventDefault(); setTaxBusy(true); setTaxMessage("");
    try { const v = await api("/workspace/business/tax-settings", { method: "PUT", body: JSON.stringify({ enabled: taxEnabled, rate: Number(taxRate) }) }); setTaxEnabled(Boolean(v.enabled)); setTaxRate(String(v.rate)); setTaxMessage(v.enabled ? "Tax settings saved. Tax will be calculated on new orders." : "Tax disabled. New orders will have no tax."); }
    catch (err) { setTaxMessage(err instanceof Error ? err.message : "Could not save tax settings."); }
    finally { setTaxBusy(false); }
  }
  useEffect(() => {
    if (!isPlatformOwner) return;
    api("/platform/admin/payment-settings")
      .then(setPlatformPaymentSettings)
      .catch((err) => setPlatformSettingsError(err instanceof Error ? err.message : "Could not load platform payment settings."));
  }, [isPlatformOwner]);
  async function saveGateway(e: FormEvent) {
    e.preventDefault();
    setGatewayBusy(true);
    setGatewayMessage("");
    try {
      const v = await api("/workspace/business/payment-gateway", {
        method: "PUT",
        body: JSON.stringify({
          keyId: gatewayKeyId,
          keySecret: gatewayKeySecret,
          webhookSecret: gatewayWebhookSecret,
          testMode: gatewayTestMode,
        }),
      });
      setGatewayStatus(v.status);
      setGatewaySecretSaved(Boolean(v.keySecretConfigured));
      setWebhookSaved(Boolean(v.webhookSecretConfigured));
      setGatewayKeySecret("");
      setGatewayWebhookSecret("");
      setSellingMode("ONLINE_PAYMENTS");
      setGatewayMessage("Razorpay credentials verified and saved.");
    } catch (err) {
      setGatewayMessage(
        err instanceof Error ? err.message : "Could not connect Razorpay.",
      );
    } finally {
      setGatewayBusy(false);
    }
  }
  async function disconnectGateway() {
    if (!window.confirm("Disconnect Razorpay and disable online payments?"))
      return;
    setGatewayBusy(true);
    try {
      await api("/workspace/business/payment-gateway", { method: "DELETE" });
      setGatewayStatus("NOT_CONNECTED");
      setSellingMode("CATALOG_ONLY");
      setGatewayKeyId("");
      setGatewaySecretSaved(false);
      setWebhookSaved(false);
      setGatewayMessage("Razorpay disconnected.");
    } catch (err) {
      setGatewayMessage(
        err instanceof Error ? err.message : "Could not disconnect Razorpay.",
      );
    } finally {
      setGatewayBusy(false);
    }
  }
  return (
    <div className="sl-settings-stack">
      <section className="sl-section-card sl-settings-page">
        <span className="sl-kicker">BUSINESS PROFILE</span>
        <h3>Business details</h3>
        <p>
          Update the information collected during onboarding. These details help
          customers recognize and contact your business.
        </p>
        <form className="sl-form" onSubmit={saveBusinessProfile}>
          <label>
            Business name
            <input
              required
              minLength={2}
              maxLength={120}
              value={profileForm.name}
              onChange={(e) =>
                setProfileForm({ ...profileForm, name: e.target.value })
              }
            />
          </label>
          <div className="sl-form-row">
            <label>
              Industry
              <input
                required
                minLength={2}
                maxLength={100}
                value={profileForm.industry}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    industry: e.target.value,
                  })
                }
              />
            </label>
            <label>
              What do you sell?
              <select
                value={profileForm.productCategory}
                onChange={(e) => {
                  const v = e.target.value;
                  setProfileForm({
                    ...profileForm,
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
          </div>
          <div className="sl-form-row">
            <label>
              Business email
              <input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} placeholder="sales@company.com" />
            </label>
            <label>
              Business model
              <select
                value={profileForm.businessModel}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    businessModel: e.target.value,
                  })
                }
              >
                <option>B2B</option>
                <option>B2C</option>
                <option>B2B2C</option>
              </select>
            </label>
            <label>
              Phone
              <input
                value={profileForm.phone}
                maxLength={30}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    phone: e.target.value,
                  })
                }
                placeholder="+91…"
              />
            </label>
          </div>
          <label>
            Business address
            <textarea rows={3} maxLength={1000} value={profileForm.address} onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })} placeholder="Street, city, state, PIN code" />
          </label>
          <label>
            Logo URL
            <input type="url" value={profileForm.logoUrl} onChange={(e) => setProfileForm({ ...profileForm, logoUrl: e.target.value })} placeholder="https://example.com/logo.png" />
          </label>
          <label>
            Website
            <input
              type="url"
              value={profileForm.website}
              onChange={(e) =>
                setProfileForm({
                  ...profileForm,
                  website: e.target.value,
                })
              }
              placeholder="https://example.com"
            />
          </label>
          <label>
            Brand colour
            <div className="sl-color-field">
              <input
                type="color"
                value={profileForm.brandColor}
                onChange={(e) =>
                  setProfileForm({
                    ...profileForm,
                    brandColor: e.target.value,
                  })
                }
              />
              <span>{profileForm.brandColor.toUpperCase()}</span>
            </div>
          </label>
          <div className="sl-modal-actions">
            <Btn type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save business details"} <Check size={15} />
            </Btn>
          </div>
        </form>
      </section>
      <section className="sl-section-card sl-settings-page">
        <span className="sl-kicker">PRODUCT FIELD BUILDER</span>
        <h3>
          Fields for{" "}
          {business.productCategory === "yarn-textiles"
            ? "Yarn & Textiles"
            : cats.find((c) => c[0] === business.productCategory)?.[1] ||
              business.industry}
        </h3>
        <p>
          Control the information collected for each product. Fields appear
          automatically in the product form and are validated before saving.
        </p>
        <div className="sl-industry-fields">
          {fields.map((f) => (
            <div className="sl-industry-field" key={f.id || f.key}>
              <span>
                <b>{f.label}</b>
                <small>
                  {f.key} · {f.type}
                  {f.required ? " · Required" : " · Optional"}
                  {Array.isArray(f.options) && f.options.length
                    ? " · " + f.options.length + " options"
                    : ""}
                </small>
              </span>
              {f.id && (
                <button
                  type="button"
                  className="sl-field-remove"
                  onClick={() => void removeIndustryField(f)}
                  aria-label={"Remove " + f.label}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
        </div>
        <form className="sl-form sl-add-field-form" onSubmit={addIndustryField}>
          <div className="sl-form-row">
            <label>
              Field label
              <input
                required
                minLength={2}
                maxLength={80}
                value={fieldForm.label}
                onChange={(e) =>
                  setFieldForm({
                    ...fieldForm,
                    label: e.target.value,
                    key:
                      fieldForm.key ||
                      e.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "_")
                        .replace(/^_+|_+$/g, ""),
                  })
                }
                placeholder="e.g. Fabric composition"
              />
            </label>
            <label>
              Field key
              <input
                required
                pattern="[a-z][a-zA-Z0-9_]*"
                maxLength={48}
                value={fieldForm.key}
                onChange={(e) =>
                  setFieldForm({ ...fieldForm, key: e.target.value })
                }
                placeholder="fabricComposition"
              />
            </label>
          </div>
          <div className="sl-form-row">
            <label>
              Field type
              <select
                value={fieldForm.type}
                onChange={(e) =>
                  setFieldForm({ ...fieldForm, type: e.target.value })
                }
              >
                <option value="text">Short text</option>
                <option value="number">Number</option>
                <option value="textarea">Long text</option>
                <option value="select">Single choice</option>
                <option value="multiselect">Multiple choice</option>
                <option value="boolean">Yes / no</option>
              </select>
            </label>
            <label className="sl-field-required-toggle">
              <input
                type="checkbox"
                checked={fieldForm.required}
                onChange={(e) =>
                  setFieldForm({
                    ...fieldForm,
                    required: e.target.checked,
                  })
                }
              />{" "}
              Required field
            </label>
          </div>
          {["select", "multiselect"].includes(fieldForm.type) && (
            <label>
              Options (one per line)
              <textarea
                required
                rows={4}
                value={fieldForm.options}
                onChange={(e) =>
                  setFieldForm({ ...fieldForm, options: e.target.value })
                }
                placeholder={"Cotton\nPolyester\nBlend"}
              />
            </label>
          )}
          <div className="sl-modal-actions">
            <Btn type="submit" disabled={busy}>
              {busy ? "Adding…" : "Add product field"} <Plus size={15} />
            </Btn>
            <Btn
              kind="outline"
              onClick={() => void restoreIndustryFields()}
              disabled={busy}
            >
              Restore recommended fields
            </Btn>
          </div>
        </form>
      </section>

      <section className="sl-section-card sl-settings-page">
        <span className="sl-kicker">PAYMENT INTEGRATION</span>
        <h3>Connect Razorpay</h3>
        <p>
          Accept payments directly into your own Razorpay account. Enter your
          Key ID and Key Secret from Razorpay Dashboard. Sellora protects your
          credentials automatically.
        </p>
        <form className="sl-form" onSubmit={saveGateway}>
          <label>
            Razorpay Key ID
            <input
              required
              value={gatewayKeyId}
              onChange={(e) => setGatewayKeyId(e.target.value)}
              placeholder="rzp_test_…"
              autoComplete="off"
            />
          </label>
          <label>
            Razorpay Key Secret
            <input
              type="password"
              value={gatewayKeySecret}
              onChange={(e) => setGatewayKeySecret(e.target.value)}
              placeholder={
                gatewaySecretSaved
                  ? "Saved securely — leave blank to keep"
                  : "Enter Key Secret"
              }
              autoComplete="new-password"
            />
          </label>

          <label className="sl-field-required-toggle">
            <input
              type="checkbox"
              checked={gatewayTestMode}
              onChange={(e) => setGatewayTestMode(e.target.checked)}
            />{" "}
            Test mode (recommended)
          </label>
          <div className="sl-gateway-status">
            <div>
              <b>Connection status</b>
              <small>
                {gatewayStatus === "ACTIVE"
                  ? "Credentials verified"
                  : "Not connected"}
                {gatewaySecretSaved ? " · Key Secret stored" : ""}
                {webhookSaved ? " · Webhook configured" : ""}
              </small>
            </div>
            <span
              className={
                gatewayStatus === "ACTIVE" ? "sl-published" : "sl-draft"
              }
            >
              {gatewayStatus === "ACTIVE" ? "Connected" : "Not active"}
            </span>
          </div>
          {gatewayMessage && (
            <p role="status" className="sl-gateway-note">
              {gatewayMessage}
            </p>
          )}
          <div className="sl-modal-actions">
            <Btn type="submit" disabled={gatewayBusy}>
              {gatewayBusy ? "Verifying…" : "Verify and save Razorpay"}{" "}
              <CreditCard size={15} />
            </Btn>
            {gatewayStatus === "ACTIVE" && (
              <Btn
                type="button"
                kind="outline"
                disabled={gatewayBusy}
                onClick={() => void disconnectGateway()}
              >
                Disconnect
              </Btn>
            )}
          </div>
        </form>
        {isPlatformOwner && (
          <section className="sl-section-card sl-settings-page">
            <span className="sl-kicker">PIXELFORGE PLATFORM ADMIN</span>
            <h3>Payment infrastructure</h3>
            <p>Owner-only operational settings for managing Sellora's payment integration. Encryption secrets are never displayed here.</p>
            {platformSettingsError && <p role="alert" className="sl-gateway-note">{platformSettingsError}</p>}
            {platformPaymentSettings && (
              <>
                <label>
                  Razorpay webhook endpoint
                  <input readOnly value={platformPaymentSettings.webhookUrl || "Set PUBLIC_API_URL on the API server to display the public webhook URL"} />
                </label>
                {platformPaymentSettings.webhookUrl && (
                  <div className="sl-modal-actions">
                    <Btn type="button" kind="outline" onClick={() => void navigator.clipboard.writeText(platformPaymentSettings.webhookUrl)}>Copy webhook URL</Btn>
                  </div>
                )}
                <p className="sl-gateway-note">The encryption key is managed only through the API environment file. Customer workspaces do not see this panel.</p>
              </>
            )}
          </section>
        )}
      </section>

      <section className="sl-section-card sl-settings-page">
        <span className="sl-kicker">TAX SETTINGS</span>
        <h3>Optional order tax</h3>
        <p>Enable tax calculation for new online orders. Leave it disabled if your prices already include tax or you do not need tax added at checkout.</p>
        <form className="sl-form" onSubmit={saveTaxSettings}>
          <label className="sl-field-required-toggle">
            <input type="checkbox" checked={taxEnabled} onChange={(e) => setTaxEnabled(e.target.checked)} />
            Calculate tax on online orders
          </label>
          {taxEnabled && <label>Tax rate (%)
            <input type="number" min="0" max="100" step="0.01" required value={taxRate} onChange={(e) => setTaxRate(e.target.value)} placeholder="e.g. 5 or 18" />
            <small>Enter the applicable rate for your products. Confirm the correct tax treatment with your accountant.</small>
          </label>}
          {taxMessage && <p role="status" className="sl-gateway-note">{taxMessage}</p>}
          <div className="sl-modal-actions"><Btn type="submit" disabled={taxBusy}>{taxBusy ? "Saving…" : "Save tax settings"} <Check size={15}/></Btn></div>
        </form>
      </section>

      <section className="sl-section-card sl-settings-page">
        <span className="sl-kicker">SELLING PREFERENCES</span>
        <h3>Choose how customers buy from you</h3>
        <p>
          You can change this setting any time. Your catalogues and products
          remain intact.
        </p>
        <form className="sl-form" onSubmit={saveSellingMode}>
          <label
            className={
              "sl-mode-option" +
              (sellingMode === "CATALOG_ONLY" ? " selected" : "")
            }
          >
            <input
              type="radio"
              name="sellingMode"
              value="CATALOG_ONLY"
              checked={sellingMode === "CATALOG_ONLY"}
              onChange={() => setSellingMode("CATALOG_ONLY")}
            />
            <span>
              <b>
                <BookOpen size={18} /> Catalogue only
              </b>
              <small>
                Show products, share links and receive enquiries. Buyers contact
                you to confirm pricing, stock and payment.
              </small>
            </span>
          </label>
          <label
            className={
              "sl-mode-option" +
              (sellingMode === "ONLINE_PAYMENTS" ? " selected" : "")
            }
          >
            <input
              type="radio"
              name="sellingMode"
              value="ONLINE_PAYMENTS"
              checked={sellingMode === "ONLINE_PAYMENTS"}
              onChange={() => setSellingMode("ONLINE_PAYMENTS")}
            />
            <span>
              <b>
                <CreditCard size={18} /> Catalogue + online payments
              </b>
              <small>
                Prepare to offer cart and online checkout once a supported
                gateway is connected and orders/checkout are enabled.
              </small>
            </span>
          </label>
          <div className="sl-gateway-status">
            <div>
              <b>Payment gateway</b>
              <small>
                {business.paymentGatewayStatus === "ACTIVE"
                  ? "Connected"
                  : business.paymentGatewayStatus === "PENDING"
                    ? "Setup pending"
                    : business.paymentGatewayStatus === "DISABLED"
                      ? "Disabled"
                      : "Not connected"}
                {business.paymentGatewayProvider
                  ? " · " + business.paymentGatewayProvider
                  : ""}
              </small>
            </div>
            <span
              className={
                business.paymentGatewayStatus === "ACTIVE"
                  ? "sl-published"
                  : "sl-draft"
              }
            >
              {business.paymentGatewayStatus === "ACTIVE"
                ? "Active"
                : "Not active"}
            </span>
          </div>
          {sellingMode === "ONLINE_PAYMENTS" &&
            business.paymentGatewayStatus !== "ACTIVE" && (
              <p className="sl-gateway-note">
                Connect and verify Razorpay above before accepting payments.
                Only fixed-price products can be purchased online.
              </p>
            )}
          <div className="sl-modal-actions">
            <Btn type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save selling preference"} <Check size={15} />
            </Btn>
          </div>
        </form>
      </section>
    </div>
  );
}
