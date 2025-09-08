-- Create enum types (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('citizen', 'official', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.issue_category AS ENUM ('roads', 'streetlights', 'parks', 'toilets', 'water', 'electricity', 'waste', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  role app_role NOT NULL DEFAULT 'citizen',
  is_verified BOOLEAN DEFAULT FALSE,
  points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create issues table
CREATE TABLE IF NOT EXISTS public.issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category issue_category NOT NULL,
  status issue_status DEFAULT 'open',
  location_name TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  image_url TEXT,
  reported_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID REFERENCES auth.users(id),
  upvotes_count INTEGER DEFAULT 0,
  resolution_image_url TEXT,
  resolution_comment TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create upvotes table
CREATE TABLE IF NOT EXISTS public.upvotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(issue_id, user_id)
);

-- Create comments table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id UUID NOT NULL REFERENCES public.issues(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  issue_id UUID REFERENCES public.issues(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create settings table for admin configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  upvote_threshold INTEGER DEFAULT 1000,
  notification_radius_km INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default settings if table is empty
INSERT INTO public.settings (upvote_threshold, notification_radius_km) 
SELECT 1000, 5 
WHERE NOT EXISTS (SELECT 1 FROM public.settings);

-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('issue-images', 'issue-images', true),
  ('resolution-images', 'resolution-images', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view issues" ON public.issues;
DROP POLICY IF EXISTS "Authenticated users can create issues" ON public.issues;
DROP POLICY IF EXISTS "Users can update own issues" ON public.issues;
DROP POLICY IF EXISTS "Officials can update all issues" ON public.issues;

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for issues
CREATE POLICY "Anyone can view issues" ON public.issues FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create issues" ON public.issues FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own issues" ON public.issues FOR UPDATE USING (auth.uid() = reported_by);
CREATE POLICY "Officials can update all issues" ON public.issues FOR UPDATE USING (
  public.has_role(auth.uid(), 'official') OR public.has_role(auth.uid(), 'admin')
);

-- RLS Policies for upvotes
DROP POLICY IF EXISTS "Users can view all upvotes" ON public.upvotes;
DROP POLICY IF EXISTS "Users can create upvotes" ON public.upvotes;
DROP POLICY IF EXISTS "Users can delete own upvotes" ON public.upvotes;

CREATE POLICY "Users can view all upvotes" ON public.upvotes FOR SELECT USING (true);
CREATE POLICY "Users can create upvotes" ON public.upvotes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own upvotes" ON public.upvotes FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for comments
DROP POLICY IF EXISTS "Users can view all comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;

CREATE POLICY "Users can view all comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.comments FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;

CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for settings
DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Only admins can update settings" ON public.settings;

CREATE POLICY "Anyone can view settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Only admins can update settings" ON public.settings FOR UPDATE USING (
  public.has_role(auth.uid(), 'admin')
);

-- Storage policies for issue images
DROP POLICY IF EXISTS "Anyone can view issue images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload issue images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own issue images" ON storage.objects;

CREATE POLICY "Anyone can view issue images" ON storage.objects FOR SELECT USING (bucket_id IN ('issue-images', 'resolution-images'));
CREATE POLICY "Authenticated users can upload issue images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'issue-images' AND auth.uid() IS NOT NULL
);
CREATE POLICY "Officials can upload resolution images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'resolution-images' AND (
    public.has_role(auth.uid(), 'official') OR public.has_role(auth.uid(), 'admin')
  )
);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Anonymous User'),
    'citizen'
  );
  RETURN NEW;
END;
$$;

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update upvotes count
CREATE OR REPLACE FUNCTION public.update_upvotes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.issues 
    SET upvotes_count = upvotes_count + 1
    WHERE id = NEW.issue_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.issues 
    SET upvotes_count = upvotes_count - 1
    WHERE id = OLD.issue_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS update_upvotes_count_trigger ON public.upvotes;
CREATE TRIGGER update_upvotes_count_trigger
  AFTER INSERT OR DELETE ON public.upvotes
  FOR EACH ROW EXECUTE FUNCTION public.update_upvotes_count();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate triggers to avoid conflicts
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_issues_updated_at ON public.issues;
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_issues_updated_at BEFORE UPDATE ON public.issues
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();