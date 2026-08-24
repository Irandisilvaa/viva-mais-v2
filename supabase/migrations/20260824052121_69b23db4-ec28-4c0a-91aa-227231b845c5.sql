-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','gestor','ofertador','trabalhador');
CREATE TYPE public.service_modality AS ENUM ('individual','coletiva');
CREATE TYPE public.booking_status AS ENUM ('agendado','confirmado','cancelado','presente','falta');
CREATE TYPE public.content_type AS ENUM ('video','podcast','cartilha','audio','noticia');
CREATE TYPE public.campaign_kind AS ENUM ('campanha','sipat','desafio');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  setor TEXT,
  unidade TEXT,
  telefone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'ofertador'));
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "user_roles_select_own" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "user_roles_self_worker" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND role = 'trabalhador');
CREATE POLICY "user_roles_admin_insert" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SERVICES
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  categoria TEXT NOT NULL DEFAULT 'bem-estar',
  modality public.service_modality NOT NULL DEFAULT 'individual',
  default_capacity INTEGER NOT NULL DEFAULT 1,
  duration_min INTEGER NOT NULL DEFAULT 30,
  local TEXT,
  provider_id UUID REFERENCES auth.users ON DELETE SET NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_read" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_manage" ON public.services FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR provider_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR provider_id = auth.uid());
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SLOTS
CREATE TABLE public.service_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services ON DELETE CASCADE,
  provider_id UUID REFERENCES auth.users ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  local TEXT,
  link TEXT,
  cancelled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_slots TO authenticated;
GRANT ALL ON public.service_slots TO service_role;
ALTER TABLE public.service_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "slots_read" ON public.service_slots FOR SELECT TO authenticated USING (true);
CREATE POLICY "slots_manage" ON public.service_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR provider_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(),'admin') OR provider_id = auth.uid());
CREATE TRIGGER slots_updated_at BEFORE UPDATE ON public.service_slots
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BOOKINGS
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id UUID NOT NULL REFERENCES public.service_slots ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  status public.booking_status NOT NULL DEFAULT 'agendado',
  motivo TEXT,
  feedback_nota INTEGER,
  feedback_comentario TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (slot_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookings TO authenticated;
GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bookings_select" ON public.bookings FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.service_slots s WHERE s.id = slot_id AND s.provider_id = auth.uid())
  );
CREATE POLICY "bookings_insert_own" ON public.bookings FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "bookings_update" ON public.bookings FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.service_slots s WHERE s.id = slot_id AND s.provider_id = auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR EXISTS (SELECT 1 FROM public.service_slots s WHERE s.id = slot_id AND s.provider_id = auth.uid())
  );
CREATE POLICY "bookings_delete_own" ON public.bookings FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.check_slot_capacity()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cap INTEGER; v_count INTEGER; v_start TIMESTAMPTZ; v_cancelled BOOLEAN;
BEGIN
  SELECT capacity, starts_at, cancelled INTO v_cap, v_start, v_cancelled
  FROM public.service_slots WHERE id = NEW.slot_id;
  IF v_cancelled THEN RAISE EXCEPTION 'Horário cancelado'; END IF;
  IF v_start < now() THEN RAISE EXCEPTION 'Horário já ocorreu'; END IF;
  SELECT count(*) INTO v_count FROM public.bookings
    WHERE slot_id = NEW.slot_id AND status <> 'cancelado';
  IF v_count >= v_cap THEN RAISE EXCEPTION 'Sem vagas disponíveis'; END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER bookings_capacity BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.check_slot_capacity();

-- CONTENTS
CREATE TABLE public.contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  tipo public.content_type NOT NULL DEFAULT 'video',
  tema TEXT NOT NULL DEFAULT 'saude-fisica',
  url TEXT NOT NULL,
  fonte TEXT,
  duracao TEXT,
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contents TO authenticated;
GRANT ALL ON public.contents TO service_role;
ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contents_read" ON public.contents FOR SELECT TO authenticated
  USING (published OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "contents_manage" ON public.contents FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER contents_updated_at BEFORE UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.content_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.contents ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.content_views TO authenticated;
GRANT ALL ON public.content_views TO service_role;
ALTER TABLE public.content_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "views_own" ON public.content_views FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "views_insert_own" ON public.content_views FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- WELLBEING
CREATE TABLE public.wellbeing_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  humor INTEGER NOT NULL,
  energia INTEGER NOT NULL,
  dor INTEGER NOT NULL DEFAULT 0,
  sono_horas NUMERIC(3,1),
  queixa TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wellbeing_checkins TO authenticated;
GRANT ALL ON public.wellbeing_checkins TO service_role;
ALTER TABLE public.wellbeing_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "checkins_own" ON public.wellbeing_checkins FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- CAMPAIGNS
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  kind public.campaign_kind NOT NULL DEFAULT 'campanha',
  starts_on DATE NOT NULL DEFAULT CURRENT_DATE,
  ends_on DATE,
  pontos INTEGER NOT NULL DEFAULT 10,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns_read" ON public.campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaigns_manage" ON public.campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.campaign_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  pontos INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_participations TO authenticated;
GRANT ALL ON public.campaign_participations TO service_role;
ALTER TABLE public.campaign_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "participations_own" ON public.campaign_participations FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- GOALS
CREATE TABLE public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL,
  unidade TEXT NOT NULL DEFAULT 'vezes',
  alvo INTEGER NOT NULL DEFAULT 1,
  progresso INTEGER NOT NULL DEFAULT 0,
  prazo DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "goals_own" ON public.goals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INDICADORES CONSOLIDADOS (sem dados individuais)
CREATE OR REPLACE FUNCTION public.indicadores_gerais(_desde DATE DEFAULT (CURRENT_DATE - 90))
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE result JSONB;
BEGIN
  IF NOT (public.has_role(auth.uid(),'gestor') OR public.has_role(auth.uid(),'admin')) THEN
    RAISE EXCEPTION 'Acesso restrito a gestores';
  END IF;
  SELECT jsonb_build_object(
    'usuarios_cadastrados', (SELECT count(*) FROM public.profiles),
    'usuarios_ativos', (SELECT count(DISTINCT user_id) FROM public.bookings WHERE created_at::date >= _desde),
    'agendamentos', (SELECT count(*) FROM public.bookings b JOIN public.service_slots s ON s.id=b.slot_id WHERE s.starts_at::date >= _desde),
    'presencas', (SELECT count(*) FROM public.bookings b JOIN public.service_slots s ON s.id=b.slot_id WHERE s.starts_at::date >= _desde AND b.status='presente'),
    'faltas', (SELECT count(*) FROM public.bookings b JOIN public.service_slots s ON s.id=b.slot_id WHERE s.starts_at::date >= _desde AND b.status='falta'),
    'cancelamentos', (SELECT count(*) FROM public.bookings b JOIN public.service_slots s ON s.id=b.slot_id WHERE s.starts_at::date >= _desde AND b.status='cancelado'),
    'checkins', (SELECT count(*) FROM public.wellbeing_checkins WHERE created_at::date >= _desde),
    'humor_medio', (SELECT round(avg(humor)::numeric,2) FROM public.wellbeing_checkins WHERE created_at::date >= _desde),
    'conteudos_acessos', (SELECT count(*) FROM public.content_views WHERE created_at::date >= _desde),
    'por_servico', (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (
        SELECT sv.name AS servico, count(*) AS total,
               count(*) FILTER (WHERE b.status='presente') AS presentes,
               count(*) FILTER (WHERE b.status='falta') AS faltas,
               count(*) FILTER (WHERE b.status='cancelado') AS cancelados
        FROM public.bookings b
        JOIN public.service_slots s ON s.id=b.slot_id
        JOIN public.services sv ON sv.id=s.service_id
        WHERE s.starts_at::date >= _desde
        GROUP BY sv.name ORDER BY count(*) DESC) x),
    'por_setor', (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (
        SELECT COALESCE(NULLIF(p.setor,''),'Não informado') AS setor, count(*) AS total
        FROM public.bookings b JOIN public.profiles p ON p.id=b.user_id
        JOIN public.service_slots s ON s.id=b.slot_id
        WHERE s.starts_at::date >= _desde
        GROUP BY 1 ORDER BY 2 DESC) x),
    'conteudos_top', (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (
        SELECT c.title AS titulo, count(*) AS acessos
        FROM public.content_views v JOIN public.contents c ON c.id=v.content_id
        WHERE v.created_at::date >= _desde
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x),
    'queixas', (SELECT COALESCE(jsonb_agg(x),'[]'::jsonb) FROM (
        SELECT COALESCE(NULLIF(queixa,''),'Não informado') AS queixa, count(*) AS total
        FROM public.wellbeing_checkins WHERE created_at::date >= _desde AND queixa IS NOT NULL
        GROUP BY 1 ORDER BY 2 DESC LIMIT 10) x),
    'serie_agendamentos', (SELECT COALESCE(jsonb_agg(x ORDER BY x->>'dia'),'[]'::jsonb) FROM (
        SELECT jsonb_build_object('dia', s.starts_at::date, 'total', count(*)) AS x
        FROM public.bookings b JOIN public.service_slots s ON s.id=b.slot_id
        WHERE s.starts_at::date >= _desde GROUP BY s.starts_at::date) y)
  ) INTO result;
  RETURN result;
END; $$;

REVOKE ALL ON FUNCTION public.indicadores_gerais(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.indicadores_gerais(DATE) TO authenticated;

-- DADOS DE EXEMPLO
INSERT INTO public.services (id, name, description, categoria, modality, default_capacity, duration_min, local) VALUES
 ('11111111-1111-4111-8111-111111111101','Massagem relaxante','Sessão individual de massagem para alívio de tensões.','bem-estar','individual',1,30,'Sala de Cuidado - Térreo'),
 ('11111111-1111-4111-8111-111111111102','Acupuntura','Atendimento individual de acupuntura.','saude-integrativa','individual',1,40,'Consultório 2'),
 ('11111111-1111-4111-8111-111111111103','Reiki','Sessão individual de reiki.','saude-integrativa','individual',1,30,'Sala de Cuidado - Térreo'),
 ('11111111-1111-4111-8111-111111111104','Yoga','Prática coletiva de yoga com foco em respiração e postura.','atividade-fisica','coletiva',5,50,'Auditório'),
 ('11111111-1111-4111-8111-111111111105','Ginástica laboral','Pausa ativa coletiva com alongamentos.','atividade-fisica','coletiva',12,20,'Hall Central'),
 ('11111111-1111-4111-8111-111111111106','Roda de conversa em saúde mental','Escuta e acolhimento em grupo.','saude-mental','coletiva',8,60,'Sala de Reuniões NAS');

INSERT INTO public.service_slots (service_id, starts_at, ends_at, capacity, local) VALUES
 ('11111111-1111-4111-8111-111111111101', now() + interval '1 day 9 hours', now() + interval '1 day 9 hours 30 minutes',1,'Sala de Cuidado - Térreo'),
 ('11111111-1111-4111-8111-111111111101', now() + interval '1 day 10 hours', now() + interval '1 day 10 hours 30 minutes',1,'Sala de Cuidado - Térreo'),
 ('11111111-1111-4111-8111-111111111102', now() + interval '2 day 8 hours', now() + interval '2 day 8 hours 40 minutes',1,'Consultório 2'),
 ('11111111-1111-4111-8111-111111111103', now() + interval '2 day 14 hours', now() + interval '2 day 14 hours 30 minutes',1,'Sala de Cuidado - Térreo'),
 ('11111111-1111-4111-8111-111111111104', now() + interval '3 day 7 hours', now() + interval '3 day 7 hours 50 minutes',5,'Auditório'),
 ('11111111-1111-4111-8111-111111111104', now() + interval '5 day 7 hours', now() + interval '5 day 7 hours 50 minutes',5,'Auditório'),
 ('11111111-1111-4111-8111-111111111105', now() + interval '1 day 15 hours', now() + interval '1 day 15 hours 20 minutes',12,'Hall Central'),
 ('11111111-1111-4111-8111-111111111106', now() + interval '4 day 13 hours', now() + interval '4 day 14 hours',8,'Sala de Reuniões NAS');

INSERT INTO public.contents (title, description, tipo, tema, url, fonte, duracao) VALUES
 ('Prevenção do câncer: o que você precisa saber','Vídeo educativo sobre prevenção e diagnóstico precoce.','video','prevencao','https://www.youtube.com/watch?v=dQw4w9WgXcQ','Canal da SES','8 min'),
 ('Alimentação saudável no trabalho','Cartilha com orientações práticas para as refeições na jornada.','cartilha','alimentacao','https://www.gov.br/saude/pt-br','Ministério da Saúde','12 páginas'),
 ('Ergonomia e postura no dia a dia','Vídeo curto com ajustes simples no posto de trabalho.','video','ergonomia','https://www.youtube.com/watch?v=dQw4w9WgXcQ','SESMIT','6 min'),
 ('Saúde mental do trabalhador','Episódio de podcast sobre ansiedade e rotina laboral.','podcast','saude-mental','https://open.spotify.com/','Podcast Saúde SES','32 min'),
 ('Hidratação: quanto de água por dia?','Áudio rápido com orientações de hidratação.','audio','autocuidado','https://open.spotify.com/','Podcast Saúde SES','4 min'),
 ('Semana da Saúde: programação','Notícia com a programação das ações institucionais.','noticia','educacao','https://www.saude.se.gov.br/','Portal SES-SE','leitura 3 min'),
 ('Pausa ativa em 5 minutos','Vídeo guiado de alongamentos para fazer no setor.','video','atividade-fisica','https://www.youtube.com/watch?v=dQw4w9WgXcQ','NAS','5 min');

INSERT INTO public.campaigns (title, description, kind, starts_on, ends_on, pontos) VALUES
 ('SIPAT 2026','Semana Interna de Prevenção de Acidentes de Trabalho: palestras, oficinas e ações de saúde.','sipat', CURRENT_DATE + 10, CURRENT_DATE + 15, 50),
 ('Semana da Saúde','Ações de promoção da saúde e qualidade de vida no centro administrativo.','campanha', CURRENT_DATE + 30, CURRENT_DATE + 35, 30),
 ('Desafio Beba Água','Registre sua hidratação por 21 dias seguidos.','desafio', CURRENT_DATE, CURRENT_DATE + 21, 20),
 ('Desafio Pausa Ativa','Participe de 8 pausas ativas no mês.','desafio', CURRENT_DATE, CURRENT_DATE + 30, 25);