-- Catabasis Database Schema
-- Run these SQL commands in your Supabase SQL Editor

-- Enable Row Level Security
-- ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
-- this is not necessary, Supabase handles it by default

-- Create user profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create variables table
CREATE TABLE variables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  value TEXT NOT NULL CHECK (length(trim(value)) > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create databases table (for table definitions)
CREATE TABLE databases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  description TEXT,
  columns JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create database_rows table (for actual data)
CREATE TABLE database_rows (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  database_id UUID REFERENCES databases(id) ON DELETE CASCADE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for better performance
CREATE INDEX profiles_id_idx ON profiles(id);
CREATE INDEX projects_user_id_idx ON projects(user_id);
CREATE INDEX variables_project_id_idx ON variables(project_id);
CREATE INDEX databases_project_id_idx ON databases(project_id);
CREATE INDEX database_rows_database_id_idx ON database_rows(database_id);

-- Row Level Security Policies

-- Profiles policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Projects policies
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects" ON projects
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects" ON projects
  FOR DELETE USING (auth.uid() = user_id);

-- Variables policies
ALTER TABLE variables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view variables in own projects" ON variables
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = variables.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert variables in own projects" ON variables
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = variables.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update variables in own projects" ON variables
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = variables.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete variables in own projects" ON variables
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = variables.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Databases policies
ALTER TABLE databases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view databases in own projects" ON databases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = databases.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert databases in own projects" ON databases
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = databases.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update databases in own projects" ON databases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = databases.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete databases in own projects" ON databases
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = databases.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Database_rows policies
ALTER TABLE database_rows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rows in own databases" ON database_rows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM databases 
      JOIN projects ON projects.id = databases.project_id
      WHERE databases.id = database_rows.database_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert rows in own databases" ON database_rows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM databases 
      JOIN projects ON projects.id = databases.project_id
      WHERE databases.id = database_rows.database_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update rows in own databases" ON database_rows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM databases 
      JOIN projects ON projects.id = databases.project_id
      WHERE databases.id = database_rows.database_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete rows in own databases" ON database_rows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM databases 
      JOIN projects ON projects.id = databases.project_id
      WHERE databases.id = database_rows.database_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Function to automatically create user profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create profile when new user signs up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_variables_updated_at BEFORE UPDATE ON variables
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_databases_updated_at BEFORE UPDATE ON databases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_database_rows_updated_at BEFORE UPDATE ON database_rows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();