import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BookOpenText, CalendarCheck, CalendarX2, HeartPulse, Loader2, Trophy } from "lucide-react";

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
        eyebrow="Painel do Trabalhador"
        title={primeiroNome ? `Olá, ${primeiroNome}! 👋` : "Olá! 👋"}
        description="Acompanhe seu cuidado diário: agendamentos, bem-estar, conteúdos e campanhas."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        {atalhos.map((atalho) => (
          <Link
            key={atalho.to}
            to={atalho.to}
            className="group flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/50"
          >
            <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <atalho.icon className="size-5" />
            </span>
            <span className="text-sm font-medium">{atalho.label}</span>
            <ArrowRight className="ml-auto size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Card de Agendamentos */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CalendarCheck className="size-5 text-primary" />
              Próximos Agendamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {proximos.isLoading && (
              <div className="flex justify-center py-6">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            )}
            
            {proximos.data?.length === 0 && (
              <div className="flex flex-col items-center text-center py-8 bg-muted/30 rounded-xl border border-dashed">
                <CalendarX2 className="size-10 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground mb-4">Você ainda não tem serviços agendados.</p>
                <Button asChild variant="outline" size="sm">
                  <Link to="/app/agenda">Ver horários disponíveis</Link>
                </Button>
              </div>
            )}

            {proximos.data?.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:bg-muted/50">
                <div>
                  <p className="text-sm font-semibold">{booking.service_slots?.services?.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
                    {booking.service_slots ? formatDateTime(booking.service_slots.starts_at) : ""}
                    {booking.service_slots?.local ? ` • ${booking.service_slots.local}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="px-3 py-1">{statusLabels[booking.status]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Card de Bem-Estar */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HeartPulse className="size-5 text-primary" />
                Como você está hoje?
              </CardTitle>
            </CardHeader>
            <CardContent>
              {checkin.data ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <p className="text-sm text-muted-foreground mb-2">
                    Último check-in: <span className="font-medium text-foreground">{formatDate(checkin.data.created_at)}</span>
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="bg-background">Humor {checkin.data.humor}/5</Badge>
                    <Badge variant="outline" className="bg-background">Energia {checkin.data.energia}/5</Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground mb-4">Você ainda não registrou seu nível de bem-estar hoje.</p>
              )}
              <Button asChild className="w-full mt-4">
                <Link to="/app/bem-estar">Registrar Check-in</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Card de Campanhas */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="size-5 text-primary" />
                Campanhas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {campanhas.isLoading && (
                <div className="flex justify-center py-4">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              )}
              
              {campanhas.data?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma campanha institucional no momento.</p>
              )}

              {campanhas.data?.map((campanha) => (
                <div key={campanha.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <span className="text-sm font-medium line-clamp-1">{campanha.title}</span>
                  <Badge variant="secondary" className="whitespace-nowrap">{kindLabels[campanha.kind]}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
