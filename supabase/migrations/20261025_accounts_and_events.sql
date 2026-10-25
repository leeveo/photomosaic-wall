-- Apply after lib/db.schema.sql, in a maintenance window with a database backup.
-- Existing events are preserved with owner_id NULL (invisible until assigned).
BEGIN;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES auth.users(id);
ALTER TABLE public.projects ALTER COLUMN owner_id SET DEFAULT auth.uid();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived'));
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS guest_token uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS moderation_enabled boolean NOT NULL DEFAULT false;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS draft_data jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.tiles ADD COLUMN IF NOT EXISTS moderation_status text NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending','approved','rejected'));
CREATE INDEX IF NOT EXISTS projects_owner_created ON public.projects(owner_id,created_at DESC);
CREATE INDEX IF NOT EXISTS tiles_project_created ON public.tiles(project_slug,created_at DESC);
CREATE TABLE IF NOT EXISTS public.subscriptions (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
 status text NOT NULL DEFAULT 'inactive', current_period_end timestamptz,
 stripe_customer_id text UNIQUE, stripe_subscription_id text UNIQUE,
 last_event_created bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.billing_events (id text PRIMARY KEY, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.event_activity (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, owner_id uuid NOT NULL,
 project_slug text NOT NULL, action text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.guest_access (
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 project_slug text NOT NULL REFERENCES public.projects(slug) ON DELETE CASCADE,
 token uuid NOT NULL, expires_at timestamptz NOT NULL,
 PRIMARY KEY(user_id,project_slug)
);
CREATE TABLE IF NOT EXISTS public.tile_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_slug text NOT NULL REFERENCES public.projects(slug) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES auth.users(id), row integer NOT NULL, col integer NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '5 minutes', UNIQUE(project_slug,row,col)
);

CREATE OR REPLACE FUNCTION public.has_subscription(p_user uuid DEFAULT auth.uid()) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.subscriptions WHERE user_id=p_user AND status='active' AND current_period_end>now());
$$;
CREATE OR REPLACE FUNCTION public.owns_project(p_slug text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.projects WHERE slug=p_slug AND owner_id=auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.can_edit_project(p_slug text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT public.owns_project(p_slug) AND public.has_subscription(auth.uid());
$$;
CREATE OR REPLACE FUNCTION public.is_event_guest(p_slug text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS(SELECT 1 FROM public.guest_access g JOIN public.projects p ON p.slug=g.project_slug
 WHERE g.user_id=auth.uid() AND g.project_slug=p_slug AND g.token=p.guest_token AND g.expires_at>now()
 AND p.status='active' AND public.has_subscription(p.owner_id));
$$;

-- Replace policies only on this application's tables, eliminating old public access.
DO $$ DECLARE t text; p record; BEGIN
 FOREACH t IN ARRAY ARRAY['projects','setups','designs','flyers','tiles','subscriptions','billing_events','event_activity','guest_access','tile_reservations'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
   EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
 END LOOP;
END $$;
CREATE POLICY projects_read ON public.projects FOR SELECT TO authenticated USING(owner_id=auth.uid());
CREATE POLICY projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK(owner_id=auth.uid() AND public.has_subscription(auth.uid()));
CREATE POLICY projects_update ON public.projects FOR UPDATE TO authenticated USING(owner_id=auth.uid() AND public.has_subscription(auth.uid())) WITH CHECK(owner_id=auth.uid() AND public.has_subscription(auth.uid()));
CREATE POLICY projects_delete ON public.projects FOR DELETE TO authenticated USING(owner_id=auth.uid() AND public.has_subscription(auth.uid()));
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['setups','designs','flyers'] LOOP
  EXECUTE format('CREATE POLICY event_read ON public.%I FOR SELECT TO authenticated USING(public.owns_project(project_slug) OR public.is_event_guest(project_slug))',t);
  EXECUTE format('CREATE POLICY event_write ON public.%I FOR ALL TO authenticated USING(public.can_edit_project(project_slug)) WITH CHECK(public.can_edit_project(project_slug))',t);
 END LOOP;
END $$;
CREATE POLICY tiles_read ON public.tiles FOR SELECT TO authenticated USING(public.owns_project(project_slug) OR (moderation_status='approved' AND public.is_event_guest(project_slug)));
CREATE POLICY tiles_manage ON public.tiles FOR ALL TO authenticated USING(public.can_edit_project(project_slug)) WITH CHECK(public.can_edit_project(project_slug));
CREATE POLICY subscription_read ON public.subscriptions FOR SELECT TO authenticated USING(user_id=auth.uid());
CREATE POLICY activity_read ON public.event_activity FOR SELECT TO authenticated USING(owner_id=auth.uid());
-- guest_access/reservations/billing_events are writable only by checked RPCs/service role.
GRANT SELECT,INSERT,UPDATE,DELETE ON public.projects,public.setups,public.designs,public.flyers,public.tiles TO authenticated;
GRANT SELECT ON public.subscriptions,public.event_activity TO authenticated;
REVOKE ALL ON public.billing_events,public.guest_access,public.tile_reservations FROM anon,authenticated;
REVOKE INSERT,UPDATE,DELETE ON public.subscriptions,public.event_activity FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.join_event(p_slug text,p_token uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.uid() IS NULL OR NOT EXISTS(SELECT 1 FROM public.projects WHERE slug=p_slug AND guest_token=p_token AND status='active' AND public.has_subscription(owner_id)) THEN
  RAISE EXCEPTION 'Invitation unavailable' USING ERRCODE='42501';
 END IF;
 INSERT INTO public.guest_access(user_id,project_slug,token,expires_at) VALUES(auth.uid(),p_slug,p_token,now()+interval '24 hours')
 ON CONFLICT(user_id,project_slug) DO UPDATE SET token=excluded.token,expires_at=excluded.expires_at;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_tile(p_slug text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_row integer; v_col integer; v_id uuid; v_setup public.setups; BEGIN
 IF NOT (public.is_event_guest(p_slug) OR public.can_edit_project(p_slug)) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 -- Lock the event so two participants cannot select the same free position.
 PERFORM 1 FROM public.projects WHERE slug=p_slug AND status='active' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Event inactive'; END IF;
 SELECT * INTO v_setup FROM public.setups WHERE project_slug=p_slug;
 IF v_setup.rows<1 OR v_setup.cols<1 OR v_setup.rows*v_setup.cols>25000 THEN RAISE EXCEPTION 'Invalid grid'; END IF;
 DELETE FROM public.tile_reservations WHERE project_slug=p_slug AND expires_at<=now();
 DELETE FROM public.tile_reservations WHERE project_slug=p_slug AND user_id=auth.uid();
 SELECT r,c INTO v_row,v_col FROM generate_series(0,v_setup.rows-1) r CROSS JOIN generate_series(0,v_setup.cols-1) c
 WHERE NOT EXISTS(SELECT 1 FROM public.tiles t WHERE t.project_slug=p_slug AND t.row=r AND t.col=c)
 AND NOT EXISTS(SELECT 1 FROM public.tile_reservations t WHERE t.project_slug=p_slug AND t.row=r AND t.col=c)
 ORDER BY random() LIMIT 1;
 IF v_row IS NULL THEN RAISE EXCEPTION 'Mosaic full'; END IF;
 INSERT INTO public.tile_reservations(project_slug,user_id,row,col) VALUES(p_slug,auth.uid(),v_row,v_col) RETURNING id INTO v_id;
 RETURN jsonb_build_object('id',v_id,'row',v_row,'col',v_col,'path',p_slug||'/'||v_id||'.jpg');
END $$;
CREATE OR REPLACE FUNCTION public.commit_tile(p_reservation uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v public.tile_reservations; state text; image_path text; BEGIN
 SELECT * INTO v FROM public.tile_reservations WHERE id=p_reservation AND user_id=auth.uid() FOR UPDATE;
 IF v.id IS NULL OR v.expires_at<=now() OR NOT (public.is_event_guest(v.project_slug) OR public.can_edit_project(v.project_slug)) THEN RAISE EXCEPTION 'Reservation expired' USING ERRCODE='42501'; END IF;
 image_path:=v.project_slug||'/'||v.id||'.jpg';
 IF NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='tiles' AND name=image_path) THEN RAISE EXCEPTION 'Image missing'; END IF;
 SELECT CASE WHEN moderation_enabled THEN 'pending' ELSE 'approved' END INTO state FROM public.projects WHERE slug=v.project_slug;
 INSERT INTO public.tiles(project_slug,row,col,image_url,moderation_status) VALUES(v.project_slug,v.row,v.col,'storage://tiles/'||image_path,state);
 DELETE FROM public.tile_reservations WHERE id=v.id;
 RETURN jsonb_build_object('status',state,'image_url','storage://tiles/'||image_path,'row',v.row,'col',v.col);
END $$;

-- Complete event data is committed atomically; templates remain tenant-owned.
CREATE OR REPLACE FUNCTION public.save_event(p_slug text,p_title text,p_setup jsonb,p_design jsonb,p_flyer jsonb,p_publish boolean DEFAULT false) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_setup public.setups; v_design public.designs; v_flyer public.flyers; BEGIN
 IF auth.uid() IS NULL OR NOT public.has_subscription(auth.uid()) THEN RAISE EXCEPTION 'Subscription required' USING ERRCODE='42501'; END IF;
 IF p_slug !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{1,79}$' OR length(trim(p_title))=0 OR length(p_title)>200 THEN RAISE EXCEPTION 'Invalid event name'; END IF;
 INSERT INTO public.projects(slug,title,owner_id) VALUES(p_slug,p_title,auth.uid()) ON CONFLICT(slug) DO NOTHING;
 PERFORM 1 FROM public.projects WHERE slug=p_slug AND owner_id=auth.uid() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Identifier unavailable' USING ERRCODE='42501'; END IF;
 v_setup:=jsonb_populate_record(NULL::public.setups,p_setup||jsonb_build_object('project_slug',p_slug));
 IF v_setup.rows NOT BETWEEN 1 AND 50 OR v_setup.cols NOT BETWEEN 1 AND 500 OR v_setup.rows IS NULL OR v_setup.cols IS NULL THEN RAISE EXCEPTION 'Invalid dimensions'; END IF;
 IF p_publish AND coalesce(v_setup.image,'')='' THEN RAISE EXCEPTION 'Image required'; END IF;
 IF EXISTS(SELECT 1 FROM public.tiles WHERE project_slug=p_slug) AND EXISTS(SELECT 1 FROM public.setups WHERE project_slug=p_slug AND (rows<>v_setup.rows OR cols<>v_setup.cols)) THEN RAISE EXCEPTION 'Cannot resize a populated event'; END IF;
 -- Delete/insert is transactional and retains the whole old configuration on failure.
 DELETE FROM public.setups WHERE project_slug=p_slug;
 INSERT INTO public.setups SELECT v_setup.*;
 v_design:=jsonb_populate_record(NULL::public.designs,p_design||jsonb_build_object('project_slug',p_slug));
 DELETE FROM public.designs WHERE project_slug=p_slug; INSERT INTO public.designs SELECT v_design.*;
 v_flyer:=jsonb_populate_record(NULL::public.flyers,p_flyer||jsonb_build_object('project_slug',p_slug));
 DELETE FROM public.flyers WHERE project_slug=p_slug; INSERT INTO public.flyers SELECT v_flyer.*;
 UPDATE public.projects SET title=p_title,status=CASE WHEN p_publish OR status='active' THEN 'active' ELSE 'draft' END,
 draft_data=jsonb_build_object('setup',p_setup,'design',p_design,'flyer',p_flyer) WHERE slug=p_slug;
 INSERT INTO public.event_activity(owner_id,project_slug,action) VALUES(auth.uid(),p_slug,CASE WHEN p_publish THEN 'published' ELSE 'draft_saved' END);
END $$;
CREATE OR REPLACE FUNCTION public.duplicate_event(p_slug text,p_new_slug text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE p public.projects; s jsonb; d jsonb; f jsonb; BEGIN
 IF NOT public.can_edit_project(p_slug) THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 IF EXISTS(SELECT 1 FROM public.projects WHERE slug=p_new_slug) THEN RAISE EXCEPTION 'Identifier unavailable' USING ERRCODE='23505'; END IF;
 SELECT * INTO p FROM public.projects WHERE slug=p_slug;
 SELECT to_jsonb(x) INTO s FROM public.setups x WHERE project_slug=p_slug;
 SELECT to_jsonb(x) INTO d FROM public.designs x WHERE project_slug=p_slug;
 SELECT to_jsonb(x) INTO f FROM public.flyers x WHERE project_slug=p_slug;
 PERFORM public.save_event(p_new_slug,p.title||' (copy)',coalesce(s,'{"rows":5,"cols":8}'::jsonb),coalesce(d,'{}'),coalesce(f,'{}'),false);
END $$;

CREATE OR REPLACE FUNCTION public.list_events(p_offset integer DEFAULT 0,p_limit integer DEFAULT 24,p_search text DEFAULT '',p_filter text DEFAULT 'all') RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH events AS (
 SELECT p.slug,p.title,p.created_at,p.status,p.guest_token,p.moderation_enabled,s.image,s.rows,s.cols,s.event_date,
 (SELECT count(*) FROM public.tiles t WHERE t.project_slug=p.slug) AS photos_count
 FROM public.projects p LEFT JOIN public.setups s ON s.project_slug=p.slug WHERE p.owner_id=auth.uid()
 AND p.title ILIKE '%'||left(p_search,200)||'%'
 AND (p_filter='all' OR p.status=p_filter)
 ), page AS (SELECT * FROM events ORDER BY created_at DESC,slug LIMIT greatest(1,least(p_limit,100)) OFFSET greatest(p_offset,0))
 SELECT jsonb_build_object('items',coalesce((SELECT jsonb_agg(to_jsonb(page)) FROM page),'[]'::jsonb),'total',(SELECT count(*) FROM events),
 'photos',(SELECT coalesce(sum(photos_count),0) FROM events),'capacity',(SELECT coalesce(sum(rows*cols),0) FROM events),'completed',(SELECT count(*) FROM events WHERE rows*cols>0 AND photos_count>=rows*cols));
$$;

-- Stripe events may only be applied using the backend service role.
CREATE OR REPLACE FUNCTION public.apply_billing_event(p_id text,p_created bigint,p_user uuid,p_status text,p_end timestamptz,p_customer text,p_subscription text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Access denied' USING ERRCODE='42501'; END IF;
 INSERT INTO public.billing_events(id) VALUES(p_id) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN; END IF;
 INSERT INTO public.subscriptions(user_id,status,current_period_end,stripe_customer_id,stripe_subscription_id,last_event_created)
 VALUES(p_user,p_status,p_end,p_customer,p_subscription,p_created)
 ON CONFLICT(user_id) DO UPDATE SET status=excluded.status,current_period_end=excluded.current_period_end,
 stripe_customer_id=excluded.stripe_customer_id,stripe_subscription_id=excluded.stripe_subscription_id,last_event_created=excluded.last_event_created,updated_at=now()
 WHERE public.subscriptions.last_event_created<=excluded.last_event_created;
END $$;

-- Private storage, including old publicly served objects. Other buckets are unaffected.
UPDATE storage.buckets SET public=false WHERE id IN ('tiles','backgrounds');
-- Freeze the original event-to-file mapping before clients can edit records.
CREATE TABLE IF NOT EXISTS public.legacy_event_media (
 bucket text NOT NULL, name text NOT NULL, project_slug text NOT NULL REFERENCES public.projects(slug) ON DELETE CASCADE,
 PRIMARY KEY(bucket,name,project_slug)
);
ALTER TABLE public.legacy_event_media ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.legacy_event_media FROM anon,authenticated;
INSERT INTO public.legacy_event_media(bucket,name,project_slug)
 SELECT 'tiles',split_part(image_url,'/storage/v1/object/public/tiles/',2),project_slug FROM public.tiles
 WHERE EXISTS(SELECT 1 FROM public.projects p WHERE p.slug=project_slug AND p.owner_id IS NULL) AND image_url LIKE '%/storage/v1/object/public/tiles/%'
 ON CONFLICT DO NOTHING;
INSERT INTO public.legacy_event_media(bucket,name,project_slug)
 SELECT 'backgrounds',split_part(image,'/storage/v1/object/public/backgrounds/',2),project_slug FROM public.setups
 WHERE EXISTS(SELECT 1 FROM public.projects p WHERE p.slug=project_slug AND p.owner_id IS NULL) AND image LIKE '%/storage/v1/object/public/backgrounds/%'
 ON CONFLICT DO NOTHING;
INSERT INTO public.legacy_event_media(bucket,name,project_slug)
 SELECT 'backgrounds',split_part(background_image,'/storage/v1/object/public/backgrounds/',2),project_slug FROM public.designs
 WHERE EXISTS(SELECT 1 FROM public.projects p WHERE p.slug=project_slug AND p.owner_id IS NULL) AND background_image LIKE '%/storage/v1/object/public/backgrounds/%'
 ON CONFLICT DO NOTHING;
INSERT INTO public.legacy_event_media(bucket,name,project_slug)
 SELECT 'backgrounds',split_part(background_image,'/storage/v1/object/public/backgrounds/',2),project_slug FROM public.flyers
 WHERE EXISTS(SELECT 1 FROM public.projects p WHERE p.slug=project_slug AND p.owner_id IS NULL) AND background_image LIKE '%/storage/v1/object/public/backgrounds/%'
 ON CONFLICT DO NOTHING;
CREATE OR REPLACE FUNCTION public.can_read_event_object(p_bucket text,p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (p_bucket='backgrounds' AND split_part(p_name,'/',1)=auth.uid()::text)
 OR (p_bucket='tiles' AND public.owns_project(split_part(p_name,'/',1)))
 OR EXISTS(SELECT 1 FROM public.legacy_event_media m WHERE m.bucket=p_bucket AND m.name=p_name AND public.owns_project(m.project_slug))
 OR EXISTS(SELECT 1 FROM public.tiles t WHERE p_bucket='tiles' AND t.moderation_status='approved' AND public.is_event_guest(t.project_slug)
 AND (t.image_url='storage://tiles/'||p_name OR t.image_url LIKE '%/storage/v1/object/public/tiles/'||p_name)
 AND (split_part(p_name,'/',1)=t.project_slug OR EXISTS(SELECT 1 FROM public.legacy_event_media m WHERE m.bucket=p_bucket AND m.name=p_name AND m.project_slug=t.project_slug)))
 OR EXISTS(SELECT 1 FROM public.projects p JOIN public.setups s ON s.project_slug=p.slug LEFT JOIN public.designs d ON d.project_slug=p.slug
 WHERE p_bucket='backgrounds' AND public.is_event_guest(p.slug)
 AND (s.image='storage://backgrounds/'||p_name OR d.background_image='storage://backgrounds/'||p_name OR s.image LIKE '%/storage/v1/object/public/backgrounds/'||p_name OR d.background_image LIKE '%/storage/v1/object/public/backgrounds/'||p_name)
 AND (split_part(p_name,'/',1)=p.owner_id::text OR EXISTS(SELECT 1 FROM public.legacy_event_media m WHERE m.bucket=p_bucket AND m.name=p_name AND m.project_slug=p.slug)));
$$;
CREATE OR REPLACE FUNCTION public.can_write_event_object(p_bucket text,p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (p_bucket='backgrounds' AND split_part(p_name,'/',1)=auth.uid()::text AND public.has_subscription(auth.uid()))
 OR (p_bucket='tiles' AND EXISTS(SELECT 1 FROM public.tile_reservations r WHERE p_name=r.project_slug||'/'||r.id||'.jpg'
 AND r.user_id=auth.uid() AND r.expires_at>now() AND (public.is_event_guest(r.project_slug) OR public.can_edit_project(r.project_slug))));
$$;
DROP POLICY IF EXISTS photomosaic_read_guard ON storage.objects;
CREATE POLICY photomosaic_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO public USING(bucket_id NOT IN ('tiles','backgrounds') OR public.can_read_event_object(bucket_id,name));
DROP POLICY IF EXISTS photomosaic_insert_guard ON storage.objects;
CREATE POLICY photomosaic_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO public WITH CHECK(bucket_id NOT IN ('tiles','backgrounds') OR public.can_write_event_object(bucket_id,name));
DROP POLICY IF EXISTS photomosaic_update_guard ON storage.objects;
CREATE POLICY photomosaic_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO public USING(bucket_id NOT IN ('tiles','backgrounds') OR (bucket_id='backgrounds' AND split_part(name,'/',1)=auth.uid()::text AND public.has_subscription(auth.uid()))) WITH CHECK(bucket_id NOT IN ('tiles','backgrounds') OR public.can_write_event_object(bucket_id,name));
DROP POLICY IF EXISTS photomosaic_delete_guard ON storage.objects;
CREATE POLICY photomosaic_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO public USING(bucket_id NOT IN ('tiles','backgrounds') OR (bucket_id='backgrounds' AND split_part(name,'/',1)=auth.uid()::text AND public.has_subscription(auth.uid())) OR (bucket_id='tiles' AND public.can_edit_project(split_part(name,'/',1))));
DROP POLICY IF EXISTS photomosaic_read ON storage.objects;
CREATE POLICY photomosaic_read ON storage.objects FOR SELECT TO authenticated USING(bucket_id IN ('tiles','backgrounds') AND public.can_read_event_object(bucket_id,name));
DROP POLICY IF EXISTS photomosaic_insert ON storage.objects;
CREATE POLICY photomosaic_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK(bucket_id IN ('tiles','backgrounds') AND public.can_write_event_object(bucket_id,name));
DROP POLICY IF EXISTS photomosaic_delete ON storage.objects;
CREATE POLICY photomosaic_delete ON storage.objects FOR DELETE TO authenticated USING((bucket_id='backgrounds' AND split_part(name,'/',1)=auth.uid()::text AND public.has_subscription(auth.uid())) OR (bucket_id='tiles' AND public.can_edit_project(split_part(name,'/',1))));

DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT oid::regprocedure AS signature FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname IN ('has_subscription','owns_project','can_edit_project','is_event_guest','join_event','reserve_tile','commit_tile','save_event','duplicate_event','list_events','apply_billing_event','can_read_event_object','can_write_event_object') LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC',p.signature);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role',p.signature);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.apply_billing_event(text,bigint,uuid,text,timestamptz,text,text) FROM authenticated;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') AND NOT EXISTS(SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='tiles') THEN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.tiles;
 END IF;
END $$;
COMMIT;
