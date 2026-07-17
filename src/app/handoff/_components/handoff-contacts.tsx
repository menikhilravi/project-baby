import { Phone, Stethoscope, TriangleAlert } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Contact } from "../actions";

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function HandoffContacts({
  careInstructions,
  pediatricianName,
  pediatricianPhone,
  emergencyContacts,
}: {
  careInstructions: string;
  pediatricianName: string;
  pediatricianPhone: string;
  emergencyContacts: Contact[];
}) {
  const hasContacts =
    Boolean(pediatricianPhone) || emergencyContacts.length > 0;

  return (
    <div className="space-y-6">
      {careInstructions ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
              Care notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
              {careInstructions}
            </p>
          </CardContent>
        </Card>
      ) : null}

      {hasContacts ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-[12px] uppercase tracking-[0.14em] font-semibold text-muted-foreground">
              Contacts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {pediatricianPhone ? (
              <a
                href={telHref(pediatricianPhone)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 hover:bg-muted"
              >
                <Stethoscope className="h-4 w-4 text-handoff shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">
                    {pediatricianName || "Pediatrician"}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {pediatricianPhone}
                  </span>
                </span>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </a>
            ) : null}
            {emergencyContacts.map((c) => (
              <a
                key={`${c.label}-${c.phone}`}
                href={telHref(c.phone)}
                className="flex items-center gap-3 rounded-xl border border-border bg-card px-3.5 py-3 hover:bg-muted"
              >
                <Phone className="h-4 w-4 text-handoff shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{c.label}</span>
                  <span className="block text-xs text-muted-foreground">
                    {c.phone}
                  </span>
                </span>
                <Phone className="h-4 w-4 text-muted-foreground" />
              </a>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-foreground/90">
        <TriangleAlert className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
        <p className="leading-relaxed">
          <span className="font-semibold">Under 3 months:</span> a temperature of
          100.4°F (38°C) or higher is an emergency — call the pediatrician or go
          to the ER right away.
        </p>
      </div>
    </div>
  );
}
