import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarRange, Plus, Trophy } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatDate, kindLabels } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/app/campanhas")({
  head: () => ({
    meta: [
      { title: "Campanhas e metas — Viva Mais" },
      {
        name: "description",
        content: "Participe da SIPAT, da Semana da Saúde e dos desafios, e acompanhe suas metas pessoais.",
      },
      { property: "og:title", content: "Campanhas e metas — Viva Mais" },
      { property: "og:description", content: "Engajamento, campanhas internas e metas de autocuidado." },
    ],
  }),
  component: Campanhas,
});

function Campanhas() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [novaMeta, setNovaMeta] = useState({ title: "", alvo: "8", unidade: "vezes" });

  const campanhas = useQuery({
    queryKey: ["campanhas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("active", true)
        .order("starts_on");
      if (error) throw error;
      return data ?? [];
    },
  });

  const participacoes = useQuery({
    queryKey: ["participacoes", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_participations").select("*");
      if (error) throw error;
      return data ?? [];
    },
  });

  const metas = useQuery({
    queryKey: ["metas", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const participar = useMutation({
    mutationFn: async (campanha: { id: string; pontos: number }) => {
      const { error } = await supabase
        .from("campaign_participations")
        .insert({ campaign_id: campanha.id, user_id: user!.id, pontos: campanha.pontos });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Inscrição registrada. Bora participar!");
      queryClient.invalidateQueries({ queryKey: ["participacoes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const criarMeta = useMutation({
    mutationFn: async () => {
      if (novaMeta.title.trim().length < 3) throw new Error("Descreva sua meta");
      const { error } = await supabase.from("goals").insert({
        user_id: user!.id,
        title: novaMeta.title.trim().slice(0, 120),
        alvo: Math.max(Number(novaMeta.alvo) || 1, 1),
        unidade: novaMeta.unidade.trim().slice(0, 30) || "vezes",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Meta criada!");
      setNovaMeta({ title: "", alvo: "8", unidade: "vezes" });
      queryClient.invalidateQueries({ queryKey: ["metas"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const avancarMeta = useMutation({
    mutationFn: async (meta: { id: string; progresso: number; alvo: number }) => {
      const { error } = await supabase
        .from("goals")
        .update({ progresso: Math.min(meta.progresso + 1, meta.alvo) })
        .eq("id", meta.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metas"] }),
  });

  const pontos = (participacoes.data ?? []).reduce((total, row) => total + row.pontos, 0);

  return (
    <>
      <PageHeader
        eyebrow="Módulo 4"
        title="Engajamento e campanhas"
        description="SIPAT, Semana da Saúde, desafios institucionais e suas metas pessoais de autocuidado."
        action={
          <Badge variant="secondary" className="gap-1 px-3 py-1.5 text-sm">
            <Trophy className="size-4" />
            {pontos} pontos
          </Badge>
        }
      />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Campanhas e desafios</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {campanhas.data?.map((campanha) => {
            const inscrito = participacoes.data?.some((p) => p.campaign_id === campanha.id);
            return (
              <Card key={campanha.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <CardTitle className="text-base">{campanha.title}</CardTitle>
                    <Badge variant={campanha.kind === "sipat" ? "default" : "outline"}>
                      {kindLabels[campanha.kind]}
                    </Badge>
                  </div>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarRange className="size-3.5" />
                    {formatDate(campanha.starts_on)}
                    {campanha.ends_on ? ` até ${formatDate(campanha.ends_on)}` : ""}
                  </p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{campanha.description}</p>
                  <Button
                    size="sm"
                    variant={inscrito ? "secondary" : "default"}
                    disabled={inscrito || participar.isPending}
                    onClick={() => participar.mutate({ id: campanha.id, pontos: campanha.pontos })}
                  >
                    {inscrito ? "Inscrito" : `Participar (+${campanha.pontos} pts)`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Minhas metas</h2>
        <Card>
          <CardContent className="grid gap-3 py-4 sm:grid-cols-[1fr_7rem_7rem_auto] sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="meta">Meta</Label>
              <Input
                id="meta"
                value={novaMeta.title}
                maxLength={120}
                placeholder="Ex.: participar de pausas ativas"
                onChange={(event) => setNovaMeta((prev) => ({ ...prev, title: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alvo">Alvo</Label>
              <Input
                id="alvo"
                type="number"
                min={1}
                value={novaMeta.alvo}
                onChange={(event) => setNovaMeta((prev) => ({ ...prev, alvo: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                value={novaMeta.unidade}
                maxLength={30}
                onChange={(event) => setNovaMeta((prev) => ({ ...prev, unidade: event.target.value }))}
              />
            </div>
            <Button onClick={() => criarMeta.mutate()} disabled={criarMeta.isPending}>
              <Plus className="size-4" />
              Criar
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {metas.data?.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma meta cadastrada.</p>
          ) : null}
          {metas.data?.map((meta) => (
            <Card key={meta.id}>
              <CardContent className="space-y-3 py-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{meta.title}</p>
                  <span className="text-sm text-muted-foreground">
                    {meta.progresso}/{meta.alvo} {meta.unidade}
                  </span>
                </div>
                <Progress value={(meta.progresso / meta.alvo) * 100} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={meta.progresso >= meta.alvo}
                  onClick={() =>
                    avancarMeta.mutate({ id: meta.id, progresso: meta.progresso, alvo: meta.alvo })
                  }
                >
                  {meta.progresso >= meta.alvo ? "Meta concluída" : "Registrar +1"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
