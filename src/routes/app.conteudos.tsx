import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ExternalLink, FileText, Headphones, Newspaper, PlayCircle } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { temas, tiposConteudo } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/conteudos")({
  head: () => ({
    meta: [
      { title: "Informação e formação — Viva Mais" },
      {
        name: "description",
        content: "Biblioteca com vídeos, podcasts, cartilhas e notícias de saúde organizados por tema.",
      },
      { property: "og:title", content: "Informação e formação — Viva Mais" },
      { property: "og:description", content: "Conteúdos institucionais de saúde reunidos em um só lugar." },
    ],
  }),
  component: Conteudos,
});

const icones = {
  video: PlayCircle,
  podcast: Headphones,
  audio: Headphones,
  cartilha: FileText,
  noticia: Newspaper,
} as const;

function Conteudos() {
  const { user } = useSession();
  const [busca, setBusca] = useState("");
  const [tema, setTema] = useState("todos");
  const [tipo, setTipo] = useState("todos");

  const conteudos = useQuery({
    queryKey: ["conteudos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const lista = (conteudos.data ?? []).filter((item) => {
    const matchBusca = `${item.title} ${item.description ?? ""}`.toLowerCase().includes(busca.toLowerCase());
    return matchBusca && (tema === "todos" || item.tema === tema) && (tipo === "todos" || item.tipo === tipo);
  });

  async function abrir(contentId: string, url: string) {
    if (user?.id) {
      await supabase.from("content_views").insert({ content_id: contentId, user_id: user.id });
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <PageHeader
        eyebrow="Módulo 2"
        title="Informação e formação"
        description="Vídeos, podcasts, cartilhas e notícias publicados pela instituição, organizados por tema."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Input
          placeholder="Buscar conteúdo"
          value={busca}
          onChange={(event) => setBusca(event.target.value)}
          maxLength={120}
        />
        <Select value={tema} onValueChange={setTema}>
          <SelectTrigger>
            <SelectValue placeholder="Tema" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os temas</SelectItem>
            {Object.entries(temas).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={tipo} onValueChange={setTipo}>
          <SelectTrigger>
            <SelectValue placeholder="Formato" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os formatos</SelectItem>
            {Object.entries(tiposConteudo).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {lista.map((item) => {
          const Icon = icones[item.tipo as keyof typeof icones] ?? FileText;
          return (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <CardTitle className="text-base">{item.title}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {tiposConteudo[item.tipo]} · {temas[item.tema] ?? item.tema}
                      {item.duracao ? ` · ${item.duracao}` : ""}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{item.description}</p>
                <div className="flex items-center justify-between gap-2">
                  {item.fonte ? <Badge variant="outline">{item.fonte}</Badge> : <span />}
                  <Button size="sm" variant="secondary" onClick={() => abrir(item.id, item.url)}>
                    Acessar
                    <ExternalLink className="size-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {lista.length === 0 && !conteudos.isLoading ? (
        <p className="text-sm text-muted-foreground">Nenhum conteúdo encontrado com esses filtros.</p>
      ) : null}
    </>
  );
}
