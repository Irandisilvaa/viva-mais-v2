import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { formatDate } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/bem-estar")({
  head: () => ({
    meta: [
      { title: "Saúde e bem-estar — Viva Mais" },
      {
        name: "description",
        content: "Faça seu check-in de humor, energia, dor e sono e acompanhe seu histórico individual.",
      },
      { property: "og:title", content: "Saúde e bem-estar — Viva Mais" },
      { property: "og:description", content: "Check-in periódico de bem-estar, privado e apenas seu." },
    ],
  }),
  component: BemEstar,
});

const queixas = [
  "Dor nas costas",
  "Dor no ombro ou cervical",
  "Estresse",
  "Ansiedade",
  "Cansaço excessivo",
  "Sono ruim",
  "Nenhuma",
];

function BemEstar() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const [humor, setHumor] = useState([3]);
  const [energia, setEnergia] = useState([3]);
  const [dor, setDor] = useState([0]);
  const [sono, setSono] = useState("7");
  const [queixa, setQueixa] = useState("Nenhuma");
  const [observacao, setObservacao] = useState("");

  const historico = useQuery({
    queryKey: ["checkins", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wellbeing_checkins")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const registrar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("wellbeing_checkins").insert({
        user_id: user!.id,
        humor: humor[0] ?? 3,
        energia: energia[0] ?? 3,
        dor: dor[0] ?? 0,
        sono_horas: Number(sono) || null,
        queixa: queixa === "Nenhuma" ? null : queixa,
        observacao: observacao.slice(0, 500) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Check-in registrado. Cuide-se bem!");
      setObservacao("");
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
      queryClient.invalidateQueries({ queryKey: ["ultimo-checkin"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const serie = [...(historico.data ?? [])]
    .reverse()
    .map((item) => ({ dia: formatDate(item.created_at).slice(0, 5), humor: item.humor, energia: item.energia }));

  return (
    <>
      <PageHeader
        eyebrow="Módulo 3"
        title="Saúde e bem-estar"
        description="Seus registros são privados. Gestores visualizam apenas números consolidados e não identificáveis."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Check-in de hoje</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Humor: {humor[0]}/5</Label>
              <Slider value={humor} onValueChange={setHumor} min={1} max={5} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Energia: {energia[0]}/5</Label>
              <Slider value={energia} onValueChange={setEnergia} min={1} max={5} step={1} />
            </div>
            <div className="space-y-2">
              <Label>Nível de dor: {dor[0]}/10</Label>
              <Slider value={dor} onValueChange={setDor} min={0} max={10} step={1} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="sono">Horas de sono</Label>
                <Input
                  id="sono"
                  type="number"
                  min={0}
                  max={16}
                  step="0.5"
                  value={sono}
                  onChange={(event) => setSono(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Principal queixa</Label>
                <Select value={queixa} onValueChange={setQueixa}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {queixas.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={observacao}
                onChange={(event) => setObservacao(event.target.value)}
                maxLength={500}
                placeholder="Como foi seu dia?"
              />
            </div>
            <Button className="w-full" onClick={() => registrar.mutate()} disabled={registrar.isPending}>
              Registrar check-in
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução recente</CardTitle>
            </CardHeader>
            <CardContent>
              {serie.length > 1 ? (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={serie}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="dia" fontSize={11} stroke="var(--muted-foreground)" />
                      <YAxis domain={[0, 5]} fontSize={11} stroke="var(--muted-foreground)" />
                      <Tooltip />
                      <Line type="monotone" dataKey="humor" stroke="var(--chart-1)" strokeWidth={2} />
                      <Line type="monotone" dataKey="energia" stroke="var(--chart-2)" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Registre alguns check-ins para visualizar sua evolução.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Histórico</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {historico.data?.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
              ) : null}
              {historico.data?.slice(0, 8).map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">{formatDate(item.created_at)}</span>
                  <span>
                    Humor {item.humor}/5 · Energia {item.energia}/5 · Dor {item.dor}/10
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
