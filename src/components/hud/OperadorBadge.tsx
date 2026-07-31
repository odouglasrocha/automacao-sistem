import { useState } from "react";
import { IdCard, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useOperador } from "@/context/OperadorProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function OperadorBadge() {
  const { operador, vincular, desvincular } = useOperador();
  const [open, setOpen] = useState(false);
  const [matricula, setMatricula] = useState("");
  const [nome, setNome] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const op = await vincular(matricula, nome);
      toast.success(`Operador vinculado: ${op.matricula} · ${op.nome}`);
      setOpen(false);
      setMatricula("");
      setNome("");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível vincular o operador.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="flex min-w-0 items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="min-w-0 gap-2"
          onClick={() => setOpen(true)}
          title="Vincular operador (matrícula)"
        >
          <IdCard className="h-4 w-4 shrink-0 text-primary" />
          <span className="min-w-0 truncate text-xs mono">
            {operador ? `${operador.matricula} · ${operador.nome}` : "Vincular operador"}
          </span>
        </Button>
        {operador && (
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0"
            title="Desvincular operador"
            onClick={() => desvincular()}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Vincular operador ao terminal</DialogTitle>
            <DialogDescription>
              Informe a matrícula. Se já existir cadastro, o nome é preenchido automaticamente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Matrícula</Label>
              <Input
                autoFocus
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder="ex.: 10432"
              />
            </div>
            <div>
              <Label>Nome</Label>
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void submit()}
                placeholder="Nome do operador (novo cadastro)"
              />
            </div>
            <Button className="w-full" disabled={saving} onClick={() => void submit()}>
              {saving ? "Vinculando…" : "Vincular"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}