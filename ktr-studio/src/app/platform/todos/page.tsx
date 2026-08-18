import { PageHeader, Card, Badge } from "../_components";
import { getTodos } from "@/lib/notifications";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { TodoToggle } from "./TodoToggle";
import { AddTodoDialog } from "./AddTodoDialog";
import { QuickAddTodo } from "./QuickAddTodo";
import { NoData } from "../_states";
import { ClientFilter } from "../ClientFilter";
import { PersonalTodos } from "./PersonalTodos";

export default async function TodosPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const [ctx, allTodos, { clients }] = await Promise.all([getSessionContext(), getTodos(), getWorkspaceData()]);
  const isClient = ctx.profile?.role === "client";
  const clientOptions = clients.map((c) => ({ id: c.id, label: c.name }));

  // Persoonlijke taken (van deze gebruiker) los van de klant-taken.
  const personal = allTodos.filter((t) => t.userId && t.userId === ctx.user?.id);
  const clientTodos = allTodos.filter((t) => !t.userId);

  const activeClient = clients.find((c) => c.id === sp.client);
  const todos = activeClient ? clientTodos.filter((t) => t.client === activeClient.name) : clientTodos;

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  // Editor-rol: Engelstalige schermteksten.
  const isEditor = ctx.profile?.role === "editor";
  const t9n = isEditor
    ? { eyebrow: "Tasks", title: "Your tasks", subtitle: "Check off what you've delivered or finished.", open: "Open", done: "Done", allDone: "All done 🎉", noneDone: "Nothing completed yet", deadline: "due", none: "No tasks yet" }
    : { eyebrow: isClient ? "Jouw taken" : "Taken", title: isClient ? "Wat er van je nodig is" : "Content-taken per klant", subtitle: isClient ? "Vink af zodra je iets hebt aangeleverd of goedgekeurd." : "Wijs taken toe aan klanten — ze krijgen automatisch een melding.", open: "Open", done: "Afgerond", allDone: "Alles afgevinkt 🎉", noneDone: "Nog niks afgerond", deadline: "deadline", none: "Nog geen taken" };

  return (
    <>
      <PageHeader
        eyebrow={t9n.eyebrow}
        title={t9n.title}
        subtitle={t9n.subtitle}
        action={isClient || isEditor ? undefined : <AddTodoDialog clients={clientOptions} />}
      />

      {!isClient && <ClientFilter clients={clients.map((c) => ({ id: c.id, name: c.name }))} allLabel={isEditor ? "All clients" : "Alle klanten"} />}

      {!isClient && !isEditor && <PersonalTodos initial={personal} />}

      {!isClient && !isEditor && <h2 className="font-display font-extrabold text-xl mb-3">Klant-taken</h2>}
      {!isClient && !isEditor && <QuickAddTodo clients={clientOptions} />}

      {todos.length === 0 ? (
        <NoData label={t9n.none} />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-xl">{t9n.open}</h2>
              <Badge color="#FBBF24">{open.length}</Badge>
            </div>
            <div className="space-y-2">
              {open.map((t) => (
                <div key={t.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/[0.02] transition-colors">
                  <div className="pt-0.5">
                    <TodoToggle todoId={t.id} done={t.done} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm">{t.title}</div>
                    <div className="text-[12px] text-muted">
                      {!isClient && <span>{t.client}</span>}
                      {!isClient && t.due && <span> · </span>}
                      {t.due && <span>{t9n.deadline} {t.due}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {open.length === 0 && <div className="text-sm text-muted py-4 text-center">{t9n.allDone}</div>}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-xl">{t9n.done}</h2>
              <Badge color="#34D399">{done.length}</Badge>
            </div>
            <div className="space-y-2">
              {done.map((t) => (
                <div key={t.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 opacity-60">
                  <div className="pt-0.5">
                    <TodoToggle todoId={t.id} done={t.done} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm line-through">{t.title}</div>
                    {!isClient && <div className="text-[12px] text-muted">{t.client}</div>}
                  </div>
                </div>
              ))}
              {done.length === 0 && <div className="text-sm text-muted py-4 text-center">{t9n.noneDone}</div>}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
