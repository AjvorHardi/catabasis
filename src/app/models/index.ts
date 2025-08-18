export interface Profile {
  id: string;
  email: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  site_uuid: string;
  api_secret: string;
  build_hook_url?: string;
  auto_deploy: boolean;
  last_deploy_triggered?: string;
  created_at: string;
  updated_at: string;
}

export interface Variable {
  id: string;
  project_id: string;
  name: string;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface Database {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  columns: string[];
  created_at: string;
  updated_at: string;
}

export interface DatabaseRow {
  id: string;
  database_id: string;
  data: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface CreateVariableRequest {
  project_id: string;
  name: string;
  value: string;
}

export interface CreateDatabaseRequest {
  project_id: string;
  name: string;
  description?: string;
  columns: string[];
}

export interface CreateDatabaseRowRequest {
  database_id: string;
  data: Record<string, string>;
}