import { useMemo, useState } from "react";
import { EAMachineDialog } from "@/components/hud/ea/EAMachineDialog";
import { useEaMaquinas, type EaMaquina } from "@/hooks/useEaMachine";

/**
 * Ponte entre a operação (Chão de Fábrica / máquinas produzindo agora) e a
 * "Configuração exclusiva" de cada ativo. A resolução é feita pelo nome da
 * máquina (EA34…EA58) e devolve a linha de `ea_maquinas`, cujo `id` é o
 * `maquina_id` que escopa controlador, comunicação, tags, receitas, alarmes,
 * diagnóstico, histórico e permissões.
 */
export function useMachineConfig() {
  const { data: maquinas } = useEaMaquinas();
  const [selecionada, setSelecionada] = useState<EaMaquina | null>(null);

  const porNome = useMemo(() => {
    const map = new Map<string, EaMaquina>();
    (maquinas ?? []).forEach((m) => map.set(m.nome.trim().toUpperCase(), m));
    return map;
  }, [maquinas]);

  const abrir = (nome: string) => {
    const m = porNome.get(nome.trim().toUpperCase());
    if (m) setSelecionada(m);
  };

  const dialog = (
    <EAMachineDialog
      maquina={selecionada}
      open={!!selecionada}
      onOpenChange={(v) => !v && setSelecionada(null)}
    />
  );

  return { abrir, dialog, conhece: (nome: string) => porNome.has(nome.trim().toUpperCase()) };
}