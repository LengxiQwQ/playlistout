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
} from './engine';
import type {
  AnalyticsSnapshot,
  AnalyticsSlice,
  FeedbackRow,
  QuarantineRow,
  CountItem,
} from './types';

const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] || m));

const fmt = (n: unknown): string => Number(n || 0).toLocaleString();
const pct = (n: unknown): string => Number(n || 0).toFixed(1) + '%';

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
.brand { display: flex; align-items: center; gap: 9px; flex-shrink: 0; text-decoration: none; color: inherit; cursor: pointer; transition: opacity .15s; }
.brand:hover { opacity: .8; }
.logo-img { width: 32px; height: 32px; border-radius: 8px; object-fit: cover; display: block; flex-shrink: 0; box-shadow: 0 1px 3px rgba(0,0,0,.15); border: 1px solid var(--l); }
.brand-info { display: flex; align-items: center; }
h1 { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -.3px; display: flex; align-items: center; gap: 7px; }
.badge-tag { font-size: 10.5px; font-weight: 700; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--a) 12%, transparent); color: var(--a); border: 1px solid color-mix(in srgb, var(--a) 25%, transparent); }
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
  private currentPage = 'overview';
  private activePreset = 'all';
  private activeTrendIdx = -1;
  private chartViews: Record<string, string> = {
    trend: 'bar',
    platform: 'donut',
    client: 'bar',
    country: 'bar',
    region: 'bar',
    device: 'donut',
    latency: 'donut',
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
            <a href="https://playlistout.lengxiqwq.com/" class="brand" title="访问 Playlist Out 官方主页 ↗">
              <img src="/logo-64.png" width="32" height="32" class="logo-img" alt="Playlist Out" onerror="this.onerror=null;this.src='/favicon.svg'">
              <div class="brand-info">
                <h1>Playlist Out <span class="badge-tag">Analytics</span></h1>
              </div>
            </a>
            <nav class="tabs">
              <button class="tab ${this.currentPage === 'overview' ? 'active' : ''}" data-page="overview">
                <span class="tab-icon">📊</span>
                <span class="tab-text"><span class="tab-title">业务总览</span><span class="tab-sub">Overview</span></span>
              </button>
              <button class="tab ${this.currentPage === 'feedback' ? 'active' : ''}" data-page="feedback">
                <span class="tab-icon">🐛</span>
                <span class="tab-text"><span class="tab-title">待审歌单</span><span class="tab-sub">Feedback</span></span>
                <span id="navPendingBadge" class="tab-badge" style="display:none">0</span>
              </button>
              <button class="tab ${this.currentPage === 'web' ? 'active' : ''}" data-page="web">
                <span class="tab-icon">💻</span>
                <span class="tab-text"><span class="tab-title">终端地域</span><span class="tab-sub">Web</span></span>
              </button>
              <button class="tab ${this.currentPage === 'reliability' ? 'active' : ''}" data-page="reliability">
                <span class="tab-icon">🛡️</span>
                <span class="tab-text"><span class="tab-title">稳定偏好</span><span class="tab-sub">Reliability</span></span>
              </button>
              <button class="tab ${this.currentPage === 'integrations' ? 'active' : ''}" data-page="integrations">
                <span class="tab-icon">🔌</span>
                <span class="tab-text"><span class="tab-title">生态集成</span><span class="tab-sub">Integrations</span></span>
              </button>
              <button class="tab ${this.currentPage === 'security' ? 'active' : ''}" data-page="security">
                <span class="tab-icon">🔒</span>
                <span class="tab-text"><span class="tab-title">安全风控</span><span class="tab-sub">Security</span></span>
              </button>
              <button class="tab ${this.currentPage === 'dau' ? 'active' : ''}" data-page="dau">
                <span class="tab-icon">📈</span>
                <span class="tab-text"><span class="tab-title">日活 DAU</span><span class="tab-sub">Daily Active</span></span>
              </button>
            </nav>
            <div class="headright">
              <label class="toggle-switch" title="一键排除所有来自马来西亚的测试记录（默认关闭）">
                <input type="checkbox" id="switchExcludeMy" ${this.excludeMy ? 'checked' : ''}>
                <span class="toggle-slider"></span>
                <span class="toggle-switch-text">排除 MY 测试</span>
              </label>
              <div id="updatedTime" style="display:flex;flex-direction:column;font-size:10px;line-height:1.25;color:var(--m);text-align:right">
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
            <div style="display:flex;align-items:center;gap:10px">
              <div class="filter-card-title"><span>⚙️</span> 维度与时间筛选工具栏 (Filters)</div>
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
            <div class="field"><label for="filterChannel">来源渠道 Channel</label><select id="filterChannel"><option value="">全部渠道</option><option value="web">网页端 (Web)</option><option value="cli">命令行 (CLI)</option><option value="plugin">播放器插件 (Plugin)</option><option value="api">开放接口 (API)</option><option value="legacy_mixed">历史混合渠道 (Legacy V1)</option></select></div>
            <div class="field"><label for="filterClient">接入端 Client</label><select id="filterClient"><option value="">全部端</option></select></div>
            <div class="field"><label for="filterPlatform">目标平台 Platform</label><select id="filterPlatform"><option value="">全部平台</option><option value="qqmusic">QQ 音乐</option><option value="netease">网易云音乐</option><option value="kugou">酷狗音乐</option><option value="kuwo">酷我音乐</option><option value="qishui">汽水音乐</option><option value="migu">咪咕音乐</option></select></div>
            <div class="field"><label for="filterCountry">国家 Country</label><select id="filterCountry"><option value="">全部国家</option></select></div>
            <div class="field"><label for="filterRegion">省份 (中国) Region</label><select id="filterRegion"><option value="">全部省份</option></select></div>
            <div class="field" style="display:flex;align-items:end"><button id="resetFiltersBtn" class="ghost" style="width:100%">重置</button></div>
          </div>
        </div>

        <!-- 1. 业务总览 (Overview) -->
        <section class="page ${this.currentPage === 'overview' ? 'active' : ''}" id="page-overview">
          <div class="section">
            <div><h2>业务总览 Overview</h2></div>
          </div>
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
                  <h3>🎵 请求目标平台</h3>
                  <div class="muted" style="font-size:11px">解析次数</div>
                </div>
                <div class="view-switch" data-target="platform">
                  <button class="active" data-view="donut" title="环形占比分布图">🍩 占比</button>
                  <button data-view="bar" title="横向排行列表">📊 排行</button>
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
                  <div class="muted" style="font-size:11px">请求总次数</div>
                </div>
                <div class="view-switch" data-target="client">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="donut" title="环形占比分布图">🍩 占比</button>
                </div>
              </div>
              <div id="clientBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🩺 数据质量 Data Quality</h3><span class="muted" style="font-size:11px">守恒校验</span></div>
              <div id="qualityChecks"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
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
            <div class="panel">
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
        </section>

        <!-- 2. 待审歌单 (Feedback) -->
        <section class="page ${this.currentPage === 'feedback' ? 'active' : ''}" id="page-feedback">
          <div class="section">
            <div>
              <h2>待审歌单与失败排查 (Review & Feedback)</h2>
              <div class="muted">解析失败反馈工作流：审查用户上报的真实失败歌单链接，快速复现、一键标记修复并同步 Cloudflare D1。</div>
            </div>
            <div style="display:flex;gap:6px;align-items:center">
              <button class="ghost fb-tab ${this.currentFbStatus === 'pending' ? 'active' : ''}" data-fb-status="pending">待处理 Pending (<span id="fbCountPending">0</span>)</button>
              <button class="ghost fb-tab ${this.currentFbStatus === 'all' ? 'active' : ''}" data-fb-status="all">全部 All (<span id="fbCountAll">0</span>)</button>
              <button class="ghost fb-tab ${this.currentFbStatus === 'resolved' ? 'active' : ''}" data-fb-status="resolved">已修复 Resolved (<span id="fbCountResolved">0</span>)</button>
              <button class="ghost fb-tab ${this.currentFbStatus === 'ignored' ? 'active' : ''}" data-fb-status="ignored">已忽略 Ignored (<span id="fbCountIgnored">0</span>)</button>
              <button id="reloadFeedbackBtn" class="ghost">刷新列表</button>
            </div>
          </div>
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

        <!-- 3. 终端与地域 (Web) -->
        <section class="page ${this.currentPage === 'web' ? 'active' : ''}" id="page-web">
          <div class="section">
            <div><h2>官网访客与终端环境 Web</h2><div class="muted">官网访问、来源与客户端环境。</div></div>
          </div>
          <div id="webKpis" class="kpis"></div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head"><h3>🔗 访问来源 Referrer</h3><span class="muted" style="font-size:11px">访问量 (PV)</span></div>
              <div id="referrerBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🌐 浏览器 Browser</h3><span class="muted" style="font-size:11px">人次占比</span></div>
              <div id="browserBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>💻 终端与系统 Device / OS</h3>
                  <div class="muted" style="font-size:11px">人次分布</div>
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
          <div class="grid2">
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🌍 访问国家</h3>
                  <div class="muted" style="font-size:11px">独立访客 (UV)</div>
                </div>
                <div class="view-switch" data-target="webCountry">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="table" title="明细数据表">📋 表格</button>
                </div>
              </div>
              <div id="webCountryBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>🏙️ 中国省份 / 直辖市</h3>
                  <div class="muted" style="font-size:11px">独立访客 (UV)</div>
                </div>
                <div class="view-switch" data-target="webRegion">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="table" title="明细数据表">📋 表格</button>
                </div>
              </div>
              <div id="webRegionBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 4. 稳定性与偏好 (Reliability) -->
        <section class="page ${this.currentPage === 'reliability' ? 'active' : ''}" id="page-reliability">
          <div class="section">
            <div><h2>稳定性诊断与偏好 Reliability</h2><div class="muted">失败原因、阶段、链路与耗时；可靠性 breakdown 不做地理关联。</div></div>
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
                  <div class="muted" style="font-size:11px">耗时区间占比</div>
                </div>
                <div class="view-switch" data-target="latency">
                  <button class="active" data-view="donut" title="环形占比分布图">🍩 占比</button>
                  <button data-view="bar" title="横向排行列表">📊 排行</button>
                </div>
              </div>
              <div id="latencyBars" class="bars"></div>
            </div>
          </div>
          <div class="grid3">
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
              <div class="panel-head"><h3>🛣️ 通道调度 Provider Path</h3><span class="muted" style="font-size:11px">主备调用</span></div>
              <div id="providerBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🎯 调用端点 Endpoint</h3><span class="muted" style="font-size:11px">请求数</span></div>
              <div id="endpointBars" class="bars"></div>
            </div>
          </div>
          <div class="grid3">
            <div class="panel">
              <div class="panel-head"><h3>📊 歌单曲目量 Playlist Size</h3><span class="muted" style="font-size:11px">导出份数</span></div>
              <div id="exportSizeBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head">
                <div>
                  <h3>📄 导出格式 Export Format</h3>
                  <div class="muted" style="font-size:11px">生成次数</div>
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
                  <div class="muted" style="font-size:11px">复制次数</div>
                </div>
                <div class="view-switch" data-target="clipboard">
                  <button class="active" data-view="bar" title="横向排行列表">📊 排行</button>
                  <button data-view="donut" title="环形占比分布图">🍩 占比</button>
                </div>
              </div>
              <div id="clipboardModeBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 5. 生态集成与插件接入 (Integrations) -->
        <section class="page ${this.currentPage === 'integrations' ? 'active' : ''}" id="page-integrations">
          <div class="section">
            <div><h2>生态集成与插件接入 Integrations</h2><div class="muted">客户端生态、MusicFree 与 BBPlayer 专区。</div></div>
          </div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head"><h3>🔌 接入端全貌 Resolve Clients</h3><span class="muted" style="font-size:11px">请求总次数</span></div>
              <div id="integrationClients" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🚀 迁移跳转目标 Migration</h3><span class="muted" style="font-size:11px">跳转次数</span></div>
              <div id="migrationBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel" style="border-top:3px solid #8b5cf6">
              <div class="panel-head">
                <h3 style="color:#8b5cf6">🟣 MusicFree · 插件版本 Versions</h3>
                <span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">请求数</span>
              </div>
              <div id="versionBars" class="bars"></div>
            </div>
            <div class="panel" style="border-top:3px solid #8b5cf6">
              <div class="panel-head">
                <h3 style="color:#8b5cf6">📱 MusicFree · 宿主系统 Hosts</h3>
                <span class="badge" style="background:color-mix(in srgb,#8b5cf6 15%,var(--p));color:#8b5cf6">系统分布</span>
              </div>
              <div id="hostBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel" style="border-top:3px solid #fb7299">
              <div class="panel-head">
                <h3 style="color:#fb7299">🌸 BBPlayer · 客户端版本 Versions</h3>
                <span class="badge" style="background:color-mix(in srgb,#fb7299 15%,var(--p));color:#fb7299">请求数</span>
              </div>
              <div id="bbplayerVersionBars" class="bars"></div>
            </div>
            <div class="panel" style="border-top:3px solid #fb7299">
              <div class="panel-head">
                <h3 style="color:#fb7299">📱 BBPlayer · 宿主系统 Hosts</h3>
                <span class="badge" style="background:color-mix(in srgb,#fb7299 15%,var(--p));color:#fb7299">系统分布</span>
              </div>
              <div id="bbplayerHostBars" class="bars"></div>
            </div>
          </div>
        </section>

        <!-- 6. 安全风控 (Security) -->
        <section class="page ${this.currentPage === 'security' ? 'active' : ''}" id="page-security">
          <div class="section">
            <div><h2>安全防护与防爬隔离 Security</h2><div class="muted">API 是产品流量；Bot、429、Quarantine 才是安全层 · 速率限流与遥测沙盒隔离。</div></div>
          </div>
          <div class="grid2">
            <div class="panel">
              <div class="panel-head"><h3>🛑 429 限流端点 Rate Limits</h3><span class="muted" style="font-size:11px">拦截次数</span></div>
              <div id="rateBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🛡️ 隔离原因 Quarantine Summary</h3><span class="muted" style="font-size:11px">隔离次数</span></div>
              <div id="quarantineSummary" class="bars"></div>
            </div>
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

        <!-- 7. 日活 DAU (Daily Active Users) -->
        <section class="page ${this.currentPage === 'dau' ? 'active' : ''}" id="page-dau">
          <div class="section">
            <div><h2>全端日活与触达 DAU</h2><div class="muted">总日活 = 网站去重访客 + 插件 / CLI 每日去重活跃（读时合并，网站历史数据已全部并入）· 按 UTC 日期统计（北京时间约等于 UTC+8，清晨计入新一天）。</div></div>
          </div>
          <div id="dauKpis" class="kpis"></div>
          <div class="panel">
            <div class="panel-head">
              <div>
                <h3>📈 全端日活趋势 (DAU Trend)</h3>
                <div class="muted" style="font-size:11px">每日去重活跃 (UV) · 柱状为分端堆叠，折线为合计</div>
              </div>
              <div class="trend-legend">
                <span><span class="legend-dot" style="background:#0284c7"></span>Playlist Out Web</span>
                <span><span class="legend-dot" style="background:#8b5cf6"></span>生态插件端</span>
                <span><span class="legend-dot" style="background:#10b981"></span>Playlist Out CLI</span>
                <span><span class="legend-dot" style="background:#f97316"></span>全端合计日活</span>
              </div>
            </div>
            <div class="trend-box" id="dauTrendBox">
              <canvas id="dauTrendCanvas"></canvas>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head"><h3>🧩 接入端明细 Clients</h3><span class="muted" style="font-size:11px">多端日活对比</span></div>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>接入端 Client</th>
                      <th style="width:80px">渠道类型</th>
                      <th style="text-align:right;width:100px">今日活跃 (UV)</th>
                      <th style="text-align:right;width:100px">昨日活跃 (UV)</th>
                      <th style="text-align:right;width:110px">周期累计人次</th>
                    </tr>
                  </thead>
                  <tbody id="dauClientRows"></tbody>
                </table>
              </div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🕐 单日小时分布 (UTC)</h3><span class="muted" style="font-size:11px">小时活跃 (UV)</span></div>
              <div id="dauHourBars" class="bars"></div>
            </div>
          </div>
          <div class="grid2" style="margin-top:12px">
            <div class="panel">
              <div class="panel-head"><h3>🌍 活跃国家</h3><span class="muted" style="font-size:11px">活跃用户 (UV)</span></div>
              <div id="dauCountryBars" class="bars"></div>
            </div>
            <div class="panel">
              <div class="panel-head"><h3>🏙️ 省份 / 地区</h3><span class="muted" style="font-size:11px">活跃用户 (UV)</span></div>
              <div id="dauRegionBars" class="bars"></div>
            </div>
          </div>
          <div class="panel" style="margin-top:12px;border-left:3px solid var(--a)">
            <div class="panel-head"><h3>📐 口径说明 Metric Semantics</h3></div>
            <div class="muted" style="font-size:12px;line-height:1.9">
              <div>• <strong>Playlist Out Web</strong>：网站每日去重访客（沿用网站原有的 <code>visitor_unique</code> 匿名访客统计，历史数据全部并入趋势与合计，未另建一套记录）。</div>
              <div>• <strong>生态插件端</strong>：插件被加载即计（新版本：每日一次加载心跳；旧版本：当天首次使用行为由服务端派生计入；升级过渡期两种口径混排）。</div>
              <div>• <strong>Playlist Out CLI</strong>：实际使用即计（解析 / 导出时由服务端派生计入；<code>--no-telemetry</code> 用户不计入）。</div>
              <div>• 合并口径：总日活 = 网站 + 插件 + CLI；去重键为 UTC 日期 × 渠道 × 客户端 × 匿名截断哈希——同一端同一人同天仅计一次（心跳与解析遥测共享同一身份，不因两种上报重复计），同一天使用多个端则各计一次，跨天不保持身份。</div>
              <div>• 已知边界：NAT / 共享出口可能低估；移动端冷启动跨 IP 可能轻微高估。插件升级当天已按「去版本号」归一，不会把同一人重复计入。</div>
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
        trendTip.style.left = `${snapX}px`;
        trendTip.style.top = '30px';
        trendTip.style.display = 'block';

        this.drawCanvasChart();
      });

      trendBox.addEventListener('mouseleave', () => {
        trendTip.style.display = 'none';
        this.activeTrendIdx = -1;
        this.drawCanvasChart();
      });
    }

    window.addEventListener('resize', () => {
      if (this.currentPage === 'overview') {
        this.drawCanvasChart();
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

    if (page === 'overview') {
      requestAnimationFrame(() => this.drawCanvasChart());
    } else if (page === 'feedback') {
      this.renderFeedbackView();
    } else if (page === 'security') {
      this.renderSecurityView();
    } else if (page === 'dau') {
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

  private getFilterParams() {
    const f = (document.getElementById('fromDateInput') as HTMLInputElement)?.value || '';
    const t = (document.getElementById('toDateInput') as HTMLInputElement)?.value || '';
    const channel = (document.getElementById('filterChannel') as HTMLSelectElement)?.value || '';
    const client = (document.getElementById('filterClient') as HTMLSelectElement)?.value || '';
    const platform = (document.getElementById('filterPlatform') as HTMLSelectElement)?.value || '';
    const country = (document.getElementById('filterCountry') as HTMLSelectElement)?.value || '';
    const region = (document.getElementById('filterRegion') as HTMLSelectElement)?.value || '';

    return {
      from: f,
      to: t,
      channel,
      client,
      platform,
      country,
      region,
      exclude_my: this.excludeMy,
    };
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
    this.populateSelect('filterClient', this.currentSlice.availableFilters.clients, params.client);
    this.populateSelect('filterCountry', this.currentSlice.availableFilters.countries, params.country);
    this.populateSelect('filterRegion', this.currentSlice.availableFilters.regions, params.region);

    this.renderChips(params);
    this.renderOverviewTab();
    this.renderWebTab();
    this.renderReliabilityTab();
    this.renderIntegrationsTab();
    this.renderDauTab();
    this.renderFeedbackView();
    this.renderSecurityView();

    if (this.currentPage === 'overview') {
      requestAnimationFrame(() => this.drawCanvasChart());
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

  private renderChips(params: Record<string, unknown>): void {
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
    let offset = 0;
    let slicesHtml = '';
    let legendHtml = '';

    a.forEach((item, idx) => {
      const count = Number(item.count || 0);
      const ratio = count / total;
      const strokeDash = (ratio * circ).toFixed(2);
      const strokeOffset = (-offset).toFixed(2);
      offset += ratio * circ;
      const c = colorOverride || getBrandColor(item.name);
      const rawLbl = labelFormatter ? labelFormatter(item.name) : formatHumanLabel(item.name);
      const pctStr = (ratio * 100).toFixed(1) + '%';
      slicesHtml += `<circle class="donut-slice" cx="80" cy="80" r="${r}" fill="none" stroke="${c}" stroke-width="22" stroke-dasharray="${strokeDash} ${(circ - Number(strokeDash)).toFixed(2)}" stroke-dashoffset="${strokeOffset}" data-idx="${idx}" data-val="${fmt(count)}" data-pct="${pctStr}" data-lbl="${esc(rawLbl)}"></circle>`;
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
      if (this.chartViews['webCountry'] === 'table') this.rankedTable('webCountryBars', geo.countries, '独立访客 (UV)');
      else this.renderBars('webCountryBars', geo.countries);
    } else if (key === 'webRegion') {
      if (this.chartViews['webRegion'] === 'table') this.rankedTable('webRegionBars', geo.regions, '独立访客 (UV)');
      else this.renderBars('webRegionBars', geo.regions);
    }
  }

  private renderOverviewTab(): void {
    if (!this.currentSlice) return;
    const ov = this.currentSlice.overview;
    const dau = this.currentSlice.dau;

    const kpiItems = [
      { label: '解析请求总量', val: fmt(ov.resolve_request), sub: '歌单解析总请求', color: 'var(--t)' },
      { label: '成功解析歌单', val: fmt(ov.playlist_success + ov.user_success), sub: `成功率 ${pct(ov.success_rate)}`, color: 'var(--g)' },
      { label: '解析失败量', val: fmt(ov.resolve_failure), sub: `失败率 ${pct(100 - ov.success_rate)}`, color: ov.resolve_failure > 0 ? 'var(--w)' : 'var(--g)' },
      { label: '导出与快速复制', val: fmt(ov.export + ov.clipboard), sub: `${fmt(ov.export)} 导出 · ${fmt(ov.clipboard)} 剪贴`, color: 'var(--a)' },
      { label: '今日全端日活', val: fmt(dau.today.total), sub: `Web ${fmt(dau.today.web)} · 插件 ${fmt(dau.today.plugin)} · CLI ${fmt(dau.today.cli)}`, color: 'var(--a)' },
      { label: '活跃客户端种类', val: fmt(ov.active_clients), sub: '覆盖生态接入端数', color: 'var(--t)' },
      { label: '待审失败歌单', val: fmt(ov.pending_feedback), sub: ov.pending_feedback > 0 ? '待复现与修复' : '暂无待审异常', color: ov.pending_feedback > 0 ? 'var(--w)' : 'var(--g)' },
    ];

    const kpiEl = document.getElementById('overviewKpis');
    if (kpiEl) {
      kpiEl.innerHTML = kpiItems
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

    // Data Quality
    const dq = this.currentSlice.dataQuality;
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

  private renderWebTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;
    const env = this.currentSlice.environment;
    const ov = this.currentSlice.overview;
    const pv = ov.page_view || 0;
    const uv = ov.visitor_unique || 0;
    const depth = uv > 0 ? (pv / uv).toFixed(1) : '1.0';

    const webKpiItems = [
      { label: '页面访问总量 (PV)', val: fmt(pv), sub: '官网页面浏览量', color: 'var(--t)' },
      { label: '独立访客人数 (UV)', val: fmt(uv), sub: '官网去重访客数', color: 'var(--a)' },
      { label: '人均浏览深度', val: depth, sub: '平均每人浏览页数', color: 'var(--g)' },
      { label: '访问来源种类', val: String((b['referrer_source'] || []).length), sub: 'Referrer 渠道', color: 'var(--t)' },
      { label: '覆盖国家分布', val: String(this.currentSlice.geo.countries.length), sub: '全球访问地域', color: 'var(--t)' },
      { label: '覆盖省州地区', val: String(this.currentSlice.geo.regions.length), sub: '全球省份/州级地域', color: 'var(--t)' },
    ];
    const webKpiEl = document.getElementById('webKpis');
    if (webKpiEl) {
      webKpiEl.innerHTML = webKpiItems
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

    const webBrowsers = (env.browsers || []).filter((x) => {
      const n = String(x.name || '').toLowerCase();
      return !n.startsWith('plugin:') && !['musicfree', 'bbplayer', 'anonymous_api', 'official_cli', 'internal'].includes(n);
    });

    this.renderBars('referrerBars', b['referrer_source'] || [], undefined, undefined, (x) => x);
    this.renderBars('browserBars', webBrowsers, undefined, undefined, formatBrowserLabel);
    this.renderComponent('device');
    this.renderBars('osBars', env.operatingSystems, undefined, undefined, formatOsLabel);
    this.renderComponent('webCountry');
    this.renderComponent('webRegion');
  }

  private renderReliabilityTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;
    const ov = this.currentSlice.overview;

    const relKpiItems = [
      { label: '解析请求总量', val: fmt(ov.resolve_request), sub: '总解析调用', color: 'var(--t)' },
      { label: '成功解析歌单', val: fmt(ov.playlist_success + ov.user_success), sub: '主备通道成功总和', color: 'var(--g)' },
      { label: '解析失败量', val: fmt(ov.resolve_failure), sub: '最终未成功解析', color: ov.resolve_failure > 0 ? 'var(--r)' : 'var(--g)' },
      { label: '端到端成功率', val: pct(ov.success_rate), sub: '成功请求占比', color: ov.success_rate >= 80 ? 'var(--g)' : 'var(--w)' },
      { label: '本地文件导出', val: fmt(ov.export), sub: 'XLSX/CSV/TXT/JSON等', color: 'var(--a)' },
      { label: '剪贴板快捷复制', val: fmt(ov.clipboard), sub: '一键复制歌单文本', color: 'var(--a)' },
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
    this.renderComponent('requestedType');
    this.renderBars('providerBars', b['provider_failure_path'] || []);
    this.renderBars('endpointBars', b['endpoint'] || []);
    this.renderBars('exportSizeBars', b['export_playlist_size'] || []);
    this.renderComponent('exportFormat');
    this.renderComponent('clipboard');
  }

  private renderIntegrationsTab(): void {
    if (!this.currentSlice) return;
    const b = this.currentSlice.breakdowns;

    this.renderBars('integrationClients', this.currentSlice.distributions.clients);
    this.renderBars('migrationBars', b['migration_destination'] || []);
    this.renderBars('versionBars', b['musicfree_version'] || b['client_version'] || []);
    this.renderBars('hostBars', b['musicfree_host'] || b['host_platform'] || []);
    this.renderBars('bbplayerVersionBars', b['bbplayer_version'] || []);
    this.renderBars('bbplayerHostBars', b['bbplayer_host'] || []);
  }

  private renderDauTab(): void {
    if (!this.currentSlice) return;
    const dau = this.currentSlice.dau;

    const delta = (today: number, yesterday: number): string => {
      if (yesterday <= 0) return today > 0 ? '昨日无数据' : '较昨日持平';
      const d = Math.round(((today - yesterday) / yesterday) * 1000) / 10;
      return `较昨日 ${d >= 0 ? '+' : ''}${d.toFixed(1)}%`;
    };

    const recent = dau.series.slice(-30);
    const peak = recent.reduce((acc, p) => Math.max(acc, p.total), 0);

    const kpiItems = [
      {
        label: '今日全端日活用户',
        val: fmt(dau.today.total),
        sub: `昨日 ${fmt(dau.yesterday.total)} · ${delta(dau.today.total, dau.yesterday.total)}`,
        color: 'var(--t)',
      },
      { label: '今日 Web 访客', val: fmt(dau.today.web), sub: `较昨日 ${delta(dau.today.web, dau.yesterday.web)}`, color: '#0284c7' },
      { label: '今日插件活跃', val: fmt(dau.today.plugin), sub: `较昨日 ${delta(dau.today.plugin, dau.yesterday.plugin)}`, color: '#8b5cf6' },
      { label: '今日 CLI 活跃', val: fmt(dau.today.cli), sub: `较昨日 ${delta(dau.today.cli, dau.yesterday.cli)}`, color: 'var(--g)' },
      { label: '活跃客户端种类', val: String(dau.clients.length), sub: '覆盖生态接入端数', color: 'var(--a)' },
      { label: '近 30 天日活峰值', val: fmt(peak), sub: '单日最高去重活跃', color: 'var(--w)' },
    ];

    const kpiEl = document.getElementById('dauKpis');
    if (kpiEl) {
      kpiEl.innerHTML = kpiItems
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

    const tbody = document.getElementById('dauClientRows');
    if (tbody) {
      // 网站（Web）行：数据沿用网站既有的 visitor_unique 匿名访客统计，
      // 与其他渠道在同一张表里合并展示，避免“日活只有插件一家”的误解。
      const webRow = `
          <tr>
            <td>
              <span style="font-weight:600;color:${getBrandColor('official_web')}">${esc(formatHumanLabel('official_web'))}</span>
              <div class="muted" style="font-size:11px;font-family:var(--mono)">official_web</div>
            </td>
            <td><span class="badge" style="background:var(--l)">网页端</span></td>
            <td style="text-align:right;font-family:var(--mono);font-weight:700">${fmt(dau.today.web)}</td>
            <td style="text-align:right;font-family:var(--mono)">${fmt(dau.yesterday.web)}</td>
            <td style="text-align:right;font-family:var(--mono)">${fmt(this.currentSlice.overview.visitor_unique)}</td>
          </tr>`;
      const integrationRows = dau.clients
        .map(
          (c) => `
          <tr>
            <td>
              <span style="font-weight:600;color:${getBrandColor(c.client)}">${esc(formatHumanLabel(c.client))}</span>
              <div class="muted" style="font-size:11px;font-family:var(--mono)">${esc(c.client)}</div>
            </td>
            <td><span class="badge" style="background:var(--l)">${c.channel === 'plugin' ? '插件端' : c.channel === 'cli' ? 'CLI 终端' : esc(formatHumanLabel(c.channel))}</span></td>
            <td style="text-align:right;font-family:var(--mono);font-weight:700">${fmt(c.today)}</td>
            <td style="text-align:right;font-family:var(--mono)">${fmt(c.yesterday)}</td>
            <td style="text-align:right;font-family:var(--mono)">${fmt(c.total)}</td>
          </tr>
        `,
        )
        .join('');
      tbody.innerHTML =
        webRow +
        (integrationRows ||
          '<tr><td colspan="5" style="text-align:center;padding:14px;color:var(--m)">插件 / CLI 暂无记录（等待心跳与使用遥测上报）</td></tr>');
    }

    this.renderBars('dauCountryBars', dau.countries);
    this.renderBars('dauRegionBars', dau.regions);
    this.renderDauHourBars();
  }

  private renderDauHourBars(): void {
    const el = document.getElementById('dauHourBars');
    if (!el || !this.currentSlice) return;
    const hours = this.currentSlice.dau.hours;
    if (hours.length === 0) {
      el.innerHTML = '<div style="color:var(--m);padding:8px 0;font-size:12px">筛选「单日」时展示该日的小时分布</div>';
      return;
    }
    const max = Math.max(...hours.map((h) => h.total), 1);
    el.innerHTML = hours
      .map((h) => {
        const p = Math.min(100, Math.round((h.total / max) * 1000) / 10);
        return `
          <div class="bar">
            <div class="bn"><span>${String(h.hour).padStart(2, '0')}:00</span></div>
            <div class="track"><div class="fill" style="width:${p}%;background:var(--a)"></div></div>
            <div class="num"><span class="val">${fmt(h.total)}</span></div>
          </div>
        `;
      })
      .join('');
  }

  private drawDauChart(): void {
    if (!this.currentSlice) return;
    const canvas = document.getElementById('dauTrendCanvas') as HTMLCanvasElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const data = this.currentSlice.dau.series.slice(-30);

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
      ctx.fillText('当前筛选无日活数据', w / 2, h / 2);
      return;
    }

    const padLeft = 40;
    const padRight = 20;
    const padTop = 20;
    const padBottom = 30;

    let maxVal = 1;
    for (const d of data) {
      if (d.total > maxVal) maxVal = d.total;
    }
    maxVal = Math.ceil(maxVal * 1.15);

    const plotW = w - padLeft - padRight;
    const plotH = h - padTop - padBottom;

    // Grid + Y-axis labels
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

    const stepX = plotW / data.length;
    const barW = Math.max(3, Math.min(22, stepX * 0.62));
    const stackOrder: Array<{ key: 'cli' | 'plugin' | 'web'; color: string }> = [
      { key: 'cli', color: '#10b981' },
      { key: 'plugin', color: '#8b5cf6' },
      { key: 'web', color: '#0284c7' },
    ];

    // Stacked channel bars
    const totalPoints: Array<{ x: number; y: number }> = [];
    data.forEach((d, i) => {
      const cx = padLeft + stepX * i + stepX / 2;
      const x0 = cx - barW / 2;
      let yBase = padTop + plotH;
      for (const seg of stackOrder) {
        const val = Number(d[seg.key] || 0);
        if (val <= 0) continue;
        const segH = (val / maxVal) * plotH;
        ctx.fillStyle = seg.color;
        ctx.fillRect(x0, yBase - segH, barW, segH);
        yBase -= segH;
      }
      totalPoints.push({ x: cx, y: padTop + plotH - (Number(d.total || 0) / maxVal) * plotH });
    });

    // Total DAU line
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 2;
    ctx.beginPath();
    totalPoints.forEach((pt, i) => {
      if (i === 0) ctx.moveTo(pt.x, pt.y);
      else ctx.lineTo(pt.x, pt.y);
    });
    ctx.stroke();

    ctx.fillStyle = '#f97316';
    for (const pt of totalPoints) {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // X-axis labels
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    const step = Math.ceil(data.length / 8);
    data.forEach((d, i) => {
      if (i % step === 0 || i === data.length - 1) {
        ctx.fillText(String(d.date || '').slice(5), padLeft + stepX * i + stepX / 2, h - 8);
      }
    });
  }

  private renderFeedbackView(): void {
    if (!this.snapshot) return;
    const params = this.getFilterParams();
    const fbSlice = buildFeedbackSlice(this.snapshot, {
      ...params,
      status: this.currentFbStatus,
    });

    const pendingCountEl = document.getElementById('fbCountPending');
    const allCountEl = document.getElementById('fbCountAll');
    const resolvedCountEl = document.getElementById('fbCountResolved');
    const ignoredCountEl = document.getElementById('fbCountIgnored');

    if (pendingCountEl) pendingCountEl.textContent = String(fbSlice.counts.pending);
    if (allCountEl) allCountEl.textContent = String(fbSlice.counts.all);
    if (resolvedCountEl) resolvedCountEl.textContent = String(fbSlice.counts.resolved);
    if (ignoredCountEl) ignoredCountEl.textContent = String(fbSlice.counts.ignored);

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
    if (!this.snapshot || !this.currentSlice) return;
    const b = this.currentSlice.breakdowns;

    this.renderBars('rateBars', b['rate_limit_endpoint'] || []);

    const params = this.getFilterParams();
    const qSlice = buildQuarantineSlice(this.snapshot, params);

    const badge = document.getElementById('quarantineCountBadge');
    if (badge) badge.textContent = `${fmt(qSlice.totalRecords)} 条记录 · ${fmt(qSlice.totalEvents)} 次拦截`;

    // Summary bars by reason
    const reasonsMap = new Map<string, number>();
    for (const r of qSlice.quarantine) {
      reasonsMap.set(r.reason, (reasonsMap.get(r.reason) || 0) + Number(r.count || 0));
    }
    const reasonItems = Array.from(reasonsMap.entries()).map(([name, count]) => ({ name, count }));
    this.renderBars('quarantineSummary', reasonItems);

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
