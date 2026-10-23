import { useEffect, useMemo, useState } from "react";
import type { Dispatch, FormEvent, SetStateAction } from "react";
import {
  ArrowRight,
  Check,
  ImagePlus,
  Package,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { ErrorMessage as Err } from "./ui";
import { formatMoney as money } from "../sellora/formatters";
import { Button as Btn } from "./ui";
import type { Field, Product } from "../sellora/types";

type ProductForm = {
  name: string;
  sku: string;
  description: string;
  price: string;
  currency: string;
  unit: string;
  imageUrl: string;
  imageUrls: string[];
  stockEnabled: boolean;
  stockQuantity: string;
  fields: Record<string, string | number | boolean | string[]>;
};
type CatalogueForm = {
  title: string;
  description: string;
  shareImageUrl: string;
  shareImageFile: File | null;
  productIds: string[];
};

type ProductModalProps = {
  editing: string;
  category: string;
  error: string;
  isTamil: boolean;
  pform: ProductForm;
  setPform: Dispatch<SetStateAction<ProductForm>>;
  fields: Field[];
  busy: boolean;
  setModal: (value: string) => void;
  uploadProductPhoto: (file?: File) => void;
  saveProduct: (event: FormEvent) => Promise<void>;
};
export function ProductModal({
  editing,
  category,
  error,
  isTamil,
  pform,
  setPform,
  fields,
  busy,
  setModal,
  uploadProductPhoto,
  saveProduct,
}: ProductModalProps) {
  const tx = (en: string, ta: string) => isTamil ? ta : en;
  return (
    <div className="sl-modal-backdrop">
      <section className="sl-modal">
        <header className="sl-modal-head">
          <div>
            <span className="sl-kicker">{tx("PRODUCT LIBRARY", "தயாரிப்புகள்")}</span>
            <h2>{editing ? tx("Edit product", "தயாரிப்பைத் திருத்து") : tx("Add a product", "தயாரிப்பைச் சேர்க்கவும்")}</h2>
            <p>{tx("Enter the details your customers need.", "உங்கள் வாடிக்கையாளர்களுக்குத் தேவையான விவரங்களை உள்ளிடுங்கள்.")}</p>
          </div>
          <button onClick={() => setModal("")}>
            <X />
          </button>
        </header>
        <Err text={error} />
        <form className="sl-form" onSubmit={saveProduct}>
          <label>
            {tx("Product name", "தயாரிப்பின் பெயர்")}
            <input
              required
              minLength={2}
              value={pform.name}
              onChange={(e) => setPform({ ...pform, name: e.target.value })}
            />
          </label>
          <div className="sl-form-row">
            <label>
              {tx("SKU / code", "SKU / குறியீடு")}
              <input
                value={pform.sku}
                onChange={(e) => setPform({ ...pform, sku: e.target.value })}
              />
            </label>
            <div className="sl-photo-upload sl-photo-gallery">
              <div className="sl-photo-gallery__heading">
                <strong>{tx("Product photos", "தயாரிப்பு புகைப்படங்கள்")}</strong>
                <span className="sl-muted">{pform.imageUrls.length}/10 · {tx("Up to 10 photos, 3 MB each", "அதிகபட்சம் 10 புகைப்படங்கள்; ஒவ்வொன்றும் 3 MB வரை")}</span>
              </div>
              <label className="sl-photo-gallery__picker">
                <ImagePlus size={20} />
                <span>{tx("Choose photos", "புகைப்படங்களைத் தேர்ந்தெடுக்கவும்")}</span>
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple disabled={pform.imageUrls.length >= 10} onChange={(e) => { const files = Array.from(e.target.files || []).slice(0, Math.max(0, 10 - pform.imageUrls.length)); files.forEach(uploadProductPhoto); e.currentTarget.value = ""; }} />
              </label>
              {pform.imageUrls.length > 0 && <div className="sl-photo-gallery__grid">{pform.imageUrls.map((url, index) => <div className="sl-photo-gallery__item" key={url + index}><img src={url} alt={tx("Product photo", "தயாரிப்பு புகைப்படம்") + " " + (index + 1)} /><span>{index === 0 ? tx("Cover", "முதன்மை") : index + 1}</span><button type="button" aria-label={tx("Remove photo", "புகைப்படத்தை நீக்கு")} onClick={() => setPform(old => { const imageUrls = old.imageUrls.filter((_, i) => i !== index); return { ...old, imageUrls, imageUrl: imageUrls[0] || "" }; })}><X size={14} /></button></div>)}</div>}
              <label className="sl-image-url-label">
                {tx("Or add an image URL", "அல்லது பட URL-ஐச் சேர்க்கவும்")}
                <input type="url" value={pform.imageUrl.startsWith("data:") ? "" : (pform.imageUrls[0] && !pform.imageUrls[0].startsWith("data:") ? pform.imageUrls[0] : "")} onChange={(e) => setPform(old => { const imageUrls = [...old.imageUrls]; if (imageUrls.length) imageUrls[0] = e.target.value; else if (e.target.value) imageUrls.push(e.target.value); return { ...old, imageUrl: e.target.value, imageUrls }; })} placeholder="https://…" />
              </label>
            </div>
          </div>
          <label>
            {tx("Description", "விளக்கம்")}
            <textarea
              rows={2}
              value={pform.description}
              onChange={(e) =>
                setPform({ ...pform, description: e.target.value })
              }
            />
          </label>
          <div className="sl-form-row">
            <div className="sl-price-editor">
              <div className="sl-price-editor-heading">
                <span>{tx("Product price", "தயாரிப்பு விலை")}</span>
                <span className="sl-muted">{tx("Optional", "விருப்பத்தேர்வு")}</span>
              </div>
              <div
                className="sl-price-mode"
                role="group"
                aria-label={tx("Product pricing mode", "விலை முறை")}
              >
                <button
                  type="button"
                  className={pform.price === "" ? "is-active" : ""}
                  aria-pressed={pform.price === ""}
                  onClick={() => setPform({ ...pform, price: "" })}
                >
                  {tx("Price on request", "விலையைக் கேட்டு தெரிந்துகொள்ளவும்")}
                </button>
                <button
                  type="button"
                  className={pform.price !== "" ? "is-active" : ""}
                  aria-pressed={pform.price !== ""}
                  onClick={() =>
                    setPform({ ...pform, price: pform.price || "0.00" })
                  }
                >
                  {tx("Set a price", "விலையை நிர்ணயிக்கவும்")}
                </button>
              </div>
              {pform.price === "" ? (
                <p className="sl-muted">
                  {tx("Customers will see “Price on request” and can enquire about this product.", "வாடிக்கையாளர்கள் விலையைக் கேட்டு இந்தத் தயாரிப்பைப் பற்றி விசாரிக்கலாம்.")}
                </p>
              ) : (
                <label>
                  {tx("Price amount", "விலைத் தொகை")}
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                    value={pform.price}
                    onChange={(e) =>
                      setPform({ ...pform, price: e.target.value })
                    }
                    placeholder={tx("Enter product price", "தயாரிப்பு விலையை உள்ளிடவும்")}
                  />
                </label>
              )}
            </div>
            <label>
              {tx("Currency", "நாணயம்")}
              <select
                value={pform.currency}
                onChange={(e) =>
                  setPform({ ...pform, currency: e.target.value })
                }
              >
                <option>INR</option>
                <option>USD</option>
                <option>EUR</option>
                <option>GBP</option>
              </select>
            </label>
            <label>
              {tx("Unit", "அலகு")}
              <input
                required
                value={pform.unit}
                onChange={(e) => setPform({ ...pform, unit: e.target.value })}
              />
            </label>
          </div>
          <div className="sl-field-divider">{tx("INVENTORY", "சரக்கு இருப்பு")}</div>
          <div className="sl-form-row">
            <label>
              {tx("Available stock quantity", "கையிருப்பு அளவு")}
              <input
                type="number"
                min="0"
                step="0.001"
                value={pform.stockQuantity}
                onChange={(e) =>
                  setPform({
                    ...pform,
                    stockQuantity: e.target.value,
                    stockEnabled: true,
                  })
                }
                placeholder={tx("e.g. 100", "எ.கா. 100")}
              />
              <span className="sl-muted">
                {tx("Enter 0 if currently out of stock. Saving a quantity enables stock validation at checkout.", "கையிருப்பில் இல்லையெனில் 0 என உள்ளிடவும். அளவைச் சேமித்தால் கட்டணத்தின் போது கையிருப்பு சரிபார்க்கப்படும்.")}
              </span>
            </label>
          </div>
          <div className="sl-field-divider">
            {tx("PRODUCT DETAILS", "தயாரிப்பு விவரங்கள்")} · {category.toUpperCase()}
          </div>
          <div className="sl-dynamic-fields">
            {fields.map((f) => (
              <label key={f.key}>
                {f.label}
                {f.required ? " *" : ""}
                {f.type === "select" ? (
                  <select
                    required={f.required}
                    value={String(pform.fields[f.key] ?? "")}
                    onChange={(e) =>
                      setPform({
                        ...pform,
                        fields: {
                          ...pform.fields,
                          [f.key]: e.target.value,
                        },
                      })
                    }
                  >
                    <option value="">{tx("Choose…", "தேர்ந்தெடுக்கவும்…")}</option>
                    {(Array.isArray(f.options) ? f.options : []).map((o) => (
                      <option key={String(o)}>{String(o)}</option>
                    ))}
                  </select>
                ) : f.type === "multiselect" ? (
                  <select
                    multiple
                    required={f.required}
                    value={
                      Array.isArray(pform.fields[f.key])
                        ? (pform.fields[f.key] as string[])
                        : []
                    }
                    onChange={(e) =>
                      setPform({
                        ...pform,
                        fields: {
                          ...pform.fields,
                          [f.key]: Array.from(
                            e.target.selectedOptions,
                            (o) => o.value,
                          ),
                        },
                      })
                    }
                  >
                    {(Array.isArray(f.options) ? f.options : []).map((o) => (
                      <option key={String(o)}>{String(o)}</option>
                    ))}
                  </select>
                ) : f.type === "boolean" ? (
                  <select
                    required={f.required}
                    value={String(pform.fields[f.key] ?? "")}
                    onChange={(e) =>
                      setPform({
                        ...pform,
                        fields: {
                          ...pform.fields,
                          [f.key]: e.target.value === "true",
                        },
                      })
                    }
                  >
                    <option value="">{tx("Choose…", "தேர்ந்தெடுக்கவும்…")}</option>
                    <option value="true">{tx("Yes", "ஆம்")}</option>
                    <option value="false">{tx("No", "இல்லை")}</option>
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    required={f.required}
                    rows={2}
                    value={String(pform.fields[f.key] ?? "")}
                    onChange={(e) =>
                      setPform({
                        ...pform,
                        fields: {
                          ...pform.fields,
                          [f.key]: e.target.value,
                        },
                      })
                    }
                  />
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    required={f.required}
                    value={String(pform.fields[f.key] ?? "")}
                    onChange={(e) =>
                      setPform({
                        ...pform,
                        fields: {
                          ...pform.fields,
                          [f.key]:
                            f.type === "number" && e.target.value !== ""
                              ? Number(e.target.value)
                              : e.target.value,
                        },
                      })
                    }
                  />
                )}
              </label>
            ))}
          </div>
          <div className="sl-modal-actions">
            <Btn kind="outline" onClick={() => setModal("")}>
              {tx("Cancel", "ரத்து செய்")}
            </Btn>
            <Btn type="submit" disabled={busy}>
              {busy ? tx("Saving…", "சேமிக்கிறது…") : tx("Save product", "தயாரிப்பைச் சேமிக்கவும்")} <ArrowRight size={15} />
            </Btn>
          </div>
        </form>
      </section>
    </div>
  );
}

type CatalogueModalProps = {
  editingCatalogue: string;
  error: string;
  cform: CatalogueForm;
  setCform: Dispatch<SetStateAction<CatalogueForm>>;
  products: Product[];
  busy: boolean;
  setModal: (value: string) => void;
  saveCatalogue: (event: FormEvent) => Promise<void>;
};
export function CatalogueModal({
  editingCatalogue,
  error,
  cform,
  setCform,
  products,
  busy,
  setModal,
  saveCatalogue,
}: CatalogueModalProps) {
  const [productSearch, setProductSearch] = useState("");
  const [shareLanguage, setShareLanguage] = useState<"en" | "ta">("en");
  const shareImagePreview = useMemo(
    () =>
      cform.shareImageFile
        ? URL.createObjectURL(cform.shareImageFile)
        : cform.shareImageUrl,
    [cform.shareImageFile, cform.shareImageUrl],
  );
  useEffect(
    () => () => {
      if (shareImagePreview.startsWith("blob:"))
        URL.revokeObjectURL(shareImagePreview);
    },
    [shareImagePreview],
  );
  const filteredProducts = useMemo(() => {
    const query = productSearch.trim().toLocaleLowerCase();
    if (!query) return products;
    return products.filter((product) =>
      [product.name, product.sku, product.description]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(query)),
    );
  }, [products, productSearch]);

  const selectVisibleProducts = () => {
    const visibleIds = filteredProducts.map((product) => product.id);
    setCform({
      ...cform,
      productIds: [...new Set([...cform.productIds, ...visibleIds])],
    });
  };

  const removeAllProducts = () => setCform({ ...cform, productIds: [] });

  return (
    <div className="sl-modal-backdrop">
      <section className="sl-modal">
        <header className="sl-modal-head">
          <div>
            <span className="sl-kicker">CATALOGUE BUILDER</span>
            <h2>
              {editingCatalogue ? "Edit catalogue" : "Create a catalogue"}
            </h2>
            <p>
              Select the products that should appear in your public catalogue.
            </p>
          </div>
          <button onClick={() => setModal("")}>
            <X />
          </button>
        </header>
        <Err text={error} />
        <form className="sl-form" onSubmit={saveCatalogue}>
          <label>
            Catalogue title
            <input
              required
              minLength={2}
              value={cform.title}
              onChange={(e) => setCform({ ...cform, title: e.target.value })}
            />
          </label>
          <label>
            Introduction (optional)
            <textarea
              rows={2}
              value={cform.description}
              onChange={(e) =>
                setCform({ ...cform, description: e.target.value })
              }
            />
          </label>
          <section className="sl-share-image-section">
            <div className="sl-picker-heading">
              <b>WhatsApp link preview image</b>
            </div>
            <p>
              Upload the image customers should see when you share this
              catalogue link on WhatsApp.
            </p>
            <p>
              Recommended: a landscape image at 1200 × 630 px. A catalogue cover
              or product photo works well.
            </p>
            {shareImagePreview && (
              <img
                src={shareImagePreview}
                alt="Catalogue WhatsApp preview"
                style={{
                  display: "block",
                  width: "100%",
                  maxWidth: 420,
                  aspectRatio: "1200 / 630",
                  objectFit: "cover",
                  borderRadius: 10,
                  marginBottom: 10,
                }}
              />
            )}
            <label>
              Choose preview image
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(event) =>
                  setCform({
                    ...cform,
                    shareImageFile: event.target.files?.[0] || null,
                  })
                }
              />
            </label>
            {cform.shareImageFile && (
              <p>Selected: {cform.shareImageFile.name}</p>
            )}
            {(cform.shareImageUrl || cform.shareImageFile) && (
              <button
                type="button"
                onClick={() =>
                  setCform({
                    ...cform,
                    shareImageUrl: "",
                    shareImageFile: null,
                  })
                }
              >
                Remove preview image
              </button>
            )}
            <p>
              <small>
                WhatsApp may cache link previews, so image changes may take time
                to appear in existing chats.
              </small>
            </p>
          </section>
          <div className="sl-picker-heading">
            <b>Choose products</b>
            <span>{cform.productIds.length} selected</span>
          </div>
          <div className="sl-product-tools">
            <label className="sl-product-search">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={productSearch}
                onChange={(event) => setProductSearch(event.target.value)}
                placeholder="Search products by name, SKU or description"
                aria-label="Search catalogue products"
              />
              {productSearch && (
                <button
                  type="button"
                  onClick={() => setProductSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </label>
            <div className="sl-product-bulk-actions">
              <button
                type="button"
                onClick={selectVisibleProducts}
                disabled={!filteredProducts.length}
              >
                Select all{productSearch ? " results" : ""}
              </button>
              <button
                type="button"
                onClick={removeAllProducts}
                disabled={!cform.productIds.length}
              >
                Remove all
              </button>
            </div>
          </div>
          <div className="sl-product-picker">
            {filteredProducts.map((p) => {
              const selected = cform.productIds.includes(p.id);
              return (
                <div className="sl-product-option" key={p.id}>
                  <button
                    type="button"
                    className={`sl-product-option-toggle${selected ? " is-selected" : ""}`}
                    aria-pressed={selected}
                    aria-label={`${selected ? "Remove" : "Add"} ${p.name} ${selected ? "from" : "to"} catalogue`}
                    onClick={() =>
                      setCform({
                        ...cform,
                        productIds: selected
                          ? cform.productIds.filter((id) => id !== p.id)
                          : [...cform.productIds, p.id],
                      })
                    }
                  >
                    {selected ? <Check size={16} strokeWidth={3} /> : null}
                  </button>
                  <div className="sl-product-option-details">
                    <b>{p.name}</b>
                    <small>{money(p.price, p.currency, p.unit)}</small>
                  </div>
                </div>
              );
            })}
          </div>
          {!products.length && (
            <p>
              {products.length
                ? "No products match your search."
                : "Add products first before creating a catalogue."}
            </p>
          )}
          <div className="sl-modal-actions">
            <Btn kind="outline" onClick={() => setModal("")}>
              Cancel
            </Btn>
            <Btn type="submit" disabled={busy || !products.length}>
              {busy
                ? editingCatalogue
                  ? "Saving…"
                  : "Creating…"
                : editingCatalogue
                  ? "Save changes"
                  : "Create catalogue"}{" "}
              <ArrowRight size={15} />
            </Btn>
          </div>
        </form>
      </section>
    </div>
  );
}
