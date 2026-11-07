import React from 'react';
import {COLORS} from '../theme';

export const NoteMascot: React.FC<{
  x: number;
  y: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  frame: number;
  hopeful?: boolean;
  style?: React.CSSProperties;
}> = ({x, y, scale = 1, rotate = 0, opacity = 1, frame, hopeful = false, style}) => {
  const bob = Math.sin(frame / 11) * 3.2;
  const tilt = Math.sin(frame / 19) * 1.8;
  const blink = frame % 97 > 91;
  const arm = Math.sin(frame / 9) * 5;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y + bob,
        width: 124,
        height: 124,
        transform: `translate(-50%, -50%) scale(${scale}) rotate(${rotate + tilt}deg)`,
        opacity,
        zIndex: 450,
        pointerEvents: 'none',
        filter: 'drop-shadow(4px 7px 0 rgba(45,52,54,0.16))',
        ...style,
      }}
    >
      <svg width="124" height="124" viewBox="0 0 124 124" style={{overflow: 'visible'}}>
        <ellipse cx="63" cy="112" rx="31" ry="5" fill="#3a342a" opacity="0.14" />
        <g stroke={COLORS.ink} strokeLinecap="round" strokeLinejoin="round">
          {/* little arms */}
          <path d="M39 76 C28 73 23 68 20 61" fill="none" strokeWidth="4" transform={`rotate(${arm * 0.5} 39 76)`} />
          <path d="M91 62 C100 58 106 54 111 49" fill="none" strokeWidth="4" transform={`rotate(${-arm * 0.5} 91 62)`} />
          {/* feet */}
          <path d="M53 104 L51 114 M76 100 L78 111" fill="none" strokeWidth="4" />
          <path d="M44 114 C48 117 53 117 56 114" fill="none" strokeWidth="3" />
          <path d="M71 111 C75 114 80 114 84 111" fill="none" strokeWidth="3" />
          {/* body */}
          <path
            d="M54 84V35c0-9 5-14 13-16l36-8v46"
            fill="none"
            strokeWidth="10"
          />
          <ellipse cx="41" cy="88" rx="19" ry="14" fill={COLORS.ink} transform="rotate(-18 41 88)" />
          <ellipse cx="84" cy="75" rx="19" ry="14" fill={COLORS.ink} transform="rotate(-18 84 75)" />
          <path
            d="M56 30 C70 25 87 21 104 17 L104 37 C87 41 70 46 56 51 Z"
            fill={COLORS.ink}
          />
        </g>
        {/* face on the lower-left note head */}
        <g>
          {blink ? (
            <>
              <path d="M31 84 Q35 87 39 84" fill="none" stroke="#fff9e9" strokeWidth="2.3" strokeLinecap="round" />
              <path d="M44 83 Q48 86 52 83" fill="none" stroke="#fff9e9" strokeWidth="2.3" strokeLinecap="round" />
            </>
          ) : (
            <>
              <circle cx="35" cy="83" r="2.8" fill="#fff9e9" />
              <circle cx="48" cy="82" r="2.8" fill="#fff9e9" />
            </>
          )}
          <path
            d={hopeful ? 'M37 91 Q43 97 51 91' : 'M37 91 Q43 95 50 91'}
            fill="none"
            stroke="#fff9e9"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
          <ellipse cx="30" cy="89" rx="4" ry="2" fill="#e98c81" opacity="0.55" />
          <ellipse cx="54" cy="88" rx="4" ry="2" fill="#e98c81" opacity="0.55" />
        </g>
        {/* small pencil-like highlight on the beam */}
        <path d="M62 30 L99 22" stroke="#fffbe8" strokeWidth="2" strokeLinecap="round" opacity="0.23" />
      </svg>
      <svg
        width="28"
        height="28"
        viewBox="0 0 28 28"
        style={{position: 'absolute', right: -3, top: 2, transform: `rotate(${frame / 4}deg)`}}
      >
        <path
          d="M14 1 L16 10 L25 12 L16 14 L14 23 L12 14 L3 12 L12 10 Z"
          fill="#e8b24b"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};
