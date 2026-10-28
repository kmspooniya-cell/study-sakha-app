import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { fonts, useTheme } from '../lib/theme';
import { Txt } from './ui';

export function BarChart({
  data,
  height = 160,
  color,
  goal,
}: {
  data: { label: string; value: number }[];
  height?: number;
  color?: string;
  goal?: number;
}) {
  const { colors } = useTheme();
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 1);
  const barW = 100 / (data.length * 2);
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none">
        <Defs>
          <LinearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color ?? colors.blue} />
            <Stop offset="1" stopColor={color ?? colors.blue} stopOpacity={0.45} />
          </LinearGradient>
        </Defs>
        {goal ? (
          <Line
            x1="0"
            y1={height - (goal / max) * (height - 24) - 12}
            x2="100"
            y2={height - (goal / max) * (height - 24) - 12}
            stroke={colors.teal}
            strokeWidth={0.6}
            strokeDasharray="2 2"
          />
        ) : null}
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24);
          const x = i * (100 / data.length) + barW / 2;
          return (
            <Rect
              key={i}
              x={x}
              y={height - h - 12}
              width={barW}
              height={Math.max(h, 2)}
              rx={2}
              fill="url(#barGrad)"
            />
          );
        })}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Txt size={11} color={colors.textFaint} weight="600">
              {d.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

export function LineChart({ data, height = 150, color }: { data: { label: string; value: number }[]; height?: number; color?: string }) {
  const { colors } = useTheme();
  const w = 300;
  const max = Math.max(...data.map((d) => d.value), 1);
  const min = Math.min(...data.map((d) => d.value), 0);
  const span = Math.max(max - min, 1);
  const pts = data.map((d, i) => {
    const x = (i / Math.max(data.length - 1, 1)) * w;
    const y = height - 20 - ((d.value - min) / span) * (height - 40);
    return { x, y };
  });
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const area = `${path} L${w},${height - 20} L0,${height - 20} Z`;
  const stroke = color ?? colors.teal;
  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`}>
        <Defs>
          <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={stroke} stopOpacity={0.28} />
            <Stop offset="1" stopColor={stroke} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#lineFill)" />
        <Path d={path} stroke={stroke} strokeWidth={2.4} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <Circle key={i} cx={p.x} cy={p.y} r={3.2} fill={colors.surface} stroke={stroke} strokeWidth={2} />
        ))}
      </Svg>
      <View style={{ flexDirection: 'row', marginTop: 4 }}>
        {data.map((d, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <Txt size={10.5} color={colors.textFaint} weight="600">
              {d.label}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Donut({
  segments,
  size = 150,
  stroke = 20,
  center,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  stroke?: number;
  center?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const total = segments.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceAlt} strokeWidth={stroke} fill="none" />
          {segments.map((s, i) => {
            const len = (s.value / total) * c;
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            );
            offset += len;
            return el;
          })}
        </G>
      </Svg>
      <View style={{ alignItems: 'center' }}>{center}</View>
    </View>
  );
}

export function HeatMap({ days, weeks = 18 }: { days: Record<string, number>; weeks?: number }) {
  const { colors } = useTheme();
  const cells: { key: string; value: number }[] = [];
  const total = weeks * 7;
  for (let i = total - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, value: days[key] ?? 0 });
  }
  const cols: { key: string; value: number }[][] = [];
  for (let i = 0; i < cells.length; i += 7) cols.push(cells.slice(i, i + 7));
  const tone = (v: number) => {
    if (v <= 0) return colors.surfaceAlt;
    if (v < 40) return `${colors.teal}40`;
    if (v < 80) return `${colors.teal}7A`;
    if (v < 120) return `${colors.teal}B8`;
    return colors.teal;
  };
  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {cols.map((col, ci) => (
          <View key={ci} style={{ gap: 4, flex: 1 }}>
            {col.map((cell) => (
              <View
                key={cell.key}
                style={{ aspectRatio: 1, borderRadius: 3, backgroundColor: tone(cell.value), maxHeight: 14 }}
              />
            ))}
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
        <Txt size={11} color={colors.textFaint}>
          Less
        </Txt>
        {[0, 30, 70, 110, 150].map((v) => (
          <View key={v} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: tone(v) }} />
        ))}
        <Txt size={11} color={colors.textFaint}>
          More
        </Txt>
      </View>
    </View>
  );
}

export function HBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const { colors } = useTheme();
  const pct = total ? (value / total) * 100 : 0;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Txt size={13} weight="600">
          {label}
        </Txt>
        <Txt size={12.5} weight="700" color={colors.textMuted}>
          {value}/{total} · {Math.round(pct)}%
        </Txt>
      </View>
      <View style={{ height: 8, borderRadius: 8, backgroundColor: colors.surfaceAlt, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(2, pct)}%`, height: 8, backgroundColor: color, borderRadius: 8 }} />
      </View>
    </View>
  );
}

export function SvgLegend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  const { colors } = useTheme();
  return (
    <View style={{ gap: 8 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: it.color }} />
          <Txt size={12.5} color={colors.textMuted} weight="600">
            {it.label}
          </Txt>
          {it.value ? (
            <Txt size={12.5} weight="800" style={{ marginLeft: 'auto' }}>
              {it.value}
            </Txt>
          ) : null}
        </View>
      ))}
    </View>
  );
}

export function TrendText({ value }: { value: number }) {
  const { colors } = useTheme();
  const up = value >= 0;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <Svg width={10} height={10} viewBox="0 0 10 10">
        <Path d={up ? 'M5 1 L9 8 L1 8 Z' : 'M5 9 L1 2 L9 2 Z'} fill={up ? colors.success : colors.danger} />
      </Svg>
      <SvgTextLike color={up ? colors.success : colors.danger} text={`${Math.abs(value)}%`} />
    </View>
  );
}

function SvgTextLike({ text, color }: { text: string; color: string }) {
  return (
    <Txt size={12} weight="800" color={color}>
      {text}
    </Txt>
  );
}

export const chartFont = fonts.body;
export const SvgTextEl = SvgText;
