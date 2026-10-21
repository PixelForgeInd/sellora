import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Check, Copy, MessageCircle, PackageCheck, Search, Send, Share2, ShoppingBag, X } from "lucide-react";
import { api } from "../sellora/api-client";
import { Brand } from "./ui";

const features = [
  { icon: BookOpen, title: "Digital catalogues", text: "Present your products in a clean, professional catalogue that customers can browse anywhere." },
  { icon: Share2, title: "Share in seconds", text: "Share one simple catalogue link with customers on WhatsApp and other channels." },
  { icon: MessageCircle, title: "Customer enquiries", text: "Make it easy for buyers to ask about products and connect with your business." },
  { icon: PackageCheck, title: "Orders in one place", text: "Keep products, enquiries and incoming orders organised in your Sellora workspace." },
];

const demoProducts = [
  { id: "lotus", name: "Lotus Glow Set", category: "Gift sets", price: 1299, description: "A thoughtful set for special moments.", tone: "rose", mark: "✿" },
  { id: "classic", name: "Classic Daily Wear", category: "Everyday", price: 799, description: "Easy-to-love essentials for every day.", tone: "sage", mark: "✧" },
  { id: "festive", name: "Festive Edit", category: "New arrivals", price: 1899, description: "A little extra sparkle for celebrations.", tone: "gold", mark: "❋" },
  { id: "mini", name: "Mini Keepsake Box", category: "Gift sets", price: 549, description: "Small details, beautifully presented.", tone: "lilac", mark: "♡" },
];
const demoCategories = ["All products", "Gift sets", "Everyday", "New arrivals"];

export function HomePage() {
  const [prices, setPrices] = useState({ MONTHLY: 249, YEARLY: 2490 });
  const [homeLanguage, setHomeLanguage] = useState<"en" | "ta">("en");
  const [demoCategory, setDemoCategory] = useState("All products");
  const [demoSearch, setDemoSearch] = useState("");
  const [enquiryProduct, setEnquiryProduct] = useState<(typeof demoProducts)[number] | null>(null);
  const [enquiryName, setEnquiryName] = useState("");
  const [enquiryContact, setEnquiryContact] = useState("");
  const [enquiryMessage, setEnquiryMessage] = useState("");
  const [enquirySent, setEnquirySent] = useState(false);
  const [copiedDemoLink, setCopiedDemoLink] = useState(false);
  const filteredDemoProducts = demoProducts.filter((product) =>
    (demoCategory === "All products" || product.category === demoCategory) &&
    (product.name + " " + product.description + " " + product.category).toLowerCase().includes(demoSearch.toLowerCase())
  );
  useEffect(() => { api("/public/pricing", {}, "").then(setPrices).catch(() => undefined); }, []);
  const savings = Math.max(0, prices.MONTHLY * 12 - prices.YEARLY);
  return (
    <main className="sl-home">
      <style>{`
        .sl-home-language-toggle{border:1px solid #dce8d7;border-radius:999px;padding:8px 12px;background:#fff;color:#2e7332;font:700 12px inherit;cursor:pointer}\n        .sl-home-pricing{padding:clamp(64px,8vw,108px) clamp(20px,6vw,88px);background:#f7f9f5}
        .sl-home-pricing-grid{max-width:900px;margin:38px auto 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;align-items:stretch}
        .sl-home-price-card{position:relative;background:#fff;border:1px solid #e1e8de;border-radius:20px;padding:30px;display:flex;flex-direction:column;box-shadow:0 8px 26px rgba(32,48,32,.04)}
        .sl-home-price-featured{border:2px solid #599c56;box-shadow:0 12px 34px rgba(46,108,48,.10)}
        .sl-home-price-badge{align-self:flex-start;background:#eaf5e7;color:#2e7332;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.04em;margin-bottom:18px}\n        .sl-home-recommended{position:absolute;top:18px;right:24px;background:#eaf5e7;color:#2e7332;border:1px solid #c8e8c2;border-radius:999px;padding:7px 13px;font-size:11px;font-weight:800;letter-spacing:.06em;box-shadow:0 4px 12px rgba(46,115,50,.08)}
        .sl-home-price-card h3{font-size:23px;margin:10px 0 0;color:#26352a}
        .sl-home-price{display:flex;align-items:baseline;gap:7px;margin:20px 0 8px}
        .sl-home-price strong{font-size:clamp(34px,4vw,44px);line-height:1.1;letter-spacing:-.04em;color:#1d3022}
        .sl-home-price span{font-size:14px;color:#727d70}
        .sl-home-price-desc{min-height:48px;color:#697568;line-height:1.6;font-size:14px}
        .sl-home-price-card ul{list-style:none;padding:18px 0 24px;margin:0;display:grid;gap:13px}
        .sl-home-price-card li{font-size:14px;color:#3d4a3d;line-height:1.5}
        .sl-home-price-card li:before{content:"✓";color:#599c56;font-weight:800;margin-right:10px}
        .sl-home-price-cta{margin-top:auto;min-height:46px;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;border-radius:10px;background:#599c56;color:#fff;font-weight:700;font-size:14px;padding:12px 16px}
        .sl-home-price-cta:hover{background:#468846}
        .sl-home-pricing-note{max-width:760px;text-align:center;margin:24px auto 0;color:#7b8578;font-size:12px;line-height:1.6}
        @media(max-width:680px){.sl-home-pricing-grid{grid-template-columns:1fr;max-width:430px}.sl-home-price-card{padding:24px}.sl-home-price-desc{min-height:0}}
      `}</style>

      <header className="sl-home-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <button type="button" className="sl-home-language-toggle" onClick={() => setHomeLanguage(homeLanguage === "en" ? "ta" : "en")} aria-label="Switch language">{homeLanguage === "en" ? "தமிழ்" : "English"}</button>
          <a href="#features">{homeLanguage === "en" ? "Features" : "அம்சங்கள்"}</a>
          <a href="#how-it-works">{homeLanguage === "en" ? "How it works" : "எப்படி செயல்படுகிறது"}</a>
          <a href="#pricing">{homeLanguage === "en" ? "Pricing" : "விலைத் திட்டங்கள்"}</a>
          <a className="sl-home-login" href="/login">{homeLanguage === "en" ? "Log in" : "உள்நுழைக"}</a>
          <a className="sl-home-cta" href="/signup">{homeLanguage === "en" ? "Get started" : "தொடங்குங்கள்"} <ArrowRight size={15} /></a>
        </nav>
      </header>

      <section className="sl-home-hero">
        <div className="sl-home-copy">
          <span className="sl-home-eyebrow">{homeLanguage === "en" ? "YOUR PRODUCTS. YOUR BRAND." : "உங்கள் தயாரிப்புகள். உங்கள் பிராண்ட்."}</span>
          <h1>{homeLanguage === "en" ? <>Turn your products into a <em>better way to sell.</em></> : <>உங்கள் தயாரிப்புகளை <em>சிறப்பாக விற்பனை செய்யுங்கள்.</em></>}</h1>
          <p>{homeLanguage === "en" ? "Create a polished digital catalogue, share it with customers and manage enquiries from one simple workspace." : "அழகான டிஜிட்டல் பட்டியலை உருவாக்கி, வாடிக்கையாளர்களுடன் பகிர்ந்து, விசாரணைகளை ஒரே இடத்தில் நிர்வகிக்கவும்."}</p>
          <div className="sl-home-actions">
            <a className="sl-home-cta" href="/signup">{homeLanguage === "en" ? "Create your free workspace" : "இலவச பணியிடத்தை உருவாக்குங்கள்"} <ArrowRight size={16} /></a>
            <a className="sl-home-secondary" href="/demo/ganeshaa-sutra">{homeLanguage === "en" ? "Explore a demo" : "மாதிரியைப் பாருங்கள்"}</a>
          </div>
          <div className="sl-home-points"><span>✓ {homeLanguage === "en" ? "Easy to set up" : "எளிதாக அமைக்கலாம்"}</span><span>✓ {homeLanguage === "en" ? "Share one simple link" : "ஒரே இணைப்பைப் பகிருங்கள்"}</span><span>✓ {homeLanguage === "en" ? "Built for business" : "வணிகத்திற்காக உருவாக்கப்பட்டது"}</span></div>
        </div>
        <div className="sl-home-preview" aria-label="Illustration of a digital product catalogue">
          <div className="sl-preview-window">
            <div className="sl-preview-top"><span></span><span></span><span></span><small>YOUR DIGITAL CATALOGUE</small></div>
            <div className="sl-preview-heading"><div><small>PRODUCT COLLECTION</small><h2>Made to be discovered.</h2><p>Your products, presented beautifully.</p></div><div className="sl-preview-badge"><ShoppingBag size={22}/></div></div>
            <div className="sl-preview-products">
              <div className="sl-preview-product sl-preview-yarn"><div className="sl-yarn-art"><i></i><i></i><i></i></div><b>Everyday essentials</b><small>Explore the collection</small></div>
              <div className="sl-preview-product sl-preview-fabric"><div className="sl-fabric-art"><i></i><i></i><i></i></div><b>New season range</b><small>Explore the collection</small></div>
            </div>
            <div className="sl-preview-share"><Share2 size={16}/><span><b>Ready to share</b><small>One link. More possibilities.</small></span><span className="sl-preview-share-pill">Copy link</span></div>
          </div>
          <div className="sl-home-floating"><span><MessageCircle size={17}/></span><div><b>Customer enquiries</b><small>All starting with your catalogue</small></div></div>
        </div>
      </section>

      <section className="sl-live-demo" id="live-demo">
        <div className="sl-live-demo-intro">
          <span className="sl-home-eyebrow"><span className="sl-live-demo-dot" /> {homeLanguage === "en" ? "TRY IT YOURSELF" : "நீங்களே முயற்சிக்கவும்"}</span>
          <h2>Explore a catalogue.<br /><em>Imagine it as yours.</em></h2>
          <p>{homeLanguage === "en" ? "This interactive sample shows how customers can browse products and start an enquiry from a business catalogue." : "வாடிக்கையாளர்கள் தயாரிப்புகளைப் பார்த்து வணிகப் பட்டியலிலிருந்து விசாரணை அனுப்புவது எப்படி என்பதை இந்த மாதிரி காட்டுகிறது."}</p>
          <div className="sl-live-demo-points"><span><Check size={15} /> {homeLanguage === "en" ? "Filter collections" : "தொகுப்புகளை வடிகட்டவும்"}</span><span><Check size={15} /> {homeLanguage === "en" ? "Search products" : "தயாரிப்புகளைத் தேடுங்கள்"}</span><span><Check size={15} /> {homeLanguage === "en" ? "Try an enquiry" : "விசாரணையை முயற்சிக்கவும்"}</span></div>
          <button type="button" className="sl-live-demo-share" onClick={() => {
            const link = window.location.origin + "/demo/ganeshaa-sutra";
            if (navigator.clipboard?.writeText) navigator.clipboard.writeText(link).then(() => setCopiedDemoLink(true)).catch(() => setCopiedDemoLink(false));
            else setCopiedDemoLink(false);
          }}><Copy size={15} /> {copiedDemoLink ? "Demo link copied" : "Copy demo link"}</button>
          <small className="sl-live-demo-disclaimer">Sample catalogue for preview only. Enquiries here are not sent to a real business.</small>
        </div>
        <div className="sl-live-catalogue">
          <div className="sl-live-catalogue-top"><div><span className="sl-live-store-mark">✿</span><span><b>Studio &amp; Co.</b><small>Sample digital catalogue</small></span></div><span className="sl-live-catalogue-status"><i /> Preview</span></div>
          <div className="sl-live-catalogue-hero"><small>THE COLLECTION</small><h3>Little things.<br />Lovely details.</h3><p>Thoughtfully picked for your everyday and your special days.</p></div>
          <label className="sl-live-search"><Search size={16} /><input aria-label="Search sample products" value={demoSearch} onChange={(event) => setDemoSearch(event.target.value)} placeholder="Search this catalogue" /><span>{filteredDemoProducts.length}</span></label>
          <div className="sl-live-categories" aria-label="Filter sample products by category">
            {demoCategories.map((category) => <button key={category} type="button" className={demoCategory === category ? "is-active" : ""} aria-pressed={demoCategory === category} onClick={() => setDemoCategory(category)}>{category}</button>)}
          </div>
          <div className="sl-live-products">
            {filteredDemoProducts.map((product) => <article className="sl-live-product" key={product.id}>
              <div className={"sl-live-product-art " + product.tone}><span>{product.mark}</span><small>STUDIO &amp; CO.</small></div>
              <div className="sl-live-product-copy"><span>{product.category}</span><h4>{product.name}</h4><p>{product.description}</p><div><b>₹{product.price.toLocaleString("en-IN")}</b><button type="button" onClick={() => { setEnquiryProduct(product); setEnquirySent(false); setEnquiryMessage("Hi, I’d like to know more about " + product.name + "."); }} aria-label={"Enquire about " + product.name}>Enquire <ArrowRight size={14} /></button></div></div>
            </article>)}
            {filteredDemoProducts.length === 0 && <div className="sl-live-empty"><Search size={20} /><b>No matching products</b><span>Try another search or category.</span><button type="button" onClick={() => { setDemoSearch(""); setDemoCategory("All products"); }}>Clear filters</button></div>}
          </div>
          <div className="sl-live-catalogue-foot"><Share2 size={14} /><span>A catalogue link customers can browse anywhere</span><span>Powered by Sellora</span></div>
        </div>
        {enquiryProduct && <div className="sl-enquiry-backdrop" role="presentation" onClick={(event) => { if (event.target === event.currentTarget) setEnquiryProduct(null); }}>
          <section className="sl-enquiry-modal" role="dialog" aria-modal="true" aria-labelledby="sl-demo-enquiry-title">
            <button type="button" className="sl-enquiry-close" aria-label="Close enquiry" onClick={() => setEnquiryProduct(null)}><X size={18} /></button>
            {!enquirySent ? <>
              <span className="sl-home-eyebrow"><MessageCircle size={15} /> SAMPLE CUSTOMER ENQUIRY</span>
              <h3 id="sl-demo-enquiry-title">Ask about {enquiryProduct.name}</h3>
              <p>This is a demo form. Try filling it in to see the customer experience.</p>
              <form onSubmit={(event) => { event.preventDefault(); setEnquirySent(true); }}>
                <label>Your name<input required value={enquiryName} onChange={(event) => setEnquiryName(event.target.value)} placeholder="Enter your name" /></label>
                <label>Email or phone<input required value={enquiryContact} onChange={(event) => setEnquiryContact(event.target.value)} placeholder="How could the business reach you?" /></label>
                <label>Your message<textarea required rows={3} value={enquiryMessage} onChange={(event) => setEnquiryMessage(event.target.value)} /></label>
                <button className="sl-enquiry-submit" type="submit">Preview enquiry <Send size={15} /></button>
                <small>Demo only — nothing is sent or stored.</small>
              </form>
            </> : <div className="sl-enquiry-success"><span><Check size={24} /></span><h3 id="sl-demo-enquiry-title">Your preview is ready</h3><p>This is how a customer enquiry confirmation could look. No message was sent to a real business.</p><div><b>{enquiryProduct.name}</b><span>From {enquiryName}</span><span>{enquiryContact}</span><p>{enquiryMessage}</p></div><button type="button" className="sl-enquiry-submit" onClick={() => setEnquiryProduct(null)}>Back to catalogue <ArrowRight size={15} /></button></div>}
          </section>
        </div>}
      </section>

      <section className="sl-home-features" id="features">
        <div className="sl-home-section-heading"><span className="sl-home-eyebrow">{homeLanguage === "en" ? "A SIMPLER WAY TO SELL" : "எளிதாக விற்பனை செய்யுங்கள்"}</span><h2>{homeLanguage === "en" ? <>Everything starts with <em>a better catalogue.</em></> : <>எல்லாம் <em>சிறந்த பட்டியலில்</em> தொடங்குகிறது.</>}</h2><p>{homeLanguage === "en" ? "Give your products a clear online home and make it easier for customers to take the next step." : "உங்கள் தயாரிப்புகளுக்கு தெளிவான இணையப் பட்டியலை உருவாக்கி, வாடிக்கையாளர்கள் எளிதாக தொடர்புகொள்ள உதவுங்கள்."}</p></div>
        <div className="sl-home-feature-grid">{features.map(({icon: Icon,title,text}) => <article className="sl-home-feature" key={title}><span className="sl-home-feature-icon"><Icon size={22}/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="sl-home-pricing" id="pricing">
        <div className="sl-home-section-heading">
          <span className="sl-home-eyebrow">{homeLanguage === "en" ? "SIMPLE, TRANSPARENT PRICING" : "எளிய, வெளிப்படையான விலை"}</span>
          <h2>{homeLanguage === "en" ? <>Choose the plan that <em>works for you.</em></> : <>உங்களுக்கு ஏற்ற <em>திட்டத்தைத் தேர்ந்தெடுங்கள்.</em></>}</h2>
          <p>{homeLanguage === "en" ? "Start with the billing option that suits your business. Secure payments are verified by Sellora." : "உங்கள் வணிகத்திற்கு ஏற்ற கட்டணத் திட்டத்தைத் தேர்ந்தெடுக்கவும். பாதுகாப்பான கட்டணங்களை Sellora சரிபார்க்கிறது."}</p>
        </div>
        <div className="sl-home-pricing-grid">
          <article className="sl-home-price-card">
            <span className="sl-home-eyebrow">MONTHLY</span>
            <h3>Flexible</h3>
            <p className="sl-home-price"><strong>₹{prices.MONTHLY.toLocaleString("en-IN")}</strong><span>/ month</span></p>
            <p className="sl-home-price-desc">A simple monthly subscription with flexibility to renew each month.</p>
            <ul><li>Digital product catalogue</li><li>Shareable public catalogue link</li><li>Product and catalogue management</li><li>Customer enquiries and orders</li><li>Custom payment setup</li></ul>
            <a className="sl-home-price-cta" href="/signup">Get started monthly <ArrowRight size={16}/></a>
          </article>
          <article className="sl-home-price-card sl-home-price-featured">
            <span className="sl-home-recommended">RECOMMENDED</span>
            <span className="sl-home-price-badge">BEST VALUE · SAVE ₹{savings.toLocaleString("en-IN")}</span>
            <span className="sl-home-eyebrow">YEARLY</span>
            <h3>Annual</h3>
            <p className="sl-home-price"><strong>₹{prices.YEARLY.toLocaleString("en-IN")}</strong><span>/ year</span></p>
            <p className="sl-home-price-desc">Pay for 10 months and get 12 months of subscription access.</p>
            <ul><li>Everything in monthly billing</li><li>12 months of access</li><li>Fewer renewal reminders</li><li>Save ₹{savings.toLocaleString("en-IN")} compared with monthly billing</li></ul>
            <a className="sl-home-price-cta" href="/signup">Get started yearly <ArrowRight size={16}/></a>
          </article>
        </div>
        <p className="sl-home-pricing-note">Prices are in INR. Subscription activation and renewal depend on successful payment verification. Applicable taxes, if any, are shown at checkout.</p>
      </section>

      <section className="sl-home-steps" id="how-it-works">
        <div><span className="sl-home-eyebrow">{homeLanguage === "en" ? "HOW IT WORKS" : "எப்படி செயல்படுகிறது"}</span><h2>{homeLanguage === "en" ? <>From products to <em>possibilities.</em></> : <>தயாரிப்புகளிலிருந்து <em>புதிய வாய்ப்புகளுக்கு.</em></>}</h2></div>
        <ol><li><span>01</span><div><b>Set up your workspace</b><p>Add your business details and brand.</p></div></li><li><span>02</span><div><b>Add your products</b><p>Build a catalogue that reflects your business.</p></div></li><li><span>03</span><div><b>Share and connect</b><p>Send your catalogue link and hear from customers.</p></div></li></ol>
      </section>

      <section className="sl-home-bottom">
        <span className="sl-home-eyebrow">MADE FOR THE WAY YOU SELL</span>
        <h2>Bring your products <em>into focus.</em></h2>
        <p>Create a beautiful digital catalogue, share it in seconds and turn product interest into customer enquiries — all from one workspace.</p>
        <div className="sl-home-bottom-actions">
          <a className="sl-home-cta" href="/signup">Create your Sellora workspace <ArrowRight size={16}/></a>
          <a className="sl-home-bottom-secondary" href="#features">Explore Sellora</a>
        </div>
        <span className="sl-home-bottom-note"><span aria-hidden="true">✓</span> Simple to start <span aria-hidden="true">·</span> Easy to share <span aria-hidden="true">·</span> Built for growing businesses</span>
      </section>
    </main>
  );
}
