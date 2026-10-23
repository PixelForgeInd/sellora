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
          <p className="sl-info-notice"><b>{isTamil ? "வரைவு விதிமுறைகள்:" : "Draft terms:"}</b> {isTamil ? "இது ஒரு பொதுவான தொடக்க வரைவு மட்டுமே; சட்ட ஆலோசனை அல்ல. வெளியீட்டிற்கு முன் சட்டப்பூர்வ வணிகப் பெயர், தொடர்பு விவரங்கள், பொருந்தும் சட்டம், பணத்தைத் திரும்ப வழங்கும் விதிகள் மற்றும் பிற நிபந்தனைகளைத் தகுதியான நிபுணருடன் உறுதிப்படுத்தவும்." : "This is a general starting point, not legal advice. Before public launch, confirm the legal business name, contact details, governing law, refund rules and other terms with a qualified professional."}</p>
          <section id="using-service"><h2>{isTamil ? "1. சேவையைப் பயன்படுத்துதல்" : "1. Using the service"}</h2><p>{isTamil ? "பொருந்தும் சட்டங்களுக்கும் இந்த விதிமுறைகளுக்கும் இணங்க மட்டுமே Sellora-வைப் பயன்படுத்தலாம். நீங்கள் வழங்கும் தகவல்களின் துல்லியத்திற்கும் உங்கள் கணக்கின் மூலம் நடைபெறும் செயல்பாடுகளுக்கும் நீங்களே பொறுப்பு." : "You may use Sellora only in compliance with applicable laws and these terms. You are responsible for the accuracy of information you provide and for activity carried out through your account."}</p></section>
          <section id="account-security"><h2>{isTamil ? "2. உங்கள் கணக்கும் பாதுகாப்பும்" : "2. Your account and security"}</h2><p>{isTamil ? "உள்நுழைவு விவரங்களை ரகசியமாக வைத்திருங்கள்; சரியான கணக்கு விவரங்களைப் பயன்படுத்துங்கள். அனுமதியற்ற அணுகல் இருப்பதாக சந்தேகித்தால் சேவை நிர்வாகியிடம் தெரிவிக்கவும். உங்கள் சாதனங்களுக்கும் கணக்கிற்குமான அணுகலைக் கட்டுப்படுத்துவது உங்கள் பொறுப்பு." : "Keep your login credentials confidential, use accurate account details and notify the service operator if you suspect unauthorised access. You are responsible for restricting access to your devices and account."}</p></section>
          <section id="content-products"><h2>{isTamil ? "3. உங்கள் உள்ளடக்கமும் தயாரிப்புகளும்" : "3. Your content and products"}</h2><p>{isTamil ? "நீங்கள் பதிவேற்றும் தயாரிப்பு விளக்கங்கள், விலைகள், படங்கள், வர்த்தக முத்திரைகள் மற்றும் பிற உள்ளடக்கங்களுக்கு நீங்களே பொறுப்பு. அவற்றை வெளியிடத் தேவையான உரிமைகள் உங்களிடம் இருக்க வேண்டும். சட்டவிரோதமான, தவறாக வழிநடத்தும் அல்லது பிறரின் உரிமைகளை மீறும் உள்ளடக்கங்களைப் பதிவேற்ற வேண்டாம்." : "You retain responsibility for product descriptions, prices, images, trademarks and other content you upload. You must have the rights needed to publish that content. Do not upload unlawful, deceptive, infringing or harmful material."}</p></section>
          <section id="enquiries-orders"><h2>{isTamil ? "4. வாடிக்கையாளர் விசாரணைகளும் ஆர்டர்களும்" : "4. Customer enquiries and orders"}</h2><p>{isTamil ? "வாடிக்கையாளர்களுக்குப் பதிலளிப்பது, அளித்த உறுதிமொழிகளை நிறைவேற்றுவது, தயாரிப்பு விவரங்கள், இருப்பு, விநியோக நிபந்தனைகள் மற்றும் வரிகள் சரியாக இருப்பதை உறுதிப்படுத்துவது உங்கள் பொறுப்பு. பட்டியலைப் பார்ப்பது அல்லது விசாரணை வருவது விற்பனையாகும் என Sellora உத்தரவாதம் அளிக்காது." : "You are responsible for responding to customers, honouring the commitments you make, and ensuring product information, availability, delivery terms and applicable taxes are accurate. Sellora does not guarantee that a catalogue view or enquiry will result in a sale."}</p></section>
          <section id="billing-payments"><h2>{isTamil ? "5. திட்டங்கள், கட்டணம் மற்றும் பணம் செலுத்துதல்" : "5. Plans, billing and payments"}</h2><p>{isTamil ? "கட்டண அம்சங்கள், திட்ட விலைகள், கட்டண காலங்கள் மற்றும் பணம் செலுத்தும் நிபந்தனைகள் வாங்கும் போது அல்லது பணியிடத்தில் காட்டப்படும். சந்தா அல்லது கட்டண அம்சம் வெற்றிகரமான கட்டணச் சரிபார்ப்பைச் சார்ந்திருக்கலாம். ரத்து, புதுப்பித்தல், பணத்திருப்பி மற்றும் வரி நிபந்தனைகளைப் பணம் செலுத்தும் முன் சரிபார்க்கவும்." : "Paid features, plan prices, billing periods and payment conditions are presented at purchase or in the workspace. A subscription or paid feature may depend on successful payment verification. Any cancellation, renewal, refund and tax conditions should be reviewed at checkout and in the applicable plan details."}</p></section>
          <section id="acceptable-use"><h2>{isTamil ? "6. ஏற்றுக்கொள்ளத்தக்க பயன்பாடு" : "6. Acceptable use"}</h2><p>{isTamil ? "சேவையைத் தவறாகப் பயன்படுத்துதல், அனுமதியற்ற அணுகலை முயற்சித்தல், செயல்பாட்டைத் தடங்கலாக்குதல், தீங்கிழைக்கும் குறியீடுகளை அனுப்புதல் அல்லது பிறரின் உரிமைகள்/சட்டங்களை மீறுதல் கூடாது." : "You must not misuse the service, attempt unauthorised access, disrupt its operation, transmit malicious code, or use it to violate another person’s rights or applicable law."}</p></section>
          <section id="availability-changes"><h2>{isTamil ? "7. சேவை கிடைப்பதும் மாற்றங்களும்" : "7. Availability and changes"}</h2><p>{isTamil ? "Sellora மேம்படுத்தப்படும்போது அம்சங்கள் மாறலாம். சேவையை நம்பகமாக வைத்திருக்க முயற்சிப்போம்; ஆனால் இடையூறில்லாத அல்லது பிழையற்ற செயல்பாட்டை உறுதி செய்ய முடியாது." : "Features may change as Sellora is improved. We aim to keep the service useful and reliable but cannot promise uninterrupted or error-free availability."}</p></section>
          <section id="suspension-termination"><h2>{isTamil ? "8. இடைநிறுத்தம் அல்லது முடித்தல்" : "8. Suspension or termination"}</h2><p>{isTamil ? "பாதுகாப்பு, தவறான பயன்பாடு குறித்த சந்தேகம், சட்ட இணக்கம் அல்லது இந்த விதிமுறைகளின் முக்கிய மீறல் போன்ற காரணங்களுக்காக அணுகல் கட்டுப்படுத்தப்படலாம் அல்லது இடைநிறுத்தப்படலாம்." : "Access may be restricted or suspended where reasonably necessary for security, suspected misuse, legal compliance or a material breach of these terms."}</p></section>
          <section id="disclaimers-liability"><h2>{isTamil ? "9. மறுப்புரைகளும் பொறுப்பும்" : "9. Disclaimers and liability"}</h2><p>{isTamil ? "பொருந்தும் சட்டம் அனுமதிக்கும் வரம்பிற்குள், குறிப்பிடப்பட்ட வரம்புகளுடன் சேவை வழங்கப்படுகிறது. சட்டப்படி விலக்க முடியாத உரிமைகள் அல்லது பொறுப்புகளை இந்த விதிமுறைகள் விலக்காது." : "To the extent permitted by applicable law, the service is provided subject to its stated limitations. Nothing in these terms excludes rights or liability that cannot lawfully be excluded."}</p></section>
          <section id="updates-contact"><h2>{isTamil ? "10. புதுப்பிப்புகளும் தொடர்பும்" : "10. Updates and contact"}</h2><p>{isTamil ? "சேவை மாறும்போது இந்த விதிமுறைகள் புதுப்பிக்கப்படலாம். நடைமுறையில் உள்ள பதிப்பு இந்தப் பக்கத்தில் காட்டப்பட வேண்டும். கேள்விகளுக்கு Sellora வெளியிட்டுள்ள அதிகாரப்பூர்வ தொடர்பு விவரங்களைப் பயன்படுத்தவும்." : "These terms may be updated as the service changes. The effective version should be shown on this page. For questions, use the official contact details published by Sellora."}</p></section>
        </div>
      )}

      {kind === "privacy" && (
        <div className="sl-info-content sl-info-content-policy">
          <p className="sl-info-notice"><b>{isTamil ? "வரைவு தனியுரிமை அறிவிப்பு:" : "Draft privacy notice:"}</b> {isTamil ? "இது ஒரு மாதிரி அறிவிப்பு. வெளியீட்டிற்கு முன் Sellora-வின் உண்மையான தரவு நடைமுறைகள், சேவை வழங்குநர்கள், தரவு சேமிப்பு நடைமுறைகள் மற்றும் பொருந்தும் தனியுரிமைச் சட்டங்களுடன் ஒப்பிட்டு சரிபார்க்க வேண்டும்." : "This is a template and must be checked against Sellora’s actual data flows, vendors, retention practices and applicable privacy law before launch."}</p>
          <section id="information-processed"><h2>{isTamil ? "1. செயலாக்கப்படக்கூடிய தகவல்கள்" : "1. Information that may be processed"}</h2><p>{isTamil ? "நீங்கள் சேவையைப் பயன்படுத்தும் விதத்தைப் பொறுத்து, கணக்கு மற்றும் வணிக விவரங்கள், தயாரிப்பு மற்றும் பட்டியல் உள்ளடக்கம், வாடிக்கையாளர் விசாரணைகள் மற்றும் ஆர்டர் தகவல்கள், சந்தா நிலை, பரிவர்த்தனை குறிப்புகள், தளத்தை இயக்கவும் பாதுகாக்கவும் தேவையான தொழில்நுட்பத் தகவல்கள் ஆகியவை செயலாக்கப்படலாம்." : "Depending on how you use the service, this may include account and business details, product and catalogue content, customer enquiries and order information, subscription status, transaction references, and technical or diagnostic data needed to operate and secure the platform."}</p></section>
          <section id="how-information-used"><h2>{isTamil ? "2. தகவல்கள் எவ்வாறு பயன்படுத்தப்படுகின்றன" : "2. How information is used"}</h2><p>{isTamil ? "சேவையை வழங்கவும் பராமரிக்கவும், உங்கள் கோரிக்கையின்படி பட்டியல்களை வெளியிடவும், விசாரணைகளை அனுப்பவும், பணியிடங்கள் மற்றும் சந்தாக்களை நிர்வகிக்கவும், ஆதரவு கோரிக்கைகளுக்குப் பதிலளிக்கவும், தவறான பயன்பாட்டைத் தடுக்கவும், சட்டக் கடமைகளை நிறைவேற்றவும் தகவல்கள் பயன்படுத்தப்படலாம்." : "Information may be used to provide and maintain the service, publish catalogues at your request, route enquiries, manage workspaces and subscriptions, respond to support requests, protect against abuse and comply with legal obligations."}</p></section>
          <section id="public-catalogue-information"><h2>{isTamil ? "3. பொது பட்டியல் தகவல்கள்" : "3. Public catalogue information"}</h2><p>{isTamil ? "பொது பட்டியலில் நீங்கள் வெளியிடும் தகவல்கள், அதன் இணைப்பு அல்லது பொதுப் பக்கத்தை அணுகுபவர்களுக்கு தெரியக்கூடும். பொதுவில் பகிர விரும்பாவிட்டால் தனிப்பட்ட அல்லது ரகசிய தகவல்களை வெளியிட வேண்டாம்." : "Information you choose to publish in a public catalogue may be visible to anyone with access to its link or public page. Avoid publishing personal or confidential information unless you intend it to be public."}</p></section>
          <section id="privacy-payments"><h2>{isTamil ? "4. பணம் செலுத்துதல்" : "4. Payments"}</h2><p>{isTamil ? "பணம் செலுத்துதல் மூன்றாம் தரப்பு கட்டண சேவை வழங்குநர்களால் கையாளப்படலாம். சந்தா பதிவுகளைப் பராமரிக்க Sellora கட்டண நிலை மற்றும் பரிவர்த்தனை குறிப்புகளைப் பெறலாம். அந்த வழங்குநரின் தனியுரிமைக் கொள்கையைப் பார்க்கவும். முழு அட்டை விவரங்களை பட்டியல் உள்ளடக்கத்திலோ செய்திகளிலோ சேமிக்கவோ பகிரவோ வேண்டாம்." : "Payments may be handled by third-party payment providers. Sellora may receive payment status and transaction references to maintain subscription records. Review the payment provider’s privacy terms for its processing practices. Do not store or share full card details in catalogue content or messages."}</p></section>
          <section id="service-providers-sharing"><h2>{isTamil ? "5. சேவை வழங்குநர்கள் மற்றும் தகவல் பகிர்வு" : "5. Service providers and sharing"}</h2><p>{isTamil ? "சேவையை இயக்கத் தேவையானபோது தொழில்நுட்பக் கட்டமைப்பு, ஹோஸ்டிங், பகுப்பாய்வு, தகவல் தொடர்பு அல்லது கட்டண வழங்குநர்கள் தகவல்களைச் செயலாக்கலாம். சட்டம் கோரும்போது, பயனர்கள் அல்லது சேவையைப் பாதுகாக்க, அல்லது சட்டம் அனுமதிக்கும் வணிக மாற்றத்தின் போது தகவல்கள் பகிரப்படலாம்." : "Information may be processed by infrastructure, hosting, analytics, communications or payment providers where needed to operate the service. It may also be disclosed where required by law, to protect users or the service, or as part of a business transfer permitted by law."}</p></section>
          <section id="security-retention"><h2>{isTamil ? "6. பாதுகாப்பும் தகவல் சேமிப்புக் காலமும்" : "6. Security and retention"}</h2><p>{isTamil ? "தகவல்களைப் பாதுகாக்க பொருத்தமான தொழில்நுட்ப மற்றும் நிர்வாக பாதுகாப்பு நடவடிக்கைகள் பயன்படுத்தப்பட வேண்டும். குறிப்பிடப்பட்ட நோக்கங்கள், சட்டக் கடமைகள், தகராறு தீர்வு மற்றும் பாதுகாப்புக்குத் தேவையான காலம் வரை மட்டுமே தகவல்கள் வைத்திருக்கப்பட வேண்டும். எந்த இணைய அமைப்பும் முழுமையான பாதுகாப்பை உறுதி செய்ய முடியாது." : "Reasonable technical and organisational safeguards should be used to protect information. Information should be retained only as long as needed for the stated purposes, legal obligations, dispute resolution and security. No online system can guarantee absolute security."}</p></section>
          <section id="choices-requests"><h2>{isTamil ? "7. உங்கள் தேர்வுகளும் கோரிக்கைகளும்" : "7. Your choices and requests"}</h2><p>{isTamil ? "பொருந்தும் சட்டத்தைப் பொறுத்து, சில தனிப்பட்ட தகவல்களை அணுக, திருத்த, நீக்க அல்லது நகல் பெறவும் குறிப்பிட்ட செயலாக்கத்திற்கு எதிர்ப்பு தெரிவிக்கவும் நீங்கள் கோரலாம். Sellora-வின் அதிகாரப்பூர்வ தொடர்பு வழியாக கோரிக்கைகளை அனுப்பவும். சட்ட அல்லது செயல்பாட்டு காரணங்களுக்காக சில பதிவுகள் தொடர்ந்து வைத்திருக்கப்படலாம்." : "Depending on applicable law, you may have rights to request access, correction, deletion or a copy of certain personal information, or to object to particular processing. Requests should be made through Sellora’s official contact channel. Some records may need to be retained for legal or operational reasons."}</p></section>
          <section id="children"><h2>{isTamil ? "8. குழந்தைகள்" : "8. Children"}</h2><p>{isTamil ? "Sellora வணிகப் பயன்பாட்டிற்காக உருவாக்கப்பட்டுள்ளது; குழந்தைகளிடமிருந்து தனிப்பட்ட தகவல்களைப் பெறுவதற்காக வடிவமைக்கப்படவில்லை." : "Sellora is intended for business use and is not designed to solicit personal information from children."}</p></section>
          <section id="privacy-changes-contact"><h2>{isTamil ? "9. மாற்றங்களும் தொடர்பும்" : "9. Changes and contact"}</h2><p>{isTamil ? "சேவை அல்லது அதன் நடைமுறைகள் மாறும்போது இந்த அறிவிப்பு புதுப்பிக்கப்படலாம். இறுதியாக வெளியிடப்படும் கொள்கையில் பொறுப்பான சட்ட நிறுவனம், தொடர்பு முகவரி, நடைமுறைக்கு வரும் தேதி மற்றும் தேவையான புகார் அல்லது தனியுரிமை தொடர்பு விவரங்கள் குறிப்பிடப்பட வேண்டும்." : "This notice may be updated when the service or its practices change. The final published policy should identify the responsible legal entity, contact address, effective date and any required grievance or privacy contact details."}</p></section>
        </div>
      )}

    </main>
  );
}
