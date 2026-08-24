import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/lib/auth";
import { downloadCsv } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/indicadores")({
  head: () => ({
    meta: [
      { title: "Painel de indicadores — Viva Mais" },
      {
        name: "description",
        content: "Adesão, comparecimento, faltas, cancelamentos e conteúdos mais acessados, sempre consolidados.",
      },
      { property: "og:title", content: "Painel de indicadores — Viva Mais" },
      { property: "og:description", content: "Indicadores gerenciais de saúde do trabalhador." },
    ],
  }),
  component: Indicadores,
});

type Indicadores = {
  usuarios_cadastrados: number;
  usuarios_ativos: number;
  agendamentos: number;
  presencas: number;
  faltas: number;
  cancelamentos: number;
  checkins: number;
  humor_medio: number | null;
  conteudos_acessos: number;
  por_servico: Array<{ servico: string; total: number; presentes: number; faltas: number; cancelados: number }>;
  por_setor: Array<{ setor: string; total: number }>;
  conteudos_top: Array<{ titulo: string; acessos: number }>;
  queixas: Array<{ queixa: string; total: number }>;
  serie_agendamentos: Array<{ dia: string; total: number }>;
};

const cores = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function Indicadores() {
  const { user } = useSession();
  const { data: roles = [], isLoading: rolesLoading } = useRoles(user?.id);
  const [periodo, setPeriodo] = useState("90");

  const autorizado = roles.includes("gestor") || roles.includes("admin");

  const dados = useQuery({
    queryKey: ["indicadores", periodo],
    enabled: autorizado,
    queryFn: async () => {
      const desde = new Date();
      desde.setDate(desde.getDate() - Number(periodo));
      const { data, error } = await supabase.rpc("indicadores_gerais", {
        _desde: desde.toISOString().slice(0, 10),
      });
      if (error) throw error;
      return data as unknown as Indicadores;
    },
  });

  if (rolesLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!autorizado) {
    return (
      <PageHeader
        eyebrow="Módulo 5"
        title="Painel de indicadores"
        description="Acesso restrito a gestores e administradores da plataforma."
      />
    );
  }

  const d = dados.data;
  const taxaPresenca = d && d.agendamentos > 0 ? Math.round((d.presencas / d.agendamentos) * 100) : 0;
  const taxaFalta = d && d.agendamentos > 0 ? Math.round((d.faltas / d.agendamentos) * 100) : 0;

  const cards = [
    { label: "Usuários cadastrados", value: d?.usuarios_cadastrados ?? 0 },
    { label: "Usuários ativos", value: d?.usuarios_ativos ?? 0 },
    { label: "Agendamentos", value: d?.agendamentos ?? 0 },
    { label: "Taxa de comparecimento", value: `${taxaPresenca}%` },
    { label: "Taxa de ausência", value: `${taxaFalta}%` },
    { label: "Cancelamentos", value: d?.cancelamentos ?? 0 },
    { label: "Check-ins de bem-estar", value: d?.checkins ?? 0 },
    { label: "Humor médio", value: d?.humor_medio ? `${d.humor_medio}/5` : "—" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Módulo 5"
        title="Painel de indicadores"
        description="Dados consolidados e não identificáveis, conforme as regras de privacidade do projeto."
        action={
          <div className="flex gap-2">
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Últimos 12 meses</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() =>
                downloadCsv(
                  `viva-mais-indicadores-${periodo}d.csv`,
                  (d?.por_servico ?? []).map((row) => ({
                    Servico: row.servico,
                    Agendamentos: row.total,
                    Presentes: row.presentes,
                    Faltas: row.faltas,
                    Cancelados: row.cancelados,
                  })),
                )
              }
            >
              <Download className="size-4" />
              Exportar
            </Button>
          </div>
        }
      />

      {dados.isLoading ? <p className="text-sm text-muted-foreground">Calculando indicadores…</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="py-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <p className="mt-2 font-display text-2xl font-semibold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Atividades mais procuradas</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {d?.por_servico?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={d.por_servico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="servico" fontSize={10} stroke="var(--muted-foreground)" interval={0} angle={-15} textAnchor="end" height={60} />
                  <YAxis fontSize={11} stroke="var(--muted-foreground)" allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="presentes" name="Presenças" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="faltas" name="Faltas" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="cancelados" name="Cancelados" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Sem agendamentos no período.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adesão por setor</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            {d?.por_setor?.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={d.por_setor} dataKey="total" nameKey="setor" outerRadius={90} label>
                    {d.por_setor.map((entry, index) => (
                      <Cell key={entry.setor} fill={cores[index % cores.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">Sem dados por setor no período.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Conteúdos mais acessados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {d?.conteudos_top?.length ? (
              d.conteudos_top.map((item) => (
                <div key={item.titulo} className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate">{item.titulo}</span>
                  <span className="font-medium">{item.acessos}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum acesso registrado no período.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Principais queixas relatadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="mb-2 text-xs text-muted-foreground">
              Consolidado e não identificável — nenhum registro individual é exibido.
            </p>
            {d?.queixas?.length ? (
              d.queixas.map((item) => (
                <div key={item.queixa} className="flex items-center justify-between gap-3 text-sm">
                  <span>{item.queixa}</span>
                  <span className="font-medium">{item.total}</span>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma queixa registrada no período.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
