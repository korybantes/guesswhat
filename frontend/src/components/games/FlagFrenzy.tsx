import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { useGameStore } from '@/store/gameStore';

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
  if (score >= 80) return { label: 'Legendary', cls: 'bg-yellow-400/15 text-yellow-400 border-yellow-400/30' };
  if (score >= 60) return { label: 'Epic', cls: 'bg-purple-400/15 text-purple-400 border-purple-400/30' };
  if (score >= 40) return { label: 'Rare', cls: 'bg-blue-400/15 text-blue-400 border-blue-400/30' };
  return { label: 'Common', cls: 'bg-slate-400/15 text-slate-400 border-slate-400/30' };
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
      const isCorrect = opt === correctAnswer;
      const wasSelected = opt === selected;
      if (isCorrect) return 'correct';
      if (wasSelected && !isCorrect) return 'wrong';
      return 'neutral';
    }
    if (hasAnswered) {
      return opt === selected ? 'selected' : 'neutral';
    }
    return 'idle';
  };

  const stateClasses: Record<string, string> = {
    correct: 'border-green-400/60 bg-green-400/12 text-green-300',
    wrong: 'border-red-400/60 bg-red-400/12 text-red-300',
    selected: 'border-teal-400/60 bg-teal-400/12 text-teal-300',
    neutral: 'border-white/8 bg-white/4 text-slate-400',
    idle: 'border-white/10 bg-white/5 text-white hover:border-teal-500/40 hover:bg-teal-500/8 hover:text-teal-300 cursor-pointer',
  };

  return (
    <div className="w-full max-w-lg space-y-8 text-center">
      {/* Rarity badge */}
      <div className="flex justify-center">
        <Badge className={`${rarity.cls} border font-medium`}>
          {rarity.label} · {question.rarity_score.toFixed(1)}% rarity
        </Badge>
      </div>

      {/* Flag image */}
      <div className="flex justify-center">
        <div className="relative">
          <img
            src={question.flag_url}
            alt="Country flag"
            className="w-72 h-48 object-cover rounded-xl shadow-2xl shadow-black/60 border border-white/10"
            loading="eager"
          />
          {phase === 'result' && (
            <div className="absolute inset-0 rounded-xl bg-black/20 flex items-end justify-center pb-3">
              <span className="text-white text-sm font-medium bg-black/60 px-3 py-1 rounded-full">
                {question.country_name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Question label */}
      <p className="text-slate-400 text-sm">Which country does this flag belong to?</p>

      {/* Multiple choice options */}
      {question.options ? (
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const state = getOptionState(opt);
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`px-4 py-3 rounded-xl border text-sm font-medium text-left transition-all duration-150 ${stateClasses[state]}`}
                disabled={hasAnswered || phase === 'result'}
              >
                <span className="flex items-center gap-2">
                  {phase === 'result' && opt === correctAnswer && <span>✓</span>}
                  {phase === 'result' && opt === selected && opt !== correctAnswer && <span>✗</span>}
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center text-slate-400">No options available</div>
      )}

      {hasAnswered && phase === 'active' && (
        <p className="text-slate-500 text-sm animate-pulse">Answer submitted! Waiting for others...</p>
      )}
    </div>
  );
}
