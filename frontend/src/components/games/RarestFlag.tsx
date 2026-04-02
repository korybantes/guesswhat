import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface FlagChoice {
  id: number;
  country_code: string;
  country_name: string;
  flag_url: string;
  rarity_score: number;
}

interface Props {
  question: {
    kind: 'rarest_pick';
    category: string;
    choices: FlagChoice[];
  };
  onVote: (choice: number) => void;
  hasAnswered: boolean;
  phase: 'active' | 'result';
  correctAnswer: string | null;
}

const RARITY_COLOR = (score: number) => {
  if (score >= 80) return { label: 'LEGENDARY', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
  if (score >= 60) return { label: 'EPIC', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
  if (score >= 40) return { label: 'RARE', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' };
  return { label: 'COMMON', color: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/20' };
};

export default function RarestFlag({ question, onVote, hasAnswered, phase, correctAnswer }: Props) {
  const { setHasAnswered } = useGameStore();
  const [selected, setSelected] = useState<number | null>(null);

  const handleVote = (id: number) => {
    if (hasAnswered || phase === 'result') return;
    setSelected(id);
    setHasAnswered();
    onVote(id);
  };

  const getCardState = (choice: FlagChoice) => {
    const isCorrect = String(choice.id) === correctAnswer;
    const wasSelected = choice.id === selected;
    if (phase === 'result') {
      if (isCorrect) return 'correct';
      if (wasSelected) return 'wrong';
      return 'neutral';
    }
    if (hasAnswered) return choice.id === selected ? 'selected' : 'neutral';
    return 'idle';
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6 text-center">
      <div>
        <div className="text-[10px] font-bold text-slate-600 tracking-[0.2em] uppercase mb-2">PICK THE RAREST FLAG</div>
        <h2 className="text-xl font-bold text-white tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>
          {question.category}
        </h2>
        <p className="text-slate-500 text-sm mt-1">Which flag is the hardest to recognize?</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {question.choices.map((choice) => {
          const state = getCardState(choice);
          const rarity = RARITY_COLOR(choice.rarity_score);

          return (
            <button
              key={choice.id}
              onClick={() => handleVote(choice.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all group",
                state === 'correct' && 'border-green-500/40 bg-green-500/[0.06]',
                state === 'wrong' && 'border-red-500/40 bg-red-500/[0.05]',
                state === 'selected' && 'border-cyan-500/40 bg-cyan-500/[0.06]',
                state === 'neutral' && 'border-white/[0.06] bg-white/[0.02] opacity-50',
                state === 'idle' && 'border-white/[0.08] bg-white/[0.02] hover:border-cyan-500/30 hover:bg-cyan-500/[0.03] cursor-pointer',
              )}
              disabled={hasAnswered || phase === 'result'}
            >
              <div className="flag-display aspect-video mb-3">
                <img
                  src={choice.flag_url}
                  alt={choice.country_name}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="text-sm font-bold text-white mb-1.5">
                {phase === 'result' ? choice.country_name : '???'}
              </div>

              {phase === 'result' && (
                <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold border", rarity.bg, rarity.border)}>
                  <span className={rarity.color}>{rarity.label}</span>
                  <span className="text-slate-600" style={{ fontFamily: 'var(--font-mono)' }}>{choice.rarity_score.toFixed(0)}%</span>
                </div>
              )}

              {state === 'correct' && <div className="text-green-400 text-xs font-bold mt-1">✓ RAREST</div>}
            </button>
          );
        })}
      </div>

      {hasAnswered && phase === 'active' && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-cyan-500/60">
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <span className="font-bold text-xs tracking-wider">WAITING FOR OTHERS...</span>
        </div>
      )}
    </div>
  );
}
