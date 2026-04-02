import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import FlagFrenzy from '@/components/games/FlagFrenzy';
import RarestFlag from '@/components/games/RarestFlag';
import SpellingBee from '@/components/games/SpellingBee';
import CapitalGuesser from '@/components/games/CapitalGuesser';
import ChatPanel from '@/components/ChatPanel';
import {
  Crown,
  Users,
  CheckCircle2,
  AlertCircle,
  Zap,
  Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [showRoundTransition, setShowRoundTransition] = useState(false);

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
      // Round transition flash
      setShowRoundTransition(true);
      setTimeout(() => setShowRoundTransition(false), 800);
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
      <div className="min-h-screen flex items-center justify-center game-grid-bg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="spinner" />
          <span className="text-xs font-bold text-cyan-400 tracking-[0.15em] uppercase">SYNCING GAME STATE...</span>
        </div>
      </div>
    );
  }

  const players = room ? Object.values(room.players) : [];
  const answeredCount = players.filter((p) => p.answered_this_round).length;
  const progressPct = timerSecs > 0 ? (timeLeft / timerSecs) * 100 : 0;
  const isDanger = timeLeft <= 5 && phase === 'active';

  // Get my score from roundScores
  const myRoundScore = roundScores.find((s) => s.player_id === myPlayerId);

  return (
    <div className="min-h-screen flex flex-col text-white game-grid-bg scanlines">
      {/* ═══ ROUND TRANSITION FLASH ═══ */}
      {showRoundTransition && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#06080f]/80 backdrop-blur-sm pointer-events-none">
          <div className="text-center" style={{ animation: 'slide-up 0.4s ease-out, fadeOut 0.4s ease-in 0.4s forwards' }}>
            <div className="text-[10px] font-bold text-cyan-400 tracking-[0.3em] uppercase mb-2">ROUND</div>
            <div
              className="text-8xl font-black text-white"
              style={{ fontFamily: 'var(--font-display)', textShadow: '0 0 40px rgba(0,240,255,0.3)' }}
            >
              {currentRound}
            </div>
          </div>
        </div>
      )}

      {/* ═══ GAME HEADER BAR ═══ */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#06080f]/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Left: Round info */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <Swords className="w-4 h-4 text-cyan-500" />
              <div>
                <div className="text-[9px] font-bold text-slate-600 tracking-[0.15em] uppercase leading-none">ROUND</div>
                <div className="text-lg font-bold leading-none" style={{ fontFamily: 'var(--font-display)' }}>
                  {currentRound}<span className="text-slate-600 text-sm">/{totalRounds}</span>
                </div>
              </div>
            </div>
            <div className="w-px h-8 bg-white/[0.06] hidden sm:block" />
            <div className="hidden sm:flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-500/60" />
              <span className="text-xs font-bold text-slate-400">
                {answeredCount}<span className="text-slate-700">/{players.length}</span> answered
              </span>
            </div>
          </div>

          {/* Center: Timer */}
          <div className="flex flex-col items-center">
            <div className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300 border",
              isDanger
                ? 'bg-red-500/10 border-red-500/30 timer-danger'
                : phase === 'active'
                  ? 'bg-white/[0.03] border-white/[0.06]'
                  : 'bg-white/[0.02] border-white/[0.04] opacity-40'
            )}>
              <span
                className={cn(
                  "text-2xl font-bold",
                  isDanger ? "text-red-400" : "text-white"
                )}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {phase === 'active' ? timeLeft : '—'}
              </span>
            </div>
          </div>

          {/* Right: Exit */}
          <div className="flex items-center gap-3">
            {/* Mini player avatars */}
            <div className="hidden md:flex -space-x-2">
              {players.slice(0, 4).map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "w-8 h-8 rounded-lg border-2 flex items-center justify-center text-xs font-bold",
                    p.answered_this_round
                      ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400"
                      : "bg-white/[0.03] border-white/[0.06] text-slate-500"
                  )}
                  title={p.username}
                >
                  {p.username[0]?.toUpperCase()}
                </div>
              ))}
              {players.length > 4 && (
                <div className="w-8 h-8 rounded-lg bg-white/[0.03] border-2 border-white/[0.06] flex items-center justify-center text-[10px] font-bold text-slate-500">
                  +{players.length - 4}
                </div>
              )}
            </div>
            <button onClick={() => navigate('/')} className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded-lg hover:bg-red-500/[0.06]">
              <AlertCircle className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Timer progress bar */}
        <div className="h-1 bg-white/[0.02] w-full">
          <div
            className={cn(
              "h-full transition-all duration-1000 ease-linear",
              isDanger
                ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
                : timeLeft <= 10
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-cyan-500 to-blue-500'
            )}
            style={{ width: `${phase === 'active' ? progressPct : 0}%` }}
          />
        </div>
      </header>

      {/* ═══ MAIN GAME AREA ═══ */}
      <main className="max-w-7xl mx-auto w-full px-4 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-6 py-6">
        {/* ═══ PRIMARY GAME ZONE ═══ */}
        <div className="lg:col-span-3 flex flex-col space-y-6">
          {/* Result banner */}
          {phase === 'result' && correctAnswer && (
            <div className={cn(
              "panel p-5 flex items-center gap-4 slide-up",
              myRoundScore && myRoundScore.correct
                ? "border-green-500/20 bg-green-500/[0.04]"
                : "border-amber-500/20 bg-amber-500/[0.04]"
            )}>
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center",
                myRoundScore && myRoundScore.correct
                  ? "bg-green-500/20 text-green-400"
                  : "bg-amber-500/20 text-amber-400"
              )}>
                {myRoundScore && myRoundScore.correct ? '✓' : '✗'}
              </div>
              <div className="flex-1">
                <div className="text-[9px] font-bold text-slate-500 tracking-[0.15em] uppercase">CORRECT ANSWER</div>
                <div className="text-xl font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>{correctAnswer}</div>
              </div>
              {myRoundScore && myRoundScore.score_this_round > 0 && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-400" style={{ fontFamily: 'var(--font-mono)' }}>
                    +{myRoundScore.score_this_round}
                  </div>
                  <div className="text-[9px] font-bold text-slate-500 tracking-wider">PTS</div>
                </div>
              )}
            </div>
          )}

          {/* Question display area */}
          <div className="flex-1 flex flex-col items-center justify-center panel p-6 sm:p-10 relative overflow-hidden min-h-[400px]">
            {/* Subtle corner accents */}
            <div className="absolute top-0 left-0 w-6 h-6 border-l-2 border-t-2 border-cyan-500/20 pointer-events-none" />
            <div className="absolute top-0 right-0 w-6 h-6 border-r-2 border-t-2 border-cyan-500/20 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-6 h-6 border-l-2 border-b-2 border-cyan-500/20 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-r-2 border-b-2 border-cyan-500/20 pointer-events-none" />

            <div className="w-full max-w-2xl relative z-10">
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
            </div>
          </div>

          {/* Round Scores Strip */}
          {phase === 'result' && roundScores.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <h4 className="text-[10px] font-bold tracking-[0.15em] text-slate-500 uppercase">ROUND SCORES</h4>
                <div className="flex-1 h-px bg-white/[0.06]" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 stagger-children">
                {roundScores.slice(0, 5).map((s, i) => (
                  <div
                    key={s.player_id}
                    className={cn(
                      "panel p-3 flex items-center justify-between slide-up",
                      s.player_id === myPlayerId && "border-cyan-500/20 bg-cyan-500/[0.03]"
                    )}
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="flex flex-col">
                      <span className={cn(
                        "text-lg font-bold leading-none",
                        s.score_this_round > 0 ? "text-green-400" : "text-slate-700"
                      )} style={{ fontFamily: 'var(--font-mono)' }}>
                        {s.score_this_round > 0 ? `+${s.score_this_round}` : '0'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-600 mt-1">T: {s.total_score}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] font-bold text-white truncate max-w-[60px]">{s.username}</div>
                      {i === 0 && <Crown className="w-3 h-3 text-amber-400 ml-auto" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══ SIDEBAR - Chat + Scoreboard ═══ */}
        <aside className="lg:col-span-1 flex flex-col space-y-4">
          <div className="h-[350px] flex flex-col">
            <ChatPanel />
          </div>

          <div className="panel p-4 flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-600" />
              <span className="text-[9px] font-bold tracking-[0.15em] text-slate-500 uppercase">STANDINGS</span>
            </div>
            <div className="space-y-1.5">
              {[...players].sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8).map((p, i) => (
                <div key={p.id} className="flex items-center justify-between py-1.5 group">
                  <div className="flex items-center gap-2.5">
                    <span className={cn(
                      "w-5 text-[10px] font-bold",
                      i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-slate-700"
                    )} style={{ fontFamily: 'var(--font-mono)' }}>
                      {i < 3 ? ['🥇', '🥈', '🥉'][i] : `#${i + 1}`}
                    </span>
                    <span className={cn(
                      "text-xs font-bold",
                      p.id === myPlayerId ? "text-cyan-400" : "text-white"
                    )}>
                      {p.username}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-slate-400" style={{ fontFamily: 'var(--font-mono)' }}>
                    {p.score || 0}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
