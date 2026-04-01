import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';

interface Props {
  question: {
    kind: 'guess_capital';
    country_code: string;
    country_name: string;
    flag_url: string;
    correct_capital: string;
    options: string[] | null;
  };
  onAnswer: (answer: string) => void;
  hasAnswered: boolean;
  phase: 'active' | 'result';
  correctAnswer: string | null;
}

export default function CapitalGuesser({ question, onAnswer, hasAnswered, phase, correctAnswer }: Props) {
  const { setHasAnswered } = useGameStore();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (opt: string) => {
    if (hasAnswered || phase === 'result') return;
    setSelected(opt);
    setHasAnswered();
    onAnswer(opt);
  };

  const getState = (opt: string) => {
    const isCorrect = opt === correctAnswer;
    const wasSelected = opt === selected;
    if (phase === 'result') {
      if (isCorrect) return 'correct';
      if (wasSelected) return 'wrong';
      return 'neutral';
    }
    if (hasAnswered) return opt === selected ? 'selected' : 'neutral';
    return 'idle';
  };

  const stateClasses: Record<string, string> = {
    correct: 'border-green-400/60 bg-green-400/12 text-green-300',
    wrong: 'border-red-400/50 bg-red-400/10 text-red-300',
    selected: 'border-teal-400/60 bg-teal-500/10 text-teal-300',
    neutral: 'border-white/8 bg-white/4 text-slate-400',
    idle: 'border-white/10 bg-white/5 text-white hover:border-teal-500/40 hover:bg-teal-500/8 hover:text-teal-300 cursor-pointer',
  };

  return (
    <div className="w-full max-w-lg space-y-7 text-center">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Capital City</p>
        <p className="text-slate-400 text-sm">
          What is the capital of <span className="text-white font-medium">{question.country_name}</span>?
        </p>
      </div>

      {/* Flag */}
      <div className="flex justify-center">
        <img
          src={question.flag_url}
          alt={question.country_name}
          className="w-60 h-36 object-cover rounded-xl shadow-2xl shadow-black/60 border border-white/10"
        />
      </div>

      {/* Options */}
      {question.options ? (
        <div className="grid grid-cols-2 gap-3">
          {question.options.map((opt) => {
            const state = getState(opt);
            return (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`px-4 py-3.5 rounded-xl border text-sm font-medium transition-all duration-150 flex items-center gap-2 ${stateClasses[state]}`}
                disabled={hasAnswered || phase === 'result'}
              >
                <span className="text-base">🏛️</span>
                <span>{opt}</span>
                {phase === 'result' && opt === correctAnswer && <span className="ml-auto text-green-400">✓</span>}
              </button>
            );
          })}
        </div>
      ) : null}

      {hasAnswered && phase === 'active' && (
        <p className="text-slate-500 text-sm animate-pulse">Answer submitted! Waiting for others...</p>
      )}
    </div>
  );
}
