import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CrudTable } from "@/components/hud/CrudTable";
import { ModulePage } from "@/components/hud/ModulePage";
import { useAuth } from "@/context/AuthProvider";
import { UsersRolesPanel } from "@/components/hud/UsersRolesPanel";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "ICS · Administração Multi-tenant" },
      { name: "description", content: "Cadastro de empresas, plantas, unidades, setores, linhas, turnos e RBAC." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { hasRole, roles } = useAuth();
  const isAdmin = hasRole("admin");

  return (
    <ModulePage
      icon={ShieldCheck}
      eyebrow="Multi-tenant · RBAC · Turnos · Calendários"
      title="Administração"
      description={
        isAdmin
          ? "Gestão da hierarquia organizacional e permissões."
          : `Você está autenticado com perfis: ${roles.join(", ") || "sem perfis"}. Somente administradores podem editar aqui.`
      }
    >
      <Tabs defaultValue="empresas">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="empresas">Empresas</TabsTrigger>
          <TabsTrigger value="plantas">Plantas</TabsTrigger>
          <TabsTrigger value="unidades">Unidades</TabsTrigger>
          <TabsTrigger value="setores">Setores</TabsTrigger>
          <TabsTrigger value="linhas">Linhas</TabsTrigger>
          <TabsTrigger value="areas">Áreas</TabsTrigger>
          <TabsTrigger value="turnos">Turnos</TabsTrigger>
          <TabsTrigger value="calendarios">Calendários</TabsTrigger>
          <TabsTrigger value="feriados">Feriados</TabsTrigger>
          <TabsTrigger value="rbac">Usuários & Perfis</TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="mt-4">
          <CrudTable
            table="empresas"
            title="Empresas (tenants)"
            description="Cada empresa é um tenant isolado por RLS."
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "cnpj", label: "CNPJ", type: "text" },
              { name: "razao_social", label: "Razão Social", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="plantas" className="mt-4">
          <CrudTable
            table="plantas"
            title="Plantas"
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "empresa_id", label: "Empresa", type: "select", required: true, optionsFrom: { table: "empresas", label: "nome" } },
              { name: "cidade", label: "Cidade", type: "text" },
              { name: "uf", label: "UF", type: "text" },
            ]}
          />
        </TabsContent>

        <TabsContent value="unidades" className="mt-4">
          <CrudTable
            table="unidades"
            title="Unidades"
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "planta_id", label: "Planta", type: "select", required: true, optionsFrom: { table: "plantas", label: "nome" } },
            ]}
          />
        </TabsContent>

        <TabsContent value="setores" className="mt-4">
          <CrudTable
            table="setores"
            title="Setores"
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "unidade_id", label: "Unidade", type: "select", required: true, optionsFrom: { table: "unidades", label: "nome" } },
            ]}
          />
        </TabsContent>

        <TabsContent value="linhas" className="mt-4">
          <CrudTable
            table="linhas"
            title="Linhas de Produção"
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "setor_id", label: "Setor", type: "select", required: true, optionsFrom: { table: "setores", label: "nome" } },
              { name: "capacidade_hora", label: "Cap./h", type: "number" },
            ]}
          />
        </TabsContent>

        <TabsContent value="areas" className="mt-4">
          <CrudTable
            table="areas"
            title="Áreas"
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "planta_id", label: "Planta", type: "select", required: true, optionsFrom: { table: "plantas", label: "nome" } },
            ]}
          />
        </TabsContent>

        <TabsContent value="turnos" className="mt-4">
          <CrudTable
            table="turnos"
            title="Turnos"
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "hora_inicio", label: "Início (HH:MM)", type: "text", required: true },
              { name: "hora_fim", label: "Fim (HH:MM)", type: "text", required: true },
            ]}
          />
        </TabsContent>

        <TabsContent value="calendarios" className="mt-4">
          <CrudTable
            table="calendarios"
            title="Calendários"
            fields={[
              { name: "nome", label: "Nome", type: "text", required: true },
              { name: "descricao", label: "Descrição", type: "textarea" },
            ]}
          />
        </TabsContent>

        <TabsContent value="feriados" className="mt-4">
          <CrudTable
            table="feriados"
            title="Feriados"
            searchColumn="descricao"
            orderBy="data"
            fields={[
              { name: "descricao", label: "Descrição", type: "text", required: true },
              { name: "data", label: "Data (YYYY-MM-DD)", type: "text", required: true },
              { name: "calendario_id", label: "Calendário", type: "select", optionsFrom: { table: "calendarios", label: "nome" } },
            ]}
          />
        </TabsContent>

        <TabsContent value="rbac" className="mt-4">
          <UsersRolesPanel />
        </TabsContent>
      </Tabs>
    </ModulePage>
  );
}