/**
 * Types for PlaylistOut Analytics & Review Dashboard
 */

export interface SnapshotDailyCoreRow {
  date: string;
  channel: string;
  client_id: string;
  platform: string;
  metric: string;
  count: number;
}

export interface SnapshotHourlyCoreRow {
  date: string;
  hour: number;
  metric: string;
  count: number;
}

export interface SnapshotGeoRow {
  date: string;
  channel?: string;
  client_id?: string;
  platform?: string;
  country: string;
  region: string;
  metric: string;
  count: number;
}

export interface SnapshotBreakdownRow {
  date: string;
  channel: string;
  client_id: string;
  platform: string;
  dimension: string;
  value: string;
  count: number;
}

export interface SnapshotClientEnvRow {
  date: string;
  channel: string;
  client_id: string;
  device_class: string;
  browser_family: string;
  os_family: string;
  count: number;
}

export interface FeedbackRow {
  id: number;
  platform: string;
  source_url: string;
  error_code: string | null;
  error_message?: string | null;
  country?: string | null;
  region?: string | null;
  city?: string | null;
  client_ip?: string | null;
  user_agent?: string | null;
  report_count: number;
  first_reported_at: string;
  last_reported_at: string;
  status: 'pending' | 'resolved' | 'ignored';
  resolved_at?: string | null;
}

export interface QuarantineRow {
  id: number;
  incident_date: string;
  reason: string;
  ip_or_subnet?: string;
  country?: string;
  region?: string;
  city?: string;
  user_agent?: string;
  action_taken?: string;
  platform?: string;
  endpoint?: string;
  forensic_details?: string;
  count: number;
  created_at?: string;
}

export interface AnalyticsSnapshot {
  version: number;
  generatedAt?: string;
  dailyCore: SnapshotDailyCoreRow[];
  hourlyCore: SnapshotHourlyCoreRow[];
  geo: SnapshotGeoRow[];
  breakdowns: SnapshotBreakdownRow[];
  clientEnv: SnapshotClientEnvRow[];
  quarantine: QuarantineRow[];
  feedback: FeedbackRow[];
}

export interface FilterParams {
  from?: string;
  to?: string;
  channel?: string;
  client?: string;
  platform?: string;
  country?: string;
  region?: string;
  exclude_my?: boolean;
}

export interface CountItem {
  name: string;
  count: number;
}

export interface QualityCheck {
  id: string;
  ok: boolean;
  expected: number;
  actual: number;
  note: string;
}

export interface AnalyticsSlice {
  version: number;
  filters: Record<string, string>;
  generatedAt?: string;
  availableDateRange: {
    from: string | null;
    to: string | null;
  };
  overview: {
    resolve_request: number;
    playlist_success: number;
    user_success: number;
    resolve_failure: number;
    tracks_processed: number;
    export: number;
    clipboard: number;
    page_view: number;
    visitor_unique: number;
    rate_limited: number;
    migration_handoff: number;
    success_rate: number;
    active_clients: number;
    pending_feedback: number;
  };
  timeseries: Array<Record<string, string | number>>;
  hourlyTimeseries: Array<Record<string, string | number>>;
  breakdowns: Record<string, CountItem[]>;
  distributions: {
    channels: CountItem[];
    clients: CountItem[];
    platforms: CountItem[];
  };
  environment: {
    devices: CountItem[];
    browsers: CountItem[];
    operatingSystems: CountItem[];
    filterScope: string;
  };
  geo: {
    countries: CountItem[];
    regions: CountItem[];
    filterScope: string;
  };
  availableFilters: {
    channels: CountItem[];
    clients: CountItem[];
    platforms: CountItem[];
    countries: CountItem[];
    regions: CountItem[];
  };
  dataQuality: {
    status: 'healthy' | 'error';
    checks: QualityCheck[];
    latestDate: string | null;
    legacyMixedShare: number;
  };
}

export interface FeedbackSlice {
  entries: FeedbackRow[];
  total: number;
  counts: {
    all: number;
    pending: number;
    resolved: number;
    ignored: number;
  };
}

export interface QuarantineSlice {
  quarantine: QuarantineRow[];
  totalRecords: number;
  totalEvents: number;
}
