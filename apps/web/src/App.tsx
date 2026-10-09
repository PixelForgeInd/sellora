import { useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { BookOpen, Search, ShoppingBag, Phone, ChevronLeft, ChevronRight, Upload, X, CheckCircle2, Package, LayoutDashboard, ExternalLink, Building2 } from "lucide-react";
import BusinessOnboarding from "./BusinessOnboarding";

const API = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
const API_BASE = API.replace(/\/api\/?$/, "");

type Shade = { id: string; name: string; code: string; hexColor?: string | null };
type Product = {
  id: string; sku: string; name: string; description?: string | null;
  count: string; yarnType: string; availability: string;
  shades: Shade[]; price: { amount: string; currency: string; unit: string } | null;
};
type CartItem = { product: Product; quantity: number; shadeName: string };

function money(price: Product["price"]) {
  if (!price) return "Contact for quotation";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: price.currency, maximumFractionDigits: 2 }).format(Number(price.amount)) + ` / ${price.unit}`;
}

function FlipPage({ children }: { children: React.ReactNode }) {
  return <div className="flip-page"><div className="flip-page-inner">{children}</div></div>;
}

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [count, setCount] = useState("All counts");
  const [type, setType] = useState("All types");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [catalogueUrl, setCatalogueUrl] = useState("");
  const [catalogueTitle, setCatalogueTitle] = useState("Sellora Digital Catalogue");
  const [pdfPages, setPdfPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEnquiry, setShowEnquiry] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [successRef, setSuccessRef] = useState("");
  const [form, setForm] = useState({ customerName: "", businessName: "", phone: "", city: "", state: "", message: "" });
  const [adminForm, setAdminForm] = useState({ sku: "", name: "", count: "20s OE", yarnType: "Recycled OE", price: "", description: "" });
  const [adminMessage, setAdminMessage] = useState("");
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const pdfInput = useRef<HTMLInputElement>(null);
  const flipRef = useRef<any>(null);

  const counts = useMemo(() => ["All counts", ...new Set(products.map(p => p.count))], [products]);
  const types = useMemo(() => ["All types", ...new Set(products.map(p => p.yarnType))], [products]);

  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (count !== "All counts") params.set("count", count);
      if (type !== "All types") params.set("type", type);
      const response = await fetch(`${API}/products?${params}`);
      if (!response.ok) throw new Error("Could not load products. Check that the API and database are running.");
      setProducts(await response.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load products.");
      setProducts([]);
    } finally { setLoading(false); }
  }

  useEffect(() => { void loadProducts(); }, [query, count, type]);

  async function loadEnquiries() {
    try {
      const response = await fetch(`${API}/enquiries`);
      if (response.ok) setEnquiries(await response.json());
    } catch { /* API status is shown in the dashboard */ }
  }

  function addToCart(product: Product) {
    setCart(old => {
      const existing = old.find(i => i.product.id === product.id);
      if (existing) return old.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...old, { product, quantity: 1, shadeName: product.shades[0]?.name || "" }];
    });
  }

  async function submitEnquiry(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch(`${API}/enquiries`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          items: cart.map(i => ({ productId: i.product.id, shadeName: i.shadeName || undefined, quantity: i.quantity, unit: "kg" }))
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not submit enquiry.");
      setSuccessRef(data.reference);
      setCart([]);
      setShowEnquiry(false);
      setForm({ customerName: "", businessName: "", phone: "", city: "", state: "", message: "" });
    } catch (e) { setError(e instanceof Error ? e.message : "Could not submit enquiry."); }
  }

  async function createProduct(event: React.FormEvent) {
    event.preventDefault();
    setAdminMessage("");
    try {
      const response = await fetch(`${API}/products`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...adminForm, price: adminForm.price ? Number(adminForm.price) : undefined, isPublished: true })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Product creation failed.");
      setAdminMessage(`Created ${data.name}. Remember to protect admin API routes before production.`);
      setAdminForm({ sku: "", name: "", count: "20s OE", yarnType: "Recycled OE", price: "", description: "" });
      await loadProducts();
    } catch (e) { setAdminMessage(e instanceof Error ? e.message : "Product creation failed."); }
  }

  async function uploadPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") { setAdminMessage("Please choose a PDF file."); return; }
    setUploading(true); setAdminMessage("");
    try {
      const body = new FormData();
      body.append("pdf", file);
      body.append("title", file.name.replace(/\.pdf$/i, ""));
      body.append("isPublished", "true");
      const response = await fetch(`${API}/catalogues/upload`, { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "PDF upload failed.");
      setCatalogueTitle(data.title);
      setCatalogueUrl(`${API_BASE}${data.url}`);
      setPdfPages([]);
      setAdminMessage("PDF uploaded. Preparing flipbook…");
      await renderPdf(`${API_BASE}${data.url}`);
    } catch (e) { setAdminMessage(e instanceof Error ? e.message : "PDF upload failed."); }
    finally { setUploading(false); event.target.value = ""; }
  }

  async function renderPdf(url: string) {
    try {
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${(pdfjs as any).version}/pdf.worker.min.mjs`;
      const pdf = await pdfjs.getDocument(url).promise;
      const pages: string[] = [];
      const maxPages = Math.min(pdf.numPages, 80);
      for (let n = 1; n <= maxPages; n++) {
        const page = await pdf.getPage(n);
        const viewport = page.getViewport({ scale: 0.85 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d");
        if (!context) continue;
        canvas.width = viewport.width; canvas.height = viewport.height;
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        pages.push(canvas.toDataURL("image/jpeg", 0.82));
      }
      if (!pages.length) throw new Error("The PDF has no renderable pages.");
      setPdfPages(pages);
      setAdminMessage(`Flipbook ready: ${pages.length} page(s) rendered${pdf.numPages > maxPages ? `; preview limited to ${maxPages} pages` : ""}.`);
    } catch (e) {
      setAdminMessage(`PDF uploaded, but preview rendering failed: ${e instanceof Error ? e.message : "unknown error"}. Check browser access to the PDF worker.`);
    }
  }

  async function changeStatus(id: string, status: string) {
    try {
      const response = await fetch(`${API}/enquiries/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      if (!response.ok) throw new Error("Status update failed.");
      await loadEnquiries();
    } catch (e) { setAdminMessage(e instanceof Error ? e.message : "Status update failed."); }
  }

  function openAdmin() { setShowAdmin(true); void loadEnquiries(); }

  return <div className="app-shell">
    <header className="site-header">
      <a className="brand" href="#" aria-label="Sellora home">
        <span className="brand-mark">S</span><span><strong>SELLORA</strong><small>DIGITAL CATALOGUES · SMARTER SALES</small></span>
      </a>
      <nav className="header-actions">
        <a href="#catalogue" className="nav-link">Catalogue</a>
        <a href="#products" className="nav-link">Yarns & Shades</a>
        <button className="button button-quiet" onClick={() => setShowOnboarding(true)}><Building2 size={16}/> New business</button><button className="button button-quiet" onClick={openAdmin}><LayoutDashboard size={16}/> Sales dashboard</button>
        <button className="button button-primary" onClick={() => setShowEnquiry(true)}><ShoppingBag size={16}/> Enquiry {cart.length > 0 && <span className="cart-count">{cart.length}</span>}</button>
      </nav>
    </header>

    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><span className="eyebrow-dot"/> DIGITAL CATALOGUES · SMARTER SALES</div>
          <h1>Find the right yarn.<br/><em>Build better textiles.</em></h1>
          <p>Explore our yarn range, browse shades and view published prices. Select what you need and send our team an enquiry.</p>
          <div className="hero-actions"><a className="button button-primary button-large" href="#catalogue"><BookOpen size={18}/> Explore catalogue</a><a className="text-link" href="#products">Browse products <ChevronRight size={16}/></a></div>
          <div className="hero-proof"><span><CheckCircle2 size={15}/> B2B yarn trading</span><span><CheckCircle2 size={15}/> Direct sales enquiry</span></div>
        </div>
        <div className="hero-art" aria-label="Decorative yarn shade display">
          <div className="art-card art-card-back"><div className="art-label">COLOUR STORIES / 01</div><div className="cone-row">{["#e2a13c","#d44d67","#347f9b","#56885b"].map(c=><div key={c} className="mini-cone" style={{"--cone":c} as React.CSSProperties}/>)}</div></div>
          <div className="art-card art-card-front"><div className="art-label">SELLORA <span>CATALOGUE STUDIO</span></div><div className="yarn-illustration"><div className="yarn-cone cone-orange"/><div className="yarn-cone cone-green"/><div className="yarn-cone cone-blue"/></div><div className="art-footer"><span>QUALITY · COLOUR · CONSISTENCY</span><span>SELLORA / CATALOGUES</span></div></div>
          <div className="floating-note"><span className="floating-icon"><Package size={17}/></span><span><strong>Yarn range</strong><small>Explore by count & shade</small></span></div>
        </div>
      </section>

      <section className="trust-strip"><span>YARN COUNTS</span><strong>20s OE</strong><i/><strong>2/20s</strong><i/><strong>2/40s</strong><i/><strong>10s</strong><i/><strong>18s</strong><i/><strong>24s</strong></section>

      <section className="flipbook-section section-wrap" id="catalogue">
        <div className="section-heading"><div><div className="eyebrow">YOUR PRODUCTS, DIGITALLY PRESENTED</div><h2>Turn the page.<br/><em>Open new possibilities.</em></h2></div><p>Publish a polished digital catalogue your customers can browse and share. Upload an existing PDF to preview it as a page-turning flipbook.</p></div>
        {pdfPages.length > 0 ? <div className="flipbook-shell">
          <div className="flipbook-top"><span><BookOpen size={16}/> {catalogueTitle}</span><span>{pdfPages.length} pages</span></div>
          <div className="flipbook-stage">
            <button className="flip-arrow" aria-label="Previous page" onClick={() => flipRef.current?.pageFlip()?.flipPrev()}><ChevronLeft/></button>
            <div className="flipbook-holder">
              <HTMLFlipBook ref={flipRef} width={370} height={500} size="stretch" minWidth={280} maxWidth={600} minHeight={380} maxHeight={720} maxShadowOpacity={0.35} showCover={true} mobileScrollSupport={true} className="flipbook" style={{margin:"0 auto"}} startPage={0} drawShadow={true} flippingTime={650} usePortrait={true} startZIndex={0} autoSize={true} clickEventForward={true} useMouseEvents={true} swipeDistance={30} showPageCorners={true} disableFlipByClick={false} onFlip={() => {}}>
                {pdfPages.map((src, i) => <div className="pdf-page" key={i}><img src={src} alt={`Catalogue page ${i+1}`} loading="lazy"/><span>{i+1}</span></div>)}
              </HTMLFlipBook>
            </div>
            <button className="flip-arrow" aria-label="Next page" onClick={() => flipRef.current?.pageFlip()?.flipNext()}><ChevronRight/></button>
          </div>
          <div className="flipbook-bottom"><span>Use the arrows or swipe to turn pages</span><a href={catalogueUrl} target="_blank" rel="noreferrer">Open original PDF <ExternalLink size={14}/></a></div>
        </div> : <div className="flipbook-empty">
          <div className="empty-book"><div className="empty-book-spine">S</div><div className="empty-book-cover"><span>SELLORA</span><strong>DIGITAL<br/>CATALOGUE</strong><i>YOUR PRODUCTS. BEAUTIFULLY PRESENTED.</i><div className="cover-cones"><span/><span/><span/></div><small>DIGITAL CATALOGUES · SMARTER SALES</small></div></div>
          <div className="empty-book-copy"><span className="pill-label">INTERACTIVE FLIPBOOK</span><h3>Your digital shade book starts here.</h3><p>Upload your existing yarn catalogue PDF in the sales dashboard to activate page-turning preview. The viewer will use your real catalogue pages.</p><button className="button button-primary" onClick={() => {setShowAdmin(true); setTimeout(() => pdfInput.current?.click(), 200)}}><Upload size={16}/> Upload catalogue PDF</button></div>
        </div>}
      </section>

      <section className="products-section section-wrap" id="products">
        <div className="section-heading products-heading"><div><div className="eyebrow">CATALOGUE PREVIEW</div><h2>Products, ready to <em>be discovered.</em></h2></div><p>This starter workspace currently demonstrates the product catalogue using yarn records. Industry-specific product fields are being built next.</p></div>
        <div className="catalogue-controls">
          <label className="search-box"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search yarn, count or shade…" aria-label="Search products"/></label>
          <select value={count} onChange={e=>setCount(e.target.value)} aria-label="Filter by yarn count">{counts.map(c=><option key={c}>{c}</option>)}</select>
          <select value={type} onChange={e=>setType(e.target.value)} aria-label="Filter by yarn type">{types.map(t=><option key={t}>{t}</option>)}</select>
        </div>
        {error && <div className="notice notice-error">{error}</div>}
        {loading ? <div className="loading-state">Loading yarn catalogue…</div> : products.length ? <div className="product-grid">{products.map(product=><article className="product-card" key={product.id}>
          <div className="product-visual"><div className="product-cone" style={{"--cone":product.shades[0]?.hexColor || "#7a9b73"} as React.CSSProperties}/><span className="count-chip">{product.count}</span></div>
          <div className="product-info"><div className="product-meta"><span>{product.yarnType}</span><span className={`availability availability-${product.availability.toLowerCase()}`}>{product.availability === "AVAILABLE" ? "Available" : product.availability === "LIMITED" ? "Limited" : product.availability === "UNAVAILABLE" ? "Unavailable" : "Check availability"}</span></div><h3>{product.name}</h3><div className="shade-list">{product.shades.slice(0,5).map(shade=><span className="shade-dot" key={shade.id} title={`${shade.name} (${shade.code})`} style={{"--shade":shade.hexColor || "#d6d6d6"} as React.CSSProperties}/>) }{product.shades.length>5&&<small>+{product.shades.length-5}</small>}</div><div className="product-price">{money(product.price)}</div><div className="product-card-footer"><span>{product.shades.length} shade(s)</span><button className="add-button" onClick={()=>addToCart(product)} aria-label={`Add ${product.name} to enquiry`}><ShoppingBag size={16}/> Add to enquiry</button></div></div>
        </article>)}</div> : <div className="no-products"><Package size={26}/><h3>No published products yet</h3><p>Add verified products and selling prices in the sales dashboard to make them visible here.</p><button className="button button-primary" onClick={()=>setShowAdmin(true)}>Open sales dashboard</button></div>}
      </section>

      <section className="cta-band"><div><span className="eyebrow">LET'S WORK TOGETHER</span><h2>Have a yarn requirement?</h2><p>Tell us the count, shade and quantity you need. Our sales team will follow up.</p></div><button className="button button-light button-large" onClick={()=>setShowEnquiry(true)}><Phone size={17}/> Send an enquiry</button></section>
    </main>

    <footer className="site-footer"><a className="brand brand-footer" href="#"><span className="brand-mark">GS</span><span><strong>GANESHAA SUTRA</strong><small>YARN TRADING · SALEM, INDIA</small></span></a><span>Digital Catalogues. Smarter Sales.</span><span>© {new Date().getFullYear()} Sellora</span></footer>

    {successRef && <div className="toast-success"><CheckCircle2 size={18}/><span><strong>Enquiry received</strong><small>Reference: {successRef}</small></span><button onClick={()=>setSuccessRef("")} aria-label="Dismiss"><X size={16}/></button></div>}

    {showOnboarding && <BusinessOnboarding onClose={() => setShowOnboarding(false)} />}

    {showEnquiry && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowEnquiry(false)}}><section className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="enquiry-title"><div className="modal-heading"><div><span className="eyebrow">SALES ENQUIRY</span><h2 id="enquiry-title">Let's talk yarn.</h2></div><button className="icon-button" onClick={()=>setShowEnquiry(false)} aria-label="Close"><X/></button></div>
      {cart.length ? <form onSubmit={submitEnquiry} className="modal-form">
        <div className="selected-items"><strong>Selected products ({cart.length})</strong>{cart.map(item=><div className="selected-item" key={item.product.id}><span>{item.product.name}<small>{item.product.count} · {item.product.yarnType}</small></span><label>Qty (kg)<input type="number" min="0.1" step="0.1" value={item.quantity} onChange={e=>setCart(old=>old.map(i=>i.product.id===item.product.id?{...i,quantity:Number(e.target.value)}:i))}/></label><button type="button" onClick={()=>setCart(old=>old.filter(i=>i.product.id!==item.product.id))} aria-label="Remove product"><X size={15}/></button></div>)}</div>
        <div className="form-grid"><label>Your name *<input required minLength={2} value={form.customerName} onChange={e=>setForm({...form,customerName:e.target.value})}/></label><label>Business name<input value={form.businessName} onChange={e=>setForm({...form,businessName:e.target.value})}/></label><label>Phone number *<input required minLength={7} value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>City<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label><label>State<input value={form.state} onChange={e=>setForm({...form,state:e.target.value})}/></label><label className="full-field">Message<textarea rows={3} value={form.message} onChange={e=>setForm({...form,message:e.target.value})} placeholder="Required shade, delivery preference, etc."/></label></div>
        {error && <div className="notice notice-error">{error}</div>}<button className="button button-primary button-large full-width" type="submit">Submit enquiry <ChevronRight size={17}/></button><p className="form-footnote">Submitting shares your details with the business managing this catalogue.</p>
      </form> : <div className="empty-cart"><ShoppingBag size={28}/><h3>Your enquiry list is empty</h3><p>Add yarn products from the catalogue first, then send your requirements.</p><button className="button button-primary" onClick={()=>setShowEnquiry(false)}>Browse products</button></div>}</section></div>}

    {showAdmin && <div className="modal-backdrop admin-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowAdmin(false)}}><section className="admin-panel" role="dialog" aria-modal="true" aria-labelledby="admin-title"><div className="modal-heading"><div><span className="eyebrow">INTERNAL TOOL · DEVELOPMENT MODE</span><h2 id="admin-title">Sales dashboard</h2></div><button className="icon-button" onClick={()=>setShowAdmin(false)} aria-label="Close"><X/></button></div><div className="admin-warning"><strong>Security note:</strong> this starter dashboard is not authenticated. Run locally only until authentication and role-based access control are implemented.</div>
      <div className="admin-grid"><section className="admin-card"><h3><Package size={17}/> Add a yarn product</h3><form onSubmit={createProduct} className="admin-form"><label>SKU *<input required value={adminForm.sku} onChange={e=>setAdminForm({...adminForm,sku:e.target.value})} placeholder="GS-20OE-001"/></label><label>Product name *<input required value={adminForm.name} onChange={e=>setAdminForm({...adminForm,name:e.target.value})} placeholder="20s OE Recycled Yarn"/></label><div className="form-grid"><label>Yarn count<select value={adminForm.count} onChange={e=>setAdminForm({...adminForm,count:e.target.value})}>{["20s OE","2/20s","2/40s","10s","18s","24s"].map(v=><option key={v}>{v}</option>)}</select></label><label>Yarn type<select value={adminForm.yarnType} onChange={e=>setAdminForm({...adminForm,yarnType:e.target.value})}>{["Recycled OE","Kora CP","Modal","Excel"].map(v=><option key={v}>{v}</option>)}</select></label></div><label>Published price (₹/kg)<input type="number" min="0.01" step="0.01" value={adminForm.price} onChange={e=>setAdminForm({...adminForm,price:e.target.value})} placeholder="Enter verified selling price"/></label><label>Description<textarea rows={2} value={adminForm.description} onChange={e=>setAdminForm({...adminForm,description:e.target.value})}/></label><button className="button button-primary full-width" type="submit">Create & publish product</button></form></section>
      <section className="admin-card"><h3><BookOpen size={17}/> Catalogue PDF</h3><p>Upload a prepared PDF to create the interactive flipbook preview. Large PDFs may take time to render.</p><input ref={pdfInput} className="hidden-input" type="file" accept="application/pdf,.pdf" onChange={uploadPdf}/><button className="upload-drop" onClick={()=>pdfInput.current?.click()} disabled={uploading}><Upload size={24}/><strong>{uploading?"Uploading…":"Choose catalogue PDF"}</strong><span>PDF only · max 25 MB</span></button>{catalogueUrl&&<p className="upload-success"><CheckCircle2 size={15}/> Current PDF: {catalogueTitle}</p>}<h3 className="admin-subheading">Recent enquiries</h3><button className="button button-quiet" onClick={loadEnquiries}>Refresh enquiries</button><div className="enquiry-list">{enquiries.length?enquiries.map((enq:any)=><div className="enquiry-row" key={enq.id}><div><strong>{enq.customerName}</strong><small>{enq.reference} · {enq.phone}</small></div><select value={enq.status} onChange={e=>changeStatus(enq.id,e.target.value)}>{["NEW","CONTACTED","QUOTATION_SENT","CONVERTED","LOST"].map(s=><option key={s} value={s}>{s.replaceAll("_"," ")}</option>)}</select></div>):<p className="muted-copy">No enquiries loaded yet.</p>}</div></section></div>
      {adminMessage&&<div className={`notice ${adminMessage.startsWith("Created")||adminMessage.startsWith("Flipbook ready")?"notice-success":"notice-info"}`}>{adminMessage}</div>}
      <p className="admin-footer-note">Sellora V2 development foundation · Authentication and protected admin routes are required before production deployment.</p>
    </section></div>}
  </div>;
}
