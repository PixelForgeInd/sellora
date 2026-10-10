import { useState } from "react";
import { Building2, CheckCircle2, ChevronRight, X } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

type Props = { onClose: () => void; onCreated?: (business: any) => void };
const categories = [
  { value: "yarn-textiles", label: "Yarn & textiles", industry: "Textiles" },
  { value: "clothing", label: "Clothing & apparel", industry: "Fashion" },
  { value: "furniture", label: "Furniture & home", industry: "Furniture" },
  { value: "electronics", label: "Electronics", industry: "Electronics" },
  { value: "other", label: "Other products", industry: "General trading" }
];

export default function BusinessOnboarding({ onClose, onCreated }: Props) {
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<any>(null);
  const [form, setForm] = useState({
    name: "", slug: "", industry: "Textiles", productCategory: "yarn-textiles",
    businessModel: "B2B", email: "", phone: "", website: "", brandColor: "#599c56"
  });
  const update = (key: string, value: string) => setForm(old => ({
    ...old, [key]: value,
    ...(key === "name" && !old.slug ? { slug: value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}),
    ...(key === "productCategory" ? { industry: categories.find(c => c.value === value)?.industry || "General trading" } : {})
  }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API}/businesses`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not create business.");
      setSaved(data); setStep(3); onCreated?.(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not create business."); }
    finally { setSaving(false); }
  }

  return <div className="modal-backdrop onboarding-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <section className="onboarding-panel" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <div className="modal-heading">
        <div><span className="eyebrow">SELLORA · BUSINESS SETUP</span><h2 id="onboarding-title">{step === 3 ? "Your workspace is ready" : "Create your catalogue workspace"}</h2><p className="onboarding-subtitle">Tell us what you sell. Sellora will configure product fields for your industry.</p></div>
        <button className="icon-button" onClick={onClose} aria-label="Close onboarding"><X size={18}/></button>
      </div>
      {step < 3 && <div className="onboarding-progress"><span style={{ width: step === 1 ? "50%" : "100%" }}/></div>}
      {step === 1 && <form className="onboarding-form" onSubmit={e => { e.preventDefault(); setStep(2); }}>
        <label>Business name *<input required maxLength={120} value={form.name} onChange={e => update("name", e.target.value)} placeholder="e.g. Ganeshaa Sutra"/></label>
        <label>What industry are you in? *
          <select value={form.productCategory} onChange={e => update("productCategory", e.target.value)}>{categories.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select>
        </label>
        <label>How do you sell? *
          <select value={form.businessModel} onChange={e => update("businessModel", e.target.value)}><option value="B2B">Business to business (B2B)</option><option value="B2C">Direct to consumers (B2C)</option><option value="B2B2C">Both B2B and B2C</option></select>
        </label>
        <button className="button button-primary button-large full-width" type="submit">Continue <ChevronRight size={17}/></button>
      </form>}
      {step === 2 && <form className="onboarding-form" onSubmit={submit}>
        <label>Catalogue URL name *<input required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={80} value={form.slug} onChange={e => update("slug", e.target.value)} placeholder="your-business-name"/><small>Unique link identifier. You can use this for a public catalogue later.</small></label>
        <div className="form-grid"><label>Business email<input type="email" value={form.email} onChange={e => update("email", e.target.value)} placeholder="sales@example.com"/></label><label>Phone<input value={form.phone} onChange={e => update("phone", e.target.value)} placeholder="+91…"/></label></div>
        <label>Website (optional)<input type="url" value={form.website} onChange={e => update("website", e.target.value)} placeholder="https://example.com"/></label>
        <label>Brand colour<div className="brand-color-input"><input type="color" value={form.brandColor} onChange={e => update("brandColor", e.target.value)}/><span>{form.brandColor}</span></div></label>
        {error && <div className="notice notice-error">{error}</div>}
        <div className="onboarding-actions"><button type="button" className="button button-quiet" onClick={() => setStep(1)}>Back</button><button className="button button-primary button-large" type="submit" disabled={saving}>{saving ? "Creating…" : "Create workspace"} <ChevronRight size={17}/></button></div>
      </form>}
      {step === 3 && <div className="onboarding-success"><CheckCircle2 size={38}/><h3>{saved?.name}</h3><p>Workspace created with <strong>{saved?.catalogueFields?.length || 0} suggested product fields</strong> for {categories.find(c => c.value === saved?.productCategory)?.label || "your product category"}.</p><div className="field-chip-list">{(saved?.catalogueFields || []).map((field: any) => <span key={field.key}>{field.label}</span>)}</div><button className="button button-primary button-large full-width" onClick={onClose}>Continue to Sellora</button></div>}
      <p className="onboarding-footnote"><Building2 size={14}/> You can refine product fields as the catalogue builder evolves.</p>
    </section>
  </div>;
}
