"use client";

import { useEffect, useState } from "react";
import { Settings2, X } from "lucide-react";

interface Settings {
  salesforceProvider: string;
  mock: boolean;
  simulateExistingCustomer: boolean;
  ocrProvider: string;
  aiParser: boolean;
}

/**
 * Small settings popover so a presenter can switch the mock org between
 * "no existing customer" and "existing customer" without restarting.
 */
export function DemoControls() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/demo/settings").then((r) => r.json()).then(setSettings).catch(() => {});
  }, []);

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const res = await fetch("/api/demo/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (res.ok) setSettings(await res.json());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label="Demo settings"
        className="flex h-9 w-9 items-center justify-center rounded-sf text-white/90 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
      >
        <Settings2 className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-sf border border-sf-border bg-white p-3 text-sf-text shadow-sf-raised">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">Demo settings</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-sf p-1 text-sf-text-muted hover:bg-sf-bg"><X className="h-4 w-4" /></button>
          </div>
          {settings ? (
            <dl className="mt-2 space-y-1.5 text-xs text-sf-text-weak">
              <div className="flex justify-between"><dt>Salesforce backend</dt><dd className="font-semibold text-sf-text">{settings.mock ? "Mock org (in-memory)" : settings.salesforceProvider}</dd></div>
              <div className="flex justify-between"><dt>OCR engine</dt><dd className="font-semibold text-sf-text">{settings.ocrProvider}</dd></div>
              <div className="flex justify-between"><dt>AI parsing</dt><dd className="font-semibold text-sf-text">{settings.aiParser ? "Claude (enabled)" : "Heuristic parser"}</dd></div>
            </dl>
          ) : (
            <p className="mt-2 text-xs text-sf-text-muted">Loading…</p>
          )}
          {settings?.mock && (
            <div className="mt-3 border-t border-sf-border pt-3">
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-sf-brand"
                  checked={settings.simulateExistingCustomer}
                  disabled={busy}
                  onChange={(e) => update({ simulateExistingCustomer: e.target.checked })}
                />
                <span>
                  <span className="font-semibold">Simulate existing customer</span>
                  <span className="block text-xs text-sf-text-muted">Seeds a &ldquo;Fingertip&rdquo; Account and Contact so the match path can be shown.</span>
                </span>
              </label>
              <button type="button" disabled={busy} onClick={() => update({ reset: true })} className="mt-2 text-xs font-semibold text-sf-brand hover:underline">
                Reset mock org
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
