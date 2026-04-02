import { useState, useEffect, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { guestLogin, login, register, createRoom, listRooms } from '@/lib/api';
import type { RoomSummary } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Gamepad2,
  User as UserIcon,
  Plus,
  Globe,
  Lock,
  RefreshCw,
  Sparkles,
  ChevronRight,
  LogOut,
  Zap,
  BookOpen,
  MapPin,
  Users,
  Crown,
  Crosshair,
  Signal,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const Globe3D = lazy(() => import('@/components/Globe3D'));

const CONTINENTS = [
  { id: 'all', name: 'ALL REGIONS', icon: '🌍' },
  { id: 'africa', name: 'AFRICA', icon: '🌍' },
  { id: 'americas', name: 'AMERICAS', icon: '🌎' },
  { id: 'asia', name: 'ASIA', icon: '🌏' },
  { id: 'europe', name: 'EUROPE', icon: '🏰' },
  { id: 'oceania', name: 'OCEANIA', icon: '🏝️' },
];

const GAME_MODES = [
  {
    id: 'flag_frenzy',
    name: 'Flag Frenzy',
    icon: <Zap className="w-5 h-5" />,
    desc: 'Rapid-fire rounds. Four choices, one flag. Speed kills.',
    gradient: 'from-cyan-500 to-blue-600',
    bgGlow: 'bg-cyan-500',
    tag: 'FAST',
    players: '2-8',
  },
  {
    id: 'rarest_flag',
    name: 'Rarest Flag',
    icon: <Sparkles className="w-5 h-5" />,
    desc: 'Spot the most obscure flag from a lineup. Knowledge is power.',
    gradient: 'from-purple-500 to-pink-600',
    bgGlow: 'bg-purple-500',
    tag: 'STRATEGY',
    players: '2-8',
  },
  {
    id: 'spelling_bee',
    name: 'Spelling Bee',
    icon: <BookOpen className="w-5 h-5" />,
    desc: 'No hints. Type the country name letter by letter. Zero mercy.',
    gradient: 'from-amber-500 to-orange-600',
    bgGlow: 'bg-amber-500',
    tag: 'EXPERT',
    players: '2-8',
  },
  {
    id: 'capital_guesser',
    name: 'Capital City',
    icon: <MapPin className="w-5 h-5" />,
    desc: 'Connect nations to their legendary capital cities worldwide.',
    gradient: 'from-emerald-500 to-teal-600',
    bgGlow: 'bg-emerald-500',
    tag: 'CLASSIC',
    players: '2-8',
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
  const [selectedContinent, setSelectedContinent] = useState('all');

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
    } catch { setAuthError('Connection failed. Try again.'); }
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
    <div className="min-h-screen text-white game-grid-bg scanlines">
      {/* ═══ TOP BAR ═══ */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#06080f]/90 backdrop-blur-sm px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate('/')}>
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-shadow">
              <Gamepad2 className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-lg tracking-[0.2em] text-white leading-none" style={{ fontFamily: 'var(--font-title)' }}>
                GUESSWHAT
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                <span className="text-[9px] font-semibold text-green-400/80 tracking-widest uppercase">ONLINE</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Online count */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
              <Signal className="w-3.5 h-3.5 text-green-400" />
              <span className="text-[10px] font-bold text-slate-400 tracking-wider">{publicRooms.reduce((s, r) => s + r.player_count, 0)} ONLINE</span>
            </div>

            {username ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500/20 to-purple-500/20 flex items-center justify-center border border-white/[0.06]">
                    <span className="text-xs font-bold text-cyan-400">{username[0]?.toUpperCase()}</span>
                  </div>
                  <span className="text-sm font-semibold text-white">{username}</span>
                </div>
                <button
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                  onClick={() => { useGameStore.getState().clearAuth(); }}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Dialog open={authOpen} onOpenChange={setAuthOpen}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-bold btn-cta hover:shadow-[0_0_20px_rgba(0,240,255,0.2)]">
                    <UserIcon className="w-4 h-4" />
                    ENTER GAME
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-sm rounded-2xl overflow-hidden p-0">
                  <div className="p-6 space-y-5">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold tracking-wider" style={{ fontFamily: 'var(--font-title)' }}>
                        CONNECT
                      </DialogTitle>
                    </DialogHeader>
                    <Button
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold h-12 rounded-lg btn-cta border-0"
                      onClick={handleGuestLogin}
                      disabled={authLoading}
                    >
                      ⚡ QUICK PLAY (GUEST)
                    </Button>
                    <div className="relative py-1">
                      <div className="h-px bg-white/[0.06]" />
                      <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0d1117] px-3 text-[9px] font-bold text-slate-600 tracking-[0.2em]">OR LOGIN</span>
                    </div>
                    <div className="flex bg-white/[0.03] p-1 rounded-lg gap-1 border border-white/[0.06]">
                      {(['login', 'register'] as const).map((m) => (
                        <button
                          key={m}
                          className={cn(
                            "flex-1 py-2 text-xs font-bold rounded transition-all uppercase tracking-wider",
                            authMode === m ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-white'
                          )}
                          onClick={() => setAuthMode(m)}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <div className="space-y-2.5">
                      <Input
                        placeholder="USERNAME"
                        value={authUsername}
                        onChange={(e) => setAuthUsername(e.target.value)}
                        className="bg-white/[0.03] border-white/[0.06] h-11 rounded-lg text-white placeholder:text-slate-600 focus:border-cyan-500/40"
                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                      />
                      <Input
                        type="password"
                        placeholder="PASSWORD"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                        className="bg-white/[0.03] border-white/[0.06] h-11 rounded-lg text-white placeholder:text-slate-600 focus:border-cyan-500/40"
                        style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                      />
                    </div>
                    {authError && <p className="text-red-400 text-xs font-bold text-center">{authError}</p>}
                    <Button
                      className="w-full bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-white font-bold h-11 rounded-lg"
                      onClick={handleAuth}
                      disabled={authLoading}
                    >
                      {authLoading ? 'CONNECTING...' : authMode === 'login' ? 'LOG IN →' : 'CREATE ACCOUNT →'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </header>

      <main className="relative">
        {/* ═══ HERO SECTION ═══ */}
        <section className="relative min-h-[85vh] flex items-center overflow-hidden">
          {/* Background glow effects */}
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

          <div className="max-w-7xl mx-auto px-6 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text & Actions */}
            <div className="space-y-8 relative z-10">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-500/[0.08] border border-cyan-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(0,240,255,0.6)]" />
                  <span className="text-[10px] font-bold text-cyan-400 tracking-[0.15em] uppercase">MULTIPLAYER GEOGRAPHY ARENA</span>
                </div>

                <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tight" style={{ fontFamily: 'var(--font-title)' }}>
                  GUESS
                  <br />
                  <span className="text-cyber">THE FLAG</span>
                </h2>

                <p className="text-slate-400 text-base lg:text-lg max-w-md leading-relaxed">
                  Battle players worldwide in real-time. 250+ flags, 4 game modes, zero mercy.
                  Climb the leaderboard or go home.
                </p>
              </div>

              {/* Join / Create actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Input
                    placeholder="ROOM CODE"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom(joinCode)}
                    className="bg-white/[0.03] border-white/[0.08] h-14 rounded-xl text-center tracking-[0.3em] text-lg placeholder:text-slate-700 focus:border-cyan-500/40 pr-12"
                    style={{ fontFamily: 'var(--font-mono)' }}
                    maxLength={6}
                  />
                  <Crosshair className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-700" />
                </div>

                <Button
                  disabled={joinCode.length < 4}
                  onClick={() => handleJoinRoom(joinCode)}
                  className="h-14 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-base btn-cta border-0 hover:shadow-[0_0_25px_rgba(0,240,255,0.2)]"
                >
                  JOIN
                </Button>

                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="h-14 px-8 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-bold text-base btn-cta hover:bg-white/[0.06] hover:border-white/[0.12]">
                      <Plus className="w-5 h-5 mr-2" />
                      CREATE
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-[#0d1117] border-white/[0.08] text-white max-w-lg rounded-2xl overflow-hidden p-0">
                    <div className="p-6 space-y-6">
                      <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-wider" style={{ fontFamily: 'var(--font-title)' }}>
                          CREATE MATCH
                        </DialogTitle>
                      </DialogHeader>

                      {/* Mode selection */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-bold text-slate-500 tracking-[0.15em] uppercase">GAME MODE</label>
                        <div className="grid grid-cols-2 gap-2.5">
                          {GAME_MODES.map((m) => (
                            <button
                              key={m.id}
                              onClick={() => setSelectedMode(m.id)}
                              className={cn(
                                "group p-3.5 rounded-xl border text-left transition-all relative overflow-hidden",
                                selectedMode === m.id
                                  ? 'border-cyan-500/40 bg-cyan-500/[0.06]'
                                  : 'border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]'
                              )}
                            >
                              <div className="flex items-center gap-2.5 mb-2">
                                <div className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                                  selectedMode === m.id
                                    ? `bg-gradient-to-br ${m.gradient} text-white`
                                    : 'bg-white/[0.05] text-slate-400'
                                )}>
                                  {m.icon}
                                </div>
                                <span className={cn("text-xs font-bold uppercase tracking-wider", selectedMode === m.id ? 'text-cyan-400' : 'text-white')}>{m.name}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 leading-tight">{m.desc}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Settings */}
                      <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Rounds</label>
                          <Input type="number" value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className="bg-transparent border-0 p-0 h-auto text-xl font-bold text-cyan-400 text-center" style={{ fontFamily: 'var(--font-mono)' }} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Timer</label>
                          <Input type="number" value={timerSecs} onChange={(e) => setTimerSecs(Number(e.target.value))} className="bg-transparent border-0 p-0 h-auto text-xl font-bold text-cyan-400 text-center" style={{ fontFamily: 'var(--font-mono)' }} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Players</label>
                          <Input type="number" value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))} className="bg-transparent border-0 p-0 h-auto text-xl font-bold text-cyan-400 text-center" style={{ fontFamily: 'var(--font-mono)' }} />
                        </div>
                      </div>

                      {/* Visibility */}
                      <div className="flex gap-2">
                        {(['public', 'private'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={() => setVisibility(v)}
                            className={cn(
                              "flex-1 py-3 text-xs font-bold rounded-lg border transition-all uppercase tracking-wider flex items-center justify-center gap-2",
                              visibility === v
                                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-400'
                                : 'border-white/[0.06] bg-white/[0.02] text-slate-500 hover:text-white'
                            )}
                          >
                            {v === 'public' ? <Globe className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            {v}
                          </button>
                        ))}
                      </div>

                      {/* Continent filter (optional) */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-500 tracking-[0.15em] uppercase">REGION FILTER</label>
                        <div className="flex flex-wrap gap-1.5">
                          {CONTINENTS.map((c) => (
                            <button
                              key={c.id}
                              className={cn("continent-tab text-[9px]", selectedContinent === c.id && 'active')}
                              onClick={() => setSelectedContinent(c.id)}
                            >
                              {c.icon} {c.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold h-14 rounded-xl text-base btn-cta disabled:opacity-50"
                        onClick={handleCreateRoom}
                        disabled={creating}
                      >
                        {creating ? 'CREATING...' : 'LAUNCH GAME →'}
                      </button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Stats strip */}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-cyan-500" />
                  <span className="text-sm font-bold text-white">{publicRooms.reduce((s, r) => s + r.player_count, 0)}</span>
                  <span className="text-xs text-slate-500">playing</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-bold text-white">{publicRooms.length}</span>
                  <span className="text-xs text-slate-500">active rooms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-bold text-white">250+</span>
                  <span className="text-xs text-slate-500">flags</span>
                </div>
              </div>
            </div>

            {/* Right: 3D Globe */}
            <div className="hidden lg:block h-[550px] relative">
              <Suspense fallback={
                <div className="h-full flex items-center justify-center">
                  <div className="spinner" />
                </div>
              }>
                <Globe3D className="w-full h-full" />
              </Suspense>

              {/* Floating labels around globe */}
              <div className="absolute top-16 right-8 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] animate-pulse">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider">LIVE MATCHES</span>
              </div>
              <div className="absolute bottom-24 left-4 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">RANKED MODE</span>
              </div>
            </div>
          </div>
        </section>

        {/* ═══ CONTINENT SELECTOR ═══ */}
        <section className="border-y border-white/[0.06] bg-[#08090f]">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
              <span className="text-[10px] font-bold text-slate-600 tracking-[0.15em] uppercase flex-shrink-0 mr-2">EXPLORE:</span>
              {CONTINENTS.map((c) => (
                <button
                  key={c.id}
                  className={cn("continent-tab whitespace-nowrap flex-shrink-0", selectedContinent === c.id && 'active')}
                  onClick={() => setSelectedContinent(c.id)}
                >
                  {c.icon} {c.name}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ GAME MODES ═══ */}
        <section className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-lg font-bold tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>GAME MODES</h3>
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[10px] font-bold text-slate-600 tracking-wider">{GAME_MODES.length} AVAILABLE</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GAME_MODES.map((mode) => (
              <div
                key={mode.id}
                className="game-card rounded-xl border border-white/[0.06] bg-[#0d1117] p-6 cursor-pointer group"
                onClick={() => { setSelectedMode(mode.id); setCreateOpen(true); }}
              >
                {/* Glow dot */}
                <div className={cn("absolute top-0 right-0 w-32 h-32 rounded-full blur-[60px] opacity-0 group-hover:opacity-20 transition-opacity", mode.bgGlow)} />

                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-4">
                    <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br text-white", mode.gradient)}>
                      {mode.icon}
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.15em] text-slate-600 uppercase">{mode.tag}</span>
                  </div>

                  <h4 className="text-base font-bold text-white mb-2 tracking-wide" style={{ fontFamily: 'var(--font-display)' }}>{mode.name.toUpperCase()}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed mb-4">{mode.desc}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-600">{mode.players} PLAYERS</span>
                    <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      PLAY <ChevronRight className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ ACTIVE ROOMS ═══ */}
        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-bold tracking-wider" style={{ fontFamily: 'var(--font-display)' }}>LIVE ROOMS</h3>
              <Badge className="bg-white/[0.04] text-slate-500 border-white/[0.06] text-[10px] font-bold">{publicRooms.length}</Badge>
            </div>
            <button
              onClick={fetchRooms}
              className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 hover:text-cyan-400 transition-colors tracking-wider uppercase"
            >
              <RefreshCw className="w-3 h-3" /> REFRESH
            </button>
          </div>

          {publicRooms.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/[0.06] p-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-xl bg-white/[0.03] flex items-center justify-center mx-auto border border-white/[0.06]">
                <Gamepad2 className="w-7 h-7 text-slate-700" />
              </div>
              <div>
                <p className="text-base font-bold text-white mb-1">No rooms yet</p>
                <p className="text-sm text-slate-500">Be the first to create a game today.</p>
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white text-sm font-bold hover:bg-white/[0.06] transition-all btn-cta"
              >
                <Plus className="w-4 h-4" /> CREATE FIRST ROOM
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {publicRooms.map((room) => {
                const mode = GAME_MODES.find((m) => m.id === room.game_mode);
                return (
                  <div
                    key={room.id}
                    className="group panel p-4 flex items-center justify-between cursor-pointer hover:border-cyan-500/20 transition-all"
                    onClick={() => handleJoinPublic(room.id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br text-white", mode?.gradient || 'from-slate-500 to-slate-600')}>
                        {mode?.icon || <Zap className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{mode?.name || room.game_mode}</div>
                        <div className="text-[10px] text-slate-600 tracking-wider" style={{ fontFamily: 'var(--font-mono)' }}>#{room.id}</div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
                        <span className="text-[9px] font-bold text-green-400 tracking-wider">LIVE</span>
                      </div>
                      <div className="text-sm font-bold text-white" style={{ fontFamily: 'var(--font-mono)' }}>
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

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-white/[0.06] py-8 text-center bg-[#06080f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Gamepad2 className="w-4 h-4 text-cyan-500/50" />
            <span className="text-[10px] font-bold text-slate-600 tracking-[0.2em]" style={{ fontFamily: 'var(--font-title)' }}>GUESSWHAT © 2026</span>
          </div>
          <p className="text-[10px] text-slate-700">
            Real-time multiplayer geography challenge. Built for competition.
          </p>
        </div>
      </footer>
    </div>
  );
}
