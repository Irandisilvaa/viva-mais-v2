import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { MapPin, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { categoriasServico, formatDateTime } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/agenda")({
  head: () => ({
    meta: [
      { title: "Agendar atividade — Viva Mais" },
      {
        name: "description",
        content: "Veja horários disponíveis de massagem, acupuntura, yoga, ginástica laboral e mais.",
      },
      { property: "og:title", content: "Agendar atividade — Viva Mais" },
      { property: "og:description", content: "Horários disponíveis das ações de saúde e bem-estar." },
    ],
  }),
  component: Agenda,
});

function Agenda() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [filtro, setFiltro] = useState("todos");

  const slots = useQuery({
    queryKey: ["slots-disponiveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_slots")
        .select(
          "id, starts_at, ends_at, capacity, local, link, service_id, services(id, name, description, categoria, modality, duration_min)",
        )
        .eq("cancelled", false)
        .gt("starts_at", new Date().toISOString())
        .order("starts_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const bookings = useQuery({
    queryKey: ["minhas-reservas", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("id, slot_id, status");
      if (error) throw error;
      return data ?? [];
    },
  });

  const ocupacao = useQuery({
    queryKey: ["ocupacao-slots"],
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("slot_id, status");
      if (error) throw error;
      const map = new Map<string, number>();
      for (const row of data ?? []) {
        if (row.status === "cancelado") continue;
        map.set(row.slot_id, (map.get(row.slot_id) ?? 0) + 1);
      }
      return map;
    },
  });

  const agendar = useMutation({
    mutationFn: async (slotId: string) => {
      const { error } = await supabase.from("bookings").insert({ slot_id: slotId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento confirmado! Você receberá o lembrete por e-mail.");
      queryClient.invalidateQueries({ queryKey: ["minhas-reservas"] });
      queryClient.invalidateQueries({ queryKey: ["ocupacao-slots"] });
      queryClient.invalidateQueries({ queryKey: ["proximos-agendamentos"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const categorias = useMemo(() => {
    const set = new Set((slots.data ?? []).map((slot) => slot.services?.categoria).filter(Boolean));
    return Array.from(set) as string[];
  }, [slots.data]);

  const lista = (slots.data ?? []).filter(
    (slot) => filtro === "todos" || slot.services?.categoria === filtro,
  );

  return (
    <>
      <PageHeader
        eyebrow="Módulo 1"
        title="Agendamento"
        description="Escolha uma atividade e um horário disponível. Atividades coletivas têm vagas limitadas."
        action={
          <Select value={filtro} onValueChange={setFiltro}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {categorias.map((categoria) => (
                <SelectItem key={categoria} value={categoria}>
                  {categoriasServico[categoria] ?? categoria}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {slots.isLoading ? <p className="text-sm text-muted-foreground">Carregando horários…</p> : null}
      {!slots.isLoading && lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum horário disponível no momento.</p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {lista.map((slot) => {
          const usadas = ocupacao.data?.get(slot.id) ?? 0;
          const restantes = Math.max(slot.capacity - usadas, 0);
          const minha = bookings.data?.find((b) => b.slot_id === slot.id && b.status !== "cancelado");
          return (
            <Card key={slot.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base">{slot.services?.name}</CardTitle>
                  <Badge variant={slot.services?.modality === "coletiva" ? "secondary" : "outline"}>
                    {slot.services?.modality === "coletiva" ? "Coletiva" : "Individual"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{slot.services?.description}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm font-medium">{formatDateTime(slot.starts_at)}</p>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3.5" />
                    {slot.local || slot.link || "A definir"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3.5" />
                    {restantes} de {slot.capacity} vaga(s)
                  </span>
                  <span>{slot.services?.duration_min} min</span>
                </div>
                {minha ? (
                  <Button size="sm" variant="secondary" disabled className="w-full">
                    Você já está inscrito
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={restantes === 0 || agendar.isPending}
                    onClick={() => agendar.mutate(slot.id)}
                  >
                    {restantes === 0 ? "Sem vagas" : "Agendar"}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
