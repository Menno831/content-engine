// Data-laag voor notificaties + to-do's: demo-of-echt, net als data.ts.
import { DEMO_MODE, isSupabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import {
  notifications as demoNotifications,
  todos as demoTodos,
  type Notification,
  type Todo,
} from "@/app/platform/_data";

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "zojuist";
  if (h < 24) return `${h}u geleden`;
  const d = Math.floor(h / 24);
  return d === 1 ? "gisteren" : `${d} dagen geleden`;
}

export async function getNotifications(): Promise<Notification[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoNotifications;
  const supabase = await createClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("notifications")
    .select("id,type,title,body,link,read,created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map((n) => ({
    id: n.id,
    type: (n.type ?? "info") as Notification["type"],
    title: n.title,
    body: n.body ?? null,
    link: n.link ?? null,
    read: Boolean(n.read),
    date: n.created_at ? relTime(n.created_at) : "",
  }));
}

export async function getTodos(): Promise<Todo[]> {
  if (DEMO_MODE || !isSupabaseConfigured) return demoTodos;
  const supabase = await createClient();
  if (!supabase) return [];

  // urgency/user_id komen uit migratie 023 — val terug als die nog mist.
  let todoRows = (
    await supabase
      .from("todos")
      .select("id,client_id,title,done,due,created_at,urgency,user_id")
      .order("done", { ascending: true })
      .order("created_at", { ascending: false })
  ).data as
    | { id: string; client_id: string | null; title: string; done: boolean; due: string | null; urgency?: string | null; user_id?: string | null }[]
    | null;
  if (!todoRows) {
    todoRows = (
      await supabase
        .from("todos")
        .select("id,client_id,title,done,due,created_at")
        .order("done", { ascending: true })
        .order("created_at", { ascending: false })
    ).data;
  }

  const { data: clientRows } = await supabase.from("clients").select("id,name");
  const nameById = new Map<string, string>((clientRows ?? []).map((c) => [c.id, c.name]));

  return (todoRows ?? []).map((t) => ({
    id: t.id,
    client: t.client_id ? (nameById.get(t.client_id) ?? "—") : "—",
    title: t.title,
    done: Boolean(t.done),
    due: t.due ? new Date(t.due).toLocaleDateString("nl-NL", { weekday: "short", day: "numeric", month: "short" }) : null,
    urgency: t.urgency ?? null,
    userId: t.user_id ?? null,
  }));
}
