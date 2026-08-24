import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/app/bem-estar")({
  head: () => ({
    meta: [
      { title: "Atendimentos — Viva Mais" },
      { name: "description", content: "Área do prestador para gerenciar e ofertar atividades de saúde." },
    ],
  }),
  component: Atendimentos,
});

function Atendimentos() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [vagas, setVagas] = useState("");
  const [dataHora, setDataHora] = useState("");

  // Busca as atividades já cadastradas para listar do lado direito
  const historico = useQuery({
    queryKey: ["atividades"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("atividades")
        .select("*")
        .order("data_hora", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  // Função para salvar a atividade no Supabase usando React Query
  const cadastrar = useMutation({
    mutationFn: async () => {
      // Pega qualquer perfil existente para preencher a foreign key (apenas para testes locais/MVP)
      const { data: perfis } = await supabase.from("perfil_usuario").select("id").limit(1);
      
      let prestadorId = null;
      if (perfis && perfis.length > 0) {
        prestadorId = perfis[0].id;
      } else {
        throw new Error("Cadastre um 'perfil_usuario' no Supabase antes de criar atividades.");
      }

      const { error } = await supabase.from("atividades").insert({
        titulo,
        descricao,
        vagas_totais: Number(vagas),
        data_hora: new Date(dataHora).toISOString(),
        prestador_id: prestadorId,
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atividade cadastrada com sucesso!");
      setTitulo("");
      setDescricao("");
      setVagas("");
      setDataHora("");
      queryClient.invalidateQueries({ queryKey: ["atividades"] }); // Atualiza a lista na hora
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="Módulo do Prestador"
        title="Meus Atendimentos"
        description="Cadastre as sessões de massagem, yoga ou outros serviços que você vai ofertar aos servidores."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Lado Esquerdo: Formulário */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova Atividade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título da Atividade</Label>
              <Input
                id="titulo"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Massagem Relaxante"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Detalhes sobre a sessão, local, o que levar..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vagas">Vagas Totais</Label>
                <Input
                  id="vagas"
                  type="number"
                  min={1}
                  value={vagas}
                  onChange={(e) => setVagas(e.target.value)}
                  placeholder="Ex: 10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dataHora">Data e Hora</Label>
                <Input
                  id="dataHora"
                  type="datetime-local"
                  value={dataHora}
                  onChange={(e) => setDataHora(e.target.value)}
                />
              </div>
            </div>

            <Button 
              className="w-full" 
              onClick={() => cadastrar.mutate()} 
              disabled={cadastrar.isPending || !titulo || !vagas || !dataHora}
            >
              {cadastrar.isPending ? "Salvando..." : "Cadastrar Atividade"}
            </Button>
          </CardContent>
        </Card>

        {/* Lado Direito: Lista de Atividades */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Próximas Atividades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {historico.isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
              {historico.data?.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma atividade cadastrada ainda.</p>
              )}
              {historico.data?.map((item) => (
                <div key={item.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 text-sm">
                  <span className="font-medium text-lg">{item.titulo}</span>
                  <span className="text-muted-foreground">
                    📅 {new Date(item.data_hora).toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground">
                    👥 {item.vagas_totais} vagas disponíveis
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
