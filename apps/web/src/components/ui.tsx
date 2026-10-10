import type { ReactNode } from "react";

export function Brand() {
  return (
    <a className="sl-brand" href="/" aria-label="Sellora by PixelForge">
      <span className="sl-mark">S</span>
      <span>
        <b>SELLORA</b>
        <small>A product by PixelForge</small>
      </span>
    </a>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  kind?: "primary" | "outline" | "quiet" | "danger";
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  onClick,
  kind = "primary",
  type = "button",
  disabled = false,
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`sl-button sl-${kind}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

export function ErrorMessage({ text }: { text: string }) {
  return text ? <div className="sl-error">{text}</div> : null;
}
