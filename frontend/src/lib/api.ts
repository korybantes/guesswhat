import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gw_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthResponse {
  token: string;
  username: string;
  is_guest: boolean;
}

export const guestLogin = (): Promise<AuthResponse> =>
  api.post('/auth/guest').then((r) => r.data);

export const register = (username: string, password: string): Promise<AuthResponse> =>
  api.post('/auth/register', { username, password }).then((r) => r.data);

export const login = (username: string, password: string): Promise<AuthResponse> =>
  api.post('/auth/login', { username, password }).then((r) => r.data);

// ── Rooms ─────────────────────────────────────────────────────────────────────

export interface CreateRoomBody {
  game_mode: string;
  rounds?: number;
  timer_secs?: number;
  max_players?: number;
  visibility?: string;
}

export interface RoomSummary {
  id: string;
  game_mode: string;
  player_count: number;
  max_players: number;
  phase: string;
}

export const createRoom = (body: CreateRoomBody): Promise<{ room_id: string }> =>
  api.post('/rooms', body).then((r) => r.data);

export const listRooms = (): Promise<RoomSummary[]> =>
  api.get('/rooms').then((r) => r.data);

export const getRoom = (id: string) =>
  api.get(`/rooms/${id}`).then((r) => r.data);

// ── Leaderboard ───────────────────────────────────────────────────────────────

export const getLeaderboard = (mode?: string, limit = 20) =>
  api.get('/leaderboard', { params: { mode, limit } }).then((r) => r.data);

export default api;
