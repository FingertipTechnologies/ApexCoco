import { Cloud } from "lucide-react";
import { DemoControls } from "./DemoControls";

/** Salesforce-style global header: brand bar + app name + demo settings. */
export function AppHeader() {
  return (
    <header className="sticky top-0 z-30 bg-sf-brand-darker text-white shadow-sf-raised">
      <div className="mx-auto flex h-14 max-w-3xl items-center gap-3 px-4">
        <span className="flex h-9 w-9 items-center justify-center rounded-sf bg-sf-brand-accent/20">
          <Cloud className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[11px] uppercase tracking-wider text-white/70">Sales Cloud</p>
          <p className="truncate text-sm font-bold">Scan Visiting Card</p>
        </div>
        <DemoControls />
      </div>
    </header>
  );
}
