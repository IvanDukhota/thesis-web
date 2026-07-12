import { useEffect, useRef } from "react";
import { getAccessToken } from "../../../../shared/lib/token";

export type KanbanEvent =
  | { type: "task.created"; task: Record<string, unknown>; user_id: number }
  | { type: "task.updated"; task: Record<string, unknown>; user_id: number }
  | { type: "task.deleted"; task_id: string; user_id: number };

export function useKanbanSocket(
  projectId: string | undefined,
  onEvent: (event: KanbanEvent) => void
) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!projectId) return;

    const token = getAccessToken();
    if (!token) return;

    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    const ws = new WebSocket(
      `${protocol}://${host}/ws/kanban/${projectId}/?token=${encodeURIComponent(token)}`
    );

    let pingInterval: ReturnType<typeof setInterval> | null = null;

    ws.onopen = () => {
      pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 30000);
    };

    ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data as string) as { type: string };
        if (
          data.type === "task.created" ||
          data.type === "task.updated" ||
          data.type === "task.deleted"
        ) {
          onEventRef.current(data as KanbanEvent);
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onerror = () => ws.close();

    return () => {
      if (pingInterval !== null) clearInterval(pingInterval);
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [projectId]);
}
