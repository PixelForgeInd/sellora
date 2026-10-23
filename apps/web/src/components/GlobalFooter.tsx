import { Brand } from "./ui";

export function GlobalFooter() {
  const isTamil = new URLSearchParams(window.location.search).get("lang") === "ta" || window.location.pathname === "/signup" && document.documentElement.lang === "ta";
  return (
    <>
      <footer className="sl-global-footer">
        <div className="sl-global-footer-brand">
          <Brand />
          <span>{isTamil ? "டிஜிட்டல் பட்டியல்கள். புத்திசாலித்தனமான விற்பனை." : "Digital Catalogues. Smarter Sales."}</span>
        </div>
        <nav aria-label={isTamil ? "செல்லோரா தள இணைப்புகள்" : "Sellora platform links"}>
          <a href={isTamil ? "/about?lang=ta" : "/about"}>{isTamil ? "எங்களைப் பற்றி" : "About"}</a>
          <a href={isTamil ? "/terms?lang=ta" : "/terms"}>{isTamil ? "விதிமுறைகள் மற்றும் நிபந்தனைகள்" : "Terms & Conditions"}</a>
          <a href={isTamil ? "/privacy?lang=ta" : "/privacy"}>{isTamil ? "தனியுரிமைக் கொள்கை" : "Privacy Policy"}</a>
        </nav>
      </footer>
    </>
  );
}
