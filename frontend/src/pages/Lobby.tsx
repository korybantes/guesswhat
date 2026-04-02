import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import { getRoom } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ChatPanel from '@/components/ChatPanel';
import { 
  Trophy, 
  Copy, 
  ChevronLeft, 
  Target, 
  Clock, 
  Zap, 
  Users,
  Hash,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin shadow-lg shadow-teal-500/20" />
          <span className="text-xs font-black uppercase tracking-widest text-teal-400">Deploying Room...</span>
        </div>
      </div>
    );
  }

  const players = Object.values(room.players);
  const me = players.find((p) => p.username === username);
  const isHost = me?.is_host ?? false;
  const modeName = GAME_MODE_NAMES[room.settings.game_mode] || room.settings.game_mode;

  return (
    <div className="min-h-screen text-white pb-12">
      {/* HEADER SECTION */}
      <header className="glass sticky top-0 z-50 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => navigate('/')} 
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-all group scale-x-[-1]"
          >
            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-xs font-black uppercase tracking-widest scale-x-[-1]">ABORT MISSION</span>
          </button>

          <div className="flex items-center gap-3">
             <div className={cn(
               "w-2 h-2 rounded-full",
               connectionStatus === 'connected' ? 'bg-teal-500 shadow-teal-500/50 shadow-sm' : 'bg-red-500'
             )} />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{connectionStatus} HUB</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12 md:pt-16">
        {/* Countdown overlay */}
        {countdown !== null && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="text-center">
              <div className="text-[12rem] font-black italic tracking-tighter text-teal-400 animate-game-bounce drop-shadow-2xl">{countdown}</div>
              <div className="text-slate-300 mt-4 text-2xl font-black uppercase tracking-widest italic">MISSION BREACHING...</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-full">
          {/* ROOM INFO & SETTINGS */}
          <div className="lg:col-span-3 space-y-8">
            <div className="space-y-2">
              <div className="flex items-center gap-4">
                 <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-none">{modeName}</h1>
                 <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/20 font-black h-6">LOBBY ACQUIRED</Badge>
              </div>
              <div className="flex items-center gap-6 text-[11px] font-black uppercase tracking-widest text-slate-500">
                <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {room.settings.rounds} ROUNDS</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> {room.settings.timer_secs}S TIMER</span>
                <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {players.length}/{room.settings.max_players} CAPACITY</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* CODE CARD */}
              <div className="glass p-8 rounded-[2.5rem] relative overflow-hidden group border border-white/5">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <Hash className="w-16 h-16 text-white" />
                </div>
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-4 block">IDENTIFICATION CODE</label>
                <div className="flex flex-col gap-6">
                  <span className="text-6xl font-black tracking-[0.2em] text-white italic">{roomId}</span>
                  <Button
                    onClick={copyCode}
                    className="w-full bg-white/5 border border-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest h-12 rounded-xl flex items-center justify-center gap-2 group-hover:scale-[1.02] transition-transform"
                  >
                    <Copy className="w-4 h-4" />
                    {copyFeedback ? 'CODE SECURED' : 'SHARE CODE'}
                  </Button>
                </div>
              </div>

              {/* MISSION SETTINGS */}
              <div className="glass p-8 rounded-[2.5rem] border border-white/5">
                <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-6 block">MISSION PARAMETERS</label>
                <div className="space-y-6">
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                           <Shield className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest leading-none">Security Level</span>
                     </div>
                     <span className="text-xs font-bold text-teal-400 uppercase tracking-tighter">{room.settings.visibility} HUB</span>
                   </div>
                   
                   <div className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                           <Target className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest leading-none">Engagement Mode</span>
                     </div>
                     <span className="text-xs font-bold text-teal-400 uppercase tracking-tighter">Real-time PvP</span>
                   </div>

                   {/* Start button */}
                   {isHost ? (
                    <Button
                      className="w-full bg-teal-500 hover:bg-teal-400 text-black font-black italic uppercase tracking-tighter text-xl h-14 rounded-2xl shadow-xl shadow-teal-500/10 btn-game mt-2"
                      disabled={players.length < 2 && connectionStatus !== 'connected'}
                      onClick={startGame}
                    >
                      {players.length < 2 ? 'Awaiting Crew...' : 'DEPLOY MISSION ➔'}
                    </Button>
                  ) : (
                    <div className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 text-slate-500 border border-dashed border-white/10 mt-2">
                       <Zap className="w-4 h-4 animate-pulse" />
                       <span className="text-[10px] font-black tracking-widest uppercase italic">Awaiting Host Authorization...</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PLAYER LIST GRID */}
            <div className="space-y-6">
               <div className="flex items-center gap-4">
                 <h3 className="text-xl font-black italic tracking-tighter uppercase">Deployed Crew</h3>
                 <Separator className="flex-1 bg-white/5" />
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <div 
                      key={player.id} 
                      className={cn(
                        "p-5 rounded-[2rem] glass border border-white/5 flex items-center gap-4 group hover:border-teal-500/20 transition-all",
                        player.username === username && "ring-1 ring-teal-500/30 bg-teal-500/5 shadow-lg shadow-teal-500/5"
                      )}
                    >
                      <div className="relative">
                         <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500/20 to-cyan-500/20 border border-white/5 flex items-center justify-center">
                            <span className="text-lg font-black text-white italic">{player.username[0]?.toUpperCase()}</span>
                         </div>
                         {player.is_host && <Trophy className="absolute -top-1.5 -right-1.5 w-5 h-5 text-yellow-500 drop-shadow-lg" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black uppercase tracking-tight">{player.username}</span>
                          {player.username === username && <span className="text-[10px] font-black text-teal-400 leading-none">YOU</span>}
                        </div>
                        <div className="flex gap-1.5 mt-2">
                          {player.is_host && <Badge className="bg-yellow-500/10 text-yellow-500 border-0 text-[8px] h-4 font-black">LEADER</Badge>}
                          {player.is_guest && <Badge className="bg-slate-500/10 text-slate-400 border-0 text-[8px] h-4 font-black">MERCENARY</Badge>}
                        </div>
                      </div>
                    </div>
                  ))}

                  {Array.from({ length: room.settings.max_players - players.length }).map((_, i) => (
                    <div key={i} className="p-5 rounded-[2rem] border border-dashed border-white/5 flex items-center gap-4 opacity-30">
                       <div className="w-14 h-14 rounded-2xl border border-dashed border-white/20 flex items-center justify-center">
                          <Users className="w-5 h-5 text-slate-600" />
                       </div>
                       <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Open Slot</span>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR - CHAT */}
          <div className="lg:col-span-1 h-[600px] lg:h-auto">
            <ChatPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
