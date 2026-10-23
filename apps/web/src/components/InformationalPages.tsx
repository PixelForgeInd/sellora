import { useEffect, useState } from "react";
import { BookOpen, ShieldCheck, Sprout, Printer, ListChecks } from "lucide-react";
import { SiteHeader } from "./SiteHeader";

type InfoPageKind = "about" | "terms" | "privacy";

const pageContent = {
  about: {
    eyebrow: "ABOUT SELLORA",
    title: "A clearer way to present and sell your products.",
    intro: "Sellora helps businesses turn product information into a professional digital catalogue that is easy to share and simple for customers to explore.",
  },
  terms: {
    eyebrow: "TERMS & CONDITIONS",
    title: "The terms for using Sellora.",
    intro: "These terms explain the basic rules for accessing and using Sellora. Please read them before creating a workspace or using the service.",
  },
  privacy: {
    eyebrow: "PRIVACY POLICY",
    title: "Your business information deserves care.",
    intro: "This policy describes, in general terms, how Sellora may handle information when you visit the website or use the platform.",
  },
} satisfies Record<InfoPageKind, { eyebrow: string; title: string; intro: string }>;

export function InformationalPage({ kind }: { kind: InfoPageKind }) {
  const content = pageContent[kind];
  const [language, setLanguage] = useState<"en" | "ta">(() => new URLSearchParams(window.location.search).get("lang") === "ta" ? "ta" : "en");
  const isTamil = language === "ta";
  const [activeSection, setActiveSection] = useState("");
  const [readingProgress, setReadingProgress] = useState(0);

  useEffect(() => {
    if (kind === "about") return;
    const sectionIds = kind === "terms"
      ? ["using-service", "account-security", "content-products", "enquiries-orders", "billing-payments", "acceptable-use", "availability-changes", "suspension-termination", "disclaimers-liability", "updates-contact"]
      : ["information-processed", "how-information-used", "public-catalogue-information", "privacy-payments", "service-providers-sharing", "security-retention", "choices-requests", "children", "privacy-changes-contact"];
    const updateReadingState = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setReadingProgress(scrollable > 0 ? Math.min(100, Math.max(0, (window.scrollY / scrollable) * 100)) : 100);
      let current = sectionIds[0];
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 180) current = id;
      }
      setActiveSection(current);
    };
    updateReadingState();
    window.addEventListener("scroll", updateReadingState, { passive: true });
    window.addEventListener("resize", updateReadingState);
    return () => {
      window.removeEventListener("scroll", updateReadingState);
      window.removeEventListener("resize", updateReadingState);
    };
  }, [kind]);
  return (
    <main className="sl-info-page">
      <SiteHeader language={language} onToggleLanguage={() => { const next = isTamil ? "en" : "ta"; setLanguage(next); const url = new URL(window.location.href); url.searchParams.set("lang", next); window.history.replaceState({}, "", url.toString()); }} showLanguageToggle />
      <section className="sl-info-hero">
        <span className="sl-home-eyebrow">
          {kind === "about" ? <Sprout size={15} /> : kind === "terms" ? <BookOpen size={15} /> : <ShieldCheck size={15} />}
          {isTamil ? (kind === "terms" ? "விதிமுறைகள் மற்றும் நிபந்தனைகள்" : kind === "privacy" ? "தனியுரிமைக் கொள்கை" : "செல்லோரா பற்றி") : content.eyebrow}
        </span>
        <h1>{isTamil ? (kind === "terms" ? "செல்லோராவைப் பயன்படுத்துவதற்கான விதிமுறைகள்" : kind === "privacy" ? "உங்கள் வணிகத் தகவலுக்கு பாதுகாப்பு முக்கியம்" : content.title) : content.title}</h1>
        <p>{isTamil ? (kind === "terms" ? "செல்லோராவை அணுகி பயன்படுத்துவதற்கான அடிப்படை விதிகளை இந்த விதிமுறைகள் விளக்குகின்றன. சேவையைப் பயன்படுத்துவதற்கு முன் படிக்கவும்." : kind === "privacy" ? "இணையதளத்தைப் பார்வையிடும்போது அல்லது தளத்தைப் பயன்படுத்தும்போது தகவல்கள் எவ்வாறு கையாளப்படலாம் என்பதை இந்தக் கொள்கை விளக்குகிறது." : content.intro) : content.intro}</p>
        <span className="sl-info-updated">{isTamil ? "பொதுவான தகவல் · கீழே உள்ள விவரங்களைப் பார்க்கவும்" : "General information · Please review the details below"}</span>
      </section>

      {kind !== "about" && (
        <div className="sl-info-reading-progress" aria-label={`Reading progress: ${Math.round(readingProgress)}%`}>
          <span style={{ width: `${readingProgress}%` }} />
        </div>
      )}

      {kind === "about" && (
        <div className="sl-info-content">
          <section><h2>What Sellora does</h2><p>Sellora is a digital catalogue and sales-management platform designed to help businesses present products online, share catalogue links, receive customer enquiries and keep product-related activity organised in one workspace.</p></section>
          <section><h2>How it helps</h2><ul><li><b>Present products clearly.</b> Organise product details into a catalogue customers can browse.</li><li><b>Share with ease.</b> Share a public catalogue link through the channels your customers already use.</li><li><b>Manage customer interest.</b> Bring enquiries and orders into a more organised workflow.</li><li><b>Keep business control.</b> Manage catalogue content and workspace settings in one place.</li></ul></section>
          <section><h2>Who it is for</h2><p>Sellora is built for businesses that want a straightforward way to showcase their products and make it easier for customers to get in touch. Features and availability may vary by plan and product version.</p></section>
          <section><h2>Contact</h2><p>For questions about Sellora, use the support or contact details provided in your workspace or on the official Sellora website. Do not send passwords or payment credentials in a support message.</p></section>
        </div>
      )}

      {(kind === "terms" || kind === "privacy") && (
        <section className={"sl-policy-overview sl-policy-overview-" + kind} aria-label={kind === "terms" ? "Terms at a glance" : "Privacy at a glance"}>
          <div className="sl-policy-overview-heading"><span className="sl-policy-overview-icon">{kind === "terms" ? <BookOpen size={19} /> : <ShieldCheck size={19} />}</span><div><span>{isTamil ? (kind === "terms" ? "தொடங்குவதற்கு முன்" : "உங்கள் தனியுரிமை") : kind === "terms" ? "BEFORE YOU BEGIN" : "YOUR PRIVACY, AT A GLANCE"}</span><h2>{isTamil ? (kind === "terms" ? "முக்கியமான விதிகள்" : "எதை எதிர்பார்க்கலாம்") : kind === "terms" ? "The essentials, up front." : "Know what to expect."}</h2></div></div>
          <div className="sl-policy-overview-grid">
            {(kind === "terms"
              ? [{title:"Your workspace",text:"Keep account details secure and activity lawful."},{title:"Your content",text:"You control what you publish and must have permission to use it."},{title:"Plans & payments",text:"Check plan, renewal and cancellation details before paying."}]
              : [{title:"What may be used",text:"Account, catalogue, enquiry and technical information, as applicable."},{title:"Why it is used",text:"To operate, secure and support the platform."},{title:"Your choices",text:"You may request access or corrections where applicable law allows."}]
            ).map((item, index) => <article key={item.title}><span>0{index+1}</span><h3>{item.title}</h3><p>{item.text}</p></article>)}
          </div>
          <p className="sl-policy-overview-note"><ShieldCheck size={14} /> {kind === "terms" ? "Please read the full terms below. This page is currently a draft template." : "Please read the full notice below. The published policy must match actual data practices."}</p>
        </section>
      )}


      {kind === "terms" && (
        <div className="sl-info-content sl-info-content-policy">
          <p className="sl-info-notice"><b>Draft terms:</b> This is a general starting point, not legal advice. Before public launch, confirm the legal business name, contact details, governing law, refund rules and other terms with a qualified professional.</p>
          <section id="using-service"><h2>1. Using the service</h2><p>You may use Sellora only in compliance with applicable laws and these terms. You are responsible for the accuracy of information you provide and for activity carried out through your account.</p></section>
          <section id="account-security"><h2>2. Your account and security</h2><p>Keep your login credentials confidential, use accurate account details and notify the service operator if you suspect unauthorised access. You are responsible for restricting access to your devices and account.</p></section>
          <section id="content-products"><h2>3. Your content and products</h2><p>You retain responsibility for product descriptions, prices, images, trademarks and other content you upload. You must have the rights needed to publish that content. Do not upload unlawful, deceptive, infringing or harmful material.</p></section>
          <section id="enquiries-orders"><h2>4. Customer enquiries and orders</h2><p>You are responsible for responding to customers, honouring the commitments you make, and ensuring product information, availability, delivery terms and applicable taxes are accurate. Sellora does not guarantee that a catalogue view or enquiry will result in a sale.</p></section>
          <section id="billing-payments"><h2>5. Plans, billing and payments</h2><p>Paid features, plan prices, billing periods and payment conditions are presented at purchase or in the workspace. A subscription or paid feature may depend on successful payment verification. Any cancellation, renewal, refund and tax conditions should be reviewed at checkout and in the applicable plan details.</p></section>
          <section id="acceptable-use"><h2>6. Acceptable use</h2><p>You must not misuse the service, attempt unauthorised access, disrupt its operation, transmit malicious code, or use it to violate another person’s rights or applicable law.</p></section>
          <section id="availability-changes"><h2>7. Availability and changes</h2><p>Features may change as Sellora is improved. We aim to keep the service useful and reliable but cannot promise uninterrupted or error-free availability.</p></section>
          <section id="suspension-termination"><h2>8. Suspension or termination</h2><p>Access may be restricted or suspended where reasonably necessary for security, suspected misuse, legal compliance or a material breach of these terms.</p></section>
          <section id="disclaimers-liability"><h2>9. Disclaimers and liability</h2><p>To the extent permitted by applicable law, the service is provided subject to its stated limitations. Nothing in these terms excludes rights or liability that cannot lawfully be excluded.</p></section>
          <section id="updates-contact"><h2>10. Updates and contact</h2><p>These terms may be updated as the service changes. The effective version should be shown on this page. For questions, use the official contact details published by Sellora.</p></section>
        </div>
      )}

      {kind === "privacy" && (
        <div className="sl-info-content sl-info-content-policy">
          <p className="sl-info-notice"><b>Draft privacy notice:</b> This is a template and must be checked against Sellora’s actual data flows, vendors, retention practices and applicable privacy law before launch.</p>
          <section id="information-processed"><h2>1. Information that may be processed</h2><p>Depending on how you use the service, this may include account and business details, product and catalogue content, customer enquiries and order information, subscription status, transaction references, and technical or diagnostic data needed to operate and secure the platform.</p></section>
          <section id="how-information-used"><h2>2. How information is used</h2><p>Information may be used to provide and maintain the service, publish catalogues at your request, route enquiries, manage workspaces and subscriptions, respond to support requests, protect against abuse and comply with legal obligations.</p></section>
          <section id="public-catalogue-information"><h2>3. Public catalogue information</h2><p>Information you choose to publish in a public catalogue may be visible to anyone with access to its link or public page. Avoid publishing personal or confidential information unless you intend it to be public.</p></section>
          <section id="privacy-payments"><h2>4. Payments</h2><p>Payments may be handled by third-party payment providers. Sellora may receive payment status and transaction references to maintain subscription records. Review the payment provider’s privacy terms for its processing practices. Do not store or share full card details in catalogue content or messages.</p></section>
          <section id="service-providers-sharing"><h2>5. Service providers and sharing</h2><p>Information may be processed by infrastructure, hosting, analytics, communications or payment providers where needed to operate the service. It may also be disclosed where required by law, to protect users or the service, or as part of a business transfer permitted by law.</p></section>
          <section id="security-retention"><h2>6. Security and retention</h2><p>Reasonable technical and organisational safeguards should be used to protect information. Information should be retained only as long as needed for the stated purposes, legal obligations, dispute resolution and security. No online system can guarantee absolute security.</p></section>
          <section id="choices-requests"><h2>7. Your choices and requests</h2><p>Depending on applicable law, you may have rights to request access, correction, deletion or a copy of certain personal information, or to object to particular processing. Requests should be made through Sellora’s official contact channel. Some records may need to be retained for legal or operational reasons.</p></section>
          <section id="children"><h2>8. Children</h2><p>Sellora is intended for business use and is not designed to solicit personal information from children.</p></section>
          <section id="privacy-changes-contact"><h2>9. Changes and contact</h2><p>This notice may be updated when the service or its practices change. The final published policy should identify the responsible legal entity, contact address, effective date and any required grievance or privacy contact details.</p></section>
        </div>
      )}

    </main>
  );
}
