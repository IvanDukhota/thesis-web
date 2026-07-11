import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appWebSocketClient, type AppSocketEvent } from "../shared/realtime/ws-client";
import { clearTokens, getAccessToken } from "../shared/lib/token";

export type AppNotificationItem =
  | { kind: "invitation"; id: string; invited_by: { id: number; username: string }; team: { id: string; name: string }; created_at: string }
  | { kind: "general"; id: string; title: string; body: string; created_at: string }
  | { kind: "new_application"; id: string; order_title: string; order_slug: string; applicant_name: string; created_at: string }
  | { kind: "application_accepted"; id: string; order_title: string; order_slug: string; project_id: string; created_at: string }
  | { kind: "application_rejected"; id: string; order_title: string; order_slug: string; created_at: string }
  | { kind: "order_abandoned"; id: string; order_title: string; order_slug: string; abandoned_by: string; created_at: string };

type RealtimeContextValue = {
  isSocketConnected: boolean;
  toast: string;
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  clearToast: () => void;
  logout: () => void;
  notifications: AppNotificationItem[];
  removeNotification: (id: string) => void;
};

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

type Props = {
  children: ReactNode;
};

export function RealtimeProvider({ children }: Props) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [toast, setToast] = useState("");
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);

  const activeChatIdRef = useRef<string | null>(null);
  const notificationsLoadedRef = useRef(false);

  const setActiveChatId = (chatId: string | null) => {
    activeChatIdRef.current = chatId;
    setActiveChatIdState(chatId);
  };

  useEffect(() => {
    if (!isSocketConnected) return;
    if (notificationsLoadedRef.current) return;
    notificationsLoadedRef.current = true;

    const token = getAccessToken();
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    Promise.all([
      fetch("/api/invitations/", { headers }),
      fetch("/api/notifications/", { headers }),
    ])
      .then(async ([invRes, notifRes]) => {
        const items: AppNotificationItem[] = [];
        if (invRes.ok) {
          const invitations = (await invRes.json()) as any[];
          items.push(...invitations.map((inv) => ({ kind: "invitation" as const, ...inv })));
        }
        if (notifRes.ok) {
          const notifs = (await notifRes.json()) as any[];
          items.push(...notifs.map((n) => ({ kind: "general" as const, ...n })));
        }
        setNotifications(items);
      })
      .catch(() => {});
  }, [isSocketConnected]);

  useEffect(() => {
    const unsubscribeStatus = appWebSocketClient.onStatusChange((isConnected) => {
      setIsSocketConnected(isConnected);
    });

    const unsubscribeEvents = appWebSocketClient.onEvent((event: AppSocketEvent) => {
      if (event.type === "notification.new_message") {
        const incomingChatId = event.chat_id ? String(event.chat_id) : null;
        if (incomingChatId && incomingChatId === activeChatIdRef.current) return;
        setToast(String(event.message || "New message"));
        return;
      }

      if (event.type === "notification.new_application") {
        setNotifications((prev) => [
          {
            kind: "new_application",
            id: String(event.id || Date.now()),
            order_title: String(event.order_title || ""),
            order_slug: String(event.order_slug || ""),
            applicant_name: String(event.applicant_name || ""),
            created_at: String(event.created_at || new Date().toISOString()),
          },
          ...prev,
        ]);
        return;
      }

      if (event.type === "notification.application_accepted") {
        setNotifications((prev) => [
          {
            kind: "application_accepted",
            id: String(event.id || Date.now()),
            order_title: String(event.order_title || ""),
            order_slug: String(event.order_slug || ""),
            project_id: String(event.project_id || ""),
            created_at: String(event.created_at || new Date().toISOString()),
          },
          ...prev,
        ]);
        return;
      }

      if (event.type === "notification.application_rejected") {
        setNotifications((prev) => [
          {
            kind: "application_rejected",
            id: String(event.id || Date.now()),
            order_title: String(event.order_title || ""),
            order_slug: String(event.order_slug || ""),
            created_at: String(event.created_at || new Date().toISOString()),
          },
          ...prev,
        ]);
        return;
      }

      if (event.type === "notification.order_abandoned") {
        setNotifications((prev) => [
          {
            kind: "order_abandoned",
            id: String(event.id || Date.now()),
            order_title: String(event.order_title || ""),
            order_slug: String(event.order_slug || ""),
            abandoned_by: String(event.abandoned_by || ""),
            created_at: String(event.created_at || new Date().toISOString()),
          },
          ...prev,
        ]);
        return;
      }

      if (event.type === "notification.new_invitation") {
        const inv = event as unknown as {
          id: string;
          team: { id: string; name: string };
          invited_by: { id: number; username: string };
          created_at: string;
        };
        setNotifications((prev) => [
          {
            kind: "invitation",
            id: inv.id,
            team: inv.team,
            invited_by: inv.invited_by,
            created_at: inv.created_at,
          },
          ...prev,
        ]);
        return;
      }

      if (event.type === "chat.left") {
        // Event is handled in ChatsPage, but we log it here for debugging
        console.log("User left chat:", event.chat_id);
        return;
      }
    });

    return () => {
      unsubscribeStatus();
      unsubscribeEvents();
    };
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    if (location.pathname === "/auth") return;
    appWebSocketClient.connect();
  }, [location.pathname]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const logout = () => {
    appWebSocketClient.disconnect();
    clearTokens();
    setActiveChatId(null);
    setNotifications([]);
    notificationsLoadedRef.current = false;
    navigate("/auth");
  };

  return (
    <RealtimeContext.Provider
      value={{
        isSocketConnected,
        toast,
        activeChatId,
        setActiveChatId,
        clearToast: () => setToast(""),
        logout,
        notifications,
        removeNotification,
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error("useRealtime must be used inside RealtimeProvider");
  return context;
}
