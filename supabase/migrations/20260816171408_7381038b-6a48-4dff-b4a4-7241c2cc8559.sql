-- 1. contador de versão do save (autoridade do servidor)
ALTER TABLE public.saves ADD COLUMN IF NOT EXISTS rev bigint NOT NULL DEFAULT 0;

-- 2. auditoria administrativa
CREATE TABLE public.admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid,
  admin_email text NOT NULL DEFAULT '',
  target_user_id uuid,
  target_public_id text,
  target_name text,
  action text NOT NULL,
  category text NOT NULL DEFAULT 'player',
  before_value jsonb,
  after_value jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  success boolean NOT NULL DEFAULT true,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.admin_logs TO service_role;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX admin_logs_created_at_idx ON public.admin_logs (created_at DESC);
CREATE INDEX admin_logs_target_idx ON public.admin_logs (target_public_id);

-- 3. configurações globais do jogo
CREATE TABLE public.game_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.game_settings TO anon;
GRANT SELECT ON public.game_settings TO authenticated;
GRANT ALL ON public.game_settings TO service_role;
ALTER TABLE public.game_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Configurações globais são públicas para leitura"
  ON public.game_settings FOR SELECT TO anon, authenticated USING (true);
CREATE TRIGGER update_game_settings_updated_at
  BEFORE UPDATE ON public.game_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. anúncios / mensagens
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'info',
  audience text NOT NULL DEFAULT 'all',
  audience_value text,
  target_user_id uuid,
  active boolean NOT NULL DEFAULT true,
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT SELECT ON public.announcements TO anon;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anúncios ativos são visíveis"
  ON public.announcements FOR SELECT TO anon, authenticated
  USING (active AND (target_user_id IS NULL OR target_user_id = auth.uid()));
CREATE TRIGGER update_announcements_updated_at
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. códigos promocionais gerenciáveis
CREATE TABLE public.gift_codes (
  code text PRIMARY KEY,
  label text NOT NULL DEFAULT '',
  money integer NOT NULL DEFAULT 0,
  shards integer NOT NULL DEFAULT 0,
  xp integer NOT NULL DEFAULT 0,
  monster_id text,
  monster_rarity text,
  max_uses integer,
  uses integer NOT NULL DEFAULT 0,
  once_per_player boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;
ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Códigos ativos são visíveis para jogadores logados"
  ON public.gift_codes FOR SELECT TO authenticated USING (active);
CREATE TRIGGER update_gift_codes_updated_at
  BEFORE UPDATE ON public.gift_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gift_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL REFERENCES public.gift_codes(code) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  public_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, user_id)
);
GRANT SELECT ON public.gift_code_uses TO authenticated;
GRANT ALL ON public.gift_code_uses TO service_role;
ALTER TABLE public.gift_code_uses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Jogador vê os próprios resgates"
  ON public.gift_code_uses FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 6. incremento atômico do save (usado pelas ações administrativas)
CREATE OR REPLACE FUNCTION public.admin_bump_save_rev(_user_id uuid)
RETURNS bigint
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.saves SET rev = rev + 1 WHERE user_id = _user_id RETURNING rev;
$$;
REVOKE ALL ON FUNCTION public.admin_bump_save_rev(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_bump_save_rev(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_bump_save_rev(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_bump_save_rev(uuid) TO service_role;