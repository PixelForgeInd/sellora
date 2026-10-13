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
      <header className="sl-home-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#features">Features</a>
          <a href="#how-it-works">How it works</a>
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

      <section className="sl-home-steps" id="how-it-works">
        <div><span className="sl-home-eyebrow">HOW IT WORKS</span><h2>From products to <em>possibilities.</em></h2></div>
        <ol><li><span>01</span><div><b>Set up your workspace</b><p>Add your business details and brand.</p></div></li><li><span>02</span><div><b>Add your products</b><p>Build a catalogue that reflects your business.</p></div></li><li><span>03</span><div><b>Share and connect</b><p>Send your catalogue link and hear from customers.</p></div></li></ol>
      </section>

      <section className="sl-home-bottom"><span className="sl-home-eyebrow">SELLORA · DIGITAL CATALOGUES. SMARTER SALES.</span><h2>Your products deserve <em>to be seen.</em></h2><p>Start building a catalogue that works as hard as your business.</p><a className="sl-home-cta" href="/signup">Start your workspace <ArrowRight size={16}/></a></section>
      <footer className="sl-home-footer"><Brand/><span>Digital Catalogues. Smarter Sales.</span><a href="/login">Log in</a></footer>
    </main>
  );
}
