import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { guestLogin, login, register, createRoom, listRooms } from '@/lib/api';
import type { RoomSummary } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Gamepad2, 
  User as UserIcon, 
  Plus, 
  Hash, 
  Globe, 
  Lock, 
  RefreshCw, 
  Sparkles,
  ChevronRight,
  LogOut,
  Target,
  Zap,
  BookOpen,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';

const GAME_MODES = [
  {
    id: 'flag_frenzy',
    name: 'Flag Frenzy',
    icon: <Zap className="w-6 h-6 text-cyan-400" />,
    desc: 'Rapid-fire guessing. The faster you pick, the more you win!',
    color: 'from-cyan-500/20 to-blue-600/20',
    border: 'border-cyan-500/30',
    tag: 'Popular',
    tagColor: 'bg-cyan-500/20 text-cyan-300',
  },
  {
    id: 'rarest_flag',
    name: 'Rarest Flag',
    icon: <Sparkles className="w-6 h-6 text-purple-400" />,
    desc: 'Battle of rarity. Can you spot the most obscure flag?',
    color: 'from-purple-500/20 to-pink-600/20',
    border: 'border-purple-500/30',
    tag: 'Strategy',
    tagColor: 'bg-purple-500/20 text-purple-300',
  },
  {
    id: 'spelling_bee',
    name: 'Spelling Bee',
    icon: <BookOpen className="w-6 h-6 text-yellow-400" />,
    desc: 'Master the keyboard. Type the names with zero errors.',
    color: 'from-yellow-500/20 to-orange-600/20',
    border: 'border-yellow-500/30',
    tag: 'Expert',
    tagColor: 'bg-yellow-500/20 text-yellow-300',
  },
  {
    id: 'capital_guesser',
    name: 'Capital City',
    icon: <MapPin className="w-6 h-6 text-green-400" />,
    desc: 'A global tour. Connect nations to their legendary cities.',
    color: 'from-green-500/20 to-teal-600/20',
    border: 'border-green-500/30',
    tag: 'Classic',
    tagColor: 'bg-green-500/20 text-green-300',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const { username, token, setAuth, clearRoom } = useGameStore();

  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const [selectedMode, setSelectedMode] = useState('flag_frenzy');
  const [rounds, setRounds] = useState(10);
  const [timerSecs, setTimerSecs] = useState(20);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [creating, setCreating] = useState(false);

  const [joinCode, setJoinCode] = useState('');
  const [publicRooms, setPublicRooms] = useState<RoomSummary[]>([]);
  const [authOpen, setAuthOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    clearRoom();
    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchRooms = async () => {
    try {
      const rooms = await listRooms();
      setPublicRooms(rooms);
    } catch { /* ignore */ }
  };

  const handleGuestLogin = async () => {
    setAuthLoading(true);
    try {
      const res = await guestLogin();
      setAuth(res.token, res.username, true);
      setAuthOpen(false);
    } catch { setAuthError('Failed to connect. Try again.'); }
    finally { setAuthLoading(false); }
  };

  const handleAuth = async () => {
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = authMode === 'login'
        ? await login(authUsername, authPassword)
        : await register(authUsername, authPassword);
      setAuth(res.token, res.username, false);
      setAuthOpen(false);
    } catch (e: any) {
      const msg = e?.response?.data?.error;
      setAuthError(msg || 'Authentication failed');
    }
    finally { setAuthLoading(false); }
  };

  const handleCreateRoom = async () => {
    if (!token) { setAuthOpen(true); return; }
    setCreating(true);
    try {
      const { room_id } = await createRoom({
        game_mode: selectedMode,
        rounds,
        timer_secs: timerSecs,
        max_players: maxPlayers,
        visibility,
      });
      setCreateOpen(false);
      navigate(`/lobby/${room_id}`);
    } catch { /* TODO: show error */ }
    finally { setCreating(false); }
  };

  const handleJoinRoom = (code: string) => {
    if (!token) { setAuthOpen(true); return; }
    const roomId = code.trim().toUpperCase();
    if (roomId.length >= 4) navigate(`/lobby/${roomId}`);
  };

  const handleJoinPublic = (id: string) => {
    if (!token) { setAuthOpen(true); return; }
    navigate(`/lobby/${id}`);
  };

  return (
    <div className="min-h-screen text-white">
      {/* GLOSSY HEADER */}
      <header className="sticky top-0 z-40 glass border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:scale-110 transition-transform">
              <Gamepad2 className="w-6 h-6 text-black" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">GUESSWHAT</h1>
              <Badge className="bg-teal-500/20 text-teal-300 border-0 text-[10px] h-4 mt-1">ONLINE HUB</Badge>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {username ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-sm font-bold text-white leading-none">{username}</span>
                  <span className="text-[10px] text-teal-400/80 font-medium">PLAYER V1.0</span>
                </div>
                <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                  <UserIcon className="w-5 h-5 text-slate-400" />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9 text-slate-500 hover:text-red-400 transition-colors"
                  onClick={() => { useGameStore.getState().clearAuth(); }}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Dialog open={authOpen} onOpenChange={setAuthOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-black hover:bg-slate-200 font-bold px-6 h-10 rounded-xl btn-game">
                    Join The Hub
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0f111a] border-white/10 text-white max-w-sm rounded-3xl overflow-hidden glass p-0">
                  <div className="bg-gradient-to-br from-teal-500/20 to-transparent p-8">
                    <DialogHeader className="mb-6">
                      <DialogTitle className="text-2xl font-black italic tracking-tighter">GET STARTED</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <Button
                        className="w-full bg-teal-500 hover:bg-teal-400 text-black font-black h-12 rounded-xl shadow-lg shadow-teal-500/10 btn-game"
                        onClick={handleGuestLogin}
                        disabled={authLoading}
                      >
                        PLAY AS GUEST 🎲
                      </Button>
                      <div className="relative py-2">
                        <Separator className="bg-white/5" />
                        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0f111a] px-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase">Member Login</span>
                      </div>
                      <div className="flex bg-white/5 p-1 rounded-xl gap-1">
                        {(['login', 'register'] as const).map((m) => (
                          <button
                            key={m}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                              authMode === m ? 'bg-white/10 text-white shadow-inner' : 'text-slate-500 hover:text-white'
                            )}
                            onClick={() => setAuthMode(m)}
                          >
                            {m.toUpperCase()}
                          </button>
                        ))}
                      </div>
                      <div className="space-y-3">
                        <Input
                          placeholder="Player ID"
                          value={authUsername}
                          onChange={(e) => setAuthUsername(e.target.value)}
                          className="bg-white/5 border-white/5 h-12 rounded-xl text-white placeholder:text-slate-600 focus:border-teal-500/50 transition-colors"
                        />
                        <Input
                          type="password"
                          placeholder="Secret Token"
                          value={authPassword}
                          onChange={(e) => setAuthPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                          className="bg-white/5 border-white/5 h-12 rounded-xl text-white placeholder:text-slate-600 focus:border-teal-500/50 transition-colors"
                        />
                      </div>
                      {authError && <p className="text-red-400 text-[10px] font-bold uppercase tracking-wider text-center">{authError}</p>}
                      <Button
                        className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold h-12 rounded-xl"
                        onClick={handleAuth}
                        disabled={authLoading}
                      >
                        {authLoading ? '...' : authMode === 'login' ? 'ENTER HUB ➔' : 'JOIN THE CREW ➔'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 md:py-24 space-y-24">
        {/* HERO SECTION */}
        <section className="relative text-center max-w-4xl mx-auto space-y-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-teal-500/10 blur-[120px] -z-10 rounded-full" />
          
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass border-teal-500/20 text-[11px] font-black tracking-[0.2em] text-teal-400 animate-game-bounce uppercase">
            🚀 The ultimate trivia experience
          </div>

          <h2 className="text-6xl md:text-8xl font-black tracking-tighter leading-[0.9] italic uppercase">
            GUESS THE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-400 to-blue-500">
              PLANET'S FLAGS
            </span>
          </h2>

          <p className="text-slate-400 text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Battle against players worldwide in high-stakes trivia. 250+ flags, 
            instant feedback, and zero mercy.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
            <div className="relative group w-full sm:w-auto">
              <Input
                placeholder="ROOM CODE"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom(joinCode)}
                className="bg-white/5 border-white/10 h-14 w-full sm:w-64 rounded-2xl text-center font-black tracking-[0.4em] text-xl placeholder:text-slate-700 focus:border-teal-500/50 transition-all shadow-2xl"
                maxLength={6}
              />
              <Target className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-600 group-hover:text-teal-400 transition-colors" />
            </div>

            <Button 
              disabled={joinCode.length < 4}
              onClick={() => handleJoinRoom(joinCode)}
              className="h-14 px-8 rounded-2xl bg-teal-500 text-black font-black text-lg btn-game shadow-xl shadow-teal-500/20"
            >
              JOIN ROOM
            </Button>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-14 px-8 rounded-2xl glass hover:bg-white/5 text-white font-black text-lg border-white/10 btn-game">
                  <Plus className="w-5 h-5 mr-2" />
                  NEW GAME
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0f111a] border-white/10 text-white max-w-lg rounded-[2rem] overflow-hidden glass p-0">
                <div className="p-8">
                  <DialogHeader className="mb-8">
                    <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase">Configure Battle</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 gap-3">
                      {GAME_MODES.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMode(m.id)}
                          className={cn(
                            "group p-4 rounded-2xl border text-left transition-all relative overflow-hidden",
                            selectedMode === m.id 
                              ? 'border-teal-500 bg-teal-500/10 shadow-lg shadow-teal-500/5' 
                              : 'border-white/5 bg-white/2 hover:bg-white/5'
                          )}
                        >
                          <div className={cn(
                            "w-10 h-10 rounded-xl mb-3 flex items-center justify-center transition-transform group-hover:scale-110",
                            selectedMode === m.id ? 'bg-teal-500 text-black' : 'bg-white/5 text-white'
                          )}>
                            {m.icon}
                          </div>
                          <div className={cn("text-sm font-black uppercase tracking-tight", selectedMode === m.id ? 'text-teal-400' : 'text-white')}>
                            {m.name}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium leading-tight mt-1">{m.desc}</p>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-3 gap-6 bg-white/2 p-6 rounded-3xl border border-white/5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Rounds</label>
                        <div className="flex items-center gap-3">
                           <Input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="bg-transparent border-0 p-0 h-auto text-xl font-black text-teal-400 text-center" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Timer (s)</label>
                        <Input type="number" value={timerSecs} onChange={(e) => setTimerSecs(Number(e.target.value))} className="bg-transparent border-0 p-0 h-auto text-xl font-black text-teal-400 text-center" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Max Cap</label>
                        <Input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="bg-transparent border-0 p-0 h-auto text-xl font-black text-teal-400 text-center" />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      {(['public', 'private'] as const).map((v) => (
                        <button
                          key={v}
                          onClick={() => setVisibility(v)}
                          className={cn(
                            "flex-1 py-4 text-xs font-black rounded-xl border transition-all uppercase tracking-widest",
                            visibility === v 
                              ? 'border-teal-500 bg-teal-500 text-black shadow-lg shadow-teal-500/20' 
                              : 'border-white/5 bg-white/2 text-slate-500 hover:text-white'
                          )}
                        >
                          {v === 'public' ? <Globe className="w-4 h-4 inline mr-2" /> : <Lock className="w-4 h-4 inline mr-2" />}
                          {v}
                        </button>
                      ))}
                    </div>

                    <Button
                      className="w-full bg-white text-black font-black h-16 rounded-[1.25rem] text-xl btn-game shadow-2xl"
                      onClick={handleCreateRoom}
                      disabled={creating}
                    >
                      {creating ? 'INITIALIZING...' : 'START DEPLOYMENT ➔'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* MODES GRID */}
        <section className="space-y-8">
          <div className="flex items-center gap-4">
            <h3 className="text-2xl font-black italic tracking-tighter uppercase">Available Operations</h3>
            <Separator className="flex-1 bg-white/5" />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GAME_MODES.map((mode) => (
              <div
                key={mode.id}
                className={cn(
                  "p-8 rounded-[2rem] glass border-white/5 relative overflow-hidden group cursor-pointer game-card",
                )}
                onClick={() => { setSelectedMode(mode.id); setCreateOpen(true); }}
              >
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                   {mode.icon}
                </div>
                <div className={cn("inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase mb-6 tracking-widest", mode.tagColor)}>
                  {mode.tag}
                </div>
                <h4 className="text-2xl font-black italic tracking-tighter uppercase mb-4 leading-none">{mode.name}</h4>
                <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">{mode.desc}</p>
                <div className="flex items-center text-[11px] font-black text-teal-400 uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                  Deploy mission <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ACTIVE ROOMS */}
        <section className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-2xl font-black italic tracking-tighter uppercase">In-Progress Hubs</h3>
              <Badge className="bg-white/5 text-slate-500 border-white/5 text-[10px] font-black">{publicRooms.length}</Badge>
            </div>
            <Button 
                variant="ghost" 
                onClick={fetchRooms} 
                className="text-slate-500 hover:text-teal-400 text-[11px] font-black uppercase tracking-widest gap-2"
              >
              <RefreshCw className="w-3 h-3" /> Sync Live
            </Button>
          </div>

          {publicRooms.length === 0 ? (
            <div className="rounded-[3rem] border border-dashed border-white/10 p-20 text-center space-y-6">
              <div className="w-20 h-20 bg-white/2 rounded-full flex items-center justify-center mx-auto">
                <Gamepad2 className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <p className="text-lg font-bold text-white mb-1">No active battles found.</p>
                <p className="text-slate-500 text-sm font-medium">Be the pioneer and establish the first hub of the day.</p>
              </div>
              <Button 
                onClick={() => setCreateOpen(true)}
                className="bg-white/5 border border-white/5 hover:bg-white/10 text-white font-black px-8 rounded-2xl"
              >
                CREATE FIRST HUB ➔
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publicRooms.map((room) => {
                const mode = GAME_MODES.find((m) => m.id === room.game_mode);
                return (
                  <div
                    key={room.id}
                    className="group p-6 rounded-3xl glass border-white/5 hover:bg-white/5 transition-all cursor-pointer flex items-center justify-between game-card"
                    onClick={() => handleJoinPublic(room.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-teal-500/20 group-hover:scale-110 transition-all">
                        {mode?.icon || <Zap className="w-6 h-6 text-slate-400" />}
                      </div>
                      <div>
                        <div className="text-sm font-black uppercase tracking-tighter text-white">{mode?.name || room.game_mode}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Hash className="w-3 h-3 text-slate-700" />
                          <span className="text-[10px] font-black text-slate-600 tracking-widest">{room.id}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                       <div className="flex items-center justify-end gap-1.5">
                         <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                         <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">LIVE</span>
                       </div>
                       <div className="text-sm font-black text-white/80 tabular-nums">
                         {room.player_count}<span className="text-slate-700 mx-0.5">/</span>{room.max_players}
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 text-center bg-black/20">
         <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-8 h-8 glass rounded-lg flex items-center justify-center">
              <Trophy className="w-4 h-4 text-yellow-500" />
            </div>
            <span className="text-xs font-black uppercase tracking-[0.3em] text-slate-600">Vexillology Championship © 2026</span>
         </div>
         <p className="text-[10px] text-slate-700 font-bold max-w-sm mx-auto uppercase tracking-wider">
           Built for high-stakes competition and deep geography knowledge.
           Global servers active. Hub 01.
         </p>
      </footer>
    </div>
  );
}
