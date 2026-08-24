import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useProfile, useRoles, useSession, roleLabels } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/app/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Viva Mais" },
      { name: "description", content: "Atualize seus dados de cadastro, setor e unidade de trabalho." },
      { property: "og:title", content: "Meu perfil — Viva Mais" },
      { property: "og:description", content: "Dados cadastrais do trabalhador na plataforma Viva Mais." },
    ],
  }),
  component: Perfil,
});

function Perfil() {
  const { user } = useSession();
  const { data: profile } = useProfile(user?.id);
  const { data: roles = [] } = useRoles(user?.id);
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ full_name: "", setor: "", unidade: "", telefone: "" });

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name ?? "",
        setor: profile.setor ?? "",
        unidade: profile.unidade ?? "",
        telefone: profile.telefone ?? "",
      });
    }
  }, [profile]);

  const salvar = useMutation({
    mutationFn: async () => {
      if (form.full_name.trim().length < 3) throw new Error("Informe seu nome completo");
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name.trim().slice(0, 120),
          setor: form.setor.trim().slice(0, 80) || null,
          unidade: form.unidade.trim().slice(0, 80) || null,
          telefone: form.telefone.trim().slice(0, 20) || null,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        title="Meu perfil"
        description="Esses dados ajudam a organizar a agenda e os indicadores por setor e unidade."
        action={
          <div className="flex flex-wrap gap-2">
            {(roles.length ? roles : ["trabalhador"]).map((role) => (
              <Badge key={role} variant="secondary">
                {roleLabels[role as keyof typeof roleLabels] ?? role}
              </Badge>
            ))}
          </div>
        }
      />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Dados cadastrais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome completo</Label>
            <Input
              id="nome"
              maxLength={120}
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" value={user?.email ?? ""} readOnly disabled />
            <p className="text-xs text-muted-foreground">
              As notificações da plataforma são enviadas para este e-mail.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="setor">Setor</Label>
              <Input
                id="setor"
                maxLength={80}
                value={form.setor}
                onChange={(e) => setForm({ ...form, setor: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unidade">Unidade</Label>
              <Input
                id="unidade"
                maxLength={80}
                value={form.unidade}
                onChange={(e) => setForm({ ...form, unidade: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone</Label>
            <Input
              id="telefone"
              maxLength={20}
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: e.target.value })}
            />
          </div>
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            Salvar alterações
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
