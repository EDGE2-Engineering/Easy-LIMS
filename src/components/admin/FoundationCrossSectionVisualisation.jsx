import React from 'react';

const FoundationCrossSectionVisualisation = ({ data, computed, isRock, rockType }) => {
  const {
    sbcB = 1.5,
    sbcL = 1.5,
    sbcD = 1.5,
    sbcDs = 0,
    sbcShape = 'rectangle',
    sbcGamma = 18,
    sbcN = '',
    sbcCorrectionType = 'none',
    sbcFootingType = 'isolated',
    sbcPhi = '',
    sbcC = '',
    sbcAlpha = '',
    sbcFos = '',
    sbcHt = '',
    sbcWL = '',
    sbcP = '',
    soilTypeInput = 'soil',
  } = data || {};

  const {
    qs_p1 = null,
    settlementSBC = null,
    recommended = null,
    shearSBC = null,
  } = computed || {};

  const fmt2 = (v) =>
    v !== null && v !== undefined && !isNaN(parseFloat(v)) ? Number(v).toFixed(2) : '-';

  // Parse inputs similarly to how GeotechSoilSbcDetails does
  const sB_raw = parseFloat(sbcB);
  const sL_raw = parseFloat(sbcL);
  const sD = parseFloat(sbcD);
  const sDs = sbcDs !== '' && !isNaN(parseFloat(sbcDs)) ? parseFloat(sbcDs) : 0;
  const sGamma = parseFloat(sbcGamma);
  const sPhi = parseFloat(sbcPhi);
  const sC = parseFloat(sbcC);

  const hasB_raw = !isNaN(sB_raw) && sbcB !== '';
  const sB = hasB_raw ? sB_raw : null;
  const sL = (() => {
    if (sB === null) return null;
    switch (sbcShape) {
      case 'square':
        return sB;
      case 'circle':
        return sB;
      case 'strip':
        return 100 * sB;
      default:
        return !isNaN(sL_raw) && sbcL !== '' ? sL_raw : null;
    }
  })();
  const hasB = sB !== null;
  const hasL = sL !== null;
  const hasD = !isNaN(sD) && sbcD !== '';
  const hasPhi = !isNaN(sPhi) && sbcPhi !== '';
  const hasC = !isNaN(sC) && sbcC !== '';
  const hasGamma = !isNaN(sGamma) && sbcGamma !== '';
  const hasAlpha = !isNaN(parseFloat(sbcAlpha)) && sbcAlpha !== '';

  const gammaSub = hasGamma ? (sGamma > 10 ? sGamma - 9.81 : sGamma) : null;

  const vB = hasB && sB > 0 ? sB : 2;
  const vD = hasD && sD > 0 ? sD : 1.5;
  const vDs = sDs > 0 ? sDs : 0;
  const vDf = vD - vDs;
  const vL = hasL && sL > 0 ? sL : vB;
  const isCirc = sbcShape === 'circle';
  const isStrip = sbcShape === 'strip';

  const W = 580,
    H = 360;
  const margin = { top: 44, bottom: 16, left: 72, right: 56 };
  const drawW = W - margin.left - margin.right;
  const drawH = H - margin.top - margin.bottom;

  const visDepth = Math.max(vD * 1.7, 3.2);
  const aboveGnd = visDepth * 0.2;
  const totalH = visDepth + aboveGnd;
  const pxPerM = drawH / totalH;

  const yPx = (m) => margin.top + m * pxPerM;
  const groundY = yPx(aboveGnd);
  const scourY = groundY + vDs * pxPerM;
  const foundBotY = groundY + vD * pxPerM;

  const cx = margin.left + drawW / 2;
  const halfFoundPx = Math.min((vB / (2 * visDepth)) * drawH * 1.5, drawW * 0.4);
  const foundH_px = Math.max(pxPerM * 0.38, 16);
  const foundTop = foundBotY - foundH_px;
  const foundL = cx - halfFoundPx;
  const foundR = cx + halfFoundPx;

  const bulbDepth = vB;
  const bulbBotY = Math.min(foundBotY + bulbDepth * pxPerM, H - margin.bottom - 4);
  const bulbHalfBot = halfFoundPx + (bulbBotY - foundBotY) * 0.5;

  const colW = Math.max(halfFoundPx * 0.22, 9);
  const colTop = margin.top + (aboveGnd - vDs) * pxPerM * 0.45;

  /* ── Tiny white text halo helper (rendered as <text> with a <filter>) ── */
  const haloId = 'lblHalo';

  return (
    <div className="mt-6 rounded-xl border border-gray-200 overflow-hidden bg-white">
      {/* title bar */}
      <div className="px-4 pt-3 pb-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between flex-wrap gap-2">
        <div>
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            Foundation Cross-Section
          </p>
          <p className="text-[10px] text-gray-400 mt-0.5 capitalize">
            {sbcShape} footing · {soilTypeInput === 'clay' ? 'Clay' : 'Non-clay'} soil
            {isCirc && ' · diameter = B'}
            {isStrip && ' · continuous strip'}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] font-mono text-gray-500">
          {hasB && (
            <span>
              B = <strong className="text-gray-700">{fmt2(sB)} m</strong>
            </span>
          )}
          {hasL && !isCirc && !isStrip && (
            <span>
              L = <strong className="text-gray-700">{fmt2(sL)} m</strong>
            </span>
          )}
          {hasD && (
            <span>
              D = <strong className="text-gray-700">{fmt2(sD)} m</strong>
            </span>
          )}
          {vDs > 0 && (
            <span>
              d<sub>s</sub> = <strong className="text-gray-700">{fmt2(vDs)} m</strong>
            </span>
          )}
          {hasPhi && (
            <span>
              φ = <strong className="text-gray-700">{fmt2(sPhi)}°</strong>
            </span>
          )}
          {hasC && (
            <span>
              c = <strong className="text-gray-700">{fmt2(sC)} kN/m²</strong>
            </span>
          )}
          {hasGamma && (
            <span>
              γ = <strong className="text-gray-700">{fmt2(sGamma)} kN/m³</strong>
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 380 }}>
        <defs>
          {/* white halo for all labels */}
          <filter id={haloId} x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated" />
            <feFlood floodColor="white" floodOpacity="0.92" result="flood" />
            <feComposite in="flood" in2="dilated" operator="in" result="halo" />
            <feMerge>
              <feMergeNode in="halo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {/* dark halo for labels on light sky background */}
          <filter id="darkHalo" x="-20%" y="-20%" width="140%" height="140%">
            <feMorphology in="SourceAlpha" operator="dilate" radius="2" result="dilated" />
            <feFlood floodColor="#f0fdf4" floodOpacity="0.95" result="flood" />
            <feComposite in="flood" in2="dilated" operator="in" result="halo" />
            <feMerge>
              <feMergeNode in="halo" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Zones ── */}
        {/* Sky */}
        <rect
          x={margin.left}
          y={margin.top}
          width={drawW}
          height={groundY - margin.top}
          fill="#e8f5e9"
        />
        {/* Soil */}
        <rect
          x={margin.left}
          y={groundY}
          width={drawW}
          height={H - groundY}
          fill="#c8a96e"
          opacity="0.55"
        />
        {/* Darker soil below footing */}
        <rect
          x={margin.left}
          y={foundBotY}
          width={drawW}
          height={H - foundBotY}
          fill="#a0784a"
          opacity="0.30"
        />

        {/* Scour zone */}
        {vDs > 0 && (
          <rect
            x={margin.left}
            y={groundY}
            width={drawW}
            height={vDs * pxPerM}
            fill="#bfdbfe"
            opacity="0.65"
          />
        )}

        {/* Soil hatch — diagonal lines */}
        {[...Array(Math.ceil(drawW / 18) + Math.ceil((H - groundY) / 18) + 2)].map((_, k) => {
          const x1 = margin.left + k * 18;
          const y1 = groundY;
          return (
            <line
              key={k}
              x1={Math.min(x1, margin.left + drawW)}
              y1={x1 > margin.left + drawW ? groundY + (x1 - margin.left - drawW) : y1}
              x2={Math.min(x1 + (H - groundY), margin.left + drawW)}
              y2={Math.min(groundY + (H - groundY), H)}
              stroke="#9a6a30"
              strokeWidth="0.5"
              opacity="0.25"
            />
          );
        })}

        {/* ── Stress bulb ── */}
        <polygon
          points={`${foundL},${foundBotY} ${foundR},${foundBotY} ${cx + bulbHalfBot},${bulbBotY} ${cx - bulbHalfBot},${bulbBotY}`}
          fill="#bbf7d0"
          opacity="0.50"
          stroke="#16a34a"
          strokeWidth="1.2"
          strokeDasharray="5 3"
        />

        {/* ── Ground line ── */}
        <line
          x1={margin.left}
          y1={groundY}
          x2={W - margin.right}
          y2={groundY}
          stroke="#1f2937"
          strokeWidth="2.5"
        />
        {/* G.L. label — on sky background, dark text */}
        <text
          x={margin.left + 5}
          y={groundY - 6}
          fontSize="10"
          fontWeight="700"
          fill="#166534"
          fontFamily="monospace"
          filter="url(#darkHalo)"
        >
          G.L.
        </text>

        {/* ── Scour line ── */}
        {vDs > 0 && (
          <>
            <line
              x1={margin.left}
              y1={scourY}
              x2={W - margin.right}
              y2={scourY}
              stroke="#1d4ed8"
              strokeWidth="1.5"
              strokeDasharray="7 3"
            />
            <rect
              x={margin.left + 4}
              y={scourY - 14}
              width={62}
              height={13}
              rx="2"
              fill="#1d4ed8"
              opacity="0.85"
            />
            <text
              x={margin.left + 7}
              y={scourY - 4}
              fontSize="9"
              fontWeight="700"
              fill="white"
              fontFamily="monospace"
            >
              Scour level
            </text>
          </>
        )}

        {/* ── Water table wavy lines ── */}
        {gammaSub !== null &&
          sGamma !== null &&
          gammaSub < sGamma - 0.5 &&
          (() => {
            const wtY = (vDs > 0 ? scourY : groundY) + 6;
            return (
              <g>
                {[0, 1, 2, 3, 4, 5, 6].map((k) => (
                  <text
                    key={k}
                    x={margin.left + 8 + k * 36}
                    y={wtY + 10}
                    fontSize="10"
                    fill="#1d4ed8"
                    fontFamily="serif"
                    opacity="0.7"
                  >
                    ≈
                  </text>
                ))}
                <rect
                  x={W - margin.right - 30}
                  y={wtY + 1}
                  width={28}
                  height={12}
                  rx="2"
                  fill="#1d4ed8"
                  opacity="0.80"
                />
                <text
                  x={W - margin.right - 27}
                  y={wtY + 10}
                  fontSize="8"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  W.T.
                </text>
              </g>
            );
          })()}

        {/* ── Foundation block ── */}
        {isCirc ? (
          <ellipse
            cx={cx}
            cy={foundBotY - foundH_px / 2}
            rx={halfFoundPx}
            ry={foundH_px / 2}
            fill="#334155"
            stroke="#0f172a"
            strokeWidth="2"
          />
        ) : (
          <rect
            x={foundL}
            y={foundTop}
            width={halfFoundPx * 2}
            height={foundH_px}
            fill="#334155"
            stroke="#0f172a"
            strokeWidth="2"
            rx="2"
          />
        )}
        {/* Foundation label */}
        <text
          x={cx}
          y={foundTop + foundH_px / 2 + 4}
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fill="white"
          fontFamily="monospace"
        >
          FOOTING
        </text>

        {/* ── Column ── */}
        <rect
          x={cx - colW / 2}
          y={colTop}
          width={colW}
          height={foundTop - colTop + 1}
          fill="#94a3b8"
          stroke="#475569"
          strokeWidth="1.5"
        />
        {/* column hatch */}
        {[0.25, 0.5, 0.75].map((f) => {
          const yy = colTop + f * (foundTop - colTop);
          return (
            <line
              key={f}
              x1={cx - colW / 2}
              y1={yy}
              x2={cx + colW / 2}
              y2={yy}
              stroke="#475569"
              strokeWidth="0.8"
              opacity="0.5"
            />
          );
        })}

        {/* ── Load arrow ── */}
        {(() => {
          const aBase = colTop - 3;
          const aTail = aBase - 26;
          const ah = 8,
            aw = 7;
          const hasLoad = qs_p1 !== null;
          return (
            <g>
              <line x1={cx} y1={aTail} x2={cx} y2={aBase - ah} stroke="#15803d" strokeWidth="2.5" />
              <polygon
                points={`${cx},${aBase} ${cx - aw},${aBase - ah} ${cx + aw},${aBase - ah}`}
                fill="#15803d"
              />
              {/* load label pill */}
              {hasLoad && (
                <>
                  <rect
                    x={cx + 8}
                    y={aTail - 4}
                    width={68}
                    height={26}
                    rx="4"
                    fill="#15803d"
                    opacity="0.90"
                  />
                  <text
                    x={cx + 12}
                    y={aTail + 7}
                    fontSize="9"
                    fontWeight="700"
                    fill="white"
                    fontFamily="monospace"
                  >
                    qs={fmt2(qs_p1)}
                  </text>
                  <text
                    x={cx + 12}
                    y={aTail + 18}
                    fontSize="8"
                    fill="#bbf7d0"
                    fontFamily="monospace"
                  >
                    kN/m²
                  </text>
                </>
              )}
              {!hasLoad && (
                <text
                  x={cx + 8}
                  y={aTail + 16}
                  fontSize="9"
                  fill="#15803d"
                  fontFamily="monospace"
                  filter="url(#darkHalo)"
                >
                  Load ↓
                </text>
              )}
            </g>
          );
        })()}

        {/* ── Inclination vector ── */}
        {hasAlpha &&
          parseFloat(sbcAlpha) > 0 &&
          (() => {
            const alphaRad = (parseFloat(sbcAlpha) * Math.PI) / 180;
            const len = 32;
            const x2 = cx + len * Math.sin(alphaRad);
            const y2 = colTop - 4 - len * Math.cos(alphaRad);
            return (
              <g>
                <line
                  x1={cx}
                  y1={colTop - 4}
                  x2={x2}
                  y2={y2}
                  stroke="#ea580c"
                  strokeWidth="2.5"
                  strokeDasharray="5 2"
                />
                <rect
                  x={x2 + 2}
                  y={y2 - 8}
                  width={52}
                  height={13}
                  rx="3"
                  fill="#ea580c"
                  opacity="0.90"
                />
                <text
                  x={x2 + 5}
                  y={y2 + 2}
                  fontSize="9"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  α={fmt2(parseFloat(sbcAlpha))}°
                </text>
              </g>
            );
          })()}

        {/* ── B dimension line ── */}
        {hasB &&
          (() => {
            const dy = foundTop - 12;
            return (
              <g>
                <line x1={foundL} y1={dy} x2={foundR} y2={dy} stroke="#475569" strokeWidth="1.2" />
                <line
                  x1={foundL}
                  y1={dy - 4}
                  x2={foundL}
                  y2={dy + 4}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <line
                  x1={foundR}
                  y1={dy - 4}
                  x2={foundR}
                  y2={dy + 4}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <line
                  x1={foundL}
                  y1={foundTop}
                  x2={foundL}
                  y2={dy}
                  stroke="#475569"
                  strokeWidth="0.7"
                  strokeDasharray="3 2"
                />
                <line
                  x1={foundR}
                  y1={foundTop}
                  x2={foundR}
                  y2={dy}
                  stroke="#475569"
                  strokeWidth="0.7"
                  strokeDasharray="3 2"
                />
                {/* pill label on sky background */}
                <rect
                  x={cx - 28}
                  y={dy - 21}
                  width={56}
                  height={14}
                  rx="3"
                  fill="#334155"
                  opacity="0.90"
                />
                <text
                  x={cx}
                  y={dy - 11}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  {isCirc ? `d=${fmt2(sB)} m` : `B=${fmt2(sB)} m`}
                </text>
              </g>
            );
          })()}

        {/* ── D dimension line (right) ── */}
        {hasD &&
          (() => {
            const dx = W - margin.right + 10;
            const midY = (groundY + foundBotY) / 2;
            return (
              <g>
                <line
                  x1={dx}
                  y1={groundY}
                  x2={dx}
                  y2={foundBotY}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <line
                  x1={dx - 4}
                  y1={groundY}
                  x2={dx + 4}
                  y2={groundY}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <line
                  x1={dx - 4}
                  y1={foundBotY}
                  x2={dx + 4}
                  y2={foundBotY}
                  stroke="#475569"
                  strokeWidth="1.2"
                />
                <rect
                  x={dx + 5}
                  y={midY - 8}
                  width={40}
                  height={14}
                  rx="3"
                  fill="#475569"
                  opacity="0.90"
                />
                <text
                  x={dx + 8}
                  y={midY + 3}
                  fontSize="9"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  D={fmt2(sD)}
                </text>
              </g>
            );
          })()}

        {/* ── ds dimension line (right, outer) ── */}
        {vDs > 0 &&
          hasD &&
          (() => {
            const dx = W - margin.right + 32;
            const midY = (groundY + scourY) / 2;
            return (
              <g>
                <line x1={dx} y1={groundY} x2={dx} y2={scourY} stroke="#1d4ed8" strokeWidth="1.2" />
                <line
                  x1={dx - 3}
                  y1={groundY}
                  x2={dx + 3}
                  y2={groundY}
                  stroke="#1d4ed8"
                  strokeWidth="1.2"
                />
                <line
                  x1={dx - 3}
                  y1={scourY}
                  x2={dx + 3}
                  y2={scourY}
                  stroke="#1d4ed8"
                  strokeWidth="1.2"
                />
                <rect
                  x={dx + 4}
                  y={midY - 7}
                  width={38}
                  height={13}
                  rx="3"
                  fill="#1d4ed8"
                  opacity="0.90"
                />
                <text
                  x={dx + 7}
                  y={midY + 2}
                  fontSize="8"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  ds={fmt2(vDs)}
                </text>
              </g>
            );
          })()}

        {/* ── Df dimension line (left) ── */}
        {hasD &&
          (() => {
            const dx = margin.left - 12;
            const topY = vDs > 0 ? scourY : groundY;
            const midY = (topY + foundBotY) / 2;
            return (
              <g>
                <line x1={dx} y1={topY} x2={dx} y2={foundBotY} stroke="#15803d" strokeWidth="1.2" />
                <line
                  x1={dx - 4}
                  y1={topY}
                  x2={dx + 4}
                  y2={topY}
                  stroke="#15803d"
                  strokeWidth="1.2"
                />
                <line
                  x1={dx - 4}
                  y1={foundBotY}
                  x2={dx + 4}
                  y2={foundBotY}
                  stroke="#15803d"
                  strokeWidth="1.2"
                />
                <rect
                  x={dx - 46}
                  y={midY - 7}
                  width={42}
                  height={14}
                  rx="3"
                  fill="#15803d"
                  opacity="0.90"
                />
                <text
                  x={dx - 43}
                  y={midY + 4}
                  fontSize="9"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  Df={fmt2(vDf)} m
                </text>
              </g>
            );
          })()}

        {/* ── Stress bulb label ── */}
        {hasB &&
          (() => {
            const lx = cx + bulbHalfBot * 0.6 + 4;
            const ly = foundBotY + (bulbBotY - foundBotY) * 0.55;
            return (
              <g>
                <rect
                  x={lx}
                  y={ly - 8}
                  width={52}
                  height={13}
                  rx="3"
                  fill="#166534"
                  opacity="0.85"
                />
                <text
                  x={lx + 4}
                  y={ly + 2}
                  fontSize="8"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  2:1 spread
                </text>
              </g>
            );
          })()}

        {/* ── Soil properties label ── */}
        {(() => {
          const lx = margin.left + 6;
          const ly = Math.min(foundBotY + (bulbBotY - foundBotY) * 0.82, H - margin.bottom - 18);
          const parts = [];
          if (hasPhi) parts.push(`φ=${fmt2(sPhi)}°`);
          if (hasC) parts.push(`c=${fmt2(sC)} kPa`);
          if (hasGamma) parts.push(`γ=${fmt2(sGamma)} kN/m³`);
          if (parts.length === 0) return null;
          const labelW = parts.length * 68 + 6;
          return (
            <g>
              <rect
                x={lx}
                y={ly - 9}
                width={labelW}
                height={14}
                rx="3"
                fill="#7c3d12"
                opacity="0.80"
              />
              <text
                x={lx + 5}
                y={ly + 2}
                fontSize="9"
                fontWeight="600"
                fill="white"
                fontFamily="monospace"
              >
                {parts.join('  ')}
              </text>
            </g>
          );
        })()}

        {/* ── Recommended SBC callout ── */}
        {recommended !== null &&
          (() => {
            const lx = cx - 52;
            const ly = foundBotY + (bulbBotY - foundBotY) * 0.28;
            return (
              <g>
                <rect
                  x={lx}
                  y={ly - 10}
                  width={104}
                  height={28}
                  rx="5"
                  fill="#15803d"
                  opacity="0.92"
                />
                <text
                  x={cx}
                  y={ly + 2}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="700"
                  fill="white"
                  fontFamily="monospace"
                >
                  SBC={fmt2(recommended)}
                </text>
                <text
                  x={cx}
                  y={ly + 13}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#bbf7d0"
                  fontFamily="monospace"
                >
                  kN/m² (design)
                </text>
              </g>
            );
          })()}
      </svg>

      {/* ── Parameter summary cards ── */}
      <div className="px-4 pb-4 pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2 border-t border-gray-100">
        {[
          {
            label: 'Shear BC',
            sub: 'qs — Part 1',
            val: qs_p1,
            unit: 'kN/m²',
            highlight: false,
          },
          {
            label: soilTypeInput === 'clay' ? 'Consolidation BC' : 'Settlement BC',
            sub: soilTypeInput === 'clay' ? 'qsafe — Part 3' : 'qa — Part 2',
            val: settlementSBC,
            unit: 'kN/m²',
            highlight: false,
          },
          {
            label: 'Governs',
            sub:
              shearSBC !== null && settlementSBC !== null
                ? shearSBC <= settlementSBC
                  ? 'Shear criteria'
                  : 'Settlement criteria'
                : '—',
            val:
              shearSBC !== null && settlementSBC !== null
                ? Math.min(shearSBC, settlementSBC)
                : null,
            unit: 'kN/m²',
            highlight: false,
          },
          {
            label: 'Recommended SBC',
            sub: '85% × min(qs, qa)',
            val: recommended,
            unit: 'kN/m²',
            highlight: true,
          },
        ].map(({ label, sub, val, unit, highlight }) => (
          <div
            key={label}
            className={`rounded-xl border p-3 flex flex-col gap-0.5 ${highlight ? 'bg-primary/5 border-primary/20' : 'bg-gray-50 border-gray-100'}`}
          >
            <p
              className={`text-[10px] font-bold uppercase tracking-widest ${highlight ? 'text-primary' : 'text-gray-400'}`}
            >
              {label}
            </p>
            <p className="text-[9px] text-gray-400 font-mono">{sub}</p>
            <p
              className={`text-lg font-black font-mono tabular-nums mt-0.5 ${val !== null ? (highlight ? 'text-primary' : 'text-gray-800') : 'text-gray-300'}`}
            >
              {val !== null && !isNaN(val) ? val.toFixed(2) : '—'}
              {val !== null && !isNaN(val) && (
                <span className="text-xs font-normal text-gray-400 ml-1">{unit}</span>
              )}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FoundationCrossSectionVisualisation;
