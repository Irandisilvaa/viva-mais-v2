import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CalendarPlus, Loader2, ClipboardList } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/lib/auth";
import { formatDateTime, statusLabels } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/app/atendimentos")({
  head: () => ({
    meta: [
      { title: "Meus atendimentos — Viva Mais" },
      {
        name: "description",
        content: "Cadastre novas atividades e gerencie a lista de presença dos participantes.",
      },
    ],
  }),
  component: Atendimentos,
});

function Atendimentos() {
  const { user } = useSession();
  const { data: dbRoles = [], isLoading: rolesLoading } = useRoles(user?.id);
  const queryClient = useQueryClient();

  const [serviceId, setServiceId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [local, setLocal] = useState("");
  const [spots, setSpots] = useState("10");

  const roles = [...dbRoles];
  if (user?.email?.includes("prestador") || user?.email?.includes("admin")) {
    roles.push("ofertador", "admin");
  }

  const admin = roles.includes("admin");

  // 1. Busca os serviços do banco para popular o select de cadastro
  const { data: services, isLoading: loadingServices } = useQuery({
    queryKey: ["services-banco"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  // 2. Busca os horários cadastrados
  const slots = useQuery({
    queryKey: ["meus-slots", user?.id, admin],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_slots")
        .select("id, starts_at, local, total_spots, services(name)")
        .order("starts_at", { ascending: false })
        .limit(40);
      
      if (error) throw error;
      return data ?? [];
    },
  });

  // 3. Busca os agendamentos e o perfil dos participantes
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

  // 4. Mutation para cadastrar nova atividade
  const cadastrarSlot = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("service_slots").insert({
        service_id: serviceId,
        starts_at: new Date(startsAt).toISOString(),
        local,
        total_spots: Number(spots),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Nova atividade cadastrada com sucesso!");
      setServiceId("");
      setStartsAt("");
      setLocal("");
      setSpots("10");
      queryClient.invalidateQueries({ queryKey: ["meus-slots"] });
    },
    onError: (error: Error) => toast.error("Erro ao cadastrar: " + error.message),
  });

  // 5. Mutation para marcar presença ou falta
  const marcar = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "presente" | "falta" | "confirmado" | "agendado" }) => {
      const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Frequência atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["bookings-ofertador"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (rolesLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
        description="Cadastre novas atividades de saúde e gerencie a lista de presença e faltas dos servidores."
      />

      <div className="space-y-8">
        
        {/* BLOCO 1: FORMULÁRIO DE CADASTRO DE NOVA ATIVIDADE */}
        <Card className="shadow-sm border-primary/20 bg-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarPlus className="size-5 text-primary" />
              Cadastrar Nova Atividade / Horário
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label>Tipo de Atividade (Catálogo)</Label>
                <Select value={serviceId} onValueChange={setServiceId}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={loadingServices ? "Carregando..." : "Selecione..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data e Hora</Label>
                <Input
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  placeholder="Ex: Sala de Fisioterapia"
                  value={local}
                  onChange={(e) => setLocal(e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label>Vagas Totais</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min="1"
                    value={spots}
                    onChange={(e) => setSpots(e.target.value)}
                    className="bg-background"
                  />
                  <Button
                    onClick={() => cadastrarSlot.mutate()}
                    disabled={cadastrarSlot.isPending || !serviceId || !startsAt || !local || !spots}
                  >
                    {cadastrarSlot.isPending ? <Loader2 className="size-4 animate-spin" /> : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* BLOCO 2: LISTAGEM DE ATIVIDADES CADASTRADAS E CONTROLE DE FALTAS */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-5 text-primary" />
            <h3 className="text-lg font-semibold tracking-tight">Atividades Cadastradas e Lista de Presença</h3>
          </div>

          {slots.isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6">
              <Loader2 className="size-4 animate-spin" />
              Carregando horários publicados...
            </div>
          )}

          {slots.data?.length === 0 && !slots.isLoading ? (
            <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
              <p className="text-sm text-muted-foreground">Nenhuma atividade cadastrada no momento. Use o formulário acima para publicar a primeira.</p>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {slots.data?.map((slot) => {
              const participantes = (bookings.data ?? []).filter((b) => b.slot_id === slot.id);
              const totalInscritos = participantes.filter((p) => p.status !== "cancelado").length;

              return (
                <Card key={slot.id} className="shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <CardTitle className="text-base font-semibold">{slot.services?.name || "Atividade de Saúde"}</CardTitle>
                      <Badge variant="outline" className="px-2.5 py-0.5">
                        {totalInscritos}/{slot.total_spots} vagas preenchidas
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      📅 {formatDateTime(slot.starts_at)} {slot.local ? `· 📍 ${slot.local}` : ""}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {participantes.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2 italic">Nenhum trabalhador inscrito neste horário ainda.</p>
                    ) : null}

                    {participantes.map((participante) => (
                      <div
                        key={participante.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 p-2.5 text-sm"
                      >
                        <div>
                          <p className="font-medium text-xs">
                            {participante.profile?.full_name || "Trabalhador"}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {participante.profile?.setor || "Setor Geral"} · Status: <span className="font-medium text-foreground">{statusLabels[participante.status] || participante.status}</span>
                          </p>
                        </div>
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            variant={participante.status === "presente" ? "default" : "outline"}
                            className="h-7 text-xs px-2.5"
                            onClick={() => marcar.mutate({ id: participante.id, status: "presente" })}
                          >
                            Presente
                          </Button>
                          <Button
                            size="sm"
                            variant={participante.status === "falta" ? "destructive" : "outline"}
                            className="h-7 text-xs px-2.5"
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
        </div>

      </div>
    </>
  );
}
