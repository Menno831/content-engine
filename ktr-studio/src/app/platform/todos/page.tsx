import { PageHeader, Card, Badge } from "../_components";
import { getTodos } from "@/lib/notifications";
import { getWorkspaceData } from "@/lib/data";
import { getSessionContext } from "@/lib/auth";
import { TodoToggle } from "./TodoToggle";
import { AddTodoDialog } from "./AddTodoDialog";
import { NoData } from "../_states";
import { ClientFilter } from "../ClientFilter";

export default async function TodosPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const sp = await searchParams;
  const ctx = await getSessionContext();
  const isClient = ctx.profile?.role === "client";
  const allTodos = await getTodos();
  const { clients } = await getWorkspaceData();
  const clientOptions = clients.map((c) => ({ id: c.id, label: c.name }));

  const activeClient = clients.find((c) => c.id === sp.client);
  const todos = activeClient ? allTodos.filter((t) => t.client === activeClient.name) : allTodos;

  const open = todos.filter((t) => !t.done);
  const done = todos.filter((t) => t.done);

  return (
    <>
      <PageHeader
        eyebrow={isClient ? "Jouw taken" : "Taken"}
        title={isClient ? "Wat er van je nodig is" : "Content-taken per klant"}
        subtitle={
          isClient
            ? "Vink af zodra je iets hebt aangeleverd of goedgekeurd."
            : "Wijs taken toe aan klanten — ze krijgen automatisch een melding."
        }
        action={isClient ? undefined : <AddTodoDialog clients={clientOptions} />}
      />

      {!isClient && <ClientFilter clients={clients.map((c) => ({ id: c.id, name: c.name }))} />}

      {todos.length === 0 ? (
        <NoData label="Nog geen taken" />
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-xl">Open</h2>
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
                      {t.due && <span>deadline {t.due}</span>}
                    </div>
                  </div>
                </div>
              ))}
              {open.length === 0 && <div className="text-sm text-muted py-4 text-center">Alles afgevinkt 🎉</div>}
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display font-extrabold text-xl">Afgerond</h2>
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
              {done.length === 0 && <div className="text-sm text-muted py-4 text-center">Nog niks afgerond</div>}
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
