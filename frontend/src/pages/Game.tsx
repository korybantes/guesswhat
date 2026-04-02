import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGameStore } from '@/store/gameStore';
import { useGameSocket } from '@/hooks/useGameSocket';
import FlagFrenzy from '@/components/games/FlagFrenzy';
import RarestFlag from '@/components/games/RarestFlag';
import SpellingBee from '@/components/games/SpellingBee';
import CapitalGuesser from '@/components/games/CapitalGuesser';
import ChatPanel from '@/components/ChatPanel';
import { Separator } from '@/components/ui/separator';
import { 
  Trophy, 
  Users,
  CheckCircle2,
  AlertCircle
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
      <div className="min-h-screen flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin shadow-lg shadow-teal-500/20" />
          <span className="text-[10px] font-black uppercase tracking-widest text-teal-400">Synchronizing Battle State...</span>
        </div>
      </div>
    );
  }

  const players = room ? Object.values(room.players) : [];
  const answeredCount = players.filter((p) => p.answered_this_round).length;
  const progressPct = timerSecs > 0 ? (timeLeft / timerSecs) * 100 : 0;
  const progressColor = timeLeft > 10 ? 'bg-teal-500' : timeLeft > 5 ? 'bg-yellow-500' : 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]';

  return (
    <div className="min-h-screen flex flex-col text-white pb-6">
      {/* DASHBOARD HEADER */}
      <header className="glass sticky top-0 z-50 border-b border-white/5 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">MISSION PROGRESS</span>
                <div className="flex items-center gap-2">
                   <h2 className="text-xl font-black italic tracking-tighter uppercase leading-none">ROUND {currentRound} / {totalRounds}</h2>
                </div>
             </div>
             <Separator orientation="vertical" className="h-8 bg-white/5" />
             <div className="hidden md:flex flex-col">
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">DEPLOYED CREW</span>
                <div className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-teal-400" />
                   <span className="text-sm font-black tabular-nums">{answeredCount} / {players.length} READY</span>
                </div>
             </div>
          </div>

          {/* MASTER TIMER */}
          <div className="flex flex-col items-center group">
             <div className={cn(
               "w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300",
               phase === 'active' ? (timeLeft <= 5 ? 'bg-red-500/20 border-red-500/50 scale-110' : 'bg-white/5 border-white/10') : 'opacity-20'
             )}>
                <span className={cn(
                  "text-3xl font-black tabular-nums italic",
                  phase === 'active' && timeLeft <= 5 ? "text-red-400" : "text-white"
                )}>
                   {phase === 'active' ? timeLeft : '--'}
                </span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             <button onClick={() => navigate('/')} className="text-slate-500 hover:text-white transition-colors">
               <AlertCircle className="w-5 h-5" />
             </button>
          </div>
        </div>
      </header>

      {/* DYNAMIC PROGRESS BAR */}
      <div className="h-1.5 bg-white/2 w-full relative z-40">
        <div
          className={cn("h-full transition-all duration-1000 ease-linear", progressColor)}
          style={{ width: `${phase === 'active' ? progressPct : 0}%` }}
        />
      </div>

      <main className="max-w-7xl mx-auto w-full px-6 flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8 py-8 lg:py-12">
        {/* PRIMARY BATTLE ZONE */}
        <div className="lg:col-span-3 flex flex-col space-y-8">
           {/* ROUND STATUS MODAL-LIKE OVERLAY */}
           {phase === 'result' && correctAnswer && (
             <div className="glass p-8 rounded-[2.5rem] border-teal-500/20 bg-teal-500/5 animate-game-bounce">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-teal-500 rounded-2xl flex items-center justify-center text-black">
                      <Trophy className="w-6 h-6" />
                   </div>
                   <div>
                      <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest">INTELLIGENCE CONFIRMED</span>
                      <h3 className="text-4xl font-black italic tracking-tighter uppercase leading-none">{correctAnswer}</h3>
                   </div>
                </div>
             </div>
           )}

           {/* MAIN QUESTION DISPLAY */}
           <div className="flex-1 flex flex-col items-center justify-center min-h-[400px] glass p-8 rounded-[3rem] border-white/5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-teal-500/5 to-transparent pointer-events-none" />
              
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

           {/* MINI-SCOREBOARD (HORIZONTAL STRIP) */}
           {phase === 'result' && roundScores.length > 0 && (
             <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <h4 className="text-xs font-black italic tracking-tighter uppercase inline-block">Tactical Performance</h4>
                  <Separator className="flex-1 bg-white/5" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                  {roundScores.slice(0, 5).map((s) => (
                    <div 
                      key={s.player_id}
                      className={cn(
                        "p-4 rounded-2xl glass border flex items-center justify-between",
                        s.player_id === myPlayerId ? "border-teal-500 bg-teal-500/10" : "border-white/5"
                      )}
                    >
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black uppercase text-slate-500 leading-none mb-1">PTS</span>
                          <span className={cn("text-lg font-black italic leading-none", s.score_this_round > 0 ? "text-teal-400" : "text-slate-700")}>
                             {s.score_this_round > 0 ? `+${s.score_this_round}` : '00'}
                          </span>
                       </div>
                       <div className="text-right">
                          <div className="text-[10px] font-black uppercase text-white truncate max-w-[60px]">{s.username}</div>
                          <div className="text-[9px] font-bold text-slate-600 tabular-nums">T: {s.total_score}</div>
                       </div>
                    </div>
                  ))}
                </div>
             </div>
           )}
        </div>

        {/* SECONDARY INTEL ZONE (CHAT + FULL SCORES) */}
        <aside className="lg:col-span-1 flex flex-col space-y-6">
           <div className="h-[400px] flex flex-col">
              <ChatPanel />
           </div>

           <div className="glass rounded-[2rem] p-6 border-white/5 flex-1">
              <div className="flex items-center justify-between mb-4">
                 <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Live Ranking</span>
                 </div>
              </div>
              <div className="space-y-3">
                 {players.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, 8).map((p, i) => (
                   <div key={p.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-slate-700 w-3">{i + 1}</span>
                         <span className={cn("text-xs font-black uppercase", p.id === myPlayerId ? "text-teal-400" : "text-white")}>{p.username}</span>
                      </div>
                      <span className="text-xs font-bold tabular-nums text-slate-400">{p.score || 0}</span>
                   </div>
                 ))}
              </div>
           </div>
        </aside>
      </main>
    </div>
  );
}
