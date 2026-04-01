import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import { getRoom } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

const GAME_MODE_NAMES: Record<string, string> = {
  flag_frenzy: 'Flag Frenzy 🏳️',
  rarest_flag: 'Rarest Flag 💎',
  spelling_bee: 'Spelling Bee 🔤',
  capital_guesser: 'Capital City 🌍',
};

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, username, setRoom, setMyPlayerId, connectionStatus, countdown } = useGameStore();
  const { startGame } = useGameSocket(roomId ?? null);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [loading, setLoading] = useState(true);

  // Set my player id from username match
  useEffect(() => {
    if (!username) { navigate('/'); return; }
  }, [username, navigate]);

  // Load initial room state via REST
  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId)
      .then((r) => setRoom(r))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [roomId, setRoom, navigate]);

  // Update my player id whenever room changes
  useEffect(() => {
    if (!room || !username) return;
    const me = Object.values(room.players).find((p) => p.username === username);
    if (me) setMyPlayerId(me.id);
  }, [room, username, setMyPlayerId]);

  // Navigate into game when round starts
  useEffect(() => {
    if (room?.phase === 'round_active') {
      navigate(`/game/${roomId}`);
    }
  }, [room?.phase, roomId, navigate]);

  const copyCode = () => {
    navigator.clipboard.writeText(roomId ?? '');
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 1500);
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen bg-[#0a0c14] flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span>Connecting to room...</span>
        </div>
      </div>
    );
  }

  const players = Object.values(room.players);
  const me = players.find((p) => p.username === username);
  const isHost = me?.is_host ?? false;
  const modeName = GAME_MODE_NAMES[room.settings.game_mode] || room.settings.game_mode;

  return (
    <div className="min-h-screen bg-[#0a0c14] text-white font-sans">
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white text-sm flex items-center gap-1 transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-teal-400' : 'bg-yellow-400'}`} />
          <span className="text-xs text-slate-500">{connectionStatus}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-8xl font-bold text-teal-400 animate-pulse">{countdown}</div>
              <div className="text-slate-400 mt-4 text-lg">Get ready!</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Room info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold">{modeName}</h1>
                <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30">Lobby</Badge>
              </div>
              <div className="flex items-center gap-4 text-sm text-slate-400">
                <span>{room.settings.rounds} rounds</span>
                <span>·</span>
                <span>{room.settings.timer_secs}s timer</span>
                <span>·</span>
                <span>{players.length}/{room.settings.max_players} players</span>
              </div>
            </div>

            {/* Room code */}
            <div className="bg-white/4 border border-white/8 rounded-xl p-5">
              <div className="text-xs text-slate-400 mb-2">Room Code</div>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-mono font-bold tracking-[0.5em] text-white">{roomId}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCode}
                  className="text-slate-400 hover:text-white"
                >
                  {copyFeedback ? '✓ Copied' : 'Copy'}
                </Button>
              </div>
              <div className="text-xs text-slate-500 mt-2">Share this code with friends to join</div>
            </div>

            {/* Settings (host only) */}
            {isHost && (
              <div className="bg-white/4 border border-white/8 rounded-xl p-5">
                <div className="text-sm font-medium text-white mb-4">Room Settings</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Rounds</div>
                    <div className="text-white font-medium">{room.settings.rounds}</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Timer</div>
                    <div className="text-white font-medium">{room.settings.timer_secs}s</div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-1">Max Players</div>
                    <div className="text-white font-medium">{room.settings.max_players}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Start button */}
            {isHost ? (
              <Button
                className="w-full bg-teal-600 hover:bg-teal-500 text-white border-0 h-12 text-base font-semibold disabled:opacity-40"
                disabled={players.length < 2}
                onClick={startGame}
              >
                {players.length < 2 ? 'Waiting for more players...' : 'Start Game'}
              </Button>
            ) : (
              <div className="text-center text-slate-400 text-sm py-4">
                Waiting for host to start the game...
              </div>
            )}
          </div>

          {/* Players panel */}
          <div className="bg-white/4 border border-white/8 rounded-xl p-5 h-fit">
            <div className="text-sm font-medium text-white mb-4">
              Players ({players.length}/{room.settings.max_players})
            </div>
            <div className="space-y-2">
              {players.map((player) => (
                <div key={player.id} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-xs font-bold">
                      {player.username[0]?.toUpperCase()}
                    </div>
                    <div className="text-sm text-white">
                      {player.username}
                      {player.username === username && (
                        <span className="text-teal-400 ml-1 text-xs">(you)</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {player.is_host && (
                      <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30 text-xs">Host</Badge>
                    )}
                    {player.is_guest && (
                      <Badge className="bg-slate-700/50 text-slate-400 border-slate-600/30 text-xs">Guest</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {players.length < room.settings.max_players && (
              <>
                <Separator className="bg-white/5 my-3" />
                {Array.from({ length: room.settings.max_players - players.length }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 py-2">
                    <div className="w-7 h-7 rounded-full border border-dashed border-white/15 flex items-center justify-center text-slate-600 text-sm">
                      +
                    </div>
                    <span className="text-xs text-slate-600">Waiting for player...</span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
