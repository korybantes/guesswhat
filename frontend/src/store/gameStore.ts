import { create } from 'zustand';

// ── Types mirroring backend server messages ──────────────────────────────────

export type GameMode = 'flag_frenzy' | 'rarest_flag' | 'spelling_bee' | 'capital_guesser';
export type GamePhase = 'lobby' | 'starting' | 'round_active' | 'round_end' | 'game_over';
export type RoomVisibility = 'public' | 'private';

export interface Player {
  id: string;
  username: string;
  is_guest: boolean;
  score: number;
  is_host: boolean;
  is_ready: boolean;
  answered_this_round: boolean;
}

export interface ChatMessage {
  player_id: string;
  username: string;
  message: string;
  timestamp_ms: number;
}

export interface RoomSettings {
  game_mode: GameMode;
  rounds: number;
  timer_secs: number;
  visibility: RoomVisibility;
  max_players: number;
}

export interface Room {
  id: string;
  settings: RoomSettings;
  phase: GamePhase;
  players: Record<string, Player>;
  current_round: number;
  created_at: string;
}

export type RoundQuestion =
  | {
      kind: 'guess_flag';
      country_code: string;
      country_name: string;
      flag_url: string;
      options: string[] | null;
      rarity_score: number;
    }
  | {
      kind: 'rarest_pick';
      category: string;
      choices: { id: number; country_code: string; country_name: string; flag_url: string; rarity_score: number }[];
    }
  | {
      kind: 'spell_it';
      country_code: string;
      flag_url: string;
      country_name: string;
    }
  | {
      kind: 'guess_capital';
      country_code: string;
      country_name: string;
      flag_url: string;
      correct_capital: string;
      options: string[] | null;
    };

export interface RoundScore {
  player_id: string;
  username: string;
  score_this_round: number;
  total_score: number;
  answer: string | null;
  correct: boolean;
}

// ── App State ─────────────────────────────────────────────────────────────────

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface GameState {
  // Auth
  token: string | null;
  username: string | null;
  isGuest: boolean;
  setAuth: (token: string, username: string, isGuest: boolean) => void;
  clearAuth: () => void;

  // Room
  room: Room | null;
  myPlayerId: string | null;
  setRoom: (room: Room) => void;
  setMyPlayerId: (id: string) => void;
  clearRoom: () => void;

  // Game round
  currentQuestion: RoundQuestion | null;
  currentRound: number;
  totalRounds: number;
  timerSecs: number;
  roundScores: RoundScore[];
  finalLeaderboard: RoundScore[];
  hasAnswered: boolean;
  countdown: number | null;

  setRoundStart: (round: number, totalRounds: number, timerSecs: number, question: RoundQuestion) => void;
  setRoundEnd: (correctAnswer: string, scores: RoundScore[], totalScores: RoundScore[]) => void;
  setGameOver: (leaderboard: RoundScore[]) => void;
  setHasAnswered: () => void;
  setCountdown: (n: number | null) => void;

  // WS connection status
  connectionStatus: ConnectionStatus;
  setConnectionStatus: (s: ConnectionStatus) => void;

  // Chat
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;

  // Correct answer revealed at round end
  correctAnswer: string | null;
}

export const useGameStore = create<GameState>((set) => ({
  // Auth
  token: localStorage.getItem('gw_token'),
  username: localStorage.getItem('gw_username'),
  isGuest: localStorage.getItem('gw_is_guest') === 'true',
  setAuth: (token, username, isGuest) => {
    localStorage.setItem('gw_token', token);
    localStorage.setItem('gw_username', username);
    localStorage.setItem('gw_is_guest', String(isGuest));
    set({ token, username, isGuest });
  },
  clearAuth: () => {
    localStorage.removeItem('gw_token');
    localStorage.removeItem('gw_username');
    localStorage.removeItem('gw_is_guest');
    set({ token: null, username: null, isGuest: true });
  },

  // Room
  room: null,
  myPlayerId: null,
  setRoom: (room) => set({ room }),
  setMyPlayerId: (id) => set({ myPlayerId: id }),
  clearRoom: () => set({
    room: null,
    myPlayerId: null,
    currentQuestion: null,
    currentRound: 0,
    roundScores: [],
    finalLeaderboard: [],
    hasAnswered: false,
    countdown: null,
    correctAnswer: null,
  }),

  // Game round
  currentQuestion: null,
  currentRound: 0,
  totalRounds: 0,
  timerSecs: 20,
  roundScores: [],
  finalLeaderboard: [],
  hasAnswered: false,
  countdown: null,
  correctAnswer: null,

  setRoundStart: (round, totalRounds, timerSecs, question) =>
    set((state) => ({
      currentRound: round,
      totalRounds,
      timerSecs,
      currentQuestion: question,
      hasAnswered: false,
      roundScores: [],
      correctAnswer: null,
      countdown: null,
      room: state.room ? { ...state.room, phase: 'round_active' as GamePhase } : null
    })),
  setRoundEnd: (correctAnswer, scores) =>
    set((state) => ({ 
      correctAnswer, 
      roundScores: scores,
      room: state.room ? { ...state.room, phase: 'round_end' as GamePhase } : null
    })),
  setGameOver: (leaderboard) =>
    set((state) => ({ 
      finalLeaderboard: leaderboard,
      room: state.room ? { ...state.room, phase: 'game_over' as GamePhase } : null
    })),
  setHasAnswered: () => set({ hasAnswered: true }),
  setCountdown: (n) => set((state) => ({ 
    countdown: n,
    room: state.room && n !== null && state.room.phase === 'lobby' 
      ? { ...state.room, phase: 'starting' as GamePhase } 
      : state.room
  })),

  // Chat
  chatMessages: [],
  addChatMessage: (msg) => set((state) => ({ 
    chatMessages: [...state.chatMessages, msg].slice(-100) // Keep last 100
  })),

  // WS
  connectionStatus: 'disconnected',
  setConnectionStatus: (s) => set({ connectionStatus: s }),
}));
