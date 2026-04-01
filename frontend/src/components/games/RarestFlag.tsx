import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Badge } from '@/components/ui/badge';

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

const RARITY = (score: number) => {
  if (score >= 80) return { label: 'Legendary', pct: `${score.toFixed(1)}%`, cls: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' };
  if (score >= 60) return { label: 'Epic', pct: `${score.toFixed(1)}%`, cls: 'text-purple-400 bg-purple-400/10 border-purple-400/30' };
  if (score >= 40) return { label: 'Rare', pct: `${score.toFixed(1)}%`, cls: 'text-blue-400 bg-blue-400/10 border-blue-400/30' };
  return { label: 'Common', pct: `${score.toFixed(1)}%`, cls: 'text-slate-400 bg-slate-400/10 border-slate-400/30' };
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

  const containerClass: Record<string, string> = {
    correct: 'border-green-400/60 bg-green-400/8',
    wrong: 'border-red-400/50 bg-red-400/6',
    selected: 'border-teal-400/60 bg-teal-500/8',
    neutral: 'border-white/8 bg-white/4 opacity-60',
    idle: 'border-white/10 bg-white/5 hover:border-teal-500/40 hover:bg-teal-500/6 cursor-pointer',
  };

  return (
    <div className="w-full max-w-2xl space-y-6 text-center">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Pick the rarest flag</p>
        <h2 className="text-2xl font-bold text-white">{question.category}</h2>
        <p className="text-slate-400 text-sm mt-2">Which flag is the hardest to guess in the world?</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {question.choices.map((choice) => {
          const state = getCardState(choice);
          const rarity = RARITY(choice.rarity_score);

          return (
            <button
              key={choice.id}
              onClick={() => handleVote(choice.id)}
              className={`rounded-xl border p-3 text-left transition-all duration-150 ${containerClass[state]}`}
              disabled={hasAnswered || phase === 'result'}
            >
              <img
                src={choice.flag_url}
                alt={choice.country_name}
                className="w-full aspect-video object-cover rounded-lg mb-3"
              />
              <div className="text-sm font-medium text-white mb-1.5">
                {phase === 'result' ? choice.country_name : '???'}
              </div>
              <Badge className={`${rarity.cls} border text-xs`}>
                {rarity.label} · {rarity.pct}
              </Badge>
            </button>
          );
        })}
      </div>

      {hasAnswered && phase === 'active' && (
        <p className="text-slate-500 text-sm animate-pulse">Voted! Waiting for others...</p>
      )}
    </div>
  );
}
