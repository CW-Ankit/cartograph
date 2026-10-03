export type AnalysisStatus = 'pending' | 'fetching' | 'parsing' | 'ready' | 'failed';

export interface DbOrganization {
  id: string;
  name: string;
  created_at: string;
}

export interface DbProject {
  id: string;
  organization_id: string;
  name: string;
  repository_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

export interface DbAnalysis {
  id: string;
  organization_id: string;
  project_id: string;
  commit_hash: string | null;
  status: AnalysisStatus;
  error_message: string | null;
  file_count: number;
  edge_count: number;
  route_count: number;
  coverage_percent: number | null;
  stats: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  projects?: Pick<DbProject, 'name' | 'repository_url' | 'default_branch'> | null;
}

export interface DbFile {
  id: string;
  organization_id: string;
  analysis_id: string;
  path: string;
  folder: string;
  line_count: number;
  content_hash: string | null;
  fan_in: number;
  fan_out: number;
  created_at: string;
}

export interface DbEdge {
  id: string;
  organization_id: string;
  analysis_id: string;
  source_file_id: string;
  target_file_id: string;
  kind: 'import' | 'reexport' | 'dynamic' | 'require';
  created_at: string;
}

export interface DbRoute {
  id: string;
  organization_id: string;
  analysis_id: string;
  file_id: string;
  method: string;
  path_pattern: string;
  created_at: string;
}

export interface DbExplanation {
  id: string;
  organization_id: string;
  analysis_id: string;
  target_type: 'file' | 'folder';
  target_id: string;
  content_hash: string;
  model_name: string;
  explanation: string;
  created_at: string;
}

export interface DbFileRole {
  id: string;
  organization_id: string;
  analysis_id: string;
  file_id: string;
  role: string;
  source: 'convention' | 'ai';
  created_at: string;
}

export interface DbInsight {
  id: string;
  organization_id: string;
  analysis_id: string;
  kind: 'cycle' | 'orphan' | 'high_dependency' | 'long_file';
  file_id: string | null;
  details: Record<string, unknown>;
  created_at: string;
}
