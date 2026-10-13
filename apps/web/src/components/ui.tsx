import type { ReactNode } from "react";

export function Brand() {
  return (
    <a className="sl-brand" href="/" aria-label="Sellora home">
      <img className="sl-mark" src="/sellora-mark.svg" alt="" aria-hidden="true" />
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
