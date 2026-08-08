import { useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { resetProgress, updateSettings } from "@/lib/game/state";
import { PageHeader } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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

const TOGGLES = [
  { id: "sounds", label: "Sons", hint: "Efeitos sonoros nas revelações e fim de sessão." },
  { id: "animations", label: "Animações", hint: "Animações de revelação e brilhos de raridade." },
  { id: "notifications", label: "Notificações", hint: "Avisos ao fim das sessões (quando permitido)." },
  { id: "compact", label: "Modo compacto", hint: "Reduz espaçamentos para mostrar mais conteúdo." },
] as const;

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Monster Study" },
      {
        name: "description",
        content: "Ajuste sons, animações e notificações, exporte seus dados ou reinicie o progresso.",
      },
      { property: "og:title", content: "Configurações — Monster Study" },
      { property: "og:description", content: "Preferências, backup de dados e reinício de progresso." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const state = useGame();
  const fileRef = useRef<HTMLInputElement>(null);

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monster-study-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exportado");
  }

  function importData(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!parsed || typeof parsed !== "object" || !parsed.profile) throw new Error("inválido");
        window.localStorage.setItem("monster-study:v1", JSON.stringify(parsed));
        toast.success("Dados importados. Recarregando...");
        setTimeout(() => window.location.reload(), 600);
      } catch {
        toast.error("Arquivo inválido");
      }
    };
    reader.readAsText(file);
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Configurações" icon="⚙️" subtitle="Preferências e gestão dos seus dados." />

      <section className="panel divide-y divide-border p-2">
        {TOGGLES.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-4 p-4">
            <div>
              <Label className="text-base">{t.label}</Label>
              <p className="text-xs text-muted-foreground">{t.hint}</p>
            </div>
            <Switch
              checked={state.settings[t.id]}
              onCheckedChange={(v) => updateSettings({ [t.id]: v })}
            />
          </div>
        ))}
      </section>

      <section className="panel space-y-3 p-5">
        <h2 className="font-display text-lg font-semibold">Seus dados</h2>
        <p className="text-sm text-muted-foreground">
          Todo o progresso é salvo apenas neste navegador. Exporte um backup para não perder sua
          coleção.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={exportData}>Exportar backup</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            Importar backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => importData(e.target.files?.[0])}
          />
        </div>
      </section>

      <section className="panel space-y-3 border-destructive/40 p-5">
        <h2 className="font-display text-lg font-semibold text-destructive">Zona de perigo</h2>
        <p className="text-sm text-muted-foreground">
          Reiniciar apaga monstros, livros, sessões, dinheiro e conquistas.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Reiniciar progresso</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-display">Reiniciar tudo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação é permanente e não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  resetProgress();
                  toast.success("Progresso reiniciado");
                }}
              >
                Reiniciar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
