import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/lib/auth";
import { formatDateTime, statusLabels } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/app/atendimentos")({
  head: () => ({
    meta: [
      { title: "Meus atendimentos — Viva Mais" },
      {
        name: "description",
        content: "Lista de presença dos participantes das atividades sob sua responsabilidade.",
      },
      { property: "og:title", content: "Meus atendimentos — Viva Mais" },
      { property: "og:description", content: "Controle de presença e ausência das atividades ofertadas." },
    ],
  }),
  component: Atendimentos,
});

function Atendimentos() {
  const { user } = useSession();
  const { data: roles = [] } = useRoles(user?.id);
  const queryClient = useQueryClient();
  const admin = roles.includes("admin");

  const slots = useQuery({
    queryKey: ["meus-slots", user?.id, admin],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let query = supabase
        .from("service_slots")
        .select("id, starts_at, local, capacity, services(name, modality)")
        .order("starts_at", { ascending: false })
        .limit(40);
      if (!admin) query = query.eq("provider_id", user!.id);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const bookings = useQuery({
    queryKey: ["bookings-ofertador", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("id, slot_id, status, user_id");
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((row) => row.user_id))];
      const { data: perfis } = ids.length
        ? await supabase.from("profiles").select("id, full_name, setor").in("id", ids)
        : { data: [] };
      const mapa = new Map((perfis ?? []).map((p) => [p.id, p]));
      return (data ?? []).map((row) => ({ ...row, profile: mapa.get(row.user_id) ?? null }));
    },
  });

  const marcar = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "presente" | "falta" | "confirmado" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro atualizado.");
      queryClient.invalidateQueries({ queryKey: ["bookings-ofertador"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!roles.includes("ofertador") && !admin) {
    return (
      <PageHeader
        eyebrow="Módulo 1"
        title="Meus atendimentos"
        description="Área exclusiva de ofertadores de serviços e administradores."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Módulo 1"
        title="Meus atendimentos"
        description="Registre presença ou ausência dos participantes. Esses registros alimentam os indicadores."
      />

      {slots.data?.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum horário sob sua responsabilidade.</p>
      ) : null}

      <div className="space-y-4">
        {slots.data?.map((slot) => {
          const participantes = (bookings.data ?? []).filter((b) => b.slot_id === slot.id);
          return (
            <Card key={slot.id}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-base">{slot.services?.name}</CardTitle>
                  <Badge variant="outline">
                    {participantes.filter((p) => p.status !== "cancelado").length}/{slot.capacity} inscritos
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(slot.starts_at)}
                  {slot.local ? ` · ${slot.local}` : ""}
                </p>
              </CardHeader>
              <CardContent className="space-y-2">
                {participantes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nenhum participante inscrito.</p>
                ) : null}
                {participantes.map((participante) => (
                  <div
                    key={participante.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {participante.profile?.full_name || "Trabalhador"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {participante.profile?.setor || "Setor não informado"} ·{" "}
                        {statusLabels[participante.status]}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={participante.status === "presente" ? "default" : "outline"}
                        onClick={() => marcar.mutate({ id: participante.id, status: "presente" })}
                      >
                        Presente
                      </Button>
                      <Button
                        size="sm"
                        variant={participante.status === "falta" ? "destructive" : "outline"}
                        onClick={() => marcar.mutate({ id: participante.id, status: "falta" })}
                      >
                        Falta
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
