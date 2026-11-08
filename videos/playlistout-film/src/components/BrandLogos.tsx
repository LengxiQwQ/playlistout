import React from 'react';
import { ASSETS } from '../assets';

export type PlatformId = 'qq' | 'netease' | 'kugou' | 'kuwo' | 'qishui' | 'migu';

export interface BrandLogoProps {
  platform: PlatformId | 'qqmusic';
  size?: number;
  shape?: 'squircle' | 'circle' | 'flat';
  style?: React.CSSProperties;
  className?: string;
}

/**
 * 真实六大主流音乐平台官方原版应用图标组件 (从官方 App 商店获取的真实 512x512 高清图标)
 */
export const PlatformLogo: React.FC<BrandLogoProps> = ({
  platform,
  size = 48,
  shape = 'squircle',
  style,
  className,
}) => {
  const norm = (platform === 'qqmusic' ? 'qq' : platform) as PlatformId;
  const src = ASSETS.platforms[norm];
  if (!src) return null;

  const borderRadius =
    shape === 'circle' ? '50%' : shape === 'squircle' ? `${Math.round(size * 0.22)}px` : '4px';

  return (
    <img
      src={src}
      alt={norm}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        borderRadius,
        objectFit: 'cover',
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      className={className}
    />
  );
};

export const NeteaseLogo: React.FC<{ size?: number; shape?: 'squircle' | 'circle' | 'flat'; style?: React.CSSProperties }> = (props) => (
  <PlatformLogo platform="netease" {...props} />
);

export const QqMusicLogo: React.FC<{ size?: number; shape?: 'squircle' | 'circle' | 'flat'; style?: React.CSSProperties }> = (props) => (
  <PlatformLogo platform="qq" {...props} />
);

export const KugouLogo: React.FC<{ size?: number; shape?: 'squircle' | 'circle' | 'flat'; style?: React.CSSProperties }> = (props) => (
  <PlatformLogo platform="kugou" {...props} />
);

export const KuwoLogo: React.FC<{ size?: number; shape?: 'squircle' | 'circle' | 'flat'; style?: React.CSSProperties }> = (props) => (
  <PlatformLogo platform="kuwo" {...props} />
);

export const QishuiLogo: React.FC<{ size?: number; shape?: 'squircle' | 'circle' | 'flat'; style?: React.CSSProperties }> = (props) => (
  <PlatformLogo platform="qishui" {...props} />
);

export const MiguLogo: React.FC<{ size?: number; shape?: 'squircle' | 'circle' | 'flat'; style?: React.CSSProperties }> = (props) => (
  <PlatformLogo platform="migu" {...props} />
);

/**
 * 真实操作系统与发行体系矢量图标 (Windows, macOS, Linux, npm)
 */
export const WindowsLogo: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 36, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}>
    <rect width="32" height="32" rx="8" fill="#0078d4" />
    <path d="M 6.5 7 L 14.5 5.8 L 14.5 15 L 6.5 15 Z" fill="#ffffff" />
    <path d="M 16.5 5.5 L 26.5 4 L 26.5 15 L 16.5 15 Z" fill="#ffffff" />
    <path d="M 6.5 17 L 14.5 17 L 14.5 26.2 L 6.5 25 Z" fill="#ffffff" />
    <path d="M 16.5 17 L 26.5 17 L 26.5 28 L 16.5 26.5 Z" fill="#ffffff" />
  </svg>
);

export const AppleLogo: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 36, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}>
    <rect width="32" height="32" rx="8" fill="#2d3436" />
    <path
      d="M 19.5 7.5 C 20.8 5.8 21.6 4.2 21.2 3 C 20 3.2 18.5 4 17.5 5.2 C 16.5 6.4 15.8 8 16.2 9.2 C 17.5 9.2 18.8 8.4 19.5 7.5 Z"
      fill="#ffffff"
    />
    <path
      d="M 22.8 17.5 C 22.8 14.2 25.5 12.8 25.6 12.7 C 24 10.5 21.6 10.2 20.8 10.1 C 18.8 9.9 16.8 11.3 15.8 11.3 C 14.8 11.3 13.2 10.1 11.6 10.1 C 9.5 10.1 7.5 11.4 6.4 13.3 C 4.2 17.2 5.8 23 8 26.1 C 9 27.6 10.2 29.2 11.8 29.1 C 13.4 29 14 28 15.8 28 C 17.6 28 18.2 29.1 19.8 29 C 21.5 28.9 22.6 27.5 23.6 26 C 24.8 24.3 25.2 22.6 25.3 22.5 C 25.2 22.4 22.8 21.5 22.8 17.5 Z"
      fill="#ffffff"
    />
  </svg>
);

export const LinuxLogo: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 36, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}>
    <rect width="32" height="32" rx="8" fill="#f59e0b" />
    <ellipse cx="16" cy="18" rx="8" ry="10" fill="#2d3436" />
    <ellipse cx="16" cy="19" rx="5.5" ry="7.5" fill="#ffffff" />
    <circle cx="16" cy="10" r="5" fill="#2d3436" />
    <circle cx="14" cy="9.5" r="1.2" fill="#ffffff" />
    <circle cx="18" cy="9.5" r="1.2" fill="#ffffff" />
    <circle cx="14" cy="9.5" r="0.6" fill="#2d3436" />
    <circle cx="18" cy="9.5" r="0.6" fill="#2d3436" />
    <polygon points="14,11 18,11 16,13.5" fill="#f59e0b" />
    <ellipse cx="12" cy="27" rx="3" ry="1.4" fill="#f59e0b" />
    <ellipse cx="20" cy="27" rx="3" ry="1.4" fill="#f59e0b" />
  </svg>
);

export const NpmLogo: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 36, style }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}>
    <rect width="32" height="32" rx="8" fill="#cb3837" />
    <path
      d="M 6 10 L 26 10 L 26 22 L 16 22 L 16 14 L 12 14 L 12 22 L 6 22 Z"
      fill="#ffffff"
    />
  </svg>
);
