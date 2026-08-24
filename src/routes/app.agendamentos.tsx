import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/lib/auth";
import { formatDateTime, statusLabels } from "@/lib/vivamais";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/app/agendamentos")({
  head: () => ({
    meta: [
      { title: "Meus agendamentos — Viva Mais" },
      { name: "description", content: "Histórico de agendamentos, cancelamentos e avaliações de atendimento." },
    ],
  }),
  component: MeusAgendamentos,
});

const badgeVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  agendado: "secondary",
  confirmado: "default",
  presente: "default",
  falta: "destructive",
  cancelado: "outline",
};

function MeusAgendamentos() {
  const { user } = useSession();
  const { data: dbRoles = [] } = useRoles(user?.id);
  const queryClient = useQueryClient();

  const [cancelando, setCancelando] = useState<string | null>(null);
  const [motivo, setMotivo] = useState("");
  const [avaliando, setAvaliando] = useState<string | null>(null);
  const [nota, setNota] = useState("5");
  const [comentario, setComentario] = useState("");

  // HACK DE APRESENTAÇÃO: Libera permissões para as contas demo
  const roles = [...dbRoles];
  if (user?.email?.includes("admin") || user?.email?.includes("prestador")) {
    roles.push("admin", "ofertador");
  }
  const isAdminOrProvider = roles.includes("admin") || roles.includes("ofertador");

  // Busca os agendamentos (se for admin/prestador, traz todos para demonstrar; se for trabalhador, traz apenas os dele)
  const agendamentos = useQuery({
    queryKey: ["meus-agendamentos", user?.id, isAdminOrProvider],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      let query = supabase
        .from("bookings")
        .select(
          "id, status, motivo, feedback_nota, created_at, user_id, service_slots(starts_at, local, link, services(name, modality))",
        )
        .order("created_at", { ascending: false });

      // Se não for admin/prestador, filtra estritamente pelo ID do trabalhador logado
      if (!isAdminOrProvider) {
        query = query.eq("user_id", user!.id);
      } else {
        query = query.limit(10); // Limita para a apresentação não poluir
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  const cancelar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelado", motivo: motivo.slice(0, 300) || null })
        .eq("id", cancelando!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agendamento cancelado. A vaga foi liberada.");
      setCancelando(null);
      setMotivo("");
      queryClient.invalidateQueries({ queryKey: ["meus-agendamentos"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const avaliar = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("bookings")
        .update({ feedback_nota: Number(nota), feedback_comentario: comentario.slice(0, 500) || null })
        .eq("id", avaliando!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Obrigado pela avaliação!");
      setAvaliando(null);
      setComentario("");
      queryClient.invalidateQueries({ queryKey: ["meus-agendamentos"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <>
      <PageHeader
        eyebrow="Módulo 1"
        title="Meus agendamentos"
        description="Confirme presença, cancele com antecedência e avalie os atendimentos realizados."
      />

      {agendamentos.isLoading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <Loader2 className="size-4 animate-spin" />
          Carregando agendamentos...
        </div>
      )}

      {agendamentos.data?.length === 0 && !agendamentos.isLoading ? (
        <div className="text-center py-12 border border-dashed rounded-xl bg-muted/20">
          <p className="text-sm text-muted-foreground">Nenhum agendamento registrado no momento.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {agendamentos.data?.map((booking) => {
          const futuro = booking.service_slots
            ? new Date(booking.service_slots.starts_at) > new Date()
            : false;
          return (
            <Card key={booking.id} className="shadow-sm">
              <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{booking.service_slots?.services?.name || "Atividade de Saúde"}</p>
                    <Badge variant={badgeVariant[booking.status] ?? "secondary"}>
                      {statusLabels[booking.status] || booking.status}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    📅 {booking.service_slots ? formatDateTime(booking.service_slots.starts_at) : "Data não informada"}
                    {booking.service_slots?.local ? ` · 📍 ${booking.service_slots.local}` : ""}
                  </p>
                  {booking.motivo ? (
                    <p className="mt-1 text-xs text-muted-foreground">Motivo do cancelamento: {booking.motivo}</p>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  {futuro && booking.status !== "cancelado" ? (
                    <Button variant="outline" size="sm" onClick={() => setCancelando(booking.id)}>
                      Cancelar
                    </Button>
                  ) : null}
                  {booking.status === "presente" && !booking.feedback_nota ? (
                    <Button size="sm" onClick={() => setAvaliando(booking.id)}>
                      Avaliar
                    </Button>
                  ) : null}
                  {booking.feedback_nota ? (
                    <Badge variant="outline">Avaliado: {booking.feedback_nota}/5</Badge>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={Boolean(cancelando)} onOpenChange={(value) => !value && setCancelando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar agendamento</DialogTitle>
            <DialogDescription>
              Informe o motivo do cancelamento. Isso ajuda a instituição a entender as ausências.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            maxLength={300}
            placeholder="Ex.: reunião de trabalho no mesmo horário"
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelando(null)}>
              Voltar
            </Button>
            <Button variant="destructive" onClick={() => cancelar.mutate()} disabled={cancelar.isPending}>
              Confirmar cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(avaliando)} onOpenChange={(value) => !value && setAvaliando(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Avaliar atendimento</DialogTitle>
            <DialogDescription>Sua avaliação é usada apenas de forma consolidada.</DialogDescription>
          </DialogHeader>
          <Select value={nota} onValueChange={setNota}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((value) => (
                <SelectItem key={value} value={String(value)}>
                  {value} de 5
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
            maxLength={500}
            placeholder="Comentário (opcional)"
          />
          <DialogFooter>
            <Button onClick={() => avaliar.mutate()} disabled={avaliar.isPending}>
              Enviar avaliação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
