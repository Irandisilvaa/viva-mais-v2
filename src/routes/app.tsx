import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
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
import { useProfile, useSession, roleLabels, type AppRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export const Route = createFileRoute("/app")({
  component: AppLayout,
});

type NavItem = { to: string; label: string; icon: typeof CalendarCheck; roles?: AppRole[] };

// 🔒 TRAVA DE ACESSO: Agora cada item tem exatamente quem pode ver
const navItems: NavItem[] = [
  { to: "/app", label: "Início", icon: HeartPulse, roles: ["trabalhador"] },
  { to: "/app/agenda", label: "Agendar", icon: CalendarCheck, roles: ["trabalhador"] },
  { to: "/app/agendamentos", label: "Meus agendamentos", icon: CalendarDays, roles: ["trabalhador"] },
  { to: "/app/conteudos", label: "Informação e formação", icon: BookOpenText, roles: ["trabalhador"] },
  { to: "/app/bem-estar", label: "Saúde e bem-estar", icon: HeartPulse, roles: ["trabalhador"] },
  { to: "/app/campanhas", label: "Campanhas e metas", icon: Trophy, roles: ["trabalhador"] },
  
  { to: "/app/atendimentos", label: "Meus atendimentos", icon: ClipboardCheck, roles: ["ofertador", "admin"] },
  
  { to: "/app/indicadores", label: "Painel de indicadores", icon: BarChart3, roles: ["gestor", "admin"] },
  { to: "/app/administracao", label: "Administração", icon: Settings2, roles: ["admin"] },
  
  { to: "/app/perfil", label: "Meu perfil", icon: UserRound }, // Sem role = todos veem
];

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user, loading } = useSession();
  const { data: profile } = useProfile(user?.id);
  const [open, setOpen] = useState(false);

  // 🚀 HACK DE APRESENTAÇÃO: Força o perfil perfeito baseado no e-mail de login
  let activeRoles: AppRole[] = [];
  if (user?.email?.includes("admin")) {
    activeRoles = ["admin", "gestor", "ofertador", "trabalhador"] as AppRole[];
  } else if (user?.email?.includes("gestor")) {
    activeRoles = ["gestor"] as AppRole[];
  } else if (user?.email?.includes("prestador")) {
    activeRoles = ["ofertador"] as AppRole[];
  } else {
    activeRoles = ["trabalhador"] as AppRole[];
  }

  useEffect(() => {
    if (!loading) {
      if (!session) {
        navigate({ to: "/auth" });
      } else if (location.pathname === "/app") {
        // Redirecionamento inteligente: tira o prestador/gestor da tela do trabalhador
        if (activeRoles.includes("ofertador") && !activeRoles.includes("trabalhador")) {
          navigate({ to: "/app/atendimentos", replace: true });
        } else if (activeRoles.includes("gestor") && !activeRoles.includes("trabalhador")) {
          navigate({ to: "/app/indicadores", replace: true });
        }
      }
    }
  }, [loading, session, navigate, activeRoles, location.pathname]);

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  // Filtra o menu para mostrar APENAS o que o usuário logado tem permissão
  const visibleItems = navItems.filter((item) => !item.roles || item.roles.some((role) => activeRoles.includes(role)));

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

  // Descobre o nome do perfil para mostrar na barra inferior
  let nomePerfil = "Trabalhador";
  if (activeRoles.includes("admin")) nomePerfil = "Administrador";
  else if (activeRoles.includes("gestor")) nomePerfil = "Gestor";
  else if (activeRoles.includes("ofertador")) nomePerfil = "Prestador de Serviços";

  return (
    <div className="min-h-screen bg-background lg:grid lg:grid-cols-[16rem_1fr]">
      <aside className="hidden border-r border-border bg-sidebar p-4 lg:flex lg:flex-col shadow-sm">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <HeartPulse className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Viva Mais</span>
        </div>
        
        {/* Menu renderizado com filtros aplicados */}
        {nav}
        
        <div className="mt-auto rounded-xl bg-muted/50 border border-border/50 p-3">
          <p className="truncate text-sm font-medium">{profile?.full_name || user?.email}</p>
          <p className="mt-0.5 text-xs text-primary font-semibold">
            {nomePerfil}
          </p>
          <Button variant="ghost" size="sm" className="mt-2 w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={signOut}>
            <LogOut className="size-4" />
            Sair
          </Button>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-border px-4 py-3 lg:hidden bg-background">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-4 flex flex-col">
              <div className="mb-6 mt-2 flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
                  <HeartPulse className="size-5" />
                </span>
                <span className="font-display text-lg font-semibold">Viva Mais</span>
              </div>
              {nav}
              <div className="mt-auto">
                 <Button variant="ghost" size="sm" className="mt-6 w-full justify-start text-destructive hover:bg-destructive/10" onClick={signOut}>
                  <LogOut className="size-4" />
                  Sair
                </Button>
              </div>
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
