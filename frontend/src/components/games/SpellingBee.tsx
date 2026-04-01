import { useState, useRef } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

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

  const inputBorder = phase === 'result'
    ? isCorrect ? 'border-green-400/60' : 'border-red-400/40'
    : hasAnswered ? 'border-teal-500/50' : 'border-white/10';

  return (
    <div className="w-full max-w-lg space-y-8 text-center">
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Spelling Bee</p>
        <p className="text-slate-400 text-sm">Type the name of this country</p>
      </div>

      {/* Flag */}
      <div className="flex justify-center">
        <img
          src={question.flag_url}
          alt="Country flag"
          className="w-64 h-40 object-cover rounded-xl shadow-2xl shadow-black/60 border border-white/10"
        />
      </div>

      {/* Input */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValue(e.target.value)}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSubmit()}
          placeholder="Type country name..."
          disabled={hasAnswered || phase === 'result'}
          className={`flex-1 bg-white/5 text-white placeholder:text-slate-600 ${inputBorder} focus:ring-teal-500/30 text-center text-lg font-medium h-12`}
          autoFocus
        />
        <Button
          onClick={handleSubmit}
          disabled={hasAnswered || phase === 'result' || !value.trim()}
          className="bg-teal-600 hover:bg-teal-500 text-white border-0 px-6 h-12"
        >
          Submit
        </Button>
      </div>

      {/* Result feedback */}
      {phase === 'result' && correctAnswer && (
        <div className="text-center space-y-1">
          {isCorrect ? (
            <p className="text-green-400 font-medium">✓ Perfect spelling!</p>
          ) : (
            <div>
              <p className="text-red-400 text-sm">Your answer: <span className="font-mono">{value || '—'}</span></p>
              <p className="text-green-400 text-sm">Correct: <span className="font-mono font-bold">{correctAnswer}</span></p>
            </div>
          )}
        </div>
      )}

      {hasAnswered && phase === 'active' && (
        <p className="text-slate-500 text-sm animate-pulse">Answer submitted! Waiting for others...</p>
      )}
    </div>
  );
}
