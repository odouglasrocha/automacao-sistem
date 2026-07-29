import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, ComposedChart, Bar } from "recharts";

interface Point {
  t: string;
  produced: number;
  target: number;
  refugo: number;
}

export function ProductionChart({ data }: { data: Point[] }) {
  return (
    <div className="hud-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Produção em Tempo Real
          </div>
          <div className="text-lg font-semibold text-foreground">Últimos 24 min · janela deslizante</div>
        </div>
        <div className="flex items-center gap-3 text-[11px] mono">
          <LegendDot color="var(--color-primary)" label="Produzido" />
          <LegendDot color="var(--color-warning)" label="Meta" dashed />
          <LegendDot color="var(--color-danger)" label="Refugo" />
        </div>
      </div>
      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="produced" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.55} />
                <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="t"
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
              interval={3}
            />
            <YAxis
              stroke="var(--color-muted-foreground)"
              tick={{ fontSize: 10, fontFamily: "ui-monospace" }}
            />
            <Tooltip
              contentStyle={{
                background: "var(--color-card)",
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "var(--color-muted-foreground)" }}
            />
            <Area
              type="monotone"
              dataKey="produced"
              stroke="var(--color-primary)"
              strokeWidth={2}
              fill="url(#produced)"
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="target"
              stroke="var(--color-warning)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Bar dataKey="refugo" fill="var(--color-danger)" opacity={0.7} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
      <span
        className="inline-block w-3 h-[3px] rounded"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 3px, transparent 3px 6px)`
            : color,
        }}
      />
      {label}
    </span>
  );
}