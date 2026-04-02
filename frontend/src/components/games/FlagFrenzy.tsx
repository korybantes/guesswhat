import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { cn } from '@/lib/utils';

interface Props {
  question: {
    kind: 'guess_flag';
    country_code: string;
    country_name: string;
    flag_url: string;
    options: string[] | null;
    rarity_score: number;
  };
  onAnswer: (answer: string) => void;
  hasAnswered: boolean;
  phase: 'active' | 'result';
  correctAnswer: string | null;
}

const RARITY = (score: number) => {
  if (score >= 80) return { label: 'LEGENDARY', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' };
  if (score >= 60) return { label: 'EPIC', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', dot: 'bg-purple-400' };
  if (score >= 40) return { label: 'RARE', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' };
  return { label: 'COMMON', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/20', dot: 'bg-slate-400' };
};

export default function FlagFrenzy({ question, onAnswer, hasAnswered, phase, correctAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const { setHasAnswered } = useGameStore();

  const rarity = RARITY(question.rarity_score);

  const handleSelect = (option: string) => {
    if (hasAnswered || phase === 'result') return;
    setSelected(option);
    setHasAnswered();
    onAnswer(option);
  };

  const getOptionState = (opt: string) => {
    if (phase === 'result') {
      if (opt === correctAnswer) return 'correct';
      if (opt === selected && opt !== correctAnswer) return 'wrong';
      return 'neutral';
    }
    if (hasAnswered) return opt === selected ? 'selected' : 'neutral';
    return 'idle';
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 text-center">
      {/* Rarity indicator */}
      <div className="flex justify-center">
        <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-[0.15em]", rarity.bg)}>
          <div className={cn("w-1.5 h-1.5 rounded-full", rarity.dot)} />
          <span className={rarity.color}>{rarity.label}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500" style={{ fontFamily: 'var(--font-mono)' }}>{question.rarity_score.toFixed(0)}%</span>
        </div>
      </div>

      {/* Flag display */}
      <div className="flex justify-center">
        <div className="flag-display w-72 h-48 relative group">
          <img
            src={question.flag_url}
            alt="Country flag"
            className="w-full h-full"
            loading="eager"
          />
          {/* Scanline effect on flag */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20 pointer-events-none" />
          {phase === 'result' && (
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80">
              <span className="text-white text-sm font-bold" style={{ fontFamily: 'var(--font-display)' }}>{question.country_name}</span>
            </div>
          )}
        </div>
      </div>

      {/* Question */}
      <p className="text-sm text-slate-500">Which country does this flag belong to?</p>

      {/* Options */}
      {question.options ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {question.options.map((opt, idx) => {
            const state = getOptionState(opt);
            const labels = ['A', 'B', 'C', 'D'];
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={cn(
                  "option-btn px-4 py-3.5 rounded-xl border text-sm font-bold text-left flex items-center gap-3",
                  state === 'correct' && 'border-green-500/50 bg-green-500/[0.08] text-green-400',
                  state === 'wrong' && 'border-red-500/50 bg-red-500/[0.08] text-red-400',
                  state === 'selected' && 'border-cyan-500/50 bg-cyan-500/[0.08] text-cyan-400',
                  state === 'neutral' && 'border-white/[0.06] bg-white/[0.02] text-slate-500',
                  state === 'idle' && 'border-white/[0.08] bg-white/[0.02] text-white hover:border-cyan-500/30 hover:bg-cyan-500/[0.04] cursor-pointer',
                )}
                disabled={hasAnswered || phase === 'result'}
              >
                <span className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 border",
                  state === 'correct' ? 'bg-green-500/20 border-green-500/30 text-green-400' :
                  state === 'wrong' ? 'bg-red-500/20 border-red-500/30 text-red-400' :
                  state === 'selected' ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400' :
                  state === 'idle' ? 'bg-white/[0.04] border-white/[0.06] text-slate-500' :
                  'bg-white/[0.02] border-white/[0.04] text-slate-700'
                )}>
                  {state === 'correct' ? '✓' : state === 'wrong' ? '✗' : labels[idx]}
                </span>
                <span className="truncate">{opt}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-slate-600 text-sm">No options available</div>
      )}

      {hasAnswered && phase === 'active' && (
        <div className="flex items-center justify-center gap-2 py-3 text-sm text-cyan-500/60">
          <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
          <span className="font-bold text-xs tracking-wider">WAITING FOR OTHERS...</span>
        </div>
      )}
    </div>
  );
}
