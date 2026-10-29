import { useId } from 'react';
import { Scene } from './Scene';
import type { Style } from './themes';

function Block({
  x,
  y,
  w = 92,
  h = 42,
  color = '#e5b864',
  side = '#c39443',
  top = '#f5d28c',
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  color?: string;
  side?: string;
  top?: string;
}) {
  return (
    <g>
      <path d={`M${x} ${y}l${w} 0 28 -18 -${w} 0Z`} fill={top} />
      <path d={`M${x} ${y}h${w}v${h}h-${w}Z`} fill={color} />
      <path d={`M${x + w} ${y}l28 -18v${h}l-28 18Z`} fill={side} />
      {[0.25, 0.65].map((v) => (
        <g key={v}>
          <ellipse cx={x + w * v + 12} cy={y - 13} rx={12} ry={6} fill={side} />
          <path d={`M${x + w * v} ${y - 19}v6q12 9 24 0v-6Z`} fill={color} />
          <ellipse cx={x + w * v + 12} cy={y - 19} rx={12} ry={6} fill={top} />
        </g>
      ))}
    </g>
  );
}
export function PixelPerson({
  x = 0,
  y = 0,
  scale = 1,
  running = false,
}: {
  x?: number;
  y?: number;
  scale?: number;
  running?: boolean;
}) {
  return (
    <g
      transform={`translate(${x},${y}) scale(${scale})`}
      className={running ? 'pixel-person walking' : 'pixel-person'}
      shapeRendering="crispEdges"
    >
      <ellipse cx="8" cy="27" rx="10" ry="3" fill="#40513d" opacity=".18" />
      <path d="M3 19h5v7H2v-3h1zm7 0h5v7h-6v-3h1" fill="#4c5c73" />
      <path d="M3 13h11v10H3z" fill="#e2a04a" />
      <path d="M5 13h2v5h4v-5h2v10H4v-5h1z" fill="#647d88" />
      <path d="M0 14h3v7H0zm14 0h3v7h-3" fill="#eac59a" />
      <path d="M3 5h11v8H3z" fill="#f4d3a1" />
      <path d="M2 3h13v4H2zM0 6h17v3H0zM4 0h9v4H4z" fill="#b88249" />
      <path d="M3 4h11v2H3z" fill="#e4b863" />
      <path d="M5 9h2v2H5zm6 0h2v2h-2" fill="#3e3f40" />
    </g>
  );
}
export function ThemeScene({
  style,
  running = false,
  className = '',
  growth = 0,
}: {
  style: Style;
  running?: boolean;
  className?: string;
  growth?: number;
}) {
  const key = useId().replaceAll(':', '');
  if (style === 'sage') return <Scene className={className} />;
  if (style === 'pixel')
    return (
      <svg
        viewBox="0 0 320 120"
        preserveAspectRatio="xMidYMax slice"
        className={`landscape pixel-landscape ${className}`}
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <path fill="#b9d8ca" d="M0 0h320v120H0z" />
        <path fill="#dce7cf" d="M0 0h320v31H0z" />
        <circle cx="251" cy="23" r="10" fill="#fff1bd" />
        <g fill="#f5f2d8" className="drifting-clouds">
          <path d="M28 21h17v-4h16v5h11v6H28zM175 11h12V7h16v4h15v7h-43z" />
        </g>
        <path
          fill="#a2bd93"
          d="M0 51h18v-7h28v-5h26v9h26v-8h29v-7h22v7h27v8h30v-7h24v-8h28v8h28v9h34v70H0z"
        />
        <path fill="#88aa73" d="M0 63h320v57H0z" />
        <path fill="#98b47c" d="M0 72h320v48H0z" />
        <path d="M0 102h175V86h47v-7h98v13h-94v11h-40v17H0" fill="#d8bf85" />
        <path fill="#e4cd97" d="M0 106h180v-15h42v-7h98v4h-98v8h-38v24H0z" />
        <path fill="#7e5d42" d="M206 49h61v43h-61z" />
        <path fill="#f1dab0" d="M209 51h55v35h-55z" />
        <path fill="#b4794f" d="M199 49h10v-8h10v-8h10v-7h22v7h10v8h10v8h8v7h-80z" />
        <path fill="#cb9061" d="M204 45h62v5h-62zM217 35h39v5h-39z" />
        <path fill="#674d3b" d="M232 64h13v28h-13z" />
        <path fill="#91b8b0" d="M214 60h12v13h-12zM251 60h10v13h-10z" />
        <path stroke="#e5c990" strokeWidth="2" d="M220 60v13m-6-6h12m130 0h12" />
        <path fill="#a98c5b" d="M275 29h7v17h-7z" />
        <g className="chimney-smoke" fill="#eff0da" opacity=".6">
          <rect x="276" y="21" width="6" height="5" />
          <rect x="280" y="13" width="5" height="5" />
        </g>
        {[8, 42, 104, 284].map((x, i) => (
          <g key={x} transform={`translate(${x},${i === 2 ? 41 : 51})`}>
            <rect x="7" y="16" width="5" height="21" fill="#7a6946" />
            <path d="M4 0h11v5h6v15h-4v5H0v-5h-4V7h8Z" fill={i % 2 ? '#517d55' : '#648b55'} />
            <path d="M3 3h12v5h-3v6H1V7h2z" fill="#83a15f" />
          </g>
        ))}
        <g transform="translate(116,76)">
          <path fill="#9b7751" d="M0 0h62v23H0z" />
          {[5, 20, 35, 50].map((x, i) => (
            <g key={x}>
              <path d={`M${x} 3v17`} stroke="#785a42" strokeWidth="3" />
              <path
                d={`M${x - 3} 7h6v3h-6zM${x} 5v8M${x - 3} 17h6v3h-6z`}
                stroke={growth > i ? '#5b8348' : '#7d9f58'}
                strokeWidth="2"
              />
              {growth > i && <rect x={x - 2} y="5" width="4" height="4" fill="#e3b058" />}
            </g>
          ))}
        </g>
        <g fill="#e7d6a1">
          {[20, 30, 40, 50, 60, 70].map((x) => (
            <path key={x} d={`M${x} 87h3v14h-3z`} />
          ))}
          <path stroke="#e7d6a1" strokeWidth="3" d="M20 92h54" />
        </g>
        <g fill="#e7ce8c">
          {[82, 97, 187, 273, 300].map((x, i) => (
            <path key={x} d={`M${x} ${101 + (i % 3) * 5}h3v3h-3z`} />
          ))}
        </g>
        <g fill="#f3e6c3">
          <rect x="83" y="78" width="4" height="3" />
          <rect x="182" y="62" width="4" height="3" />
        </g>
        <PixelPerson x={179} y={88} scale={0.8} running={running} />
        <g transform="translate(244,100)">
          <path fill="#f7eac9" d="M0 1h8v6H0zM6 0h5v5H6z" />
          <rect x="9" y="3" width="4" height="2" fill="#caa359" />
          <rect x="7" y="-2" width="3" height="3" fill="#b57258" />
          <path stroke="#98744c" d="M2 7v3m4-3v3" />
        </g>
        <path fill="#75975d" d="M0 115h60v5H0zM282 113h38v7h-38z" />
      </svg>
    );
  if (style === 'cyber')
    return (
      <svg
        viewBox="0 0 1000 340"
        preserveAspectRatio="xMidYMid slice"
        className={`landscape cyber-landscape ${className}`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`${key}s`} x2="0" y2="1">
            <stop stopColor="#101329" />
            <stop offset="1" stopColor="#37234c" />
          </linearGradient>
          <linearGradient id={`${key}m`} x2="0" y2="1">
            <stop stopColor="#af7dd9" />
            <stop offset="1" stopColor="#564d9b" />
          </linearGradient>
        </defs>
        <path fill={`url(#${key}s)`} d="M0 0h1000v340H0z" />
        <circle cx="730" cy="95" r="64" fill={`url(#${key}m)`} opacity=".85" />
        {Array.from({ length: 8 }, (_, i) => (
          <path key={i} d={`M660 ${98 + i * 9}h140`} stroke="#1d1935" strokeWidth={2 + i / 2} />
        ))}
        {Array.from({ length: 29 }, (_, i) => {
          const x = i * 39 - 20,
            h = 40 + ((i * 31) % 103);
          return (
            <rect
              key={i}
              x={x}
              y={256 - h}
              width={28 + (i % 3) * 6}
              height={h}
              fill={i % 2 ? '#272747' : '#22213e'}
            />
          );
        })}
        {[
          { x: 5, w: 100, h: 145 },
          { x: 132, w: 75, h: 183 },
          { x: 244, w: 90, h: 119 },
          { x: 365, w: 65, h: 157 },
          { x: 476, w: 80, h: 103 },
          { x: 592, w: 94, h: 170 },
          { x: 797, w: 77, h: 163 },
          { x: 904, w: 96, h: 216 },
        ].map((b, i) => (
          <g key={b.x}>
            <rect x={b.x} y={305 - b.h} width={b.w} height={b.h} fill="#131b2b" stroke="#3a3455" />
            <path
              d={`M${b.x + 5} ${305 - b.h}h${b.w - 10}`}
              stroke={i % 2 ? '#56d7d1' : '#bb7bd0'}
              strokeWidth="2"
            />
            <path d={`M${b.x + b.w / 2} ${305 - b.h}v-17`} stroke="#776c9e" />
            {Array.from({ length: Math.floor(b.h / 22) }, (_, j) => (
              <g key={j}>
                {Array.from({ length: 4 }, (_, k) => (
                  <rect
                    key={k}
                    x={b.x + 10 + (k * (b.w - 20)) / 4}
                    y={320 - b.h + j * 20}
                    width="7"
                    height="5"
                    fill={(j + k + i) % 3 ? '#575176' : '#55b6bd'}
                    opacity={(j + k) % 3 === 1 ? 0.3 : 0.8}
                  />
                ))}
              </g>
            ))}
          </g>
        ))}
        <path d="M0 294h1000v46H0" fill="#121824" />
        <path
          d="M0 306h1000m-40 34L696 290m-156 50 70-50m-320 50 231-50"
          stroke="#3b4662"
          strokeWidth="1"
        />
        <path d="M0 322h370l80-11h173l48 8h329" stroke="#4be0d4" opacity=".6" />
        <path d="M120 170h48v80h-48Z" fill="#172437" stroke="#70d3d4" />
        <text x="144" y="195" fill="#7ef1da" fontSize="15" textAnchor="middle">
          静
        </text>
        <text x="144" y="220" fill="#7ef1da" fontSize="15" textAnchor="middle">
          界
        </text>
        <path d="M828 124h20v66h-20Z" fill="#49304f" stroke="#b881b7" />
        <text
          transform="translate(832 135)"
          fill="#e4b4cb"
          fontSize="9"
          style={{ writingMode: 'vertical-rl' }}
        >
          STAY FOCUSED
        </text>
        <g className="city-train">
          <path d="M633 284h92l12 7H620Z" fill="#ae84c4" />
          <path d="M638 280h67l12 5h-85Z" fill="#66ddd1" opacity=".8" />
        </g>
        <g fill="#9aaac4" opacity=".6">
          {[34, 128, 289, 380, 466, 575, 904].map((x, i) => (
            <circle key={x} cx={x} cy={30 + (i % 3) * 15} r="1" />
          ))}
        </g>
      </svg>
    );
  if (style === 'blocks')
    return (
      <svg
        viewBox="0 0 1000 340"
        preserveAspectRatio="xMidYMid slice"
        className={`landscape blocks-landscape ${className}`}
        aria-hidden="true"
      >
        <path fill="#f2e9d7" d="M0 0h1000v340H0z" />
        <circle cx="810" cy="85" r="49" fill="#f7d68a" />
        <path d="M0 250 480 128l520 94v118H0Z" fill="#e4dcc8" />
        <g stroke="#d5ceba" strokeWidth="1">
          {Array.from({ length: 14 }, (_, i) => (
            <path key={i} d={`M${i * 90 - 100} 340l320-170M${i * 100} 165l380 175`} />
          ))}
        </g>
        <ellipse cx="705" cy="282" rx="197" ry="25" fill="#afa98c" opacity=".16" />
        <Block x={565} y={235} w={115} h={50} />
        <Block x={566} y={182} w={115} h={50} color="#7596b1" top="#a5bdcb" side="#557c98" />
        <Block x={688} y={251} w={108} h={45} color="#bd8062" top="#dda086" side="#9c664e" />
        <Block x={796} y={262} w={80} h={35} color="#829b6c" top="#a9bc91" side="#668453" />
        <Block x={825} y={221} w={80} h={35} color="#829b6c" top="#a9bc91" side="#668453" />
        <g transform="translate(434 180)">
          <ellipse cx="22" cy="109" rx="36" ry="10" fill="#b4a58d" opacity=".2" />
          <path d="M5 75h15v29H2V91h3zm21 0h15v29H23V91h3" fill="#557d9a" />
          <path d="M1 32h42l7 49H-6Z" fill="#91a4a1" />
          <path d="M4 38h36v39H4Z" fill="#afbfab" />
          <path d="M-9 38h11v37H-9zm52 0h11v37H43" fill="#af8161" />
          <rect x="4" y="0" width="36" height="33" rx="11" fill="#ebc16a" />
          <rect x="13" y="-6" width="18" height="9" rx="3" fill="#e6b65c" />
          <circle cx="14" cy="14" r="2" fill="#575248" />
          <circle cx="30" cy="14" r="2" fill="#575248" />
          <path d="M15 23q7 6 14 0" fill="none" stroke="#856643" strokeWidth="2" />
        </g>
        <g fill="#fff6df" className="drifting-clouds">
          <rect x="390" y="56" width="100" height="18" rx="9" />
          <rect x="417" y="43" width="53" height="22" rx="11" />
        </g>
        <path d="M928 291v-54" stroke="#ab8b5c" strokeWidth="10" />
        <circle cx="928" cy="227" r="25" fill="#91a376" />
        <circle cx="913" cy="218" r="16" fill="#a7b78e" />
      </svg>
    );
  return (
    <svg
      viewBox="0 0 1000 340"
      preserveAspectRatio="xMidYMid slice"
      className={`landscape ink-landscape ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${key}ink`} x2="0" y2="1">
          <stop stopColor="#6e8280" stopOpacity=".75" />
          <stop offset="1" stopColor="#cdd2c5" stopOpacity=".05" />
        </linearGradient>
      </defs>
      <path fill="#e9e7dc" d="M0 0h1000v340H0z" />
      <circle cx="740" cy="72" r="30" fill="#c39480" opacity=".45" />
      <path
        d="M180 240 290 131l31 19 90-93 59 70 45-26 81 129 86-99 48 31 51-86 67 94 48-18 94 110Z"
        fill="#b9c2b7"
        opacity=".45"
      />
      <path
        d="m370 275 89-74 77-146 21 61 27 7 74 115 49-70 63-39 38 49 35-6 99 113Z"
        fill={`url(#${key}ink)`}
      />
      <path d="m0 250 110-67 54 18 99-82 57 62 62-14 102 99Z" fill="#97aaa0" opacity=".55" />
      <path
        d="m0 293 147-31 79 13 130-44 111 38 126-3 121 22 286-11v63H0Z"
        fill="#d1d7cb"
        opacity=".55"
      />
      <path d="M637 297q50 8 104-1m-241 17q68 5 110-1m147-22h44" stroke="#a5b6aa" fill="none" />
      <g transform="translate(721 274)">
        <path d="M-41 11q48 21 96-4l-9 14h-69Z" fill="#6c7770" />
        <path d="M0-21h4v39h-4Z" fill="#6e7770" />
        <path d="M3-24q32 9 28 33H3Z" fill="#bbb9a6" />
        <circle cx="-16" cy="-3" r="4" fill="#52625d" />
        <path d="m-20 1-7 13h20L-12 1Z" fill="#52625d" />
      </g>
      <g transform="translate(875 179)">
        <path d="M0 55h81v5H0zM12 20h4v36h-4zm52 0h4v36h-4z" fill="#616d60" />
        <path d="M-10 23q43-8 50-26 8 18 52 26l-14 5H4Z" fill="#69766a" />
        <path d="M-3 22h85" stroke="#e2ded0" />
        <path d="M22 51h36" stroke="#616d60" />
      </g>
      <g stroke="#6a7a67" strokeWidth="3" fill="#70836f" opacity=".75">
        <path d="M54 330q8-92-8-177m24 177q-3-74 7-116" fill="none" />
        <path d="m49 194-26-23 17 31zm3 23 31-25-20 35zm18 40 29-18-16 28zm-20-4-28-14 22 26z" />
      </g>
      <g stroke="#7e8d7c" fill="none">
        <path d="m652 64 7-3 8 3m-40 18 6-3 7 3" />
      </g>
      <rect x="943" y="52" width="24" height="33" rx="2" fill="#a15d4b" opacity=".8" />
      <text x="955" y="66" textAnchor="middle" fontSize="9" fill="#f3e9d5">
        栖
      </text>
      <text x="955" y="79" textAnchor="middle" fontSize="9" fill="#f3e9d5">
        时
      </text>
    </svg>
  );
}
