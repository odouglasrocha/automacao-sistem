/**
 * Diálogo da CONFIGURAÇÃO EXCLUSIVA de uma máquina da Frota EA.
 * Toda a configuração do sistema vive no ConfigCenter — não há menus
 * de configuração espalhados por outros módulos.
 */
import { Cpu } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ConfigCenter } from "@/components/hud/ea/ConfigCenter";
import type { EaMaquina } from "@/hooks/useEaMachine";

export function EAMachineDialog({
  maquina,
  open,
  onOpenChange,
}: {
  maquina: EaMaquina | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!maquina) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> {maquina.nome} · Configuração exclusiva
          </DialogTitle>
          <DialogDescription>
            Centro de Configuração Industrial desta máquina — controlador, comunicação, equipamentos,
            tags, totalizador, receitas, alarmes, OEE, diagnóstico, histórico, auditoria e permissões
            vinculados a <code>maquina_id</code>.
          </DialogDescription>
        </DialogHeader>

        {maquina.virtual && (
          <div className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-warning">
            Banco ainda não configurado — rode <code>docs/sql/0003_ea_clp.sql</code> e{" "}
            <code>docs/sql/0010_config_exclusiva.sql</code> no SQL Editor do Supabase para persistir
            a configuração exclusiva desta máquina.
          </div>
        )}

        <ConfigCenter maquina={maquina} />
      </DialogContent>
    </Dialog>
  );
}
