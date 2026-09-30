import { Building2, User, UserPlus, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import type { RecordMatch } from "@/lib/salesforce/duplicate-check";

const ICONS = {
  Account: <Building2 className="h-4 w-4" aria-hidden />,
  Contact: <User className="h-4 w-4" aria-hidden />,
  Lead: <UserPlus className="h-4 w-4" aria-hidden />,
};

/** One existing Salesforce record with the fields that matched the card. */
export function MatchCard({ match, selected, onSelect }: { match: RecordMatch; selected?: boolean; onSelect?: () => void }) {
  const external = /^https?:\/\//.test(match.url);
  return (
    <div className={`rounded-sf border p-3 ${selected ? "border-sf-brand bg-sf-brand-light/40" : "border-sf-border bg-white"}`}>
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-sf bg-sf-brand-light text-sf-brand">{ICONS[match.type]}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-sf-text-muted">Existing {match.type}</p>
            <Badge tone={match.confidence >= 80 ? "error" : match.confidence >= 50 ? "warning" : "info"}>{match.confidence}% match</Badge>
          </div>
          <p className="truncate text-base font-bold text-sf-text">{match.title}</p>
          {match.subtitle && <p className="truncate text-sm text-sf-text-weak">{match.subtitle}</p>}
          <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
            {match.matchedFields.map((f) => (
              <div key={f.key} className="min-w-0">
                <dt className="text-xs text-sf-text-muted">{f.label}</dt>
                <dd className="truncate font-medium text-sf-text">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {onSelect ? (
          <label className="flex items-center gap-2 text-xs font-semibold text-sf-text-weak">
            <input type="radio" name="update-target" className="accent-sf-brand" checked={Boolean(selected)} onChange={onSelect} />
            Update this record
          </label>
        ) : <span />}
        <a href={match.url} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="inline-flex items-center gap-1 text-xs font-semibold text-sf-brand hover:underline">
          Open <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </div>
    </div>
  );
}
