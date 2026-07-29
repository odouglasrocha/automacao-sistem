import { createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Factory, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthProvider";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "ICS · Acesso" },
      { name: "description", content: "Autenticação da plataforma industrial ICS." },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const signupSchema = loginSchema.extend({
  nome: z.string().trim().min(2).max(120),
});
const resetSchema = z.object({ email: z.string().trim().email() });
const newPasswordSchema = z.object({ password: z.string().min(6).max(72) });

function AuthPage() {
  const nav = useNavigate();
  const { user, signIn, signUp, resetPassword, loading } = useAuth();
  const search = useRouterState({ select: (s) => s.location.search }) as { reset?: string };
  const isRecovery =
    typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  useEffect(() => {
    if (!loading && user && !isRecovery) nav({ to: "/" });
  }, [user, loading, isRecovery, nav]);

  if (isRecovery) return <NewPasswordForm onDone={() => nav({ to: "/" })} />;

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md hud-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-md bg-primary/15 border border-primary/40 flex items-center justify-center">
            <Factory className="h-5 w-5 text-primary" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Industrial Control System
            </div>
            <h1 className="font-semibold text-foreground leading-tight">Acessar plataforma</h1>
          </div>
        </div>
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="signin">Entrar</TabsTrigger>
            <TabsTrigger value="signup">Criar conta</TabsTrigger>
            <TabsTrigger value="reset">Recuperar</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <SignInForm onSubmit={signIn} />
          </TabsContent>
          <TabsContent value="signup">
            <SignUpForm onSubmit={signUp} />
          </TabsContent>
          <TabsContent value="reset">
            <ResetForm onSubmit={resetPassword} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function SignInForm({ onSubmit }: { onSubmit: (e: string, p: string) => Promise<void> }) {
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(loginSchema) });
  return (
    <form
      className="space-y-3 mt-4"
      onSubmit={handleSubmit(async (v) => {
        try {
          await onSubmit(v.email, v.password);
          toast.success("Login realizado");
        } catch (e: any) {
          toast.error(e.message ?? "Falha ao entrar");
        }
      })}
    >
      <div>
        <Label>E-mail</Label>
        <Input type="email" autoComplete="email" {...register("email")} />
        {formState.errors.email && (
          <p className="text-xs text-danger mt-1">{formState.errors.email.message}</p>
        )}
      </div>
      <div>
        <Label>Senha</Label>
        <Input type="password" autoComplete="current-password" {...register("password")} />
        {formState.errors.password && (
          <p className="text-xs text-danger mt-1">{formState.errors.password.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        {formState.isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Entrar
      </Button>
    </form>
  );
}

function SignUpForm({ onSubmit }: { onSubmit: (e: string, p: string, n?: string) => Promise<void> }) {
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(signupSchema) });
  return (
    <form
      className="space-y-3 mt-4"
      onSubmit={handleSubmit(async (v) => {
        try {
          await onSubmit(v.email, v.password, v.nome);
          toast.success("Conta criada. Verifique seu e-mail se a confirmação estiver ativa.");
        } catch (e: any) {
          toast.error(e.message ?? "Falha ao criar conta");
        }
      })}
    >
      <div>
        <Label>Nome</Label>
        <Input {...register("nome")} />
      </div>
      <div>
        <Label>E-mail</Label>
        <Input type="email" {...register("email")} />
      </div>
      <div>
        <Label>Senha</Label>
        <Input type="password" autoComplete="new-password" {...register("password")} />
      </div>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        Criar conta
      </Button>
    </form>
  );
}

function ResetForm({ onSubmit }: { onSubmit: (e: string) => Promise<void> }) {
  const { register, handleSubmit, formState } = useForm({ resolver: zodResolver(resetSchema) });
  return (
    <form
      className="space-y-3 mt-4"
      onSubmit={handleSubmit(async (v) => {
        try {
          await onSubmit(v.email);
          toast.success("Enviamos um e-mail com o link de recuperação");
        } catch (e: any) {
          toast.error(e.message ?? "Falha ao enviar");
        }
      })}
    >
      <div>
        <Label>E-mail</Label>
        <Input type="email" {...register("email")} />
      </div>
      <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
        Enviar link de recuperação
      </Button>
    </form>
  );
}

function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const { register, handleSubmit, formState } = useForm({
    resolver: zodResolver(newPasswordSchema),
  });
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <form
        className="w-full max-w-md hud-panel p-6 space-y-3"
        onSubmit={handleSubmit(async (v) => {
          const { error } = await supabase.auth.updateUser({ password: v.password });
          if (error) return toast.error(error.message);
          toast.success("Senha alterada");
          onDone();
        })}
      >
        <h2 className="font-semibold">Definir nova senha</h2>
        <div>
          <Label>Nova senha</Label>
          <Input type="password" autoComplete="new-password" {...register("password")} />
          {formState.errors.password && (
            <p className="text-xs text-danger mt-1">{formState.errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full">Salvar</Button>
      </form>
    </div>
  );
}