import { useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import { BookOpen, Check, CreditCard, Plus, Trash2 } from "lucide-react";
import { Button as Btn } from "./ui";
import { categories as cats } from "../sellora/catalogue-fields";
import type { Business, Field } from "../sellora/types";

type ProfileForm = {
  name: string;
  industry: string;
  productCategory: string;
  businessModel: string;
  phone: string;
  website: string;
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
  saveRazorpay: (event: FormEvent, keyId: string, keySecret: string) => Promise<void>;
  disconnectRazorpay: () => Promise<void>;
  fields: Field[];
  fieldForm: FieldForm;
  setFieldForm: Dispatch<SetStateAction<FieldForm>>;
  addIndustryField: (event: FormEvent) => Promise<void>;
  removeIndustryField: (field: Field) => Promise<void>;
  restoreIndustryFields: () => Promise<void>;
  busy: boolean;
};

export function SettingsSection({
  business,
  profileForm,
  setProfileForm,
  saveBusinessProfile,
  sellingMode,
  setSellingMode,
  saveSellingMode,
  fields,
  fieldForm,
  setFieldForm,
  addIndustryField,
  removeIndustryField,
  restoreIndustryFields,
  busy,
}: SettingsSectionProps) {
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
          <div className="sl-razorpay-card">
            <div className="sl-razorpay-heading">
              <span><CreditCard size={19} /><b>Razorpay payments</b></span>
              <small>{business.paymentGatewayStatus === "ACTIVE" ? "Credentials verified" : "Not connected"}</small>
            </div>
            <p>Connect your own Razorpay account. Use test-mode keys first, then switch to live keys after testing.</p>
            <form className="sl-form" onSubmit={(event) => { void saveRazorpay(event, razorpayKeyId, razorpayKeySecret).then(() => setRazorpayKeySecret("")); }}>
              <label>
                Razorpay Key ID
                <input required autoComplete="off" value={razorpayKeyId} onChange={(event) => setRazorpayKeyId(event.target.value)} placeholder="rzp_test_…" />
              </label>
              <label>
                Razorpay Key Secret
                <input required type="password" autoComplete="new-password" value={razorpayKeySecret} onChange={(event) => setRazorpayKeySecret(event.target.value)} placeholder={business.paymentGatewayStatus === "ACTIVE" ? "Enter a new secret to rotate credentials" : "Enter your Razorpay Key Secret"} />
              </label>
              <p className="sl-gateway-note">Your secret is encrypted before storage and is never sent back to this page. Add RAZORPAY_ENCRYPTION_KEY to the API environment before connecting.</p>
              <div className="sl-modal-actions">
                <Btn type="submit" disabled={busy}>{busy ? "Verifying…" : "Verify & connect Razorpay"} <Check size={15} /></Btn>
                {business.paymentGatewayStatus === "ACTIVE" && <Btn kind="outline" type="button" disabled={busy} onClick={() => void disconnectRazorpay()}>Disconnect</Btn>}
              </div>
            </form>
          </div>
          {sellingMode === "ONLINE_PAYMENTS" && business.paymentGatewayStatus !== "ACTIVE" && (
            <p className="sl-gateway-note">Connect and verify Razorpay before enabling online checkout. Customers cannot pay until the gateway is active.</p>
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
