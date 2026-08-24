export const temas: Record<string, string> = {
  "saude-fisica": "Saúde física",
  "saude-mental": "Saúde mental",
  alimentacao: "Alimentação",
  ergonomia: "Ergonomia",
  autocuidado: "Autocuidado",
  "atividade-fisica": "Atividade física",
  prevencao: "Prevenção de doenças",
  educacao: "Educação em saúde",
};

export const tiposConteudo: Record<string, string> = {
  video: "Vídeo",
  podcast: "Podcast",
  cartilha: "Cartilha",
  audio: "Áudio",
  noticia: "Notícia",
};

export const categoriasServico: Record<string, string> = {
  "bem-estar": "Bem-estar",
  "saude-integrativa": "Saúde integrativa",
  "atividade-fisica": "Atividade física",
  "saude-mental": "Saúde mental",
  ergonomia: "Ergonomia",
  vacinacao: "Vacinação",
};

export const statusLabels: Record<string, string> = {
  agendado: "Agendado",
  confirmado: "Confirmado",
  cancelado: "Cancelado",
  presente: "Presente",
  falta: "Falta",
};

export const kindLabels: Record<string, string> = {
  campanha: "Campanha",
  sipat: "SIPAT",
  desafio: "Desafio",
};

const dateTime = new Intl.DateTimeFormat("pt-BR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const dateOnly = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export const formatDateTime = (value: string) => dateTime.format(new Date(value));
export const formatDate = (value: string) => dateOnly.format(new Date(value));

export function toCsv(rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0] ?? {});
  const escape = (value: unknown) => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [headers.join(";"), ...rows.map((row) => headers.map((h) => escape(row[h])).join(";"))].join("\n");
}

export function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const blob = new Blob(["\uFEFF" + toCsv(rows)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
