import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { toast } from "sonner";
import { Download, Share2 } from "lucide-react";
import { MONSTERS_BY_ID } from "@/lib/game/monsters";
import { RARITIES } from "@/lib/game/config";
import { useGame } from "@/hooks/use-game";
import { rarityText } from "@/components/game/MonsterArt";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { duration, num, shortDate } from "@/lib/format";
import type { Session } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type ShareOptions = {
  showBook: boolean;
  showSubject: boolean;
  showPages: boolean;
  showMonster: boolean;
  showRewards: boolean;
  showName: boolean;
  showStreak: boolean;
};

const DEFAULT_OPTIONS: ShareOptions = {
  showBook: true,
  showSubject: true,
  showPages: true,
  showMonster: true,
  showRewards: true,
  showName: true,
  showStreak: true,
};

const CARD_W = 1080;
const CARD_H = 1350;
const PREVIEW_W = 300;

async function download(node: HTMLElement, filename: string) {
  const url = await toPng(node, {
    width: CARD_W,
    height: CARD_H,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: "#0b0716",
    // o preview é exibido com scale(); a imagem precisa sair no tamanho real
    style: { transform: "none", transformOrigin: "top left", margin: "0" },
  });
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

function Frame({
  children,
  innerRef,
}: {
  children: React.ReactNode;
  innerRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      className="mx-auto overflow-hidden rounded-2xl ring-1 ring-border/60"
      style={{ width: PREVIEW_W, height: Math.round((PREVIEW_W * CARD_H) / CARD_W) }}
    >
      <div
        ref={innerRef}
        style={{
          width: CARD_W,
          height: CARD_H,
          transform: `scale(${PREVIEW_W / CARD_W})`,
          transformOrigin: "top left",
        }}
        className="relative flex flex-col justify-between overflow-hidden bg-[#0b0716] px-[64px] py-[56px] text-white"
      >
        <div className="pointer-events-none absolute -left-40 -top-40 h-[700px] w-[700px] rounded-full bg-[#7c3aed] opacity-40 blur-[160px]" />
        <div className="pointer-events-none absolute -bottom-52 -right-32 h-[700px] w-[700px] rounded-full bg-[#22d3ee] opacity-25 blur-[170px]" />
        {children}
      </div>
    </div>
  );
}

function Brand() {
  return (
    <div className="relative flex items-center gap-4">
      <span className="grid h-[64px] w-[64px] place-items-center rounded-2xl bg-white/10 text-[34px]">
        🐲
      </span>
      <p className="font-display text-[34px] font-bold leading-none">M.S</p>
    </div>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[36px] bg-white/8 px-10 py-8 ring-1 ring-white/10">
      <p className="text-[26px] uppercase tracking-[0.2em] text-white/50">{label}</p>
      <p className="font-display text-[62px] font-bold leading-tight">{value}</p>
    </div>
  );
}

function OptionRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 px-3 py-2">
      <Label className="text-sm font-normal">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Botão + diálogo para baixar a imagem de uma sessão */
export function SessionShareButton({
  session,
  variant = "outline",
  className,
}: {
  session: Session;
  variant?: "outline" | "secondary" | "ghost" | "default";
  className?: string;
}) {
  const state = useGame();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [opt, setOpt] = useState<ShareOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);

  const reward = session.kind === "free" ? null : session.reward;
  const def = reward?.monsterId ? MONSTERS_BY_ID[reward.monsterId] : null;
  // em sessões de estudo mostramos o assunto informado, nunca o livro
  const book =
    session.kind !== "study" && session.bookId
      ? state.books.find((b) => b.id === session.bookId)
      : null;
  const isRead = session.kind === "read" || (session.kind === "free" && session.mode === "read");

  const title =
    session.kind === "study"
      ? "Sessão de estudo"
      : session.kind === "read"
        ? "Sessão de leitura"
        : "Treino livre";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={variant} className={className}>
          <Share2 className="h-4 w-4" /> Baixar sessão
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Imagem para stories</DialogTitle>
        </DialogHeader>

        <Frame innerRef={ref}>
          <Brand />
          <div className="relative space-y-8">
            <p className="text-[30px] uppercase tracking-[0.3em] text-white/50">{title}</p>
            {opt.showSubject && session.kind === "study" && (
              <p className="font-display text-[74px] font-bold leading-tight">{session.subject}</p>
            )}
            {opt.showBook && book && (
              <p className="font-display text-[64px] font-bold leading-tight">{book.title}</p>
            )}
            <div className="grid grid-cols-2 gap-6">
              <Big label="Tempo" value={duration(session.durationSec)} />
              {opt.showPages && isRead && session.kind === "read" && (
                <Big label="Páginas" value={num(session.pagesRead)} />
              )}
              {opt.showPages && isRead && session.kind === "free" && (
                <Big label="Páginas" value={num(session.pagesRead ?? 0)} />
              )}
              {opt.showRewards && reward && <Big label="XP" value={`+${num(reward.xp)}`} />}
              {session.kind === "free" && (
                <Big label="XP do monstro" value={`+${num(session.monsterXp)}`} />
              )}
            </div>
            {opt.showMonster && def && (
              <div className="flex items-center gap-8 rounded-[40px] bg-white/8 p-8 ring-1 ring-white/10">
                <img src={def.art} alt="" className="h-[200px] w-[200px] object-contain" />
                <div>
                  <p className="text-[26px] uppercase tracking-[0.2em] text-white/50">
                    Monstro encontrado
                  </p>
                  <p className="font-display text-[58px] font-bold leading-tight">{def.name}</p>
                  <p className={cn("text-[34px] font-semibold", rarityText(def.rarity))}>
                    {RARITIES[def.rarity].name}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="relative flex items-center justify-between text-[28px] text-white/60">
            <span>{opt.showName ? state.profile.name : ""}</span>
            <span>{shortDate(session.endedAt.slice(0, 10))}</span>
          </div>
        </Frame>

        <div className="space-y-2">
          {session.kind === "study" && (
            <OptionRow
              label="Mostrar assunto"
              checked={opt.showSubject}
              onChange={(v) => setOpt({ ...opt, showSubject: v })}
            />
          )}
          {book && (
            <OptionRow
              label="Mostrar nome do livro"
              checked={opt.showBook}
              onChange={(v) => setOpt({ ...opt, showBook: v })}
            />
          )}
          {isRead && (
            <OptionRow
              label="Mostrar páginas lidas"
              checked={opt.showPages}
              onChange={(v) => setOpt({ ...opt, showPages: v })}
            />
          )}
          {def && (
            <OptionRow
              label="Mostrar monstro ganho"
              checked={opt.showMonster}
              onChange={(v) => setOpt({ ...opt, showMonster: v })}
            />
          )}
          {reward && (
            <OptionRow
              label="Mostrar recompensas"
              checked={opt.showRewards}
              onChange={(v) => setOpt({ ...opt, showRewards: v })}
            />
          )}
          <OptionRow
            label="Mostrar meu nome"
            checked={opt.showName}
            onChange={(v) => setOpt({ ...opt, showName: v })}
          />
        </div>

        <Button
          size="lg"
          disabled={busy}
          onClick={async () => {
            if (!ref.current) return;
            setBusy(true);
            try {
              await download(ref.current, `monster-study-sessao.png`);
              toast.success("Imagem baixada!");
            } catch {
              toast.error("Não foi possível gerar a imagem.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download className="h-4 w-4" /> {busy ? "Gerando..." : "Baixar imagem"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

/** Botão + diálogo para baixar a imagem do resumo do dia */
export function DayShareButton({
  dayKey,
  className,
}: {
  dayKey: string;
  className?: string;
}) {
  const state = useGame();
  const ref = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [opt, setOpt] = useState<ShareOptions>(DEFAULT_OPTIONS);
  const [busy, setBusy] = useState(false);
  const day = state.activity[dayKey] ?? { studySec: 0, readSec: 0, pages: 0, sessions: 0 };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary" className={className}>
          <Share2 className="h-4 w-4" /> Baixar status do dia
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Status do dia para stories</DialogTitle>
        </DialogHeader>

        <Frame innerRef={ref}>
          <Brand />
          <div className="relative space-y-8">
            <p className="text-[30px] uppercase tracking-[0.3em] text-white/50">
              Meu dia · {shortDate(dayKey)}
            </p>
            <div className="grid grid-cols-2 gap-6">
              <Big label="Estudo" value={duration(day.studySec)} />
              <Big label="Leitura" value={duration(day.readSec)} />
              {opt.showPages && <Big label="Páginas" value={num(day.pages)} />}
              <Big label="Sessões" value={num(day.sessions)} />
              {opt.showRewards && <Big label="Nível" value={`${state.profile.level}`} />}
              {opt.showStreak && <Big label="Sequência" value={`🔥 ${state.streak.current} dias`} />}
            </div>
          </div>
          <div className="relative flex items-center justify-between text-[28px] text-white/60">
            <span>{opt.showName ? state.profile.name : ""}</span>
            <span>monsterstudy</span>
          </div>
        </Frame>

        <div className="space-y-2">
          <OptionRow
            label="Mostrar páginas lidas"
            checked={opt.showPages}
            onChange={(v) => setOpt({ ...opt, showPages: v })}
          />
          <OptionRow
            label="Mostrar nível"
            checked={opt.showRewards}
            onChange={(v) => setOpt({ ...opt, showRewards: v })}
          />
          <OptionRow
            label="Mostrar sequência"
            checked={opt.showStreak}
            onChange={(v) => setOpt({ ...opt, showStreak: v })}
          />
          <OptionRow
            label="Mostrar meu nome"
            checked={opt.showName}
            onChange={(v) => setOpt({ ...opt, showName: v })}
          />
        </div>

        <Button
          size="lg"
          disabled={busy}
          onClick={async () => {
            if (!ref.current) return;
            setBusy(true);
            try {
              await download(ref.current, "monster-study-dia.png");
              toast.success("Imagem baixada!");
            } catch {
              toast.error("Não foi possível gerar a imagem.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Download className="h-4 w-4" /> {busy ? "Gerando..." : "Baixar imagem"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
