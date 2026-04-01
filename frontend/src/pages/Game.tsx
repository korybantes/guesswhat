import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import FlagFrenzy from '@/components/games/FlagFrenzy';
import RarestFlag from '@/components/games/RarestFlag';
import SpellingBee from '@/components/games/SpellingBee';
import CapitalGuesser from '@/components/games/CapitalGuesser';

export default function Game() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const {
    room,
    currentQuestion,
    currentRound,
    totalRounds,
    timerSecs,
    roundScores,
    hasAnswered,
    correctAnswer,
    myPlayerId,
  } = useGameStore();
  const { submitAnswer, vote } = useGameSocket(roomId ?? null);

  const [timeLeft, setTimeLeft] = useState(timerSecs);
  const [phase, setPhase] = useState<'active' | 'result'>('active');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Navigate to results on game over
  useEffect(() => {
    if (room?.phase === 'game_over') {
      navigate(`/results/${roomId}`);
    }
  }, [room?.phase, roomId, navigate]);

  // Round phase transitions
  useEffect(() => {
    if (room?.phase === 'round_end' || correctAnswer !== null) {
      setPhase('result');
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (room?.phase === 'round_active' && currentQuestion) {
      setPhase('active');
      setTimeLeft(timerSecs);
    }
  }, [room?.phase, correctAnswer, currentQuestion, timerSecs]);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'active') return;
    setTimeLeft(timerSecs);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) { clearInterval(timerRef.current!); return 0; }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [phase, timerSecs, currentRound]);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Loading round...</span>
        </div>
      </div>
    );
  }

  const players = room ? Object.values(room.players) : [];
  const answeredCount = players.filter((p) => p.answered_this_round).length;
  const progressPct = timerSecs > 0 ? (timeLeft / timerSecs) * 100 : 0;
  const progressColor = progressPct > 50 ? 'bg-teal-500' : progressPct > 20 ? 'bg-yellow-500' : 'bg-red-500';

  return (
    <div className="min-h-screen bg-[#0a0c14] text-white font-sans flex flex-col">
      {/* Top bar */}
      <div className="border-b border-white/5 px-6 py-3 flex items-center justify-between max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 font-mono">
            Round {currentRound}/{totalRounds}
          </span>
        </div>

        {/* Timer */}
        <div className={`text-2xl font-mono font-bold transition-colors ${timeLeft <= 5 && phase === 'active' ? 'text-red-400 animate-pulse' : 'text-white'}`}>
          {phase === 'active' ? timeLeft : '—'}
        </div>

        {/* Answered indicator */}
        <div className="text-xs text-slate-500">
          {answeredCount}/{players.length} answered
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-white/5 w-full">
        <div
          className={`h-full transition-all duration-1000 ${progressColor}`}
          style={{ width: `${phase === 'active' ? progressPct : 0}%` }}
        />
      </div>

      {/* Game content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 max-w-3xl mx-auto w-full">
        {/* Round result overlay */}
        {phase === 'result' && correctAnswer && (
          <div className="mb-8 text-center">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-2">Correct Answer</div>
            <div className="text-2xl font-bold text-teal-400">{correctAnswer}</div>
          </div>
        )}

        {/* Question component */}
        {currentQuestion.kind === 'guess_flag' && (
          <FlagFrenzy
            question={currentQuestion}
            onAnswer={submitAnswer}
            hasAnswered={hasAnswered}
            phase={phase}
            correctAnswer={correctAnswer}
          />
        )}
        {currentQuestion.kind === 'rarest_pick' && (
          <RarestFlag
            question={currentQuestion}
            onVote={vote}
            hasAnswered={hasAnswered}
            phase={phase}
            correctAnswer={correctAnswer}
          />
        )}
        {currentQuestion.kind === 'spell_it' && (
          <SpellingBee
            question={currentQuestion}
            onAnswer={submitAnswer}
            hasAnswered={hasAnswered}
            phase={phase}
            correctAnswer={correctAnswer}
          />
        )}
        {currentQuestion.kind === 'guess_capital' && (
          <CapitalGuesser
            question={currentQuestion}
            onAnswer={submitAnswer}
            hasAnswered={hasAnswered}
            phase={phase}
            correctAnswer={correctAnswer}
          />
        )}

        {/* Mini scoreboard */}
        {phase === 'result' && roundScores.length > 0 && (
          <div className="mt-8 w-full max-w-sm">
            <div className="text-xs text-slate-500 mb-3 text-center uppercase tracking-widest">Round Scores</div>
            <div className="space-y-2">
              {roundScores.slice(0, 5).map((s, i) => (
                <div
                  key={s.player_id}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-lg border ${s.player_id === myPlayerId ? 'border-teal-500/40 bg-teal-500/8' : 'border-white/8 bg-white/4'}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 w-4">{i + 1}</span>
                    <span className="text-sm text-white">{s.username}</span>
                    {s.correct && <span className="text-green-400 text-xs">✓</span>}
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-mono font-semibold ${s.score_this_round > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
                      {s.score_this_round > 0 ? `+${s.score_this_round}` : '—'}
                    </span>
                    <span className="text-xs text-slate-500 ml-2">{s.total_score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
