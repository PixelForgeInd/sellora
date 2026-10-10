import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { ArrowRight, Check, ExternalLink, MessageCircle, Package, ShoppingCart, X } from "lucide-react";
import { formatMoney as money } from "../sellora/formatters";
import type { Product, PublicData } from "../sellora/types";

type CartLine = { product: Product; quantity: number };
type CheckoutForm = { customerName: string; email: string; phone: string; address: string; notes: string };

export function PublicCatalogue({ data, error, demo = false }: { data: PublicData | null; error: string; demo?: boolean }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All products");
  const [details, setDetails] = useState<Product | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkout, setCheckout] = useState<CheckoutForm>({ customerName: "", email: "", phone: "", address: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderMessage, setOrderMessage] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [orderError, setOrderError] = useState("");
  const products = data?.products || [];
  const onlineSelling = data?.business.sellingMode === "ONLINE_PAYMENTS";
  const productCategory = (p: Product) => String(p.fields?.category || p.fields?.collection || p.fields?.type || p.fields?.yarnType || data?.business.industry || "Products");
  const categories = Array.from(new Set(["All products", ...products.map(productCategory)]));
  const filtered = products.filter(p => (category === "All products" || productCategory(p) === category) && [p.name, p.description, p.sku, ...Object.values(p.fields || {}).map(String)].join(" ").toLowerCase().includes(query.trim().toLowerCase()));
  const wa = data?.business.phone ? "https://wa.me/" + data.business.phone.replace(/\D/g, "") + "?text=" + encodeURIComponent("Hi " + data.business.name + ", I'm interested in your products.") : "#contact";
  const publicUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareText = "Explore " + (data?.business.name || "our") + " catalogue: " + publicUrl;
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const cartTotal = useMemo(() => cart.reduce((sum, line) => sum + Number(line.product.price || 0) * line.quantity, 0), [cart]);
  const currency = cart[0]?.product.currency || "INR";
  const trackEvent = (eventType: "page_view" | "add_to_cart" | "checkout_started") => {
    if (!data || demo) return;
    try {
      const key = "sellora_analytics_session";
      let sessionId = sessionStorage.getItem(key);
      if (!sessionId) {
        sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(36).slice(2);
        sessionStorage.setItem(key, sessionId);
      }
      void fetch(((import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "")) + "/public/catalogues/" + encodeURIComponent(data.slug) + "/events", {
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({eventType,sessionId})
      }).catch(() => {});
    } catch { /* Analytics must never block catalogue browsing. */ }
  };
  useEffect(() => { if (data && !demo) trackEvent("page_view"); }, [data?.slug, demo]);
  const shareCatalogue = () => window.open("https://wa.me/?text=" + encodeURIComponent(shareText), "_blank", "noopener,noreferrer");
  const copyCatalogue = async () => { try { await navigator.clipboard.writeText(publicUrl); window.alert("Catalogue link copied. Paste it into WhatsApp or any chat."); } catch { window.prompt("Copy your catalogue link", publicUrl); } };
  const addToCart = (product: Product) => {
    if (!onlineSelling || product.price == null || Number(product.price) <= 0) return;
    setCart(current => {
      const existing = current.find(line => line.product.id === product.id);
      return existing ? current.map(line => line.product.id === product.id ? { ...line, quantity: Math.min(1000, line.quantity + 1) } : line) : [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
    trackEvent("add_to_cart");
    setOrderError("");
  };
  const updateQuantity = (productId: string, quantity: number) => setCart(current => quantity <= 0 ? current.filter(line => line.product.id !== productId) : current.map(line => line.product.id === productId ? { ...line, quantity: Math.min(1000, quantity) } : line));
  const submitOrder = async (event: FormEvent) => {
    event.preventDefault();
    if (!data || !cart.length) return;
    setSubmitting(true); setOrderError("");
    try {
      const response = await fetch(((import.meta.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/$/, "")) + "/public/catalogues/" + encodeURIComponent(data.slug) + "/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...checkout, items: cart.map(line => ({ productId: line.product.id, quantity: line.quantity })) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not submit your order. Please try again.");
      setOrderNumber(result.orderNumber || result.id);
      setOrderMessage(result.message || "Your order request has been submitted. The business will contact you to confirm availability and payment.");
      setCart([]); setCheckoutOpen(false); setCartOpen(false);
    } catch (err) { setOrderError(err instanceof Error ? err.message : "Could not submit your order."); }
    finally { setSubmitting(false); }
  };
  if (error) return <div className="sl-public-error"><h1>Catalogue unavailable</h1><p>{error}</p><a href="/">Create your catalogue with Sellora <ArrowRight size={15}/></a></div>;
  if (!data) return <div className="sl-public-loading"><p>Loading catalogue…</p></div>;
  if (orderMessage) return <div className="sl-storefront" style={{ "--store-brand": data.business.brandColor } as CSSProperties}>
    <main className="sl-order-confirmation" id="top">
      <div className="sl-order-confirmation-card">
        <span className="sl-order-confirmation-icon"><Check size={30}/></span>
        <span className="sl-store-eyebrow">ORDER REQUEST RECEIVED</span>
        <h1>Thank you for your order.</h1>
        <p>{orderMessage}</p>
        <div className="sl-order-reference"><span>Order reference</span><strong>{orderNumber}</strong></div>
        <p className="sl-order-confirmation-note">Keep this reference for your records. Payment has not been collected online.</p>
        <button className="sl-store-quote" onClick={() => { setOrderMessage(""); setOrderNumber(""); window.scrollTo({top:0,behavior:"smooth"}); }}><ArrowRight size={16}/> Back to catalogue</button>
      </div>
    </main>
  </div>;
  return <div className="sl-storefront" style={{ "--store-brand": data.business.brandColor } as CSSProperties}>
    {demo && <div className="sl-demo-ribbon"><span>SELLORA · DEFAULT CATALOGUE PREVIEW</span><a href="/">Create your own catalogue <ArrowRight size={14}/></a></div>}
    <header className="sl-store-header"><a className="sl-store-brand" href="#top"><span className="sl-store-logo">{data.business.logoUrl ? <img src={data.business.logoUrl} alt=""/> : data.business.name.slice(0,1)}</span><span><b>{data.business.name}</b><small>{data.business.industry}</small></span></a><nav><a href="#products">Products</a><a href="#why-us">Why us</a><a href="#contact">Contact</a></nav><div className="sl-store-header-actions"><label className="sl-store-search"><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search products…"/></label>{onlineSelling ? <button className="sl-store-quote" onClick={() => setCartOpen(true)}><ShoppingCart size={16}/> Cart ({cartCount})</button> : <a className="sl-store-whatsapp" href={wa} target="_blank" rel="noreferrer"><MessageCircle size={17}/><span>WhatsApp</span></a>}<button className="sl-store-share" onClick={shareCatalogue}>Share</button><a className="sl-store-quote" href="#contact">Contact <ArrowRight size={15}/></a><span className="sl-powered-by"><b>SELLORA</b><small>A product by PixelForge</small></span></div></header>
    <main id="top">
      <section className="sl-store-hero"><div className="sl-store-hero-copy"><span className="sl-store-eyebrow">{data.business.industry.toUpperCase()} · PRODUCT CATALOGUE</span><h1>{data.title}</h1><p>{data.description}</p><div className="sl-store-hero-actions"><a href="#products" className="sl-store-quote">Explore products <ArrowRight size={16}/></a>{onlineSelling ? <button className="sl-store-secondary" onClick={() => setCartOpen(true)}><ShoppingCart size={16}/> View cart ({cartCount})</button> : <a href={wa} target="_blank" rel="noreferrer" className="sl-store-secondary"><MessageCircle size={16}/> Enquire on WhatsApp</a>}</div><div className="sl-store-benefits"><span><i><Package size={17}/></i><b>{products.length}<br/>listed products</b></span><span><i><Check size={17}/></i><b>Product<br/>specifications</b></span><span><i>{onlineSelling ? <ShoppingCart size={17}/> : <MessageCircle size={17}/>}</i><b>{onlineSelling ? <>Cart &<br/>checkout</> : <>Direct<br/>enquiries</>}</b></span></div></div><div className="sl-store-hero-visual"><div className="sl-store-hero-image" style={{ backgroundImage: data.products[0]?.imageUrl ? "linear-gradient(90deg,#f4f3e9 0%,#f4f3e900 30%),url(\"" + data.products[0].imageUrl + "\")" : undefined }}></div><div className="sl-store-hero-note"><span>YOUR BRAND. YOUR RANGE.</span><b>Made for<br/>your next idea.</b><small>Bulk orders · Custom requirements</small></div><div className="sl-store-float"><Check size={15}/> {onlineSelling ? "Order online" : "Enquire directly"}</div></div></section>
      <section className="sl-store-categories"><div><span className="sl-store-eyebrow">DISCOVER THE RANGE</span><h2>Find what you need.</h2></div><div className="sl-store-category-list">{categories.map(c => <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}<ArrowRight size={13}/></button>)}</div></section>
      <section className="sl-store-products" id="products"><div className="sl-store-section-head"><div><span className="sl-store-eyebrow">OUR COLLECTION</span><h2>Products to move your business forward.</h2><p>{onlineSelling ? "Add priced products to your cart and submit your order." : "Explore the range and enquire directly with our team."}</p></div><div className="sl-store-count">{filtered.length} products <span>·</span> {data.business.industry}</div></div>
        <div className="sl-store-product-grid">{filtered.map((p,i) => <article className="sl-store-product" key={p.id}><div className="sl-store-product-image">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} loading="lazy"/> : <div className="sl-store-product-placeholder"><Package size={42}/></div>}<span className={"sl-store-product-badge badge-" + (i % 3)}>{productCategory(p)}</span><button className="sl-store-product-arrow" onClick={() => setDetails(p)} aria-label={"View " + p.name}><ArrowRight size={17}/></button></div><div className="sl-store-product-body"><div className="sl-store-product-top"><span>{productCategory(p)}</span><small>{p.sku || "Direct supply"}</small></div><h3>{p.name}</h3><p>{p.description}</p><div className="sl-store-specs">{Object.entries(p.fields || {}).filter(([,v]) => v !== "" && v !== null && v !== undefined).slice(0,3).map(([k,v]) => <span key={k}><small>{k.replace(/([A-Z])/g," $1")}</small><b>{String(v)}</b></span>)}</div><div className="sl-store-product-bottom"><strong>{money(p.price,p.currency,p.unit)}</strong>{onlineSelling ? <button disabled={p.price == null || Number(p.price) <= 0} onClick={() => addToCart(p)}><ShoppingCart size={14}/> Add to cart</button> : <a href={wa === "#contact" ? "#contact" : "https://wa.me/" + data.business.phone!.replace(/\D/g,"") + "?text=" + encodeURIComponent("Hi, I'm interested in " + p.name + ".")} target={wa === "#contact" ? "_self" : "_blank"} rel="noreferrer"><MessageCircle size={15}/> Enquire</a>}</div></div></article>)}</div>
        {!filtered.length && <div className="sl-store-empty"><Package size={30}/><h3>No matching products</h3><p>Try another search or category.</p><button onClick={() => { setQuery(""); setCategory("All products"); }}>Clear filters</button></div>}
      </section>
      <section className="sl-store-why" id="why-us"><div className="sl-store-why-intro"><span className="sl-store-eyebrow">ABOUT THIS CATALOGUE</span><h2>Explore the range<br/>from {data.business.name}.</h2><p>Review the product details and {onlineSelling ? "submit an order request online." : "contact the business directly to confirm availability, pricing and order requirements."}</p></div><div className="sl-store-why-card"><span><Package size={22}/></span><b>Product information</b><p>Browse descriptions, prices and specifications where provided.</p></div><div className="sl-store-why-card"><span><Check size={22}/></span><b>Business-specific catalogue</b><p>Products and branding are provided by {data.business.name}.</p></div><div className="sl-store-why-card"><span>{onlineSelling ? <ShoppingCart size={22}/> : <MessageCircle size={22}/>}</span><b>{onlineSelling ? "Order online" : "Enquire directly"}</b><p>{onlineSelling ? "Submit your cart and the business will confirm payment and delivery." : "Ask the business to confirm availability, pricing and delivery."}</p></div></section>
      <section className="sl-store-contact" id="contact"><div><span className="sl-store-eyebrow">{onlineSelling ? "QUESTIONS ABOUT YOUR ORDER?" : "LET'S WORK TOGETHER"}</span><h2>{onlineSelling ? <>Need help?<br/><em>Contact us.</em></> : <>Have a requirement?<br/><em>Let's talk.</em></>}</h2><p>{onlineSelling ? "For product questions or order support, contact the business directly." : "Contact us for pricing, bulk orders, availability or custom requirements."}</p><div className="sl-store-hero-actions"><a href={wa} target="_blank" rel="noreferrer" className="sl-store-contact-primary"><MessageCircle size={17}/> Chat on WhatsApp</a>{data.business.phone && <a href={"tel:" + data.business.phone} className="sl-store-contact-secondary">Call our team <ArrowRight size={15}/></a>}</div></div><div className="sl-store-contact-art"><span>{data.business.name.toUpperCase()}</span><b>Let’s find<br/>the right fit.</b><div><Check size={16}/> Browse <Check size={16}/> {onlineSelling ? "Order" : "Enquire"} <Check size={16}/> Connect</div></div></section>
    </main>
    <footer className="sl-store-footer"><div className="sl-store-footer-brand"><a className="sl-store-brand" href="#top"><span className="sl-store-logo">{data.business.logoUrl ? <img src={data.business.logoUrl} alt=""/> : data.business.name.slice(0,1)}</span><span><b>{data.business.name}</b><small>{data.business.industry}</small></span></a><p>{data.description}</p><small>Digital catalogue powered by Sellora</small></div><div><b>Explore</b><a href="#products">All products</a><a href="#why-us">Why choose us</a><a href="#contact">Contact</a></div><div><b>Get in touch</b>{data.business.phone && <a href={"tel:" + data.business.phone}>{data.business.phone}</a>}{data.business.email && <a href={"mailto:" + data.business.email}>{data.business.email}</a>}{data.business.website && <a href={data.business.website} target="_blank" rel="noreferrer">Website <ExternalLink size={13}/></a>}<small>{data.business.industry}</small></div><div className="sl-store-footer-note"><span>SELLORA</span><b>Digital catalogues.<br/>Smarter sales.</b><a href="/">Create your catalogue <ArrowRight size={14}/></a></div></footer>
    {orderMessage && <div className="sl-checkout-success" role="status"><Check size={19}/><span>{orderMessage}</span><button onClick={() => setOrderMessage("")} aria-label="Dismiss"><X size={17}/></button></div>}
    {cartOpen && <div className="sl-checkout-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setCartOpen(false); }}><section className="sl-checkout-panel" role="dialog" aria-modal="true" aria-label="Shopping cart"><header><div><span className="sl-store-eyebrow">YOUR ORDER</span><h2>Shopping cart <small>({cartCount})</small></h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X/></button></header>{orderError && <p className="sl-checkout-error">{orderError}</p>}{!cart.length ? <div className="sl-checkout-empty"><ShoppingCart size={30}/><h3>Your cart is empty</h3><p>Add priced products from the catalogue to get started.</p><button onClick={() => setCartOpen(false)}>Continue browsing</button></div> : <><div className="sl-checkout-lines">{cart.map(line => <article key={line.product.id}>{line.product.imageUrl ? <img src={line.product.imageUrl} alt=""/> : <span className="sl-checkout-line-image"><Package/></span>}<div><b>{line.product.name}</b><small>{money(line.product.price,line.product.currency,line.product.unit)}</small><div className="sl-checkout-quantity"><button onClick={() => updateQuantity(line.product.id,line.quantity-1)} aria-label="Decrease quantity">−</button><span>{line.quantity}</span><button onClick={() => updateQuantity(line.product.id,line.quantity+1)} aria-label="Increase quantity">+</button><button className="sl-checkout-remove" onClick={() => updateQuantity(line.product.id,0)}>Remove</button></div></div><strong>{money(Number(line.product.price)*line.quantity,line.product.currency,line.product.unit)}</strong></article>)}</div><div className="sl-checkout-total"><span>Order subtotal</span><strong>{new Intl.NumberFormat("en-IN",{style:"currency",currency,maximumFractionDigits:2}).format(cartTotal)}</strong></div><button className="sl-store-contact-primary sl-checkout-continue" onClick={() => { setOrderError(""); trackEvent("checkout_started"); setCheckoutOpen(true); }}>Continue to checkout <ArrowRight size={16}/></button><p className="sl-checkout-note">This submits an order request. The business will confirm payment and delivery separately.</p></>}</section></div>}
    {checkoutOpen && <div className="sl-checkout-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setCheckoutOpen(false); }}><section className="sl-checkout-panel" role="dialog" aria-modal="true" aria-label="Checkout"><header><div><span className="sl-store-eyebrow">CHECKOUT</span><h2>Delivery details</h2></div><button onClick={() => setCheckoutOpen(false)} aria-label="Close checkout"><X/></button></header><form className="sl-checkout-form" onSubmit={submitOrder}><label>Full name<input required minLength={2} maxLength={120} value={checkout.customerName} onChange={e => setCheckout({...checkout,customerName:e.target.value})}/></label><label>Email (optional)<input type="email" maxLength={160} value={checkout.email} onChange={e => setCheckout({...checkout,email:e.target.value})}/></label><label>Phone number<input required minLength={7} maxLength={30} value={checkout.phone} onChange={e => setCheckout({...checkout,phone:e.target.value})}/></label><label>Delivery address<textarea maxLength={1000} value={checkout.address} onChange={e => setCheckout({...checkout,address:e.target.value})}/></label><label>Order notes (optional)<textarea maxLength={1000} value={checkout.notes} onChange={e => setCheckout({...checkout,notes:e.target.value})}/></label>{orderError && <p className="sl-checkout-error">{orderError}</p>}<div className="sl-checkout-total"><span>Order subtotal</span><strong>{new Intl.NumberFormat("en-IN",{style:"currency",currency,maximumFractionDigits:2}).format(cartTotal)}</strong></div><button className="sl-store-contact-primary sl-checkout-continue" type="submit" disabled={submitting}>{submitting ? "Submitting…" : "Place order request"} <ArrowRight size={16}/></button><p className="sl-checkout-note">No online payment is collected by this MVP. The business will contact you to confirm payment and delivery.</p></form></section></div>}
    {details && <div className="sl-store-detail-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setDetails(null); }}><section className="sl-store-detail"><button className="sl-store-detail-close" onClick={() => setDetails(null)} aria-label="Close details"><X/></button><div className="sl-store-detail-image">{details.imageUrl && <img src={details.imageUrl} alt={details.name}/>}</div><div className="sl-store-detail-content"><span className="sl-store-eyebrow">PRODUCT DETAILS</span><h2>{details.name}</h2><p>{details.description}</p><strong>{money(details.price,details.currency,details.unit)}</strong><div className="sl-store-detail-specs">{Object.entries(details.fields||{}).map(([k,v]) => <span key={k}><small>{k.replace(/([A-Z])/g," $1")}</small><b>{String(v)}</b></span>)}</div>{onlineSelling ? <button className="sl-store-contact-primary" disabled={details.price == null || Number(details.price) <= 0} onClick={() => { addToCart(details); setDetails(null); }}><ShoppingCart size={16}/> Add to cart</button> : <a className="sl-store-contact-primary" href={wa === "#contact" ? "#contact" : "https://wa.me/" + data.business.phone!.replace(/\D/g,"") + "?text=" + encodeURIComponent("Hi, I'm interested in " + details.name + ".")} target={wa === "#contact" ? "_self" : "_blank"} rel="noreferrer"><MessageCircle size={16}/> Enquire about this product</a>}</div></section></div>}
  </div>;
}
