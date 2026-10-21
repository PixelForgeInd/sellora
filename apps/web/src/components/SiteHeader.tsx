import { ArrowRight } from "lucide-react";
import { Brand } from "./ui";

type SiteHeaderProps = {
  language?: "en" | "ta";
  onToggleLanguage?: () => void;
  showLanguageToggle?: boolean;
};

export function SiteHeader({
  language = "en",
  onToggleLanguage,
  showLanguageToggle = false,
}: SiteHeaderProps) {
  const isTamil = language === "ta";

  return (
    <header className="sl-home-nav">
      <Brand />
      <nav aria-label="Main navigation">
        {showLanguageToggle && onToggleLanguage && (
          <button
            type="button"
            className="sl-home-language-toggle"
            onClick={onToggleLanguage}
            aria-label="Switch language"
          >
            {isTamil ? "English" : "தமிழ்"}
          </button>
        )}
        <a href="/#features">{isTamil ? "அம்சங்கள்" : "Features"}</a>
        <a href="/#how-it-works">{isTamil ? "எப்படி செயல்படுகிறது" : "How it works"}</a>
        <a href="/#pricing">{isTamil ? "விலைத் திட்டங்கள்" : "Pricing"}</a>
        <a className="sl-home-cta" href="/signup">
          {isTamil ? "தொடங்குங்கள்" : "Get started"} <ArrowRight size={15} />
        </a>
      </nav>
    </header>
  );
}
