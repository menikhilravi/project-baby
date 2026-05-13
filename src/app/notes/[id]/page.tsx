import { BookOpen } from "lucide-react";
import { notFound, redirect } from "next/navigation";
import { PageHero } from "@/components/page-hero";
import { createClient } from "@/lib/supabase/server";
import { NoteEditor } from "./_components/editor";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!Number.isFinite(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: note } = await supabase
    .from("notes")
    .select("id, title, body, pinned, updated_at")
    .eq("id", id)
    .single();
  if (!note) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-8 md:py-12">
      <PageHero
        tool="notes"
        icon={BookOpen}
        eyebrow="Note"
        title={note.title}
      />
      <NoteEditor note={note} />
    </div>
  );
}
