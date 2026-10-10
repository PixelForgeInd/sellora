import { useEffect, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Settings,
  Share2,
  Trash2,
  X,
  MessageCircle,
} from "lucide-react";
import { api, getSessionToken } from "./sellora/api-client";
import {
  categories as cats,
  fallbackFields as fallback,
} from "./sellora/catalogue-fields";
import { formatMoney as money } from "./sellora/formatters";
import { PublicCatalogue } from "./components/PublicCatalogue";
import { AuthScreen, CatalogueSection, OnboardingScreen, ProductSection } from "./components/WorkspaceSections";
import { Brand, Button as Btn, ErrorMessage as Err } from "./components/ui";
import type {
  Business,
  Catalogue,
  Field,
  Product,
  PublicData,
} from "./sellora/types";
export default function SelloraApp() {
  const [access, setAccess] = useState(getSessionToken()),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [showPassword, setShowPassword] = useState(false),
    [mode, setMode] = useState("signup"),
    [user, setUser] = useState(""),
    [business, setBusiness] = useState<Business | null>(null),
    [products, setProducts] = useState<Product[]>([]),
    [catalogues, setCatalogues] = useState<Catalogue[]>([]),
    [page, setPage] = useState("overview"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [sellingMode, setSellingMode] = useState<
      "CATALOG_ONLY" | "ONLINE_PAYMENTS"
    >("CATALOG_ONLY");
  const [bform, setBform] = useState({
    name: "",
    industry: "Textiles",
    productCategory: "yarn-textiles",
    businessModel: "B2B",
    phone: "",
    website: "",
    brandColor: "#599c56",
    sellingMode: "ONLINE_PAYMENTS" as "CATALOG_ONLY" | "ONLINE_PAYMENTS",
  });
  const [profileForm, setProfileForm] = useState({
    name: "",
    industry: "Textiles",
    productCategory: "yarn-textiles",
    businessModel: "B2B",
    phone: "",
    website: "",
    brandColor: "#599c56",
  });
  const [fieldForm, setFieldForm] = useState({
    key: "",
    label: "",
    type: "text",
    required: false,
    options: "",
  });
  const [pform, setPform] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    currency: "INR",
    unit: "kg",
    imageUrl: "",
    fields: {} as Record<string, string | number | boolean | string[]>,
  });
  const [cform, setCform] = useState({
      title: "",
      description: "",
      productIds: [] as string[],
    }),
    [editingCatalogue, setEditingCatalogue] = useState("");
  const [modal, setModal] = useState(""),
    [editing, setEditing] = useState(""),
    [preview, setPreview] = useState<Catalogue | null>(null),
    [pub, setPub] = useState<PublicData | null>(null),
    [pubError, setPubError] = useState(""),
    [launchChecks, setLaunchChecks] = useState<Record<string, boolean>>({});
  const slug = window.location.pathname.match(/^\/c\/([^/]+)/)?.[1];
  const isDemo = window.location.pathname === "/demo/ganeshaa-sutra";
  const fields = business?.catalogueFields?.length
    ? business.catalogueFields
    : fallback[business?.productCategory || bform.productCategory] ||
      fallback.other;
  async function load(t = access) {
    const [b, p, c] = await Promise.all([
      api("/workspace/business", {}, t),
      api("/workspace/products", {}, t),
      api("/workspace/catalogues", {}, t),
    ]);
    setBusiness(b);
    if (b) setSellingMode(b.sellingMode || "CATALOG_ONLY");
    setProducts(p);
    setCatalogues(c);
  }
  async function addIndustryField(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        ...fieldForm,
        options: ["select", "multiselect"].includes(fieldForm.type)
          ? fieldForm.options
              .split("\n")
              .map((v) => v.trim())
              .filter(Boolean)
          : undefined,
      };
      await api("/workspace/fields", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await load();
      setFieldForm({
        key: "",
        label: "",
        type: "text",
        required: false,
        options: "",
      });
      setNotice("Product field added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add field");
    } finally {
      setBusy(false);
    }
  }
  async function removeIndustryField(field: Field) {
    if (
      !field.id ||
      !confirm(
        'Remove the field "' +
          field.label +
          "\"? Existing product values will remain stored but won't appear in the form.",
      )
    )
      return;
    setError("");
    try {
      await api("/workspace/fields/" + field.id, { method: "DELETE" });
      await load();
      setNotice("Field removed.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove field");
    }
  }
  async function restoreIndustryFields() {
    setBusy(true);
    setError("");
    try {
      await api("/workspace/fields/restore-defaults", {
        method: "POST",
        body: "{}",
      });
      await load();
      setNotice("Recommended fields restored for this industry.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not restore fields");
    } finally {
      setBusy(false);
    }
  }
  async function saveBusinessProfile(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await api("/workspace/business/settings", {
        method: "PATCH",
        body: JSON.stringify(profileForm),
      });
      setBusiness((old) => (old ? { ...old, ...updated } : old));
      setProfileForm({
        name: updated.name,
        industry: updated.industry,
        productCategory: updated.productCategory,
        businessModel: updated.businessModel,
        phone: updated.phone || "",
        website: updated.website || "",
        brandColor: updated.brandColor,
      });
      setNotice("Business details updated.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update business details",
      );
    } finally {
      setBusy(false);
    }
  }
  async function saveSellingMode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await api("/workspace/business/settings", {
        method: "PATCH",
        body: JSON.stringify({ sellingMode }),
      });
      setBusiness((old) => (old ? { ...old, ...updated } : old));
      setNotice(
        sellingMode === "ONLINE_PAYMENTS"
          ? "Online payments selected. Connect a gateway before accepting live payments."
          : "Catalogue-only mode saved.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save selling mode");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (business?.id) {
      setProfileForm({
        name: business.name,
        industry: business.industry,
        productCategory: business.productCategory,
        businessModel: business.businessModel,
        phone: business.phone || "",
        website: business.website || "",
        brandColor: business.brandColor || "#599c56",
      });
      try {
        const saved = localStorage.getItem(
          "sellora_launch_checks_" + business.id,
        );
        setLaunchChecks(saved ? JSON.parse(saved) : {});
      } catch {
        setLaunchChecks({});
      }
    }
  }, [business?.id]);
  useEffect(() => {
    if (isDemo) {
      setPub(demoCatalogue);
      return;
    }
    if (slug) {
      api("/public/catalogues/" + encodeURIComponent(slug), {}, "")
        .then(setPub)
        .catch((e) => setPubError(e.message));
      return;
    }
    if (!access) return;
    api("/auth/me")
      .then((u: any) => {
        setUser(u.email);
        return load(access);
      })
      .catch(() => {
        sessionStorage.removeItem("sellora_token");
        setAccess("");
      });
  }, []);
  async function auth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = await api(
        "/auth/" + mode,
        { method: "POST", body: JSON.stringify({ email, password }) },
        "",
      );
      sessionStorage.setItem("sellora_token", d.token);
      setAccess(d.token);
      setUser(d.user.email);
      const b = await api("/workspace/business", {}, d.token);
      if (b) await load(d.token);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }
  async function createBusiness(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const created = await api("/workspace/business", {
        method: "POST",
        body: JSON.stringify(bform),
      });
      localStorage.setItem("sellora_active_business_id", created.id);
      await load();
      setPage("overview");
      setNotice("Business workspace created. Add products to get started.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Setup failed");
    } finally {
      setBusy(false);
    }
  }
  function startProduct(p?: Product) {
    setEditing(p?.id || "");
    setPform(
      p
        ? {
            name: p.name,
            sku: p.sku || "",
            description: p.description || "",
            price: p.price == null ? "" : String(p.price),
            currency: p.currency,
            unit: p.unit,
            imageUrl: p.imageUrl || "",
            fields: p.fields || {},
          }
        : {
            name: "",
            sku: "",
            description: "",
            price: "",
            currency: "INR",
            unit:
              business?.productCategory === "yarn-textiles" ? "kg" : "piece",
            imageUrl: "",
            fields: {},
          },
    );
    setError("");
    setModal("product");
  }
  function uploadProductPhoto(file?: File) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Please choose an image under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPform((old) => ({ ...old, imageUrl: reader.result as string }));
        setError("");
      }
    };
    reader.onerror = () =>
      setError("Could not read this image. Try another file.");
    reader.readAsDataURL(file);
  }
  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        ...pform,
        price: pform.price ? Number(pform.price) : undefined,
      };
      const p = await api(
        editing ? "/workspace/products/" + editing : "/workspace/products",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      setProducts((old) =>
        editing ? old.map((x) => (x.id === p.id ? p : x)) : [p, ...old],
      );
      setModal("");
      setNotice("Product saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save product");
    } finally {
      setBusy(false);
    }
  }
  async function deleteProduct(p: Product) {
    if (!confirm("Delete " + p.name + "?")) return;
    try {
      await api("/workspace/products/" + p.id, { method: "DELETE" });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }
  async function saveCatalogue(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const c = await api(
        editingCatalogue
          ? "/workspace/catalogues/" + editingCatalogue
          : "/workspace/catalogues",
        {
          method: editingCatalogue ? "PATCH" : "POST",
          body: JSON.stringify(cform),
        },
      );
      setCatalogues((old) =>
        editingCatalogue
          ? old.map((x) => (x.id === c.id ? c : x))
          : [c, ...old],
      );
      setModal("");
      setEditingCatalogue("");
      setPage("catalogues");
      setNotice(
        editingCatalogue
          ? "Catalogue updated."
          : "Catalogue created. Publish it when you're ready to share.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save catalogue");
    } finally {
      setBusy(false);
    }
  }
  function editCatalogue(c: Catalogue) {
    setEditingCatalogue(c.id);
    setCform({
      title: c.title,
      description: c.description || "",
      productIds: c.items.map((item) => item.product.id),
    });
    setError("");
    setModal("catalogue");
  }
  async function publish(c: Catalogue) {
    try {
      const d = await api("/workspace/catalogues/" + c.id, {
        method: "PATCH",
        body: JSON.stringify({ isPublished: !c.isPublished }),
      });
      setCatalogues((old) => old.map((x) => (x.id === c.id ? d : x)));
      setNotice(
        d.isPublished ? "Catalogue published." : "Catalogue unpublished.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Publish failed");
    }
  }
  async function share(c: Catalogue) {
    const url = location.origin + "/c/" + c.slug;
    try {
      await navigator.clipboard.writeText(url);
      setNotice("Public link copied.");
    } catch {
      prompt("Copy this public catalogue link", url);
    }
  }
  function shareWhatsApp(c: Catalogue) {
    const url = location.origin + "/c/" + c.slug;
    window.open(
      "https://wa.me/?text=" +
        encodeURIComponent(
          "View " + c.title + " from " + business?.name + ": " + url,
        ),
      "_blank",
      "noopener,noreferrer",
    );
  }
  function signOut() {
    sessionStorage.removeItem("sellora_token");
    setAccess("");
    setUser("");
    setBusiness(null);
    setProducts([]);
    setCatalogues([]);
  }
  if (slug || isDemo)
    return <PublicCatalogue data={pub} error={pubError} demo={isDemo} />;
  if (!access || !user) return <AuthScreen email={email} setEmail={setEmail} password={password} setPassword={setPassword} showPassword={showPassword} setShowPassword={setShowPassword} mode={mode} setMode={setMode} error={error} setError={setError} busy={busy} auth={auth} />;
  if (!business) return <OnboardingScreen bform={bform} setBform={setBform} error={error} busy={busy} createBusiness={createBusiness} signOut={signOut} />;
  const category =
    cats.find((c) => c[0] === business.productCategory)?.[1] || "Products";
  const launchKey = "sellora_launch_checks_" + business.id;
  const manualLaunchTasks = [
    {
      id: "auth",
      title: "Test signup and login",
      desc: "Create a test account, sign out and sign back in successfully.",
    },
    {
      id: "public-link",
      title: "Test public catalogue access",
      desc: "Open a published catalogue in a private/incognito window without signing in.",
    },
    {
      id: "mobile",
      title: "Test on a phone",
      desc: "Check product cards, details and buttons on a real mobile device.",
    },
    {
      id: "share",
      title: "Test WhatsApp sharing and enquiries",
      desc: "Share the link and test an enquiry for a specific product.",
    },
    {
      id: "onboarding",
      title: "Prepare a repeatable onboarding process",
      desc: "Write down the steps for collecting business information and setting up a customer's first catalogue.",
    },
    {
      id: "support",
      title: "Set a support contact",
      desc: "Choose and publish a support email or phone number customers can use.",
    },
    {
      id: "demo",
      title: "Verify the demo catalogue",
      desc: "Open the sample catalogue and confirm it contains useful, clearly labelled sample data.",
    },
    {
      id: "pricing",
      title: "Decide the pilot pricing offer",
      desc: "Write down the pilot duration, included setup help and what happens after the pilot.",
    },
    {
      id: "presentation",
      title: "Prepare a short product demo",
      desc: "Create a 2–3 minute walkthrough showing adding products, publishing and sharing.",
    },
    {
      id: "feedback",
      title: "Prepare a customer feedback form",
      desc: "Capture usability issues, missing features and willingness to pay after each pilot.",
    },
  ];
  const autoLaunchTasks = [
    {
      id: "profile-products",
      title: "Business profile and products",
      desc: "Your workspace exists and contains product records with useful details.",
      done: !!business.name && products.length > 0,
    },
    {
      id: "photos",
      title: "Product photos added",
      desc: "At least one product has a photo that can be displayed to buyers.",
      done: products.some((p) => !!p.imageUrl),
    },
    {
      id: "published",
      title: "Catalogue published",
      desc: "At least one catalogue is published and ready for a public link.",
      done: catalogues.some((c) => c.isPublished),
    },
    {
      id: "forms",
      title: "Registration and product forms available",
      desc: "Sellora provides signup, business onboarding and a product form.",
      done: true,
    },
  ];
  const launchDone =
    autoLaunchTasks.filter((t) => t.done).length +
    manualLaunchTasks.filter((t) => launchChecks[t.id]).length;
  const launchTotal = autoLaunchTasks.length + manualLaunchTasks.length;
  return (
    <div className="sl-app">
      <aside className="sl-sidebar">
        <Brand />
        <span className="sl-workspace-label">WORKSPACE</span>
        <div className="sl-business-chip">
          <span style={{ background: business.brandColor }}>
            {business.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <b>{business.name}</b>
            <small>{category}</small>
          </div>
        </div>
        <nav className="sl-nav">
          {[
            { id: "overview", label: "Overview", icon: LayoutDashboard },
            { id: "products", label: "Products", icon: Package },
            { id: "catalogues", label: "Catalogues", icon: BookOpen },
            { id: "launch", label: "Launch checklist", icon: CheckCircle2 },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => {
                setPage(item.id);
                setError("");
              }}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sl-sidebar-bottom">
          <b className="sl-user-email">{user}</b>
          <button className="sl-signout" onClick={signOut}>
            <LogOut size={15} /> Sign out
          </button>
        </div>
      </aside>
      <main className="sl-main">
        <header className="sl-workspace-top">
          <div>
            <span className="sl-kicker">SELLORA WORKSPACE</span>
            <h1>
              {page === "overview"
                ? "Your business at a glance"
                : page === "products"
                  ? "Your products"
                  : page === "catalogues"
                    ? "Your catalogues"
                    : page === "launch"
                      ? "Launch checklist"
                      : page === "settings"
                        ? "Business settings"
                        : "Workspace"}
            </h1>
          </div>
          <span className="sl-online-dot">● Workspace active</span>
        </header>
        {error && <Err text={error} />}
        {notice && (
          <div className="sl-notice">
            <Check size={16} />
            {notice}
            <button onClick={() => setNotice("")}>
              <X size={15} />
            </button>
          </div>
        )}
        {page === "overview" && (
          <>
            <section className="sl-welcome-banner">
              <div>
                <span className="sl-kicker">YOUR DIGITAL SHOWROOM</span>
                <h2>
                  Make your products
                  <br />
                  easy to <em>discover.</em>
                </h2>
                <p>
                  Add your products, create a catalogue, and publish a link
                  customers can open anywhere.
                </p>
                <Btn
                  onClick={() => {
                    setPage("products");
                    startProduct();
                  }}
                >
                  <Plus size={16} /> Add a product
                </Btn>
              </div>
              <div className="sl-banner-art">
                <span>{business.name.toUpperCase()}</span>
                <BookOpen size={34} />
                <b>
                  PRODUCT
                  <br />
                  CATALOGUE
                </b>
                <small>YOUR BRAND. YOUR RANGE.</small>
              </div>
            </section>
            <section className="sl-stat-grid">
              <div>
                <span>PRODUCTS</span>
                <Package />
                <strong>{products.length}</strong>
                <small>In your workspace</small>
              </div>
              <div>
                <span>CATALOGUES</span>
                <BookOpen />
                <strong>{catalogues.length}</strong>
                <small>
                  {catalogues.filter((c) => c.isPublished).length} published
                </small>
              </div>
              <div>
                <span>BUSINESS PROFILE</span>
                <Check />
                <strong>Ready</strong>
                <small>
                  {business.businessModel} · {category}
                </small>
              </div>
            </section>
            <section className="sl-section-card">
              <h3>Your launch checklist</h3>
              <p>Complete these steps to share your first catalogue.</p>
              {[
                {
                  done: products.length > 0,
                  title: "Add products",
                  desc: "Create product records with prices and relevant details.",
                  click: () => {
                    setPage("products");
                    startProduct();
                  },
                },
                {
                  done: catalogues.length > 0,
                  title: "Build a catalogue",
                  desc: "Choose products and create a customer-facing catalogue.",
                  click: () => {
                    setPage("catalogues");
                    setEditingCatalogue("");
                    setCform({
                      title: business.name + " Product Catalogue",
                      description: "",
                      productIds: products.map((p) => p.id),
                    });
                    setModal("catalogue");
                  },
                },
                {
                  done: catalogues.some((c) => c.isPublished),
                  title: "Publish and share",
                  desc: "Publish the catalogue and copy its public link.",
                  click: () => setPage("catalogues"),
                },
              ].map((s, i) => (
                <div className="sl-check-row" key={s.title}>
                  <span className={s.done ? "sl-done" : "sl-number"}>
                    {s.done ? <Check size={15} /> : i + 1}
                  </span>
                  <div>
                    <b>{s.title}</b>
                    <small>{s.desc}</small>
                  </div>
                  <button onClick={s.click}>
                    {s.done ? "Manage" : "Start"} <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </section>
          </>
        )}
        {page === "products" && <ProductSection category={category} products={products} startProduct={startProduct} deleteProduct={deleteProduct} />}
        {page === "catalogues" && <CatalogueSection business={business} products={products} catalogues={catalogues} setCform={setCform} setEditingCatalogue={setEditingCatalogue} setError={setError} setModal={setModal} setPreview={setPreview} editCatalogue={editCatalogue} publish={publish} share={share} shareWhatsApp={shareWhatsApp} />}
        {page === "launch" && (
          <section className="sl-launch-page">
            <section className="sl-section-card sl-launch-summary">
              <span className="sl-kicker">CUSTOMER READINESS</span>
              <h3>Get ready for your first customers</h3>
              <p>
                Complete the practical steps below before sharing Sellora with
                pilot businesses. Product and catalogue steps update
                automatically; testing steps are checked off by you.
              </p>
              <div className="sl-launch-progress">
                <div>
                  <strong>
                    {launchDone} of {launchTotal}
                  </strong>
                  <span>steps complete</span>
                </div>
                <div className="sl-launch-progress-track">
                  <span
                    style={{ width: (launchDone / launchTotal) * 100 + "%" }}
                  />
                </div>
                <b>{Math.round((launchDone / launchTotal) * 100)}%</b>
              </div>
            </section>
            <section className="sl-section-card">
              <div className="sl-section-head">
                <div>
                  <h3>Product setup</h3>
                  <p>Automatically checked against your current workspace.</p>
                </div>
                <Package size={20} />
              </div>
              {autoLaunchTasks.map((t, i) => (
                <div className="sl-check-row" key={t.id}>
                  <span className={t.done ? "sl-done" : "sl-number"}>
                    {t.done ? <Check size={15} /> : i + 1}
                  </span>
                  <div>
                    <b>{t.title}</b>
                    <small>{t.desc}</small>
                  </div>
                  {t.done ? (
                    <span className="sl-launch-status done">Complete</span>
                  ) : (
                    <button
                      onClick={() => {
                        if (t.id === "profile-products") {
                          setPage(products.length ? "settings" : "products");
                          if (!products.length) startProduct();
                        }
                        if (t.id === "photos") {
                          setPage("products");
                          startProduct(products[0]);
                        }
                        if (t.id === "published") setPage("catalogues");
                      }}
                    >
                      Do this <ArrowRight size={14} />
                    </button>
                  )}
                </div>
              ))}
            </section>
            <section className="sl-section-card">
              <div className="sl-section-head">
                <div>
                  <h3>Before approaching customers</h3>
                  <p>Mark each item complete after testing it yourself.</p>
                </div>
                <CheckCircle2 size={20} />
              </div>
              {manualLaunchTasks.map((t, i) => (
                <label className="sl-launch-manual" key={t.id}>
                  <input
                    type="checkbox"
                    checked={!!launchChecks[t.id]}
                    onChange={(e) => {
                      const next = {
                        ...launchChecks,
                        [t.id]: e.target.checked,
                      };
                      setLaunchChecks(next);
                      try {
                        localStorage.setItem(launchKey, JSON.stringify(next));
                      } catch {}
                    }}
                  />
                  <span
                    className={launchChecks[t.id] ? "sl-done" : "sl-number"}
                  >
                    {launchChecks[t.id] ? <Check size={15} /> : i + 1}
                  </span>
                  <span>
                    <b>{t.title}</b>
                    <small>{t.desc}</small>
                  </span>
                </label>
              ))}
            </section>
            <section className="sl-section-card sl-launch-next">
              <h3>Suggested first-customer target</h3>
              <p>
                Start with five pilot businesses. Help each one publish a real
                catalogue, share it with buyers and give you feedback before
                investing in advanced checkout features.
              </p>
              <Btn
                onClick={() => {
                  const plan =
                    "Sellora pilot outreach\nTarget: 5 businesses\n1. Demonstrate the catalogue\n2. Help add products and photos\n3. Publish and share the catalogue link\n4. Test mobile display and WhatsApp enquiry\n5. Collect feedback and ask whether they would pay";
                  navigator.clipboard
                    .writeText(plan)
                    .then(() => setNotice("Pilot plan copied."))
                    .catch(() => window.prompt("Copy pilot plan", plan));
                }}
              >
                <Copy size={15} /> Copy pilot plan
              </Btn>
            </section>
          </section>
        )}
        {page === "settings" && (
          <div className="sl-settings-stack">
            <section className="sl-section-card sl-settings-page">
              <span className="sl-kicker">BUSINESS PROFILE</span>
              <h3>Business details</h3>
              <p>
                Update the information collected during onboarding. These
                details help customers recognize and contact your business.
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
                          industry:
                            cats.find((c) => c[0] === v)?.[2] || "General",
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
                    {busy ? "Saving…" : "Save business details"}{" "}
                    <Check size={15} />
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
                Control the information collected for each product. Fields
                appear automatically in the product form and are validated
                before saving.
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
              <form
                className="sl-form sl-add-field-form"
                onSubmit={addIndustryField}
              >
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
                You can change this setting any time. Your catalogues and
                products remain intact.
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
                      Show products, share links and receive enquiries. Buyers
                      contact you to confirm pricing, stock and payment.
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
                      Selecting online payments does not activate a gateway by
                      itself. Gateway onboarding and secure checkout are not yet
                      connected, so live payments will remain unavailable until
                      those features are implemented.
                    </p>
                  )}
                <div className="sl-modal-actions">
                  <Btn type="submit" disabled={busy}>
                    {busy ? "Saving…" : "Save selling preference"}{" "}
                    <Check size={15} />
                  </Btn>
                </div>
              </form>
            </section>
          </div>
        )}
        <footer className="sl-workspace-footer">
          Sellora · Digital Catalogues. Smarter Sales.{" "}
          <span>Phase 1–6 MVP + selling mode</span>
        </footer>
      </main>
      {modal === "product" && (
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
                    onChange={(e) =>
                      setPform({ ...pform, sku: e.target.value })
                    }
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
                    onChange={(e) =>
                      setPform({ ...pform, price: e.target.value })
                    }
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
                    onChange={(e) =>
                      setPform({ ...pform, unit: e.target.value })
                    }
                  />
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
                        {(Array.isArray(f.options) ? f.options : []).map(
                          (o) => (
                            <option key={String(o)}>{String(o)}</option>
                          ),
                        )}
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
                        {(Array.isArray(f.options) ? f.options : []).map(
                          (o) => (
                            <option key={String(o)}>{String(o)}</option>
                          ),
                        )}
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
      )}
      {modal === "catalogue" && (
        <div className="sl-modal-backdrop">
          <section className="sl-modal">
            <header className="sl-modal-head">
              <div>
                <span className="sl-kicker">CATALOGUE BUILDER</span>
                <h2>
                  {editingCatalogue ? "Edit catalogue" : "Create a catalogue"}
                </h2>
                <p>
                  Select the products that should appear in your public
                  catalogue.
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
                  onChange={(e) =>
                    setCform({ ...cform, title: e.target.value })
                  }
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
      )}
      {preview && (
        <div
          className="sl-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setPreview(null);
          }}
        >
          <section className="sl-modal sl-preview-modal">
            <header className="sl-modal-head">
              <div>
                <span className="sl-kicker">
                  {preview.isPublished
                    ? "PUBLISHED CATALOGUE"
                    : "DRAFT PREVIEW"}
                </span>
                <h2>{preview.title}</h2>
                <p>
                  {preview.description || "A catalogue from " + business.name}
                </p>
              </div>
              <button onClick={() => setPreview(null)}>
                <X />
              </button>
            </header>
            <div
              className="sl-preview-banner"
              style={{ background: business.brandColor }}
            >
              <small>{business.name.toUpperCase()}</small>
              <BookOpen size={28} />
              <strong>{preview.title}</strong>
              <span>{preview.items.length} PRODUCTS</span>
            </div>
            {preview.items.length ? (
              <div className="sl-preview-products">
                {preview.items.map(({ product: p }) => (
                  <article key={p.id}>
                    <div>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt="" />
                      ) : (
                        <Package size={22} />
                      )}
                    </div>
                    <span>
                      <b>{p.name}</b>
                      <small>
                        {p.description ||
                          Object.entries(p.fields || {})
                            .filter(([, v]) => v !== "")
                            .slice(0, 2)
                            .map(([k, v]) => k + ": " + v)
                            .join(" · ")}
                      </small>
                    </span>
                    <strong>{money(p.price, p.currency, p.unit)}</strong>
                  </article>
                ))}
              </div>
            ) : (
              <p className="sl-muted">
                No products selected. Edit the catalogue to add products.
              </p>
            )}
            <div className="sl-modal-actions">
              <Btn kind="outline" onClick={() => setPreview(null)}>
                Close preview
              </Btn>
              {preview.isPublished && (
                <Btn
                  onClick={() => window.open("/c/" + preview.slug, "_blank")}
                >
                  <ExternalLink size={14} /> Open public link
                </Btn>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
const demoCatalogue: PublicData = {
  title: "Premium Yarns for Your Creations",
  description:
    "A wide range of cotton, recycled, modal and specialty yarns for handloom, knitting and textile applications.",
  slug: "ganeshaa-sutra-demo",
  business: {
    name: "Ganeshaa Sutra",
    industry: "Yarn & Textiles",
    phone: "+91 95973 42871",
    email: "info@ganeshaasutra.in",
    website: "https://ganeshaasutra.in",
    brandColor: "#147b46",
  },
  products: [
    {
      id: "demo-1",
      name: "20's OE Yarn",
      sku: "GS-OE20",
      description:
        "High-quality open-end yarn for handloom and knitting applications.",
      price: 155,
      currency: "INR",
      unit: "kg",
      imageUrl:
        "https://images.unsplash.com/photo-1604881988758-f76ad2f7be84?auto=format&fit=crop&w=900&q=85",
      fields: {
        count: "20s OE",
        yarnType: "Recycled OE",
        shade: "Natural White",
        composition: "Recycled blend",
      },
    },
    {
      id: "demo-2",
      name: "2/20's Yarn",
      sku: "GS-220",
      description: "Twisted yarn with excellent strength and uniformity.",
      price: 158,
      currency: "INR",
      unit: "kg",
      imageUrl:
        "https://images.unsplash.com/photo-1601379327928-bedfaf9da2d0?auto=format&fit=crop&w=900&q=85",
      fields: {
        count: "2/20s",
        yarnType: "Cotton blend",
        shade: "Fanta Orange",
        composition: "Cotton blend",
      },
    },
    {
      id: "demo-3",
      name: "2/40's Yarn",
      sku: "GS-240",
      description: "Fine-count yarn for premium fabric finishing.",
      price: 168,
      currency: "INR",
      unit: "kg",
      imageUrl:
        "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?auto=format&fit=crop&w=900&q=85",
      fields: {
        count: "2/40s",
        yarnType: "Cotton",
        shade: "Royal Blue",
        composition: "Cotton blend",
      },
    },
    {
      id: "demo-4",
      name: "10's Count Yarn",
      sku: "GS-10",
      description:
        "Coarser count yarn for a wide range of textile applications.",
      price: 132,
      currency: "INR",
      unit: "kg",
      imageUrl:
        "https://images.unsplash.com/photo-1605000797499-95a51c5269ae?auto=format&fit=crop&w=900&q=85",
      fields: {
        count: "10s",
        yarnType: "Open-end",
        shade: "Golden Yellow",
        composition: "Recycled blend",
      },
    },
    {
      id: "demo-5",
      name: "18's Count Yarn",
      sku: "GS-18",
      description: "Versatile yarn for handloom and weaving needs.",
      price: 143,
      currency: "INR",
      unit: "kg",
      imageUrl:
        "https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85",
      fields: {
        count: "18s",
        yarnType: "Cotton blend",
        shade: "Olive",
        composition: "Cotton blend",
      },
    },
    {
      id: "demo-6",
      name: "Recycled OE Yarn",
      sku: "GS-REC",
      description:
        "A dependable option for buyers looking for value and consistency.",
      price: null,
      currency: "INR",
      unit: "kg",
      imageUrl:
        "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=900&q=85",
      fields: {
        count: "20s OE",
        yarnType: "Recycled OE",
        shade: "Custom shades",
        composition: "Recycled fibres",
      },
    },
  ],
};
