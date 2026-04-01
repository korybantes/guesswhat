import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Results() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { finalLeaderboard, myPlayerId, room } = useGameStore();

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

  return (
    <div className="min-h-screen bg-[#0a0c14] text-white font-sans flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        {/* Winner announcement */}
        {winner && (
          <div className="text-center space-y-2">
            <div className="text-5xl">🏆</div>
            <h1 className="text-2xl font-bold text-white">
              {winner.player_id === myPlayerId ? 'You won!' : `${winner.username} wins!`}
            </h1>
            <p className="text-slate-400 text-sm">Game over — final standings</p>
          </div>
        )}

        {/* My result card */}
        {myResult && (
          <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-5 text-center">
            <div className="text-xs text-teal-400 uppercase tracking-widest mb-2">Your Score</div>
            <div className="text-4xl font-bold font-mono text-white">{myResult.total_score}</div>
            <div className="text-sm text-slate-400 mt-1">
              #{myRank} out of {leaderboard.length}
            </div>
          </div>
        )}

        {/* Full leaderboard */}
        <div className="space-y-2">
          <div className="text-xs text-slate-500 uppercase tracking-widest text-center mb-4">Leaderboard</div>
          {leaderboard.map((entry, i) => (
            <div
              key={entry.player_id}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${entry.player_id === myPlayerId ? 'border-teal-500/40 bg-teal-500/8' : 'border-white/8 bg-white/4'}`}
            >
              <div className="w-8 text-center">
                {i < 3 ? (
                  <span className="text-xl">{MEDALS[i]}</span>
                ) : (
                  <span className="text-slate-500 text-sm font-mono">#{i + 1}</span>
                )}
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {entry.username}
                  {entry.player_id === myPlayerId && (
                    <span className="text-teal-400 ml-2 text-xs">(you)</span>
                  )}
                </div>
              </div>
              <div className="text-lg font-mono font-bold text-white">{entry.total_score}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <Button
            className="w-full bg-teal-600 hover:bg-teal-500 text-white border-0 h-11"
            onClick={() => navigate(`/lobby/${roomId}`)}
          >
            Play Again
          </Button>
          <Button
            variant="ghost"
            className="w-full text-slate-400 hover:text-white"
            onClick={() => navigate('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
  );
}
