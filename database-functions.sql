-- Database functions for Catabasis API

-- Function to regenerate API secret for a site
CREATE OR REPLACE FUNCTION regenerate_site_secret(site_id UUID)
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
  -- Get current user ID
  current_user_id := auth.uid();
  
  -- Check if user owns the site
  IF NOT EXISTS (
    SELECT 1 FROM sites s 
    WHERE s.id = site_id AND s.user_id = current_user_id
  ) THEN
    RAISE EXCEPTION 'Site not found or access denied';
  END IF;
  
  -- Update the site with new secret
  RETURN QUERY
  UPDATE sites 
  SET 
    api_secret = encode(gen_random_bytes(32), 'hex'),
    updated_at = NOW()
  WHERE sites.id = site_id
  RETURNING 
    sites.id,
    sites.name,
    sites.description,
    sites.site_uuid,
    sites.api_secret,
    sites.created_at,
    sites.updated_at;
END;
$$;

-- Function to validate API credentials (for use in API endpoints)
CREATE OR REPLACE FUNCTION validate_api_credentials(site_uuid_param UUID, api_secret_param TEXT)
RETURNS TABLE(site_id UUID, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.id, s.user_id
  FROM sites s
  WHERE s.site_uuid = site_uuid_param 
    AND s.api_secret = api_secret_param;
END;
$$;

-- Function to get site variables (for API)
CREATE OR REPLACE FUNCTION get_site_variables(site_uuid_param UUID, api_secret_param TEXT)
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validated_site_id UUID;
BEGIN
  -- Validate credentials
  SELECT site_id INTO validated_site_id
  FROM validate_api_credentials(site_uuid_param, api_secret_param);
  
  IF validated_site_id IS NULL THEN
    RAISE EXCEPTION 'Invalid site credentials';
  END IF;
  
  -- Return variables
  RETURN QUERY
  SELECT v.key, v.value
  FROM user_variables v
  WHERE v.site_id = validated_site_id
  ORDER BY v.key;
END;
$$;

-- Function to get site variable by key (for API)
CREATE OR REPLACE FUNCTION get_site_variable(site_uuid_param UUID, api_secret_param TEXT, variable_key TEXT)
RETURNS TABLE(key TEXT, value TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validated_site_id UUID;
BEGIN
  -- Validate credentials
  SELECT site_id INTO validated_site_id
  FROM validate_api_credentials(site_uuid_param, api_secret_param);
  
  IF validated_site_id IS NULL THEN
    RAISE EXCEPTION 'Invalid site credentials';
  END IF;
  
  -- Return specific variable
  RETURN QUERY
  SELECT v.key, v.value
  FROM user_variables v
  WHERE v.site_id = validated_site_id 
    AND v.key = variable_key;
END;
$$;

-- Function to get database data (for API)
CREATE OR REPLACE FUNCTION get_site_database_data(site_uuid_param UUID, api_secret_param TEXT, database_name_param TEXT)
RETURNS TABLE(row_id UUID, row_data JSONB, created_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  validated_site_id UUID;
  target_database_id UUID;
BEGIN
  -- Validate credentials
  SELECT site_id INTO validated_site_id
  FROM validate_api_credentials(site_uuid_param, api_secret_param);
  
  IF validated_site_id IS NULL THEN
    RAISE EXCEPTION 'Invalid site credentials';
  END IF;
  
  -- Find database
  SELECT d.id INTO target_database_id
  FROM user_databases d
  WHERE d.site_id = validated_site_id 
    AND d.name = database_name_param;
  
  IF target_database_id IS NULL THEN
    RAISE EXCEPTION 'Database not found';
  END IF;
  
  -- Return database rows
  RETURN QUERY
  SELECT r.id, r.data, r.created_at
  FROM database_rows r
  WHERE r.database_id = target_database_id
  ORDER BY r.created_at DESC;
END;
$$;