/**
 * PlaylistOut Analytics & Review Maintainer Dashboard
 * Complete client-side application with authentication, in-memory slice engine,
 * interactive feedback status mutation, and forensic telemetry inspection.
 */

import { fetchSnapshot, updateFeedbackStatus, DashboardApiError } from './api';
import { getAuthToken, saveAuthToken, clearAuthToken, verifyAuthToken, isRemembered } from './auth';
import {
  buildAnalyticsSlice,
  buildFeedbackSlice,
  buildQuarantineSlice,
  resolvePageFilterParams,
} from './engine';
import type {
  AnalyticsSnapshot,
  AnalyticsSlice,
  FeedbackRow,
  QuarantineRow,
  CountItem,
  DauCumulativeHourlyPoint,
  FilterDimension,
  FilterParams,
} from './types';
import { PAGE_FILTER_CAPABILITIES } from './types';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));

const fmt = (n: unknown): string => Number(n || 0).toLocaleString();
const pct = (n: unknown): string => Number(n || 0).toFixed(1) + '%';
const countNamed = (arr: CountItem[] | undefined, name: string): number => Number(arr?.find((x) => x.name === name)?.count || 0);

const COUNTRY_META: Record<string, { name: string; color: string }> = {
  "CN": { name: "中国", color: "#de2910" },
  "HK": { name: "中国香港", color: "#e11d48" },
  "TW": { name: "中国台湾", color: "#0284c7" },
  "MO": { name: "中国澳门", color: "#059669" },
  "US": { name: "美国", color: "#1e40af" },
  "JP": { name: "日本", color: "#dc2626" },
  "SG": { name: "新加坡", color: "#e11d48" },
  "MY": { name: "马来西亚", color: "#f59e0b" },
  "GB": { name: "英国", color: "#1d4ed8" },
  "DE": { name: "德国", color: "#d97706" },
  "FR": { name: "法国", color: "#2563eb" },
  "CA": { name: "加拿大", color: "#dc2626" },
  "AU": { name: "澳大利亚", color: "#059669" },
  "KR": { name: "韩国", color: "#2563eb" },
  "RU": { name: "俄罗斯", color: "#0284c7" },
  "NL": { name: "荷兰", color: "#ea580c" },
  "IN": { name: "印度", color: "#ea580c" },
  "VN": { name: "越南", color: "#dc2626" },
  "TH": { name: "泰国", color: "#4f46e5" },
  "ID": { name: "印度尼西亚", color: "#dc2626" },
  "PH": { name: "菲律宾", color: "#2563eb" },
  "BR": { name: "巴西", color: "#16a34a" },
  "IT": { name: "意大利", color: "#15803d" },
  "ES": { name: "西班牙", color: "#eab308" },
  "SE": { name: "瑞典", color: "#0284c7" },
  "CH": { name: "瑞士", color: "#dc2626" },
  "PL": { name: "波兰", color: "#dc2626" },
  "UA": { name: "乌克兰", color: "#0284c7" },
  "IE": { name: "爱尔兰", color: "#16a34a" },
  "NZ": { name: "新西兰", color: "#1e40af" },
  "MX": { name: "墨西哥", color: "#16a34a" },
  "ZA": { name: "南非", color: "#059669" },
  "AR": { name: "阿根廷", color: "#38bdf8" },
  "TR": { name: "土耳其", color: "#dc2626" },
  "BE": { name: "比利时", color: "#d97706" },
  "AT": { name: "奥地利", color: "#dc2626" },
  "NO": { name: "挪威", color: "#dc2626" },
  "DK": { name: "丹麦", color: "#dc2626" },
  "FI": { name: "芬兰", color: "#1e40af" },
  "PT": { name: "葡萄牙", color: "#16a34a" },
  "CZ": { name: "捷克", color: "#1e40af" },
  "RO": { name: "罗马尼亚", color: "#1e40af" },
  "HU": { name: "匈牙利", color: "#16a34a" },
  "GR": { name: "希腊", color: "#1e40af" },
  "IL": { name: "以色列", color: "#0284c7" },
  "AE": { name: "阿联酋", color: "#16a34a" },
  "SA": { name: "沙特阿拉伯", color: "#16a34a" },
  "EG": { name: "埃及", color: "#d97706" },
  "CL": { name: "智利", color: "#dc2626" },
  "CO": { name: "哥伦比亚", color: "#eab308" },
  "PE": { name: "秘鲁", color: "#dc2626" },
  "PK": { name: "巴基斯坦", color: "#16a34a" },
  "BD": { name: "孟加拉国", color: "#16a34a" },
  "NG": { name: "尼日利亚", color: "#16a34a" },
  "KE": { name: "肯尼亚", color: "#dc2626" },
  "AD": { name: "安道尔", color: "#2563eb" },
  "AF": { name: "阿富汗", color: "#15803d" },
  "AG": { name: "安提瓜和巴布达", color: "#dc2626" },
  "AI": { name: "安圭拉", color: "#1e40af" },
  "AL": { name: "阿尔巴尼亚", color: "#dc2626" },
  "AM": { name: "亚美尼亚", color: "#d97706" },
  "AO": { name: "安哥拉", color: "#dc2626" },
  "AQ": { name: "南极洲", color: "#0284c7" },
  "AS": { name: "美属萨摩亚", color: "#1e40af" },
  "AW": { name: "阿鲁巴", color: "#0284c7" },
  "AX": { name: "奥兰群岛", color: "#1e40af" },
  "AZ": { name: "阿塞拜疆", color: "#0284c7" },
  "BA": { name: "波黑", color: "#1e40af" },
  "BB": { name: "巴巴多斯", color: "#1e40af" },
  "BF": { name: "布基纳法索", color: "#dc2626" },
  "BG": { name: "保加利亚", color: "#16a34a" },
  "BH": { name: "巴林", color: "#dc2626" },
  "BI": { name: "布隆迪", color: "#dc2626" },
  "BJ": { name: "贝宁", color: "#16a34a" },
  "BL": { name: "圣巴泰勒米", color: "#1e40af" },
  "BM": { name: "百慕大", color: "#dc2626" },
  "BN": { name: "文莱", color: "#eab308" },
  "BO": { name: "玻利维亚", color: "#dc2626" },
  "BQ": { name: "荷兰加勒比", color: "#1e40af" },
  "BS": { name: "巴哈马", color: "#0284c7" },
  "BT": { name: "不丹", color: "#ea580c" },
  "BV": { name: "布韦岛", color: "#1e40af" },
  "BW": { name: "博茨瓦纳", color: "#0284c7" },
  "BY": { name: "白俄罗斯", color: "#dc2626" },
  "BZ": { name: "伯利兹", color: "#1e40af" },
  "CC": { name: "科科斯群岛", color: "#16a34a" },
  "CD": { name: "刚果(金)", color: "#0284c7" },
  "CF": { name: "中非", color: "#16a34a" },
  "CG": { name: "刚果(布)", color: "#16a34a" },
  "CI": { name: "科特迪瓦", color: "#ea580c" },
  "CK": { name: "库克群岛", color: "#1e40af" },
  "CM": { name: "喀麦隆", color: "#16a34a" },
  "CR": { name: "哥斯达黎加", color: "#1e40af" },
  "CU": { name: "古巴", color: "#dc2626" },
  "CV": { name: "佛得角", color: "#1e40af" },
  "CW": { name: "库拉索", color: "#1e40af" },
  "CX": { name: "圣诞岛", color: "#16a34a" },
  "CY": { name: "塞浦路斯", color: "#ea580c" },
  "DJ": { name: "吉布提", color: "#0284c7" },
  "DM": { name: "多米尼克", color: "#16a34a" },
  "DO": { name: "多米尼加", color: "#1e40af" },
  "DZ": { name: "阿尔及利亚", color: "#16a34a" },
  "EC": { name: "厄瓜多尔", color: "#eab308" },
  "EE": { name: "爱沙尼亚", color: "#0284c7" },
  "EH": { name: "西撒哈拉", color: "#16a34a" },
  "ER": { name: "厄立特里亚", color: "#dc2626" },
  "ET": { name: "埃塞俄比亚", color: "#16a34a" },
  "FJ": { name: "斐济", color: "#0284c7" },
  "FK": { name: "马尔维纳斯群岛", color: "#1e40af" },
  "FM": { name: "密克罗尼西亚", color: "#0284c7" },
  "FO": { name: "法罗群岛", color: "#1e40af" },
  "GA": { name: "加蓬", color: "#16a34a" },
  "GD": { name: "格林纳达", color: "#dc2626" },
  "GE": { name: "格鲁吉亚", color: "#dc2626" },
  "GF": { name: "法属圭亚那", color: "#16a34a" },
  "GG": { name: "根西岛", color: "#1e40af" },
  "GH": { name: "加纳", color: "#dc2626" },
  "GI": { name: "直布罗陀", color: "#dc2626" },
  "GL": { name: "格陵兰", color: "#dc2626" },
  "GM": { name: "冈比亚", color: "#1e40af" },
  "GN": { name: "几内亚", color: "#dc2626" },
  "GP": { name: "瓜德罗普", color: "#1e40af" },
  "GQ": { name: "赤道几内亚", color: "#16a34a" },
  "GS": { name: "南乔治亚", color: "#1e40af" },
  "GT": { name: "危地马拉", color: "#0284c7" },
  "GU": { name: "关岛", color: "#1e40af" },
  "GW": { name: "几内亚比绍", color: "#dc2626" },
  "GY": { name: "圭亚那", color: "#16a34a" },
  "HM": { name: "赫德岛", color: "#1e40af" },
  "HN": { name: "洪都拉斯", color: "#0284c7" },
  "HR": { name: "克罗地亚", color: "#dc2626" },
  "HT": { name: "海地", color: "#1e40af" },
  "IM": { name: "马恩岛", color: "#dc2626" },
  "IO": { name: "英属印度洋领地", color: "#1e40af" },
  "IQ": { name: "伊拉克", color: "#dc2626" },
  "IR": { name: "伊朗", color: "#16a34a" },
  "IS": { name: "冰岛", color: "#1e40af" },
  "JE": { name: "泽西岛", color: "#dc2626" },
  "JM": { name: "牙买加", color: "#16a34a" },
  "JO": { name: "约旦", color: "#dc2626" },
  "KG": { name: "吉尔吉斯斯坦", color: "#dc2626" },
  "KH": { name: "柬埔寨", color: "#1e40af" },
  "KI": { name: "基里巴斯", color: "#dc2626" },
  "KM": { name: "科摩罗", color: "#16a34a" },
  "KN": { name: "圣基茨和尼维斯", color: "#16a34a" },
  "KP": { name: "朝鲜", color: "#dc2626" },
  "KW": { name: "科威特", color: "#16a34a" },
  "KY": { name: "开曼群岛", color: "#1e40af" },
  "KZ": { name: "哈萨克斯坦", color: "#0284c7" },
  "LA": { name: "老挝", color: "#dc2626" },
  "LB": { name: "黎巴嫩", color: "#dc2626" },
  "LC": { name: "圣卢西亚", color: "#0284c7" },
  "LI": { name: "列支敦士登", color: "#1e40af" },
  "LK": { name: "斯里兰卡", color: "#ea580c" },
  "LR": { name: "利比里亚", color: "#dc2626" },
  "LS": { name: "莱索托", color: "#1e40af" },
  "LT": { name: "立陶宛", color: "#eab308" },
  "LU": { name: "卢森堡", color: "#0284c7" },
  "LV": { name: "拉脱维亚", color: "#991b1b" },
  "LY": { name: "利比亚", color: "#16a34a" },
  "MA": { name: "摩洛哥", color: "#dc2626" },
  "MC": { name: "摩纳哥", color: "#dc2626" },
  "MD": { name: "摩尔多瓦", color: "#1e40af" },
  "ME": { name: "黑山", color: "#dc2626" },
  "MF": { name: "法属圣马丁", color: "#1e40af" },
  "MG": { name: "马达加斯加", color: "#dc2626" },
  "MH": { name: "马绍尔群岛", color: "#1e40af" },
  "MK": { name: "北马其顿", color: "#dc2626" },
  "ML": { name: "马里", color: "#16a34a" },
  "MM": { name: "缅甸", color: "#eab308" },
  "MN": { name: "蒙古", color: "#dc2626" },
  "MP": { name: "北马里亚纳", color: "#1e40af" },
  "MQ": { name: "马提尼克", color: "#1e40af" },
  "MR": { name: "毛里塔尼亚", color: "#16a34a" },
  "MS": { name: "蒙特塞拉特", color: "#1e40af" },
  "MT": { name: "马耳他", color: "#dc2626" },
  "MU": { name: "毛里求斯", color: "#dc2626" },
  "MV": { name: "马尔代夫", color: "#dc2626" },
  "MW": { name: "马拉维", color: "#dc2626" },
  "MZ": { name: "莫桑比克", color: "#16a34a" },
  "NA": { name: "纳米比亚", color: "#1e40af" },
  "NC": { name: "新喀里多尼亚", color: "#1e40af" },
  "NE": { name: "尼日尔", color: "#ea580c" },
  "NF": { name: "诺福克岛", color: "#16a34a" },
  "NI": { name: "尼加拉瓜", color: "#0284c7" },
  "NP": { name: "尼泊尔", color: "#dc2626" },
  "NR": { name: "瑙鲁", color: "#1e40af" },
  "NU": { name: "纽埃", color: "#eab308" },
  "OM": { name: "阿曼", color: "#dc2626" },
  "PA": { name: "巴拿马", color: "#1e40af" },
  "PF": { name: "法属波利尼西亚", color: "#dc2626" },
  "PG": { name: "巴布亚新几内亚", color: "#dc2626" },
  "PM": { name: "圣皮埃尔和密克隆", color: "#1e40af" },
  "PN": { name: "皮特凯恩群岛", color: "#1e40af" },
  "PR": { name: "波多黎各", color: "#1e40af" },
  "PS": { name: "巴勒斯坦", color: "#16a34a" },
  "PW": { name: "帕劳", color: "#0284c7" },
  "PY": { name: "巴拉圭", color: "#dc2626" },
  "QA": { name: "卡塔尔", color: "#991b1b" },
  "RE": { name: "留尼汪", color: "#1e40af" },
  "RS": { name: "塞尔维亚", color: "#dc2626" },
  "RW": { name: "卢旺达", color: "#0284c7" },
  "SB": { name: "所罗门群岛", color: "#16a34a" },
  "SC": { name: "塞舌尔", color: "#0284c7" },
  "SD": { name: "苏丹", color: "#dc2626" },
  "SH": { name: "圣赫勒拿", color: "#1e40af" },
  "SI": { name: "斯洛文尼亚", color: "#1e40af" },
  "SJ": { name: "斯瓦尔巴", color: "#dc2626" },
  "SK": { name: "斯洛伐克", color: "#1e40af" },
  "SL": { name: "塞拉利昂", color: "#16a34a" },
  "SM": { name: "圣马力诺", color: "#0284c7" },
  "SN": { name: "塞内加尔", color: "#16a34a" },
  "SO": { name: "索马里", color: "#0284c7" },
  "SR": { name: "苏里南", color: "#16a34a" },
  "SS": { name: "南苏丹", color: "#dc2626" },
  "ST": { name: "圣多美和普林西比", color: "#16a34a" },
  "SV": { name: "萨尔瓦多", color: "#0284c7" },
  "SX": { name: "荷属圣马丁", color: "#1e40af" },
  "SY": { name: "叙利亚", color: "#dc2626" },
  "SZ": { name: "斯威士兰", color: "#1e40af" },
  "TC": { name: "特克斯和凯科斯", color: "#1e40af" },
  "TD": { name: "乍得", color: "#1e40af" },
  "TF": { name: "法属南部领地", color: "#1e40af" },
  "TG": { name: "多哥", color: "#16a34a" },
  "TJ": { name: "塔吉克斯坦", color: "#dc2626" },
  "TK": { name: "托克劳", color: "#1e40af" },
  "TL": { name: "东帝汶", color: "#dc2626" },
  "TM": { name: "土库曼斯坦", color: "#16a34a" },
  "TN": { name: "突尼斯", color: "#dc2626" },
  "TO": { name: "汤加", color: "#dc2626" },
  "TT": { name: "特立尼达和多巴哥", color: "#dc2626" },
  "TV": { name: "图瓦卢", color: "#0284c7" },
  "TZ": { name: "坦桑尼亚", color: "#16a34a" },
  "UG": { name: "乌干达", color: "#eab308" },
  "UM": { name: "美属边远小岛", color: "#1e40af" },
  "UY": { name: "乌拉圭", color: "#0284c7" },
  "UZ": { name: "乌兹别克斯坦", color: "#0284c7" },
  "VA": { name: "梵蒂冈", color: "#eab308" },
  "VC": { name: "圣文森特和格林纳丁斯", color: "#0284c7" },
  "VE": { name: "委内瑞拉", color: "#eab308" },
  "VG": { name: "英属维尔京群岛", color: "#1e40af" },
  "VI": { name: "美属维尔京群岛", color: "#1e40af" },
  "VU": { name: "瓦努阿图", color: "#dc2626" },
  "WF": { name: "瓦利斯和富图纳", color: "#dc2626" },
  "WS": { name: "萨摩亚", color: "#dc2626" },
  "YE": { name: "也门", color: "#dc2626" },
  "YT": { name: "马约特", color: "#1e40af" },
  "ZM": { name: "赞比亚", color: "#16a34a" },
  "ZW": { name: "津巴布韦", color: "#16a34a" },
  "GLOBAL": { name: "全球网络", color: "#64748b" },
  "UNKNOWN": { name: "未知地区", color: "#64748b" },
};

const PROVINCE_NAMES: Record<string, string> = {
  // 国内省份与直辖市
  Guangdong: '广东',
  Zhejiang: '浙江',
  Jiangsu: '江苏',
  Beijing: '北京',
  Shanghai: '上海',
  Sichuan: '四川',
  Shandong: '山东',
  Hubei: '湖北',
  Hunan: '湖南',
  Fujian: '福建',
  Henan: '河南',
  Hebei: '河北',
  Shaanxi: '陕西',
  Anhui: '安徽',
  Chongqing: '重庆',
  Tianjin: '天津',
  Liaoning: '辽宁',
  Jiangxi: '江西',
  Guangxi: '广西',
  Yunnan: '云南',
  Heilongjiang: '黑龙江',
  Jilin: '吉林',
  Shanxi: '山西',
  Guizhou: '贵州',
  Gansu: '甘肃',
  Hainan: '海南',
  'Inner Mongolia': '内蒙古',
  Xinjiang: '新疆',
  Ningxia: '宁夏',
  Qinghai: '青海',
  Tibet: '西藏',

  // 常用海外热门省州 / 地区
  Tokyo: '东京',
  Osaka: '大阪',
  Kyoto: '京都',
  California: '加州',
  Virginia: '弗吉尼亚',
  Washington: '华盛顿州',
  Arizona: '亚利桑那',
  'New York': '纽约州',
  Texas: '德克萨斯',
  Florida: '佛罗里达',
  Illinois: '伊利诺伊',
  Massachusetts: '马萨诸塞',
  Pennsylvania: '宾夕法尼亚',
  Ohio: '俄亥俄',
  Georgia: '佐治亚',
  Michigan: '密歇根',
  'North Carolina': '北卡罗来纳',
  'New Jersey': '新泽西',
  Colorado: '科罗拉多',
  Oregon: '俄勒冈',
  Taiwan: '台湾',
  'Hong Kong': '香港',
  Macau: '澳门',
  Seoul: '首尔',
  'Gyeonggi-do': '京畿道',
  England: '英格兰',
  Ontario: '安大略',
  Quebec: '魁北克',
  'British Columbia': '不列颠哥伦比亚',
  'New South Wales': '新南威尔士',
  Victoria: '维多利亚',
  Bavaria: '巴伐利亚',
  'Île-de-France': '法兰西岛',
  Paris: '巴黎',
  Moscow: '莫斯科',
  'Saint Petersburg': '圣彼得堡',
  Selangor: '雪兰莪',
  'Kuala Lumpur': '吉隆坡',
  Bangkok: '曼谷',
  Singapore: '新加坡',
};

const BRAND_COLORS: Record<string, string> = {
  qqmusic: '#10b981',
  netease: '#ef4444',
  kugou: '#3b82f6',
  kuwo: '#ca8a04',
  migu: '#db2777',
  qishui: '#f59e0b',
  'plugin:musicfree': '#8b5cf6',
  musicfree: '#8b5cf6',
  plugin: '#8b5cf6',
  'plugin:bbplayer': '#fb7299',
  bbplayer: '#fb7299',
  official_web: '#0284c7',
  web: '#0284c7',
  official_cli: '#10b981',
  cli: '#10b981',
  anonymous_api: '#10b981',
  api: '#10b981',
  legacy_mixed: '#64748b',
  legacy_unknown: '#64748b',
  unknown_plugin: '#64748b',
  internal: '#64748b',
  desktop: '#6366f1',
  mobile: '#8b5cf6',
  tablet: '#06b6d4',
  chrome: '#ea4335',
  edge: '#0078d7',
  safari: '#0284c7',
  firefox: '#f97316',
  opera: '#ff1b2d',
  vivaldi: '#ef3939',
  brave: '#fb542b',
  qqbrowser: '#2563eb',
  wechat: '#07c160',
  arkweb: '#cf0a2c',
  huawei_browser: '#cf0a2c',
  miui_browser: '#ff6700',
  vivo_browser: '#415fff',
  oppo_browser: '#008753',
  honor_browser: '#0066cc',
  samsung_browser: '#1428a0',
  quark: '#0ea5e9',
  uc: '#ff8200',
  ucbrowser: '#ff8200',
  '360': '#00c458',
  sogou: '#fb6022',
  via: '#2c3e50',
  xbrowser: '#1e88e5',
  '115_browser': '#2777f8',
  slbrowser: '#8b5cf6',
  bot_crawler: '#64748b',
  windows: '#0078d7',
  android: '#22c55e',
  ios: '#6366f1',
  macos: '#a855f7',
  linux: '#f59e0b',
  harmonyos: '#cf0a2c',
  xlsx: '#10b981',
  csv: '#3b82f6',
  txt: '#06b6d4',
  json: '#f59e0b',
  m3u8: '#8b5cf6',
  clean_link: '#10b981',
  markdown: '#3b82f6',
  '<500ms': '#10b981',
  '500-1000ms': '#06b6d4',
  '1-3s': '#3b82f6',
  '3-5s': '#f59e0b',
  '5s+': '#ef4444',
  primary: '#10b981',
  fallback: '#f59e0b',
  unsupported_url: '#f59e0b',
  incomplete_playlist: '#f97316',
  playlist_not_found: '#ef4444',
  invalid_input: '#e11d48',
  parse_error: '#dc2626',
  upstream_timeout: '#b91c1c',
  rate_limited: '#a855f7',
  forbidden: '#be123c',
};

const AUTO_PALETTE = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
  '#a855f7', '#0ea5e9', '#e11d48', '#d946ef', '#059669',
  '#2563eb', '#7c3aed', '#d97706', '#4f46e5', '#0284c7',
];

function getBrandColor(key: string): string {
  const k = key.toLowerCase();
  if (BRAND_COLORS[k]) return BRAND_COLORS[k];
  if (COUNTRY_META[key]) return COUNTRY_META[key].color;
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash << 5) - hash + key.charCodeAt(i);
    hash |= 0;
  }
  return AUTO_PALETTE[Math.abs(hash) % AUTO_PALETTE.length];
}

function formatHumanLabel(val: string): string {
  if (COUNTRY_META[val]) return COUNTRY_META[val].name;
  if (PROVINCE_NAMES[val]) return PROVINCE_NAMES[val];
  const map: Record<string, string> = {
    // 客户端 Client
    official_web: 'Playlist Out Web',
    official_cli: 'Playlist Out CLI',
    anonymous_api: '公共开放 API',
    musicfree: 'MusicFree 插件',
    'plugin:musicfree': 'MusicFree 插件',
    bbplayer: 'BBPlayer 播放器',
    'plugin:bbplayer': 'BBPlayer 播放器',
    legacy_unknown: '未标记历史端',
    unknown_plugin: '未登记插件',
    internal: '内部探活调度',

    // 来源渠道 Channel
    web: '网页端',
    cli: '命令行',
    plugin: '播放器插件',
    api: '开放接口',
    legacy_mixed: '未标记历史端',

    // 目标音乐平台 Platform
    qqmusic: 'QQ 音乐',
    netease: '网易云音乐',
    kugou: '酷狗音乐',
    kuwo: '酷我音乐',
    migu: '咪咕音乐',
    qishui: '汽水音乐',
    auto: '全自动识别',
    unknown: '未识别平台',
    none: '全局汇总',

    // 用户输入方式 Requested Type
    web_url: '标准网页链接',
    mobile_share: '移动端分享口令/短链',
    mobile_share_link: '移动端分享口令/短链',
    raw_id: '纯歌单 ID',
    other: '其他输入',

    // 解析链路通道 Provider Path
    primary: '主解析通道',
    fallback: '备用重试通道',

    // 耗时区间 Latency Bucket
    '<500ms': '< 500ms 极速',
    '500-1000ms': '500ms - 1s 良好',
    '500ms_1s': '500ms - 1s 良好',
    '1-3s': '1s - 3s 正常',
    '1s_3s': '1s - 3s 正常',
    '3-5s': '3s - 5s 迟缓',
    '3s_5s': '3s - 5s 迟缓',
    '5s+': '≥ 5s 超时风险',
    '>5s': '≥ 5s 超时风险',

    // 失败触发阶段 Failure Stage
    input: '参数输入校验',
    client: '上游网络请求',
    normalize: '数据清洗归一',
    upstream: '上游服务限制',

    // 失败错误代码 Failure Code
    UNSUPPORTED_URL: '不支持的链接格式',
    INCOMPLETE_PLAYLIST: '部分曲目需登录或受限',
    PLAYLIST_NOT_FOUND: '歌单不存在或已删除',
    INVALID_INPUT: '输入参数非法',
    PARSE_ERROR: '上游协议解析异常',
    UPSTREAM_TIMEOUT: '上游响应超时',
    RATE_LIMITED: '触发访问频控',
    FORBIDDEN: '上游访问被拒绝',

    // 导出文件格式 Export Format
    xlsx: 'Excel 表格 (.xlsx)',
    csv: 'CSV 表格 (.csv)',
    txt: '纯文本清单 (.txt)',
    json: 'JSON 数据 (.json)',
    m3u8: 'M3U8 播放列表 (.m3u8)',
    markdown: 'Markdown 表格 (.md)',
    clean_link: '去参净链',

    // 剪贴板复制模式 Clipboard Mode
    title: '仅歌曲名',
    title_artist: '歌名 - 歌手',
    'title-artist': '歌名 - 歌手',
    title_artist_album: '歌名 - 歌手 - 专辑',
    'title-artist-album': '歌名 - 歌手 - 专辑',

    // 导出歌单规模 Playlist Size
    '1-50': '1 - 50 首',
    '51-200': '51 - 200 首',
    '201-500': '201 - 500 首',
    '501-1000': '501 - 1000 首',
    '1000+': '1000+ 首',

    // 安全风控原因 Quarantine Reason
    auto_quarantined_bot_ua: '自动化爬虫拦截',
    crawler_script_abuse_chengdu_api: '高频脚本抓取拦截',
    auto_quarantined_direct_api: '异常直调频控隔离',

    // 终端设备类型 Device Class
    desktop: '桌面电脑',
    mobile: '移动手机',
    tablet: '平板设备',
    bot_crawler: '网络爬虫 / 机器人',

    // 操作系统 OS Family
    windows: 'Windows',
    android: 'Android',
    ios: 'iOS',
    macos: 'macOS',
    linux: 'Linux',
    harmonyos: 'HarmonyOS (鸿蒙)',

    // 浏览器族 Browser Family
    chrome: 'Chrome',
    edge: 'Edge',
    safari: 'Safari',
    firefox: 'Firefox',
    opera: 'Opera',
    vivaldi: 'Vivaldi',
    brave: 'Brave',
    arc: 'Arc',
    yandex: 'Yandex',
    qqbrowser: 'QQ 浏览器',
    wechat: '微信内置浏览器',
    arkweb: '华为浏览器',
    huawei_browser: '华为浏览器',
    miui_browser: '小米浏览器',
    vivo_browser: 'Vivo 浏览器',
    oppo_browser: 'OPPO 浏览器',
    honor_browser: '荣耀浏览器',
    samsung_browser: '三星浏览器',
    quark: '夸克浏览器',
    uc: 'UC 浏览器',
    ucbrowser: 'UC 浏览器',
    '360': '360 浏览器',
    sogou: '搜狗浏览器',
    slbrowser: '联想浏览器',
    via: 'Via 浏览器',
    xbrowser: 'X 浏览器',
    '115_browser': '115 浏览器',
    baidubrowser: '百度浏览器',
    baidu_browser: '百度浏览器',
  };
  return map[val] || val;
}

function formatBrowserLabel(val: string): string {
  const s = String(val || '').trim();
  if (!s) return '—';
  if (s.toLowerCase() === 'other') return '其他浏览器';
  return formatHumanLabel(s);
}

function formatDeviceLabel(val: string): string {
  const s = String(val || '').trim();
  if (!s) return '—';
  if (s.toLowerCase() === 'other') return '其他设备';
  return formatHumanLabel(s);
}

function formatOsLabel(val: string): string {

  const s = String(val || '').trim();
  if (!s) return '—';
  if (s.toLowerCase() === 'other') return '其他系统';
  return formatHumanLabel(s);
}

function formatReferrerLabel(raw: string): string {

  if (!raw) return '直接访问 Direct';
  const s = String(raw).trim().toLowerCase();
  if (s === 'direct' || s === 'none' || s === '(direct)' || s === 'unknown' || s === '') {
    return '直接访问 Direct (书签/外链/APP)';
  }
  if (s.includes('github')) return 'GitHub 开源代码库 (github.com)';
  if (s.includes('google')) return 'Google 搜索引擎 (google.com)';
  if (s.includes('bing')) return '必应 Bing 搜索 (bing.com)';
  if (s.includes('baidu')) return '百度搜索 (baidu.com)';
  if (s.includes('bilibili')) return '哔哩哔哩 Bilibili (bilibili.com)';
  if (s.includes('v2ex')) return 'V2EX 开发者社区 (v2ex.com)';
  if (s.includes('zhihu')) return '知乎社区 (zhihu.com)';
  if (s.includes('weibo')) return '新浪微博 (weibo.com)';
  if (s.includes('twitter') || s.includes('t.co') || s === 'x.com') return 'X / Twitter (x.com)';
  if (s.includes('linux.do')) return 'LINUX DO 社区 (linux.do)';
  if (s.includes('nodeseek')) return 'NodeSeek 社区 (nodeseek.com)';
  if (s.includes('douban')) return '豆瓣 (douban.com)';
  if (s.startsWith('http://') || s.startsWith('https://')) {
    try {
      const u = new URL(raw);
      return u.hostname;
    } catch {
      return raw;
    }
  }
  return raw;
}

const DASHBOARD_CSS = `

:root {
  --bg: #f4f6fa; --p: #ffffff; --t: #1e293b; --m: #64748b; --l: #e2e8f0; --a: #206bc4;
  --g: #10b981; --r: #ef4444; --w: #f59e0b; --s: 0 1px 3px rgba(0,0,0,.05); --rad: 8px;
  --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}
@media (prefers-color-scheme: dark) {
  :root {
    --bg: #0f172a; --p: #1e293b; --t: #f8fafc; --m: #94a3b8; --l: #334155; --a: #3b82f6;
    --g: #34d399; --r: #f87171; --w: #fbbf24; --s: 0 1px 3px rgba(0,0,0,.3);
  }
}
* { box-sizing: border-box; }
html { overflow-y: scroll; scrollbar-gutter: stable; }
body { margin: 0; background: var(--bg); color: var(--t); font-family: var(--font); font-size: 13px; line-height: 1.5; }
button, select, input { font: inherit; color: inherit; }
.wrap { max-width: 1440px; margin: auto; padding: 14px 22px; }
.top { position: sticky; top: 0; z-index: 20; background: color-mix(in srgb, var(--p) 96%, transparent); backdrop-filter: blur(12px); border-bottom: 1px solid var(--l); box-shadow: var(--s); }
.head { display: flex; align-items: center; min-height: 50px; padding: 3px 0; }
.brand { display: flex; align-items: center; gap: 9px; flex-shrink: 0; text-decoration: none; color: inherit; cursor: pointer; transition: opacity .15s; background: transparent; }
.brand:hover { opacity: .8; }
.logo-img { width: 32px; height: 32px; border-radius: 8px; object-fit: contain; display: block; flex-shrink: 0; background: transparent; border: 0; box-shadow: none; }
.brand-info { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
h1 { margin: 0; font-size: 15px; font-weight: 800; letter-spacing: -.3px; line-height: 1.15; }
.badge-tag { font-size: 9.5px; font-weight: 700; padding: 0.5px 5px; border-radius: 4px; background: color-mix(in srgb, var(--a) 12%, transparent); color: var(--a); border: 1px solid color-mix(in srgb, var(--a) 25%, transparent); line-height: 1.2; }
.muted { font-size: 12px; color: var(--m); }
.headright { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: auto; }
.health-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--g); display: inline-block; flex-shrink: 0; box-shadow: 0 0 0 2px color-mix(in srgb, var(--g) 25%, transparent); cursor: help; transition: all .2s ease; }
.health-dot.bad { background: var(--r); box-shadow: 0 0 0 2px color-mix(in srgb, var(--r) 25%, transparent); }
.health-dot.loading { background: var(--w); box-shadow: 0 0 0 2px color-mix(in srgb, var(--w) 25%, transparent); }
.health { padding: 4px 9px; border: 1px solid var(--l); background: var(--p); border-radius: 999px; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; min-width: 92px; justify-content: center; }
.health.good { color: var(--g); border-color: color-mix(in srgb, var(--g) 30%, transparent); background: color-mix(in srgb, var(--g) 8%, transparent); }
.health.bad { color: var(--r); border-color: color-mix(in srgb, var(--r) 30%, transparent); background: color-mix(in srgb, var(--r) 8%, transparent); }
.ghost { height: 30px; padding: 0 10px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); cursor: pointer; font-size: 12px; font-weight: 500; box-shadow: var(--s); transition: background .15s, border-color .15s; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }
.ghost:hover { background: color-mix(in srgb, var(--p) 85%, var(--a)); border-color: var(--a); }
.ghost:disabled { opacity: 0.6; cursor: not-allowed; }
.tabs { display: flex; gap: 4px; align-items: center; padding: 0; margin: 0 0 0 16px; flex-shrink: 0; }
.tab { border: 1px solid transparent; border-radius: 8px; padding: 4px 10px; background: transparent; color: var(--m); cursor: pointer; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; transition: background .12s, color .12s, border-color .12s; outline: none; }
.tab:hover { color: var(--t); background: color-mix(in srgb, var(--p) 65%, transparent); border-color: var(--l); }
.tab.active { background: var(--p); color: var(--a); border-color: color-mix(in srgb, var(--a) 35%, var(--l)); }
.tab-icon { font-size: 14px; line-height: 1; display: flex; align-items: center; }
.tab-text { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.15; text-align: left; }
.tab-title { font-size: 12px; font-weight: 600; color: inherit; }
.tab-sub { font-size: 9.5px; font-weight: 600; color: var(--m); letter-spacing: .3px; text-transform: uppercase; }
.tab.active .tab-sub { color: color-mix(in srgb, var(--a) 70%, var(--m)); }
.tab-badge { padding: 1px 5px; border-radius: 999px; font-size: 10px; font-weight: 700; background: var(--w); color: #fff; line-height: 1.2; margin-left: 2px; }
.filter-card { padding: 12px 16px; margin-bottom: 14px; background: var(--p); border: 1px solid var(--l); border-radius: var(--rad); box-shadow: var(--s); }
.filter-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px solid var(--l); min-height: 36px; }
.filter-card-title { font-size: 12px; font-weight: 700; display: flex; align-items: center; gap: 6px; color: var(--t); white-space: nowrap; }
.scope-note-pill { font-size: 11px; color: var(--m); background: color-mix(in srgb, var(--p) 80%, var(--bg)); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--l); font-weight: 500; }
.toggle-switch { display: inline-flex; align-items: center; gap: 7px; cursor: pointer; user-select: none; font-size: 11.5px; font-weight: 600; padding: 2px 8px; border-radius: 6px; transition: background .15s; }
.toggle-switch:hover { background: color-mix(in srgb, var(--p) 80%, var(--a)); }
.toggle-switch input { position: absolute; opacity: 0; width: 0; height: 0; pointer-events: none; }
.toggle-slider { position: relative; width: 30px; height: 17px; background: var(--l); border-radius: 999px; transition: background .2s ease; flex-shrink: 0; }
.toggle-slider::after { content: ""; position: absolute; top: 2px; left: 2px; width: 13px; height: 13px; border-radius: 50%; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.25); transition: transform .2s cubic-bezier(.4,0,.2,1); }
.toggle-switch input:checked + .toggle-slider { background: var(--g); }
.toggle-switch input:checked + .toggle-slider::after { transform: translateX(13px); }
.toggle-switch-text { font-size: 11.5px; font-weight: 600; color: var(--m); white-space: nowrap; }
.toggle-switch input:checked ~ .toggle-switch-text { color: var(--t); }
.filters { display: grid; grid-template-columns: repeat(5, minmax(130px, 1fr)) auto; gap: 8px; }
.date-field { grid-column: 1 / -1; }
.field label { display: block; font-size: 11px; color: var(--m); font-weight: 600; margin: 0 0 4px 2px; }
.field select, .field input { height: 34px; width: 100%; padding: 0 8px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); font-size: 12px; }
.date-tools { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.date-group { display: flex; gap: 5px; align-items: center; flex-wrap: wrap; }
.date-group .date-label { font-size: 11px; color: var(--m); font-weight: 600; white-space: nowrap; }
.date-group input { width: 140px; height: 32px; }
.range { display: flex; gap: 4px; flex-wrap: wrap; }
.range button { height: 32px; padding: 0 9px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); cursor: pointer; font-size: 12px; color: var(--m); transition: all .15s; }
.range button:hover { color: var(--t); border-color: var(--m); }
.range button.active { background: var(--a); color: #fff; border-color: var(--a); font-weight: 600; }
.page { display: none; min-height: calc(100vh - 220px); }
.page.active { display: block; }
.section { display: flex; justify-content: space-between; align-items: end; margin: 16px 0 10px; }
.section h2 { margin: 0; font-size: 16px; font-weight: 700; }
.kpis { display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; }
.card, .panel { background: var(--p); border: 1px solid var(--l); border-radius: var(--rad); box-shadow: var(--s); }
.kpi-card { padding: 12px 14px; display: flex; flex-direction: column; justify-content: space-between; min-height: 92px; }
.kpi-label { font-size: 11px; font-weight: 600; color: var(--m); display: flex; justify-content: space-between; align-items: center; }
.kpi-val { font-size: 22px; font-weight: 700; font-family: var(--mono); margin: 4px 0 2px; letter-spacing: -.5px; }
.kpi-sub { font-size: 11px; color: var(--m); }
.grid2 { display: grid; grid-template-columns: 2fr 1fr; gap: 12px; margin-top: 12px; }
.grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 12px; }
.panel { padding: 14px; min-width: 0; }
.panel-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--l); }
.panel h3 { font-size: 13px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px; }
.trend-box { position: relative; height: 260px; width: 100%; }
.trend-box canvas { width: 100% !important; height: 100% !important; display: block; cursor: crosshair; }
.trend-legend { display: flex; gap: 12px; font-size: 11px; color: var(--m); align-items: center; }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.chart-tooltip { position: absolute; pointer-events: none; display: none; background: var(--p); border: 1px solid var(--l); border-radius: 7px; padding: 8px 10px; font-size: 11px; box-shadow: 0 4px 14px rgba(0,0,0,.12); z-index: 10; transform: translate(-50%, -110%); min-width: 140px; }
.chart-tooltip-title { font-weight: 600; color: var(--m); margin-bottom: 4px; border-bottom: 1px solid var(--l); padding-bottom: 3px; }
.chart-tooltip-row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
.bars { display: flex; flex-direction: column; gap: 8px; }
.bar { display: grid; grid-template-columns: minmax(130px, 175px) 1fr auto; gap: 8px; align-items: center; font-size: 12px; }
.bn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
.b-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.track { height: 7px; background: var(--l); border-radius: 999px; overflow: hidden; min-width: 50px; }
.fill { height: 100%; border-radius: 999px; transition: width .2s; }
.num { text-align: right; color: var(--m); font-variant-numeric: tabular-nums; font-family: var(--mono); font-size: 11px; white-space: nowrap; display: inline-flex; align-items: center; justify-content: flex-end; }
.num .val { color: var(--t); font-weight: 600; text-align: right; min-width: 48px; display: inline-block; }
.num .pct { color: var(--m); font-weight: 500; font-size: 10.5px; text-align: right; display: inline-block; width: 44px; margin-left: 8px; flex-shrink: 0; }
.chips { display: flex; flex-wrap: wrap; gap: 5px; }
.chip { padding: 3px 7px; border: 1px solid var(--l); border-radius: 999px; background: var(--p); font-size: 11px; color: var(--m); }
.table-wrap { overflow: auto; max-height: 75vh; }
table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
th, td { padding: 8px 10px; border-bottom: 1px solid var(--l); vertical-align: middle; }
th { color: var(--m); font-weight: 600; font-size: 11px; background: color-mix(in srgb, var(--p) 92%, var(--bg)); position: sticky; top: 0; z-index: 2; }
tbody tr:hover { background: color-mix(in srgb, var(--p) 90%, var(--a)); }
.url-cell { font-family: var(--mono); font-size: 11px; color: var(--a); max-width: 380px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.btn-sm { padding: 2px 7px; border: 1px solid var(--l); border-radius: 5px; background: var(--p); font-size: 11px; cursor: pointer; font-weight: 500; transition: all .15s; }
.btn-sm:hover { background: color-mix(in srgb, var(--p) 80%, var(--a)); border-color: var(--a); }
.btn-sm.ok { background: color-mix(in srgb, var(--g) 10%, var(--p)); color: var(--g); border-color: color-mix(in srgb, var(--g) 30%, transparent); }
.badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 600; display: inline-block; }
.badge.pending { background: color-mix(in srgb, var(--w) 15%, var(--p)); color: var(--w); border: 1px solid color-mix(in srgb, var(--w) 30%, transparent); }
.badge.resolved { background: color-mix(in srgb, var(--g) 15%, var(--p)); color: var(--g); border: 1px solid color-mix(in srgb, var(--g) 30%, transparent); }
.footer { text-align: center; color: var(--m); font-size: 11.5px; padding: 28px 0 20px; display: flex; flex-direction: column; gap: 6px; align-items: center; }
.footer-line { display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap; color: var(--m); font-weight: 400; }
.footer-line a { color: var(--m); text-decoration: none; transition: color .15s ease; font-weight: 400; }
.footer-line a:hover { color: var(--t); text-decoration: underline; text-underline-offset: 2px; }
.footer-sep { color: color-mix(in srgb, var(--m) 45%, transparent); user-select: none; }

/* 图表视图切换按钮组 */
.view-switch { display: inline-flex; background: var(--bg); border: 1px solid var(--l); border-radius: 6px; padding: 2px; gap: 2px; }
.view-switch button { border: 0; background: transparent; color: var(--m); font-size: 11px; padding: 2px 8px; border-radius: 4px; cursor: pointer; transition: all .15s ease; line-height: 1.4; font-weight: 500; }
.view-switch button:hover { color: var(--t); }
.view-switch button.active { background: var(--p); color: var(--a); font-weight: 600; box-shadow: var(--s); }

/* 环形占比图 (Donut Chart) */
.donut-wrap { display: grid; grid-template-columns: 160px 1fr; gap: 18px; align-items: center; padding: 6px 0; }
.donut-graphic { position: relative; width: 160px; height: 160px; margin: auto; }
.donut-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.donut-slice { transition: stroke-width .2s ease, opacity .2s ease; cursor: pointer; }
.donut-slice:hover { opacity: .85; }
.donut-center { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center; padding: 10px; }
.donut-center-val { font-size: 18px; font-weight: 700; font-family: var(--mono); color: var(--t); line-height: 1.1; }
.donut-center-lbl { font-size: 10.5px; color: var(--m); margin-top: 2px; max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.donut-legend { display: flex; flex-direction: column; gap: 0; max-height: 220px; overflow-y: auto; padding-right: 4px; }
.donut-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11.5px; padding: 4px 6px; border-radius: 4px; transition: background .15s; cursor: pointer; }
.donut-item:hover { background: color-mix(in srgb, var(--p) 85%, var(--a)); }
.donut-item-left { display: flex; align-items: center; gap: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.donut-item-right { display: inline-flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; flex-shrink: 0; }
.donut-item-right .val { font-weight: 600; color: var(--t); }
.donut-item-right .pct { color: var(--m); min-width: 38px; text-align: right; }

/* 直方柱状分布图 (Histogram / Column Chart) */
.hist-wrap { padding: 8px 0 4px; }
.hist-cols { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; align-items: end; height: 180px; }
.hist-col { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.hist-num { display: flex; flex-direction: column; align-items: center; margin-bottom: 6px; line-height: 1.15; }
.hist-val { font-size: 13px; font-weight: 700; font-family: var(--mono); color: var(--t); }
.hist-pct { font-size: 10.5px; color: var(--m); font-family: var(--mono); }
.hist-track { width: 100%; max-width: 48px; height: 100px; background: var(--l); border-radius: 6px 6px 2px 2px; display: flex; align-items: flex-end; overflow: hidden; }
.hist-fill { width: 100%; border-radius: 6px 6px 2px 2px; transition: height .3s cubic-bezier(.4, 0, .2, 1); }
.hist-label { font-size: 11px; font-weight: 600; color: var(--t); margin-top: 6px; display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.hist-sub { font-size: 10px; color: var(--m); margin-top: 1px; white-space: nowrap; }

/* 数据明细表 (Ranked Table) */
.ranked-table-wrap { overflow-x: auto; border: 1px solid var(--l); border-radius: 6px; }
.ranked-table { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.ranked-table th { background: color-mix(in srgb, var(--p) 92%, var(--bg)); position: sticky; top: 0; z-index: 1; padding: 6px 8px; font-size: 11px; font-weight: 600; color: var(--m); border-bottom: 1px solid var(--l); }
.ranked-table td { padding: 5px 8px; border-bottom: 1px solid var(--l); vertical-align: middle; }
.ranked-table tr:hover td { background: color-mix(in srgb, var(--p) 90%, var(--a)); }
.rank-badge { display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 4px; font-size: 10px; font-weight: 700; background: var(--l); color: var(--m); font-family: var(--mono); }
.rank-badge.top1 { background: #fef08a; color: #854d0e; }
.rank-badge.top2 { background: #e2e8f0; color: #334155; }
.rank-badge.top3 { background: #fed7aa; color: #9a3412; }

/* Login Container */
.login-card-wrap { min-height: 80vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
.login-card { background: var(--p); border: 1px solid var(--l); border-radius: 12px; box-shadow: 0 10px 25px rgba(0,0,0,.08); max-width: 440px; width: 100%; padding: 28px 24px; }
.login-header { text-align: center; margin-bottom: 24px; }
.login-logo { width: 48px; height: 48px; border-radius: 12px; margin: 0 auto 10px; display: block; border: 1px solid var(--l); }
.login-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.login-subtitle { font-size: 12px; color: var(--m); margin: 0; }
.login-form-group { margin-bottom: 16px; text-align: left; }
.login-form-group label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 6px; }
.login-input { width: 100%; height: 38px; padding: 0 10px; border: 1px solid var(--l); border-radius: 7px; background: var(--p); font-size: 13px; font-family: var(--mono); }
.login-btn { width: 100%; height: 40px; background: var(--a); color: #fff; border: none; border-radius: 7px; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity .15s; margin-top: 8px; display: flex; align-items: center; justify-content: center; gap: 8px; }
.login-btn:hover { opacity: .9; }
.login-btn:disabled { opacity: .6; cursor: not-allowed; }
.login-notice { margin-top: 18px; font-size: 11px; color: var(--m); line-height: 1.5; border-top: 1px solid var(--l); padding-top: 12px; text-align: left; }
.alert-error { background: color-mix(in srgb, var(--r) 10%, var(--p)); border: 1px solid color-mix(in srgb, var(--r) 30%, transparent); color: var(--r); padding: 8px 12px; border-radius: 6px; font-size: 12px; margin-bottom: 14px; }

@media (max-width: 1240px) {
  .head { flex-wrap: wrap; padding: 6px 0; gap: 8px; }
  .tabs { order: 3; width: 100%; justify-content: flex-start; margin: 4px 0 0; overflow-x: auto; }
}
@media (max-width: 1100px) {
  .filters { grid-template-columns: repeat(3, 1fr); }
  .kpis { grid-template-columns: repeat(3, 1fr); }
}
@media (max-width: 760px) {
  .filters { grid-template-columns: 1fr 1fr; }
  .kpis { grid-template-columns: 1fr 1fr; }
  .grid2, .grid3 { grid-template-columns: 1fr; }
  .bar { grid-template-columns: minmax(90px, 120px) 1fr auto; gap: 6px; }
  .num .pct { width: 40px; margin-left: 6px; }
  .donut-wrap { grid-template-columns: 1fr; justify-items: center; }
  .hist-cols { gap: 4px; }
  .hist-track { max-width: 32px; }
  .hist-label { font-size: 9.5px; }
}
`;

class DashboardApp {
  private container: HTMLElement;
  private token: string | null = null;
  private snapshot: AnalyticsSnapshot | null = null;
  private currentSlice: AnalyticsSlice | null = null;
  private excludeMy = false;
  private currentFbStatus = 'pending';
  private currentFbSort: 'recent' | 'frequent' | 'oldest_pending' = 'recent';
  private currentFbErrorCode = '';
  private currentPage = 'overview';
  private activePreset = 'all';
  private activeTrendIdx = -1;
  private activeDauIdx = -1;
  private activeDauHour = -1;
  private dauActiveSeries: Set<'total' | 'web' | 'plugin' | 'cli' | 'ma7' | 'prevPeriod'> = new Set([
    'total',
    'web',
    'plugin',
    'cli',
    'ma7',
    'prevPeriod',
  ]);
  private dauCompareMode: 'auto' | 'seven_day_baseline' | 'prev_period' | 'none' = 'auto';
  private activeWebTrendIdx = -1;
  private webCompareMode = false;
  private selectedIntegrationClient = '';
  private dauDrilldownRegion: string | null = null;
  private chartViews: Record<string, string> = {
    trend: 'bar',
    webTrend: 'line',
    platform: 'donut',
    client: 'bar',
    country: 'bar',
    region: 'bar',
    device: 'donut',
    latency: 'bar',
    exportFormat: 'bar',
    clipboard: 'bar',
    requestedType: 'bar',
    webCountry: 'bar',
    webRegion: 'bar',
  };


  constructor(container: HTMLElement) {
    this.container = container;
  }

  public async start(): Promise<void> {
    this.injectStyles();
    this.token = getAuthToken();

    if (!this.token) {
      this.renderLogin();
      return;
    }

    this.renderLoading('正在同步云端 Analytics 快照…');
    try {
      this.snapshot = await fetchSnapshot(this.token);
      this.renderDashboard();
    } catch (err) {
      if (err instanceof DashboardApiError && (err.status === 401 || err.status === 403)) {
        clearAuthToken();
        this.token = null;
        this.renderLogin('凭据已失效或无权访问，请重新登录。');
      } else {
        this.renderLogin(`连接云端失败：${(err as Error).message}`);
      }
    }
  }

  private injectStyles(): void {
    if (!document.getElementById('dashboard-injected-styles')) {
      const style = document.createElement('style');
      style.id = 'dashboard-injected-styles';
      style.textContent = DASHBOARD_CSS;
      document.head.appendChild(style);
    }
  }

  private renderLoading(msg: string): void {
    this.container.innerHTML = `
      <div class="login-card-wrap">
        <div class="login-card" style="text-align:center">
          <img src="/logo-64.png" class="login-logo" alt="PlaylistOut" onerror="this.onerror=null;this.src='/favicon.svg'">
          <div style="font-weight:700;font-size:15px;margin-bottom:8px">PlaylistOut Analytics</div>
          <div class="muted">${esc(msg)}</div>
        </div>
      </div>
    `;
  }

  private renderLogin(errorMsg = ''): void {
    this.container.innerHTML = `
      <div class="login-card-wrap">
        <div class="login-card">
          <div class="login-header">
            <img src="/logo-64.png" class="login-logo" alt="PlaylistOut" onerror="this.onerror=null;this.src='/favicon.svg'">
            <h2 class="login-title">PlaylistOut Maintainer</h2>
            <p class="login-subtitle">数据与审查控制台 · 身份认证</p>
          </div>
          ${errorMsg ? `<div class="alert-error">${esc(errorMsg)}</div>` : ''}
          <form id="loginForm">
            <div class="login-form-group">
              <label for="adminToken">管理员密码 (Password)</label>
              <input type="password" id="adminToken" class="login-input" placeholder="请输入管理员密码或口令" required autofocus autocomplete="current-password">
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px">
              <input type="checkbox" id="rememberMe" ${isRemembered() ? 'checked' : ''} style="cursor:pointer">
              <label for="rememberMe" style="font-size:12px;color:var(--m);cursor:pointer;user-select:none">记住此设备（永久保持登录，除非主动退出）</label>
            </div>
            <button type="submit" id="loginSubmitBtn" class="login-btn">
              <span>🔐</span>
              <span id="loginBtnText">验证并进入控制台</span>
            </button>
          </form>
          <div class="login-notice">
            <strong>🔒 安全提示</strong><br>
            凭据直接与 Cloudflare Worker 进行常量时间安全校验（SHA-256 Digest），只保存在您本机的浏览器本地存储中，退出登录即可完全清除。
          </div>
        </div>
      </div>
    `;

    const form = document.getElementById('loginForm') as HTMLFormElement;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const input = document.getElementById('adminToken') as HTMLInputElement;
      const rememberCheckbox = document.getElementById('rememberMe') as HTMLInputElement;
      const submitBtn = document.getElementById('loginSubmitBtn') as HTMLButtonElement;
      const btnText = document.getElementById('loginBtnText') as HTMLSpanElement;

      const tokenValue = input.value.trim();
      if (!tokenValue) return;

      submitBtn.disabled = true;
      btnText.textContent = '验证中…';

      try {
        const ok = await verifyAuthToken(tokenValue);
        if (!ok) {
          submitBtn.disabled = false;
          btnText.textContent = '验证并进入控制台';
          this.renderLogin('口令错误，请重新输入。');
          return;
        }

        this.token = tokenValue;
        saveAuthToken(tokenValue, rememberCheckbox.checked);
        this.renderLoading('验证通过，正在加载最新快照…');
        this.snapshot = await fetchSnapshot(tokenValue);
        this.renderDashboard();
      } catch (err) {
        submitBtn.disabled = false;
        btnText.textContent = '验证并进入控制台';
        this.renderLogin(`验证异常：${(err as Error).message}`);
      }
    };
  }

  private renderDashboard(): void {
    if (!this.snapshot) return;

    this.container.innerHTML = `
      <header class="top">
        <div class="wrap">
          <div class="head">
            <a href="https://playlistout.lengxiqwq.com/" target="_blank" rel="noopener noreferrer" class="brand" title="访问 Playlist Out 官方主页 ↗">
              <img src="/logo-64.png" width="32" height="32" class="logo-img" alt="Playlist Out" onerror="this.onerror=null;this.src='/favicon.svg'">
              <div class="brand-info">
                <h1>Playlist Out</h1>
                <span class="badge-tag">Analytics</span>
              </div>
            </a>
            <nav class="tabs">
              <button class="tab ${this.currentPage === 'overview' ? 'active' : ''}" data-page="overview">
                <span class="tab-icon">📊</span>
                <span class="tab-text"><span class="tab-title">业务总览</span><span class="tab-sub">Overview</span></span>
              </button>
              <button class="tab ${this.currentPage === 'usage' ? 'active' : ''}" data-page="usage">
                <span class="tab-icon">💡</span>
                <span class="tab-text"><span class="tab-title">使用偏好</span><span class="tab-sub">Usage</span></span>
              </button>
              <button class="tab ${this.currentPage === 'web' ? 'active' : ''}" data-page="web">
                <span class="tab-icon">💻</span>
                <span class="tab-text"><span class="tab-title">官网流量</span><span class="tab-sub">Web</span></span>
              </button>
              <button class="tab ${this.currentPage === 'reliability' ? 'active' : ''}" data-page="reliability">
                <span class="tab-icon">🛡️</span>
                <span class="tab-text"><span class="tab-title">系统稳定</span><span class="tab-sub">Reliability</span></span>
              </button>
              <button class="tab ${this.currentPage === 'integrations' ? 'active' : ''}" data-page="integrations">
                <span class="tab-icon">🔌</span>
                <span class="tab-text"><span class="tab-title">生态集成</span><span class="tab-sub">Integrations</span></span>
              </button>
              <button class="tab ${this.currentPage === 'feedback' ? 'active' : ''}" data-page="feedback">
                <span class="tab-icon">🐛</span>
                <span class="tab-text"><span class="tab-title">待审歌单</span><span class="tab-sub">Feedback</span></span>
                <span id="navPendingBadge" class="tab-badge" style="display:none">0</span>
              </button>
              <button class="tab ${this.currentPage === 'security' ? 'active' : ''}" data-page="security">
                <span class="tab-icon">🔒</span>
                <span class="tab-text"><span class="tab-title">安全风控</span><span class="tab-sub">Security</span></span>
              </button>
              <button class="tab ${this.currentPage === 'dau' ? 'active' : ''}" data-page="dau">
                <span class="tab-icon">📈</span>
                <span class="tab-text"><span class="tab-title">活跃趋势</span><span class="tab-sub">Activity</span></span>
              </button>
            </nav>
            <div class="headright">
              <label class="toggle-switch" title="一键排除所有来自马来西亚的测试记录（默认关闭）">
                <input type="checkbox" id="switchExcludeMy" ${this.excludeMy ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-switch-text">排除 MY 测试</span>
              </label>
              <div id="updatedTime" style="display:flex;flex-direction:column;align-items:flex-start;font-size:10px;line-height:1.25;color:var(--m);text-align:left">
                <div>快照: <span id="snapTime">—</span></div>
                <div>最新: <span id="latestDate">—</span></div>
              </div>
              <div id="healthBadge" class="health-dot good" title="数据健康 (Data Healthy)"></div>
              <button id="refreshCloudBtn" class="ghost" title="重新从 Cloudflare Worker 提取最新聚合快照">刷新云端数据</button>
              <button id="logoutBtn" class="ghost" style="color:var(--r);border-color:color-mix(in srgb,var(--r) 30%,transparent)" title="清除本地凭据退出">退出</button>
            </div>
          </div>
        </div>
      </header>

      <main class="wrap">
        <div id="globalError"></div>

        <!-- 维度与时间筛选工具栏 -->
        <div class="card filter-card">
          <div class="filter-card-head">
            <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
              <div class="filter-card-title"><span>⚙️</span> 维度与时间筛选工具栏 (Filters)</div>
              <div id="filterScopeNote" class="scope-note-pill" style="display:none"></div>
            </div>
            <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
              <div id="filterChips" class="chips"></div>
            </div>
          </div>
          <div class="filters">
            <div class="field date-field">
              <div class="date-tools">
                <div class="range">
                  <button data-range="today">今天</button>
                  <button data-range="yesterday">昨天</button>
                  <button data-range="daybefore">前天</button>
                  <button data-range="day3">大前天</button>
                  <button data-range="7">近7天</button>
                  <button data-range="30">近30天</button>
                  <button data-range="all" class="active">全部历史</button>
                </div>
                <div class="date-group">
                  <span class="date-label">单日</span>
                  <button id="filterPrevDayBtn" class="ghost btn-sm" title="切换到前一天">◀ 前一天</button>
                  <input id="singleDateInput" type="date" aria-label="查看单日">
                  <button id="filterNextDayBtn" class="ghost btn-sm" title="切换到后一天">后一天 ▶</button>
                  <button id="applySingleDateBtn" class="ghost">查看这一天</button>
                </div>
                <div class="date-group">
                  <span class="date-label">范围</span>
                  <input id="fromDateInput" type="date" aria-label="开始日期">
                  <span class="date-label">至</span>
                  <input id="toDateInput" type="date" aria-label="结束日期">
                  <button id="applyDateRangeBtn" class="ghost">应用范围</button>
                </div>
              </div>
            </div>
            <div class="field" data-filter="channel"><label for="filterChannel">来源渠道 Channel</label><select id="filterChannel"><option value="">全部渠道</option><option value="web">网页端 (Web)</option><option value="cli">命令行 (CLI)</option><option value="plugin">播放器插件 (Plugin)</option><option value="api">开放接口 (API)</option><option value="legacy_mixed">历史混合渠道 (Legacy V1)</option></select></div>
            <div class="field" data-filter="client"><label for="filterClient">接入端 Client</label><select id="filterClient"><option value="">全部端</option></select></div>
            <div class="field" data-filter="platform"><label for="filterPlatform">目标平台 Platform</label><select id="filterPlatform"><option value="">全部平台</option><option value="qqmusic">QQ 音乐</option><option value="netease">网易云音乐</option><option value="kugou">酷狗音乐</option><option value="kuwo">酷我音乐</option><option value="qishui">汽水音乐</option><option value="migu">咪咕音乐</option></select></div>
            <div class="field" data-filter="country"><label for="filterCountry">国家 Country</label><select id="filterCountry"><option value="">全部国家</option></select></div>
            <div class="field" data-filter="region"><label for="filterRegion">省份 (中国) Region</label><select id="filterRegion"><option value="">全部省份</option></select></div>
            <div class="field" data-filter="reset" style="display:flex;align-items:end"><button id="resetFiltersBtn" class="ghost" style="width:100%">重置</button></div>
          </div>
        </div>

        <!-- 1. 业务总览 (Overview) -->
        <section class="page ${this.currentPage === 'overview' ? 'active' : ''}" id="page-overview">
          <div class="section">
            <div><h2>业务总览 Overview</h2><div class="muted">全站宏观状态、变化归因 (Movers) 与关键待办事项；支持上一等长周期对比。</div></div>
          </div>
          <div id="overviewAlerts" style="margin-bottom:12px;display:none"></div>
          <div id="overviewKpis" class="kpis"></div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>📈 解析请求趋势 (Request Trend)</h3>
                  <div class="muted" style="font-size:11px">单日按小时 · 多日按天</div>
                </div>
                <div style="display:flex;align-items:center;gap:10px">
                  <div class="view-switch" data-target="trend">
                    <button class="active" data-view="bar" title="基线对比柱状图 (Steam 评测风格)">📊 柱形</button>
                    <button data-view="line" title="折线走势图">📈 折线</button>
                  </div>
                  <div class="trend-legend">
                    <span><span class="legend-dot" style="background:var(--g)"></span>成功解析</span>
                    <span><span class="legend-dot" style="background:var(--r)"></span>最终失败</span>
                  </div>
                </div>
              </div>
              <div class="trend-box" id="trendBox">
                <canvas id="trendCanvas"></canvas>
                <div id="trendTip" class="chart-tooltip">
                  <div id="tipTitle" class="chart-tooltip-title"></div>
                  <div class="chart-tooltip-row"><span style="color:var(--g)">● 成功解析:</span><strong id="tipOk"></strong></div>
                  <div class="chart-tooltip-row"><span style="color:var(--r)">● 最终失败:</span><strong id="tipFail"></strong></div>
                  <div class="chart-tooltip-row" style="border-top:1px solid var(--l);padding-top:2px"><span class="muted">成功率:</span><strong id="tipRate"></strong></div>
                </div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🎵 目标平台分布 (Top Movers)</h3>
                  <div class="muted" style="font-size:11px">解析请求次数 (resolve_request)</div>
                </div>
                <div class="view-switch" data-target="platform">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="donut" title="环形占比分布图">🍩 占比</button>
                </div>
              </div>
              <div id="platformBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🔌 接入端解析量 (Resolve Clients)</h3>
                  <div class="muted" style="font-size:11px">请求调用总次数</div>
                </div>
                <div class="view-switch" data-target="client">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="donut" title="环形占比分布图">🍩 占比</button>
                </div>
              </div>
              <div id="clientBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🩺 数据健康状态 (Data Integrity)</h3>
                  <div class="muted" style="font-size:11px">守恒与闭环核验</div>
                </div>
              </div>
              <div id="qualitySummary"></div>
              <details id="qualityDetails" style="margin-top:10px">
                <summary style="cursor:pointer;font-size:11px;color:var(--t);padding:4px 0">查看 8 项守恒核验明细 ▼</summary>
                <div id="qualityChecks" style="margin-top:8px"></div>
              </details>
            </div>
          </div>
          <details class="panel" style="margin-top:12px">
            <summary style="cursor:pointer;font-size:12px;font-weight:600;padding:4px 0;color:var(--m)">🌐 来源国家与地区分布 (已降级收起 · 建议前往“官网流量 Web”查看精准访客地域) ▼</summary>
            <div class="grid2" style="margin-top:10px">
              <div>
                <div class="panel-head">
                  <div>
                    <h3>🌍 来源国家</h3>
                    <div class="muted" style="font-size:11px">独立访客 (UV)</div>
                  </div>
                  <div class="view-switch" data-target="country">
                    <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                    <button data-view="table" title="明细数据表">📋 表格</button>
                  </div>
                </div>
                <div id="countryBars" class="bars"></div>
              </div>
              <div>
                <div class="panel-head">
                  <div>
                    <h3>🏙️ 中国省份 / 直辖市</h3>
                    <div class="muted" style="font-size:11px">独立访客 (UV)</div>
                  </div>
                  <div class="view-switch" data-target="region">
                    <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                    <button data-view="table" title="明细数据表">📋 表格</button>
                  </div>
                </div>
                <div id="regionBars" class="bars"></div>
              </div>
            </div>
          </details>
        </section>

        <!-- 2. 使用偏好 (Usage) -->
        <section class="page ${this.currentPage === 'usage' ? 'active' : ''}" id="page-usage">
          <div class="section">
            <div><h2>使用偏好 Usage</h2><div class="muted">解析平台分布、输入方式偏好、导出文件格式、歌单规模与跨端迁移。</div></div>
          </div>
          <div id="usageKpis" class="kpis"></div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🎵 目标平台 Target Platform</h3>
                  <div class="muted" style="font-size:11px">歌单解析请求数</div>
                </div>
              </div>
              <div id="usagePlatformBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>📥 输入方式 Requested Type</h3>
                  <div class="muted" style="font-size:11px">调用次数</div>
                </div>
                <div class="view-switch" data-target="requestedType">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="donut" title="环形占比分布图">🍩 占比</button>
                </div>
              </div>
              <div id="requestedTypeBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>📊 歌单曲目量 Playlist Size</h3>
                  <div class="muted" style="font-size:11px">导出曲目规模区间</div>
                </div>
              </div>
              <div id="exportSizeBars" class="bars"></div>
            </div>
          </div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>📄 导出格式 Export Format</h3>
                  <div class="muted" style="font-size:11px">生成文件格式</div>
                </div>
                <div class="view-switch" data-target="exportFormat">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="donut" title="环形占比分布图">🍩 占比</button>
                </div>
              </div>
              <div id="exportFormatBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>📋 复制模式 Clipboard</h3>
                  <div class="muted" style="font-size:11px">快捷剪贴板格式</div>
                </div>
                <div class="view-switch" data-target="clipboard">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="donut" title="环形占比分布图">🍩 占比</button>
                </div>
              </div>
              <div id="clipboardModeBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🚀 迁移目标 Migration Destination</h3>
                  <div class="muted" style="font-size:11px">跨播放器唤起调用</div>
                </div>
              </div>
              <div id="usageMigrationBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 2. 待审歌单 (Feedback) -->
        <section class="page ${this.currentPage === 'feedback' ? 'active' : ''}" id="page-feedback">
          <div class="section">
            <div>
              <h2>待审歌单与失败排查 (Review & Feedback)</h2>
              <div class="muted">解析失败反馈工作流：审查用户上报的真实失败歌单链接，快速复现、一键标记修复并同步 Cloudflare D1。</div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
              <div style="display:flex;gap:6px;align-items:center">
                <button class="ghost fb-tab ${this.currentFbStatus === 'pending' ? 'active' : ''}" data-fb-status="pending">待处理 Pending (<span id="fbCountPending">0</span>)</button>
                <button class="ghost fb-tab ${this.currentFbStatus === 'all' ? 'active' : ''}" data-fb-status="all">全部 All (<span id="fbCountAll">0</span>)</button>
                <button class="ghost fb-tab ${this.currentFbStatus === 'resolved' ? 'active' : ''}" data-fb-status="resolved">已修复 Resolved (<span id="fbCountResolved">0</span>)</button>
                <button class="ghost fb-tab ${this.currentFbStatus === 'ignored' ? 'active' : ''}" data-fb-status="ignored">已忽略 Ignored (<span id="fbCountIgnored">0</span>)</button>
              </div>
              <div style="display:flex;gap:6px;align-items:center;margin-left:auto">
                <select id="feedbackSort" class="ghost" style="padding:2px 8px;font-size:12px;border-radius:6px;cursor:pointer">
                  <option value="recent">🕒 最近上报优先</option>
                  <option value="frequent">🔥 高频重复失败优先</option>
                  <option value="oldest_pending">⏳ 最早未处理优先 (倒序排查)</option>
                </select>
                <select id="feedbackErrorCode" class="ghost" style="padding:2px 8px;font-size:12px;border-radius:6px;cursor:pointer">
                  <option value="">全部错误分类 (All Errors)</option>
                </select>
                <button id="reloadFeedbackBtn" class="ghost">刷新列表</button>
              </div>
            </div>
          </div>
          <div id="feedbackKpis" class="kpis" style="margin-bottom:12px"></div>
          <div class="panel">
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:50px">ID</th>
                    <th style="width:100px">目标平台</th>
                    <th>歌单链接 (Playlist URL) · 支持一键测试复现</th>
                    <th style="width:140px">错误代码分类</th>
                    <th style="width:160px">上报地域 / 城市</th>
                    <th style="width:70px;text-align:center">上报频次</th>
                    <th style="width:140px">最近上报时间</th>
                    <th style="width:70px">处理状态</th>
                    <th style="width:140px;text-align:right">操作</th>
                  </tr>
                </thead>
                <tbody id="feedbackRows"></tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 3. 官网流量 (Web Analytics) -->
        <section class="page ${this.currentPage === 'web' ? 'active' : ''}" id="page-web">
          <div class="section">
            <div>
              <h2>官网访客与流量趋势 Web Analytics</h2>
              <div class="muted">页面访问量 (PV) 走势、日去重访客 (UV)、来源分类渠道与客户端运行环境。</div>
            </div>
          </div>
          <div id="webKpis" class="kpis"></div>

          <!-- 第一层：官网流量走势 Trend -->
          <div class="panel" style="margin-bottom:12px">
            <div class="panel-head" style="align-items:center">
              <div>
                <h3>📈 官网流量趋势 Web Traffic Trend</h3>
                <div class="muted" style="font-size:11px">页面访问量 (PV) 与 日去重访客 (UV) 走势 · 支持上一周期对比</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <button id="webCompareToggle" class="btn-sm" style="cursor:pointer;padding:3px 10px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">⚖️ 对比上期: 关</button>
                <div class="view-switch" data-target="webTrend">
                  <button class="active" data-view="line" title="折线走势图">📈 折线</button>
                  <button data-view="bar" title="柱状图">📊 柱状</button>
                </div>
              </div>
            </div>
            <div class="trend-box" id="webTrendBox" style="position:relative">
              <canvas id="webTrendCanvas" height="220" style="width:100%;height:220px;display:block"></canvas>
              <div id="webTrendTip" class="chart-tooltip" style="display:none"></div>
            </div>
            <div style="display:flex;gap:18px;justify-content:center;margin-top:10px;font-size:12px">
              <span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:3px;background:#206bc4;display:inline-block;border-radius:2px"></span> 页面访问量 (PV)</span>
              <span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:3px;background:#10b981;display:inline-block;border-radius:2px"></span> 日去重访客 (UV)</span>
              <span id="webCompareLegend" style="display:none;align-items:center;gap:6px;color:var(--m)"><span style="width:12px;height:2px;background:#94a3b8;border-top:1px dashed #94a3b8;display:inline-block"></span> 上一周期基准 (虚线)</span>
            </div>
          </div>

          <!-- 第二层与第三层：Acquisition 与 Environment -->
          <div class="grid3">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🔗 访问来源 Referrer (Acquisition)</h3>
                  <div class="muted" style="font-size:11px">渠道与外链分类排行 (PV)</div>
                </div>
              </div>
              <div id="referrerBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🌐 浏览器 Browser</h3>
                  <div class="muted" style="font-size:11px">请求/事件环境分布 (非访客人数)</div>
                </div>
              </div>
              <div id="browserBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>💻 终端与系统 Device / OS</h3>
                  <div class="muted" style="font-size:11px">请求/事件环境分布 (非访客人数)</div>
                </div>
                <div class="view-switch" data-target="device">
                  <button class="active" data-view="donut" title="设备类型占比分布图">🍩 占比</button>
                  <button data-view="bar" title="横向排行列表">📊 列表</button>
                </div>
              </div>
              <div id="deviceBars" class="bars"></div>
              <hr style="border:0;border-top:1px solid var(--l);margin:10px 0">
              <div id="osBars" class="bars"></div>
            </div>
          </div>

          <!-- 第四层：Geo 访客地域单面板下钻 -->
          <div class="panel" style="margin-top:12px">
            <div class="panel-head" style="align-items:center">
              <div>
                <h3>🌍 官网访客地域分布 Web Visitor Geography</h3>
                <div class="muted" style="font-size:11px">仅计 Web 渠道独立访客 (UV) · 支持国家排行与中国省份下钻</div>
              </div>
              <div style="display:flex;align-items:center;gap:10px">
                <div class="drilldown-switch" style="display:flex;gap:4px">
                  <button id="geoTabCountryBtn" class="btn-sm active" style="cursor:pointer;padding:3px 10px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">🌍 全球国家 Top N</button>
                  <button id="geoTabRegionBtn" class="btn-sm" style="cursor:pointer;padding:3px 10px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">🏙️ 中国省份下钻</button>
                </div>
                <div class="view-switch" data-target="webCountry">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="table" title="明细数据表">📋 表格</button>
                </div>
              </div>
            </div>
            <div id="webGeoCountryContainer">
              <div id="webCountryBars" class="bars"></div>
            </div>
            <div id="webGeoRegionContainer" style="display:none">
              <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;margin-bottom:8px;border-bottom:1px solid var(--l)">
                <span class="muted" style="font-size:12px">📍 正在查看：<strong>中国 (China) 各省份 / 直辖市独立访客分布</strong></span>
                <button id="geoBackToCountryBtn" class="ghost btn-sm" style="cursor:pointer;font-size:11px;color:var(--a)">‹ 返回全球国家列表</button>
              </div>
              <div id="webRegionBars" class="bars"></div>
            </div>
          </div>
        </section>


        <!-- 4. 稳定性与诊断 (Reliability) -->
        <section class="page ${this.currentPage === 'reliability' ? 'active' : ''}" id="page-reliability">
          <div class="section">
            <div><h2>系统稳定性与诊断 Reliability</h2><div class="muted">失败原因、异常触发阶段、通道调度链路与延迟耗时分布；不联动 Geo。</div></div>
          </div>
          <div id="reliabilityKpis" class="kpis"></div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head"><h3>⚠️ 失败错误码 Failure Code</h3><span class="muted" style="font-size:11px">错误次数</span></div>
              <div id="failureCodeBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🚦 异常触发阶段 Failure Stage</h3><span class="muted" style="font-size:11px">触发次数</span></div>
              <div id="failureStageBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>⏱️ 解析耗时 Latency</h3>
                  <div class="muted" style="font-size:11px">耗时区间分布</div>
                </div>
              </div>
              <div id="latencyBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head"><h3>🛣️ 通道调度 Provider Path</h3><span class="muted" style="font-size:11px">主备失败与降级路径</span></div>
              <div id="providerBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🎯 诊断调用端点 Endpoint</h3><span class="muted" style="font-size:11px">API / Web 端点调用分布</span></div>
              <div id="endpointBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 5. 生态集成与插件接入 (Integrations) -->
        <section class="page ${this.currentPage === 'integrations' ? 'active' : ''}" id="page-integrations">
          <div class="section">
            <div>
              <h2>生态集成与接入端分析 Integrations</h2>
              <div class="muted">客户端生态全貌、端到端解析健康度、版本分布及跨播放器迁移跳转。</div>
            </div>
          </div>
          <div id="integrationKpis" class="kpis"></div>

          <!-- 第一层：全景接入端总表 Dynamic Client Table -->
          <div class="panel" style="margin-bottom:12px">
            <div class="panel-head" style="align-items:center">
              <div>
                <h3>🔌 接入端全景分析 Resolve Clients Overview</h3>
                <div class="muted" style="font-size:11px">全量接入客户端调用统计 · 支持点击单行下钻查看版本与宿主环境分布</div>
              </div>
              <span id="clientTableCountBadge" class="badge" style="background:var(--l);font-size:11px"></span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:180px">接入客户端 Client</th>
                    <th style="width:110px">渠道类型 Channel</th>
                    <th style="width:120px;text-align:right">解析请求 Requests</th>
                    <th style="width:120px;text-align:right">成功率 Success</th>
                    <th style="width:140px;text-align:right">环比上期 Delta</th>
                    <th style="width:200px">主要请求版本 / 宿主</th>
                    <th style="width:100px;text-align:right">操作 Action</th>
                  </tr>
                </thead>
                <tbody id="integrationClientRows"></tbody>
              </table>
            </div>
          </div>

          <!-- 第二层：选中 Client 深度下钻分析 Client Drilldown -->
          <div class="panel" id="clientDrilldownPanel" style="margin-bottom:12px">
            <div class="panel-head" style="align-items:center;border-bottom:1px solid var(--l);padding-bottom:10px;margin-bottom:12px">
              <div style="display:flex;align-items:center;gap:10px">
                <span id="drilldownClientDot" class="b-dot" style="width:10px;height:10px"></span>
                <div>
                  <h3 id="drilldownClientTitle" style="margin:0;font-size:14px">客户端深度下钻</h3>
                  <div id="drilldownClientSub" class="muted" style="font-size:11px;margin-top:2px"></div>
                </div>
              </div>
              <div id="drilldownClientBadges" style="display:flex;align-items:center;gap:8px"></div>
            </div>
            <div class="grid2">
              <div>
                <div class="panel-head">
                  <div>
                    <h4 style="margin:0;font-size:13px">📦 请求版本分布 Version Distribution</h4>
                    <div class="muted" style="font-size:11px">基于解析事件统计 · 非安装用户占比</div>
                  </div>
                </div>
                <div id="clientVersionBars" class="bars"></div>
              </div>
              <div>
                <div class="panel-head">
                  <div>
                    <h4 style="margin:0;font-size:13px">📱 请求宿主系统分布 Host Distribution</h4>
                    <div class="muted" style="font-size:11px">客户端运行操作系统环境分布</div>
                  </div>
                </div>
                <div id="clientHostBars" class="bars"></div>
              </div>
            </div>
          </div>

          <!-- 第三层：迁移跳转生态 Migration Ecosystem -->
          <div class="grid2">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🚀 跨播放器迁移跳转目标 Migration Destinations</h3>
                  <div class="muted" style="font-size:11px">用户从 Web 唤起或导出至第三方播放器</div>
                </div>
              </div>
              <div id="migrationBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🛤️ 迁移跳转来源渠道 Migration Providers</h3>
                  <div class="muted" style="font-size:11px">发起跨端迁移的歌曲歌单来源渠道</div>
                </div>
              </div>
              <div id="migrationProviderBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 6. 安全风控 (Security) -->
        <section class="page ${this.currentPage === 'security' ? 'active' : ''}" id="page-security">
          <div class="section">
            <div><h2>安全防护与防爬隔离 Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层 · 速率限流与遥测沙盒隔离。</div></div>
          </div>
          <div id="securityScope" class="scope-note" style="display:none"></div>
          <div id="securityKpis" class="kpis"></div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head"><h3>📈 安全拦截走势 Security Incident Trend</h3><span class="muted" style="font-size:11px">按日期拦截事件数</span></div>
              <div id="quarantineTrendBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🛡️ 隔离原因分布 Quarantine Summary</h3><span class="muted" style="font-size:11px">隔离次数</span></div>
              <div id="quarantineSummary" class="bars"></div>
            </div>
          </div>
          <div class="panel" style="margin-top:12px">
            <div class="panel-head"><h3>🛑 429 限流端点 Rate Limits</h3><span class="muted" style="font-size:11px">拦截次数</span></div>
            <div id="rateBars" class="bars"></div>
          </div>
          <div class="panel" style="margin-top:12px">
            <div class="panel-head">
              <div>
                <h3>🔍 隔离取证记录 Quarantine Forensics</h3>
                <div class="muted" style="font-size:11px">精确展示触发时间、风控处置规则、地理城市、客户端特征与底层报文。</div>
              </div>
              <span class="badge" style="background:var(--l);font-family:var(--mono)" id="quarantineCountBadge">0 条记录</span>
            </div>
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th style="width:130px">发生时间 (Time)</th>
                    <th style="width:200px">风控原因与处置结论</th>
                    <th style="width:150px">来源地域与城市 (Geo)</th>
                    <th style="width:140px">客户端特征 (UA)</th>
                    <th style="width:130px">目标行为与平台</th>
                    <th style="width:100px;text-align:center">拦截频次</th>
                    <th style="width:90px;text-align:right">操作</th>
                  </tr>
                </thead>
                <tbody id="quarantineRows"></tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 7. 活跃趋势 Activity (Daily Active) -->
        <section class="page ${this.currentPage === 'dau' ? 'active' : ''}" id="page-dau">
          <div class="section" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px">
            <div>
              <div style="display:flex;align-items:center;gap:8px">
                <h2>全端活跃趋势 (Activity Insights)</h2>
                <span id="dauModeBadge" class="badge" style="background:#0284c7;color:#fff;font-size:11px;padding:3px 8px">单日分析模式</span>
              </div>
              <div class="muted" style="margin-top:4px">
                每日活跃人次 · Web / 插件 / CLI 各自每日去重，跨端不做身份关联 · 统计日按 UTC 计算
                <button id="dauSemanticsBtn" class="ghost btn-sm" style="margin-left:8px;padding:2px 8px;font-size:11px;cursor:pointer">ⓘ 指标说明</button>
              </div>
            </div>
            <div id="dauCompareToolbar" style="display:flex;align-items:center;gap:8px"></div>
          </div>

          <div id="dauScopeBanner" style="display:none;margin-bottom:12px;background:var(--p);border:1px solid var(--l);padding:8px 12px;border-radius:6px;font-size:12px;align-items:center;justify-content:space-between"></div>

          <div id="dauKpis" class="kpis"></div>

          <div class="panel">
            <div class="panel-head">
              <div>
                <h3 id="dauMainChartTitle">📈 单日累计活跃趋势 (Cumulative Active by Hour)</h3>
                <div id="dauMainChartSub" class="muted" style="font-size:11px">X 轴为 00:00–23:00 (UTC) · Y 轴为累计每日活跃人次</div>
              </div>
              <div class="trend-legend" id="dauChartLegend"></div>
            </div>
            <div class="trend-box" id="dauTrendBox" style="position:relative;cursor:crosshair">
              <canvas id="dauTrendCanvas"></canvas>
              <div id="dauTrendTip" class="chart-tooltip">
                <div id="dauTipTitle" class="chart-tooltip-title"></div>
                <div id="dauTipContent"></div>
              </div>
            </div>
            <div id="dauChartFootnote" class="muted" style="font-size:11px;padding:8px 14px;border-top:1px solid var(--l);display:none"></div>
          </div>

          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head">
                <h3 id="dauSubChartHeadTitle">🕐 每小时首次活跃 (First Active by Hour)</h3>
                <span id="dauSubChartHeadSub" class="muted" style="font-size:11px">该小时首次被记录为当天活跃的人次，不代表该小时同时在线人数</span>
              </div>
              <div id="dauSubChartContainer">
                <div id="dauHourBars" class="bars"></div>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div style="display:flex;align-items:center;gap:8px">
                  <h3>🧩 接入端表现 Clients</h3>
                  <span class="muted" style="font-size:11px">点击客户端可下钻过滤</span>
                </div>
              </div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr id="dauClientHead">
                      <th>接入端 Client</th>
                      <th style="width:80px">渠道</th>
                      <th style="text-align:right;width:105px" id="thDauCol1">当日活跃</th>
                      <th style="text-align:right;width:105px" id="thDauCol2">对比日同期</th>
                      <th style="text-align:right;width:90px" id="thDauCol3">变化 %</th>
                      <th style="text-align:right;width:80px" id="thDauCol4">占比</th>
                      <th style="text-align:center;width:60px">下钻</th>
                    </tr>
                  </thead>
                  <tbody id="dauClientRows"></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="panel" style="margin-top:12px">
            <div class="panel-head">
              <div style="display:flex;align-items:center;gap:10px">
                <h3 id="dauGeoTitle">🌍 活跃地域分布 Geographic</h3>
                <button id="dauGeoBackBtn" class="ghost btn-sm" style="display:none;padding:1px 6px;font-size:11px;cursor:pointer">◀ 返回国家列表</button>
              </div>
              <span id="dauGeoSub" class="muted" style="font-size:11px">点击中国 (CN) 可下钻省份明细</span>
            </div>
            <div id="dauGeoBars" class="bars"></div>
          </div>

          <!-- 指标口径说明抽屉 / 模态框 -->
          <div id="dauSemanticsModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:99;align-items:center;justify-content:center">
            <div style="background:var(--p);border:1px solid var(--l);border-radius:10px;max-width:680px;width:92%;padding:20px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-height:85vh;display:flex;flex-direction:column">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;border-bottom:1px solid var(--l);padding-bottom:10px">
                <div style="font-weight:700;font-size:15px;display:flex;align-items:center;gap:8px">
                  <span>📐</span> 活跃度统计口径与隐私定义 (Metric Semantics)
                </div>
                <button id="closeDauSemanticsBtn" class="btn-sm" style="font-size:14px;padding:2px 8px;cursor:pointer">✕</button>
              </div>
              <div style="overflow:auto;font-size:12px;line-height:1.9;color:var(--t)">
                <div style="margin-bottom:10px">
                  <strong>• 指标真实语义：</strong>
                  本页面所有活跃指标统一代表<strong>「每日活跃人次」</strong>。Web、Plugin、CLI 各自每日独立去重，跨端不做身份关联。同一个人在同一天若同时使用网页和播放器插件，会分别计入各自端的日活。
                </div>
                <div style="margin-bottom:10px">
                  <strong>• 网页端 (Web)：</strong>
                  网站每日去重访客（基于匿名截断哈希记录 <code>visitor_unique</code>，历史数据全部并入，未另建一套记录）。
                </div>
                <div style="margin-bottom:10px">
                  <strong>• 播放器插件端 (Plugin)：</strong>
                  插件被加载即计入（新版本通过每日一次加载心跳上报；旧版本由服务端使用解析遥测派生计入；两者共享去重键，同天不重复计数）。
                </div>
                <div style="margin-bottom:10px">
                  <strong>• 命令行 (CLI)：</strong>
                  实际解析 / 导出时由服务端派生计入 <code>active_user</code>；使用 <code>--no-telemetry</code> 参数的用户完全不参与统计。
                </div>
                <div style="margin-bottom:10px">
                  <strong>• 统计时区契约：</strong>
                  所有日活以 <strong>UTC 00:00–23:59</strong> 为去重和统计周期。北京时间清晨（08:00）计入新一天。界面小时曲线辅助标注本地换算时间。
                </div>
                <div style="margin-bottom:10px">
                  <strong>• 同日累计比较原理：</strong>
                  小时核心表中的活跃记录为用户当天首次被观测到的时间。因此 <code>00:00 + 01:00 + ... + 当前小时</code> 即为截至该时刻的真实累计日活。
                </div>
                <div style="margin-bottom:10px">
                  <strong>• 统计覆盖边界：</strong>
                  Plugin 与 CLI 活跃统计上线时间晚于网站。数据未覆盖的历史时期显示为「未采集」，两期间比较时若统计覆盖不一致会自动标注「不可直接比较」，杜绝虚假爆发增长。
                </div>
                <div>
                  <strong>• 物理边界与已知局限：</strong>
                  高校/企业 NAT 共享出口可能轻微低估；移动网络冷启动跨 IP 可能微弱高估；跨天不持久化任何用户指纹。
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 取证报文模态框 -->
        <div id="forensicModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.5);z-index:99;align-items:center;justify-content:center">
          <div style="background:var(--p);border:1px solid var(--l);border-radius:10px;max-width:640px;width:92%;padding:18px;box-shadow:0 12px 30px rgba(0,0,0,.25);max-height:85vh;display:flex;flex-direction:column">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;border-bottom:1px solid var(--l);padding-bottom:8px">
              <div style="font-weight:700;font-size:14px;display:flex;align-items:center;gap:6px">
                <span>🛡️</span> 安全风控底层取证报文 (Forensic Details)
              </div>
              <button id="closeForensicModal" class="btn-sm" style="font-size:14px;padding:2px 8px;cursor:pointer">✕</button>
            </div>
            <div id="forensicContent" style="overflow:auto;font-family:var(--mono);font-size:11px;background:var(--bg);padding:12px;border-radius:6px;white-space:pre-wrap;word-break:break-all;line-height:1.5"></div>
          </div>
        </div>

        <footer class="footer">
          <div class="footer-line">
            <a href="https://playlistout.lengxiqwq.com/" target="_blank" rel="noopener noreferrer">Playlist Out</a>
            <span class="footer-sep">·</span>
            <span>把你的歌单带走</span>
            <span class="footer-sep">·</span>
            <span>Paste. Parse. Export.</span>
          </div>
          <div class="footer-line">
            <span>Made with ❤️ by <a href="https://github.com/LengxiQwQ" target="_blank" rel="noopener noreferrer">LengxiQwQ</a></span>
            <span class="footer-sep">·</span>
            <a href="https://github.com/LengxiQwQ/playlistout" target="_blank" rel="noopener noreferrer">GitHub 仓库</a>
            <span class="footer-sep">·</span>
            <a href="https://github.com/LengxiQwQ/playlistout/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">MIT License</a>
            <span class="footer-sep">·</span>
            <span>UI 设计参考 <a href="https://tabler.io" target="_blank" rel="noopener noreferrer">Tabler</a></span>
          </div>
        </footer>
      </main>
    `;

    this.bindEvents();
    if (typeof window !== 'undefined' && window.location.hash) {
      const h = window.location.hash.replace(/^#/, '');
      if (['overview', 'feedback', 'web', 'reliability', 'integrations', 'security', 'dau'].includes(h)) {
        this.currentPage = h;
      }
    }
    this.switchPage(this.currentPage);
    this.setPreset(this.activePreset);
  }

  private bindEvents(): void {
    // Tab switching
    const tabBtns = document.querySelectorAll('.tab');
    tabBtns.forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const page = (btn as HTMLElement).dataset.page || 'overview';
        this.switchPage(page);
      };
    });

    // Feedback tab switching
    const fbBtns = document.querySelectorAll('.fb-tab');
    fbBtns.forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        this.currentFbStatus = (btn as HTMLElement).dataset.fbStatus || 'pending';
        fbBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        this.renderFeedbackView();
      };
    });

    // Feedback sort & error code filter
    const fbSortSel = document.getElementById('feedbackSort') as HTMLSelectElement;
    if (fbSortSel) {
      fbSortSel.onchange = () => {
        this.currentFbSort = fbSortSel.value as 'recent' | 'frequent' | 'oldest_pending';
        this.renderFeedbackView();
      };
    }
    const fbErrSel = document.getElementById('feedbackErrorCode') as HTMLSelectElement;
    if (fbErrSel) {
      fbErrSel.onchange = () => {
        this.currentFbErrorCode = fbErrSel.value;
        this.renderFeedbackView();
      };
    }

    // Exclude MY checkbox
    const excludeMySwitch = document.getElementById('switchExcludeMy') as HTMLInputElement;
    if (excludeMySwitch) {
      excludeMySwitch.onchange = () => {
        this.excludeMy = excludeMySwitch.checked;
        const countrySelect = document.getElementById('filterCountry') as HTMLSelectElement;
        if (this.excludeMy && countrySelect?.value === 'MY') {
          countrySelect.value = '';
        }
        this.applyFilters();
      };
    }

    // Presets
    document.querySelectorAll('.range button').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const r = (btn as HTMLElement).dataset.range || 'all';
        this.setPreset(r);
      };
    });

    // Single Date
    const applySingleDateBtn = document.getElementById('applySingleDateBtn');
    const singleDateInput = document.getElementById('singleDateInput') as HTMLInputElement;
    if (applySingleDateBtn && singleDateInput) {
      applySingleDateBtn.onclick = () => {
        const d = singleDateInput.value;
        if (!d) return;
        this.setDateInputs(d, d);
        this.markPreset('');
        this.applyFilters();
      };
      singleDateInput.onchange = () => {
        const d = singleDateInput.value;
        if (!d) return;
        this.setDateInputs(d, d);
        this.markPreset('');
        this.applyFilters();
      };
    }

    // Filter prev / next day
    const filterPrevBtn = document.getElementById('filterPrevDayBtn');
    if (filterPrevBtn) filterPrevBtn.onclick = () => this.stepDay(-1);
    const filterNextBtn = document.getElementById('filterNextDayBtn');
    if (filterNextBtn) filterNextBtn.onclick = () => this.stepDay(1);

    // Date Range
    const applyDateRangeBtn = document.getElementById('applyDateRangeBtn');
    if (applyDateRangeBtn) {
      applyDateRangeBtn.onclick = () => {
        this.markPreset('');
        this.applyFilters();
      };
    }

    // Dropdowns
    ['filterChannel', 'filterClient', 'filterPlatform', 'filterCountry', 'filterRegion'].forEach((id) => {
      const el = document.getElementById(id) as HTMLSelectElement;
      if (el) {
        el.onchange = () => {
          if (id === 'filterCountry') {
            const reg = document.getElementById('filterRegion') as HTMLSelectElement;
            if (reg) reg.value = '';
          }
          this.applyFilters();
        };
      }
    });

    // Reset button
    const resetBtn = document.getElementById('resetFiltersBtn');
    if (resetBtn) {
      resetBtn.onclick = () => {
        ['filterChannel', 'filterClient', 'filterPlatform', 'filterCountry', 'filterRegion'].forEach((id) => {
          const el = document.getElementById(id) as HTMLSelectElement;
          if (el) el.value = '';
        });
        this.excludeMy = false;
        const sw = document.getElementById('switchExcludeMy') as HTMLInputElement;
        if (sw) sw.checked = false;
        this.setPreset('all');
      };
    }

    // Refresh Cloud Snapshot button
    const refreshBtn = document.getElementById('refreshCloudBtn') as HTMLButtonElement;
    if (refreshBtn) {
      refreshBtn.onclick = async () => {
        if (!this.token || refreshBtn.disabled) return;
        refreshBtn.disabled = true;
        refreshBtn.textContent = '同步中…';
        try {
          this.snapshot = await fetchSnapshot(this.token);
          this.applyFilters();
        } catch (err) {
          alert(`刷新失败：${(err as Error).message}`);
        } finally {
          refreshBtn.disabled = false;
          refreshBtn.textContent = '刷新云端数据';
        }
      };
    }

    // Reload Feedback button
    const reloadFbBtn = document.getElementById('reloadFeedbackBtn');
    if (reloadFbBtn) {
      reloadFbBtn.onclick = () => {
        this.renderFeedbackView();
      };
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        clearAuthToken();
        this.token = null;
        this.snapshot = null;
        this.currentSlice = null;
        this.renderLogin();
      };
    }

    // Forensic Modal
    const modal = document.getElementById('forensicModal');
    const closeBtn = document.getElementById('closeForensicModal');
    if (closeBtn && modal) {
      closeBtn.onclick = () => {
        modal.style.display = 'none';
      };
    }
    if (modal) {
      modal.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
      };
    }

    // View switches
    document.querySelectorAll('.view-switch').forEach((sw) => {
      const target = (sw as HTMLElement).dataset.target;
      if (!target) return;
      sw.querySelectorAll('button').forEach((btn) => {
        btn.onclick = (e) => {
          e.stopPropagation();
          const view = (btn as HTMLElement).dataset.view;
          if (!view || this.chartViews[target] === view) return;
          this.chartViews[target] = view;
          sw.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b === btn));
          this.renderComponent(target);
        };
      });
    });

    // Trend interaction
    const trendBox = document.getElementById('trendBox');
    const trendCanvas = document.getElementById('trendCanvas') as HTMLCanvasElement | null;
    const trendTip = document.getElementById('trendTip');
    if (trendBox && trendCanvas && trendTip) {
      trendBox.addEventListener('mousemove', (e) => {
        const slice = this.currentSlice;
        if (!slice) return;
        const data = slice.hourlyTimeseries.length > 0 ? slice.hourlyTimeseries : slice.timeseries;
        if (!data || data.length === 0) return;

        const rect = trendBox.getBoundingClientRect();
        const padLeft = 40;
        const padRight = 20;
        const plotW = rect.width - padLeft - padRight;
        const mouseX = e.clientX - rect.left;

        if (mouseX < padLeft - 15 || mouseX > rect.width - padRight + 15) {
          trendTip.style.display = 'none';
          this.activeTrendIdx = -1;
          this.drawCanvasChart();
          return;
        }

        const ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / Math.max(1, plotW)));
        const idx = data.length === 1 ? 0 : Math.round(ratio * (data.length - 1));
        this.activeTrendIdx = idx;

        const row = data[idx];
        const ok = Number(row.playlist_success || 0) + Number(row.user_success || 0);
        const fail = Number(row.resolve_failure || 0);
        const total = ok + fail;
        const rate = total > 0 ? ((ok / total) * 100).toFixed(1) + '%' : '0.0%';

        const tipTitle = document.getElementById('tipTitle');
        const tipOk = document.getElementById('tipOk');
        const tipFail = document.getElementById('tipFail');
        const tipRate = document.getElementById('tipRate');

        const label = row.hour !== undefined ? `${row.date || ''} ${row.hour}:00` : String(row.date || '');
        if (tipTitle) tipTitle.textContent = label;
        if (tipOk) tipOk.textContent = fmt(ok);
        if (tipFail) tipFail.textContent = fmt(fail);
        if (tipRate) tipRate.textContent = rate;

        const snapX = data.length === 1 ? padLeft + plotW / 2 : padLeft + (idx / (data.length - 1)) * plotW;
        const mouseY = e.clientY - rect.top;
        trendTip.style.left = `${snapX}px`;
        trendTip.style.top = `${Math.max(20, Math.min(rect.height - 70, mouseY - 15))}px`;
        trendTip.style.display = 'block';

        this.drawCanvasChart();
      });

      trendBox.addEventListener('mouseleave', () => {
        trendTip.style.display = 'none';
        this.activeTrendIdx = -1;
        this.drawCanvasChart();
      });
    }

    // Web Trend interaction
    const webTrendBox = document.getElementById('webTrendBox');
    const webTrendCanvas = document.getElementById('webTrendCanvas') as HTMLCanvasElement | null;
    const webTrendTip = document.getElementById('webTrendTip');
    if (webTrendBox && webTrendCanvas && webTrendTip) {
      webTrendBox.addEventListener('mousemove', (e) => {
        const slice = this.currentSlice;
        if (!slice) return;
        const hasHourly = (slice.webHourlyTimeseries?.length ?? 0) > 0;
        const data = hasHourly ? slice.webHourlyTimeseries! : slice.webTimeseries;
        if (!data || data.length === 0) return;

        const rect = webTrendBox.getBoundingClientRect();
        const padLeft = 45;
        const padRight = 20;
        const plotW = rect.width - padLeft - padRight;
        const mouseX = e.clientX - rect.left;

        if (mouseX < padLeft - 15 || mouseX > rect.width - padRight + 15) {
          webTrendTip.style.display = 'none';
          this.activeWebTrendIdx = -1;
          this.drawWebTrendChart();
          return;
        }

        const ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / Math.max(1, plotW)));
        const idx = data.length === 1 ? 0 : Math.round(ratio * (data.length - 1));
        this.activeWebTrendIdx = idx;

        const row = data[idx];
        const prevData = hasHourly ? slice.previousWebHourlyTimeseries : slice.previousWebTimeseries;
        const prevRow = prevData && prevData[idx];

        const pv = Number(row.page_view || 0);
        const uv = Number(row.visitor_unique || 0);
        const prevPv = prevRow ? Number(prevRow.page_view || 0) : null;
        const prevUv = prevRow ? Number(prevRow.visitor_unique || 0) : null;

        const label = row.hour !== undefined ? `${row.date || ''} ${row.hour}:00` : String(row.date || '');

        let compHtml = '';
        if (this.webCompareMode && prevRow) {
          const pvDiff = pv - (prevPv ?? 0);
          const uvDiff = uv - (prevUv ?? 0);
          compHtml = `
            <div style="border-top:1px solid var(--l);margin-top:6px;padding-top:6px;font-size:11px">
              <div class="chart-tooltip-row"><span class="muted">上期基准 PV:</span><strong>${fmt(prevPv ?? 0)} (${pvDiff >= 0 ? '+' : ''}${fmt(pvDiff)})</strong></div>
              <div class="chart-tooltip-row"><span class="muted">上期基准 UV:</span><strong>${fmt(prevUv ?? 0)} (${uvDiff >= 0 ? '+' : ''}${fmt(uvDiff)})</strong></div>
            </div>
          `;
        }

        webTrendTip.innerHTML = `
          <div style="font-weight:700;margin-bottom:4px;color:var(--t)">${esc(label)} 官网流量</div>
          <div class="chart-tooltip-row"><span style="color:#206bc4">● 页面访问量 (PV):</span><strong>${fmt(pv)}</strong></div>
          <div class="chart-tooltip-row"><span style="color:#10b981">● 日去重访客 (UV):</span><strong>${fmt(uv)}</strong></div>
          ${compHtml}
        `;

        const snapX = data.length === 1 ? padLeft + plotW / 2 : padLeft + (idx / (data.length - 1)) * plotW;
        const mouseY = e.clientY - rect.top;
        webTrendTip.style.left = `${snapX}px`;
        webTrendTip.style.top = `${Math.max(20, Math.min(rect.height - 70, mouseY - 15))}px`;
        webTrendTip.style.display = 'block';

        this.drawWebTrendChart();
      });

      webTrendBox.addEventListener('mouseleave', () => {
        webTrendTip.style.display = 'none';
        this.activeWebTrendIdx = -1;
        this.drawWebTrendChart();
      });
    }

    // Web Compare Toggle
    const webCompareToggle = document.getElementById('webCompareToggle');
    const webCompareLegend = document.getElementById('webCompareLegend');
    if (webCompareToggle) {
      webCompareToggle.onclick = () => {
        this.webCompareMode = !this.webCompareMode;
        webCompareToggle.textContent = `⚖️ 对比上期: ${this.webCompareMode ? '开' : '关'}`;
        webCompareToggle.style.background = this.webCompareMode ? 'color-mix(in srgb,var(--a) 15%,var(--p))' : 'var(--p)';
        webCompareToggle.style.borderColor = this.webCompareMode ? 'var(--a)' : 'var(--l)';
        if (webCompareLegend) {
          webCompareLegend.style.display = this.webCompareMode ? 'inline-flex' : 'none';
        }
        this.drawWebTrendChart();
      };
    }

    // Web Geo Drilldown Tabs
    const geoCountryBtn = document.getElementById('geoTabCountryBtn');
    const geoRegionBtn = document.getElementById('geoTabRegionBtn');
    const geoBackBtn = document.getElementById('geoBackToCountryBtn');
    const geoCountryCont = document.getElementById('webGeoCountryContainer');
    const geoRegionCont = document.getElementById('webGeoRegionContainer');

    const switchGeoView = (toRegion: boolean) => {
      if (geoCountryBtn) geoCountryBtn.classList.toggle('active', !toRegion);
      if (geoRegionBtn) geoRegionBtn.classList.toggle('active', toRegion);
      if (geoCountryCont) geoCountryCont.style.display = toRegion ? 'none' : 'block';
      if (geoRegionCont) geoRegionCont.style.display = toRegion ? 'block' : 'none';
    };

    if (geoCountryBtn) geoCountryBtn.onclick = () => switchGeoView(false);
    if (geoRegionBtn) geoRegionBtn.onclick = () => switchGeoView(true);
    if (geoBackBtn) geoBackBtn.onclick = () => switchGeoView(false);

    // DAU Trend interaction
    const dauBox = document.getElementById('dauTrendBox');
    const dauTip = document.getElementById('dauTrendTip');
    if (dauBox && dauTip) {
      dauBox.addEventListener('mousemove', (e) => {
        const slice = this.currentSlice;
        if (!slice) return;
        const dau = slice.dau;

        const rect = dauBox.getBoundingClientRect();
        const padLeft = 45;
        const padRight = 25;
        const plotW = rect.width - padLeft - padRight;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        if (mouseX < padLeft - 10 || mouseX > rect.width - padRight + 10) {
          dauTip.style.display = 'none';
          this.activeDauIdx = -1;
          this.activeDauHour = -1;
          this.drawDauChart();
          return;
        }

        const ratio = Math.max(0, Math.min(1, (mouseX - padLeft) / Math.max(1, plotW)));
        const tipTitle = document.getElementById('dauTipTitle');
        const tipContent = document.getElementById('dauTipContent');

        if (dau.isSingleDay) {
          const hour = Math.round(ratio * 23);
          this.activeDauHour = hour;
          this.activeDauIdx = -1;

          const targetPts = dau.singleDay?.targetCumulative || dau.targetCumulative || [];
          const pt = targetPts[hour];
          const localHour = (hour + 8) % 24;

          if (tipTitle) {
            tipTitle.textContent = `UTC ${String(hour).padStart(2, '0')}:00 (北京时间 ${String(localHour).padStart(2, '0')}:00)`;
          }

          if (tipContent) {
            let compDeltaStr = '';
            if (pt?.targetTotal != null && pt?.comparisonTotal != null) {
              const diff = pt.targetTotal - pt.comparisonTotal;
              const pct = pt.comparisonTotal > 0 ? ((diff / pt.comparisonTotal) * 100).toFixed(1) : '—';
              compDeltaStr = `<div class="chart-tooltip-row"><span class="muted">同期对比:</span><strong style="color:${diff >= 0 ? 'var(--g)' : 'var(--r)'}">${diff >= 0 ? '+' : ''}${fmt(diff)} (${diff >= 0 ? '+' : ''}${pct}%)</strong></div>`;
            }

            tipContent.innerHTML = `
              <div class="chart-tooltip-row"><span style="color:#0284c7">当日累计:</span><strong>${pt?.targetTotal != null ? fmt(pt.targetTotal) + ' 人次' : '未发生 (未来时段)'}</strong></div>
              <div class="chart-tooltip-row"><span style="color:#64748b">对比同期:</span><strong>${pt?.comparisonTotal != null ? fmt(pt.comparisonTotal) + ' 人次' : '—'}</strong></div>
              ${compDeltaStr}
              ${
                pt?.targetTotal != null
                  ? `
                <div style="border-top:1px solid var(--l);margin-top:4px;padding-top:4px;font-size:10px;color:var(--m)">
                  Web: ${fmt(pt.targetWeb ?? 0)} · 插件: ${fmt(pt.targetPlugin ?? 0)} · CLI: ${fmt(pt.targetCli ?? 0)}
                </div>
              `
                  : ''
              }
            `;
          }

          const snapX = padLeft + (hour / 23) * plotW;
          dauTip.style.left = `${snapX}px`;
          dauTip.style.top = `${Math.max(20, Math.min(rect.height - 70, mouseY - 15))}px`;
          dauTip.style.display = 'block';
          this.drawDauChart();
        } else {
          const data = dau.series;
          if (data.length === 0) return;
          const idx = data.length === 1 ? 0 : Math.round(ratio * (data.length - 1));
          this.activeDauIdx = idx;
          this.activeDauHour = -1;

          const row = data[idx];
          const prevPt = dau.multiDay?.previousPeriodSeries?.[idx];
          if (tipTitle) tipTitle.textContent = `${row.date} 活跃人次`;
          if (tipContent) {
            tipContent.innerHTML = `
              <div class="chart-tooltip-row"><span style="color:#f97316">总活跃:</span><strong>${fmt(row.total)} 人次</strong></div>
              <div class="chart-tooltip-row"><span style="color:#0284c7">网页端:</span><strong>${row.webUncollected ? '未采集' : fmt(row.web)}</strong></div>
              <div class="chart-tooltip-row"><span style="color:#8b5cf6">插件端:</span><strong>${row.pluginUncollected ? '未采集' : fmt(row.plugin)}</strong></div>
              <div class="chart-tooltip-row"><span style="color:#10b981">CLI 终端:</span><strong>${row.cliUncollected ? '未采集' : fmt(row.cli)}</strong></div>
              ${row.ma7 != null ? `<div class="chart-tooltip-row"><span style="color:#f59e0b">7日均线:</span><strong>${fmt(row.ma7)}</strong></div>` : ''}
              ${prevPt ? `<div class="chart-tooltip-row"><span style="color:#64748b">上一周期:</span><strong>${fmt(prevPt.total)} (${prevPt.date})</strong></div>` : ''}
              <div style="font-size:10px;color:#0284c7;margin-top:6px;border-top:1px solid var(--l);padding-top:3px">💡 点击下钻查看此单日详情</div>
            `;
          }

          const snapX = data.length === 1 ? padLeft + plotW / 2 : padLeft + (idx / (data.length - 1)) * plotW;
          dauTip.style.left = `${snapX}px`;
          dauTip.style.top = `${Math.max(20, Math.min(rect.height - 70, mouseY - 15))}px`;
          dauTip.style.display = 'block';
          this.drawDauChart();
        }
      });

      dauBox.addEventListener('mouseleave', () => {
        dauTip.style.display = 'none';
        this.activeDauIdx = -1;
        this.activeDauHour = -1;
        this.drawDauChart();
      });

      dauBox.addEventListener('click', () => {
        const slice = this.currentSlice;
        if (!slice || slice.dau.isSingleDay) return;
        const data = slice.dau.series;
        if (this.activeDauIdx >= 0 && this.activeDauIdx < data.length) {
          const clickedDate = data[this.activeDauIdx]?.date;
          if (clickedDate) {
            this.setDateInputs(clickedDate, clickedDate);
            this.markPreset('');
            this.applyFilters();
          }
        }
      });
    }

    // Semantics Modal
    const semanticsBtn = document.getElementById('dauSemanticsBtn');
    const semanticsModal = document.getElementById('dauSemanticsModal');
    const closeSemanticsBtn = document.getElementById('closeDauSemanticsBtn');
    if (semanticsBtn && semanticsModal) {
      semanticsBtn.onclick = () => {
        semanticsModal.style.display = 'flex';
      };
    }
    if (closeSemanticsBtn && semanticsModal) {
      closeSemanticsBtn.onclick = () => {
        semanticsModal.style.display = 'none';
      };
    }
    if (semanticsModal) {
      semanticsModal.onclick = (e) => {
        if (e.target === semanticsModal) semanticsModal.style.display = 'none';
      };
    }

    window.addEventListener('resize', () => {
      if (this.currentPage === 'overview') {
        this.drawCanvasChart();
      } else if (this.currentPage === 'web') {
        this.drawWebTrendChart();
      } else if (this.currentPage === 'dau') {
        this.drawDauChart();
      }
    });
  }

  private switchPage(page: string): void {
    this.currentPage = page;
    document.querySelectorAll('.tab').forEach((tab) => {
      tab.classList.toggle('active', (tab as HTMLElement).dataset.page === page);
    });
    document.querySelectorAll('.page').forEach((pg) => {
      pg.classList.toggle('active', pg.id === `page-${page}`);
    });

    if (window.scrollY > 150) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    if (typeof window !== 'undefined' && window.location.hash !== `#${page}`) {
      history.replaceState(null, '', `#${page}`);
    }

    const caps = PAGE_FILTER_CAPABILITIES[page] || { supportedDimensions: [], scopeNote: '' };
    const supported = new Set(caps.supportedDimensions);

    // Update Scope Note
    const scopeNoteEl = document.getElementById('filterScopeNote');
    if (scopeNoteEl) {
      scopeNoteEl.textContent = caps.scopeNote || '';
      scopeNoteEl.style.display = caps.scopeNote ? 'inline-block' : 'none';
    }

    let needsRefilter = false;

    // Toggle filter fields based on page capabilities and clear unsupported values
    const filterFields: Record<FilterDimension, { field: HTMLElement | null; select: HTMLSelectElement | null }> = {
      channel: {
        field: document.querySelector('.field[data-filter="channel"]'),
        select: document.getElementById('filterChannel') as HTMLSelectElement | null,
      },
      client: {
        field: document.querySelector('.field[data-filter="client"]'),
        select: document.getElementById('filterClient') as HTMLSelectElement | null,
      },
      platform: {
        field: document.querySelector('.field[data-filter="platform"]'),
        select: document.getElementById('filterPlatform') as HTMLSelectElement | null,
      },
      country: {
        field: document.querySelector('.field[data-filter="country"]'),
        select: document.getElementById('filterCountry') as HTMLSelectElement | null,
      },
      region: {
        field: document.querySelector('.field[data-filter="region"]'),
        select: document.getElementById('filterRegion') as HTMLSelectElement | null,
      },
    };

    for (const [dim, { field, select }] of Object.entries(filterFields) as [FilterDimension, { field: HTMLElement | null; select: HTMLSelectElement | null }][]) {
      const isSupported = supported.has(dim);
      if (field) {
        field.style.display = isSupported ? '' : 'none';
      }
      if (!isSupported && select && select.value) {
        select.value = '';
        needsRefilter = true;
      }
    }

    // Reset button visibility
    const resetField = document.querySelector('.field[data-filter="reset"]') as HTMLElement | null;
    if (resetField) {
      resetField.style.display = caps.supportedDimensions.length > 0 ? '' : 'none';
    }

    // Preserve DAU's special channel options
    const channelSelect = filterFields.channel.select;
    if (page === 'dau') {
      if (channelSelect) {
        const curVal = channelSelect.value;
        channelSelect.innerHTML = `
          <option value="">全部渠道 (活跃度有效)</option>
          <option value="web" ${curVal === 'web' ? 'selected' : ''}>网页端 (Web)</option>
          <option value="plugin" ${curVal === 'plugin' ? 'selected' : ''}>播放器插件 (Plugin)</option>
          <option value="cli" ${curVal === 'cli' ? 'selected' : ''}>命令行 (CLI)</option>
        `;
        if (curVal !== '' && curVal !== 'web' && curVal !== 'plugin' && curVal !== 'cli') {
          channelSelect.value = '';
          needsRefilter = true;
        }
      }
    } else {
      if (channelSelect && channelSelect.options.length <= 4) {
        const curVal = channelSelect.value;
        channelSelect.innerHTML = `
          <option value="">全部渠道</option>
          <option value="web" ${curVal === 'web' ? 'selected' : ''}>网页端 (Web)</option>
          <option value="cli" ${curVal === 'cli' ? 'selected' : ''}>命令行 (CLI)</option>
          <option value="plugin" ${curVal === 'plugin' ? 'selected' : ''}>播放器插件 (Plugin)</option>
          <option value="api" ${curVal === 'api' ? 'selected' : ''}>开放接口 (API)</option>
          <option value="legacy_mixed" ${curVal === 'legacy_mixed' ? 'selected' : ''}>历史混合渠道 (Legacy V1)</option>
        `;
      }
    }

    if (needsRefilter) {
      this.applyFilters();
    } else {
      this.renderChips(this.getFilterParams());
    }

    if (page === 'overview') {
      requestAnimationFrame(() => this.drawCanvasChart());
    } else if (page === 'web') {
      this.renderWebTab();
      requestAnimationFrame(() => this.drawWebTrendChart());
    } else if (page === 'feedback') {
      this.renderFeedbackView();
    } else if (page === 'security') {
      this.renderSecurityView();
    } else if (page === 'dau') {
      this.renderDauTab();
      requestAnimationFrame(() => this.drawDauChart());
    }
  }

  private markPreset(name: string): void {
    this.activePreset = name;
    document.querySelectorAll('.range button').forEach((b) => {
      b.classList.toggle('active', (b as HTMLElement).dataset.range === name);
    });
  }

  private isoDayOffset(offset: number): string {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  }

  private shiftDateStr(dateStr: string, offsetDays: number): string {
    if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return this.isoDayOffset(offsetDays);
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    dt.setUTCDate(dt.getUTCDate() + offsetDays);
    return dt.toISOString().slice(0, 10);
  }

  private stepDay(offset: number): void {
    const f = (document.getElementById('fromDateInput') as HTMLInputElement)?.value || '';
    const t = (document.getElementById('toDateInput') as HTMLInputElement)?.value || '';
    const curSingle = (document.getElementById('singleDateInput') as HTMLInputElement)?.value || '';
    const range = this.currentSlice?.availableDateRange;
    let baseDate = '';
    if (curSingle) {
      baseDate = curSingle;
    } else if (f && t && f === t) {
      baseDate = f;
    } else if (offset > 0) {
      baseDate = f || range?.from || this.isoDayOffset(-1);
    } else {
      baseDate = t || range?.to || this.isoDayOffset(0);
    }
    let target = this.shiftDateStr(baseDate, offset);
    if (range?.from && target < range.from) target = range.from;
    const maxDay = this.isoDayOffset(0);
    if (target > maxDay) target = maxDay;
    this.setDateInputs(target, target);
    if (target === this.isoDayOffset(0)) this.markPreset('today');
    else if (target === this.isoDayOffset(-1)) this.markPreset('yesterday');
    else if (target === this.isoDayOffset(-2)) this.markPreset('daybefore');
    else if (target === this.isoDayOffset(-3)) this.markPreset('day3');
    else this.markPreset('');
    this.applyFilters();
  }

  private setDateInputs(from: string, to: string): void {
    const f = document.getElementById('fromDateInput') as HTMLInputElement;
    const t = document.getElementById('toDateInput') as HTMLInputElement;
    const s = document.getElementById('singleDateInput') as HTMLInputElement;
    const max = this.isoDayOffset(0);

    if (f) { f.max = max; f.value = from || ''; }
    if (t) { t.max = max; t.value = to || ''; }
    if (s) { s.max = max; s.value = (from && from === to) ? from : ''; }
  }

  private setPreset(name: string): void {
    let to = this.isoDayOffset(0);
    let from = to;
    if (name === 'today') {
      from = to = this.isoDayOffset(0);
    } else if (name === 'yesterday') {
      from = to = this.isoDayOffset(-1);
    } else if (name === 'daybefore') {
      from = to = this.isoDayOffset(-2);
    } else if (name === 'day3') {
      from = to = this.isoDayOffset(-3);
    } else if (name === '7') {
      from = this.isoDayOffset(-6);
    } else if (name === '30') {
      from = this.isoDayOffset(-29);
    } else if (name === 'all') {
      from = '';
      to = '';
    }

    this.setDateInputs(from, to);
    this.markPreset(name);
    this.applyFilters();
  }

  private getFilterParams(page = this.currentPage) {
    const f = (document.getElementById('fromDateInput') as HTMLInputElement)?.value || '';
    const t = (document.getElementById('toDateInput') as HTMLInputElement)?.value || '';
    const raw = {
      from: f,
      to: t,
      channel: (document.getElementById('filterChannel') as HTMLSelectElement)?.value || '',
      client: (document.getElementById('filterClient') as HTMLSelectElement)?.value || '',
      platform: (document.getElementById('filterPlatform') as HTMLSelectElement)?.value || '',
      country: (document.getElementById('filterCountry') as HTMLSelectElement)?.value || '',
      region: (document.getElementById('filterRegion') as HTMLSelectElement)?.value || '',
      exclude_my: this.excludeMy,
    };
    return resolvePageFilterParams(raw, page);
  }

  private applyFilters(): void {
    if (!this.snapshot) return;

    const params = this.getFilterParams();
    this.currentSlice = buildAnalyticsSlice(this.snapshot, params);

    // Update updated time string and health dot
    const dq = this.currentSlice.dataQuality;
    const snapEl = document.getElementById('snapTime');
    const latestEl = document.getElementById('latestDate');
    if (snapEl && latestEl) {
      snapEl.textContent = this.snapshot.generatedAt ? new Date(this.snapshot.generatedAt).toLocaleString() : '—';
      latestEl.textContent = dq?.latestDate || '—';
    } else {
      const updatedEl = document.getElementById('updatedTime');
      if (updatedEl) {
        const genAt = this.snapshot.generatedAt;
        updatedEl.textContent = genAt ? `快照时间: ${new Date(genAt).toLocaleString()}` : '快照已载入';
      }
    }

    const healthBadge = document.getElementById('healthBadge');
    if (healthBadge) {
      const isGood = dq?.status === 'healthy';
      healthBadge.className = `health-dot ${isGood ? 'good' : 'bad'}`;
      healthBadge.title = isGood ? '数据健康 (Data Healthy)' : '数据完整性异常 (Data Integrity Error)';
    }

    // Populate dynamic filter options if select is empty
    this.populateSelect('filterClient', this.currentSlice.availableFilters.clients, params.client || '');
    this.populateSelect('filterCountry', this.currentSlice.availableFilters.countries, params.country || '');
    this.populateSelect('filterRegion', this.currentSlice.availableFilters.regions, params.region || '');

    this.renderChips(params);
    this.renderOverviewTab();
    this.renderUsageTab();
    this.renderWebTab();
    this.renderReliabilityTab();
    this.renderIntegrationsTab();
    this.renderDauTab();
    this.renderFeedbackView();
    this.renderSecurityView();

    if (this.currentPage === 'overview') {
      requestAnimationFrame(() => this.drawCanvasChart());
    } else if (this.currentPage === 'web') {
      requestAnimationFrame(() => this.drawWebTrendChart());
    } else if (this.currentPage === 'dau') {
      requestAnimationFrame(() => this.drawDauChart());
    }
  }

  private populateSelect(id: string, items: CountItem[], currentVal: string): void {
    const el = document.getElementById(id) as HTMLSelectElement;
    if (!el) return;
    const selected = currentVal || el.value;
    const opts = ['<option value="">全部</option>'];
    for (const it of items) {
      const isSel = it.name === selected ? 'selected' : '';
      const label = formatHumanLabel(it.name);
      opts.push(`<option value="${esc(it.name)}" ${isSel}>${esc(label)} (${fmt(it.count)})</option>`);
    }
    el.innerHTML = opts.join('');
  }

  private renderChips(params: FilterParams): void {
    const chipsDiv = document.getElementById('filterChips');
    if (!chipsDiv || !this.currentSlice) return;

    const items: string[] = [];
    if (params.from && params.to) {
      items.push(`📅 ${params.from} ~ ${params.to}`);
    }
    if (params.channel) items.push(`渠道: ${formatHumanLabel(String(params.channel))}`);
    if (params.client) items.push(`端: ${formatHumanLabel(String(params.client))}`);
    if (params.platform) items.push(`平台: ${formatHumanLabel(String(params.platform))}`);
    if (params.country) items.push(`国家: ${formatHumanLabel(String(params.country))}`);
    if (params.region) items.push(`地区: ${formatHumanLabel(String(params.region))}`);

    const headDateDisp = document.getElementById('headDateDisplay');
    if (headDateDisp) {
      if (this.activePreset === 'all') {
        headDateDisp.textContent = '全部历史';
      } else if (params.from && params.to && params.from === params.to) {
        headDateDisp.textContent = String(params.from);
      } else if (params.from && params.to) {
        headDateDisp.textContent = `${String(params.from).slice(5)} ~ ${String(params.to).slice(5)}`;
      } else {
        headDateDisp.textContent = '全部历史';
      }
    }

    chipsDiv.innerHTML = items.map((t) => `<span class="chip">${esc(t)}</span>`).join('');
  }

  private renderBars(
    targetId: string,
    items: CountItem[],
    totalOverride?: number,
    colorOverride?: string,
    labelFormatter?: (name: string) => string,
  ): void {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.className = 'bars';
    if (!items || items.length === 0) {
      el.innerHTML = '<div style="color:var(--m);padding:8px 0;font-size:12px">暂无匹配数据</div>';
      return;
    }

    const total = totalOverride || items.reduce((acc, it) => acc + it.count, 0) || 1;
    const html = items
      .map((it) => {
        const p = Math.min(100, Math.round((it.count / total) * 1000) / 10);
        const color = colorOverride || getBrandColor(it.name);
        const label = labelFormatter ? labelFormatter(it.name) : formatHumanLabel(it.name);
        return `
          <div class="bar">
            <div class="bn" title="${esc(label)}">
              <span class="b-dot" style="background:${color}"></span>
              <span>${esc(label)}</span>
            </div>
            <div class="track"><div class="fill" style="width:${p}%;background:${color}"></div></div>
            <div class="num"><span class="val">${fmt(it.count)}</span><span class="pct">${p}%</span></div>
          </div>
        `;
      })
      .join('');
    el.innerHTML = html;
  }

  private donutChart(
    targetId: string,
    items: CountItem[],
    totalOverride?: number,
    colorOverride?: string,
    labelFormatter?: (name: string) => string,
  ): void {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.className = '';
    const a = (items || []).filter((x) => Number(x.count || 0) > 0);
    if (a.length === 0) {
      el.innerHTML = '<div style="color:var(--m);padding:14px 0;font-size:12px;text-align:center">暂无数据</div>';
      return;
    }
    const total = totalOverride || a.reduce((s, x) => s + Number(x.count || 0), 0) || 1;
    const r = 55;
    const circ = 2 * Math.PI * r;
    let currentAngle = 0;
    let slicesHtml = '';
    let legendHtml = '';

    a.forEach((item, idx) => {
      const count = Number(item.count || 0);
      const ratio = count / total;
      const strokeDash = (ratio * circ).toFixed(2);
      const startAngle = currentAngle;
      currentAngle += ratio * 360;
      const c = colorOverride || getBrandColor(item.name);
      const rawLbl = labelFormatter ? labelFormatter(item.name) : formatHumanLabel(item.name);
      const pctStr = (ratio * 100).toFixed(1) + '%';
      slicesHtml += `<circle class="donut-slice" cx="80" cy="80" r="${r}" fill="none" stroke="${c}" stroke-width="22" stroke-dasharray="${strokeDash} ${circ.toFixed(2)}" transform="rotate(${startAngle.toFixed(2)} 80 80)" data-idx="${idx}" data-val="${fmt(count)}" data-pct="${pctStr}" data-lbl="${esc(rawLbl)}"></circle>`;
      legendHtml += `
        <div class="donut-item" data-idx="${idx}" data-val="${fmt(count)}" data-pct="${pctStr}" data-lbl="${esc(rawLbl)}">
          <div class="donut-item-left" title="${esc(item.name)}"><span class="b-dot" style="background:${c}"></span><span>${esc(rawLbl)}</span></div>
          <div class="donut-item-right"><span class="val">${fmt(count)}</span><span class="pct">${pctStr}</span></div>
        </div>
      `;
    });

    el.innerHTML = `
      <div class="donut-wrap">
        <div class="donut-graphic">
          <svg class="donut-svg" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="${r}" fill="none" stroke="var(--l)" stroke-width="22" opacity="0.35"></circle>
            ${slicesHtml}
          </svg>
          <div class="donut-center">
            <div class="donut-center-val">${fmt(total)}</div>
            <div class="donut-center-lbl">总计</div>
          </div>
        </div>
        <div class="donut-legend">${legendHtml}</div>
      </div>
    `;

    const centerVal = el.querySelector('.donut-center-val') as HTMLElement;
    const centerLbl = el.querySelector('.donut-center-lbl') as HTMLElement;
    const slices = el.querySelectorAll('.donut-slice') as NodeListOf<SVGCircleElement>;
    const legItems = el.querySelectorAll('.donut-item') as NodeListOf<HTMLElement>;
    const legendEl = el.querySelector('.donut-legend') as HTMLElement | null;

    const setFocus = (val: string, p: string, lbl: string) => {
      if (centerVal) centerVal.textContent = p;
      if (centerLbl) centerLbl.textContent = `${lbl} · ${val}`;
    };
    const resetFocus = () => {
      if (centerVal) centerVal.textContent = fmt(total);
      if (centerLbl) centerLbl.textContent = '总计';
      slices.forEach((s) => {
        s.style.opacity = '1';
        s.style.strokeWidth = '22';
      });
      legItems.forEach((it) => (it.style.background = 'transparent'));
    };

    slices.forEach((s) => {
      s.addEventListener('mouseenter', () => {
        slices.forEach((o) => {
          o.style.opacity = o === s ? '1' : '0.4';
          o.style.strokeWidth = o === s ? '26' : '22';
        });
        legItems.forEach((it) => (it.style.background = it.dataset.idx === s.dataset.idx ? 'color-mix(in srgb,var(--p) 85%,var(--a))' : 'transparent'));
        setFocus(s.dataset.val || '', s.dataset.pct || '', s.dataset.lbl || '');
      });
      s.addEventListener('mouseleave', resetFocus);
    });

    legItems.forEach((it) => {
      it.addEventListener('mouseenter', () => {
        const idx = it.dataset.idx;
        slices.forEach((s) => {
          s.style.opacity = s.dataset.idx === idx ? '1' : '0.4';
          s.style.strokeWidth = s.dataset.idx === idx ? '26' : '22';
        });
        legItems.forEach((other) => {
          other.style.background = other === it ? 'color-mix(in srgb,var(--p) 85%,var(--a))' : 'transparent';
        });
        setFocus(it.dataset.val || '', it.dataset.pct || '', it.dataset.lbl || '');
      });
    });

    if (legendEl) {
      legendEl.addEventListener('mouseleave', () => {
        slices.forEach((s) => (s.style.strokeWidth = '22'));
        resetFocus();
      });
    }
  }


  private rankedTable(
    targetId: string,
    items: CountItem[],
    valLabel = '数量',
    labelFormatter?: (name: string) => string,
  ): void {
    const el = document.getElementById(targetId);
    if (!el) return;
    el.className = '';
    const a = items || [];
    if (a.length === 0) {
      el.innerHTML = '<div style="color:var(--m);padding:14px 0;text-align:center;font-size:12px">暂无数据</div>';
      return;
    }
    const total = a.reduce((s, x) => s + Number(x.count || 0), 0) || 1;
    const max = Math.max(...a.map((x) => Number(x.count || 0)), 1);
    const rowsHtml = a
      .map((x, idx) => {
        const rank = idx + 1;
        const badgeCls = rank === 1 ? 'top1' : rank === 2 ? 'top2' : rank === 3 ? 'top3' : '';
        const c = getBrandColor(x.name);
        const lbl = labelFormatter ? labelFormatter(x.name) : formatHumanLabel(x.name);
        const count = Number(x.count || 0);
        const p = (count / total * 100).toFixed(1) + '%';
        const trackW = Math.max(2, Math.round((count / max) * 100));
        return `
          <tr>
            <td style="width:36px;text-align:center"><span class="rank-badge ${badgeCls}">#${rank}</span></td>
            <td><div style="display:flex;align-items:center;gap:6px"><span class="b-dot" style="background:${c}"></span><span style="font-weight:600;color:var(--t)">${esc(lbl)}</span><span class="muted" style="font-size:10.5px;font-family:var(--mono)">${esc(x.name)}</span></div></td>
            <td style="width:130px"><div style="display:flex;align-items:center;gap:6px"><div class="track" style="flex:1;height:6px"><div class="fill" style="width:${trackW}%;background:${c}"></div></div><span class="muted" style="font-size:10.5px;font-family:var(--mono);min-width:38px;text-align:right">${p}</span></div></td>
            <td style="width:90px;text-align:right;font-family:var(--mono);font-weight:700">${fmt(count)}</td>
          </tr>
        `;
      })
      .join('');
    el.innerHTML = `
      <div class="ranked-table-wrap"><table class="ranked-table">
        <thead><tr><th style="width:36px;text-align:center">#</th><th>对象名称</th><th style="width:130px">占比分布</th><th style="width:90px;text-align:right">${esc(valLabel)}</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table></div>
    `;
  }

  private renderComponent(key: string): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;
    const env = this.currentSlice.environment;
    const d = this.currentSlice.distributions;
    const geo = this.currentSlice.geo;

    if (key === 'trend') {
      this.drawCanvasChart();
    } else if (key === 'webTrend') {
      this.drawWebTrendChart();
    } else if (key === 'platform') {
      if (this.chartViews['platform'] === 'donut') this.donutChart('platformBars', d.platforms);
      else this.renderBars('platformBars', d.platforms);
    } else if (key === 'client') {
      if (this.chartViews['client'] === 'donut') this.donutChart('clientBars', d.clients);
      else this.renderBars('clientBars', d.clients);
    } else if (key === 'country') {
      if (this.chartViews['country'] === 'table') this.rankedTable('countryBars', geo.countries, '独立访客 (UV)');
      else this.renderBars('countryBars', geo.countries);
    } else if (key === 'region') {
      if (this.chartViews['region'] === 'table') this.rankedTable('regionBars', geo.regions, '独立访客 (UV)');
      else this.renderBars('regionBars', geo.regions);
    } else if (key === 'device') {
      if (this.chartViews['device'] === 'donut') this.donutChart('deviceBars', env.devices, undefined, undefined, formatDeviceLabel);
      else this.renderBars('deviceBars', env.devices, undefined, undefined, formatDeviceLabel);
    } else if (key === 'latency') {
      if (this.chartViews['latency'] === 'donut') this.donutChart('latencyBars', b['latency_bucket'] || []);
      else this.renderBars('latencyBars', b['latency_bucket'] || []);
    } else if (key === 'exportFormat') {
      if (this.chartViews['exportFormat'] === 'donut') this.donutChart('exportFormatBars', b['export_format'] || []);
      else this.renderBars('exportFormatBars', b['export_format'] || []);
    } else if (key === 'clipboard') {
      if (this.chartViews['clipboard'] === 'donut') this.donutChart('clipboardModeBars', b['clipboard_mode'] || []);
      else this.renderBars('clipboardModeBars', b['clipboard_mode'] || []);
    } else if (key === 'requestedType') {
      if (this.chartViews['requestedType'] === 'donut') this.donutChart('requestedTypeBars', b['requested_type'] || []);
      else this.renderBars('requestedTypeBars', b['requested_type'] || []);
    } else if (key === 'webCountry') {
      const list = this.currentSlice.webGeo?.countries || geo.countries;
      if (this.chartViews['webCountry'] === 'table') this.rankedTable('webCountryBars', list, '独立访客 (UV)');
      else this.renderBars('webCountryBars', list);
    } else if (key === 'webRegion') {
      const list = this.currentSlice.webGeo?.regions || geo.regions;
      if (this.chartViews['webRegion'] === 'table') this.rankedTable('webRegionBars', list, '独立访客 (UV)');
      else this.renderBars('webRegionBars', list);
    }
  }

  private renderOverviewTab(): void {
    if (!this.currentSlice) return;
    const ov = this.currentSlice.overview;
    const dq = this.currentSlice.dataQuality;
    const prev = this.currentSlice.previousOverview;

    // 1. Action Alerts Banner
    const alertsEl = document.getElementById('overviewAlerts');
    if (alertsEl) {
      const alertItems: string[] = [];
      if (ov.pending_feedback > 0) {
        alertItems.push(`
          <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb,var(--r) 10%,var(--p));border:1px solid var(--r);border-radius:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">🐛</span>
              <span><strong>待审歌单待处理:</strong> 发现 <strong>${ov.pending_feedback}</strong> 条用户上报失败歌单，需排查修复。</span>
            </div>
            <button class="ghost btn-sm" data-action-jump="feedback" style="cursor:pointer;color:var(--r);font-weight:600">前往排查处理 ▶</button>
          </div>
        `);
      }
      if (dq.status === 'error') {
        const badCount = dq.checks.filter((c) => !c.ok).length;
        alertItems.push(`
          <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb,var(--w) 12%,var(--p));border:1px solid var(--w);border-radius:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">🚨</span>
              <span><strong>数据守恒告警:</strong> 发现 <strong>${badCount}</strong> 项守恒校验未通过，数据可能存在断层或双重统计。</span>
            </div>
            <button class="ghost btn-sm" data-action-expand-dq="true" style="cursor:pointer;color:var(--w);font-weight:600">展开核验详情 ▼</button>
          </div>
        `);
      }
      if (ov.resolve_request > 0 && ov.success_rate < 80) {
        alertItems.push(`
          <div class="card" style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:color-mix(in srgb,var(--w) 10%,var(--p));border:1px solid var(--w);border-radius:6px">
            <div style="display:flex;align-items:center;gap:8px">
              <span style="font-size:16px">⚠️</span>
              <span><strong>解析成功率偏低:</strong> 当前成功率仅 <strong>${pct(ov.success_rate)}</strong>，低于 80% 预警阈值。</span>
            </div>
            <button class="ghost btn-sm" data-action-jump="reliability" style="cursor:pointer;color:var(--w);font-weight:600">查看失败链路 ▶</button>
          </div>
        `);
      }
      alertsEl.innerHTML = alertItems.join('');
      alertsEl.style.display = alertItems.length > 0 ? 'flex' : 'none';
      alertsEl.style.flexDirection = 'column';
      alertsEl.style.gap = '8px';

      alertsEl.querySelectorAll('[data-action-jump]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const target = (btn as HTMLElement).dataset.actionJump;
          if (target) this.switchPage(target);
        });
      });
      alertsEl.querySelectorAll('[data-action-expand-dq]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const details = document.getElementById('qualityDetails') as HTMLDetailsElement | null;
          if (details) details.open = true;
        });
      });
    }

    // 2. Actionable KPIs with Period Comparison Deltas
    const calcDelta = (curr: number, prevVal: number | undefined, isRate = false): { text: string; color: string } => {
      if (prevVal === undefined || prevVal === null) return { text: '—', color: 'var(--m)' };
      const diff = curr - prevVal;
      if (diff === 0) return { text: '— 持平', color: 'var(--m)' };
      const sign = diff > 0 ? '+' : '';
      if (isRate) {
        const text = `${sign}${diff.toFixed(1)}% vs 上期`;
        return { text, color: diff > 0 ? 'var(--g)' : 'var(--r)' };
      }
      const pctVal = prevVal > 0 ? ((diff / prevVal) * 100).toFixed(1) + '%' : null;
      const text = pctVal ? `${sign}${pctVal} vs 上期` : `${sign}${diff} vs 上期`;
      return { text, color: diff > 0 ? 'var(--g)' : 'var(--r)' };
    };

    const reqDelta = calcDelta(ov.resolve_request, prev?.resolve_request);
    const succRateDelta = calcDelta(ov.success_rate, prev?.success_rate, true);
    const exportTotal = ov.export + ov.clipboard;
    const prevExportTotal = prev ? prev.export + prev.clipboard : undefined;
    const exportDelta = calcDelta(exportTotal, prevExportTotal);
    const uvDelta = calcDelta(ov.visitor_unique, prev?.visitor_unique);
    const fbDelta = prev ? ov.pending_feedback - prev.pending_feedback : 0;
    const rateLimitDelta = calcDelta(ov.rate_limited, prev?.rate_limited);

    const kpiItems = [
      {
        label: '解析请求总量',
        val: fmt(ov.resolve_request),
        sub: '歌单解析总请求',
        delta: reqDelta.text,
        deltaColor: reqDelta.color,
        color: 'var(--t)',
        jump: 'usage',
        actionHint: '使用偏好 →',
      },
      {
        label: '端到端成功率',
        val: pct(ov.success_rate),
        sub: `失败 ${fmt(ov.resolve_failure)} 次`,
        delta: succRateDelta.text,
        deltaColor: succRateDelta.color,
        color: ov.success_rate >= 80 ? 'var(--g)' : 'var(--w)',
        jump: 'reliability',
        actionHint: '排查异常 →',
      },
      {
        label: '导出与快速复制',
        val: fmt(exportTotal),
        sub: `${fmt(ov.export)} 导出 · ${fmt(ov.clipboard)} 剪贴`,
        delta: exportDelta.text,
        deltaColor: exportDelta.color,
        color: 'var(--a)',
        jump: 'usage',
        actionHint: '格式偏好 →',
      },
      {
        label: '官网访客 (UV)',
        val: fmt(ov.visitor_unique),
        sub: `${fmt(ov.page_view)} 浏览量 (PV)`,
        delta: uvDelta.text,
        deltaColor: uvDelta.color,
        color: 'var(--a)',
        jump: 'web',
        actionHint: '官网流量 →',
      },
      {
        label: '待排查歌单反馈',
        val: fmt(ov.pending_feedback),
        sub: ov.pending_feedback > 0 ? '需要跟进修复' : '暂无待处理',
        delta: fbDelta === 0 ? '— 持平' : `${fbDelta > 0 ? '+' : ''}${fbDelta} 待办`,
        deltaColor: ov.pending_feedback > 0 ? 'var(--r)' : 'var(--g)',
        color: ov.pending_feedback > 0 ? 'var(--r)' : 'var(--g)',
        jump: 'feedback',
        actionHint: '处理工作台 →',
      },
      {
        label: '安全异常与拦截',
        val: fmt(ov.rate_limited),
        sub: ov.rate_limited > 0 ? '触发 429 频控' : '未触发限流',
        delta: rateLimitDelta.text,
        deltaColor: ov.rate_limited > (prev?.rate_limited || 0) ? 'var(--w)' : 'var(--g)',
        color: ov.rate_limited > 0 ? 'var(--w)' : 'var(--t)',
        jump: 'security',
        actionHint: '风控日志 →',
      },
    ];

    const kpiEl = document.getElementById('overviewKpis');
    if (kpiEl) {
      kpiEl.innerHTML = kpiItems
        .map(
          (k) => `
          <div class="card kpi-card" data-jump="${k.jump}" style="cursor:pointer;transition:transform 0.15s, border-color 0.15s" title="点击进入 ${k.jump} 详情">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div class="kpi-label">${esc(k.label)}</div>
              <div style="font-size:11px;font-weight:600;color:${k.deltaColor}">${esc(k.delta)}</div>
            </div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px">
              <span class="kpi-sub">${esc(k.sub)}</span>
              <span style="color:var(--t);font-size:10px">${esc(k.actionHint)}</span>
            </div>
          </div>
        `,
        )
        .join('');

      kpiEl.querySelectorAll('.kpi-card[data-jump]').forEach((el) => {
        el.addEventListener('click', () => {
          const target = (el as HTMLElement).dataset.jump;
          if (target) this.switchPage(target);
        });
      });
    }

    // Pending feedback nav badge
    const navBadge = document.getElementById('navPendingBadge');
    if (navBadge) {
      if (ov.pending_feedback > 0) {
        navBadge.style.display = 'inline-block';
        navBadge.textContent = String(ov.pending_feedback);
      } else {
        navBadge.style.display = 'none';
      }
    }

    // Multi-view charts
    this.renderComponent('platform');
    this.renderComponent('client');
    this.renderComponent('country');
    this.renderComponent('region');

    // 3. Compact Data Quality Summary & Collapsible Details
    const qSumEl = document.getElementById('qualitySummary');
    const qDetails = document.getElementById('qualityDetails') as HTMLDetailsElement | null;
    const isHealthy = dq.status === 'healthy';
    if (qSumEl) {
      if (isHealthy) {
        qSumEl.innerHTML = `
          <div style="padding:10px 12px;background:color-mix(in srgb,var(--g) 8%,var(--p));border:1px solid color-mix(in srgb,var(--g) 25%,transparent);border-radius:6px;font-size:12px;color:var(--g);display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">✅</span>
            <span>数据守恒与完整性校验全部正常 (8/8 Passed) · 聚合闭环完整</span>
          </div>
        `;
        if (qDetails) qDetails.open = false;
      } else {
        const badCount = dq.checks.filter((c) => !c.ok).length;
        qSumEl.innerHTML = `
          <div style="padding:10px 12px;background:color-mix(in srgb,var(--r) 10%,var(--p));border:1px solid var(--r);border-radius:6px;font-size:12px;color:var(--r);display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">⚠️</span>
            <span>发现 <strong>${badCount}</strong> 项守恒异常，已自动展开下方校验明细</span>
          </div>
        `;
        if (qDetails) qDetails.open = true;
      }
    }

    const qEl = document.getElementById('qualityChecks');
    if (qEl) {
      qEl.innerHTML = dq.checks
        .map(
          (c) => `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--l);font-size:12px">
            <div>
              <span style="font-weight:600;font-family:var(--mono)">${esc(c.id)}</span>
              <div class="muted" style="font-size:11px">${esc(c.note)}</div>
            </div>
            <span class="badge ${c.ok ? 'resolved' : 'pending'}" style="font-size:11px">${c.ok ? '✔ PASSED' : '✖ MISMATCH'}</span>
          </div>
        `,
        )
        .join('');
    }
  }

  private drawCanvasChart(): void {
    if (!this.currentSlice) return;
    const canvas = document.getElementById('trendCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    const data =
      this.currentSlice.hourlyTimeseries.length > 0
        ? this.currentSlice.hourlyTimeseries
        : this.currentSlice.timeseries;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('当前时间范围无趋势数据', w / 2, h / 2);
      return;
    }

    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    const isBarView = this.chartViews['trend'] === 'bar';
    let maxVal = 1;
    for (const d of data) {
      const ok = Number(d.playlist_success || 0) + Number(d.user_success || 0);
      const fail = Number(d.resolve_failure || 0);
      const ref = Math.max(ok, fail);
      if (ref > maxVal) maxVal = ref;
    }
    maxVal = Math.ceil(maxVal * 1.15);

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;
    const halfH = plotH / 2;
    const yBase = padTop + halfH;

    const getX = (i: number) => {
      if (data.length <= 1) return padLeft + plotW / 2;
      return padLeft + (plotW / (data.length - 1)) * i;
    };
    const getY = (val: number) => padTop + plotH - (val / maxVal) * plotH;

    if (isBarView) {
      // Draw grid lines: 2 dashed levels above baseline, 1 solid baseline, 2 dashed levels below baseline
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';

      ctx.setLineDash([3, 3]);
      const levels = [
        { y: padTop, label: String(maxVal) },
        { y: padTop + halfH / 2, label: String(Math.round(maxVal / 2)) },
        { y: yBase + halfH / 2, label: String(Math.round(maxVal / 2)) },
        { y: padTop + plotH, label: String(maxVal) },
      ];
      levels.forEach((l) => {
        ctx.beginPath();
        ctx.moveTo(padLeft, l.y);
        ctx.lineTo(w - padRight, l.y);
        ctx.stroke();
        ctx.fillText(l.label, padLeft - 6, l.y + 3);
      });
      ctx.setLineDash([]);

      // Central baseline
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.75)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(padLeft, yBase);
      ctx.lineTo(w - padRight, yBase);
      ctx.stroke();
      ctx.fillText('0', padLeft - 6, yBase + 3);

      const stepX = plotW / Math.max(1, data.length);
      const barW = Math.max(4, Math.min(22, stepX * 0.65));
      data.forEach((d, i) => {
        const ok = Number(d.playlist_success || 0) + Number(d.user_success || 0);
        const fail = Number(d.resolve_failure || 0);
        const cx = getX(i);
        const x0 = cx - barW / 2;
        const okH = (ok / maxVal) * halfH;
        const failH = (fail / maxVal) * halfH;

        // Success: green bar extends UP from yBase
        if (okH > 0) {
          ctx.fillStyle = '#10b981';
          ctx.fillRect(x0, yBase - okH, barW, okH);
        }
        // Failure: red bar extends DOWN from yBase
        if (failH > 0) {
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(x0, yBase, barW, failH);
        }

        if (this.activeTrendIdx === i) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          const boxTop = okH > 0 ? yBase - okH : yBase;
          const boxHeight = (okH > 0 ? okH : 0) + (failH > 0 ? failH : 0);
          ctx.strokeRect(x0 - 2, boxTop - 2, barW + 4, Math.max(4, boxHeight + 4));
        }
      });
    } else {
      // Draw grid lines
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (plotH / 4) * i;
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        const labelVal = Math.round(maxVal * (1 - i / 4));
        ctx.fillText(String(labelVal), padLeft - 6, y + 3);
      }
      ctx.stroke();

      // Draw Success Line
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const ok = Number(d.playlist_success || 0) + Number(d.user_success || 0);
        const x = getX(i);
        const y = getY(ok);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw Failure Line
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const fail = Number(d.resolve_failure || 0);
        const x = getX(i);
        const y = getY(fail);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      if (this.activeTrendIdx >= 0 && this.activeTrendIdx < data.length) {
        const snapX = getX(this.activeTrendIdx);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(snapX, padTop);
        ctx.lineTo(snapX, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Draw X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const step = Math.ceil(data.length / 8);
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = getX(i);
        const label = d.hour !== undefined ? `${d.hour}:00` : String(d.date || '').slice(5);
        ctx.fillText(label, x, h - 8);
      }
    });
  }

  private drawWebTrendChart(): void {
    if (!this.currentSlice) return;
    const canvas = document.getElementById('webTrendCanvas') as HTMLCanvasElement | null;
    if (!canvas) return;

    const isSingleDay = this.currentSlice.filters.from === this.currentSlice.filters.to;
    const data = isSingleDay
      ? (this.currentSlice.webHourlyTimeseries || [])
      : (this.currentSlice.webTimeseries || []);
    const prevData = isSingleDay
      ? (this.currentSlice.previousWebHourlyTimeseries || [])
      : (this.currentSlice.previousWebTimeseries || []);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (data.length === 0) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('当前时间范围无官网流量趋势数据', w / 2, h / 2);
      return;
    }

    const padLeft = 45;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    let maxVal = 1;
    for (const d of data) {
      const pv = Number(d.page_view || 0);
      const uv = Number(d.visitor_unique || 0);
      if (pv > maxVal) maxVal = pv;
      if (uv > maxVal) maxVal = uv;
    }
    if (this.webCompareMode && prevData) {
      for (const d of prevData) {
        const pv = Number(d.page_view || 0);
        const uv = Number(d.visitor_unique || 0);
        if (pv > maxVal) maxVal = pv;
        if (uv > maxVal) maxVal = uv;
      }
    }
    maxVal = Math.ceil(maxVal * 1.15);

    const getX = (i: number, len = data.length) => {
      if (len <= 1) return padLeft + plotW / 2;
      return padLeft + (plotW / (len - 1)) * i;
    };
    const getY = (val: number) => padTop + plotH - (val / maxVal) * plotH;

    // Grid lines
    ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = padTop + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(w - padRight, y);
      ctx.stroke();

      const labelVal = Math.round(maxVal * (1 - i / 4));
      ctx.fillText(String(labelVal), padLeft - 6, y + 3);
    }

    const isBar = this.chartViews['webTrend'] === 'bar';

    if (isBar) {
      const stepX = plotW / Math.max(1, data.length);
      const barW = Math.max(2, Math.min(14, stepX * 0.38));
      data.forEach((d, i) => {
        const pv = Number(d.page_view || 0);
        const uv = Number(d.visitor_unique || 0);
        const cx = getX(i);
        const pvH = (pv / maxVal) * plotH;
        const uvH = (uv / maxVal) * plotH;

        // PV bar (blue)
        ctx.fillStyle = '#206bc4';
        ctx.fillRect(cx - barW - 1, padTop + plotH - pvH, barW, pvH);

        // UV bar (green)
        ctx.fillStyle = '#10b981';
        ctx.fillRect(cx + 1, padTop + plotH - uvH, barW, uvH);

        if (this.activeWebTrendIdx === i) {
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(cx - barW - 3, padTop, barW * 2 + 6, plotH);
        }
      });
    } else {
      // Line view
      if (this.webCompareMode && prevData.length > 0) {
        ctx.setLineDash([4, 4]);

        // Previous PV
        ctx.strokeStyle = 'rgba(32, 107, 196, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        prevData.forEach((d, i) => {
          const val = Number(d.page_view || 0);
          const x = getX(i, prevData.length);
          const y = getY(val);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        // Previous UV
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        prevData.forEach((d, i) => {
          const val = Number(d.visitor_unique || 0);
          const x = getX(i, prevData.length);
          const y = getY(val);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();

        ctx.setLineDash([]);
      }

      // Current PV Line (Blue)
      ctx.strokeStyle = '#206bc4';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const val = Number(d.page_view || 0);
        const x = getX(i);
        const y = getY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Current UV Line (Green)
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      data.forEach((d, i) => {
        const val = Number(d.visitor_unique || 0);
        const x = getX(i);
        const y = getY(val);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Active Hover crosshair
      if (this.activeWebTrendIdx >= 0 && this.activeWebTrendIdx < data.length) {
        const snapX = getX(this.activeWebTrendIdx);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(snapX, padTop);
        ctx.lineTo(snapX, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        const d = data[this.activeWebTrendIdx];
        const pvY = getY(Number(d.page_view || 0));
        const uvY = getY(Number(d.visitor_unique || 0));

        ctx.fillStyle = '#206bc4';
        ctx.beginPath();
        ctx.arc(snapX, pvY, 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(snapX, uvY, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const step = Math.max(1, Math.ceil(data.length / (isSingleDay ? 8 : 7)));
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        const x = getX(i);
        const label = d.hour !== undefined ? `${d.hour}:00` : String(d.date || '').slice(5);
        ctx.fillText(label, x, h - 8);
      }
    });
  }

  private renderWebTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;
    const env = this.currentSlice.environment;
    const ov = this.currentSlice.overview;
    const prevWeb = this.currentSlice.previousWebOverview;
    const isSingleDay = this.currentSlice.filters.from === this.currentSlice.filters.to;
    const pv = ov.page_view || 0;
    const uv = ov.visitor_unique || 0;
    const depth = uv > 0 ? (pv / uv).toFixed(1) : '1.0';

    const calcDelta = (curr: number, prevVal: number | undefined): { text: string; color: string } => {
      if (prevVal === undefined || prevVal === null) return { text: '—', color: 'var(--m)' };
      const diff = curr - prevVal;
      if (diff === 0) return { text: '— 持平', color: 'var(--m)' };
      const sign = diff > 0 ? '+' : '';
      const pctVal = prevVal > 0 ? ((diff / prevVal) * 100).toFixed(1) + '%' : null;
      const text = pctVal ? `${sign}${pctVal} vs 上期` : `${sign}${diff} vs 上期`;
      return { text, color: diff > 0 ? 'var(--g)' : 'var(--r)' };
    };

    const pvDelta = calcDelta(pv, prevWeb?.page_view);
    const uvDelta = calcDelta(uv, prevWeb?.visitor_unique);
    const prevDepth = prevWeb && prevWeb.visitor_unique > 0 ? (prevWeb.page_view / prevWeb.visitor_unique).toFixed(1) : undefined;
    const depthDelta = prevDepth !== undefined ? (Number(depth) - Number(prevDepth)).toFixed(1) : undefined;
    const depthDeltaText = depthDelta !== undefined ? `${Number(depthDelta) >= 0 ? '+' : ''}${depthDelta} vs 上期` : '—';
    const depthDeltaColor = depthDelta !== undefined && Number(depthDelta) !== 0 ? (Number(depthDelta) > 0 ? 'var(--g)' : 'var(--r)') : 'var(--m)';

    const uvLabel = isSingleDay ? '当日独立访客 (UV)' : '日去重访客累计人次';
    const uvSub = isSingleDay ? '官网当日去重访客' : '多日去重访客求和（跨日可能重复）';
    const depthLabel = isSingleDay ? '当日人均浏览深度' : '人均浏览深度 (PV / visitor-day)';
    const depthSub = isSingleDay ? '平均每位访客浏览量' : '平均每个 visitor-day 浏览量';

    const webCountries = this.currentSlice.webGeo?.countries || this.currentSlice.geo.countries;
    const webRegions = this.currentSlice.webGeo?.regions || this.currentSlice.geo.regions;
    const webEnv = this.currentSlice.webEnvironment || env;

    const webKpiItems = [
      { label: '页面访问总量 (PV)', val: fmt(pv), sub: '官网页面浏览量', delta: pvDelta.text, deltaColor: pvDelta.color, color: 'var(--t)' },
      { label: uvLabel, val: fmt(uv), sub: uvSub, delta: uvDelta.text, deltaColor: uvDelta.color, color: 'var(--a)' },
      { label: depthLabel, val: depth, sub: depthSub, delta: depthDeltaText, deltaColor: depthDeltaColor, color: 'var(--g)' },
      { label: '访问来源种类', val: String((b['referrer_source'] || []).length), sub: 'Referrer 渠道', delta: '—', deltaColor: 'var(--m)', color: 'var(--t)' },
      { label: '覆盖国家分布', val: String(webCountries.length), sub: '全球访问国家', delta: '—', deltaColor: 'var(--m)', color: 'var(--t)' },
      { label: '覆盖省州地区', val: String(webRegions.length), sub: '全球省份/州级地域', delta: '—', deltaColor: 'var(--m)', color: 'var(--t)' },
    ];
    const webKpiEl = document.getElementById('webKpis');
    if (webKpiEl) {
      webKpiEl.innerHTML = webKpiItems
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            ${k.delta !== '—' ? `<div style="font-size:11px;font-weight:600;color:${k.deltaColor};margin-top:2px">${esc(k.delta)}</div>` : ''}
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    const cCountEl = document.getElementById('webCountryCount');
    if (cCountEl) cCountEl.textContent = String(webCountries.length);
    const rCountEl = document.getElementById('webRegionCount');
    if (rCountEl) rCountEl.textContent = String(webRegions.length);

    this.drawWebTrendChart();

    const webBrowsers = (webEnv.browsers || []).filter((x) => {
      const n = String(x.name || '').toLowerCase();
      return !n.startsWith('plugin:') && !['musicfree', 'bbplayer', 'anonymous_api', 'official_cli', 'internal'].includes(n);
    });

    this.renderBars('referrerBars', b['referrer_source'] || [], undefined, undefined, formatReferrerLabel);
    this.renderBars('browserBars', webBrowsers, undefined, undefined, formatBrowserLabel);
    if (this.chartViews['device'] === 'donut') this.donutChart('deviceBars', webEnv.devices, undefined, undefined, formatDeviceLabel);
    else this.renderBars('deviceBars', webEnv.devices, undefined, undefined, formatDeviceLabel);
    this.renderBars('osBars', webEnv.operatingSystems, undefined, undefined, formatOsLabel);

    if (this.chartViews['webCountry'] === 'table') this.rankedTable('webCountryBars', webCountries, isSingleDay ? '独立访客 (UV)' : '日去重访客求和 (人次)');
    else this.renderBars('webCountryBars', webCountries);

    if (this.chartViews['webRegion'] === 'table') this.rankedTable('webRegionBars', webRegions, isSingleDay ? '独立访客 (UV)' : '日去重访客求和 (人次)');
    else this.renderBars('webRegionBars', webRegions);

    const countryEl = document.getElementById('webCountryBars');
    if (countryEl) {
      countryEl.querySelectorAll('.bar').forEach((bar) => {
        const text = bar.textContent || '';
        if (text.includes('中国') || text.includes('CN')) {
          bar.setAttribute('style', 'cursor:pointer');
          bar.setAttribute('title', '点击下钻查看中国各省份/直辖市独立访客分布 🔍');
          bar.addEventListener('click', () => {
            const regionBtn = document.getElementById('geoTabRegionBtn');
            if (regionBtn) regionBtn.click();
          });
        }
      });
    }
  }


  private renderUsageTab(): void {
    if (!this.currentSlice) return;
    const ov = this.currentSlice.overview;
    const b = this.currentSlice.breakdowns;
    const d = this.currentSlice.distributions;

    const conversionRate = ov.resolve_request > 0
      ? ((ov.export + ov.clipboard) / ov.resolve_request * 100).toFixed(1) + '%'
      : '0.0%';

    const usageKpiItems = [
      { label: '解析请求总量', val: fmt(ov.resolve_request), sub: '歌曲/歌单解析调用', color: 'var(--t)' },
      { label: '本地文件导出', val: fmt(ov.export), sub: 'XLSX/CSV/TXT/JSON等', color: 'var(--a)' },
      { label: '剪贴板快捷复制', val: fmt(ov.clipboard), sub: '一键文本复制', color: 'var(--a)' },
      { label: '迁移跳转调用', val: fmt(ov.migration_handoff), sub: '跨播放器快捷导入', color: 'var(--g)' },
      { label: '处理曲目总量', val: fmt(ov.tracks_processed), sub: '成功解析总曲目', color: 'var(--p)' },
      { label: '导出完成转化率', val: conversionRate, sub: '导出+剪贴 / 解析请求', color: 'var(--g)' },
    ];

    const kpiEl = document.getElementById('usageKpis');
    if (kpiEl) {
      kpiEl.innerHTML = usageKpiItems
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    this.renderBars('usagePlatformBars', d.platforms);
    this.renderComponent('requestedType');
    this.renderBars('exportSizeBars', b['export_playlist_size'] || []);
    this.renderComponent('exportFormat');
    this.renderComponent('clipboard');
    this.renderBars('usageMigrationBars', b['migration_destination'] || []);
  }

  private renderReliabilityTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;
    const ov = this.currentSlice.overview;

    const latencyBuckets = b['latency_bucket'] || [];
    let totalLatency = 0;
    let slowLatency = 0;
    for (const item of latencyBuckets) {
      totalLatency += item.count;
      if (item.name === '3-5s' || item.name === '5s+') {
        slowLatency += item.count;
      }
    }
    const slowPct = totalLatency > 0 ? ((slowLatency / totalLatency) * 100).toFixed(1) + '%' : '0.0%';
    const topFailure = b['failure_code']?.[0]?.name || '无';

    const relKpiItems = [
      { label: '解析请求总量', val: fmt(ov.resolve_request), sub: '总解析调用', color: 'var(--t)' },
      { label: '端到端成功率', val: pct(ov.success_rate), sub: '成功请求占比', color: ov.success_rate >= 80 ? 'var(--g)' : 'var(--w)' },
      { label: '解析失败量', val: fmt(ov.resolve_failure), sub: '最终未成功解析', color: ov.resolve_failure > 0 ? 'var(--r)' : 'var(--g)' },
      { label: '慢请求占比 (>3s)', val: slowPct, sub: '高耗时延迟请求比例', color: slowLatency > 0 ? 'var(--w)' : 'var(--g)' },
      { label: '最频发错误', val: esc(formatHumanLabel(topFailure)), sub: '主要异常错误码', color: 'var(--m)' },
      { label: '异常拦截数', val: fmt(ov.rate_limited), sub: 'HTTP 429 限流保护', color: ov.rate_limited > 0 ? 'var(--w)' : 'var(--t)' },
    ];
    const relKpiEl = document.getElementById('reliabilityKpis');
    if (relKpiEl) {
      relKpiEl.innerHTML = relKpiItems
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    this.renderBars('failureCodeBars', b['failure_code'] || []);
    this.renderBars('failureStageBars', b['failure_stage'] || []);
    this.renderComponent('latency');
    this.renderBars('providerBars', b['provider_failure_path'] || []);
    this.renderBars('endpointBars', b['endpoint'] || []);
  }

  private renderIntegrationsTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;
    const ov = this.currentSlice.overview;
    const clients = this.currentSlice.integrationClients || [];

    // 1. KPI cards
    const pluginReq = clients.filter((c) => c.channel === 'plugin').reduce((acc, c) => acc + c.requests, 0);
    const apiReq = clients.filter((c) => c.channel === 'api').reduce((acc, c) => acc + c.requests, 0);
    const migrationCount = ov.migration_handoff || (b['migration_destination'] || []).reduce((acc, c) => acc + c.count, 0);

    const intKpiItems = [
      { label: '活跃接入端类别', val: String(clients.length), sub: '调用过解析的 Client', color: 'var(--t)' },
      { label: '插件生态请求', val: fmt(pluginReq), sub: 'MusicFree 等播放器插件', color: '#8b5cf6' },
      { label: 'API 开放调用', val: fmt(apiReq), sub: '开发与开放接口调用', color: 'var(--a)' },
      { label: '跨端迁移跳转', val: fmt(migrationCount), sub: '唤起第三方播放器', color: 'var(--g)' },
    ];
    const kpiEl = document.getElementById('integrationKpis');
    if (kpiEl) {
      kpiEl.innerHTML = intKpiItems
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    // 2. Count badge
    const badgeEl = document.getElementById('clientTableCountBadge');
    if (badgeEl) badgeEl.textContent = `共 ${clients.length} 个接入端`;

    // 3. Dynamic Client Table
    const tbody = document.getElementById('integrationClientRows');
    if (tbody) {
      if (clients.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--m)">暂无客户端接入调用记录</td></tr>';
      } else {
        // Ensure selected client is valid
        if (!this.selectedIntegrationClient || !clients.some((c) => c.clientId === this.selectedIntegrationClient)) {
          this.selectedIntegrationClient = clients[0].clientId;
        }

        tbody.innerHTML = clients
          .map((c) => {
            const isSelected = c.clientId === this.selectedIntegrationClient;
            const brandColor = getBrandColor(c.clientId);
            const clientLabel = formatHumanLabel(c.clientId);
            const succColor = c.requests === 0 ? 'var(--m)' : (c.successRate >= 80 ? 'var(--g)' : (c.successRate >= 50 ? 'var(--w)' : 'var(--r)'));

            let channelBadge = '<span class="badge" style="background:var(--l)">开放 API</span>';
            if (c.channel === 'web') channelBadge = '<span class="badge" style="background:color-mix(in srgb,#206bc4 15%,var(--p));color:#206bc4">网页端</span>';
            else if (c.channel === 'plugin') channelBadge = '<span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">播放器插件</span>';
            else if (c.channel === 'cli') channelBadge = '<span class="badge" style="background:color-mix(in srgb,#10b981 15%,var(--p));color:#10b981">CLI 终端</span>';

            const topMeta = [c.topVersion ? `v: ${c.topVersion}` : '', c.topHost ? `os: ${c.topHost}` : ''].filter(Boolean).join(' · ') || '—';

            return `
              <tr class="client-row ${isSelected ? 'selected-row' : ''}" data-client-id="${esc(c.clientId)}" style="cursor:pointer;background:${isSelected ? 'color-mix(in srgb,var(--a) 8%,var(--p))' : 'transparent'}">
                <td>
                  <div style="display:flex;align-items:center;gap:6px">
                    <span class="b-dot" style="background:${brandColor}"></span>
                    <div>
                      <strong style="color:var(--t)">${esc(clientLabel)}</strong>
                      <div class="muted" style="font-size:10.5px;font-family:var(--mono)">${esc(c.clientId)}</div>
                    </div>
                  </div>
                </td>
                <td>${channelBadge}</td>
                <td style="text-align:right;font-family:var(--mono);font-weight:700">${fmt(c.requests)}</td>
                <td style="text-align:right;font-family:var(--mono);font-weight:700;color:${succColor}">${pct(c.successRate)}</td>
                <td style="text-align:right;font-size:11px;font-weight:600;color:${c.requestDeltaColor}">${esc(c.requestDeltaText)}</td>
                <td style="font-size:11px;color:var(--m)"><span title="${esc(topMeta)}">${esc(topMeta)}</span></td>
                <td style="text-align:right">
                  <button class="btn-sm client-select-btn" data-client-id="${esc(c.clientId)}" style="${isSelected ? 'background:var(--a);color:#fff;border-color:var(--a)' : ''}">${isSelected ? '当前查看 ✔' : '查看详情 🔍'}</button>
                </td>
              </tr>
            `;
          })
          .join('');

        tbody.querySelectorAll('.client-row').forEach((row) => {
          row.addEventListener('click', () => {
            const id = (row as HTMLElement).dataset.clientId;
            if (id && id !== this.selectedIntegrationClient) {
              this.selectedIntegrationClient = id;
              this.renderIntegrationsTab();
            }
          });
        });
      }
    }

    // 4. Drilldown Panel for Selected Client
    const activeClient = clients.find((c) => c.clientId === this.selectedIntegrationClient) || clients[0];
    if (activeClient) {
      const dotEl = document.getElementById('drilldownClientDot');
      if (dotEl) dotEl.style.background = getBrandColor(activeClient.clientId);

      const titleEl = document.getElementById('drilldownClientTitle');
      if (titleEl) {
        titleEl.textContent = `${formatHumanLabel(activeClient.clientId)} (${activeClient.clientId}) 深度下钻分析`;
      }

      const subEl = document.getElementById('drilldownClientSub');
      if (subEl) {
        subEl.textContent = `渠道: ${formatHumanLabel(activeClient.channel)} · 解析请求量: ${fmt(activeClient.requests)} · 成功率: ${pct(activeClient.successRate)} · 环比: ${activeClient.requestDeltaText}`;
      }

      const badgesEl = document.getElementById('drilldownClientBadges');
      if (badgesEl) {
        badgesEl.innerHTML = `
          <span class="badge" style="background:var(--l);font-size:11px">${esc(activeClient.channel)}</span>
          <span class="badge" style="background:color-mix(in srgb,var(--a) 15%,var(--p));color:var(--a);font-size:11px">${pct(activeClient.successRate)} 成功率</span>
        `;
      }

      this.renderBars('clientVersionBars', activeClient.versionDistribution);
      this.renderBars('clientHostBars', activeClient.hostDistribution);
    }

    // 5. Migration Ecosystem
    this.renderBars('migrationBars', b['migration_destination'] || []);
    this.renderBars('migrationProviderBars', b['migration_provider'] || []);
  }

  private renderDauTab(): void {
    if (!this.currentSlice) return;
    const dau = this.currentSlice.dau;
    const isSingle = dau.isSingleDay;

    // 1. Mode Badge
    const modeBadge = document.getElementById('dauModeBadge');
    if (modeBadge) {
      if (isSingle) {
        const isToday = dau.targetDate === this.isoDayOffset(0);
        modeBadge.textContent = isToday ? `单日分析模式 · 今日 (${dau.targetDate})` : `单日分析模式 · (${dau.targetDate})`;
        modeBadge.style.background = '#0284c7';
      } else {
        modeBadge.textContent = `趋势分析模式 · 近 ${dau.series.length} 天 (${dau.series[0]?.date || ''} ~ ${dau.series[dau.series.length - 1]?.date || ''})`;
        modeBadge.style.background = '#8b5cf6';
      }
    }

    // 1.5 Compare Toolbar (Interactive Selector)
    const compareToolbar = document.getElementById('dauCompareToolbar');
    if (compareToolbar) {
      if (isSingle) {
        compareToolbar.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;font-size:12px">
            <span class="muted">对比基准:</span>
            <select id="dauCompareSelect" style="padding:2px 8px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">
              <option value="auto" ${this.dauCompareMode === 'auto' ? 'selected' : ''}>自动 (昨日同期)</option>
              <option value="seven_day_baseline" ${this.dauCompareMode === 'seven_day_baseline' ? 'selected' : ''}>近 7 日同期基准</option>
              <option value="none" ${this.dauCompareMode === 'none' ? 'selected' : ''}>不对比</option>
            </select>
          </div>
        `;
      } else {
        compareToolbar.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;font-size:12px">
            <span class="muted">对比基准:</span>
            <select id="dauCompareSelect" style="padding:2px 8px;border-radius:4px;border:1px solid var(--l);background:var(--p);font-size:12px">
              <option value="auto" ${this.dauCompareMode === 'auto' || this.dauCompareMode === 'prev_period' ? 'selected' : ''}>上一等长周期</option>
              <option value="none" ${this.dauCompareMode === 'none' ? 'selected' : ''}>不对比</option>
            </select>
          </div>
        `;
      }
      const cmpSelect = document.getElementById('dauCompareSelect') as HTMLSelectElement | null;
      if (cmpSelect) {
        cmpSelect.onchange = () => {
          this.dauCompareMode = cmpSelect.value as any;
          if (this.dauCompareMode === 'none') {
            this.dauActiveSeries.delete('prevPeriod');
          } else if (this.dauCompareMode === 'auto' && !isSingle) {
            this.dauActiveSeries.add('prevPeriod');
          }
          this.renderDauTab();
          this.drawDauChart();
        };
      }
    }

    // 2. Scope Banner
    const scopeBanner = document.getElementById('dauScopeBanner');
    if (scopeBanner) {
      const activeFilters: string[] = [];
      const params = this.getFilterParams();
      if (params.channel) activeFilters.push(`渠道: <strong>${esc(formatHumanLabel(params.channel))}</strong>`);
      if (params.client) activeFilters.push(`接入端: <strong>${esc(formatHumanLabel(params.client))}</strong>`);
      if (params.country) activeFilters.push(`国家: <strong>${esc(formatHumanLabel(params.country))}</strong>`);
      if (params.region) activeFilters.push(`地区: <strong>${esc(formatHumanLabel(params.region))}</strong>`);

      if (activeFilters.length > 0) {
        scopeBanner.style.display = 'flex';
        scopeBanner.innerHTML = `
          <div style="display:flex;align-items:center;gap:8px">
            <span>🔍 当前生效过滤：</span>
            <span>${activeFilters.join(' · ')}</span>
          </div>
          <button id="dauClearScopeBtn" class="ghost btn-sm" style="padding:2px 8px;font-size:11px;cursor:pointer">✕ 清除筛选</button>
        `;
        const clearBtn = document.getElementById('dauClearScopeBtn');
        if (clearBtn) {
          clearBtn.onclick = () => {
            ['filterChannel', 'filterClient', 'filterCountry', 'filterRegion'].forEach((id) => {
              const el = document.getElementById(id) as HTMLSelectElement;
              if (el) el.value = '';
            });
            this.applyFilters();
          };
        }
      } else {
        scopeBanner.style.display = 'none';
      }
    }

    // 3. Core KPIs (Controlled at 4 cards, decision-oriented)
    const comp = dau.comparison;
    const sStats = dau.singleDay;
    const mStats = dau.multiDay;
    const isToday = isSingle && dau.targetDate === this.isoDayOffset(0);
    const effH = comp?.effectiveHour ?? sStats?.effectiveHour ?? null;
    const effHStr = effH != null ? (String(effH).padStart(2, '0') + ':00') : null;

    let kpiItems: Array<{ label: string; val: string; sub: string; color: string }>;

    if (isSingle) {
      const card1Label = isToday
        ? (effHStr ? `今日活跃人次 (截至 ${effHStr})` : '今日活跃人次 (进行中)')
        : `当日活跃人次 (${dau.targetDate.slice(5)})`;
      const card1Val = fmt(comp?.targetCount ?? dau.today.total);
      const card1Sub = isToday
        ? (effH != null
            ? `Web ${fmt(sStats?.targetCumulative[effH]?.targetWeb ?? dau.today.web)} · 插件 ${fmt(sStats?.targetCumulative[effH]?.targetPlugin ?? dau.today.plugin)} · CLI ${fmt(sStats?.targetCumulative[effH]?.targetCli ?? dau.today.cli)}`
            : '今日首个完整小时进行中，暂无整点累计')
        : `网页: ${fmt(dau.today.web)} · 插件: ${fmt(dau.today.plugin)} · CLI: ${fmt(dau.today.cli)}`;

      const peakHourCard = {
        label: '首次活跃峰值时段 (UTC)',
        val: sStats?.peakHour != null ? `${String(sStats.peakHour.hour).padStart(2, '0')}:00` : '—',
        sub: sStats?.peakHour != null
          ? `新增 ${fmt(sStats.peakHour.count)} 人次 (北京时间 ${((sStats.peakHour.hour + 8) % 24).toString().padStart(2, '0')}:00)`
          : '当日各小时平稳',
        color: 'var(--g)',
      };

      if (this.dauCompareMode === 'none') {
        kpiItems = [
          { label: card1Label, val: card1Val, sub: card1Sub, color: '#0284c7' },
          {
            label: '数据比较模式',
            val: '已停用',
            sub: '可在右上角对比工具栏重新启用对比基准',
            color: 'var(--m)',
          },
          peakHourCard,
          {
            label: '当日活跃客户端',
            val: `${dau.clients.filter((c) => (c.targetCount ?? c.today) > 0).length} 种客户端`,
            sub: '跨端独立去重 · Web / Plugin / CLI',
            color: 'var(--t)',
          },
        ];
      } else if (this.dauCompareMode === 'seven_day_baseline') {
        kpiItems = [
          { label: card1Label, val: card1Val, sub: card1Sub, color: '#0284c7' },
          {
            label: isToday && effHStr ? `近 7 日同期基准 (00:00~${effHStr})` : '近 7 日同期基准 (均值)',
            val: comp?.baselineCount != null && (effH != null || !isToday) ? fmt(comp.baselineCount) : '—',
            sub: comp?.baselineDeltaPercent != null && (effH != null || !isToday)
              ? `波动 ${comp.baselineDeltaPercent >= 0 ? '+' : ''}${comp.baselineDeltaPercent.toFixed(1)}% · 同步小时平均`
              : '所选日缺少足够历史同期',
            color: '#f59e0b',
          },
          {
            label: isToday ? (effHStr ? `昨日同期参考 (00:00~${effHStr})` : '昨日同期对比') : `前一天参考 (${dau.comparisonDate.slice(5)})`,
            val: (effH != null || !isToday) ? fmt(comp?.comparisonCount ?? dau.yesterday.total) : '—',
            sub: (effH != null || !isToday)
              ? `较同期 ${comp?.deltaPercent != null ? (comp.deltaPercent >= 0 ? '+' : '') + comp.deltaPercent.toFixed(1) + '%' : '—'} (${comp?.deltaCount != null ? (comp.deltaCount >= 0 ? '+' : '') + fmt(comp.deltaCount) : '—'})`
              : '今日首个完整小时进行中',
            color: 'var(--t)',
          },
          peakHourCard,
        ];
      } else {
        // 'auto' / 'prev_day'
        kpiItems = [
          { label: card1Label, val: card1Val, sub: card1Sub, color: '#0284c7' },
          {
            label: isToday ? (effHStr ? `昨日同期 (00:00~${effHStr})` : '昨日同期对比') : `前一天对比 (${dau.comparisonDate.slice(5)})`,
            val: (effH != null || !isToday) ? fmt(comp?.comparisonCount ?? dau.yesterday.total) : '—',
            sub: (effH != null || !isToday)
              ? (comp?.comparable === false
                  ? '<span style="color:var(--r)">⚠️ 覆盖范围变化不可直接比较</span>'
                  : `较同期 ${comp?.deltaPercent != null ? (comp.deltaPercent >= 0 ? '+' : '') + comp.deltaPercent.toFixed(1) + '%' : '—'} (${comp?.deltaCount != null ? (comp.deltaCount >= 0 ? '+' : '') + fmt(comp.deltaCount) : '—'})`)
              : '今日首个完整小时进行中，暂无同期可比',
            color: 'var(--t)',
          },
          {
            label: '近 7 日同期基准 (均值)',
            val: comp?.baselineCount != null && (effH != null || !isToday) ? fmt(comp.baselineCount) : '—',
            sub: comp?.baselineDeltaPercent != null && (effH != null || !isToday)
              ? `波动 ${comp.baselineDeltaPercent >= 0 ? '+' : ''}${comp.baselineDeltaPercent.toFixed(1)}% · 同步小时平均`
              : '所选日缺少足够历史同期',
            color: '#f59e0b',
          },
          peakHourCard,
        ];
      }
    } else {
      // Multi-day
      const multiCompCard = this.dauCompareMode === 'none'
        ? {
            label: '周期对比',
            val: '已停用',
            sub: '在右上角对比工具栏重新启用周期基准',
            color: 'var(--m)',
          }
        : {
            label: '与上一等长周期相比',
            val: comp?.deltaPercent != null ? `${comp.deltaPercent >= 0 ? '+' : ''}${comp.deltaPercent.toFixed(1)}%` : '—',
            sub: comp?.comparable === false
              ? '<span style="color:var(--r)">⚠️ 覆盖范围变化不可直接比较</span>'
              : `前一周期日均 ${comp?.comparisonCount != null ? fmt(comp.comparisonCount) : '—'} 人次`,
            color: 'var(--g)',
          };

      kpiItems = [
        {
          label: '区间日均活跃人次',
          val: fmt(mStats?.dailyAverage ?? Math.round(dau.windowTotals.total / Math.max(1, dau.series.length))),
          sub: mStats?.rangeIncludesToday
            ? `基于 ${mStats.fullDayCount} 个完整日均值 (已排除今日残缺日)`
            : `跨端独立去重 · 周期累计 ${fmt(dau.windowTotals.total)} 人次`,
          color: '#0284c7',
        },
        {
          label: '最新完整日活跃',
          val: mStats?.latestFullDay != null ? fmt(mStats.latestFullDay.total) : '—',
          sub: `日期 ${mStats?.latestFullDay?.date || '—'} (UTC 完整天)`,
          color: 'var(--t)',
        },
        multiCompCard,
        {
          label: '区间最高日活峰值',
          val: mStats?.peakDay != null ? fmt(mStats.peakDay.total) : '—',
          sub: `日期 ${mStats?.peakDay?.date || '—'} · 单日最高活跃`,
          color: '#f59e0b',
        },
      ];
    }

    const kpiEl = document.getElementById('dauKpis');
    if (kpiEl) {
      kpiEl.innerHTML = kpiItems
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${k.sub}</div>
          </div>
        `,
        )
        .join('');
    }

    // 4. Main Chart Head & Legend
    const mainTitle = document.getElementById('dauMainChartTitle');
    const mainSub = document.getElementById('dauMainChartSub');
    if (mainTitle && mainSub) {
      if (isSingle) {
        mainTitle.textContent = `📈 单日累计活跃趋势 (${dau.targetDate})`;
        mainSub.textContent = 'X 轴为 00:00–23:00 (UTC) · Y 轴为截至该小时的累计去重活跃人次 · 实线为所选日，虚线为对比日同期';
      } else {
        mainTitle.textContent = `📈 每日活跃趋势 (Daily Active Trends)`;
        mainSub.textContent = '点击图表上任意日期直接下钻进入单日分析模式 · 点击右上方图例可显示/隐藏对应数据流';
      }
    }

    const legendEl = document.getElementById('dauChartLegend');
    if (legendEl) {
      if (isSingle) {
        const hasBase = (sStats?.sevenDayBaseline && sStats.sevenDayBaseline.length > 0) || (dau.sevenDayBaseline && dau.sevenDayBaseline.length > 0);
        const isAuto = this.dauCompareMode === 'auto' || this.dauCompareMode === 'prev_period';
        const isBase = this.dauCompareMode === 'seven_day_baseline';
        legendEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:12px;font-size:11px">
            <span style="display:inline-flex;align-items:center;gap:5px"><span style="width:14px;height:3px;background:#0284c7;display:inline-block;border-radius:2px"></span> 所选日累计</span>
            ${isAuto ? '<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:14px;height:2px;border-top:2px dashed #64748b;display:inline-block"></span> 昨日同期</span>' : ''}
            ${(isBase && hasBase) ? '<span style="display:inline-flex;align-items:center;gap:5px"><span style="width:14px;height:2px;border-top:2px dotted #f59e0b;display:inline-block"></span> 近7日同期基准</span>' : ''}
          </div>
        `;
      } else {
        const seriesDefs: Array<{ key: 'total' | 'web' | 'plugin' | 'cli' | 'ma7' | 'prevPeriod'; label: string; color: string }> = [
          { key: 'total', label: '总活跃', color: '#f97316' },
          { key: 'web', label: '网页端', color: '#0284c7' },
          { key: 'plugin', label: '插件端', color: '#8b5cf6' },
          { key: 'cli', label: 'CLI 终端', color: '#10b981' },
          { key: 'ma7', label: '7日均线', color: '#f59e0b' },
          { key: 'prevPeriod', label: '上一周期', color: '#64748b' },
        ];
        legendEl.innerHTML = `
          <div style="display:flex;align-items:center;gap:6px;font-size:11px">
            ${seriesDefs
              .map((s) => {
                const active = this.dauActiveSeries.has(s.key);
                return `
                  <button type="button" class="btn-toggle-series ghost btn-sm" data-series="${s.key}" style="padding:1px 7px;font-size:11px;cursor:pointer;opacity:${active ? '1' : '0.35'};border-color:${active ? s.color : 'var(--l)'}">
                    <span style="width:8px;height:8px;border-radius:50%;background:${s.color};display:inline-block;margin-right:4px"></span>${s.label}
                  </button>
                `;
              })
              .join('')}
          </div>
        `;
        legendEl.querySelectorAll('.btn-toggle-series').forEach((btn) => {
          (btn as HTMLElement).onclick = (e) => {
            e.stopPropagation();
            const sKey = (btn as HTMLElement).dataset.series as 'total' | 'web' | 'plugin' | 'cli' | 'ma7' | 'prevPeriod';
            if (sKey) {
              if (this.dauActiveSeries.has(sKey)) {
                if (this.dauActiveSeries.size > 1) {
                  this.dauActiveSeries.delete(sKey);
                }
              } else {
                this.dauActiveSeries.add(sKey);
              }
              this.renderDauTab();
              this.drawDauChart();
            }
          };
        });
      }
    }

    // 5. Chart Footnote (Coverage & Annotations)
    const footnote = document.getElementById('dauChartFootnote');
    if (footnote) {
      footnote.style.display = 'block';
      const parts: string[] = [];
      const cov = dau.coverage;
      if (cov) {
        parts.push(`📡 <strong>统计覆盖追踪：</strong>网页端自 <code>${cov.web?.earliestDate || '初始'}</code> 起 · 播放器插件自 <code>${cov.plugin?.earliestDate || '—'}</code> 起 · CLI 终端自 <code>${cov.cli?.earliestDate || '—'}</code> 起`);
      }
      if (comp && comp.comparable === false) {
        parts.push(`<span style="color:var(--r);font-weight:600">⚠️ 跨期对比提醒：${esc(comp.incomparableReason || '对比周期跨越统计上线节点，不可直接做百分比比较。')}</span>`);
      }
      if (dau.annotations && dau.annotations.length > 0) {
        const annStrs = dau.annotations.map(
          (a) => `📌 <strong>${a.date}</strong> ${esc(a.title)}: ${esc(a.description)}`,
        );
        parts.push(`<strong>事件标注：</strong>${annStrs.join('；')}`);
      }
      footnote.innerHTML = parts.join('<div style="height:4px"></div>');
    }

    // 6. Sub-chart (Single-day: Hourly First-Active; Multi-day: Channel Composition)
    const subTitle = document.getElementById('dauSubChartHeadTitle');
    const subSub = document.getElementById('dauSubChartHeadSub');
    const subContainer = document.getElementById('dauSubChartContainer');
    if (subTitle && subSub && subContainer) {
      if (isSingle) {
        subTitle.textContent = '🕐 每小时首次活跃 (First Active by Hour)';
        subSub.textContent = '该小时首次被记录为当天活跃的人次，不代表该小时同时在线人数';
        const hours = dau.hours;
        if (hours.length === 0) {
          subContainer.innerHTML = '<div style="color:var(--m);padding:8px 0;font-size:12px">暂无小时分布数据</div>';
        } else {
          const max = Math.max(...hours.map((h) => h.total), 1);
          subContainer.innerHTML = `
            <div id="dauHourBars" class="bars">
              ${hours
                .map((h) => {
                  const p = Math.min(100, Math.round((h.total / max) * 1000) / 10);
                  const localHour = (h.hour + 8) % 24;
                  return `
                    <div class="bar">
                      <div class="bn" title="UTC ${String(h.hour).padStart(2, '0')}:00 / 北京时间 ${String(localHour).padStart(2, '0')}:00">
                        <span>${String(h.hour).padStart(2, '0')}:00</span>
                        <span class="muted" style="font-size:10px;margin-left:4px">(${String(localHour).padStart(2, '0')}h)</span>
                      </div>
                      <div class="track"><div class="fill" style="width:${p}%;background:var(--a)"></div></div>
                      <div class="num" title="Web: ${fmt(h.web || 0)} · Plugin: ${fmt(h.plugin || 0)} · CLI: ${fmt(h.cli || 0)}">
                        <span class="val">${fmt(h.total)}</span>
                      </div>
                    </div>
                  `;
                })
                .join('')}
            </div>
          `;
        }
      } else {
        subTitle.textContent = '📊 各渠道活跃贡献构成 (Channel Composition)';
        subSub.textContent = '所选时间区间内 Web、Plugin、CLI 去重人次累计与占比贡献';
        const tot = Math.max(1, dau.windowTotals.total);
        const webPct = Math.round((dau.windowTotals.web / tot) * 1000) / 10;
        const plugPct = Math.round((dau.windowTotals.plugin / tot) * 1000) / 10;
        const cliPct = Math.round((dau.windowTotals.cli / tot) * 1000) / 10;
        const days = Math.max(1, dau.series.length);
        subContainer.innerHTML = `
          <div style="display:flex;flex-direction:column;gap:14px;padding:12px 0">
            <div class="bar">
              <div class="bn" style="width:130px"><span class="b-dot" style="background:#0284c7"></span><span>网页端 (Web)</span></div>
              <div class="track"><div class="fill" style="width:${webPct}%;background:#0284c7"></div></div>
              <div class="num"><span class="val">${fmt(dau.windowTotals.web)}</span><span class="pct">${webPct}%</span><span class="muted" style="font-size:11px;margin-left:6px">日均 ${fmt(Math.round(dau.windowTotals.web / days))}</span></div>
            </div>
            <div class="bar">
              <div class="bn" style="width:130px"><span class="b-dot" style="background:#8b5cf6"></span><span>播放器插件 (Plugin)</span></div>
              <div class="track"><div class="fill" style="width:${plugPct}%;background:#8b5cf6"></div></div>
              <div class="num"><span class="val">${fmt(dau.windowTotals.plugin)}</span><span class="pct">${plugPct}%</span><span class="muted" style="font-size:11px;margin-left:6px">日均 ${fmt(Math.round(dau.windowTotals.plugin / days))}</span></div>
            </div>
            <div class="bar">
              <div class="bn" style="width:130px"><span class="b-dot" style="background:#10b981"></span><span>命令行 (CLI)</span></div>
              <div class="track"><div class="fill" style="width:${cliPct}%;background:#10b981"></div></div>
              <div class="num"><span class="val">${fmt(dau.windowTotals.cli)}</span><span class="pct">${cliPct}%</span><span class="muted" style="font-size:11px;margin-left:6px">日均 ${fmt(Math.round(dau.windowTotals.cli / days))}</span></div>
            </div>
          </div>
        `;
      }
    }

    // 7. Client Table
    const thCol1 = document.getElementById('thDauCol1');
    const thCol2 = document.getElementById('thDauCol2');
    if (thCol1) {
      thCol1.textContent = isSingle
        ? (isToday ? `当日活跃 (至 ${effHStr})` : `当日活跃 (${dau.targetDate.slice(5)})`)
        : '本周期日均';
    }
    if (thCol2) {
      thCol2.textContent = isSingle
        ? (isToday ? `对比同期 (至 ${effHStr})` : `前日同期 (${dau.comparisonDate.slice(5)})`)
        : '上周期日均';
    }

    const tbody = document.getElementById('dauClientRows');
    if (tbody) {
      const rows = dau.clients
        .map((c) => {
          const deltaStr =
            c.deltaPercent != null
              ? `<span style="color:${c.deltaPercent >= 0 ? 'var(--g)' : 'var(--r)'};font-weight:600">${c.deltaPercent >= 0 ? '+' : ''}${c.deltaPercent.toFixed(1)}%</span>`
              : '<span class="muted">—</span>';
          const shareStr = c.sharePercent != null ? `${c.sharePercent.toFixed(1)}%` : '—';
          const channelLabel =
            c.channel === 'web'
              ? '网页端'
              : c.channel === 'plugin'
                ? '插件端'
                : c.channel === 'cli'
                  ? 'CLI 终端'
                  : formatHumanLabel(c.channel);
          const col1Val = isSingle ? (c.targetCount ?? c.today) : (c.currentPeriodDailyAvg ?? c.total);
          const col2Val = isSingle ? (c.comparisonCount ?? c.yesterday) : (c.previousPeriodDailyAvg ?? 0);
          return `
            <tr>
              <td>
                <span style="font-weight:600;color:${getBrandColor(c.client)}">${esc(formatHumanLabel(c.client))}</span>
                <div class="muted" style="font-size:11px;font-family:var(--mono)">${esc(c.client)}</div>
              </td>
              <td><span class="badge" style="background:var(--l)">${esc(channelLabel)}</span></td>
              <td style="text-align:right;font-family:var(--mono);font-weight:700">${fmt(col1Val)}</td>
              <td style="text-align:right;font-family:var(--mono)">${fmt(col2Val)}</td>
              <td style="text-align:right;font-family:var(--mono)">${deltaStr}</td>
              <td style="text-align:right;font-family:var(--mono)">${shareStr}</td>
              <td style="text-align:center">
                <button class="ghost btn-sm btn-drill-client" data-client="${esc(c.client)}" title="过滤仅看此客户端" style="padding:1px 6px;font-size:11px;cursor:pointer">下钻</button>
              </td>
            </tr>
          `;
        })
        .join('');
      tbody.innerHTML =
        rows ||
        '<tr><td colspan="7" style="text-align:center;padding:14px;color:var(--m)">暂无客户端活跃记录</td></tr>';

      tbody.querySelectorAll('.btn-drill-client').forEach((btn) => {
        (btn as HTMLElement).onclick = (e) => {
          e.stopPropagation();
          const targetClient = (btn as HTMLElement).dataset.client;
          if (targetClient) {
            const select = document.getElementById('filterClient') as HTMLSelectElement;
            if (select) {
              select.value = targetClient;
              this.applyFilters();
            }
          }
        };
      });
    }

    // 8. Geographic Distribution
    const geoEl = document.getElementById('dauGeoBars');
    const geoTitle = document.getElementById('dauGeoTitle');
    const geoSub = document.getElementById('dauGeoSub');
    const geoBackBtn = document.getElementById('dauGeoBackBtn');
    if (geoEl) {
      if (this.dauDrilldownRegion === 'CN') {
        if (geoTitle) geoTitle.textContent = '🏙️ 中国省份 / 地区活跃分布 (Provinces)';
        if (geoSub) geoSub.textContent = '中国境内各省份独立活跃分布 (UV)';
        if (geoBackBtn) geoBackBtn.style.display = 'inline-block';
        this.renderBars('dauGeoBars', dau.regions);
      } else {
        if (geoTitle) geoTitle.textContent = '🌍 活跃地域分布 (Top Countries)';
        if (geoSub) geoSub.textContent = '点击中国 (CN) 可下钻省份明细';
        if (geoBackBtn) geoBackBtn.style.display = 'none';
        this.renderBars('dauGeoBars', dau.countries);

        geoEl.querySelectorAll('.bar').forEach((barEl) => {
          const text = barEl.textContent || '';
          if (text.includes('中国') || text.includes('CN')) {
            (barEl as HTMLElement).style.cursor = 'pointer';
            (barEl as HTMLElement).title = '点击下钻查看中国各省份分布';
            (barEl as HTMLElement).onclick = () => {
              this.dauDrilldownRegion = 'CN';
              this.renderDauTab();
            };
          }
        });
      }
    }
    if (geoBackBtn) {
      geoBackBtn.onclick = () => {
        this.dauDrilldownRegion = null;
        this.renderDauTab();
      };
    }
  }

  private drawDauChart(): void {
    if (!this.currentSlice) return;
    const canvas = document.getElementById('dauTrendCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dau = this.currentSlice.dau;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    const padLeft = 45;
    const padRight = 25;
    const padTop = 20;
    const padBottom = 30;
    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    if (dau.isSingleDay) {
      // === SINGLE-DAY CUMULATIVE ACTIVE CHART ===
      const targetPts: DauCumulativeHourlyPoint[] =
        dau.singleDay?.targetCumulative || dau.targetCumulative || [];
      const basePts: { hour: number; total: number }[] =
        dau.singleDay?.sevenDayBaseline || dau.sevenDayBaseline || [];

      let maxVal = 1;
      for (const p of targetPts) {
        if (p.targetTotal != null && p.targetTotal > maxVal) maxVal = p.targetTotal;
        if (p.comparisonTotal != null && p.comparisonTotal > maxVal) maxVal = p.comparisonTotal;
        if (p.baselineTotal != null && p.baselineTotal > maxVal) maxVal = p.baselineTotal;
      }
      for (const p of basePts) {
        if (p.total != null && p.total > maxVal) maxVal = p.total;
      }
      maxVal = Math.ceil(maxVal * 1.15);

      // Y-grid & labels
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (plotH / 4) * i;
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(String(Math.round(maxVal * (1 - i / 4))), padLeft - 6, y + 3);
      }
      ctx.stroke();

      const stepX = plotW / 23;

      // 1. Seven-day Baseline (dotted amber)
      const drawBaseline = this.dauCompareMode === 'seven_day_baseline';
      if (drawBaseline && basePts.length === 24) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        let started = false;
        basePts.forEach((p: { hour: number; total: number }, i: number) => {
          if (p.total != null) {
            const x = padLeft + i * stepX;
            const y = padTop + plotH - (p.total / maxVal) * plotH;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 2. Comparison Day (dashed slate)
      const drawYesterday = this.dauCompareMode === 'auto' || this.dauCompareMode === 'prev_period';
      if (drawYesterday && targetPts.length === 24) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        let started = false;
        targetPts.forEach((p: DauCumulativeHourlyPoint, i: number) => {
          if (p.comparisonTotal != null) {
            const x = padLeft + i * stepX;
            const y = padTop + plotH - (p.comparisonTotal / maxVal) * plotH;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Target Day Cumulative (solid blue line + gradient fill)
      const validTargetPts: Array<{ x: number; y: number; total: number; hour: number }> = [];
      targetPts.forEach((p: DauCumulativeHourlyPoint, i: number) => {
        if (p.targetTotal != null) {
          const x = padLeft + i * stepX;
          const y = padTop + plotH - (p.targetTotal / maxVal) * plotH;
          validTargetPts.push({ x, y, total: p.targetTotal, hour: p.hour });
        }
      });

      if (validTargetPts.length > 0) {
        // Gradient fill
        const grad = ctx.createLinearGradient(0, padTop, 0, padTop + plotH);
        grad.addColorStop(0, 'rgba(2, 132, 199, 0.22)');
        grad.addColorStop(1, 'rgba(2, 132, 199, 0.01)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(validTargetPts[0].x, padTop + plotH);
        validTargetPts.forEach((pt) => ctx.lineTo(pt.x, pt.y));
        ctx.lineTo(validTargetPts[validTargetPts.length - 1].x, padTop + plotH);
        ctx.closePath();
        ctx.fill();

        // Stroke line
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        validTargetPts.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();

        // Points
        ctx.fillStyle = '#0284c7';
        validTargetPts.forEach((pt) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        });

        // Glow on latest recorded hour
        const lastPt = validTargetPts[validTargetPts.length - 1];
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.4)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(lastPt.x, lastPt.y, 5, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Hover active hour vertical guideline
      if (this.activeDauHour >= 0 && this.activeDauHour <= 23) {
        const hx = padLeft + this.activeDauHour * stepX;
        ctx.strokeStyle = 'rgba(2, 132, 199, 0.5)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, padTop);
        ctx.lineTo(hx, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        const targetPt = targetPts[this.activeDauHour];
        if (targetPt && targetPt.targetTotal != null) {
          const hy = padTop + plotH - (targetPt.targetTotal / maxVal) * plotH;
          ctx.fillStyle = '#0284c7';
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // X-axis Hour labels (00, 04, 08, 12, 16, 20, 23)
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      [0, 4, 8, 12, 16, 20, 23].forEach((hr) => {
        const x = padLeft + hr * stepX;
        ctx.fillText(`${String(hr).padStart(2, '0')}:00`, x, h - 8);
      });
    } else {
      // === MULTI-DAY TREND CHART ===
      const data = dau.series;
      if (data.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('当前筛选无活跃数据', w / 2, h / 2);
        return;
      }

      let maxVal = 1;
      for (const d of data) {
        if (this.dauActiveSeries.has('total') && d.total > maxVal) maxVal = d.total;
        if (this.dauActiveSeries.has('web') && d.web > maxVal) maxVal = d.web;
        if (this.dauActiveSeries.has('plugin') && d.plugin > maxVal) maxVal = d.plugin;
        if (this.dauActiveSeries.has('cli') && d.cli > maxVal) maxVal = d.cli;
        if (this.dauActiveSeries.has('ma7') && d.ma7 != null && d.ma7 > maxVal) maxVal = d.ma7;
      }
      if (this.dauActiveSeries.has('prevPeriod') && dau.multiDay?.previousPeriodSeries) {
        for (const pd of dau.multiDay.previousPeriodSeries) {
          if (pd.total > maxVal) maxVal = pd.total;
        }
      }
      maxVal = Math.ceil(maxVal * 1.15);

      // Y-grid & labels
      ctx.strokeStyle = 'rgba(226, 232, 240, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i <= 4; i++) {
        const y = padTop + (plotH / 4) * i;
        ctx.moveTo(padLeft, y);
        ctx.lineTo(w - padRight, y);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillText(String(Math.round(maxVal * (1 - i / 4))), padLeft - 6, y + 3);
      }
      ctx.stroke();

      const stepX = data.length === 1 ? 0 : plotW / (data.length - 1);
      const getX = (idx: number) => (data.length === 1 ? padLeft + plotW / 2 : padLeft + idx * stepX);

      // Annotations (vertical markers on matching dates)
      if (dau.annotations && dau.annotations.length > 0) {
        for (const ann of dau.annotations) {
          const annIdx = data.findIndex((d) => d.date === ann.date);
          if (annIdx >= 0) {
            const ax = getX(annIdx);
            ctx.strokeStyle = '#a855f7';
            ctx.lineWidth = 1.2;
            ctx.setLineDash([4, 3]);
            ctx.beginPath();
            ctx.moveTo(ax, padTop);
            ctx.lineTo(ax, padTop + plotH);
            ctx.stroke();
            ctx.setLineDash([]);

            // Marker badge
            ctx.fillStyle = '#a855f7';
            ctx.font = '9px system-ui';
            ctx.textAlign = 'center';
            ctx.fillText('📌 ' + ann.title, ax, padTop - 6);
          }
        }
      }

      // Draw series lines
      const drawLine = (
        key: 'total' | 'web' | 'plugin' | 'cli' | 'ma7',
        color: string,
        lineWidth: number,
        dashed = false,
      ) => {
        if (!this.dauActiveSeries.has(key)) return;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        if (dashed) ctx.setLineDash([4, 3]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        let started = false;
        data.forEach((d, i) => {
          let val: number | null = null;
          if (key === 'ma7') {
            val = d.ma7 ?? null;
          } else if (key === 'web' && d.webUncollected) {
            val = null;
          } else if (key === 'plugin' && d.pluginUncollected) {
            val = null;
          } else if (key === 'cli' && d.cliUncollected) {
            val = null;
          } else {
            val = Number(d[key] || 0);
          }

          if (val != null) {
            const x = getX(i);
            const y = padTop + plotH - (val / maxVal) * plotH;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Points
        ctx.fillStyle = color;
        data.forEach((d, i) => {
          let val: number | null = null;
          if (key === 'ma7') {
            val = d.ma7 ?? null;
          } else if (key === 'web' && d.webUncollected) {
            val = null;
          } else if (key === 'plugin' && d.pluginUncollected) {
            val = null;
          } else if (key === 'cli' && d.cliUncollected) {
            val = null;
          } else {
            val = Number(d[key] || 0);
          }
          if (val != null) {
            const x = getX(i);
            const y = padTop + plotH - (val / maxVal) * plotH;
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      };

      const prevData = dau.multiDay?.previousPeriodSeries || [];
      if (this.dauActiveSeries.has('prevPeriod') && prevData.length > 0) {
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        let started = false;
        prevData.forEach((pd, i) => {
          if (i < data.length) {
            const val = Number(pd.total || 0);
            const x = getX(i);
            const y = padTop + plotH - (val / maxVal) * plotH;
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        });
        ctx.stroke();
        ctx.setLineDash([]);

        // Points
        ctx.fillStyle = '#64748b';
        prevData.forEach((pd, i) => {
          if (i < data.length) {
            const val = Number(pd.total || 0);
            const x = getX(i);
            const y = padTop + plotH - (val / maxVal) * plotH;
            ctx.beginPath();
            ctx.arc(x, y, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
      }

      drawLine('ma7', '#f59e0b', 1.8, true);
      drawLine('cli', '#10b981', 1.8);
      drawLine('plugin', '#8b5cf6', 1.8);
      drawLine('web', '#0284c7', 1.8);
      drawLine('total', '#f97316', 2.4);

      // Active Hover Guideline
      if (this.activeDauIdx >= 0 && this.activeDauIdx < data.length) {
        const hx = getX(this.activeDauIdx);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(hx, padTop);
        ctx.lineTo(hx, padTop + plotH);
        ctx.stroke();
        ctx.setLineDash([]);

        const row = data[this.activeDauIdx];
        if (this.dauActiveSeries.has('total')) {
          const hy = padTop + plotH - (Number(row.total || 0) / maxVal) * plotH;
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(hx, hy, 5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (this.dauActiveSeries.has('prevPeriod') && prevData[this.activeDauIdx]) {
          const py = padTop + plotH - (Number(prevData[this.activeDauIdx].total || 0) / maxVal) * plotH;
          ctx.fillStyle = '#64748b';
          ctx.beginPath();
          ctx.arc(hx, py, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // X-axis Date labels
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      const step = Math.ceil(data.length / 8);
      data.forEach((d, i) => {
        if (i % step === 0 || i === data.length - 1) {
          ctx.fillText(String(d.date || '').slice(5), getX(i), h - 8);
        }
      });
    }
  }

  private renderFeedbackView(): void {
    if (!this.snapshot) return;
    const params = this.getFilterParams('feedback');
    const fbSlice = buildFeedbackSlice(this.snapshot, {
      ...params,
      status: this.currentFbStatus,
      error_code: this.currentFbErrorCode,
      sort_by: this.currentFbSort,
    });

    const pendingCountEl = document.getElementById('fbCountPending');
    const allCountEl = document.getElementById('fbCountAll');
    const resolvedCountEl = document.getElementById('fbCountResolved');
    const ignoredCountEl = document.getElementById('fbCountIgnored');

    if (pendingCountEl) pendingCountEl.textContent = String(fbSlice.counts.pending);
    if (allCountEl) allCountEl.textContent = String(fbSlice.counts.all);
    if (resolvedCountEl) resolvedCountEl.textContent = String(fbSlice.counts.resolved);
    if (ignoredCountEl) ignoredCountEl.textContent = String(fbSlice.counts.ignored);

    // Render Feedback KPIs / stats
    const kpiEl = document.getElementById('feedbackKpis');
    if (kpiEl && fbSlice.stats) {
      const topPlatformStr = fbSlice.stats.topPlatform !== '—' ? formatHumanLabel(fbSlice.stats.topPlatform) : '—';
      const items = [
        { label: '待处理歌单', val: fmt(fbSlice.counts.pending), sub: '等待复现与核验', color: fbSlice.counts.pending > 0 ? 'var(--r)' : 'var(--g)' },
        { label: '累计报错人次', val: fmt(fbSlice.stats.totalReports), sub: '受影响用户上报总量', color: 'var(--t)' },
        { label: '独立失败链接', val: fmt(fbSlice.stats.uniqueUrls), sub: '去重歌单 URL 条数', color: 'var(--a)' },
        { label: '最频发平台', val: esc(topPlatformStr), sub: '主要失败集中源', color: 'var(--p)' },
        { label: '主要错误分类', val: esc(fbSlice.stats.topErrorCode), sub: '最频发报错原因', color: 'var(--w)' },
      ];
      kpiEl.innerHTML = items
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    // Populate error code dropdown
    const errSelect = document.getElementById('feedbackErrorCode') as HTMLSelectElement;
    if (errSelect && fbSlice.availableErrorCodes) {
      const oldVal = this.currentFbErrorCode;
      errSelect.innerHTML = `<option value="">全部错误分类 (All Errors · ${fbSlice.total})</option>` +
        fbSlice.availableErrorCodes
          .map((c) => `<option value="${esc(c.name)}" ${c.name === oldVal ? 'selected' : ''}>${esc(c.name)} (${c.count} 条)</option>`)
          .join('');
    }

    const sortSelect = document.getElementById('feedbackSort') as HTMLSelectElement;
    if (sortSelect) {
      sortSelect.value = this.currentFbSort;
    }

    const tbody = document.getElementById('feedbackRows');
    if (!tbody) return;

    if (fbSlice.entries.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--m)">当前分类无反馈记录</td></tr>';
      return;
    }

    tbody.innerHTML = fbSlice.entries
      .map((x: FeedbackRow) => {
        let stCls = 'pending';
        let stTxt = '待处理';
        if (x.status === 'resolved') {
          stCls = 'resolved';
          stTxt = '已修复';
        } else if (x.status === 'ignored') {
          stCls = 'ignored';
          stTxt = '已忽略';
        }

        const geoParts: string[] = [];
        if (x.country && x.country !== 'UNKNOWN') geoParts.push(formatHumanLabel(x.country));
        if (x.region && x.region !== 'UNKNOWN') geoParts.push(formatHumanLabel(x.region));
        if (x.city && x.city !== 'UNKNOWN') geoParts.push(esc(x.city));
        const geoStr = geoParts.length ? geoParts.join(' · ') : '—';

        let actions = '';
        if (x.status === 'pending') {
          actions = `
            <button class="btn-sm ok status-btn" data-id="${x.id}" data-status="resolved">标记已修复</button>
            <button class="btn-sm status-btn" data-id="${x.id}" data-status="ignored" style="margin-left:4px">忽略</button>
          `;
        } else if (x.status === 'resolved') {
          actions = `<button class="btn-sm status-btn" data-id="${x.id}" data-status="pending">重置为待处理</button>`;
        } else {
          actions = `
            <button class="btn-sm ok status-btn" data-id="${x.id}" data-status="resolved">标记已修复</button>
            <button class="btn-sm status-btn" data-id="${x.id}" data-status="pending" style="margin-left:4px">重置</button>
          `;
        }

        return `
          <tr>
            <td style="font-family:var(--mono)">#${esc(x.id)}</td>
            <td><span style="font-weight:600;color:${getBrandColor(x.platform)}">${esc(formatHumanLabel(x.platform || 'unknown'))}</span></td>
            <td>
              <div style="display:flex;align-items:center;gap:6px">
                <a href="${esc(x.source_url)}" target="_blank" rel="noopener noreferrer" class="url-cell" title="${esc(x.source_url)}">${esc(x.source_url)}</a>
                <button class="btn-sm cp-btn" data-url="${esc(x.source_url)}" style="font-size:10px;padding:1px 5px">复制</button>
              </div>
            </td>
            <td><span class="badge" style="background:var(--l);font-family:var(--mono)">${esc(x.error_code || '—')}</span></td>
            <td style="font-size:11px;color:var(--m)"><span title="${esc(geoStr)}">${esc(geoStr)}</span></td>
            <td style="text-align:center;font-weight:700;font-family:var(--mono)">${fmt(x.report_count)}</td>
            <td class="muted" style="font-size:11px">${esc(String(x.last_reported_at || x.first_reported_at || '').replace('T', ' ').slice(0, 19))}</td>
            <td><span class="badge ${stCls}">${stTxt}</span></td>
            <td style="text-align:right;white-space:nowrap">${actions}</td>
          </tr>
        `;
      })
      .join('');

    // Bind Feedback Status Update Actions
    tbody.querySelectorAll('.status-btn').forEach((btn) => {
      (btn as HTMLButtonElement).onclick = async () => {
        const id = Number((btn as HTMLElement).dataset.id);
        const status = (btn as HTMLElement).dataset.status || 'pending';
        if (!this.token) return;

        (btn as HTMLButtonElement).disabled = true;
        const origText = btn.textContent;
        btn.textContent = '同步中…';

        try {
          await updateFeedbackStatus(this.token, id, status);
          // Update in local memory snapshot
          if (this.snapshot?.feedback) {
            const target = this.snapshot.feedback.find((r) => r.id === id);
            if (target) {
              target.status = status as 'pending' | 'resolved' | 'ignored';
              if (status !== 'resolved') target.resolved_at = null;
            }
          }
          this.renderFeedbackView();
        } catch (err) {
          btn.textContent = origText;
          (btn as HTMLButtonElement).disabled = false;
          alert(`更新失败：${(err as Error).message}`);
        }
      };
    });

    // Copy URL
    tbody.querySelectorAll('.cp-btn').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const url = (btn as HTMLElement).dataset.url || '';
        navigator.clipboard.writeText(url).then(() => {
          const o = btn.textContent;
          btn.textContent = '已复制';
          setTimeout(() => { btn.textContent = o; }, 1200);
        });
      };
    });
  }

  private renderSecurityView(): void {
    if (!this.snapshot) return;
    const params = this.getFilterParams('security');
    const qSlice = buildQuarantineSlice(this.snapshot, params);
    const ov = this.currentSlice?.overview;
    const b = this.currentSlice?.breakdowns || {};
    const d = this.currentSlice?.distributions;

    const rateLimitedCount = ov?.rate_limited || (b['rate_limit_endpoint'] || []).reduce((acc, c) => acc + c.count, 0);
    const resolveReq = ov?.resolve_request || 0;
    const normalizedRate = resolveReq > 0 ? (rateLimitedCount / resolveReq * 1000).toFixed(1) : '0.0';

    const apiReq = d ? countNamed(d.channels, 'api') : 0;
    const pluginReq = d ? countNamed(d.channels, 'plugin') : 0;

    // Security KPIs
    const kpiEl = document.getElementById('securityKpis');
    if (kpiEl) {
      const secKpis = [
        { label: '429 速率拦截 (Count)', val: fmt(rateLimitedCount), sub: 'HTTP 429 频控拦截', color: rateLimitedCount > 0 ? 'var(--w)' : 'var(--t)' },
        { label: '429 拦截率 (Normalized)', val: `${normalizedRate} / 1k req`, sub: '每千次请求触发限流率', color: Number(normalizedRate) > 5 ? 'var(--r)' : 'var(--g)' },
        { label: '隔离存证拦截 (Events)', val: fmt(qSlice.totalEvents), sub: '爬虫与高频恶意请求拦截', color: 'var(--r)' },
        { label: '隔离取证日志 (Records)', val: fmt(qSlice.totalRecords), sub: '沉淀至风控沙盒的记录条目', color: 'var(--a)' },
        { label: '开放 API 调用 (Product)', val: fmt(apiReq), sub: '正常产品流量 · 非安全攻击', color: 'var(--t)' },
        { label: '播放器插件流量 (Product)', val: fmt(pluginReq), sub: '正常插件调用 · 非安全攻击', color: 'var(--t)' },
      ];
      kpiEl.innerHTML = secKpis
        .map(
          (k) => `
          <div class="card kpi-card">
            <div class="kpi-label">${esc(k.label)}</div>
            <div class="kpi-val" style="color:${k.color}">${esc(k.val)}</div>
            <div class="kpi-sub">${esc(k.sub)}</div>
          </div>
        `,
        )
        .join('');
    }

    const scopeEl = document.getElementById('securityScope');
    if (scopeEl) {
      scopeEl.textContent = '安全风控与隔离取证仅支持日期、目标平台及地域筛选；Channel 与 Client 为正常产品流量维度，不作用于安全防护层。';
      scopeEl.style.display = 'block';
    }

    const badge = document.getElementById('quarantineCountBadge');
    if (badge) badge.textContent = `${fmt(qSlice.totalRecords)} 条记录 · ${fmt(qSlice.totalEvents)} 次拦截`;

    // Render timeseries trend bars
    const trendItems = (qSlice.timeseries || []).map((t) => ({ name: t.date.slice(5), count: t.events }));
    this.renderBars('quarantineTrendBars', trendItems);

    // Summary bars by reason
    this.renderBars('quarantineSummary', qSlice.reasons || []);
    this.renderBars('rateBars', b['rate_limit_endpoint'] || []);

    const tbody = document.getElementById('quarantineRows');
    if (!tbody) return;

    if (qSlice.quarantine.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--m)">当前筛选范围内无拦截记录</td></tr>';
      return;
    }

    tbody.innerHTML = qSlice.quarantine
      .map((row: QuarantineRow) => {
        const geoParts: string[] = [];
        if (row.country && row.country !== 'UNKNOWN') geoParts.push(formatHumanLabel(row.country));
        if (row.region && row.region !== 'UNKNOWN') geoParts.push(formatHumanLabel(row.region));
        if (row.city && row.city !== 'UNKNOWN') geoParts.push(esc(row.city));
        const geoStr = geoParts.length ? geoParts.join(' · ') : '—';

        return `
          <tr>
            <td style="font-family:var(--mono);font-size:11px">${esc(row.incident_date)}</td>
            <td><span class="badge" style="background:color-mix(in srgb,var(--r) 15%,var(--p));color:var(--r)">${esc(row.reason)}</span></td>
            <td style="font-size:11px;color:var(--m)">${esc(geoStr)}</td>
            <td style="font-family:var(--mono);font-size:11px;max-width:140px;overflow:hidden;text-overflow:ellipsis" title="${esc(row.user_agent || '')}">${esc(row.user_agent || '—')}</td>
            <td><span style="font-weight:600;color:${getBrandColor(row.platform || '')}">${esc(row.platform || row.endpoint || '—')}</span></td>
            <td style="text-align:center;font-weight:700;font-family:var(--mono)">${fmt(row.count)}</td>
            <td style="text-align:right">
              <button class="btn-sm view-forensic-btn" data-id="${row.id}">查看报文</button>
            </td>
          </tr>
        `;
      })
      .join('');

    tbody.querySelectorAll('.view-forensic-btn').forEach((btn) => {
      (btn as HTMLElement).onclick = () => {
        const id = Number((btn as HTMLElement).dataset.id);
        const target = qSlice.quarantine.find((r) => r.id === id);
        if (target) {
          this.openForensicModal(target);
        }
      };
    });
  }

  private openForensicModal(row: QuarantineRow): void {
    const modal = document.getElementById('forensicModal');
    const content = document.getElementById('forensicContent');
    if (!modal || !content) return;

    let details = row.forensic_details;
    if (details) {
      try {
        const parsed = JSON.parse(details);
        details = JSON.stringify(parsed, null, 2);
      } catch {
        // Keep raw text
      }
    } else {
      details = JSON.stringify(row, null, 2);
    }

    content.textContent = details;
    modal.style.display = 'flex';
  }
}

// Boot Dashboard on DOM Ready
if (typeof document !== 'undefined') {
  const root = document.getElementById('app') || document.body;
  const app = new DashboardApp(root);
  app.start().catch((err) => {
    console.error('Fatal Dashboard Error:', err);
  });
}
