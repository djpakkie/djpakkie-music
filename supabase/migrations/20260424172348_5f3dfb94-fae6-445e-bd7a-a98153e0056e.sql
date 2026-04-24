
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Tracks
CREATE TABLE public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  album TEXT,
  cover_url TEXT,
  audio_url TEXT NOT NULL,
  duration_seconds INTEGER,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracks"
  ON public.tracks FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert tracks"
  ON public.tracks FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tracks"
  ON public.tracks FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tracks"
  ON public.tracks FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for audio + cover art
INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true);

CREATE POLICY "Public can read track files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'tracks');

CREATE POLICY "Admins can upload track files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'tracks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update track files"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'tracks' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete track files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'tracks' AND public.has_role(auth.uid(), 'admin'));
