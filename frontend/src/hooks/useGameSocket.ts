import { useEffect, useCallback } from 'react';
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
  | { type: 'PONG' }
  | { type: 'CHAT_MESSAGE'; player_id: string; username: string; message: string; timestamp_ms: number };

let globalWs: WebSocket | null = null;
let globalRoomId: string | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

export function useGameSocket(roomId: string | null) {
  const {
    token, username,
    setRoom, setRoundStart, setRoundEnd, setGameOver,
    setCountdown, setConnectionStatus, addChatMessage,
  } = useGameStore();

  const send = useCallback((msg: object) => {
    if (globalWs?.readyState === WebSocket.OPEN) {
      globalWs.send(JSON.stringify(msg));
    }
  }, []);

  const connect = useCallback(() => {
    if (!roomId || !username) return;

    // If already connected to this room, just update handlers and return
    if (globalWs && globalWs.readyState === WebSocket.OPEN && globalRoomId === roomId) {
      setConnectionStatus('connected');
      // Update the onmessage hook with the latest state setters
      globalWs.onmessage = (event) => handleMessage(event);
      return;
    }

    // Otherwise close old connection and start fresh
    if (globalWs) globalWs.close();
    
    setConnectionStatus('connecting');
    globalRoomId = roomId;
    const url = `${WS_BASE}/${roomId}`;
    const socket = new WebSocket(url);
    globalWs = socket;

    socket.onopen = () => {
      setConnectionStatus('connected');
      send({ type: 'JOIN_ROOM', room_id: roomId, username, token });
    };

    const handleMessage = (event: MessageEvent) => {
      try {
        const msg: ServerMsg = JSON.parse(event.data);
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
            break;
          case 'CHAT_MESSAGE':
            addChatMessage({
              player_id: msg.player_id,
              username: msg.username,
              message: msg.message,
              timestamp_ms: msg.timestamp_ms,
            });
            break;
          case 'ERROR':
            console.error('[WS] Server error:', msg.message);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('[WS] JSON parse error', err);
      }
    };

    socket.onmessage = handleMessage;

    socket.onclose = () => {
      setConnectionStatus('disconnected');
      if (globalRoomId === roomId) {
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connect, 3000);
      }
    };

    socket.onerror = () => {
      setConnectionStatus('error');
      socket.close();
    };
  }, [roomId, username, token, send, setRoom, setRoundStart, setRoundEnd, setGameOver, setCountdown, setConnectionStatus]);

  useEffect(() => {
    connect();
    return () => {
      // Intentionally DO NOT close the socket on unmount
      // This allows navigation between Lobby -> Game -> Results smoothly
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

  const sendChat = useCallback((message: string) => {
    send({ type: 'CHAT', message });
  }, [send]);

  return { startGame, submitAnswer, vote, updateSettings, sendChat, send };
}
