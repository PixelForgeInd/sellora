import { useEffect, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import {
  ArrowRight,
  BookOpen,
  BarChart3,
  ClipboardList,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  Printer,
  ExternalLink,
  Eye,
  EyeOff,
  LayoutDashboard,
  LogOut,
  Package,
  Plus,
  Settings,
  Search,
  Share2,
  Trash2,
  X,
  MessageCircle,
  Users,
  MessageSquare,
} from "lucide-react";
import { api, getSessionToken } from "./sellora/api-client";
import {
  categories as cats,
  fallbackFields as fallback,
} from "./sellora/catalogue-fields";
import { formatCurrency, formatMoney as money } from "./sellora/formatters";
import { PublicCatalogue } from "./components/PublicCatalogue";
import {
  AuthScreen,
  CatalogueSection,
  OnboardingScreen,
  ProductSection,
} from "./components/WorkspaceSections";
import { SettingsSection } from "./components/SettingsSection";
import { PaymentsSection } from "./components/PaymentsSection";
import { OverviewPaymentActivity } from "./components/OverviewPaymentActivity";
import { PlatformOwnerDashboard } from "./components/PlatformOwnerDashboard";
import { SubscriptionSection } from "./components/SubscriptionSection";
import {
  CustomersSection,
  ReportsSection,
} from "./components/OperationsSections";
import { CatalogueModal, ProductModal } from "./components/EditorModals";
import { Brand, Button as Btn, ErrorMessage as Err } from "./components/ui";
import { HomePage } from "./components/HomePage";
import { InformationalPage } from "./components/InformationalPages";
import type {
  Business,
  Catalogue,
  Field,
  Product,
  PublicData,
} from "./sellora/types";
import type { CatalogueForm } from "./components/WorkspaceSections";
export default function SelloraApp() {
  // Session and workspace data
  const [access, setAccess] = useState(getSessionToken());
  const [user, setUser] = useState("");
  const [isPlatformOwner, setIsPlatformOwner] = useState(false);
  const [subscriptionLocked, setSubscriptionLocked] = useState(false);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [catalogues, setCatalogues] = useState<Catalogue[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [overviewEnquiries, setOverviewEnquiries] = useState<any[]>([]);
  const [overviewCustomers, setOverviewCustomers] = useState<any[]>([]);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderSort, setOrderSort] = useState("newest");
  const [analytics, setAnalytics] = useState<Record<string, any>>({});
  const [analyticsBusy, setAnalyticsBusy] = useState("");
  const [catalogueActionMessage, setCatalogueActionMessage] = useState("");
  // Authentication screen state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetToken, setResetToken] = useState(
    () => new URLSearchParams(window.location.search).get("resetToken") || "",
  );
  const [authNotice, setAuthNotice] = useState("");
  const [mode, setMode] = useState(() =>
    new URLSearchParams(window.location.search).has("resetToken")
      ? "reset"
      : window.location.pathname === "/login"
        ? "login"
        : "signup",
  );

  // Workspace navigation and feedback
  const [page, setPage] = useState("overview");
  const [uiLanguage, setUiLanguage] = useState<"en" | "ta">(() => { const params = new URLSearchParams(window.location.search); return params.get("uiLanguage") === "ta" || params.get("lang") === "ta" ? "ta" : "en"; });
  const isTamil = uiLanguage === "ta";
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Business setup and settings forms
  const [sellingMode, setSellingMode] = useState<
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
    email: "",
    phone: "",
    address: "",
    website: "",
    logoUrl: "",
    brandColor: "#599c56",
  });
  const [fieldForm, setFieldForm] = useState({
    key: "",
    label: "",
    type: "text",
    required: false,
    options: "",
  });

  // Product and catalogue editors
  const [pform, setPform] = useState({
    name: "",
    sku: "",
    description: "",
    price: "",
    currency: "INR",
    unit: "kg",
    imageUrl: "",
    stockEnabled: false,
    stockQuantity: "",
    fields: {} as Record<string, string | number | boolean | string[]>,
  });
  const [cform, setCform] = useState<CatalogueForm>({
    title: "",
    description: "",
    shareImageUrl: "",
    shareImageFile: null,
    productIds: [],
  });
  const [editingCatalogue, setEditingCatalogue] = useState("");
  const [modal, setModal] = useState("");
  const [editing, setEditing] = useState("");

  // Public catalogue and launch-readiness state
  const [preview, setPreview] = useState<Catalogue | null>(null);
  const [pub, setPub] = useState<PublicData | null>(null);
  const [pubError, setPubError] = useState("");
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
    try {
      setOrders(await api("/workspace/orders", {}, t));
    } catch {
      /* Orders can refresh separately. */
    }
    try {
      setOverviewEnquiries(await api("/workspace/enquiries", {}, t));
    } catch {
      setOverviewEnquiries([]);
    }
    try {
      setOverviewCustomers(await api("/workspace/customers", {}, t));
    } catch {
      setOverviewCustomers([]);
    }
  }
  async function addIndustryField(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const normalizedLabel = fieldForm.label
        .trim()
        .replace(/[^a-zA-Z0-9]+(.)?/g, (_match, next: string | undefined) =>
          next ? next.toUpperCase() : "",
        );
      const baseKey = (
        normalizedLabel.charAt(0).toLowerCase() + normalizedLabel.slice(1)
      ).replace(/[^a-zA-Z0-9]/g, "");
      const safeBaseKey = /^[a-z]/.test(baseKey) ? baseKey : `field${baseKey}`;
      let generatedKey = safeBaseKey.slice(0, 48) || "customField";
      let suffix = 2;
      while (fields.some((field) => field.key === generatedKey)) {
        const suffixText = String(suffix++);
        generatedKey =
          safeBaseKey.slice(0, 48 - suffixText.length) + suffixText;
      }
      const payload = {
        ...fieldForm,
        key: generatedKey,
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
        email: updated.email || "",
        phone: updated.phone || "",
        address: updated.address || "",
        website: updated.website || "",
        logoUrl: updated.logoUrl || "",
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
  async function saveRazorpay(e: FormEvent, keyId: string, keySecret: string) {
    e.preventDefault();
    if (!keyId.trim() || !keySecret.trim()) {
      setError("Enter both the Razorpay Key ID and Key Secret.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api("/workspace/payments/razorpay/connect", {
        method: "POST",
        body: JSON.stringify({
          keyId: keyId.trim(),
          keySecret: keySecret.trim(),
        }),
      });
      setBusiness((old) =>
        old
          ? {
              ...old,
              paymentGatewayProvider: result.paymentGatewayProvider,
              paymentGatewayStatus: result.paymentGatewayStatus,
            }
          : old,
      );
      setNotice(result.message || "Razorpay connected.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect Razorpay.");
    } finally {
      setBusy(false);
    }
  }
  async function disconnectRazorpay() {
    setBusy(true);
    setError("");
    try {
      const result = await api("/workspace/payments/razorpay/disconnect", {
        method: "POST",
      });
      setBusiness((old) =>
        old
          ? {
              ...old,
              paymentGatewayProvider: result.paymentGatewayProvider,
              paymentGatewayStatus: result.paymentGatewayStatus,
            }
          : old,
      );
      setNotice("Razorpay disconnected.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not disconnect Razorpay.",
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
          ? "Online payments enabled. Customers can pay through your connected Razorpay account."
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
        email: business.email || "",
        phone: business.phone || "",
        address: business.address || "",
        website: business.website || "",
        logoUrl: business.logoUrl || "",
        brandColor: business.brandColor || "#599c56",
      });
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
      .then(async (u: { email: string; isPlatformOwner?: boolean }) => {
        setUser(u.email);
        setIsPlatformOwner(Boolean(u.isPlatformOwner));
        if (u.isPlatformOwner) return;
        try {
          await load(access);
          const subscription = await api("/workspace/subscription", {}, access);
          const requiresPayment = Boolean(subscription.isLocked);
          setSubscriptionRequired(requiresPayment);
          setSubscriptionLocked(requiresPayment);
          if (requiresPayment) setPage("subscription");
        } catch (e) {
          const message =
            e instanceof Error ? e.message : "Could not load workspace.";
          if (
            message.toLowerCase().includes("subscription") ||
            message.toLowerCase().includes("expired")
          ) {
            setSubscriptionLocked(true);
            setPage("subscription");
          } else setError(message);
        }
      })
      .catch(() => {
        sessionStorage.removeItem("sellora_token");
        setAccess("");
        setIsPlatformOwner(false);
      });
  }, []);
  async function auth(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setAuthNotice("");
    try {
      if (mode === "forgot") {
        const result = await api(
          "/auth/password/forgot",
          { method: "POST", body: JSON.stringify({ email }) },
          "",
        );
        setAuthNotice(
          result.message ||
            "If an account exists, reset instructions will be sent.",
        );
        setMode("login");
        return;
      }
      if (mode === "reset") {
        const result = await api(
          "/auth/password/reset",
          {
            method: "POST",
            body: JSON.stringify({ token: resetToken, newPassword: password }),
          },
          "",
        );
        setAuthNotice(result.message || "Password reset. You can now sign in.");
        setPassword("");
        setResetToken("");
        window.history.replaceState({}, "", window.location.pathname);
        setMode("login");
        return;
      }
      const d = await api(
        "/auth/" + mode,
        { method: "POST", body: JSON.stringify({ email, password }) },
        "",
      );
      sessionStorage.setItem("sellora_token", d.token);
      setAccess(d.token);
      setUser(d.user.email);
      const currentUser = await api("/auth/me", {}, d.token);
      setIsPlatformOwner(Boolean(currentUser.isPlatformOwner));
      if (currentUser.isPlatformOwner) return;
      try {
        await load(d.token);
        const subscription = await api("/workspace/subscription", {}, d.token);
        const requiresPayment = Boolean(subscription.isLocked);
        setSubscriptionRequired(requiresPayment);
        setSubscriptionLocked(requiresPayment);
        if (requiresPayment) setPage("subscription");
      } catch (loadError) {
        const message =
          loadError instanceof Error
            ? loadError.message
            : "Could not load workspace.";
        if (
          message.toLowerCase().includes("subscription") ||
          message.toLowerCase().includes("expired")
        ) {
          setSubscriptionLocked(true);
          setPage("subscription");
        } else throw loadError;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not continue");
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
      setSubscriptionRequired(true);
      setSubscriptionLocked(true);
      setPage("subscription");
      setNotice(
        "Business workspace created. Complete your subscription payment to unlock Sellora.",
      );
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
            stockEnabled: Boolean(p.stockEnabled),
            stockQuantity:
              p.stockQuantity == null ? "" : String(p.stockQuantity),
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
            stockEnabled: false,
            stockQuantity: "",
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
  async function uploadProductImage(product: Product, file: File) {
    const form = new FormData();
    form.append("image", file);
    try {
      const result = await api(
        "/workspace/products/" + encodeURIComponent(product.id) + "/image",
        { method: "POST", body: form },
      );
      setProducts((old) =>
        old.map((item) =>
          item.id === product.id
            ? { ...item, imageUrl: result.imageUrl }
            : item,
        ),
      );
      setNotice("Image uploaded for " + product.name + ".");
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not upload product image.",
      );
    }
  }

  async function removeProductImage(product: Product) {
    try {
      await api("/workspace/products/" + encodeURIComponent(product.id), {
        method: "PATCH",
        body: JSON.stringify({ imageUrl: "" }),
      });
      setProducts((old) =>
        old.map((item) =>
          item.id === product.id ? { ...item, imageUrl: null } : item,
        ),
      );
      setNotice("Product image removed.");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not remove product image.",
      );
    }
  }

  async function saveProduct(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const body = {
        ...pform,
        price: pform.price ? Number(pform.price) : undefined,
        stockEnabled: pform.stockQuantity !== "" ? true : pform.stockEnabled,
        stockQuantity:
          pform.stockQuantity !== "" ? Number(pform.stockQuantity) : undefined,
      };
      const p = await api(
        editing ? "/workspace/products/" + editing : "/workspace/products",
        { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) },
      );
      let savedProduct = p;
      if (pform.stockQuantity !== "") {
        // Persist stock through the inventory endpoint for both new and existing
        // products. Zero is a valid quantity and must not be treated as empty.
        const inventory = await api(
          "/workspace/inventory/" + encodeURIComponent(p.id) + "/adjust",
          {
            method: "POST",
            body: JSON.stringify({
              quantity: Number(pform.stockQuantity),
              reason: "ADJUSTMENT",
              note: "Saved from product editor",
            }),
          },
        );
        savedProduct = {
          ...p,
          stockEnabled: inventory.stockEnabled,
          stockQuantity: inventory.stockQuantity,
        };
      }
      setProducts((old) =>
        editing
          ? old.map((x) => (x.id === savedProduct.id ? savedProduct : x))
          : [savedProduct, ...old],
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
      const { shareImageFile, ...cataloguePayload } = cform;
      let c = await api(
        editingCatalogue
          ? "/workspace/catalogues/" + editingCatalogue
          : "/workspace/catalogues",
        {
          method: editingCatalogue ? "PATCH" : "POST",
          body: JSON.stringify(cataloguePayload),
        },
      );
      if (!editingCatalogue) setEditingCatalogue(c.id);
      if (shareImageFile) {
        const upload = new FormData();
        upload.append("image", shareImageFile);
        const imageResult = await api(
          "/workspace/catalogues/" + c.id + "/image",
          {
            method: "POST",
            body: upload,
          },
        );
        c = { ...c, shareImageUrl: imageResult.shareImageUrl };
      }
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
      shareImageUrl: c.shareImageUrl || "",
      shareImageFile: null,
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
    setIsPlatformOwner(false);
    setBusiness(null);
    setProducts([]);
    setCatalogues([]);
  }
  if (slug || isDemo)
    return <PublicCatalogue data={pub} error={pubError} demo={isDemo} />;
  const infoPath = window.location.pathname;
  if (infoPath === "/about") return <InformationalPage kind="about" />;
  if (infoPath === "/terms") return <InformationalPage kind="terms" />;
  if (infoPath === "/privacy") return <InformationalPage kind="privacy" />;
  if (
    window.location.pathname === "/" &&
    !new URLSearchParams(window.location.search).has("resetToken")
  )
    return <HomePage />;
  if (!access || !user)
    return (
      <AuthScreen
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        mode={mode}
        setMode={setMode}
        error={error}
        setError={setError}
        busy={busy}
        auth={auth}
      />
    );
  if (isPlatformOwner)
    return (
      <PlatformOwnerDashboard token={access} user={user} onSignOut={signOut} />
    );
  if (subscriptionRequired && business)
    return (
      <div className="sl-app sl-activation-app">
        <style>{`.sl-activation-app{display:block!important;width:100%!important;max-width:none!important;min-height:100vh;margin:0!important;padding:0!important}.sl-activation-app>.sl-activation-main{display:block!important;width:calc(100% - 48px)!important;max-width:1120px!important;min-width:0!important;margin:0 auto!important;padding:40px 0 64px!important;box-sizing:border-box;flex:none!important;grid-column:1/-1!important}.sl-activation-main .sl-workspace-top{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.sl-activation-main .sl-workspace-top h1{max-width:none;overflow-wrap:normal}.sl-activation-copy{max-width:760px;line-height:1.65}.sl-activation-main .sl-payment-failed{width:100%;max-width:680px;margin:40px auto;padding:clamp(28px,5vw,54px)!important;box-sizing:border-box}@media(max-width:640px){.sl-activation-main{width:calc(100% - 32px)!important;padding-top:24px!important}.sl-activation-main .sl-workspace-top{gap:12px}.sl-activation-main .sl-workspace-top h1{font-size:clamp(32px,9vw,48px)}.sl-activation-main .sl-workspace-top .sl-button{flex-shrink:0}}
.sl-welcome-launch-checklist-title{margin:24px 0 0!important;font-size:clamp(22px,2vw,28px)!important;line-height:1.2!important;font-weight:850!important;font-style:italic!important;letter-spacing:-.035em!important;color:#111!important}
.sl-welcome-launch-checklist{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:22px 0 24px;max-width:900px;width:100%}
.sl-welcome-launch-checklist .sl-launch-step{appearance:none;-webkit-appearance:none;display:grid;grid-template-columns:30px minmax(0,1fr);grid-template-rows:auto auto;align-items:center;column-gap:11px;row-gap:4px;width:100%;min-width:0;min-height:84px;padding:14px;text-align:left;font:inherit;color:#29382d;border:1px solid #dce6d8;border-radius:13px;background:rgba(255,255,255,.68);box-shadow:0 2px 6px rgba(35,60,35,.025);cursor:pointer;transition:transform .18s ease,border-color .18s ease,background .18s ease,box-shadow .18s ease;box-sizing:border-box}
.sl-welcome-launch-checklist .sl-launch-step:hover{transform:translateY(-2px);border-color:#a6c8a1;background:#fff;box-shadow:0 7px 18px rgba(44,83,44,.08)}
.sl-welcome-launch-checklist .sl-launch-step:focus-visible{outline:3px solid rgba(89,156,86,.35);outline-offset:3px}
.sl-welcome-launch-checklist .sl-launch-step-check{grid-column:1;grid-row:1/3;display:grid;place-items:center;width:28px;height:28px;border:1.5px solid #a8bca4;border-radius:8px;background:#fff;color:#fff;transition:background .22s ease,border-color .22s ease,transform .22s ease;box-sizing:border-box}
.sl-welcome-launch-checklist .sl-launch-step-number{font-size:12px;font-weight:800;color:#71866d}
.sl-welcome-launch-checklist .sl-launch-step-copy{grid-column:2;grid-row:1;display:grid;gap:5px;min-width:0}
.sl-welcome-launch-checklist .sl-launch-step-copy b{font-size:13px;font-weight:750;line-height:1.35;color:#29382d}
.sl-welcome-launch-checklist .sl-launch-step-copy small{font-size:11px;line-height:1.45;color:#758173;white-space:normal}
.sl-welcome-launch-checklist .sl-launch-step-state{grid-column:2;grid-row:2;font-size:10px;font-weight:750;line-height:1.3;color:#758173}
.sl-welcome-launch-checklist .sl-launch-step.is-complete{border-color:#9ac99b;background:linear-gradient(135deg,#edf8ed,#fff);box-shadow:0 4px 14px rgba(57,123,61,.09)}
.sl-welcome-launch-checklist .sl-launch-step.is-complete .sl-launch-step-check{background:#398747;border-color:#398747;animation:sl-launch-check-pop .35s cubic-bezier(.2,.9,.3,1.35) both}
.sl-welcome-launch-checklist .sl-launch-step.is-complete .sl-launch-step-state{color:#318043}
.sl-welcome-launch-checklist .sl-launch-step.is-complete .sl-launch-step-copy b{color:#607463}
@keyframes sl-launch-check-pop{0%{transform:scale(.65) rotate(-12deg)}65%{transform:scale(1.14) rotate(4deg)}100%{transform:scale(1) rotate(0)}}
@media(prefers-reduced-motion:reduce){.sl-welcome-launch-checklist .sl-launch-step,.sl-welcome-launch-checklist .sl-launch-step-check{transition:none;animation:none!important}}
@media(max-width:760px){.sl-welcome-launch-checklist{grid-template-columns:1fr;gap:8px;margin:18px 0}.sl-welcome-launch-checklist .sl-launch-step{padding:11px 12px}}
`}</style>
        <main className="sl-main sl-activation-main">
          <header className="sl-workspace-top">
            <div>
              <span className="sl-kicker">WELCOME TO SELLORA</span>
              <h1>Activate your workspace</h1>
            </div>
            <button className="sl-button sl-button-outline" onClick={signOut}>
              <LogOut size={15} /> Sign out
            </button>
          </header>
          <p
            className="sl-activation-copy"
            style={{ color: "var(--sl-muted,#6b7280)", marginBottom: 20 }}
          >
            Choose a plan and complete payment to unlock your dashboard. If
            payment fails or is cancelled, you can safely retry.
          </p>
          <SubscriptionSection
            token={access}
            requirePayment
            onRenewed={async () => {
              await load(access);
              setSubscriptionRequired(false);
              setSubscriptionLocked(false);
              setPage("overview");
              setNotice(
                "Payment verified. Your Sellora dashboard is now unlocked.",
              );
            }}
          />
        </main>
      </div>
    );
  if (subscriptionLocked && !business)
    return (
      <div className="sl-app sl-renewal-app">
        <style>{`.sl-renewal-app{display:block!important;width:100%!important;max-width:none!important;min-height:100vh;margin:0!important;padding:0!important;box-sizing:border-box}.sl-renewal-app>.sl-renewal-main{display:block!important;width:calc(100% - 48px)!important;max-width:1120px!important;min-width:0!important;margin:0 auto!important;padding:40px 0 64px!important;box-sizing:border-box;flex:none!important;grid-column:1/-1!important}.sl-renewal-main,.sl-renewal-main>*{min-width:0;box-sizing:border-box}.sl-renewal-main>.sl-section-card{width:100%;max-width:none}.sl-renewal-main .sl-workspace-top{width:100%;display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.sl-renewal-main .sl-workspace-top h1{max-width:none;overflow-wrap:normal}.sl-renewal-main .sl-analytics-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.sl-renewal-main .sl-analytics-metrics>span{min-width:0;overflow-wrap:anywhere}.sl-renewal-main .sl-analytics-metrics b{overflow-wrap:anywhere}@media(max-width:640px){.sl-renewal-app>.sl-renewal-main{width:calc(100% - 32px)!important;padding-top:24px!important}.sl-renewal-main .sl-workspace-top{gap:12px}.sl-renewal-main .sl-workspace-top h1{font-size:clamp(32px,9vw,48px)}.sl-renewal-main .sl-workspace-top .sl-button{flex-shrink:0}.sl-renewal-main .sl-analytics-metrics{grid-template-columns:1fr}}
.sl-renewal-app{background:radial-gradient(ellipse at 8% 0%,#e1f5e8 0,transparent 34%),radial-gradient(ellipse at 100% 20%,#e7edff 0,transparent 30%),#f7faf7!important}
.sl-renewal-app{background:linear-gradient(135deg,#f0fff4 0%,#eef5ff 28%,#fff0f7 55%,#fff7e8 78%,#edfaff 100%)!important;background-size:300% 300%!important;animation:sl-renewal-background-drift 18s ease infinite!important}
.sl-renewal-app:before{position:fixed!important;top:-12vh!important;left:-12vw!important;width:min(54vw,680px)!important;height:min(54vw,680px)!important;opacity:.68!important;background:radial-gradient(circle at 35% 35%,rgba(77,203,137,.68),rgba(115,230,187,.24) 40%,transparent 72%)!important;filter:blur(10px)!important;animation:sl-renewal-orb-green 16s ease-in-out infinite alternate!important}
.sl-renewal-app:after{position:fixed!important;right:-12vw!important;bottom:-15vh!important;width:min(58vw,760px)!important;height:min(58vw,760px)!important;opacity:.72!important;background:radial-gradient(circle at 50% 50%,rgba(111,133,255,.58),rgba(190,132,255,.26) 42%,transparent 72%)!important;filter:blur(12px)!important;animation:sl-renewal-orb-blue 20s ease-in-out infinite alternate!important}
.sl-renewal-main{position:relative;z-index:1}
@keyframes sl-renewal-background-drift{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
@keyframes sl-renewal-orb-green{0%{transform:translate3d(0,0,0) scale(.94)}100%{transform:translate3d(9vw,7vh,0) scale(1.12)}}
@keyframes sl-renewal-orb-blue{0%{transform:translate3d(0,0,0) scale(1)}100%{transform:translate3d(-8vw,-7vh,0) scale(1.13)}}
@media(prefers-reduced-motion:reduce){.sl-renewal-app,.sl-renewal-app:before,.sl-renewal-app:after{animation:none!important}}
.sl-renewal-main>.sl-section-card{border:1px solid #d7e8da!important;border-top:4px solid #599c56!important;box-shadow:0 16px 45px rgba(42,84,48,.08)!important;background:rgba(255,255,255,.96)!important}
.sl-renewal-main .sl-section-head h3{color:#174f35}
.sl-renewal-main .sl-analytics-metrics>span{background:linear-gradient(135deg,#f0f8f1,#f8fbf8)!important;border:1px solid #e1eee2;border-radius:12px;padding:16px!important}
.sl-renewal-main .sl-analytics-metrics>span:nth-child(2){background:linear-gradient(135deg,#eef4ff,#f8faff)!important;border-color:#dce7ff}
.sl-renewal-main .sl-analytics-metrics>span:nth-child(3){background:linear-gradient(135deg,#fff6e7,#fffbf4)!important;border-color:#f6e5c4}
.sl-renewal-main .sl-analytics-metrics>span:nth-child(4){background:linear-gradient(135deg,#f5f0ff,#fcfaff)!important;border-color:#e8ddff}
.sl-renewal-main .sl-analytics-metrics b{color:#183f32}
.sl-renewal-main .sl-renewal-main .sl-section-card{background:#fff}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card{position:relative;overflow:hidden;border:1px solid #dce9de!important;box-shadow:0 8px 24px rgba(40,80,48,.06)!important;background:linear-gradient(155deg,#ffffff 0%,#f6fbf6 100%)!important}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card:nth-child(2){background:linear-gradient(155deg,#ffffff 0%,#f2f5ff 100%)!important;border-color:#dce3fb!important}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card:before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:#599c56}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card:nth-child(2):before{background:#6478d9}
.sl-renewal-main article.sl-section-card .sl-kicker{color:#3555a5}
.sl-renewal-main article.sl-section-card h2{color:#194a36}
.sl-renewal-main article.sl-section-card .sl-button{background:#599c56!important;border-color:#599c56!important;color:#fff!important;box-shadow:0 4px 12px rgba(89,156,86,.2)}
.sl-renewal-main article.sl-section-card:nth-child(2) .sl-button{background:#5368c9!important;border-color:#5368c9!important;box-shadow:0 4px 12px rgba(83,104,201,.2)}
.sl-renewal-main .sl-section-head .sl-button{background:#edf5ee;border-color:#d9e8da;color:#245238}
.sl-renewal-main h4{color:#214c37}
.sl-renewal-main .sl-section-card>div[role="alert"]{background:linear-gradient(110deg,#fff0ef,#fff7e9)!important;border-color:#ffc9b8!important;color:#a8322a!important;box-shadow:0 5px 16px rgba(196,61,61,.05)}
.sl-renewal-main .sl-section-card>div[role="alert"] svg{flex-shrink:0}
@media(max-width:640px){.sl-renewal-main>.sl-section-card{padding:18px!important}.sl-renewal-main .sl-analytics-metrics>span{padding:14px!important}}
.sl-renewal-app{position:relative;isolation:isolate;overflow:hidden}
.sl-renewal-app:before,.sl-renewal-app:after{content:"";position:fixed;z-index:-1;pointer-events:none;width:340px;height:340px;border-radius:50%;filter:blur(2px);opacity:.45;animation:sl-renewal-float 12s ease-in-out infinite alternate}
.sl-renewal-app:before{top:10%;left:-180px;background:radial-gradient(circle,#a7e7bd 0%,rgba(167,231,189,0) 70%)}
.sl-renewal-app:after{right:-170px;bottom:4%;background:radial-gradient(circle,#b8c7ff 0%,rgba(184,199,255,0) 70%);animation-delay:-5s}
.sl-renewal-main>.sl-workspace-top{animation:sl-renewal-rise .55s cubic-bezier(.2,.7,.2,1) both}
.sl-renewal-main .sl-workspace-top h1{background:linear-gradient(100deg,#214d36 0%,#599c56 42%,#5368c9 82%);background-size:200% auto;-webkit-background-clip:text;background-clip:text;color:transparent;animation:sl-renewal-shimmer 7s ease-in-out infinite}
.sl-renewal-main>.sl-section-card{animation:sl-renewal-rise .7s .08s cubic-bezier(.2,.7,.2,1) both}
.sl-renewal-main .sl-analytics-metrics>span{transition:transform .22s ease,box-shadow .22s ease,border-color .22s ease;animation:sl-renewal-rise .5s both}
.sl-renewal-main .sl-analytics-metrics>span:nth-child(1){animation-delay:.08s}
.sl-renewal-main .sl-analytics-metrics>span:nth-child(2){animation-delay:.14s}
.sl-renewal-main .sl-analytics-metrics>span:nth-child(3){animation-delay:.2s}
.sl-renewal-main .sl-analytics-metrics>span:nth-child(4){animation-delay:.26s}
.sl-renewal-main .sl-analytics-metrics>span:hover{transform:translateY(-3px);box-shadow:0 10px 22px rgba(45,83,55,.09);border-color:#b8d8bc}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card{animation:sl-renewal-rise .6s cubic-bezier(.2,.7,.2,1) both;transition:transform .25s ease,box-shadow .25s ease}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card:nth-child(1){animation-delay:.2s}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card:nth-child(2){animation-delay:.3s}
.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card:hover{transform:translateY(-5px);box-shadow:0 18px 35px rgba(43,78,56,.12)!important}
.sl-renewal-main article.sl-section-card .sl-button{transition:transform .18s ease,filter .18s ease,box-shadow .18s ease}
.sl-renewal-main article.sl-section-card .sl-button:hover:not(:disabled){transform:translateY(-2px);filter:saturate(1.12) brightness(1.03);box-shadow:0 8px 20px rgba(70,119,78,.25)}
.sl-renewal-main article.sl-section-card .sl-button:active:not(:disabled){transform:translateY(0) scale(.98)}
.sl-renewal-main .sl-section-head .sl-button{transition:transform .18s ease,background .18s ease}
.sl-renewal-main .sl-section-head .sl-button:hover:not(:disabled){transform:translateY(-1px);background:#dcefe0}
.sl-renewal-main .sl-section-card>div[role="alert"]{animation:sl-renewal-alert-in .45s ease-out both}
@keyframes sl-renewal-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
@keyframes sl-renewal-float{from{transform:translate3d(0,-12px,0) scale(.96)}to{transform:translate3d(18px,18px,0) scale(1.06)}}
@keyframes sl-renewal-shimmer{0%,100%{background-position:0% center}50%{background-position:100% center}}
@keyframes sl-renewal-alert-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
@media(prefers-reduced-motion:reduce){.sl-renewal-app:before,.sl-renewal-app:after,.sl-renewal-main>.sl-workspace-top,.sl-renewal-main .sl-workspace-top h1,.sl-renewal-main>.sl-section-card,.sl-renewal-main .sl-analytics-metrics>span,.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card,.sl-renewal-main .sl-section-card>div[role="alert"]{animation:none!important;transition:none!important}.sl-renewal-main .sl-analytics-metrics>span:hover,.sl-renewal-main>.sl-section-card>div[style*="grid-template-columns"]>article.sl-section-card:hover,.sl-renewal-main article.sl-section-card .sl-button:hover{transform:none!important}}

`}</style>
        <main className="sl-main sl-renewal-main">
          <header className="sl-workspace-top">
            <div>
              <span className="sl-kicker">SELLORA WORKSPACE</span>
              <h1>Renew your subscription</h1>
            </div>
            <button className="sl-button sl-button-outline" onClick={signOut}>
              <LogOut size={15} /> Sign out
            </button>
          </header>
          <SubscriptionSection
            token={access}
            onRenewed={async () => {
              await load(access);
              setSubscriptionLocked(false);
            }}
          />
        </main>
      </div>
    );
  if (!business)
    return (
      <OnboardingScreen
        bform={bform}
        setBform={setBform}
        error={error}
        busy={busy}
        createBusiness={createBusiness}
        signOut={signOut}
      />
    );
  const category =
    cats.find((c) => c[0] === business.productCategory)?.[1] || "Products";
  const filteredOrders = orders
    .filter((order: any) => {
      const q = orderSearch.trim().toLowerCase();
      const searchable = [
        order.orderNumber,
        order.id,
        order.customerName,
        order.phone,
        order.email,
        order.address,
        order.catalogue?.title,
        ...(order.items || []).map((item: any) => item.productName),
      ]
        .join(" ")
        .toLowerCase();
      return (
        (!q || searchable.includes(q)) &&
        (orderStatusFilter === "ALL" ||
          order.status === orderStatusFilter ||
          order.paymentStatus === orderStatusFilter)
      );
    })
    .sort((a: any, b: any) =>
      orderSort === "oldest"
        ? Date.parse(a.createdAt) - Date.parse(b.createdAt)
        : orderSort === "amount-high"
          ? Number(b.totalAmount ?? b.subtotal ?? 0) -
            Number(a.totalAmount ?? a.subtotal ?? 0)
          : orderSort === "amount-low"
            ? Number(a.totalAmount ?? a.subtotal ?? 0) -
              Number(b.totalAmount ?? b.subtotal ?? 0)
            : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    );

  const exportOrdersCsv = () => {
    const columns = [
      "Order number",
      "Created at",
      "Customer",
      "Phone",
      "Email",
      "Catalogue",
      "Product",
      "SKU",
      "Quantity",
      "Unit",
      "Unit price",
      "Line total",
      "Subtotal",
      "Tax",
      "Total",
      "Currency",
      "Order status",
      "Payment status",
      "Delivery address",
      "Notes",
      "Razorpay order ID",
      "Razorpay payment ID",
    ];
    const rows = orders.flatMap((order: any) =>
      (order.items?.length
        ? order.items
        : [
            {
              productName: "",
              sku: "",
              quantity: "",
              unit: "",
              unitPrice: "",
              lineTotal: "",
            },
          ]
      ).map((item: any) => [
        order.orderNumber || order.id,
        order.createdAt
          ? new Date(order.createdAt).toLocaleString("en-IN")
          : "",
        order.customerName,
        order.phone || "",
        order.email || "",
        order.catalogue?.title || "",
        item.productName || "",
        item.sku || "",
        item.quantity,
        item.unit || "",
        item.unitPrice || "",
        item.lineTotal || "",
        order.subtotal ?? "",
        order.taxAmount ?? "0",
        order.totalAmount ?? order.subtotal ?? "",
        order.currency || "INR",
        order.status || "",
        order.paymentStatus || "",
        order.address || "",
        order.notes || "",
        order.razorpayOrderId || "",
        order.razorpayPaymentId || "",
      ]),
    );
    const csv = [columns, ...rows]
      .map((row) =>
        row
          .map((v: any) => '"' + String(v ?? "").replace(/"/g, '""') + '"')
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "sellora-orders.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  async function updateOrderStatus(order: any, status: string) {
    if (!order.id || String(order.id).startsWith("payment-")) {
      setError(
        "This legacy payment record does not support fulfilment status changes.",
      );
      return;
    }
    try {
      const updated = await api(
        "/workspace/orders/" + encodeURIComponent(order.id) + "/status",
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
      );
      setOrders((old) =>
        old.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setNotice(
        "Order " +
          updated.orderNumber +
          " updated to " +
          updated.status.toLowerCase() +
          ".",
      );
      setError("");
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not update order status.",
      );
    }
  }

  async function editOrderDetails(order: any) {
    if (String(order.id).startsWith("payment-")) {
      setError("Legacy payment records cannot be edited here.");
      return;
    }
    const customerName = window.prompt(
      "Customer name",
      order.customerName || "",
    );
    if (customerName === null) return;
    const phone = window.prompt("Customer phone", order.phone || "");
    if (phone === null) return;
    const email = window.prompt("Customer email", order.email || "");
    if (email === null) return;
    const address = window.prompt("Delivery address", order.address || "");
    if (address === null) return;
    const notes = window.prompt("Order notes", order.notes || "");
    if (notes === null) return;
    try {
      const updated = await api(
        "/workspace/orders/" + encodeURIComponent(order.id),
        {
          method: "PATCH",
          body: JSON.stringify({ customerName, phone, email, address, notes }),
        },
      );
      setOrders((old) =>
        old.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
      );
      setNotice("Order details updated.");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not edit order.");
    }
  }

  async function refundOrder(order: any) {
    if (
      !window.confirm(
        "Submit a full refund for " +
          (order.orderNumber || order.id) +
          " through Razorpay?",
      )
    )
      return;
    try {
      const result = await api(
        "/workspace/orders/" + encodeURIComponent(order.id) + "/refund",
        { method: "POST" },
      );
      setOrders((old) =>
        old.map((item) =>
          item.id === order.id
            ? { ...item, refundStatus: result.refundStatus }
            : item,
        ),
      );
      setNotice(result.message || "Refund submitted.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit refund.");
    }
  }

  const downloadBulkDeliverySlips = () => {
    if (!filteredOrders.length) {
      setNotice("There are no orders matching the current filters.");
      return;
    }
    const esc = (value: any) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char] || char,
      );
    const slips = filteredOrders
      .map((order: any) => {
        const itemRows = (order.items || [])
          .map(
            (item: any) =>
              `<tr><td>${esc(item.productName)}</td><td>${esc(item.sku || "—")}</td><td>${esc(item.quantity)} ${esc(item.unit || "")}</td></tr>`,
          )
          .join("");
        return `<section class="slip">
        <div class="top"><div><h1>${esc(business.name || "Delivery Slip")}</h1><p class="muted">DELIVERY SLIP · NOT A TAX INVOICE</p></div><div><p><b>Order:</b> ${esc(order.orderNumber || order.id)}</p><p><b>Date:</b> ${esc(order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "—")}</p></div></div>
        <div class="box"><h2>SHIP TO</h2><p class="address">${esc(order.customerName || "Customer")}</p><p>${esc(order.address || "Delivery address not provided")}</p><p><b>Phone:</b> ${esc(order.phone || "—")}</p><p><b>Email:</b> ${esc(order.email || "—")}</p></div>
        <h2>ITEMS TO DISPATCH</h2><table><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th></tr></thead><tbody>${itemRows || "<tr><td colspan='3'>No item details available</td></tr>"}</tbody></table>
        ${order.notes ? `<div class="box"><h2>ORDER NOTES</h2><p>${esc(order.notes)}</p></div>` : ""}
        <div class="footer">Please verify items and quantities before dispatch. Order status: ${esc(order.status || "—")} · Payment status: ${esc(order.paymentStatus || "—")}</div>
      </section>`;
      })
      .join("");
    const popup = window.open("", "_blank", "width=900,height=900");
    if (!popup) {
      window.alert("Please allow pop-ups to download the bulk delivery slips.");
      return;
    }
    popup.document
      .write(`<!doctype html><html><head><meta charset="utf-8"><title>Bulk delivery slips</title><style>
      body{font:14px Arial,sans-serif;color:#172b25;margin:24px}h1{font-size:22px;margin:0 0 5px}h2{font-size:15px;margin:24px 0 10px}p{margin:5px 0;line-height:1.5}.muted{color:#68766d;font-size:12px}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #dce5da;padding-bottom:16px}.box{border:1px solid #dce5da;border-radius:8px;padding:14px;margin-top:16px}.address{white-space:pre-wrap;font-size:16px;font-weight:600;line-height:1.6}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;border-bottom:1px solid #e4e9e4;padding:10px 8px}th{background:#f4f7f1;font-size:11px;text-transform:uppercase}.footer{margin-top:32px;border-top:1px solid #dce5da;padding-top:12px;font-size:11px;color:#68766d}.slip{break-after:page;page-break-after:always}.slip:last-of-type{break-after:auto;page-break-after:auto}.no-print{margin:0 0 20px}@media print{body{margin:12mm}.no-print{display:none}.slip{break-after:page;page-break-after:always}.slip:last-of-type{break-after:auto;page-break-after:auto}}</style></head><body>
      <p class="no-print"><b>${filteredOrders.length} delivery slips</b> · Use your browser's print dialog and choose “Save as PDF” to download them as one PDF. <button onclick="window.print()">Print / Save as PDF</button></p>
      ${slips}<script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };

  const printDeliverySlip = (order: any) => {
    const esc = (value: any) =>
      String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char] || char,
      );
    const itemRows = (order.items || [])
      .map(
        (item: any) =>
          `<tr><td>${esc(item.productName)}</td><td>${esc(item.sku || "—")}</td><td>${esc(item.quantity)} ${esc(item.unit || "")}</td></tr>`,
      )
      .join("");
    const popup = window.open("", "_blank", "width=800,height=900");
    if (!popup) {
      window.alert("Please allow pop-ups to print the delivery slip.");
      return;
    }
    popup.document
      .write(`<!doctype html><html><head><meta charset="utf-8"><title>Delivery slip - ${esc(order.orderNumber || order.id)}</title><style>
      body{font:14px Arial,sans-serif;color:#172b25;margin:32px}h1{font-size:22px;margin:0 0 5px}h2{font-size:15px;margin:24px 0 10px}p{margin:5px 0;line-height:1.5}.muted{color:#68766d;font-size:12px}.top{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #dce5da;padding-bottom:16px}.box{border:1px solid #dce5da;border-radius:8px;padding:14px;margin-top:16px}.address{white-space:pre-wrap;font-size:16px;font-weight:600;line-height:1.6}table{width:100%;border-collapse:collapse;margin-top:8px}th,td{text-align:left;border-bottom:1px solid #e4e9e4;padding:10px 8px}th{background:#f4f7f1;font-size:11px;text-transform:uppercase}.footer{margin-top:32px;border-top:1px solid #dce5da;padding-top:12px;font-size:11px;color:#68766d}@media print{body{margin:12mm}.no-print{display:none}}</style></head><body>
      <div class="top"><div><h1>${esc(business.name || "Delivery Slip")}</h1><p class="muted">DELIVERY SLIP · NOT A TAX INVOICE</p></div><div><p><b>Order:</b> ${esc(order.orderNumber || order.id)}</p><p><b>Date:</b> ${esc(order.createdAt ? new Date(order.createdAt).toLocaleString("en-IN") : "—")}</p></div></div>
      <div class="box"><h2>SHIP TO</h2><p class="address">${esc(order.customerName || "Customer")}</p><p>${esc(order.address || "Delivery address not provided")}</p><p><b>Phone:</b> ${esc(order.phone || "—")}</p><p><b>Email:</b> ${esc(order.email || "—")}</p></div>
      <h2>ITEMS TO DISPATCH</h2><table><thead><tr><th>Product</th><th>SKU</th><th>Quantity</th></tr></thead><tbody>${itemRows || "<tr><td colspan='3'>No item details available</td></tr>"}</tbody></table>
      ${order.notes ? `<div class="box"><h2>ORDER NOTES</h2><p>${esc(order.notes)}</p></div>` : ""}
      <div class="footer">Please verify items and quantities before dispatch. Order status: ${esc(order.status || "—")} · Payment status: ${esc(order.paymentStatus || "—")}</div>
      <p class="no-print"><button onclick="window.print()">Print delivery slip</button></p><script>window.onload=()=>window.print()<\/script></body></html>`);
    popup.document.close();
  };
  return (
    <div className="sl-app">
      <aside className="sl-sidebar">
        <Brand />
        <span className="sl-workspace-label">{isTamil ? "பணியிடம்" : "WORKSPACE"}</span>
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
            { id: "overview", label: isTamil ? "கண்ணோட்டம்" : "Overview", icon: LayoutDashboard },
            { id: "products", label: isTamil ? "தயாரிப்புகள்" : "Products", icon: Package },
            { id: "catalogues", label: isTamil ? "பட்டியல்கள்" : "Catalogues", icon: BookOpen },
            { id: "orders", label: isTamil ? "ஆர்டர்கள்" : "Orders", icon: ClipboardList },
            { id: "customers", label: isTamil ? "வாடிக்கையாளர்கள்" : "Customers", icon: Users },
            { id: "reports", label: isTamil ? "அறிக்கைகள்" : "Reports", icon: BarChart3 },
            { id: "payments", label: isTamil ? "கட்டணங்கள்" : "Payments", icon: CreditCard },
            { id: "subscription", label: isTamil ? "சந்தா" : "Subscription", icon: CreditCard },
            { id: "settings", label: isTamil ? "அமைப்புகள்" : "Settings", icon: Settings },
          ].map((item) => (
            <button
              key={item.id}
              className={page === item.id ? "active" : ""}
              onClick={() => {
                setPage(item.id);
                setError("");
                if (item.id === "orders") {
                  api("/workspace/orders")
                    .then(setOrders)
                    .catch((e) =>
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Could not load orders",
                      ),
                    );
                }
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
                    : page === "orders"
                      ? "Customer orders"
                      : page === "customers"
                        ? "Customer directory"
                        : page === "reports"
                          ? "Sales reports"
                          : page === "settings"
                            ? "Business settings"
                            : page === "payments"
                              ? "Payments"
                              : page === "subscription"
                                ? "Subscription & billing"
                                : "Workspace"}
            </h1>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}><button type="button" className="sl-button sl-outline" onClick={() => { const next = new URL(window.location.href); next.searchParams.set("uiLanguage", next.searchParams.get("uiLanguage") === "ta" ? "en" : "ta"); window.history.replaceState(null, "", next.toString()); window.dispatchEvent(new CustomEvent("sellora-language-change", {detail: next.searchParams.get("uiLanguage")})); }}>{new URLSearchParams(window.location.search).get("uiLanguage") === "ta" ? "English" : "தமிழ்"}</button><span className="sl-online-dot">● Workspace active</span></div>
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
            <section
              className="sl-welcome-compact"
              aria-label="Workspace quick actions"
            >
              <div className="sl-add-product-panel">
                <span className="sl-compact-panel-icon">
                  <Plus size={20} />
                </span>
                <div className="sl-compact-panel-copy">
                  <strong>Make your next sale with Sellora</strong>
                  <span>
                    Bring your products together in a beautiful digital
                    catalogue, ready to share with every customer.
                  </span>
                </div>
                <div className="sl-product-banner-animation" aria-hidden="true">
                  <span className="sl-product-orbit sl-product-orbit-one">
                    <Package size={18} />
                  </span>
                  <span className="sl-product-orbit sl-product-orbit-two">
                    <Plus size={13} />
                  </span>
                  <span className="sl-product-orbit sl-product-orbit-three" />
                  <span className="sl-product-animation-core">
                    <Package size={26} />
                  </span>
                  <span className="sl-product-spark sl-product-spark-one">
                    ✦
                  </span>
                  <span className="sl-product-spark sl-product-spark-two">
                    ✧
                  </span>
                </div>
                <Btn
                  onClick={() => {
                    setPage("products");
                    startProduct();
                  }}
                >
                  <Plus size={16} /> Add product
                </Btn>
              </div>
            </section>
            <section className="sl-stat-grid" aria-label="Business analytics">
              <div>
                <span>ORDERS TODAY</span>
                <ClipboardList />
                <strong>
                  {
                    orders.filter(
                      (o: any) =>
                        new Date(o.createdAt).toLocaleDateString("en-CA", {
                          timeZone: "Asia/Kolkata",
                        }) ===
                        new Date().toLocaleDateString("en-CA", {
                          timeZone: "Asia/Kolkata",
                        }),
                    ).length
                  }
                </strong>
                <small>Orders created today</small>
              </div>
              <div>
                <span>PAYMENTS RECEIVED TODAY</span>
                <CreditCard />
                <strong>
                  {formatCurrency(
                    orders
                      .filter(
                        (o: any) =>
                          o.paymentStatus === "PAID" &&
                          o.paidAt &&
                          new Date(o.paidAt).toLocaleDateString("en-CA", {
                            timeZone: "Asia/Kolkata",
                          }) ===
                            new Date().toLocaleDateString("en-CA", {
                              timeZone: "Asia/Kolkata",
                            }),
                      )
                      .reduce(
                        (sum: number, o: any) =>
                          sum + Number(o.totalAmount ?? o.subtotal ?? 0),
                        0,
                      ),
                    "INR",
                  )}
                </strong>
                <small>Verified payments received today</small>
              </div>
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
                  {
                    catalogues.filter((catalogue) => catalogue.isPublished)
                      .length
                  }{" "}
                  published
                </small>
              </div>
              <div>
                <span>ENQUIRIES TODAY</span>
                <MessageSquare />
                <strong>
                  {
                    overviewEnquiries.filter(
                      (item: any) =>
                        new Date(item.createdAt).toLocaleDateString("en-CA", {
                          timeZone: "Asia/Kolkata",
                        }) ===
                        new Date().toLocaleDateString("en-CA", {
                          timeZone: "Asia/Kolkata",
                        }),
                    ).length
                  }
                </strong>
                <small>Customer enquiries received today</small>
              </div>
              <div>
                <span>TOTAL CUSTOMERS</span>
                <Users />
                <strong>{overviewCustomers.length}</strong>
                <small>In your customer directory</small>
              </div>
            </section>

            <OverviewPaymentActivity />
          </>
        )}
        {page === "products" && (
          <ProductSection
            category={category}
            products={products}
            access={access}
            onImported={load}
            startProduct={startProduct}
            deleteProduct={deleteProduct}
            uploadProductImage={uploadProductImage}
            removeProductImage={removeProductImage}
          />
        )}
        {page === "catalogues" && (
          <CatalogueSection
            business={business}
            products={products}
            catalogues={catalogues}
            setCform={setCform}
            setEditingCatalogue={setEditingCatalogue}
            setError={setError}
            setModal={setModal}
            setPreview={setPreview}
            editCatalogue={editCatalogue}
            publish={publish}
            share={share}
            shareWhatsApp={shareWhatsApp}
            analytics={analytics}
            analyticsBusy={analyticsBusy}
            loadAnalytics={async (catalogue) => {
              setAnalyticsBusy(catalogue.id);
              try {
                const result = await api(
                  "/workspace/catalogues/" + catalogue.id + "/analytics",
                );
                setAnalytics((old) => ({ ...old, [catalogue.id]: result }));
              } catch (e) {
                setError(
                  e instanceof Error
                    ? e.message
                    : "Could not load catalogue analytics",
                );
              } finally {
                setAnalyticsBusy("");
              }
            }}
          />
        )}
        {page === "orders" && (
          <section className="sl-section-card sl-orders-page">
            <div className="sl-section-head">
              <div>
                <h3>Customer orders</h3>
                <p>
                  Order requests, customer details and item-level breakdowns.
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Btn
                  onClick={downloadBulkDeliverySlips}
                  disabled={!filteredOrders.length}
                >
                  <Download size={15} /> Download bulk delivery slips
                </Btn>
                <Btn onClick={exportOrdersCsv} disabled={!orders.length}>
                  <Download size={15} /> Export CSV
                </Btn>
                <Btn
                  onClick={async () => {
                    try {
                      setOrders(await api("/workspace/orders"));
                    } catch (e) {
                      setError(
                        e instanceof Error
                          ? e.message
                          : "Could not load orders",
                      );
                    }
                  }}
                >
                  <ArrowRight size={15} /> Refresh orders
                </Btn>
              </div>
            </div>
            <div className="sl-orders-filters">
              <label className="sl-orders-search">
                <Search size={20} />
                <input
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search customer, product or order ID"
                  aria-label="Search orders"
                />
              </label>
              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                aria-label="Filter order status"
              >
                <option value="ALL">All statuses</option>
                {Array.from(
                  new Set(
                    orders
                      .flatMap((o: any) => [o.status, o.paymentStatus])
                      .filter(Boolean),
                  ),
                ).map((status: any) => (
                  <option key={status} value={status}>
                    {String(status).replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <select
                value={orderSort}
                onChange={(e) => setOrderSort(e.target.value)}
                aria-label="Sort orders"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="amount-high">Amount: high to low</option>
                <option value="amount-low">Amount: low to high</option>
              </select>
            </div>
            {!orders.length ? (
              <div className="sl-orders-empty">
                <ClipboardList size={32} />
                <h3>No orders yet</h3>
                <p>
                  Orders submitted through your published online catalogue will
                  appear here.
                </p>
              </div>
            ) : (
              <div className="sl-orders-list">
                {filteredOrders.map((order: any) => (
                  <details className="sl-order-card" key={order.id}>
                    <summary>
                      <span>
                        <b>{order.orderNumber || order.id}</b>
                        <small>
                          {order.customerName} ·{" "}
                          {new Date(order.createdAt).toLocaleString()}
                        </small>
                      </span>
                      <span>
                        <b>
                          {money(
                            order.totalAmount ?? order.subtotal,
                            order.currency,
                          )}
                        </b>
                        <small>
                          {order.status} · {order.paymentStatus}
                        </small>
                      </span>
                      <ArrowRight size={16} />
                    </summary>
                    <div className="sl-order-detail">
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                          flexWrap: "wrap",
                          marginBottom: 12,
                        }}
                      >
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          Fulfilment status{" "}
                          <select
                            aria-label={
                              "Update status for order " +
                              (order.orderNumber || order.id)
                            }
                            className="sl-fulfilment-select"
                            style={{
                              appearance: "none",
                              WebkitAppearance: "none",
                              minHeight: 44,
                              minWidth: 154,
                              padding: "10px 38px 10px 14px",
                              border: "1px solid #dce5da",
                              borderRadius: 12,
                              backgroundColor: "#fff",
                              backgroundImage:
                                "url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2220%22 height=%2220%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23332f2f%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22%3E%3Cpath d=%22m6 9 6 6 6-6%22/%3E%3C/svg%3E')",
                              backgroundRepeat: "no-repeat",
                              backgroundPosition: "right 12px center",
                              color: "#332f2f",
                              font: "inherit",
                              fontWeight: 500,
                              lineHeight: 1.35,
                              boxShadow: "0 1px 2px rgba(28, 44, 33, 0.04)",
                              cursor:
                                ["DELIVERED", "CANCELLED"].includes(
                                  order.status,
                                ) || String(order.id).startsWith("payment-")
                                  ? "not-allowed"
                                  : "pointer",
                              outlineOffset: 2,
                            }}
                            value={order.status || "PENDING"}
                            disabled={
                              ["DELIVERED", "CANCELLED"].includes(
                                order.status,
                              ) || String(order.id).startsWith("payment-")
                            }
                            onChange={(e) =>
                              void updateOrderStatus(order, e.target.value)
                            }
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="PROCESSING">Processing</option>
                            <option value="DISPATCHED">Dispatched</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </label>
                        <div
                          style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                        >
                          <Btn
                            kind="outline"
                            onClick={() => void editOrderDetails(order)}
                            disabled={
                              ["DELIVERED", "CANCELLED", "DISPATCHED"].includes(
                                order.status,
                              ) || String(order.id).startsWith("payment-")
                            }
                          >
                            Edit details
                          </Btn>
                          {order.recordType !== "PAYMENT_ORDER" &&
                            order.paymentStatus === "PAID" &&
                            order.refundStatus !== "REFUNDED" && (
                              <Btn
                                kind="danger"
                                onClick={() => void refundOrder(order)}
                                disabled={order.refundStatus === "PENDING"}
                              >
                                {order.refundStatus === "PENDING"
                                  ? "Refund pending"
                                  : "Refund payment"}
                              </Btn>
                            )}
                          <Btn onClick={() => printDeliverySlip(order)}>
                            <Printer size={15} /> Print delivery slip
                          </Btn>
                        </div>
                      </div>
                      <div className="sl-order-customer">
                        <p>
                          <b>Customer</b>
                          <br />
                          {order.customerName}
                        </p>
                        <p>
                          <b>Phone</b>
                          <br />
                          {order.phone}
                        </p>
                        <p>
                          <b>Email</b>
                          <br />
                          {order.email || "Not provided"}
                        </p>
                        <p>
                          <b>Catalogue</b>
                          <br />
                          {order.catalogue?.title || "—"}
                        </p>
                        <p>
                          <b>Delivery address</b>
                          <br />
                          {order.address || "Not provided"}
                        </p>
                        <p>
                          <b>Notes</b>
                          <br />
                          {order.notes || "None"}
                        </p>
                      </div>
                      <div className="sl-order-totals">
                        <p>
                          <span>Subtotal</span>
                          <b>{money(order.subtotal, order.currency)}</b>
                        </p>
                        {Number(order.taxAmount || 0) > 0 && (
                          <p>
                            <span>Tax</span>
                            <b>{money(order.taxAmount, order.currency)}</b>
                          </p>
                        )}
                        <p className="grand">
                          <span>Total</span>
                          <b>
                            {money(
                              order.totalAmount ?? order.subtotal,
                              order.currency,
                            )}
                          </b>
                        </p>
                      </div>
                      <h4>Ordered items</h4>
                      {order.items.map((item: any) => (
                        <div className="sl-order-item" key={item.id}>
                          <span>
                            <b>{item.productName}</b>
                            <small>
                              {item.quantity} ×{" "}
                              {money(item.unitPrice, order.currency, item.unit)}
                            </small>
                          </span>
                          <strong>
                            {money(item.lineTotal, order.currency, item.unit)}
                          </strong>
                        </div>
                      ))}
                      <p className="sl-order-payment-note">
                        Payment is not verified by Sellora yet. Marking payment
                        complete requires a connected payment gateway.
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </section>
        )}
        {page === "analytics" && (
          <section className="sl-section-card sl-analytics-page">
            <div className="sl-section-head">
              <div>
                <h3>Performance by catalogue</h3>
                <p>
                  Catalogue visits, product opens, cart additions, checkout
                  starts, payment gateway launches and confirmed payments.
                </p>
              </div>
            </div>
            {!catalogues.length ? (
              <p>Create a catalogue to start seeing analytics.</p>
            ) : (
              <div className="sl-analytics-grid">
                {catalogues.map((c) => {
                  const m = analytics[c.id];
                  return (
                    <article className="sl-analytics-card" key={c.id}>
                      <div>
                        <span className="sl-kicker">
                          {c.isPublished ? "PUBLISHED" : "DRAFT"}
                        </span>
                        <h4>{c.title}</h4>
                        <small>{c.slug}</small>
                      </div>
                      <button
                        disabled={analyticsBusy === c.id}
                        onClick={async () => {
                          setAnalyticsBusy(c.id);
                          try {
                            const result = await api(
                              "/workspace/catalogues/" + c.id + "/analytics",
                            );
                            setAnalytics((old) => ({ ...old, [c.id]: result }));
                          } catch (e) {
                            setError(
                              e instanceof Error
                                ? e.message
                                : "Could not load analytics",
                            );
                          } finally {
                            setAnalyticsBusy("");
                          }
                        }}
                      >
                        {analyticsBusy === c.id
                          ? "Loading…"
                          : m
                            ? "Refresh metrics"
                            : "View analytics"}{" "}
                        <ArrowRight size={14} />
                      </button>
                      {m && (
                        <div className="sl-analytics-metrics">
                          <span>
                            <small>Catalogue opens</small>
                            <b>{m.views}</b>
                          </span>
                          <span>
                            <small>Unique visitors</small>
                            <b>{m.uniqueVisitors ?? 0}</b>
                          </span>
                          <span>
                            <small>Product details opened</small>
                            <b>{m.productOpens ?? 0}</b>
                          </span>
                          <span>
                            <small>Add to cart</small>
                            <b>{m.addToCart}</b>
                          </span>
                          <span>
                            <small>Checkout starts</small>
                            <b>{m.checkoutStarted}</b>
                          </span>
                          <span>
                            <small>Payment gateway opened</small>
                            <b>{m.paymentGatewayOpened ?? 0}</b>
                          </span>
                          <span>
                            <small>Orders submitted</small>
                            <b>{m.ordersSubmitted}</b>
                          </span>
                          <span>
                            <small>Orders recorded</small>
                            <b>{m.orders}</b>
                          </span>
                          <span>
                            <small>Payments confirmed</small>
                            <b>{m.paymentsConfirmed}</b>
                          </span>
                        </div>
                      )}
                      <div className="sl-analytics-share-actions">
                        <button
                          type="button"
                          onClick={async () => {
                            const url = window.location.origin + "/c/" + c.slug;
                            try {
                              if (navigator.share) {
                                await navigator.share({ title: c.title, url });
                                setCatalogueActionMessage(
                                  "Share dialog opened.",
                                );
                              } else {
                                await navigator.clipboard.writeText(url);
                                setCatalogueActionMessage(
                                  "Catalogue link copied.",
                                );
                              }
                            } catch (e) {
                              if (e instanceof Error && e.name === "AbortError")
                                return;
                              setError(
                                "Could not share the catalogue. Try copying the link instead.",
                              );
                            }
                          }}
                        >
                          <Share2 size={14} /> Share catalogue
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const url = window.location.origin + "/c/" + c.slug;
                            try {
                              await navigator.clipboard.writeText(url);
                              setCatalogueActionMessage(
                                "Catalogue link copied.",
                              );
                            } catch {
                              setError(
                                "Could not copy the link. Open the catalogue and copy its URL from your browser.",
                              );
                            }
                          }}
                        >
                          <Copy size={14} /> Copy link
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            window.open(
                              "/c/" + c.slug,
                              "_blank",
                              "noopener,noreferrer",
                            )
                          }
                        >
                          <ExternalLink size={14} /> Open in new tab
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
            {catalogueActionMessage && (
              <p className="sl-analytics-action-message" role="status">
                {catalogueActionMessage}
              </p>
            )}
            <p className="sl-analytics-disclaimer">
              Analytics begin after tracking is deployed. Payment completion
              stays at zero until a payment provider verifies successful
              transactions.
            </p>
          </section>
        )}
        {page === "payments" && (
          <PaymentsSection onSettings={() => setPage("settings")} />
        )}
        {page === "customers" && (
          <CustomersSection setError={setError} setNotice={setNotice} />
        )}
        {page === "reports" && <ReportsSection setError={setError} />}
        {page === "subscription" && (
          <SubscriptionSection
            token={access}
            onRenewed={async () => {
              await load(access);
              setSubscriptionLocked(false);
            }}
          />
        )}
        {page === "settings" && (
          <SettingsSection
            business={business}
            profileForm={profileForm}
            setProfileForm={setProfileForm}
            saveBusinessProfile={saveBusinessProfile}
            sellingMode={sellingMode}
            setSellingMode={setSellingMode}
            saveSellingMode={saveSellingMode}
            saveRazorpay={saveRazorpay}
            disconnectRazorpay={disconnectRazorpay}
            fields={fields}
            fieldForm={fieldForm}
            setFieldForm={setFieldForm}
            addIndustryField={addIndustryField}
            removeIndustryField={removeIndustryField}
            restoreIndustryFields={restoreIndustryFields}
            busy={busy}
            isPlatformOwner={isPlatformOwner}
          />
        )}
        <footer className="sl-workspace-footer">
          Sellora · Digital Catalogues. Smarter Sales.{" "}
        </footer>
      </main>
      {modal === "product" && (
        <ProductModal
          category={category}
          error={error}
          editing={editing}
          pform={pform}
          setPform={setPform}
          fields={fields}
          busy={busy}
          setModal={setModal}
          uploadProductPhoto={uploadProductPhoto}
          saveProduct={saveProduct}
        />
      )}
      {modal === "catalogue" && (
        <CatalogueModal
          error={error}
          editingCatalogue={editingCatalogue}
          cform={cform}
          setCform={setCform}
          products={products}
          busy={busy}
          setModal={setModal}
          saveCatalogue={saveCatalogue}
        />
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
    sellingMode: "CATALOG_ONLY",
    paymentGatewayStatus: "NOT_CONNECTED",
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
