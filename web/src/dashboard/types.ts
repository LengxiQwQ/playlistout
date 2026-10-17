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
  channel?: string;
  client_id?: string;
  platform?: string;
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

export interface DauChannelTotals {
  total: number;
  web: number;
  plugin: number;
  cli: number;
}

export interface DauDailyPoint extends DauChannelTotals {
  date: string;
  webUncollected?: boolean;
  pluginUncollected?: boolean;
  cliUncollected?: boolean;
  ma7?: number | null;
}

export interface DauHourlyPoint {
  hour: number;
  total: number;
  web?: number;
  plugin?: number;
  cli?: number;
  isFuture?: boolean;
}

export interface DauCumulativeHourlyPoint {
  hour: number;
  targetTotal: number | null;
  targetWeb: number | null;
  targetPlugin: number | null;
  targetCli: number | null;
  comparisonTotal: number | null;
  comparisonWeb: number | null;
  comparisonPlugin: number | null;
  comparisonCli: number | null;
  baselineTotal?: number | null;
  isFuture?: boolean;
}

export interface DauClientRow {
  client: string;
  channel: string;
  total: number;
  today: number;
  yesterday: number;
  targetCount?: number;
  comparisonCount?: number;
  deltaCount?: number;
  deltaPercent?: number | null;
  sharePercent?: number;
  coverageUncollected?: boolean;
  currentPeriodDailyAvg?: number;
  previousPeriodDailyAvg?: number;
}

export interface IntegrationClientSummary {
  clientId: string;
  channel: string;
  requests: number;
  successRate: number;
  prevRequests?: number;
  prevSuccessRate?: number;
  requestDeltaText: string;
  requestDeltaColor: string;
  topVersion?: string;
  topHost?: string;
  versionDistribution: CountItem[];
  hostDistribution: CountItem[];
}

export interface ChannelCoverageInfo {
  earliestDate: string | null;
  hasCoverage: boolean;
}

export interface DauCoverage {
  web: ChannelCoverageInfo;
  plugin: ChannelCoverageInfo;
  cli: ChannelCoverageInfo;
}

export interface DauAnnotation {
  date: string;
  type: 'coverage_start' | 'milestone' | 'info';
  title: string;
  description: string;
  channel?: 'web' | 'plugin' | 'cli';
}

export interface DauComparisonMeta {
  mode: 'prev_day' | 'prev_period' | 'same_day_last_week' | 'seven_day_baseline' | 'none';
  label: string;
  targetLabel: string;
  isSameHour: boolean;
  currentHour?: number;
  effectiveHour?: number | null;
  hasFullHour?: boolean;
  isLatestFullHour?: boolean;
  comparable: boolean;
  incomparableReason?: string;
  targetCount: number;
  comparisonCount: number;
  deltaCount: number;
  deltaPercent: number | null;
  baselineCount?: number;
  baselineDeltaPercent?: number | null;
}

export interface DauSingleDayStats {
  targetDate: string;
  comparisonDate: string;
  currentHour: number;
  effectiveHour?: number | null;
  hasFullHour?: boolean;
  isToday: boolean;
  targetCumulative: DauCumulativeHourlyPoint[];
  hourlyIncrements: DauHourlyPoint[];
  comparisonHourlyIncrements: DauHourlyPoint[];
  peakHour: { hour: number; count: number } | null;
  sevenDayBaseline: { hour: number; total: number }[];
}

export interface DauMultiDayStats {
  fromDate: string;
  toDate: string;
  dayCount: number;
  dailyAverage: number;
  fullDayCount?: number;
  fullDayAverage?: number;
  rangeIncludesToday?: boolean;
  latestFullDay: { date: string; total: number } | null;
  peakDay: { date: string; total: number } | null;
  previousPeriodFrom: string;
  previousPeriodTo: string;
  previousPeriodSeries: DauDailyPoint[];
  sevenDayMovingAverage: { date: string; value: number }[];
}

export interface DauSummary {
  targetDate: string;
  comparisonDate: string;
  isSingleDay: boolean;
  today: DauChannelTotals;
  yesterday: DauChannelTotals;
  windowTotals: DauChannelTotals;
  series: DauDailyPoint[];
  hours: DauHourlyPoint[];
  clients: DauClientRow[];
  countries: CountItem[];
  regions: CountItem[];
  coverage?: DauCoverage;
  annotations?: DauAnnotation[];
  comparison?: DauComparisonMeta;
  singleDay?: DauSingleDayStats;
  multiDay?: DauMultiDayStats;
  targetCumulative?: DauCumulativeHourlyPoint[];
  comparisonCumulative?: { hour: number; total: number | null }[];
  sevenDayBaseline?: { hour: number; total: number }[];
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
    active_user: number;
    rate_limited: number;
    migration_handoff: number;
    success_rate: number;
    active_clients: number;
    pending_feedback: number;
  };
  previousOverview?: {
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
    pending_feedback: number;
  };
  dau: DauSummary;
  timeseries: Array<Record<string, string | number>>;
  hourlyTimeseries: Array<Record<string, string | number>>;
  webTimeseries?: Array<Record<string, string | number>>;
  webHourlyTimeseries?: Array<Record<string, string | number>>;
  previousWebOverview?: {
    page_view: number;
    visitor_unique: number;
  };
  previousWebTimeseries?: Array<Record<string, string | number>>;
  previousWebHourlyTimeseries?: Array<Record<string, string | number>>;
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
  webEnvironment?: {
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
  webGeo: {
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
  integrationClients?: IntegrationClientSummary[];
  dataQuality: {
    status: 'healthy' | 'error';
    checks: QualityCheck[];
    latestDate: string | null;
    legacyMixedShare: number;
  };
  filterContract?: SliceFilterContract;
}

export type FilterDimension = 'channel' | 'client' | 'platform' | 'country' | 'region';

export interface PageFilterCapability {
  supportedDimensions: FilterDimension[];
  scopeNote: string;
}

export interface SliceFilterContract {
  supportedDimensions: FilterDimension[];
  scopeNote: string;
}

export const PAGE_FILTER_CAPABILITIES: Record<string, PageFilterCapability> = {
  overview: {
    supportedDimensions: [],
    scopeNote: '业务总览展示全站宏观指标与核心趋势，仅支持时间范围筛选。',
  },
  web: {
    supportedDimensions: ['country', 'region'],
    scopeNote: '官网地域分析针对 Web 独立访客 (UV)；环境与来源指标属于事件级分布。',
  },
  reliability: {
    supportedDimensions: ['channel', 'client', 'platform'],
    scopeNote: '稳定与性能指标支持渠道、接入端与目标平台筛选（不适用地域维度）。',
  },
  usage: {
    supportedDimensions: ['channel', 'client', 'platform'],
    scopeNote: '使用偏好分析覆盖来源渠道、接入端与音乐平台维度。',
  },
  integrations: {
    supportedDimensions: ['client', 'channel'],
    scopeNote: '生态集成分析覆盖客户端与渠道维度（平台维度不适用）。',
  },
  feedback: {
    supportedDimensions: ['platform', 'country', 'region'],
    scopeNote: '待审歌单队列支持按音乐平台及上报地域筛选（客户端与渠道维度不适用）。',
  },
  security: {
    supportedDimensions: ['platform', 'country', 'region'],
    scopeNote: '安全风控与拦截报文支持按攻击目标平台及来源地域筛选（客户端与渠道维度不适用）。',
  },
  dau: {
    supportedDimensions: ['channel', 'country', 'region'],
    scopeNote: '活跃趋势支持按活跃渠道（网页、插件、CLI）与地域筛选。',
  },
};

export interface FeedbackStats {
  uniqueUrls: number;
  totalReports: number;
  topPlatform: string;
  topErrorCode: string;
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
  availableErrorCodes?: CountItem[];
  stats?: FeedbackStats;
  filterContract?: SliceFilterContract;
}

export interface QuarantinePoint {
  date: string;
  count: number;
  events: number;
}

export interface QuarantineSlice {
  quarantine: QuarantineRow[];
  totalRecords: number;
  totalEvents: number;
  reasons?: CountItem[];
  timeseries?: QuarantinePoint[];
  normalizedRatePer1k?: string;
  filterContract?: SliceFilterContract;
}
