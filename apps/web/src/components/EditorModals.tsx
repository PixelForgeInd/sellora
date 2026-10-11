import type { Dispatch, FormEvent, SetStateAction } from "react";
import { ArrowRight, Check, ImagePlus, Package, Trash2, X } from "lucide-react";
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
  stockEnabled: boolean;
  stockQuantity: string;
  fields: Record<string, string | number | boolean | string[]>;
};
type CatalogueForm = {
  title: string;
  description: string;
  productIds: string[];
};

type ProductModalProps = {
  editing: string;
  category: string;
  error: string;
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
  pform,
  setPform,
  fields,
  busy,
  setModal,
  uploadProductPhoto,
  saveProduct,
}: ProductModalProps) {
  return (
    <div className="sl-modal-backdrop">
      <section className="sl-modal">
        <header className="sl-modal-head">
          <div>
            <span className="sl-kicker">PRODUCT LIBRARY</span>
            <h2>{editing ? "Edit product" : "Add a product"}</h2>
            <p>Enter the details your customers need.</p>
          </div>
          <button onClick={() => setModal("")}>
            <X />
          </button>
        </header>
        <Err text={error} />
        <form className="sl-form" onSubmit={saveProduct}>
          <label>
            Product name
            <input
              required
              minLength={2}
              value={pform.name}
              onChange={(e) => setPform({ ...pform, name: e.target.value })}
            />
          </label>
          <div className="sl-form-row">
            <label>
              SKU / code
              <input
                value={pform.sku}
                onChange={(e) => setPform({ ...pform, sku: e.target.value })}
              />
            </label>
            <div className="sl-photo-upload">
              <label>
                Product photo{" "}
                <span className="sl-muted">
                  Optional · JPG, PNG, WebP · up to 3 MB
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => uploadProductPhoto(e.target.files?.[0])}
                />
              </label>
              {pform.imageUrl && (
                <div className="sl-photo-preview">
                  <img src={pform.imageUrl} alt="Product preview" />
                  <button
                    type="button"
                    onClick={() => setPform({ ...pform, imageUrl: "" })}
                  >
                    Remove photo
                  </button>
                </div>
              )}
              <label className="sl-image-url-label">
                Or use an image URL
                <input
                  type="url"
                  value={
                    pform.imageUrl.startsWith("data:") ? "" : pform.imageUrl
                  }
                  onChange={(e) =>
                    setPform({ ...pform, imageUrl: e.target.value })
                  }
                  placeholder="https://…"
                />
              </label>
            </div>
          </div>
          <label>
            Description
            <textarea
              rows={2}
              value={pform.description}
              onChange={(e) =>
                setPform({ ...pform, description: e.target.value })
              }
            />
          </label>
          <div className="sl-form-row">
            <label>
              Price (optional)
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={pform.price}
                onChange={(e) => setPform({ ...pform, price: e.target.value })}
              />
            </label>
            <label>
              Currency
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
              Unit
              <input
                required
                value={pform.unit}
                onChange={(e) => setPform({ ...pform, unit: e.target.value })}
              />
            </label>
          </div>
          <div className="sl-field-divider">INVENTORY</div>
          <div className="sl-form-row">
            <label>
              Available stock quantity
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
                placeholder="e.g. 100"
              />
              <span className="sl-muted">
                Enter 0 if currently out of stock. Saving a quantity enables
                stock validation at checkout.
              </span>
            </label>
          </div>
          <div className="sl-field-divider">
            PRODUCT DETAILS · {category.toUpperCase()}
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
                    <option value="">Choose…</option>
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
                    <option value="">Choose…</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
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
              Cancel
            </Btn>
            <Btn type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save product"} <ArrowRight size={15} />
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
          <div className="sl-picker-heading">
            <b>Choose products</b>
            <span>{cform.productIds.length} selected</span>
          </div>
          <div className="sl-product-picker">
            {products.map((p) => (
              <label key={p.id}>
                <input
                  type="checkbox"
                  checked={cform.productIds.includes(p.id)}
                  onChange={(e) =>
                    setCform({
                      ...cform,
                      productIds: e.target.checked
                        ? [...cform.productIds, p.id]
                        : cform.productIds.filter((id) => id !== p.id),
                    })
                  }
                />
                <span>
                  <b>{p.name}</b>
                  <small>{money(p.price, p.currency, p.unit)}</small>
                </span>
              </label>
            ))}
          </div>
          {!products.length && (
            <p>Add products first before creating a catalogue.</p>
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
