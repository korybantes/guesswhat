import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import { getRoom } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import ChatPanel from '@/components/ChatPanel';
import {
  Crown,
  Copy,
  ArrowLeft,
  Clock,
  Zap,
  Users,
  Shield,
  Crosshair,
  Signal,
  ChevronRight,
  Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GAME_MODE_NAMES: Record<string, { name: string; icon: string }> = {
  flag_frenzy: { name: 'FLAG FRENZY', icon: '⚡' },
  rarest_flag: { name: 'RAREST FLAG', icon: '💎' },
  spelling_bee: { name: 'SPELLING BEE', icon: '📝' },
  capital_guesser: { name: 'CAPITAL CITY', icon: '🏛️' },
};

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const { room, username, setRoom, setMyPlayerId, connectionStatus, countdown } = useGameStore();
  const { startGame } = useGameSocket(roomId ?? null);

  const [copyFeedback, setCopyFeedback] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) { navigate('/'); return; }
  }, [username, navigate]);

  useEffect(() => {
    if (!roomId) return;
    getRoom(roomId)
      .then((r) => setRoom(r))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [roomId, setRoom, navigate]);

  useEffect(() => {
    if (!room || !username) return;
    const me = Object.values(room.players).find((p) => p.username === username);
    if (me) setMyPlayerId(me.id);
  }, [room, username, setMyPlayerId]);

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
      <div className="min-h-screen flex items-center justify-center game-grid-bg">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="spinner" />
          <span className="text-xs font-bold text-cyan-400 tracking-[0.15em] uppercase">LOADING ROOM...</span>
        </div>
      </div>
    );
  }

  const players = Object.values(room.players);
  const me = players.find((p) => p.username === username);
  const isHost = me?.is_host ?? false;
  const modeInfo = GAME_MODE_NAMES[room.settings.game_mode] || { name: room.settings.game_mode, icon: '🎮' };

  return (
    <div className="min-h-screen text-white game-grid-bg scanlines pb-6">
      {/* ═══ COUNTDOWN OVERLAY ═══ */}
      {countdown !== null && (
        <div className="fixed inset-0 bg-[#06080f]/95 flex items-center justify-center z-[100] backdrop-blur-md">
          <div className="text-center space-y-6">
            <div className="relative">
              <div
                className="text-[120px] font-black text-cyan-400 countdown-pulse leading-none"
                style={{ fontFamily: 'var(--font-title)', textShadow: '0 0 40px rgba(0,240,255,0.4), 0 0 80px rgba(0,240,255,0.2)' }}
              >
                {countdown}
              </div>
              {/* Rings around number */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 rounded-full border-2 border-cyan-500/20 animate-ping" />
              </div>
            </div>
            <div className="text-xl font-bold tracking-[0.3em] text-slate-400 uppercase" style={{ fontFamily: 'var(--font-display)' }}>
              GET READY
            </div>
            <div className="flex items-center justify-center gap-2">
              <Swords className="w-5 h-5 text-cyan-500" />
              <span className="text-sm font-bold text-cyan-400">{modeInfo.icon} {modeInfo.name}</span>
            </div>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#06080f]/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-slate-500 hover:text-white transition-all group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-bold tracking-wider uppercase">LEAVE</span>
          </button>

          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
              connectionStatus === 'connected'
                ? 'bg-green-500/[0.06] border-green-500/20'
                : 'bg-red-500/[0.06] border-red-500/20'
            )}>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full",
                connectionStatus === 'connected'
                  ? 'bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]'
                  : 'bg-red-500'
              )} />
              <span className="text-[9px] font-bold tracking-[0.15em] text-slate-500 uppercase">{connectionStatus}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 md:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* ═══ LEFT COLUMN - Room Info & Players ═══ */}
          <div className="lg:col-span-2 space-y-6">
            {/* Mode & Room title */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-3xl sm:text-4xl font-bold tracking-wider leading-none" style={{ fontFamily: 'var(--font-title)' }}>
                  {modeInfo.icon} {modeInfo.name}
                </h1>
                <Badge className="bg-cyan-500/[0.08] text-cyan-400 border-cyan-500/20 font-bold h-6 text-[10px] tracking-wider">LOBBY</Badge>
              </div>
              <div className="flex items-center gap-5 text-[10px] font-bold text-slate-500 tracking-wider">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-slate-600" /> {room.settings.rounds} ROUNDS</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-slate-600" /> {room.settings.timer_secs}S TIMER</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-600" /> {players.length}/{room.settings.max_players}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Room Code Card */}
              <div className="panel-glow p-6 corner-accents">
                <label className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-3 block">ROOM CODE</label>
                <div className="text-4xl sm:text-5xl font-bold tracking-[0.25em] text-white mb-4" style={{ fontFamily: 'var(--font-mono)' }}>
                  {roomId}
                </div>
                <Button
                  onClick={copyCode}
                  className="w-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.06] text-xs font-bold tracking-wider h-10 rounded-lg flex items-center justify-center gap-2 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copyFeedback ? '✓ COPIED!' : 'COPY & SHARE'}
                </Button>
              </div>

              {/* Actions Card */}
              <div className="panel p-6 space-y-4">
                <label className="text-[9px] font-bold text-slate-500 tracking-[0.2em] uppercase mb-2 block">MATCH SETTINGS</label>

                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <Shield className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Access</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 uppercase">{room.settings.visibility}</span>
                </div>

                <div className="flex items-center justify-between py-2 border-b border-white/[0.04]">
                  <div className="flex items-center gap-2.5">
                    <Crosshair className="w-4 h-4 text-slate-500" />
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mode</span>
                  </div>
                  <span className="text-xs font-bold text-cyan-400 uppercase">Real-time PvP</span>
                </div>

                {isHost ? (
                  <button
                    className={cn(
                      "w-full font-bold uppercase tracking-wider text-base h-12 rounded-lg btn-cta flex items-center justify-center gap-2 transition-all",
                      players.length < 2
                        ? 'bg-white/[0.04] border border-white/[0.06] text-slate-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-[0_0_25px_rgba(0,240,255,0.2)]'
                    )}
                    disabled={players.length < 2 && connectionStatus !== 'connected'}
                    onClick={startGame}
                    style={{ fontFamily: 'var(--font-title)' }}
                  >
                    {players.length < 2 ? (
                      <>
                        <Users className="w-4 h-4" /> WAITING FOR PLAYERS...
                      </>
                    ) : (
                      <>
                        <Swords className="w-4 h-4" /> START GAME <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center justify-center gap-2 py-3 rounded-lg bg-white/[0.02] border border-dashed border-white/[0.06]">
                    <Signal className="w-4 h-4 text-cyan-500 animate-pulse" />
                    <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">Waiting for host to start...</span>
                  </div>
                )}
              </div>
            </div>

            {/* ═══ PLAYER SLOTS ═══ */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold tracking-wider uppercase" style={{ fontFamily: 'var(--font-display)' }}>PLAYERS</h3>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <span className="text-[10px] font-bold text-slate-600">{players.length}/{room.settings.max_players}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
                {players.map((player, idx) => (
                  <div
                    key={player.id}
                    className={cn(
                      "panel p-4 flex items-center gap-3 transition-all slide-up",
                      player.username === username && "border-cyan-500/20 bg-cyan-500/[0.03] shadow-[0_0_15px_rgba(0,240,255,0.05)]"
                    )}
                    style={{ animationDelay: `${idx * 0.1}s` }}
                  >
                    <div className="relative">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center border border-white/[0.06]",
                        player.username === username
                          ? "bg-gradient-to-br from-cyan-500/20 to-purple-500/20"
                          : "bg-white/[0.03]"
                      )}>
                        <span className="text-base font-bold text-white" style={{ fontFamily: 'var(--font-display)' }}>
                          {player.username[0]?.toUpperCase()}
                        </span>
                      </div>
                      {player.is_host && (
                        <Crown className="absolute -top-1.5 -right-1.5 w-4 h-4 text-amber-400 drop-shadow-lg" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{player.username}</span>
                        {player.username === username && <span className="text-[9px] font-bold text-cyan-400">YOU</span>}
                      </div>
                      <div className="flex gap-1.5 mt-1">
                        {player.is_host && <Badge className="bg-amber-500/10 text-amber-400 border-0 text-[8px] h-4 font-bold">HOST</Badge>}
                        {player.is_guest && <Badge className="bg-slate-500/10 text-slate-400 border-0 text-[8px] h-4 font-bold">GUEST</Badge>}
                      </div>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                  </div>
                ))}

                {/* Empty slots */}
                {Array.from({ length: room.settings.max_players - players.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="panel p-4 flex items-center gap-3 opacity-20 border-dashed">
                    <div className="w-12 h-12 rounded-lg border border-dashed border-white/10 flex items-center justify-center">
                      <Users className="w-4 h-4 text-slate-700" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700">OPEN</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ RIGHT COLUMN - CHAT ═══ */}
          <div className="lg:col-span-1 h-[600px] lg:h-[calc(100vh-8rem)]">
            <ChatPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
