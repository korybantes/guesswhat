import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';
import {
  Crown,
  RotateCcw,
  Home,
  Trophy,
  Swords,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Results() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { finalLeaderboard, myPlayerId, room } = useGameStore();
  const confettiDone = useRef(false);

  const leaderboard = finalLeaderboard.length > 0
    ? finalLeaderboard
    : room ? Object.values(room.players).sort((a, b) => b.score - a.score).map((p) => ({
        player_id: p.id,
        username: p.username,
        score_this_round: 0,
        total_score: p.score,
        answer: null,
        correct: false,
      }))
    : [];

  const myResult = leaderboard.find((e) => e.player_id === myPlayerId);
  const myRank = leaderboard.findIndex((e) => e.player_id === myPlayerId) + 1;
  const winner = leaderboard[0];
  const isWinner = winner?.player_id === myPlayerId;

  // Fire confetti for winner
  useEffect(() => {
    if (isWinner && !confettiDone.current) {
      confettiDone.current = true;
      const duration = 3000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ['#00f0ff', '#7c3aed', '#fbbf24'],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ['#00f0ff', '#7c3aed', '#fbbf24'],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    }
  }, [isWinner]);

  return (
    <div className="min-h-screen text-white game-grid-bg scanlines flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute top-1/4 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/3 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-lg space-y-8 relative z-10">
        {/* ═══ GAME OVER HEADER ═══ */}
        <div className="text-center space-y-4 victory-entrance">
          <div className="text-[10px] font-bold text-slate-500 tracking-[0.3em] uppercase" style={{ fontFamily: 'var(--font-display)' }}>
            MATCH COMPLETE
          </div>

          {winner && (
            <>
              <div className="relative inline-block">
                <div className="text-6xl mb-2">🏆</div>
                {/* Glow behind trophy */}
                <div className="absolute inset-0 w-full h-full bg-amber-500/10 rounded-full blur-[40px] pointer-events-none" />
              </div>
              <h1
                className="text-3xl sm:text-4xl font-bold tracking-wider"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {isWinner ? (
                  <span className="text-cyber">VICTORY!</span>
                ) : (
                  <span className="text-white">{winner.username} <span className="text-cyan-400">WINS</span></span>
                )}
              </h1>
              <p className="text-sm text-slate-500">
                {isWinner ? 'Dominant performance. The leaderboard bows.' : 'Better luck next time. Study your flags.'}
              </p>
            </>
          )}
        </div>

        {/* ═══ YOUR STATS ═══ */}
        {myResult && (
          <div className="panel-glow p-6 corner-accents slide-up text-center" style={{ animationDelay: '0.3s' }}>
            <div className="text-[9px] font-bold text-cyan-400 tracking-[0.2em] uppercase mb-3">YOUR PERFORMANCE</div>
            <div className="flex items-center justify-center gap-8">
              <div>
                <div className="text-4xl font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                  {myResult.total_score}
                </div>
                <div className="text-[9px] font-bold text-slate-600 tracking-wider mt-1">TOTAL PTS</div>
              </div>
              <div className="w-px h-12 bg-white/[0.06]" />
              <div>
                <div className="text-4xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                  {myRank <= 3 ? (
                    <span className={cn(
                      myRank === 1 ? 'text-amber-400' : myRank === 2 ? 'text-slate-300' : 'text-orange-400'
                    )}>#{myRank}</span>
                  ) : (
                    <span className="text-slate-400">#{myRank}</span>
                  )}
                </div>
                <div className="text-[9px] font-bold text-slate-600 tracking-wider mt-1">RANK</div>
              </div>
            </div>
            {/* XP bar */}
            <div className="mt-4">
              <div className="flex justify-between mb-1">
                <span className="text-[9px] font-bold text-slate-600 tracking-wider">XP EARNED</span>
                <span className="text-[9px] font-bold text-cyan-400" style={{ fontFamily: 'var(--font-mono)' }}>+{myResult.total_score * 10} XP</span>
              </div>
              <div className="xp-bar">
                <div className="xp-bar-fill" style={{ width: `${Math.min((myResult.total_score / (leaderboard[0]?.total_score || 1)) * 100, 100)}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* ═══ FULL LEADERBOARD ═══ */}
        <div className="space-y-2 slide-up" style={{ animationDelay: '0.5s' }}>
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-4 h-4 text-slate-600" />
            <span className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase">FINAL STANDINGS</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <div className="stagger-children">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.player_id}
                className={cn(
                  "flex items-center gap-3 p-3.5 rounded-xl border transition-all mb-2 slide-up",
                  entry.player_id === myPlayerId
                    ? 'border-cyan-500/20 bg-cyan-500/[0.04]'
                    : 'border-white/[0.06] bg-white/[0.02]',
                  i === 0 && "border-amber-500/20 bg-amber-500/[0.03]"
                )}
              >
                <div className="w-8 text-center flex-shrink-0">
                  {i < 3 ? (
                    <span className="text-xl">{MEDALS[i]}</span>
                  ) : (
                    <span className="text-slate-600 text-sm font-bold" style={{ fontFamily: 'var(--font-mono)' }}>#{i + 1}</span>
                  )}
                </div>

                <div className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center border text-sm font-bold flex-shrink-0",
                  i === 0
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    : entry.player_id === myPlayerId
                      ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400"
                      : "bg-white/[0.03] border-white/[0.06] text-slate-400"
                )}>
                  {entry.username[0]?.toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-white truncate">
                    {entry.username}
                    {entry.player_id === myPlayerId && (
                      <span className="text-cyan-400 ml-1.5 text-[10px]">YOU</span>
                    )}
                  </div>
                  {i === 0 && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <Crown className="w-3 h-3 text-amber-400" />
                      <span className="text-[9px] font-bold text-amber-400 tracking-wider">CHAMPION</span>
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
                    {entry.total_score}
                  </div>
                  <div className="text-[9px] font-bold text-slate-600">PTS</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ═══ ACTIONS ═══ */}
        <div className="flex gap-3 slide-up" style={{ animationDelay: '0.7s' }}>
          <button
            className="flex-1 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold btn-cta flex items-center justify-center gap-2 text-sm"
            onClick={() => navigate(`/lobby/${roomId}`)}
          >
            <RotateCcw className="w-4 h-4" /> PLAY AGAIN
          </button>
          <button
            className="flex-1 h-12 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-white font-bold flex items-center justify-center gap-2 text-sm transition-all"
            onClick={() => navigate('/')}
          >
            <Home className="w-4 h-4" /> LOBBY
          </button>
        </div>
      </div>
    </div>
  );
}
