import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { guestLogin, login, register, createRoom, listRooms } from '@/lib/api';
import type { RoomSummary } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

const GAME_MODES = [
  {
    id: 'flag_frenzy',
    name: 'Flag Frenzy',
    emoji: '🏳️',
    desc: 'See a flag, guess the country. Speed bonus + rarity multiplier.',
    color: 'from-cyan-500/20 to-blue-600/20',
    border: 'border-cyan-500/30',
    tag: 'Most Popular',
    tagColor: 'bg-cyan-500/20 text-cyan-300',
  },
  {
    id: 'rarest_flag',
    name: 'Rarest Flag',
    emoji: '💎',
    desc: 'Pick the rarest flag from 3 options grouped by color category.',
    color: 'from-purple-500/20 to-pink-600/20',
    border: 'border-purple-500/30',
    tag: 'Strategy',
    tagColor: 'bg-purple-500/20 text-purple-300',
  },
  {
    id: 'spelling_bee',
    name: 'Spelling Bee',
    emoji: '🔤',
    desc: 'See a flag, type the country name. Close answers get partial credit.',
    color: 'from-yellow-500/20 to-orange-600/20',
    border: 'border-yellow-500/30',
    tag: 'Tricky',
    tagColor: 'bg-yellow-500/20 text-yellow-300',
  },
  {
    id: 'capital_guesser',
    name: 'Capital City',
    emoji: '🌍',
    desc: 'See a flag, name its capital city. Race against the clock!',
    color: 'from-green-500/20 to-teal-600/20',
    border: 'border-green-500/30',
    tag: 'Geography',
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
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
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
    <div className="min-h-screen bg-[#0a0c14] text-white font-sans">
      <header className="border-b border-white/5 px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎮</span>
          <span className="text-xl font-bold tracking-tight text-white">GuessWhat</span>
          <Badge className="bg-teal-500/20 text-teal-300 border-teal-500/30 text-xs">Beta</Badge>
        </div>
        <div className="flex items-center gap-3">
          {username ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">{username}</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-white text-xs"
                onClick={() => { useGameStore.getState().clearAuth(); }}
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Dialog open={authOpen} onOpenChange={setAuthOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-teal-600 hover:bg-teal-500 text-white border-0">
                  Sign In
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#13151f] border-white/10 text-white max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-white text-lg font-semibold">Welcome back</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Button
                    className="w-full bg-slate-700/60 hover:bg-slate-700 border border-white/10 text-white"
                    onClick={handleGuestLogin}
                    disabled={authLoading}
                  >
                    🎲 Continue as Guest
                  </Button>
                  <div className="flex items-center gap-3">
                    <Separator className="flex-1 bg-white/10" />
                    <span className="text-xs text-slate-500">or</span>
                    <Separator className="flex-1 bg-white/10" />
                  </div>
                  <div className="flex gap-2">
                    {(['login', 'register'] as const).map((m) => (
                      <button
                        key={m}
                        className={`flex-1 py-1.5 text-sm rounded-md transition-colors ${authMode === m ? 'bg-teal-600 text-white' : 'text-slate-400 hover:text-white'}`}
                        onClick={() => setAuthMode(m)}
                      >
                        {m === 'login' ? 'Login' : 'Register'}
                      </button>
                    ))}
                  </div>
                  {authError && <p className="text-red-400 text-sm">{authError}</p>}
                  <Input
                    placeholder="Username"
                    value={authUsername}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthUsername(e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                  <Input
                    type="password"
                    placeholder="Password"
                    value={authPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAuthPassword(e.target.value)}
                    onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleAuth()}
                    className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
                  />
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white border-0"
                    onClick={handleAuth}
                    disabled={authLoading}
                  >
                    {authLoading ? '...' : authMode === 'login' ? 'Login' : 'Create Account'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        <section className="text-center space-y-4">
          <h1 className="text-5xl font-bold tracking-tight leading-tight">
            The Multiplayer<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
              Flag & Geography
            </span>{' '}
            Game Hub
          </h1>
          <p className="text-slate-400 text-lg max-w-xl mx-auto">
            Compete in real-time with friends. Guess flags, capitals, and discover the world's rarest banners.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <div className="flex gap-2">
              <Input
                placeholder="Room code (e.g. ABC123)"
                value={joinCode}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleJoinRoom(joinCode)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 w-48 font-mono tracking-widest uppercase"
                maxLength={6}
              />
              <Button
                disabled={joinCode.length < 4}
                onClick={() => handleJoinRoom(joinCode)}
                className="bg-slate-700 hover:bg-slate-600 text-white border border-white/10"
              >
                Join
              </Button>
            </div>

            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="bg-teal-600 hover:bg-teal-500 text-white border-0 px-6">
                  + Create Room
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#13151f] border-white/10 text-white max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-white text-lg">Create a Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <label className="text-xs text-slate-400 mb-2 block">Game Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {GAME_MODES.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedMode(m.id)}
                          className={`p-3 rounded-lg border text-left transition-all ${selectedMode === m.id ? 'border-teal-500/60 bg-teal-500/10' : 'border-white/10 bg-white/5 hover:bg-white/8'}`}
                        >
                          <div className="text-lg">{m.emoji}</div>
                          <div className="text-sm font-medium text-white mt-1">{m.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Rounds</label>
                      <Input
                        type="number"
                        min={3}
                        max={20}
                        value={rounds}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRounds(Number(e.target.value))}
                        className="bg-white/5 border-white/10 text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Timer (s)</label>
                      <Input
                        type="number"
                        min={10}
                        max={60}
                        value={timerSecs}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTimerSecs(Number(e.target.value))}
                        className="bg-white/5 border-white/10 text-white text-center"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">Max Players</label>
                      <Input
                        type="number"
                        min={2}
                        max={8}
                        value={maxPlayers}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMaxPlayers(Number(e.target.value))}
                        className="bg-white/5 border-white/10 text-white text-center"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {(['public', 'private'] as const).map((v) => (
                      <button
                        key={v}
                        onClick={() => setVisibility(v)}
                        className={`flex-1 py-2 text-sm rounded-lg border transition-all ${visibility === v ? 'border-teal-500/60 bg-teal-500/10 text-teal-300' : 'border-white/10 text-slate-400 hover:text-white'}`}
                      >
                        {v === 'public' ? '🌐 Public' : '🔒 Private'}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full bg-teal-600 hover:bg-teal-500 text-white border-0"
                    onClick={handleCreateRoom}
                    disabled={creating}
                  >
                    {creating ? 'Creating...' : 'Create Room'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </section>

        {/* Game modes */}
        <section>
          <h2 className="text-lg font-semibold text-white mb-6">Game Modes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {GAME_MODES.map((mode) => (
              <Card
                key={mode.id}
                className={`bg-gradient-to-br ${mode.color} border ${mode.border} cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:brightness-110`}
                onClick={() => { setSelectedMode(mode.id); setCreateOpen(true); }}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl">{mode.emoji}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${mode.tagColor}`}>{mode.tag}</span>
                  </div>
                  <CardTitle className="text-white text-base mt-2">{mode.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-400 text-sm leading-relaxed">{mode.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Public rooms */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Open Rooms</h2>
            <button onClick={fetchRooms} className="text-xs text-slate-400 hover:text-teal-400 transition-colors">
              ↻ Refresh
            </button>
          </div>
          {publicRooms.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <div className="text-4xl mb-3">🏚️</div>
              <p>No open rooms yet. Be the first to create one!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {publicRooms.map((room) => {
                const mode = GAME_MODES.find((m) => m.id === room.game_mode);
                return (
                  <div
                    key={room.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-white/4 border border-white/8 hover:bg-white/6 hover:border-white/15 transition-all cursor-pointer"
                    onClick={() => handleJoinPublic(room.id)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{mode?.emoji || '🎮'}</span>
                      <div>
                        <div className="text-sm font-medium text-white">{mode?.name || room.game_mode}</div>
                        <div className="text-xs text-slate-400 font-mono">{room.id}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-300">{room.player_count}/{room.max_players}</div>
                      <div className="text-xs text-teal-400">Waiting</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
