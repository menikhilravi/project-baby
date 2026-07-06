import { redirect } from "next/navigation";
import { getPhase } from "@/lib/phase";

export default async function Home() {
  // Contractions (labor timer) is the landing tab during pregnancy; once the
  // baby arrives, Today takes over as home.
  const phase = await getPhase();
  redirect(phase === "postnatal" ? "/today" : "/contractions");
}
