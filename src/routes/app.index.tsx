import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenText, CalendarCheck, HeartPulse, Trophy } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useProfile, useSession } from "@/lib/auth";
import { formatDate, formatDateTime, kindLabels, statusLabels } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/")({
  head: () => ({
    meta: [
      { title: "Início — Viva Mais" },
      { name: "description", content: "Seus próximos agendamentos, bem-estar e campanhas ativas." },
      { property: "og:title", content: "Início — Viva Mais" },
      { property: "og:description", content: "Painel do trabalhador na plataforma Viva Mais." },
    ],
  }),
  component: Inicio,
});

const atalhos = [
  { to: "/app/agenda", label: "Agendar atividade", icon: CalendarCheck },
  { to: "/app/conteudos", label: "Ver conteúdos", icon: BookOpenText },
  { to: "/app/bem-estar", label: "Fazer check-in", icon: HeartPulse },
  { to: "/app/campanhas", label: "Campanhas e metas", icon: Trophy },
];

function Inicio() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);

  const proximos = useQuery({
    queryKey: ["proximos-agendamentos", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, status, service_slots(starts_at, local, services(name))")
        .eq("user_id", user!.id)
        .in("status", ["agendado", "confirmado"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((row) => row.service_slots && new Date(row.service_slots.starts_at) > new Date());
    },
  });

  const checkin = useQuery({
    queryKey: ["ultimo-checkin", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellbeing_checkins")
        .select("humor, energia, created_at")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const campanhas = useQuery({
    queryKey: ["campanhas-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("id, title, kind, starts_on, ends_on")
        .eq("active", true)
        .order("starts_on")
        .limit(3);
      if (error) throw error;
      return data ?? [];
    },
  });

  const primeiroNome = (profile?.full_name || user?.email || "").split(" ")[0];

  return (
    <>
      <PageHeader
        eyebrow="Viva Mais"
        title={primeiroNome ? `Olá, ${primeiroNome}` : "Olá"}
        description="Acompanhe seu cuidado: agendamentos, bem-estar, conteúdos e campanhas."
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {atalhos.map((atalho) => (
          <Link
            key={atalho.to}
            to={atalho.to}
            className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-shadow hover:shadow-lift"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <atalho.icon className="size-5" />
            </span>
            <span className="text-sm font-medium">{atalho.label}</span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Próximos agendamentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {proximos.isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : null}
            {proximos.data?.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Você ainda não tem agendamentos.{" "}
                <Link to="/app/agenda" className="text-primary underline">
                  Ver horários disponíveis
                </Link>
              </p>
            ) : null}
            {proximos.data?.map((booking) => (
              <div key={booking.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{booking.service_slots?.services?.name}</p>
                  <Badge variant="secondary">{statusLabels[booking.status]}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {booking.service_slots ? formatDateTime(booking.service_slots.starts_at) : ""}
                  {booking.service_slots?.local ? ` · ${booking.service_slots.local}` : ""}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Como você está?</CardTitle>
            </CardHeader>
            <CardContent>
              {checkin.data ? (
                <p className="text-sm text-muted-foreground">
                  Último check-in em {formatDate(checkin.data.created_at)} · humor {checkin.data.humor}/5 ·
                  energia {checkin.data.energia}/5
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Você ainda não registrou seu bem-estar.</p>
              )}
              <Button asChild size="sm" className="mt-4">
                <Link to="/app/bem-estar">Registrar agora</Link>
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campanhas em andamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {campanhas.data?.map((campanha) => (
                <div key={campanha.id} className="flex items-center justify-between gap-2 text-sm">
                  <span>{campanha.title}</span>
                  <Badge variant="outline">{kindLabels[campanha.kind]}</Badge>
                </div>
              ))}
              {campanhas.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma campanha ativa.</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
