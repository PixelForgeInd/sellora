import { ArrowRight } from "lucide-react";
import { Brand } from "./ui";

export function GlobalFooter() {
  return (
    <>
      <footer className="sl-global-footer">
        <div className="sl-global-footer-brand">
          <Brand />
          <span>Digital Catalogues. Smarter Sales.</span>
        </div>
        <nav aria-label="Sellora platform links">
          <a href="/about">About</a>
          <a href="/terms">Terms &amp; Conditions</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/login">Log in</a>
          <a className="sl-global-footer-cta" href="/signup">Get started <ArrowRight size={13} /></a>
        </nav>
      </footer>
      <div className="sl-global-footer-copyright">
        {"© " + new Date().getFullYear() + " Sellora"}
      </div>
    </>
  );
}
