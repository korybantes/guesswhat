import { useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface Props {
  question: {
    kind: 'spell_it';
    country_code: string;
    flag_url: string;
    country_name: string;
  };
  onAnswer: (answer: string) => void;
  hasAnswered: boolean;
  phase: 'active' | 'result';
  correctAnswer: string | null;
}

export default function SpellingBee({ question, onAnswer, hasAnswered, phase, correctAnswer }: Props) {
  const { setHasAnswered } = useGameStore();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = () => {
    if (hasAnswered || phase === 'result' || !value.trim()) return;
    setHasAnswered();
    onAnswer(value.trim());
  };

  const isCorrect = correctAnswer !== null &&
    value.trim().toLowerCase() === correctAnswer.toLowerCase();

  return (
    <div className="w-full max-w-xl mx-auto space-y-6 text-center">
      <div>
        <div className="text-[10px] font-bold text-slate-600 tracking-[0.2em] uppercase mb-2">SPELLING BEE</div>
        <p className="text-slate-500 text-sm">Type the exact name of this country</p>
      </div>

      {/* Flag */}
      <div className="flex justify-center">
        <div className="flag-display w-64 h-40">
          <img
            src={question.flag_url}
            alt="Country flag"
            className="w-full h-full"
          />
        </div>
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSubmit()}
          placeholder="Type country name..."
          disabled={hasAnswered || phase === 'result'}
          className={cn(
            "flex-1 h-12 rounded-xl text-center text-lg font-bold bg-white/[0.03] border placeholder:text-slate-700 transition-all",
            phase === 'result'
              ? isCorrect
                ? 'border-green-500/40 text-green-400'
                : 'border-red-500/30 text-red-400'
              : hasAnswered
                ? 'border-cyan-500/30 text-cyan-400'
                : 'border-white/[0.08] text-white focus:border-cyan-500/40'
          )}
          style={{ fontFamily: 'var(--font-mono)' }}
          autoFocus
        />
        <button
          onClick={handleSubmit}
          disabled={hasAnswered || phase === 'result' || !value.trim()}
          className="px-6 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold btn-cta disabled:opacity-30 disabled:cursor-not-allowed"
        >
          SUBMIT
        </button>
      </div>

      {/* Result feedback */}
      {phase === 'result' && correctAnswer && (
        <div className={cn(
          "panel p-4 text-center",
          isCorrect ? "border-green-500/20 bg-green-500/[0.04]" : "border-red-500/20 bg-red-500/[0.04]"
        )}>
          {isCorrect ? (
            <div className="flex items-center justify-center gap-2">
              <span className="text-green-400 text-lg">✓</span>
              <span className="text-green-400 font-bold">Perfect spelling!</span>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm text-slate-400">
                Your answer: <span className="text-red-400 font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{value || '—'}</span>
              </div>
              <div className="text-sm text-slate-400">
                Correct: <span className="text-green-400 font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{correctAnswer}</span>
              </div>
            </div>
          )}
        </div>
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
