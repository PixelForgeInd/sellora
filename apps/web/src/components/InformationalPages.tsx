import { ArrowLeft, ArrowRight, BookOpen, ShieldCheck, Sprout, Printer, ListChecks } from "lucide-react";
import { Brand } from "./ui";

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
  return (
    <main className="sl-info-page">
      <header className="sl-info-header">
        <Brand />
        <a className="sl-info-back" href="/"><ArrowLeft size={15} /> Back to home</a>
      </header>
      <section className="sl-info-hero">
        <span className="sl-home-eyebrow">
          {kind === "about" ? <Sprout size={15} /> : kind === "terms" ? <BookOpen size={15} /> : <ShieldCheck size={15} />}
          {content.eyebrow}
        </span>
        <h1>{content.title}</h1>
        <p>{content.intro}</p>
        <span className="sl-info-updated">General information · Please review the details below</span>
      </section>

      {kind === "about" && (
        <div className="sl-info-content">
          <section><h2>What Sellora does</h2><p>Sellora is a digital catalogue and sales-management platform designed to help businesses present products online, share catalogue links, receive customer enquiries and keep product-related activity organised in one workspace.</p></section>
          <section><h2>How it helps</h2><ul><li><b>Present products clearly.</b> Organise product details into a catalogue customers can browse.</li><li><b>Share with ease.</b> Share a public catalogue link through the channels your customers already use.</li><li><b>Manage customer interest.</b> Bring enquiries and orders into a more organised workflow.</li><li><b>Keep business control.</b> Manage catalogue content and workspace settings in one place.</li></ul></section>
          <section><h2>Who it is for</h2><p>Sellora is built for businesses that want a straightforward way to showcase their products and make it easier for customers to get in touch. Features and availability may vary by plan and product version.</p></section>
          <section><h2>Contact</h2><p>For questions about Sellora, use the support or contact details provided in your workspace or on the official Sellora website. Do not send passwords or payment credentials in a support message.</p></section>
        </div>
      )}

      {(kind === "terms" || kind === "privacy") && (
        <div className="sl-info-tools">
          <div className="sl-info-tools-label"><ListChecks size={16} /> On this page</div>
          <nav aria-label="Policy sections">
            {(kind === "terms"
              ? [{"label":"Using the service","id":"using-service"},{"label":"Your account and security","id":"account-security"},{"label":"Your content and products","id":"content-products"},{"label":"Customer enquiries and orders","id":"enquiries-orders"},{"label":"Plans, billing and payments","id":"billing-payments"},{"label":"Acceptable use","id":"acceptable-use"},{"label":"Availability and changes","id":"availability-changes"},{"label":"Suspension or termination","id":"suspension-termination"},{"label":"Disclaimers and liability","id":"disclaimers-liability"},{"label":"Updates and contact","id":"updates-contact"}]
              : [{"label":"Information that may be processed","id":"information-processed"},{"label":"How information is used","id":"how-information-used"},{"label":"Public catalogue information","id":"public-catalogue-information"},{"label":"Payments","id":"privacy-payments"},{"label":"Service providers and sharing","id":"service-providers-sharing"},{"label":"Security and retention","id":"security-retention"},{"label":"Your choices and requests","id":"choices-requests"},{"label":"Children","id":"children"},{"label":"Changes and contact","id":"privacy-changes-contact"}]
            ).map((item) => (
              <a key={item.id} href={"#" + item.id}>{item.label}</a>
            ))}
          </nav>
          <button type="button" className="sl-info-print" onClick={() => window.print()}><Printer size={15} /> Print / Save PDF</button>
        </div>
      )}

      {kind === "terms" && (
        <div className="sl-info-content">
          <p className="sl-info-notice"><b>Draft terms:</b> This is a general starting point, not legal advice. Before public launch, confirm the legal business name, contact details, governing law, refund rules and other terms with a qualified professional.</p>
          <section id="using-service"><h2><p>You may use Sellora only in compliance with applicable laws and these terms. You are responsible for the accuracy of information you provide and for activity carried out through your account.</p></section>
          <section id="account-security"><h2><p>Keep your login credentials confidential, use accurate account details and notify the service operator if you suspect unauthorised access. You are responsible for restricting access to your devices and account.</p></section>
          <section id="content-products"><h2><p>You retain responsibility for product descriptions, prices, images, trademarks and other content you upload. You must have the rights needed to publish that content. Do not upload unlawful, deceptive, infringing or harmful material.</p></section>
          <section id="enquiries-orders"><h2><p>You are responsible for responding to customers, honouring the commitments you make, and ensuring product information, availability, delivery terms and applicable taxes are accurate. Sellora does not guarantee that a catalogue view or enquiry will result in a sale.</p></section>
          <section id="billing-payments"><h2><p>Paid features, plan prices, billing periods and payment conditions are presented at purchase or in the workspace. A subscription or paid feature may depend on successful payment verification. Any cancellation, renewal, refund and tax conditions should be reviewed at checkout and in the applicable plan details.</p></section>
          <section id="acceptable-use"><h2><p>You must not misuse the service, attempt unauthorised access, disrupt its operation, transmit malicious code, or use it to violate another person’s rights or applicable law.</p></section>
          <section id="availability-changes"><h2><p>Features may change as Sellora is improved. We aim to keep the service useful and reliable but cannot promise uninterrupted or error-free availability.</p></section>
          <section id="suspension-termination"><h2><p>Access may be restricted or suspended where reasonably necessary for security, suspected misuse, legal compliance or a material breach of these terms.</p></section>
          <section id="disclaimers-liability"><h2><p>To the extent permitted by applicable law, the service is provided subject to its stated limitations. Nothing in these terms excludes rights or liability that cannot lawfully be excluded.</p></section>
          <section id="updates-contact"><h2><p>These terms may be updated as the service changes. The effective version should be shown on this page. For questions, use the official contact details published by Sellora.</p></section>
        </div>
      )}

      {kind === "privacy" && (
        <div className="sl-info-content">
          <p className="sl-info-notice"><b>Draft privacy notice:</b> This is a template and must be checked against Sellora’s actual data flows, vendors, retention practices and applicable privacy law before launch.</p>
          <section id="information-processed"><h2><p>Depending on how you use the service, this may include account and business details, product and catalogue content, customer enquiries and order information, subscription status, transaction references, and technical or diagnostic data needed to operate and secure the platform.</p></section>
          <section id="how-information-used"><h2><p>Information may be used to provide and maintain the service, publish catalogues at your request, route enquiries, manage workspaces and subscriptions, respond to support requests, protect against abuse and comply with legal obligations.</p></section>
          <section id="public-catalogue-information"><h2><p>Information you choose to publish in a public catalogue may be visible to anyone with access to its link or public page. Avoid publishing personal or confidential information unless you intend it to be public.</p></section>
          <section id="privacy-payments"><h2><p>Payments may be handled by third-party payment providers. Sellora may receive payment status and transaction references to maintain subscription records. Review the payment provider’s privacy terms for its processing practices. Do not store or share full card details in catalogue content or messages.</p></section>
          <section id="service-providers-sharing"><h2><p>Information may be processed by infrastructure, hosting, analytics, communications or payment providers where needed to operate the service. It may also be disclosed where required by law, to protect users or the service, or as part of a business transfer permitted by law.</p></section>
          <section id="security-retention"><h2><p>Reasonable technical and organisational safeguards should be used to protect information. Information should be retained only as long as needed for the stated purposes, legal obligations, dispute resolution and security. No online system can guarantee absolute security.</p></section>
          <section id="choices-requests"><h2><p>Depending on applicable law, you may have rights to request access, correction, deletion or a copy of certain personal information, or to object to particular processing. Requests should be made through Sellora’s official contact channel. Some records may need to be retained for legal or operational reasons.</p></section>
          <section id="children"><h2><p>Sellora is intended for business use and is not designed to solicit personal information from children.</p></section>
          <section id="privacy-changes-contact"><h2><p>This notice may be updated when the service or its practices change. The final published policy should identify the responsible legal entity, contact address, effective date and any required grievance or privacy contact details.</p></section>
        </div>
      )}

    </main>
  );
}
