import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarCheck,
  BookOpenText,
  HeartPulse,
  Trophy,
  BarChart3,
  Settings2,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

import heroImage from "@/assets/hero-viva-mais.jpg";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Viva Mais — Plataforma de saúde e qualidade de vida do trabalhador" },
      {
        name: "description",
        content:
          "Agende massagem, acupuntura, yoga e ginástica laboral, acesse conteúdos de saúde, registre seu bem-estar e acompanhe indicadores institucionais.",
      },
      { property: "og:title", content: "Viva Mais — Saúde e qualidade de vida do trabalhador" },
      {
        property: "og:description",
        content:
          "Uma plataforma única para agendamento de ações de saúde, formação, bem-estar, campanhas e indicadores de gestão.",
      },
    ],
  }),
  component: Landing,
});

const modulos = [
  {
    icon: CalendarCheck,
    titulo: "Agendamento",
    texto:
      "Serviços individuais e coletivos com vagas, local, responsável, confirmação, cancelamento e registro de presença.",
  },
  {
    icon: BookOpenText,
    titulo: "Informação e Formação",
    texto:
      "Biblioteca com vídeos, podcasts, cartilhas e notícias já publicados pela instituição, organizados por tema.",
  },
  {
    icon: HeartPulse,
    titulo: "Saúde e Bem-Estar",
    texto: "Check-in de humor, energia, dor e sono, com histórico individual e privado do trabalhador.",
  },
  {
    icon: Trophy,
    titulo: "Engajamento e Campanhas",
    texto: "SIPAT, Semana da Saúde, desafios, metas pessoais e pontuação por participação.",
  },
  {
    icon: BarChart3,
    titulo: "Painel de Indicadores",
    texto: "Adesão, comparecimento, faltas, cancelamentos e conteúdos mais acessados — sempre consolidados.",
  },
  {
    icon: Settings2,
    titulo: "Administração",
    texto: "Cadastro de serviços, horários, conteúdos, campanhas e perfis de acesso da plataforma.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-gradient-hero text-primary-foreground">
              <HeartPulse className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">Viva Mais</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link to="/auth">Entrar</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/auth" search={{ modo: "cadastro" }}>
                Criar conta
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:py-20">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-secondary-foreground">
              Saúde do trabalhador
            </p>
            <h1 className="mt-5 text-4xl font-semibold leading-tight text-balance-title sm:text-5xl">
              Cuidado, informação e gestão em uma só plataforma
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              O Viva Mais reúne o agendamento das ações de saúde e bem-estar, os conteúdos formativos da
              instituição, o acompanhamento de bem-estar dos trabalhadores e os indicadores de adesão para apoio
              à gestão.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth" search={{ modo: "cadastro" }}>
                  Começar agora
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Já tenho acesso</Link>
              </Button>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="size-4 text-primary" />
              Dados individuais de saúde protegidos: gestores acessam apenas números consolidados (LGPD).
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl shadow-lift">
            <img
              src={heroImage}
              alt="Trabalhadores fazendo uma pausa ativa com alongamentos no ambiente de trabalho"
              width={1600}
              height={1104}
              className="h-full w-full object-cover"
            />
          </div>
        </section>

        <section className="border-t border-border bg-gradient-soft py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-2xl font-semibold sm:text-3xl">Os seis módulos da plataforma</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Estrutura funcional definida no Termo de Abertura do Projeto, com foco no agendamento e no painel
              de indicadores.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {modulos.map((modulo) => (
                <article key={modulo.titulo} className="rounded-2xl bg-card p-6 shadow-soft">
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                    <modulo.icon className="size-5" />
                  </span>
                  <h3 className="mt-4 text-lg font-semibold">{modulo.titulo}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{modulo.texto}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16">
          <div className="rounded-3xl bg-gradient-hero px-6 py-12 text-center text-primary-foreground sm:px-12">
            <h2 className="text-2xl font-semibold sm:text-3xl">Pronto para agendar seu cuidado?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm opacity-90">
              Acesse pelo navegador, no celular ou no computador. Sem instalação de aplicativo.
            </p>
            <Button asChild size="lg" variant="secondary" className="mt-7">
              <Link to="/auth" search={{ modo: "cadastro" }}>
                Criar minha conta
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-xs text-muted-foreground">
          Viva Mais — Projeto de promoção da saúde e qualidade de vida do trabalhador.
        </div>
      </footer>
    </div>
  );
}
