import { ArrowRight, BookOpen, MessageCircle, PackageCheck, Share2, ShoppingBag } from "lucide-react";
import { Brand } from "./ui";

const features = [
  { icon: BookOpen, title: "Digital catalogues", text: "Present your products in a clean, professional catalogue that customers can browse anywhere." },
  { icon: Share2, title: "Share in seconds", text: "Share one simple catalogue link with customers on WhatsApp and other channels." },
  { icon: MessageCircle, title: "Customer enquiries", text: "Make it easy for buyers to ask about products and connect with your business." },
  { icon: PackageCheck, title: "Orders in one place", text: "Keep products, enquiries and incoming orders organised in your Sellora workspace." },
];

export function HomePage() {
  return (
    <main className="sl-home">
      <style>{`
        .sl-home-pricing{padding:clamp(64px,8vw,108px) clamp(20px,6vw,88px);background:#f7f9f5}
        .sl-home-pricing-grid{max-width:900px;margin:38px auto 0;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;align-items:stretch}
        .sl-home-price-card{position:relative;background:#fff;border:1px solid #e1e8de;border-radius:20px;padding:30px;display:flex;flex-direction:column;box-shadow:0 8px 26px rgba(32,48,32,.04)}
        .sl-home-price-featured{border:2px solid #599c56;box-shadow:0 12px 34px rgba(46,108,48,.10)}
        .sl-home-price-badge{align-self:flex-start;background:#eaf5e7;color:#2e7332;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:800;letter-spacing:.04em;margin-bottom:18px}
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
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
          <a href="#pricing">Pricing</a>
          <a className="sl-home-login" href="/login">Log in</a>
          <a className="sl-home-cta" href="/signup">Get started <ArrowRight size={15} /></a>
        </nav>
      </header>

      <section className="sl-home-hero">
        <div className="sl-home-copy">
          <span className="sl-home-eyebrow">YOUR PRODUCTS. YOUR BRAND.</span>
          <h1>Turn your products into a <em>better way to sell.</em></h1>
          <p>Create a polished digital catalogue, share it with customers and manage enquiries from one simple workspace.</p>
          <div className="sl-home-actions">
            <a className="sl-home-cta" href="/signup">Create your free workspace <ArrowRight size={16} /></a>
            <a className="sl-home-secondary" href="/demo/ganeshaa-sutra">Explore a demo</a>
          </div>
          <div className="sl-home-points"><span>✓ Easy to set up</span><span>✓ Share one simple link</span><span>✓ Built for business</span></div>
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

      <section className="sl-home-features" id="features">
        <div className="sl-home-section-heading"><span className="sl-home-eyebrow">A SIMPLER WAY TO SELL</span><h2>Everything starts with <em>a better catalogue.</em></h2><p>Give your products a clear online home and make it easier for customers to take the next step.</p></div>
        <div className="sl-home-feature-grid">{features.map(({icon: Icon,title,text}) => <article className="sl-home-feature" key={title}><span className="sl-home-feature-icon"><Icon size={22}/></span><h3>{title}</h3><p>{text}</p></article>)}</div>
      </section>

      <section className="sl-home-pricing" id="pricing">
        <div className="sl-home-section-heading">
          <span className="sl-home-eyebrow">SIMPLE, TRANSPARENT PRICING</span>
          <h2>Choose the plan that <em>works for you.</em></h2>
          <p>Start with the billing option that suits your business. Secure payments are verified by Sellora.</p>
        </div>
        <div className="sl-home-pricing-grid">
          <article className="sl-home-price-card">
            <span className="sl-home-eyebrow">MONTHLY</span>
            <h3>Flexible</h3>
            <p className="sl-home-price"><strong>₹249</strong><span>/ month</span></p>
            <p className="sl-home-price-desc">A simple monthly subscription with flexibility to renew each month.</p>
            <ul><li>Digital product catalogue</li><li>Shareable public catalogue link</li><li>Product and catalogue management</li><li>Customer enquiries and orders</li><li>Subscription management</li></ul>
            <a className="sl-home-price-cta" href="/signup">Get started monthly <ArrowRight size={16}/></a>
          </article>
          <article className="sl-home-price-card sl-home-price-featured">
            <span className="sl-home-price-badge">BEST VALUE · SAVE ₹498</span>
            <span className="sl-home-eyebrow">YEARLY</span>
            <h3>Annual</h3>
            <p className="sl-home-price"><strong>₹2,490</strong><span>/ year</span></p>
            <p className="sl-home-price-desc">Pay for 10 months and get 12 months of subscription access.</p>
            <ul><li>Everything in monthly billing</li><li>12 months of access</li><li>Fewer renewal reminders</li><li>Save ₹498 compared with monthly billing</li></ul>
            <a className="sl-home-price-cta" href="/signup">Get started yearly <ArrowRight size={16}/></a>
          </article>
        </div>
        <p className="sl-home-pricing-note">Prices are in INR. Subscription activation and renewal depend on successful payment verification. Applicable taxes, if any, are shown at checkout.</p>
      </section>

      <section className="sl-home-steps" id="how-it-works">
        <div><span className="sl-home-eyebrow">HOW IT WORKS</span><h2>From products to <em>possibilities.</em></h2></div>
        <ol><li><span>01</span><div><b>Set up your workspace</b><p>Add your business details and brand.</p></div></li><li><span>02</span><div><b>Add your products</b><p>Build a catalogue that reflects your business.</p></div></li><li><span>03</span><div><b>Share and connect</b><p>Send your catalogue link and hear from customers.</p></div></li></ol>
      </section>

      <section className="sl-home-bottom"><span className="sl-home-eyebrow">SELLORA · DIGITAL CATALOGUES. SMARTER SALES.</span><h2>Your products deserve <em>to be seen.</em></h2><p>Start building a catalogue that works as hard as your business.</p><a className="sl-home-cta" href="/signup">Start your workspace <ArrowRight size={16}/></a></section>
      <footer className="sl-home-footer"><Brand/><span>Digital Catalogues. Smarter Sales.</span><a href="/login">Log in</a></footer>
    </main>
  );
}
