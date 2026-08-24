import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpenText,
  CalendarCheck,
  CalendarDays,
  ClipboardCheck,
  HeartPulse,
  Loader2,
  LogOut,
  Menu,
  Settings2,
  Trophy,
  UserRound,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles, useSession, roleLabels, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof CalendarCheck; roles?: AppRole[] };

const navItems: NavItem[] = [
  { to: "/app", label: "Início", icon: HeartPulse },
  { to: "/app/agenda", label: "Agendar", icon: CalendarCheck },
  { to: "/app/agendamentos", label: "Meus agendamentos", icon: CalendarDays },
  { to: "/app/conteudos", label: "Informação e formação", icon: BookOpenText },
  { to: "/app/bem-estar", label: "Saúde e bem-estar", icon: HeartPulse },
  { to: "/app/campanhas", label: "Campanhas e metas", icon: Trophy },
  { to: "/app/atendimentos", label: "Meus atendimentos", icon: ClipboardCheck, roles: ["ofertador", "admin"] },
  { to: "/app/indicadores", label: "Painel de indicadores", icon: BarChart3, roles: ["gestor", "admin"] },
  { to: "/app/administracao", label: "Administração", icon: Settings2, roles: ["admin"] },
  { to: "/app/perfil", label: "Meu perfil", icon: UserRound },
];

function AppLayout() {
  const navigate = useNavigate();
  const { session, user, loading } = useSession();
  const { data: roles = [] } = useRoles(user?.id);
  const { data: profile } = useProfile(user?.id);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  const visibleItems = navItems.filter((item) => !item.roles || item.roles.some((role) => roles.includes(role)));

  const nav = (
    <nav className="space-y-1">
      {visibleItems.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setOpen(false)}
          activeOptions={{ exact: item.to === "/app" }}
          activeProps={{ className: "bg-secondary text-secondary-foreground" }}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <item.icon className="size-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  );

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-border bg-sidebar p-4 lg:flex lg:flex-col">
        <Link to="/app" className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-hero text-primary-foreground">
            <HeartPulse className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Viva Mais</span>
        </Link>
        {nav}
        <div className="mt-auto rounded-xl bg-muted p-3">
          <p className="truncate text-sm font-medium">{profile?.full_name || user?.email}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {roles.length ? roles.map((role) => roleLabels[role]).join(" · ") : "Trabalhador"}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start" onClick={signOut}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4">
              <div className="mb-6 mt-2 flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-gradient-hero text-primary-foreground">
                  <HeartPulse className="size-5" />
                </span>
                <span className="font-display text-lg font-semibold">Viva Mais</span>
              </div>
              {nav}
              <Button variant="ghost" size="sm" className="mt-6 w-full justify-start" onClick={signOut}>
                <LogOut className="size-4" />
                Sair
              </Button>
            </SheetContent>
          </Sheet>
          <span className="font-display font-semibold">Viva Mais</span>
          <span className="size-9" />
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 space-y-8 px-4 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
