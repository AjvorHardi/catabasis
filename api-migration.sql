-- API Migration Script for Existing Catabasis Database
-- Run this in Supabase SQL Editor to add API functionality to projects

-- 1. Add site_uuid and api_secret to existing projects table
ALTER TABLE projects 
ADD COLUMN site_uuid UUID NOT NULL DEFAULT gen_random_uuid(),
ADD COLUMN api_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex');

-- Make site_uuid unique
ALTER TABLE projects ADD CONSTRAINT projects_site_uuid_unique UNIQUE(site_uuid);

-- 2. Create API access logs table
CREATE TABLE api_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create database functions that work with existing schema

-- Function to regenerate API secret for a project
CREATE OR REPLACE FUNCTION regenerate_project_secret(project_id UUID)
RETURNS TABLE(
  id UUID,
  name TEXT,
  description TEXT,
  site_uuid UUID,
  api_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  IF NOT EXISTS (
    SELECT 1 FROM projects p 
    WHERE p.id = project_id AND p.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Project not found or access denied';
  END IF;
  
  RETURN QUERY
  UPDATE projects 
  SET 
    api_secret = encode(gen_random_bytes(32), 'hex'),
    updated_at = NOW()
  WHERE projects.id = project_id
  RETURNING 
    projects.id,
    projects.name,
    projects.description,
    projects.site_uuid,
    projects.api_secret,
    projects.created_at,
    projects.updated_at;
END;
$$;

-- Function to validate API credentials
CREATE OR REPLACE FUNCTION validate_api_credentials(site_uuid_param UUID, api_secret_param TEXT)
RETURNS TABLE(project_id UUID, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.user_id
  FROM projects p
  WHERE p.site_uuid = site_uuid_param 
    AND p.api_secret = api_secret_param;
END;
$$;

-- Function to get project variables (for API)
CREATE OR REPLACE FUNCTION get_project_variables(site_uuid_param UUID, api_secret_param TEXT)
RETURNS TABLE(name TEXT, value TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validated_project_id UUID;
BEGIN
  SELECT project_id INTO validated_project_id
  FROM validate_api_credentials(site_uuid_param, api_secret_param);
  
  IF validated_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  
  RETURN QUERY
  SELECT v.name, v.value
  FROM variables v
  WHERE v.project_id = validated_project_id
  ORDER BY v.name;
END;
$$;

-- Function to get project variable by name (for API)
CREATE OR REPLACE FUNCTION get_project_variable(site_uuid_param UUID, api_secret_param TEXT, variable_name TEXT)
RETURNS TABLE(name TEXT, value TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validated_project_id UUID;
BEGIN
  SELECT project_id INTO validated_project_id
  FROM validate_api_credentials(site_uuid_param, api_secret_param);
  
  IF validated_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  
  RETURN QUERY
  SELECT v.name, v.value
  FROM variables v
  WHERE v.project_id = validated_project_id 
    AND v.name = variable_name;
END;
$$;

-- Function to get database data (for API)
CREATE OR REPLACE FUNCTION get_project_database_data(site_uuid_param UUID, api_secret_param TEXT, database_name_param TEXT)
RETURNS TABLE(row_id UUID, row_data JSONB, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validated_project_id UUID;
  target_database_id UUID;
BEGIN
  SELECT project_id INTO validated_project_id
  FROM validate_api_credentials(site_uuid_param, api_secret_param);
  
  IF validated_project_id IS NULL THEN
    RAISE EXCEPTION 'Invalid credentials';
  END IF;
  
  SELECT d.id INTO target_database_id
  FROM databases d
  WHERE d.project_id = validated_project_id 
    AND d.name = database_name_param;
  
  IF target_database_id IS NULL THEN
    RAISE EXCEPTION 'Database not found';
  END IF;
  
  RETURN QUERY
  SELECT r.id, r.data, r.created_at
  FROM database_rows r
  WHERE r.database_id = target_database_id
  ORDER BY r.created_at DESC;
END;
$$;