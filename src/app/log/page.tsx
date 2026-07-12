import { redirect } from "next/navigation";

// "Night Shift" merged into the /today home. Logging + the glance metrics now
// live there; the full per-activity trace lives at /log/[kind]. Keep this route
// as a redirect so old links, bookmarks, and PWA shortcuts still land somewhere.
export default function LogPage() {
  redirect("/today");
}
