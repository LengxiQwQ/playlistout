/**
 * Kugou QR Code Authentication Provider
 * Handles QR code generation and status polling for user login.
 */

import {
  md5,
  signKugouLoginParams,
  KUGOU_LITE_APPID,
  KUGOU_LITE_CLIENTVER,
} from './crypto';

export interface KugouQrSession {
  qrcode: string;
  qrcodeImg: string;
  loginUrl: string;
  expiresAt: number;
}

export interface KugouQrStatusResult {
  status: 'waiting' | 'scanned' | 'success' | 'expired' | 'failed';
  token?: string;
  userid?: string;
  message?: string;
}

const KUGOU_LOGIN_HEADERS = {
  'User-Agent': 'Android15-1070-11083-46-0-DiscoveryDRADProtocol-wifi',
  'kg-rc': '1',
  'kg-thash': '5d816a0',
  'kg-rec': '1',
  'kg-rf': 'B9EDA08A64250DEFFBCADDEE00F8F25F',
  Accept: 'application/json',
};

/**
 * Requests a new QR code login session from Kugou official authentication service.
 */
export async function createKugouQrCode(): Promise<KugouQrSession> {
  const clienttime = String(Math.floor(Date.now() / 1000));
  const mid = md5(`playlistout_${clienttime}_${Math.random()}`);

  const params: Record<string, string> = {
    appid: KUGOU_LITE_APPID,
    clientver: KUGOU_LITE_CLIENTVER,
    clienttime,
    dfid: '-',
    mid,
    uuid: '-',
    type: '1',
    plat: '4',
    qrcode_txt: `https://h5.kugou.com/apps/loginQRCode/html/index.html?appid=${KUGOU_LITE_APPID}&`,
    srcappid: '2919',
  };

  params.signature = signKugouLoginParams(params);

  const queryString = new URLSearchParams(params).toString();
  const url = `https://login-user.kugou.com/v2/qrcode?${queryString}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...KUGOU_LOGIN_HEADERS,
      dfid: '-',
      clienttime,
      mid,
    },
  });

  if (!response.ok) {
    throw new Error(`Kugou QR code creation HTTP error: ${response.status}`);
  }

  const json = (await response.json()) as {
    status?: number;
    error_code?: number;
    data?: {
      qrcode?: string;
      qrcode_img?: string;
    };
  };

  if (json.status !== 1 || !json.data?.qrcode) {
    throw new Error(
      `Failed to create Kugou QR code: error_code=${json.error_code ?? -1}`,
    );
  }

  const qrcode = json.data.qrcode;
  const qrcodeImg = json.data.qrcode_img || '';
  const loginUrl = `https://h5.kugou.com/apps/loginQRCode/html/index.html?qrcode=${encodeURIComponent(qrcode)}`;

  return {
    qrcode,
    qrcodeImg,
    loginUrl,
    expiresAt: Date.now() + 5 * 60 * 1000,
  };
}

/**
 * Checks the status of an existing QR code login session.
 */
export async function checkKugouQrCode(qrcodeKey: string): Promise<KugouQrStatusResult> {
  const clienttime = String(Math.floor(Date.now() / 1000));
  const mid = md5(`playlistout_check_${clienttime}_${qrcodeKey}`);

  const params: Record<string, string> = {
    appid: KUGOU_LITE_APPID,
    clientver: KUGOU_LITE_CLIENTVER,
    clienttime,
    dfid: '-',
    mid,
    uuid: '-',
    plat: '4',
    srcappid: '2919',
    qrcode: qrcodeKey,
  };

  params.signature = signKugouLoginParams(params);

  const queryString = new URLSearchParams(params).toString();
  const url = `https://login-user.kugou.com/v2/get_userinfo_qrcode?${queryString}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...KUGOU_LOGIN_HEADERS,
      dfid: '-',
      clienttime,
      mid,
    },
  });

  if (!response.ok) {
    throw new Error(`Kugou QR status check HTTP error: ${response.status}`);
  }

  const json = (await response.json()) as {
    status?: number;
    error_code?: number;
    error?: string;
    data?: {
      status?: number;
      token?: string;
      userid?: string | number;
    };
  };

  const rawStatus = json.data?.status;

  // Kugou QR status codes:
  // 1: Waiting for scan (待扫码)
  // 2: Scanned, waiting for confirmation (已扫描待确认)
  // 4: Success (登录成功)
  // 3 / other: Expired or failed (已过期或失效)
  if (rawStatus === 4 && json.data?.token && json.data?.userid) {
    return {
      status: 'success',
      token: String(json.data.token),
      userid: String(json.data.userid),
    };
  }

  if (rawStatus === 2) {
    return {
      status: 'scanned',
      message: '已扫描二维码，请在手机上点击确认登录',
    };
  }

  if (rawStatus === 1) {
    return {
      status: 'waiting',
      message: '等待扫描二维码',
    };
  }

  if (rawStatus === 3) {
    return {
      status: 'expired',
      message: '二维码已过期，请刷新',
    };
  }

  return {
    status: 'failed',
    message: json.error || '登录检查异常',
  };
}
