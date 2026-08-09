import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { useGame } from "@/hooks/use-game";
import { redeemCode } from "@/lib/game/state";
import { GIFT_CODES } from "@/lib/game/config";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { PageHeader } from "@/components/game/Primitives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/codigos")({
  head: () => ({
    meta: [
      { title: "Códigos — Monster Study" },
      {
        name: "description",
        content:
          "Resgate códigos promocionais e receba moedas, fragmentos, cronômetros e monstros exclusivos.",
      },
      { property: "og:title", content: "Códigos — Monster Study" },
      {
        property: "og:description",
        content: "Insira um código e receba recompensas para sua jornada de estudos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CodesPage,
});

function CodesPage() {
  const state = useGame();
  const [value, setValue] = useState("");

  function submit() {
    const res = redeemCode(value);
    if (res.ok) {
      toast.success(res.message);
      setValue("");
    } else {
      toast.error(res.message);
    }
  }

  const redeemed = state.redeemedCodes;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Códigos"
        icon="🎁"
        subtitle={`${redeemed.length} / ${GIFT_CODES.length} códigos resgatados`}
      />

      <div className="panel aurora space-y-4 p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Digite seu código (ex: BEMVINDO)"
            value={value}
            onChange={(e) => setValue(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="font-mono uppercase tracking-widest"
          />
          <Button size="lg" onClick={submit}>
            <Gift className="h-4 w-4" /> Resgatar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Cada código pode ser resgatado uma única vez por conta.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {GIFT_CODES.map((c) => {
          const used = redeemed.includes(c.code);
          return (
            <div key={c.code} className={cn("panel p-4", used && "opacity-55")}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-sm font-semibold tracking-widest">
                  {used ? c.code : "•".repeat(c.code.length)}
                </p>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                    used ? "bg-secondary text-muted-foreground" : "bg-primary/20 text-primary",
                  )}
                >
                  {used ? "Resgatado" : "Disponível"}
                </span>
              </div>
              <p className="mt-1 font-display text-base font-semibold">{c.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {c.moneyRange[0]}–{c.moneyRange[1]} moedas · {c.shardRange[0]}–{c.shardRange[1]}{" "}
                fragmentos
                {c.randomRarity ? " · + monstro raro aleatório" : ""}
              </p>
            </div>
          );
        })}

      </div>
    </div>
  );
}
