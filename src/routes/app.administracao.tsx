import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/lib/auth";
import { categoriasServico, formatDateTime, kindLabels, temas, tiposConteudo } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/app/administracao")({
  head: () => ({
    meta: [
      { title: "Administração — Viva Mais" },
      {
        name: "description",
        content: "Cadastro de atividades, horários, conteúdos e campanhas da plataforma Viva Mais.",
      },
      { property: "og:title", content: "Administração — Viva Mais" },
      { property: "og:description", content: "Gestão de serviços, agenda, biblioteca e campanhas internas." },
    ],
  }),
  component: Administracao,
});

function Administracao() {
  const { user } = useSession();
  const { data: roles = [], isLoading } = useRoles(user?.id);
  const queryClient = useQueryClient();
  const admin = roles.includes("admin");

  const [servico, setServico] = useState({
    name: "",
    description: "",
    categoria: "bem-estar",
    modality: "individual",
    default_capacity: "1",
    duration_min: "30",
    local: "",
  });
  const [slot, setSlot] = useState({ service_id: "", starts_at: "", capacity: "1", local: "" });
  const [conteudo, setConteudo] = useState({
    title: "",
    description: "",
    tipo: "video",
    tema: "saude-fisica",
    url: "",
    fonte: "",
    duracao: "",
  });
  const [campanha, setCampanha] = useState({
    title: "",
    description: "",
    kind: "campanha",
    starts_on: "",
    ends_on: "",
    pontos: "10",
  });

  const servicos = useQuery({
    queryKey: ["admin-servicos"],
    enabled: admin,
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const slots = useQuery({
    queryKey: ["admin-slots"],
    enabled: admin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("service_slots")
        .select("id, starts_at, capacity, local, cancelled, services(name)")
        .gte("starts_at", new Date().toISOString())
        .order("starts_at")
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

  const conteudos = useQuery({
    queryKey: ["admin-conteudos"],
    enabled: admin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const campanhas = useQuery({
    queryKey: ["admin-campanhas"],
    enabled: admin,
    queryFn: async () => {
      const { data, error } = await supabase.from("campaigns").select("*").order("starts_on", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  function invalidate(...keys: string[]) {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  const criarServico = useMutation({
    mutationFn: async () => {
      if (servico.name.trim().length < 3) throw new Error("Informe o nome da atividade");
      const { error } = await supabase.from("services").insert({
        name: servico.name.trim().slice(0, 120),
        description: servico.description.trim().slice(0, 500) || null,
        categoria: servico.categoria,
        modality: servico.modality as "individual" | "coletiva",
        default_capacity: Math.max(Number(servico.default_capacity) || 1, 1),
        duration_min: Math.max(Number(servico.duration_min) || 30, 5),
        local: servico.local.trim().slice(0, 120) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atividade cadastrada.");
      setServico({ ...servico, name: "", description: "", local: "" });
      invalidate("admin-servicos", "servicos");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const criarSlot = useMutation({
    mutationFn: async () => {
      if (!slot.service_id) throw new Error("Escolha a atividade");
      if (!slot.starts_at) throw new Error("Informe data e hora");
      const base = servicos.data?.find((s) => s.id === slot.service_id);
      const starts = new Date(slot.starts_at);
      const ends = new Date(starts.getTime() + (base?.duration_min ?? 30) * 60000);
      const { error } = await supabase.from("service_slots").insert({
        service_id: slot.service_id,
        provider_id: base?.provider_id ?? user!.id,
        starts_at: starts.toISOString(),
        ends_at: ends.toISOString(),
        capacity: Math.max(Number(slot.capacity) || base?.default_capacity || 1, 1),
        local: slot.local.trim().slice(0, 120) || base?.local || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horário publicado na agenda.");
      setSlot({ ...slot, starts_at: "", local: "" });
      invalidate("admin-slots", "slots-disponiveis");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const cancelarSlot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("service_slots").update({ cancelled: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Horário cancelado.");
      invalidate("admin-slots", "slots-disponiveis");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const criarConteudo = useMutation({
    mutationFn: async () => {
      if (conteudo.title.trim().length < 3) throw new Error("Informe o título");
      if (!/^https?:\/\//i.test(conteudo.url.trim())) throw new Error("Informe uma URL válida (http/https)");
      const { error } = await supabase.from("contents").insert({
        title: conteudo.title.trim().slice(0, 160),
        description: conteudo.description.trim().slice(0, 500) || null,
        tipo: conteudo.tipo as "video" | "podcast" | "cartilha" | "audio" | "noticia",
        tema: conteudo.tema,
        url: conteudo.url.trim().slice(0, 500),
        fonte: conteudo.fonte.trim().slice(0, 80) || null,
        duracao: conteudo.duracao.trim().slice(0, 30) || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conteúdo publicado.");
      setConteudo({ ...conteudo, title: "", description: "", url: "", duracao: "" });
      invalidate("admin-conteudos", "conteudos");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const alternarConteudo = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("contents").update({ published: !published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate("admin-conteudos", "conteudos"),
  });

  const criarCampanha = useMutation({
    mutationFn: async () => {
      if (campanha.title.trim().length < 3) throw new Error("Informe o título da campanha");
      const { error } = await supabase.from("campaigns").insert({
        title: campanha.title.trim().slice(0, 160),
        description: campanha.description.trim().slice(0, 600) || null,
        kind: campanha.kind as "campanha" | "sipat" | "desafio",
        starts_on: campanha.starts_on || new Date().toISOString().slice(0, 10),
        ends_on: campanha.ends_on || null,
        pontos: Math.max(Number(campanha.pontos) || 10, 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Campanha criada.");
      setCampanha({ ...campanha, title: "", description: "", starts_on: "", ends_on: "" });
      invalidate("admin-campanhas", "campanhas");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;

  if (!admin) {
    return (
      <PageHeader
        eyebrow="Módulo 6"
        title="Administração"
        description="Área restrita aos administradores da plataforma."
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Módulo 6"
        title="Administração da plataforma"
        description="Cadastre atividades, publique horários na agenda, organize a biblioteca e crie campanhas internas."
      />

      <Tabs defaultValue="servicos">
        <TabsList className="flex-wrap">
          <TabsTrigger value="servicos">Atividades</TabsTrigger>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="conteudos">Conteúdos</TabsTrigger>
          <TabsTrigger value="campanhas">Campanhas</TabsTrigger>
        </TabsList>

        <TabsContent value="servicos" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova atividade</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sname">Nome</Label>
                <Input
                  id="sname"
                  maxLength={120}
                  placeholder="Massagem relaxante, Yoga, Acupuntura…"
                  value={servico.name}
                  onChange={(e) => setServico({ ...servico, name: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sdesc">Descrição</Label>
                <Textarea
                  id="sdesc"
                  maxLength={500}
                  value={servico.description}
                  onChange={(e) => setServico({ ...servico, description: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={servico.categoria} onValueChange={(v) => setServico({ ...servico, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoriasServico).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Modalidade</Label>
                <Select
                  value={servico.modality}
                  onValueChange={(v) =>
                    setServico({ ...servico, modality: v, default_capacity: v === "individual" ? "1" : "5" })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="coletiva">Coletiva</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scap">Vagas por horário</Label>
                <Input
                  id="scap"
                  type="number"
                  min={1}
                  value={servico.default_capacity}
                  onChange={(e) => setServico({ ...servico, default_capacity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sdur">Duração (min)</Label>
                <Input
                  id="sdur"
                  type="number"
                  min={5}
                  step={5}
                  value={servico.duration_min}
                  onChange={(e) => setServico({ ...servico, duration_min: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="sloc">Local padrão</Label>
                <Input
                  id="sloc"
                  maxLength={120}
                  value={servico.local}
                  onChange={(e) => setServico({ ...servico, local: e.target.value })}
                />
              </div>
              <Button
                className="sm:col-span-2"
                onClick={() => criarServico.mutate()}
                disabled={criarServico.isPending}
              >
                <Plus className="size-4" />
                Cadastrar atividade
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {servicos.data?.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {categoriasServico[item.categoria] ?? item.categoria} ·{" "}
                      {item.modality === "individual" ? "Individual" : `Coletiva (${item.default_capacity} vagas)`} ·{" "}
                      {item.duration_min} min
                    </p>
                  </div>
                  <Badge variant={item.active ? "secondary" : "outline"}>
                    {item.active ? "Ativa" : "Inativa"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="agenda" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Publicar horário</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Atividade</Label>
                <Select value={slot.service_id} onValueChange={(v) => setSlot({ ...slot, service_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicos.data?.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="starts">Data e hora</Label>
                <Input
                  id="starts"
                  type="datetime-local"
                  value={slot.starts_at}
                  onChange={(e) => setSlot({ ...slot, starts_at: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cap">Vagas</Label>
                <Input
                  id="cap"
                  type="number"
                  min={1}
                  value={slot.capacity}
                  onChange={(e) => setSlot({ ...slot, capacity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sloc2">Local</Label>
                <Input
                  id="sloc2"
                  maxLength={120}
                  value={slot.local}
                  onChange={(e) => setSlot({ ...slot, local: e.target.value })}
                />
              </div>
              <Button className="sm:col-span-2" onClick={() => criarSlot.mutate()} disabled={criarSlot.isPending}>
                <Plus className="size-4" />
                Publicar na agenda
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {slots.data?.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{item.services?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(item.starts_at)} · {item.capacity} vagas
                      {item.local ? ` · ${item.local}` : ""}
                    </p>
                  </div>
                  {item.cancelled ? (
                    <Badge variant="outline">Cancelado</Badge>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => cancelarSlot.mutate(item.id)}>
                      <Trash2 className="size-4" />
                      Cancelar
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="conteudos" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Novo conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="ctitle">Título</Label>
                <Input
                  id="ctitle"
                  maxLength={160}
                  value={conteudo.title}
                  onChange={(e) => setConteudo({ ...conteudo, title: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="curl">Link externo (YouTube, podcast, cartilha, notícia)</Label>
                <Input
                  id="curl"
                  type="url"
                  maxLength={500}
                  placeholder="https://"
                  value={conteudo.url}
                  onChange={(e) => setConteudo({ ...conteudo, url: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Formato</Label>
                <Select value={conteudo.tipo} onValueChange={(v) => setConteudo({ ...conteudo, tipo: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(tiposConteudo).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tema</Label>
                <Select value={conteudo.tema} onValueChange={(v) => setConteudo({ ...conteudo, tema: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(temas).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="cfonte">Fonte</Label>
                <Input
                  id="cfonte"
                  maxLength={80}
                  value={conteudo.fonte}
                  onChange={(e) => setConteudo({ ...conteudo, fonte: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cdur">Duração</Label>
                <Input
                  id="cdur"
                  maxLength={30}
                  placeholder="12 min"
                  value={conteudo.duracao}
                  onChange={(e) => setConteudo({ ...conteudo, duracao: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cdesc">Descrição</Label>
                <Textarea
                  id="cdesc"
                  maxLength={500}
                  value={conteudo.description}
                  onChange={(e) => setConteudo({ ...conteudo, description: e.target.value })}
                />
              </div>
              <Button
                className="sm:col-span-2"
                onClick={() => criarConteudo.mutate()}
                disabled={criarConteudo.isPending}
              >
                <Plus className="size-4" />
                Publicar conteúdo
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {conteudos.data?.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {tiposConteudo[item.tipo]} · {temas[item.tema] ?? item.tema}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => alternarConteudo.mutate({ id: item.id, published: item.published })}
                  >
                    {item.published ? "Despublicar" : "Publicar"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="campanhas" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nova campanha (SIPAT, desafio, semana temática)</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="camtitle">Título</Label>
                <Input
                  id="camtitle"
                  maxLength={160}
                  value={campanha.title}
                  onChange={(e) => setCampanha({ ...campanha, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={campanha.kind} onValueChange={(v) => setCampanha({ ...campanha, kind: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(kindLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="campontos">Pontos</Label>
                <Input
                  id="campontos"
                  type="number"
                  min={0}
                  value={campanha.pontos}
                  onChange={(e) => setCampanha({ ...campanha, pontos: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camini">Início</Label>
                <Input
                  id="camini"
                  type="date"
                  value={campanha.starts_on}
                  onChange={(e) => setCampanha({ ...campanha, starts_on: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="camfim">Fim</Label>
                <Input
                  id="camfim"
                  type="date"
                  value={campanha.ends_on}
                  onChange={(e) => setCampanha({ ...campanha, ends_on: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="camdesc">Descrição</Label>
                <Textarea
                  id="camdesc"
                  maxLength={600}
                  value={campanha.description}
                  onChange={(e) => setCampanha({ ...campanha, description: e.target.value })}
                />
              </div>
              <Button
                className="sm:col-span-2"
                onClick={() => criarCampanha.mutate()}
                disabled={criarCampanha.isPending}
              >
                <Plus className="size-4" />
                Criar campanha
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {campanhas.data?.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {kindLabels[item.kind]} · {item.pontos} pontos
                    </p>
                  </div>
                  <Badge variant={item.active ? "secondary" : "outline"}>
                    {item.active ? "Ativa" : "Encerrada"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}
