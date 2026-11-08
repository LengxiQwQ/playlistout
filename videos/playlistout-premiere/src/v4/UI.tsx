import React from 'react';
import { C, F } from '../theme';
import { u } from '../scale';

export const STAGE = { left: 220, top: 180, width: 1480, height: 820 };

/** A sub-pixel paper float for UI cards; the page and titles stay still. */
export const paperBreath = (frame: number): React.CSSProperties => ({
  translate: `${Math.sin(frame / 21) * 1.6}px ${Math.cos(frame / 27) * 1.2}px`,
});

export const Chapter: React.FC<{
  kicker: string;
  title: string;
  right?: React.ReactNode;
}> = ({ kicker, title, right }) => (
  <>
    <div style={{ position: 'absolute', left: 173, top: 52, display: 'flex', alignItems: 'center', gap: 15 }}>
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: '50% 44% 47% 40%',
          border: `1.8px solid ${C.ink}`,
          display: 'grid',
          placeItems: 'center',
          fontFamily: F.note,
          fontSize: 22,
          transform: 'rotate(-4deg)',
        }}
      >
        ♪
      </div>
      <div>
        <div style={{ fontFamily: F.mono, fontSize: 16, letterSpacing: '.18em', color: C.inkMuted, marginBottom: 3 }}>
          {kicker}
        </div>
        <div style={{ fontFamily: F.display, fontSize: 30, lineHeight: 1.1, color: C.ink }}>{title}</div>
      </div>
    </div>
    {right ? (
      <div
        style={{
          position: 'absolute',
          right: 188,
          top: 60,
          textAlign: 'right',
          fontFamily: F.hand,
          fontSize: 25,
          color: C.inkSoft,
          transform: 'rotate(1deg)',
        }}
      >
        {right}
      </div>
    ) : null}
  </>
);

export const Footer: React.FC<{ left: string; right?: string; small?: boolean }> = ({ left, right, small = false }) => (
  <>
    <div
      style={{
        position: 'absolute',
        left: 158,
        bottom: 44,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: F.hand,
        fontSize: small ? 23 : 26,
        color: C.inkSoft,
        transform: 'rotate(-1deg)',
      }}
    >
      <span style={{ color: C.yellowDeep }}>✦</span>
      {left}
    </div>
    {right ? (
      <div
        style={{
          position: 'absolute',
          right: 150,
          bottom: 47,
          fontFamily: F.mono,
          fontSize: 13,
          letterSpacing: '.14em',
          color: C.inkMuted,
        }}
      >
        {right}
      </div>
    ) : null}
  </>
);

export const BigChip: React.FC<{
  children: React.ReactNode;
  tone?: string;
  ink?: string;
  active?: boolean;
  style?: React.CSSProperties;
}> = ({ children, tone = 'rgba(255,255,255,.6)', ink = C.inkSoft, active = false, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      fontFamily: F.mono,
      fontSize: u(11),
      lineHeight: 1,
      padding: `${u(5)}px ${u(9)}px`,
      background: tone,
      border: active ? '1.5px solid #6ca477' : '1px dashed rgba(45,52,54,.26)',
      borderRadius: 5,
      color: ink,
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

export const BigButton: React.FC<{
  children: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: C.ink,
      color: C.paperWhite,
      fontFamily: F.note,
      fontSize: u(16),
      padding: `${u(9)}px ${u(16)}px`,
      borderRadius: 5,
      boxShadow: '3px 3px 0 rgba(45,52,54,.18)',
      whiteSpace: 'nowrap',
      ...style,
    }}
  >
    {children}
  </span>
);

export const StatBlock: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ borderLeft: '1px dashed rgba(45,52,54,.22)', paddingLeft: 12 }}>
    <div style={{ fontFamily: F.mono, fontSize: u(9.5), color: C.inkMuted, letterSpacing: '.08em' }}>{label}</div>
    <div style={{ fontFamily: F.sans, fontSize: u(16), fontWeight: 700, color: C.ink, marginTop: 2 }}>{value}</div>
  </div>
);
