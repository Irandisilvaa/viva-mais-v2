import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { HeartPulse, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({ modo: z.enum(["login", "cadastro"]).optional() });

export const Route = createFileRoute("/auth")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Acessar o Viva Mais" },
      { name: "description", content: "Entre ou crie sua conta para agendar ações de saúde e bem-estar." },
      { property: "og:title", content: "Acessar o Viva Mais" },
      { property: "og:description", content: "Login da plataforma de saúde do trabalhador Viva Mais." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const contasDemo = [
  { perfil: "Administrador Geral", email: "admin@vivamais.dev", telas: "Tudo liberado" },
  { perfil: "Gestor (RH/Saúde)", email: "gestor@vivamais.dev", telas: "Painel de Indicadores" },
  { perfil: "Prestador de Serviço", email: "prestador@vivamais.dev", telas: "Meus Atendimentos" },
  { perfil: "Usuário (Trabalhador)", email: "usuario@vivamais.dev", telas: "Agenda e Bem-estar" },
];

const credenciais = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
  password: z.string().min(6, "A senha deve ter ao menos 6 caracteres").max(72),
  fullName: z.string().trim().min(3, "Informe seu nome completo").max(120).optional(),
  setor: z.string().trim().max(120).optional(),
  unidade: z.string().trim().max(120).optional(),
});

function AuthPage() {
  const { modo } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useSession();
  const [tab, setTab] = useState<"login" | "cadastro">(modo ?? "login");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", fullName: "", setor: "", unidade: "" });

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app" });
  }, [loading, session, navigate]);

  const update = (key: keyof typeof form) => (event: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: event.target.value }));

  // Função exclusiva para os botões de demonstração (Login Expresso)
  async function handleDemoLogin(emailDemo: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailDemo,
        password: "VivaMais@2026",
      });
      if (error) throw error;
      toast.success("Login de demonstração realizado com sucesso!");
      navigate({ to: "/app" });
    } catch (error: any) {
      toast.error("Erro ao entrar: " + (error.message || "Verifique se o usuário existe no banco."));
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = credenciais.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Dados inválidos");
      return;
    }
    if (tab === "cadastro" && !parsed.data.fullName) {
      toast.error("Informe seu nome completo");
      return;
    }
    setBusy(true);
    try {
      if (tab === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.password,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        navigate({ to: "/app" });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: { emailRedirectTo: `${window.location.origin}/app` },
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId && data.session) {
        await supabase.from("profiles").upsert({
          id: userId,
          full_name: parsed.data.fullName ?? "",
          email: parsed.data.email,
          setor: form.setor || null,
          unidade: form.unidade || null,
        });
        await supabase.from("user_roles").insert({ user_id: userId, role: "trabalhador" });
        toast.success("Conta criada!");
        navigate({ to: "/app" });
      } else {
        toast.success("Confira seu e-mail para confirmar o cadastro.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível concluir";
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/app" });
  }

  return (
    <div className="grid min-h-screen bg-gradient-soft lg:grid-cols-[1.1fr_1fr]">
      <aside className="hidden flex-col justify-between bg-gradient-hero p-12 text-primary-foreground lg:flex">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary-foreground/15">
            <HeartPulse className="size-5" />
          </span>
          <span className="font-display text-lg font-semibold">Viva Mais</span>
        </Link>
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold leading-tight">
            Seu cuidado organizado em um só lugar
          </h2>
          <p className="mt-4 text-sm opacity-90">
            Agende massagem, acupuntura, yoga, ginástica laboral e rodas de conversa. Acompanhe seu bem-estar e
            participe das campanhas institucionais.
          </p>
        </div>
        <p className="text-xs opacity-75">Dados pessoais de saúde protegidos conforme a LGPD.</p>
      </aside>

      <main className="flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-lift">
          <h1 className="text-2xl font-semibold">
            {tab === "login" ? "Entrar na plataforma" : "Criar minha conta"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {tab === "login"
              ? "Use seu e-mail institucional."
              : "Cadastre-se para agendar atividades de saúde e bem-estar."}
          </p>

          <Tabs value={tab} onValueChange={(value) => setTab(value as "login" | "cadastro")} className="mt-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Entrar</TabsTrigger>
              <TabsTrigger value="cadastro">Cadastrar</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {tab === "cadastro" ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Nome completo</Label>
                  <Input id="fullName" value={form.fullName} onChange={update("fullName")} maxLength={120} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="setor">Setor</Label>
                    <Input id="setor" value={form.setor} onChange={update("setor")} maxLength={120} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unidade">Unidade</Label>
                    <Input id="unidade" value={form.unidade} onChange={update("unidade")} maxLength={120} />
                  </div>
                </div>
              </>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={update("email")}
                maxLength={255}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                value={form.password}
                onChange={update("password")}
                maxLength={72}
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {tab === "login" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            ou
            <span className="h-px flex-1 bg-border" />
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={busy}>
            Continuar com o Google
          </Button>

          <div className="mt-6 rounded-lg border border-dashed bg-muted/40 p-4">
            <p className="text-sm font-medium">Contas de demonstração</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Clique para fazer login instantâneo. Senha padrão: <strong>VivaMais@2026</strong>
            </p>
            <div className="mt-3 grid gap-2">
              {contasDemo.map((conta) => (
                <button
                  key={conta.email}
                  type="button"
                  onClick={() => handleDemoLogin(conta.email)}
                  disabled={busy}
                  className="flex items-center justify-between rounded-md border bg-background px-3 py-2 text-left text-xs transition hover:bg-accent disabled:opacity-50"
                >
                  <span>
                    <span className="block font-medium">{conta.perfil}</span>
                    <span className="text-muted-foreground">{conta.email}</span>
                  </span>
                  <span className="text-muted-foreground">{conta.telas}</span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            <Link to="/" className="underline">
              Voltar para a página inicial
            </Link>
          </p>

        </div>
      </main>
    </div>
  );
}
