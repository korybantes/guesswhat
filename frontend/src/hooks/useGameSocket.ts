import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import type { RoundQuestion, RoundScore } from '@/store/gameStore';

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';

// ── Server message types ──────────────────────────────────────────────────────

type ServerMsg =
  | { type: 'ROOM_STATE'; room: ReturnType<typeof useGameStore.getState>['room'] }
  | { type: 'ROUND_START'; round: number; total_rounds: number; timer_secs: number; question: RoundQuestion }
  | { type: 'ROUND_END'; correct_answer: string; round_scores: RoundScore[]; total_scores: RoundScore[] }
  | { type: 'GAME_OVER'; leaderboard: RoundScore[] }
  | { type: 'PLAYER_JOINED'; player: unknown }
  | { type: 'PLAYER_LEFT'; player_id: string; username: string }
  | { type: 'COUNTDOWN'; seconds: number }
  | { type: 'ANSWER_ACK'; player_id: string }
  | { type: 'ERROR'; message: string }
  | { type: 'PONG' };

export function useGameSocket(roomId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    token, username,
    setRoom, setRoundStart, setRoundEnd, setGameOver,
    setCountdown, setConnectionStatus,
  } = useGameStore();

  const send = useCallback((msg: object) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomId || !username) return;

    setConnectionStatus('connecting');
    const url = `${WS_BASE}/${roomId}`;
    const socket = new WebSocket(url);
    ws.current = socket;

    socket.onopen = () => {
      setConnectionStatus('connected');
      // Send join message immediately
      send({ type: 'JOIN_ROOM', room_id: roomId, username, token });
    };

    socket.onmessage = (event) => {
      let msg: ServerMsg;
      try { msg = JSON.parse(event.data); }
      catch { return; }

      switch (msg.type) {
        case 'ROOM_STATE':
          if (msg.room) setRoom(msg.room);
          break;
        case 'ROUND_START':
          setRoundStart(msg.round, msg.total_rounds, msg.timer_secs, msg.question);
          break;
        case 'ROUND_END':
          setRoundEnd(msg.correct_answer, msg.round_scores, msg.total_scores);
          break;
        case 'GAME_OVER':
          setGameOver(msg.leaderboard);
          break;
        case 'COUNTDOWN':
          setCountdown(msg.seconds);
          break;
        case 'PLAYER_JOINED':
        case 'PLAYER_LEFT':
          // Room state will be re-broadcast, but we can trigger a re-fetch
          break;
        case 'ERROR':
          console.error('[WS] Server error:', msg.message);
          break;
        default:
          break;
      }
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
      // Auto-reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    socket.onerror = () => {
      setConnectionStatus('error');
      socket.close();
    };
  }, [roomId, username, token, send, setRoom, setRoundStart, setRoundEnd, setGameOver, setCountdown, setConnectionStatus]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  // Heartbeat every 30s
  useEffect(() => {
    const interval = setInterval(() => send({ type: 'PING' }), 30000);
    return () => clearInterval(interval);
  }, [send]);

  const startGame = useCallback(() => send({ type: 'START_GAME' }), [send]);

  const submitAnswer = useCallback((answer: string) => {
    send({ type: 'SUBMIT_ANSWER', answer, timestamp_ms: Date.now() });
  }, [send]);

  const vote = useCallback((choice: number) => {
    send({ type: 'VOTE', choice, timestamp_ms: Date.now() });
  }, [send]);

  const updateSettings = useCallback((settings: object) => {
    send({ type: 'UPDATE_SETTINGS', settings });
  }, [send]);

  return { startGame, submitAnswer, vote, updateSettings, send };
}
