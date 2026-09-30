import type { ReactNode } from "react";

interface CardProps {
  title?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  padded?: boolean;
}

/** Lightning-style card: white surface, subtle border, header row. */
export function Card({ title, icon, actions, children, className = "", padded = true }: CardProps) {
  return (
    <section className={`bg-sf-surface border border-sf-border rounded-sf shadow-sf-card ${className}`}>
      {(title || actions) && (
        <header className="flex items-center gap-3 px-4 py-3 border-b border-sf-border">
          {icon && <span className="inline-flex h-8 w-8 items-center justify-center rounded-sf bg-sf-brand-light text-sf-brand">{icon}</span>}
          <h2 className="flex-1 text-base font-bold leading-snug text-sf-text">{title}</h2>
          <span className="shrink-0">{actions}</span>
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}
