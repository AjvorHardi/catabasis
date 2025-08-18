-- Add build hooks support to projects
-- Run this in Supabase SQL Editor

-- Add build hook fields to projects table
ALTER TABLE projects 
ADD COLUMN build_hook_url TEXT,
ADD COLUMN auto_deploy BOOLEAN DEFAULT false,
ADD COLUMN last_deploy_triggered TIMESTAMP WITH TIME ZONE;

-- Create build_deployments table to track deployments
CREATE TABLE build_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  trigger_reason TEXT NOT NULL, -- 'variable_update', 'database_update', 'manual'
  trigger_details JSONB DEFAULT '{}'::jsonb,
  hook_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'success', 'failed'
  response_status INTEGER,
  response_body TEXT,
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE build_deployments ENABLE ROW LEVEL SECURITY;

-- RLS policies for build_deployments
CREATE POLICY "Users can view their own deployments" ON build_deployments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = build_deployments.project_id 
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert deployments for their projects" ON build_deployments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = build_deployments.project_id 
      AND projects.user_id = auth.uid()
    )
  );

-- Function to trigger build hook
CREATE OR REPLACE FUNCTION trigger_build_hook(
  project_id_param UUID,
  reason TEXT DEFAULT 'manual',
  details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
  hook_url TEXT;
  auto_deploy_enabled BOOLEAN;
  deployment_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user owns the project and get build hook settings
  SELECT p.build_hook_url, p.auto_deploy
  INTO hook_url, auto_deploy_enabled
  FROM projects p
  WHERE p.id = project_id_param AND p.user_id = current_user_id;
  
  -- Check if project exists and user has access
  IF hook_url IS NULL THEN
    RAISE EXCEPTION 'Project not found, no build hook configured, or access denied';
  END IF;
  
  -- Check if auto deploy is enabled (unless manual trigger)
  IF reason != 'manual' AND NOT auto_deploy_enabled THEN
    RAISE NOTICE 'Auto deploy is disabled for this project';
    RETURN NULL;
  END IF;
  
  -- Create deployment record
  INSERT INTO build_deployments (
    project_id,
    trigger_reason,
    trigger_details,
    hook_url,
    status
  )
  VALUES (
    project_id_param,
    reason,
    details,
    hook_url,
    'pending'
  )
  RETURNING id INTO deployment_id;
  
  -- Update last deploy triggered timestamp
  UPDATE projects 
  SET last_deploy_triggered = NOW()
  WHERE id = project_id_param;
  
  RETURN deployment_id;
END;
$$;

-- Function to update deployment status (called from application after HTTP request)
CREATE OR REPLACE FUNCTION update_deployment_status(
  deployment_id_param UUID,
  status_param TEXT,
  response_status_param INTEGER DEFAULT NULL,
  response_body_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  
  -- Update deployment status (with user verification)
  UPDATE build_deployments 
  SET 
    status = status_param,
    response_status = response_status_param,
    response_body = response_body_param,
    completed_at = NOW()
  WHERE id = deployment_id_param
    AND EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = build_deployments.project_id 
      AND p.user_id = current_user_id
    );
END;
$$;