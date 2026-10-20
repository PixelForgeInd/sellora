import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Brand } from "./ui";
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  MessageCircle,
  Package,
  X,
} from "lucide-react";
import { formatMoney as money } from "../sellora/formatters";
import { api } from "../sellora/api-client";
import type { Product, PublicData } from "../sellora/types";

export function PublicCatalogue({
  data,
  error,
  demo = false,
}: {
  data: PublicData | null;
  error: string;
  demo?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [details, setDetails] = useState<Product | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<
    "cart" | "details" | "success"
  >("cart");
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [checkoutNotes, setCheckoutNotes] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryEmail, setEnquiryEmail] = useState("");
  const [enquiryPhone, setEnquiryPhone] = useState("");
  const [enquiryCompany, setEnquiryCompany] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [enquiryProductId, setEnquiryProductId] = useState("");
  const [enquiryBusy, setEnquiryBusy] = useState(false);
  const [enquirySuccess, setEnquirySuccess] = useState("");
  const [enquiryError, setEnquiryError] = useState("");
  const [orderConfirmation, setOrderConfirmation] = useState<{
    orderNumber: string;
    subtotal: string;
    taxAmount: string;
    total: string;
    taxRate: string;
    currency: string;
    items: {
      name: string;
      sku: string;
      quantity: number;
      unit: string;
      unitPrice: string;
      lineTotal: string;
    }[];
  } | null>(null);
  const products = data?.products || [];
  const isOutOfStock = (p: Product) =>
    Boolean(p.stockEnabled) &&
    (p.stockQuantity == null || Number(p.stockQuantity) <= 0);
  const productCategory = (p: Product) =>
    String(
      p.fields?.category ||
        p.fields?.collection ||
        p.fields?.type ||
        p.fields?.yarnType ||
        data?.business.industry ||
        "Products",
    );
  const categories = Array.from(
    new Set(["All products", ...products.map(productCategory)]),
  );
  const filtered = products.filter(
    (p) =>
      (category === "All products" || productCategory(p) === category) &&
      [
        p.name,
        p.description,
        p.sku,
        ...Object.values(p.fields || {}).map(String),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  const wa = data?.business.phone
    ? "https://wa.me/" +
      data.business.phone.replace(/\D/g, "") +
      "?text=" +
      encodeURIComponent(
        "Hi " + data.business.name + ", I'm interested in your products.",
      )
    : "#contact";
  const publicUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText =
    "View " +
    (data?.title || "catalogue") +
    " from " +
    (data?.business.name || "our business") +
    ": " +
    publicUrl;
  const shareCatalogue = () => {
    window.open(
      "https://wa.me/?text=" + encodeURIComponent(shareText),
      "_blank",
      "noopener,noreferrer",
    );
  };
  const startEnquiry = (productId = "") => {
    setEnquiryProductId(productId);
    setEnquiryError("");
    setEnquirySuccess("");
    setDetails(null);
    window.location.hash = "enquiry-form";
    window.setTimeout(() => {
      document
        .getElementById("enquiry-form")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };
  const copyCatalogue = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      window.alert(
        "Catalogue link copied. Paste it into WhatsApp or any chat.",
      );
    } catch {
      window.prompt("Copy your catalogue link", publicUrl);
    }
  };

  const cartProducts = products.filter((p) => (cart[p.id] || 0) > 0);
  const cartTotal = cartProducts.reduce(
    (sum, p) => sum + Number(p.price || 0) * (cart[p.id] || 0),
    0,
  );
  const addToCart = (p: Product) =>
    setCart((old) => ({
      ...old,
      [p.id]: Math.min(1000, (old[p.id] || 0) + 1),
    }));
  const setCartQty = (id: string, n: number) =>
    setCart((old) => {
      const next = { ...old };
      if (n < 1) delete next[id];
      else next[id] = Math.min(1000, n);
      return next;
    });
  const recordEvent = (
    eventType:
      | "add_to_cart"
      | "checkout_started"
      | "page_view"
      | "product_opened"
      | "payment_gateway_opened",
    metadata?: Record<string, string | number | boolean>,
  ) => {
    if (!data || demo) return;
    try {
      const key = "sellora_session_" + data.slug;
      let sessionId = sessionStorage.getItem(key);
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        sessionStorage.setItem(key, sessionId);
      }
      void api(
        "/public/catalogues/" + encodeURIComponent(data.slug) + "/events",
        {
          method: "POST",
          body: JSON.stringify({ eventType, sessionId, metadata }),
        },
        "",
      ).catch(() => {});
    } catch {}
  };
  const openProduct = (p: Product) => {
    setDetails(p);
    recordEvent("product_opened", { productId: p.id, productName: p.name });
  };
  useEffect(() => {
    if (data && !demo) recordEvent("page_view");
  }, [data?.slug, demo]);
  const openCart = () => {
    setCheckoutStep("cart");
    setCheckoutError("");
    setCartOpen(true);
  };
  const startCheckout = () => {
    if (!cartProducts.length) {
      setCheckoutError("Add at least one product to your cart.");
      return;
    }
    setCheckoutStep("details");
    setCheckoutError("");
    recordEvent("checkout_started");
  };
  const buyNow = async () => {
    if (!data || !data.checkoutReady || demo) return;
    if (
      customerName.trim().length < 2 ||
      customerPhone.replace(/\D/g, "").length < 7 ||
      customerAddress.trim().length < 5
    ) {
      setCheckoutError(
        "Enter your name, valid phone number and delivery address.",
      );
      return;
    }
    setCheckoutBusy(true);
    setCheckoutError("");
    try {
      const result = await api(
        "/public/catalogues/" + encodeURIComponent(data.slug) + "/orders",
        {
          method: "POST",
          body: JSON.stringify({
            customerName: customerName.trim(),
            email: customerEmail.trim(),
            phone: customerPhone.trim(),
            address: customerAddress.trim(),
            notes: checkoutNotes.trim(),
            items: cartProducts.map((p) => ({
              productId: p.id,
              quantity: cart[p.id],
            })),
          }),
        },
        "",
      );
      if (!result?.checkout?.keyId || !result?.checkout?.razorpayOrderId)
        throw new Error(
          "Checkout could not be initialized. Please contact the business.",
        );
      if (!(window as any).Razorpay)
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://checkout.razorpay.com/v1/checkout.js";
          script.onload = () => resolve();
          script.onerror = () =>
            reject(new Error("Could not load secure checkout."));
          document.body.appendChild(script);
        });
      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) throw new Error("Razorpay Checkout did not load.");
      const checkout = new RazorpayCtor({
        key: result.checkout.keyId,
        amount: result.checkout.amount,
        currency: result.checkout.currency,
        name: result.checkout.name,
        description: result.checkout.description,
        order_id: result.checkout.razorpayOrderId,
        prefill: result.checkout.prefill,
        theme: { color: data.business.brandColor },
        modal: { ondismiss: () => setCheckoutBusy(false) },
        handler: async (response: any) => {
          try {
            const verified = await api(
              "/public/catalogues/" +
                encodeURIComponent(data.slug) +
                "/payments/verify",
              {
                method: "POST",
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              },
              "",
            );
            if (!verified.success)
              throw new Error(
                verified.message ||
                  "Payment is still processing. Please check with the business before retrying.",
              );
            setOrderConfirmation({
              orderNumber: verified.orderNumber || result.orderNumber,
              subtotal: String(result.subtotal),
              taxAmount: String(result.taxAmount || "0"),
              total: String(result.total || result.subtotal),
              taxRate: String(result.taxRate || "0"),
              currency: result.checkout.currency,
              items: cartProducts.map((p) => ({
                name: p.name,
                sku: p.sku || "",
                quantity: cart[p.id] || 0,
                unit: p.unit || "piece",
                unitPrice: String(p.price || "0"),
                lineTotal: String(Number(p.price || 0) * (cart[p.id] || 0)),
              })),
            });
            setCart({});
            setCheckoutStep("success");
            setCheckoutBusy(false);
          } catch (err) {
            setCheckoutError(
              err instanceof Error
                ? err.message
                : "Payment verification failed. Contact the business before retrying.",
            );
            setCheckoutBusy(false);
          }
        },
      });
      checkout.open();
      recordEvent("payment_gateway_opened", {
        orderNumber: result.orderNumber || "",
      });
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not start checkout.",
      );
      setCheckoutBusy(false);
    }
  };
  if (error)
    return (
      <div className="sl-public-error">
        <Brand />
        <h1>Catalogue unavailable</h1>
        <p>{error}</p>
        <a href="/">
          Create your catalogue with Sellora <ArrowRight size={15} />
        </a>
      </div>
    );
  if (!data)
    return (
      <div className="sl-public-loading">
        <Brand />
        <p>Loading catalogue…</p>
      </div>
    );
  return (
    <div
      className="sl-storefront"
      style={{ "--store-brand": data.business.brandColor } as CSSProperties}
    >
      <style>{`
        .sl-storefront .sl-store-quote,
        .sl-storefront .sl-store-secondary,
        .sl-storefront .sl-store-whatsapp,
        .sl-storefront .sl-store-cart-cta,
        .sl-storefront .sl-store-enquire,
        .sl-storefront .sl-store-contact-primary,
        .sl-storefront .sl-store-contact-secondary,
        .sl-storefront .sl-store-product-arrow,
        .sl-storefront .sl-store-header-cart,
        .sl-storefront .sl-checkout-remove,
        .sl-storefront .sl-store-detail-close {
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          letter-spacing: 0.01em;
          line-height: 1.25;
          -webkit-font-smoothing: antialiased;
        }
        .sl-storefront .sl-store-enquiry-submit {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: 54px;
          padding: 14px 22px;
          border: 1px solid #147b49;
          border-radius: 14px;
          background: #147b49;
          color: #fff;
          box-shadow: 0 8px 18px rgba(20, 123, 73, 0.12);
          font-family: inherit;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.01em;
          line-height: 1.25;
          -webkit-font-smoothing: antialiased;
          cursor: pointer;
          transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .sl-storefront .sl-store-enquiry-submit:hover:not(:disabled) {
          background: #10683f;
          box-shadow: 0 10px 22px rgba(20, 123, 73, 0.18);
          transform: translateY(-1px);
        }
        .sl-storefront .sl-store-enquiry-submit:active:not(:disabled) {
          transform: translateY(0);
        }
        .sl-storefront .sl-store-enquiry-submit:disabled {
          opacity: 0.68;
          cursor: wait;
          box-shadow: none;
        }
        .sl-storefront .sl-store-out-of-stock-message + .sl-store-enquire {
          display: inline-flex;
          color: #ffffff !important;
          font-size: 14px !important;
          text-indent: 0 !important;
          opacity: 1 !important;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          min-height: 48px;
          margin-top: 12px;
          padding: 12px 18px;
          border: 1px solid #147b49;
          border-radius: 12px;
          background: #147b49;
          color: #fff;
          box-shadow: 0 6px 16px rgba(20, 123, 73, 0.14);
          cursor: pointer;
        }
        .sl-storefront .sl-store-out-of-stock-enquire-label {
          display: inline !important;
          visibility: visible !important;
          color: #ffffff !important;
          font-size: 14px !important;
          line-height: 1.25 !important;
          opacity: 1 !important;
        }
        .sl-storefront .sl-store-out-of-stock-message + .sl-store-enquire:hover {
          background: #10683f;
          border-color: #10683f;
        }
        .sl-storefront .sl-store-detail-content > .sl-store-contact-primary + .sl-store-out-of-stock-message,
        .sl-storefront .sl-store-detail-content > .sl-store-contact-primary + .sl-store-contact-primary {
          margin-top: 14px;
        }
        .sl-storefront .sl-store-out-of-stock-message {
          line-height: 1.5;
        }
        .sl-storefront .sl-store-product-bottom button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 56px;
          padding: 13px 22px;
          border: 1px solid #147b49;
          border-radius: 14px;
          background: #147b49;
          color: #fff !important;
          font-family: inherit;
          font-size: 17px;
          font-weight: 700;
          letter-spacing: 0;
          line-height: 1.25;
          white-space: nowrap;
          box-shadow: 0 5px 13px rgba(20, 123, 73, .12);
          transition: background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }
        .sl-storefront .sl-store-product-bottom button:hover {
          border-color: #10683f;
          background: #10683f;
          color: #fff !important;
          box-shadow: 0 8px 18px rgba(20, 123, 73, .18);
          transform: translateY(-1px);
        }
        .sl-storefront .sl-store-product-bottom button:focus-visible {
          outline: 2px solid #599c56;
          outline-offset: 3px;
        }
        .sl-storefront .sl-store-enquire {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          min-height: 64px;
          margin-top: 16px;
          padding: 15px 20px;
          border: 3px solid #a7aaa8;
          border-bottom-color: #555957;
          border-radius: 16px;
          background: #e9f3ed;
          color: #147b49 !important;
          box-shadow: 0 1px 0 rgba(18, 55, 34, .08);
          font-family: inherit;
          font-size: clamp(14px, 1.45vw, 21px);
          font-weight: 650;
          line-height: 1.25;
          text-align: center;
          transition: background-color 160ms ease, border-color 160ms ease;
        }
        .sl-storefront .sl-store-enquire:hover {
          border-color: #8eaaa0;
          border-bottom-color: #555957;
          background: #dcece2;
          color: #10683f !important;
        }
        .sl-storefront .sl-store-contact-primary:focus-visible,
        .sl-storefront .sl-store-contact-secondary:focus-visible,
        .sl-storefront .sl-store-secondary:focus-visible,
        .sl-storefront .sl-store-quote:focus-visible,
        .sl-storefront .sl-store-whatsapp:focus-visible,
        .sl-storefront .sl-store-enquire:focus-visible {
          outline: 2px solid var(--store-brand, #599c56);
          outline-offset: 3px;
        }
      `}</style>
      {demo && (
        <div className="sl-demo-ribbon">
          <span>SELLORA · DEFAULT CATALOGUE PREVIEW</span>
          <a href="/">
            Create your own catalogue <ArrowRight size={14} />
          </a>
        </div>
      )}
      <header className="sl-store-header">
        <a className="sl-store-brand" href="#top">
          <span className="sl-store-logo">
            {data.business.logoUrl ? (
              <img src={data.business.logoUrl} alt="" />
            ) : (
              data.business.name.slice(0, 1)
            )}
          </span>
          <span>
            <b>{data.business.name}</b>
            <small>{data.business.industry}</small>
          </span>
        </a>
        <nav>
          <a href="#products">Products</a>
          <a href="#why-us">Why us</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="sl-store-header-actions">
          <label className="sl-store-search">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
            />
          </label>
          <a
            className="sl-store-whatsapp"
            href={wa}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} />
            <span>WhatsApp</span>
          </a>
          {data.checkoutReady && !demo ? (
            <button
              type="button"
              className="sl-store-quote sl-store-header-cart"
              onClick={openCart}
            >
              <Package size={16} /> Cart{" "}
              {cartProducts.reduce((sum, p) => sum + (cart[p.id] || 0), 0) >
                0 && (
                <span>
                  {cartProducts.reduce((sum, p) => sum + (cart[p.id] || 0), 0)}
                </span>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="sl-store-quote"
              onClick={() => startEnquiry()}
            >
              Get a quote <ArrowRight size={15} />
            </button>
          )}
          <span className="sl-powered-by">
            <b>SELLORA</b>
            <small>A product by PixelForge</small>
          </span>
        </div>
      </header>
      <main id="top">
        <section className="sl-store-hero">
          <div className="sl-store-hero-copy">
            <span className="sl-store-eyebrow">
              {data.business.industry.toUpperCase()} · PRODUCT CATALOGUE
            </span>
            <h1>{data.title}</h1>
            <p>{data.description}</p>
            <div className="sl-store-hero-actions">
              <a href="#products" className="sl-store-quote">
                Explore products <ArrowRight size={16} />
              </a>
              <a
                href="#contact"
                className="sl-store-secondary"
                onClick={(event) => {
                  event.preventDefault();
                  startEnquiry();
                }}
              >
                <MessageCircle size={16} /> Send an enquiry
              </a>
            </div>
            <div className="sl-store-benefits">
              <span>
                <i>
                  <Package size={17} />
                </i>
                <b>
                  {products.length}
                  <br />
                  listed products
                </b>
              </span>
              <span>
                <i>
                  <Check size={17} />
                </i>
                <b>
                  Product
                  <br />
                  specifications
                </b>
              </span>
              <span>
                <i>
                  <MessageCircle size={17} />
                </i>
                <b>
                  Direct
                  <br />
                  enquiries
                </b>
              </span>
            </div>
          </div>
          <div className="sl-store-hero-visual">
            <div
              className="sl-store-hero-image"
              style={{
                backgroundImage: data.products[0]?.imageUrl
                  ? 'linear-gradient(90deg,#f4f3e9 0%,#f4f3e900 30%),url("' +
                    data.products[0].imageUrl +
                    '")'
                  : undefined,
              }}
            ></div>
            <div className="sl-store-hero-note">
              <span>YOUR BRAND. YOUR RANGE.</span>
              <b>
                Made for
                <br />
                your next idea.
              </b>
              <small>Bulk orders · Custom requirements</small>
            </div>
            <div className="sl-store-float">
              <Check size={15} /> Trusted B2B supplier
            </div>
          </div>
        </section>
        <section className="sl-store-categories">
          <div>
            <span className="sl-store-eyebrow">DISCOVER THE RANGE</span>
            <h2>Find what you need.</h2>
          </div>
          <div className="sl-store-category-list">
            {categories.map((c) => (
              <button
                key={c}
                className={category === c ? "active" : ""}
                onClick={() => setCategory(c)}
              >
                {c}
                <ArrowRight size={13} />
              </button>
            ))}
          </div>
        </section>
        <section className="sl-store-products" id="products">
          <div className="sl-store-section-head">
            <div>
              <span className="sl-store-eyebrow">OUR COLLECTION</span>
              <h2>Products to move your business forward.</h2>
              <p>Explore the range and enquire directly with our team.</p>
            </div>
            <div className="sl-store-count">
              {filtered.length} products <span>·</span> {data.business.industry}
            </div>
          </div>
          <div className="sl-store-product-grid">
            {filtered.map((p, i) => (
              <article className="sl-store-product" key={p.id}>
                <div className="sl-store-product-image">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={p.name} loading="lazy" />
                  ) : (
                    <div className="sl-store-product-placeholder">
                      <Package size={42} />
                    </div>
                  )}
                  <span className={"sl-store-product-badge badge-" + (i % 3)}>
                    {productCategory(p)}
                  </span>
                  {isOutOfStock(p) && (
                    <span className="sl-store-stock-status" role="status">
                      Out of stock
                    </span>
                  )}
                  <button
                    className="sl-store-product-arrow"
                    onClick={() => openProduct(p)}
                    aria-label={"View " + p.name}
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>
                <div className="sl-store-product-body">
                  <div className="sl-store-product-top">
                    <span>{productCategory(p)}</span>
                    <small>{p.sku || "Direct supply"}</small>
                  </div>
                  <h3>{p.name}</h3>
                  <p>{p.description}</p>
                  <div className="sl-store-specs">
                    {Object.entries(p.fields || {})
                      .filter(
                        ([, v]) => v !== "" && v !== null && v !== undefined,
                      )
                      .slice(0, 3)
                      .map(([k, v]) => (
                        <span key={k}>
                          <small>{k.replace(/([A-Z])/g, " $1")}</small>
                          <b>{String(v)}</b>
                        </span>
                      ))}
                  </div>
                  <div className="sl-store-product-bottom">
                    <strong>{money(p.price, p.currency, p.unit)}</strong>
                    <button onClick={() => openProduct(p)}>
                      Details <ArrowRight size={14} />
                    </button>
                  </div>
                  {isOutOfStock(p) ? (
                    <div className="sl-store-cart-cta">
                      <p
                        className="sl-store-out-of-stock-message"
                        role="status"
                      >
                        Currently unavailable. Please enquire for availability.
                      </p>
                      <button
                        type="button"
                        className="sl-store-enquire"
                        onClick={() => startEnquiry(p.id)}
                      >
                        <MessageCircle size={15} aria-hidden="true" />
                        <span className="sl-store-out-of-stock-enquire-label">
                          Enquire about this product
                        </span>
                      </button>
                    </div>
                  ) : data.checkoutReady && !demo && p.price != null ? (
                    <div className="sl-store-cart-cta">
                      <button
                        type="button"
                        className="sl-store-enquire sl-store-add-cart"
                        onClick={() => {
                          addToCart(p);
                          recordEvent("add_to_cart");
                        }}
                      >
                        <Package size={16} />
                        <span>Add to cart</span>
                        <ArrowRight size={15} />
                      </button>
                      {(cart[p.id] || 0) > 0 && (
                        <div className="sl-store-card-quantity">
                          <button
                            type="button"
                            aria-label={"Decrease " + p.name}
                            onClick={() =>
                              setCartQty(p.id, (cart[p.id] || 0) - 1)
                            }
                          >
                            −
                          </button>
                          <span>{cart[p.id]} in cart</span>
                          <button
                            type="button"
                            aria-label={"Increase " + p.name}
                            onClick={() => {
                              addToCart(p);
                              recordEvent("add_to_cart");
                            }}
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="sl-store-enquire"
                      onClick={() => startEnquiry(p.id)}
                    >
                      <MessageCircle size={15} /> Enquire about this product
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
          {!filtered.length && (
            <div className="sl-store-empty">
              <Package size={30} />
              <h3>No matching products</h3>
              <p>Try another search or category.</p>
              <button
                onClick={() => {
                  setQuery("");
                  setCategory("All products");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </section>
        <section className="sl-store-why" id="why-us">
          <div className="sl-store-why-intro">
            <span className="sl-store-eyebrow">ABOUT THIS CATALOGUE</span>
            <h2>
              Explore the range
              <br />
              from {data.business.name}.
            </h2>
            <p>
              Review the product details and contact the business directly to
              confirm availability, pricing and order requirements.
            </p>
          </div>
          <div className="sl-store-why-card">
            <span>
              <Package size={22} />
            </span>
            <b>Product information</b>
            <p>
              Browse descriptions, prices and specifications where provided.
            </p>
          </div>
          <div className="sl-store-why-card">
            <span>
              <Check size={22} />
            </span>
            <b>Business-specific catalogue</b>
            <p>Products and branding are provided by {data.business.name}.</p>
          </div>
          <div className="sl-store-why-card">
            <span>
              <MessageCircle size={22} />
            </span>
            <b>Enquire directly</b>
            <p>
              Ask the business to confirm availability, pricing and delivery.
            </p>
          </div>
        </section>
        <section className="sl-store-contact" id="contact">
          <div>
            <span className="sl-store-eyebrow">LET'S WORK TOGETHER</span>
            <h2>
              Have a requirement?
              <br />
              <em>Let's talk.</em>
            </h2>
            <p>
              Contact us for pricing, bulk orders, availability or custom
              requirements.
            </p>
            <div className="sl-store-hero-actions">
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="sl-store-contact-primary"
              >
                <MessageCircle size={17} /> Chat on WhatsApp
              </a>
              {data.business.phone && (
                <a
                  href={"tel:" + data.business.phone}
                  className="sl-store-contact-secondary"
                >
                  Call our team <ArrowRight size={15} />
                </a>
              )}
            </div>
          </div>
          <div className="sl-store-contact-art">
            <span>{data.business.name.toUpperCase()}</span>
            <b>
              Let's find
              <br />
              the right fit.
            </b>
            <div>
              <Check size={16} /> Browse <Check size={16} /> Enquire{" "}
              <Check size={16} /> Connect
            </div>
          </div>
        </section>
        <section
          className="sl-store-contact"
          id="enquiry-form"
          aria-label="Send a product enquiry"
        >
          <div style={{ width: "100%", maxWidth: 760, margin: "0 auto" }}>
            <span className="sl-store-eyebrow">PRODUCT ENQUIRY</span>
            <h2>Tell us what you need.</h2>
            <p>Your enquiry will be sent directly to this business.</p>
            {demo ? (
              <p>This demo catalogue does not submit enquiries.</p>
            ) : (
              <form
                className="sl-form"
                onSubmit={async (e: FormEvent) => {
                  e.preventDefault();
                  setEnquiryBusy(true);
                  setEnquiryError("");
                  setEnquirySuccess("");
                  try {
                    const result = await api(
                      "/public/catalogues/" +
                        encodeURIComponent(data.slug) +
                        "/enquiries",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          customerName: enquiryName,
                          email: enquiryEmail,
                          phone: enquiryPhone,
                          companyName: enquiryCompany,
                          message: enquiryMessage,
                          productId: enquiryProductId || undefined,
                        }),
                      },
                    );
                    setEnquirySuccess(
                      "Enquiry sent successfully. Reference: " +
                        result.reference,
                    );
                    setEnquiryName("");
                    setEnquiryEmail("");
                    setEnquiryPhone("");
                    setEnquiryCompany("");
                    setEnquiryMessage("");
                    setEnquiryProductId("");
                  } catch (e) {
                    setEnquiryError(
                      e instanceof Error
                        ? e.message
                        : "Could not send your enquiry.",
                    );
                  } finally {
                    setEnquiryBusy(false);
                  }
                }}
              >
                <div className="sl-form-row">
                  <label>
                    Your name
                    <input
                      required
                      minLength={2}
                      maxLength={120}
                      value={enquiryName}
                      onChange={(e) => setEnquiryName(e.target.value)}
                    />
                  </label>
                  <label>
                    Company name
                    <input
                      maxLength={160}
                      value={enquiryCompany}
                      onChange={(e) => setEnquiryCompany(e.target.value)}
                    />
                  </label>
                </div>
                <div className="sl-form-row">
                  <label>
                    Email <small>(required)</small>
                    <input
                      type="email"
                      maxLength={160}
                      autoComplete="email"
                      required
                      value={enquiryEmail}
                      onChange={(e) => setEnquiryEmail(e.target.value)}
                    />
                  </label>
                  <label>
                    Phone <small>(required)</small>
                    <input
                      type="tel"
                      maxLength={30}
                      autoComplete="tel"
                      required
                      minLength={7}
                      value={enquiryPhone}
                      onChange={(e) => setEnquiryPhone(e.target.value)}
                    />
                  </label>
                </div>
                <label>
                  Product (optional)
                  <select
                    value={enquiryProductId}
                    onChange={(e) => setEnquiryProductId(e.target.value)}
                  >
                    <option value="">General enquiry</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.sku ? " · " + p.sku : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  What are you looking for?
                  <textarea
                    required
                    minLength={3}
                    maxLength={2000}
                    rows={4}
                    value={enquiryMessage}
                    onChange={(e) => setEnquiryMessage(e.target.value)}
                    placeholder="Tell us about the product, quantity or specifications you need."
                  />
                </label>
                {enquiryError && <p role="alert">{enquiryError}</p>}
                {enquirySuccess && <p role="status">{enquirySuccess}</p>}
                <button
                  type="submit"
                  className="sl-store-contact-primary sl-store-enquiry-submit"
                  disabled={enquiryBusy}
                  style={{
                    fontFamily: "inherit",
                    fontSize: 16,
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                    lineHeight: 1.2,
                    WebkitFontSmoothing: "antialiased",
                  }}
                >
                  {enquiryBusy ? "Sending…" : "Send enquiry"}{" "}
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
      <footer className="sl-store-footer">
        <div className="sl-store-footer-brand">
          <a className="sl-store-brand" href="#top">
            <span className="sl-store-logo">
              {data.business.logoUrl ? (
                <img src={data.business.logoUrl} alt="" />
              ) : (
                data.business.name.slice(0, 1)
              )}
            </span>
            <span>
              <b>{data.business.name}</b>
              <small>{data.business.industry}</small>
            </span>
          </a>
          <p>{data.description}</p>
          <small>Digital catalogue powered by Sellora</small>
        </div>
        <div>
          <b>Explore</b>
          <a href="#products">All products</a>
          <a href="#why-us">Why choose us</a>
          <a href="#contact">Contact</a>
        </div>
        <div>
          <b>Get in touch</b>
          {data.business.phone && (
            <a href={"tel:" + data.business.phone}>{data.business.phone}</a>
          )}
          {data.business.email && (
            <a href={"mailto:" + data.business.email}>{data.business.email}</a>
          )}
          {data.business.website && (
            <a href={data.business.website} target="_blank" rel="noreferrer">
              Website <ExternalLink size={13} />
            </a>
          )}
          <small>{data.business.industry}</small>
        </div>
        <div className="sl-store-footer-note">
          <span>SELLORA</span>
          <b>
            Digital catalogues.
            <br />
            Smarter sales.
          </b>
          <a href="/">
            Create your catalogue <ArrowRight size={14} />
          </a>
        </div>
      </footer>
      {details && (
        <div
          className="sl-store-detail-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setDetails(null);
          }}
        >
          <section className="sl-store-detail">
            <button
              className="sl-store-detail-close"
              onClick={() => setDetails(null)}
              aria-label="Close details"
            >
              <X />
            </button>
            <div className="sl-store-detail-image">
              {details.imageUrl && (
                <img src={details.imageUrl} alt={details.name} />
              )}
            </div>
            <div className="sl-store-detail-content">
              <span className="sl-store-eyebrow">PRODUCT DETAILS</span>
              <h2>{details.name}</h2>
              <p>{details.description}</p>
              <strong>
                {money(details.price, details.currency, details.unit)}
              </strong>
              <div className="sl-store-detail-specs">
                {Object.entries(details.fields || {}).map(([k, v]) => (
                  <span key={k}>
                    <small>{k.replace(/([A-Z])/g, " $1")}</small>
                    <b>{String(v)}</b>
                  </span>
                ))}
              </div>
              <button
                type="button"
                className="sl-store-contact-primary"
                onClick={() => startEnquiry(details.id)}
              >
                <MessageCircle size={16} /> Enquire about this product
              </button>
              {isOutOfStock(details) ? (
                <p className="sl-store-out-of-stock-message" role="status">
                  Out of stock — checkout is unavailable. Please enquire for
                  availability.
                </p>
              ) : (
                data.checkoutReady &&
                !demo &&
                details.price != null && (
                  <button
                    className="sl-store-contact-primary"
                    onClick={() => {
                      addToCart(details);
                      recordEvent("add_to_cart");
                      setDetails(null);
                      setCheckoutStep("cart");
                      setCartOpen(true);
                    }}
                  >
                    <Package size={16} /> Add to cart
                  </button>
                )
              )}
            </div>
          </section>
        </div>
      )}
      {cartOpen && (
        <div
          className="sl-checkout-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !checkoutBusy)
              setCartOpen(false);
          }}
        >
          <section className="sl-checkout-panel">
            <header>
              <div>
                <span className="sl-store-eyebrow">
                  {checkoutStep === "success"
                    ? "ORDER CONFIRMED"
                    : checkoutStep === "details"
                      ? "CHECKOUT"
                      : "YOUR CART"}
                </span>
                <h2>
                  {checkoutStep === "success"
                    ? "Thank you for your order"
                    : checkoutStep === "details"
                      ? "Delivery details"
                      : "Your selection"}{" "}
                  <small>
                    {checkoutStep === "cart" &&
                      "(" +
                        cartProducts.reduce(
                          (sum, p) => sum + (cart[p.id] || 0),
                          0,
                        ) +
                        " items)"}
                  </small>
                </h2>
              </div>
              {checkoutStep !== "success" && (
                <button
                  type="button"
                  onClick={() => {
                    if (!checkoutBusy) setCartOpen(false);
                  }}
                  aria-label="Close cart"
                >
                  <X size={18} />
                </button>
              )}
            </header>
            {checkoutStep === "cart" && (
              <>
                {cartProducts.length === 0 ? (
                  <div className="sl-checkout-empty">
                    <Package size={34} />
                    <h3>Your cart is empty</h3>
                    <p>
                      Explore the catalogue and add products to begin your
                      order.
                    </p>
                    <button type="button" onClick={() => setCartOpen(false)}>
                      Continue browsing
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="sl-checkout-lines">
                      {cartProducts.map((p) => (
                        <article key={p.id}>
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} />
                          ) : (
                            <div className="sl-checkout-line-image">
                              <Package size={20} />
                            </div>
                          )}
                          <div>
                            <b>{p.name}</b>
                            <small>
                              {money(p.price, p.currency, p.unit)} /{" "}
                              {p.unit || "unit"}
                            </small>
                            <div className="sl-checkout-quantity">
                              <button
                                type="button"
                                onClick={() =>
                                  setCartQty(p.id, (cart[p.id] || 0) - 1)
                                }
                                aria-label={"Decrease " + p.name}
                              >
                                −
                              </button>
                              <span>{cart[p.id]}</span>
                              <button
                                type="button"
                                onClick={() =>
                                  setCartQty(p.id, (cart[p.id] || 0) + 1)
                                }
                                disabled={(cart[p.id] || 0) >= 1000}
                                aria-label={"Increase " + p.name}
                              >
                                +
                              </button>
                              <button
                                className="sl-checkout-remove"
                                type="button"
                                onClick={() => setCartQty(p.id, 0)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                          <strong>
                            {money(
                              Number(p.price || 0) * (cart[p.id] || 0),
                              p.currency,
                              p.unit,
                            )}
                          </strong>
                        </article>
                      ))}
                    </div>
                    <div className="sl-checkout-total">
                      <span>Subtotal</span>
                      <strong>
                        {money(cartTotal, cartProducts[0]?.currency || "INR")}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className="sl-store-contact-primary sl-checkout-continue"
                      onClick={startCheckout}
                    >
                      Continue to checkout <ArrowRight size={16} />
                    </button>
                    <p className="sl-checkout-note">
                      Delivery charges and final availability will be confirmed
                      by the business.
                    </p>
                  </>
                )}
              </>
            )}
            {checkoutStep === "details" && (
              <>
                <div className="sl-checkout-lines">
                  {cartProducts.map((p) => (
                    <article key={p.id}>
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} />
                      ) : (
                        <div className="sl-checkout-line-image">
                          <Package size={20} />
                        </div>
                      )}
                      <div>
                        <b>{p.name}</b>
                        <small>
                          Qty {cart[p.id]} ×{" "}
                          {money(p.price, p.currency, p.unit)}
                        </small>
                      </div>
                      <strong>
                        {money(
                          Number(p.price || 0) * (cart[p.id] || 0),
                          p.currency,
                          p.unit,
                        )}
                      </strong>
                    </article>
                  ))}
                </div>
                <div className="sl-checkout-total">
                  <span>Total</span>
                  <strong>
                    {money(cartTotal, cartProducts[0]?.currency || "INR")}
                  </strong>
                </div>
                <form
                  className="sl-checkout-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void buyNow();
                  }}
                >
                  <label>
                    Full name
                    <input
                      required
                      minLength={2}
                      autoComplete="name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Your full name"
                    />
                  </label>
                  <label>
                    Phone number
                    <input
                      required
                      type="tel"
                      minLength={7}
                      autoComplete="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="Mobile number"
                    />
                  </label>
                  <label>
                    Email address <small>(required)</small>
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                    />
                  </label>
                  <label>
                    Delivery address
                    <textarea
                      required
                      minLength={5}
                      autoComplete="street-address"
                      rows={3}
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Door / street, area, city, state and PIN code"
                    />
                  </label>
                  <label>
                    Order notes <small>(optional)</small>
                    <textarea
                      rows={2}
                      maxLength={1000}
                      value={checkoutNotes}
                      onChange={(e) => setCheckoutNotes(e.target.value)}
                      placeholder="Any delivery or product requirements"
                    />
                  </label>
                  {checkoutError && (
                    <p className="sl-checkout-error" role="alert">
                      {checkoutError}
                    </p>
                  )}
                  <button
                    className="sl-store-contact-primary sl-checkout-continue"
                    type="submit"
                    disabled={checkoutBusy}
                  >
                    {checkoutBusy ? (
                      <>
                        <CreditCard size={16} /> Opening secure payment…
                      </>
                    ) : (
                      <>
                        <CreditCard size={16} /> Pay with Razorpay{" "}
                        <ArrowRight size={15} />
                      </>
                    )}
                  </button>
                  <p className="sl-checkout-note">
                    Your payment is processed securely by Razorpay. Your order
                    and total were calculated on the server.
                  </p>
                </form>
                <button
                  type="button"
                  className="sl-store-secondary"
                  onClick={() => {
                    if (!checkoutBusy) setCheckoutStep("cart");
                  }}
                >
                  Back to cart
                </button>
              </>
            )}
            {checkoutStep === "success" && orderConfirmation && (
              <div className="sl-checkout-success-panel">
                <div className="sl-checkout-success-icon">
                  <Check size={28} />
                </div>
                <span className="sl-store-eyebrow">PAYMENT CONFIRMED</span>
                <h3>Order placed successfully</h3>
                <p>
                  Your payment has been verified for{" "}
                  <strong>{data.business.name}</strong>.
                </p>
                <div className="sl-checkout-success-reference">
                  <small>Order reference</small>
                  <b>{orderConfirmation.orderNumber}</b>
                </div>
                <div className="sl-checkout-success-items">
                  <h4>Order details</h4>
                  {orderConfirmation.items.map((item, index) => (
                    <div
                      className="sl-checkout-success-item"
                      key={item.sku + "-" + item.name + "-" + index}
                    >
                      <span>
                        <b>{item.name}</b>
                        <small>
                          {item.sku ? item.sku + " · " : ""}Qty {item.quantity}{" "}
                          ×{" "}
                          {money(
                            item.unitPrice,
                            orderConfirmation.currency,
                            item.unit,
                          )}
                        </small>
                      </span>
                      <strong>
                        {money(item.lineTotal, orderConfirmation.currency)}
                      </strong>
                    </div>
                  ))}
                  <div className="sl-checkout-success-total">
                    <span>Subtotal</span>
                    <b>
                      {money(
                        orderConfirmation.subtotal,
                        orderConfirmation.currency,
                      )}
                    </b>
                  </div>
                  {Number(orderConfirmation.taxAmount) > 0 && (
                    <div className="sl-checkout-success-total">
                      <span>Tax ({orderConfirmation.taxRate}%)</span>
                      <b>
                        {money(
                          orderConfirmation.taxAmount,
                          orderConfirmation.currency,
                        )}
                      </b>
                    </div>
                  )}
                  <div className="sl-checkout-success-total grand">
                    <span>Amount paid</span>
                    <b>
                      {money(
                        orderConfirmation.total,
                        orderConfirmation.currency,
                      )}
                    </b>
                  </div>
                </div>
                <p className="sl-checkout-note">
                  Keep this reference for your records.
                </p>
                <button
                  type="button"
                  className="sl-store-contact-primary sl-checkout-continue"
                  onClick={() => {
                    setCartOpen(false);
                    setOrderConfirmation(null);
                    setCheckoutStep("cart");
                    setCustomerName("");
                    setCustomerPhone("");
                    setCustomerEmail("");
                    setCustomerAddress("");
                    setCheckoutNotes("");
                  }}
                >
                  Back to catalogue
                </button>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
