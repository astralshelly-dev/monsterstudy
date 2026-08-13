import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { deleteMyAccount } from "@/lib/account.functions";
import { resetProgress } from "@/lib/game/state";
import { PageHeader } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


export const Route = createFileRoute("/entrar")({
  head: () => ({
    meta: [
      { title: "Entrar — Monster Study" },
      {
        name: "description",
        content:
          "Crie sua conta do Monster Study para salvar seu progresso na nuvem e ter um ID público de jogador.",
      },
      { property: "og:title", content: "Entrar — Monster Study" },
      { property: "og:description", content: "Login e sincronização entre dispositivos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const removeAccount = useServerFn(deleteMyAccount);


  async function submit() {
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Confira seu email para confirmar a conta.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        void navigate({ to: "/" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível continuar.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/" });
  }

  if (user) {
    return (
      <div className="space-y-6">
        <PageHeader title="Conta" icon="🔐" subtitle={user.email ?? undefined} />
        <div className="panel space-y-4 p-6">
          <p className="text-sm text-muted-foreground">
            Seu progresso está sendo salvo na nuvem automaticamente.
          </p>
          <Button
            variant="outline"
            onClick={async () => {
              await supabase.auth.signOut();
              toast.success("Você saiu da conta.");
            }}
          >
            Sair da conta
          </Button>
        </div>

        <div className="panel space-y-3 border-destructive/40 p-6">
          <h2 className="font-display text-lg font-semibold text-destructive">Apagar conta</h2>
          <p className="text-sm text-muted-foreground">
            Isso remove sua conta, seu save na nuvem e seu perfil público para sempre. Não dá para
            desfazer.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={busy}>
                Apagar minha conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display">Apagar a conta?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todos os monstros, sessões e troféus serão perdidos definitivamente.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    setBusy(true);
                    try {
                      await removeAccount();
                      await supabase.auth.signOut();
                      resetProgress();
                      toast.success("Conta apagada.");
                      void navigate({ to: "/" });
                    } catch {
                      toast.error("Não foi possível apagar a conta.");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Apagar para sempre
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      <PageHeader
        title={mode === "login" ? "Entrar" : "Criar conta"}
        icon="🔐"
        subtitle="Salve seu progresso na nuvem e receba seu ID de jogador."
      />

      <div className="panel mx-auto max-w-md space-y-4 p-6">
        <Button variant="secondary" className="w-full" onClick={google}>
          Continuar com Google
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Senha</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button className="w-full" size="lg" disabled={busy || !email || !password} onClick={submit}>
          {mode === "login" ? "Entrar" : "Criar conta"}
        </Button>
        <button
          type="button"
          className="w-full text-sm text-primary hover:underline"
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
        >
          {mode === "login" ? "Não tenho conta ainda" : "Já tenho uma conta"}
        </button>
      </div>
    </div>
  );
}
