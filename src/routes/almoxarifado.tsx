import { createFileRoute } from "@tanstack/react-router";
import { Boxes, PackagePlus, PackageMinus, AlertTriangle } from "lucide-react";
import { ModulePage, ComingSoon } from "@/components/hud/ModulePage";
import { KpiCard } from "@/components/hud/KpiCard";

export const Route = createFileRoute("/almoxarifado")({
  head: () => ({
    meta: [
      { title: "Almoxarifado · ICS" },
      { name: "description", content: "Entrada, saída, inventário e rastreabilidade por lote." },
    ],
  }),
  component: Almox,
});

const ITEMS = [
  { code: "MP-00121", desc: "Chapa de aço 3mm", loc: "A-12-03", qty: 420, min: 200, un: "kg" },
  { code: "MP-00408", desc: "Resina PP virgem", loc: "B-04-11", qty: 85, min: 150, un: "sc" },
  { code: "MP-00212", desc: "Rolamento 6205-ZZ", loc: "C-01-07", qty: 32, min: 20, un: "un" },
  { code: "MP-00905", desc: "Óleo hidráulico ISO 68", loc: "D-02-02", qty: 12, min: 8, un: "tb" },
  { code: "MP-01120", desc: "Rótulo adesivo A2", loc: "E-03-05", qty: 8500, min: 5000, un: "un" },
];

function Almox() {
  return (
    <ModulePage
      icon={Boxes}
      eyebrow="Warehouse Management"
      title="Almoxarifado"
      description="Endereçamento, código de barras/QR/RFID, inventário cíclico e rastreabilidade por lote."
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="SKUs em estoque" value="1.284" icon={Boxes} tone="primary" sub="847 ativos" />
        <KpiCard label="Entradas (24h)" value="37" icon={PackagePlus} tone="success" delta={12.4} />
        <KpiCard label="Saídas (24h)" value="54" icon={PackageMinus} tone="info" delta={-4.1} />
        <KpiCard label="Abaixo do mínimo" value="6" icon={AlertTriangle} tone="danger" sub="reposição urgente" />
      </section>

      <div className="hud-panel p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left font-medium py-2 px-2">Código</th>
              <th className="text-left font-medium py-2 px-2">Descrição</th>
              <th className="text-left font-medium py-2 px-2">Endereço</th>
              <th className="text-right font-medium py-2 px-2">Qtd</th>
              <th className="text-right font-medium py-2 px-2">Mínimo</th>
              <th className="text-left font-medium py-2 px-2">Nível</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((it) => {
              const pct = Math.min(100, (it.qty / (it.min * 2)) * 100);
              const low = it.qty < it.min;
              return (
                <tr key={it.code} className="border-t border-border hover:bg-muted/20">
                  <td className="py-2.5 px-2 mono text-foreground">{it.code}</td>
                  <td className="py-2.5 px-2">{it.desc}</td>
                  <td className="py-2.5 px-2 mono text-muted-foreground">{it.loc}</td>
                  <td className="py-2.5 px-2 mono tabular-nums text-right">{it.qty} {it.un}</td>
                  <td className="py-2.5 px-2 mono tabular-nums text-right text-muted-foreground">{it.min}</td>
                  <td className="py-2.5 px-2 min-w-[160px]">
                    <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
                      <div
                        className="h-full"
                        style={{
                          width: `${pct}%`,
                          background: low ? "var(--color-danger)" : "var(--color-success)",
                        }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ComingSoon items={["Inventário cíclico", "Leitor QR/RFID mobile", "Kanban eletrônico", "Integração Fornecedor", "Validade e FEFO"]} />
    </ModulePage>
  );
}