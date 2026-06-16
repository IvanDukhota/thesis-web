import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { appWebSocketClient, type AppSocketEvent } from "../shared/realtime/ws-client";
import { clearTokens, getAccessToken } from "../shared/lib/token";

type RealtimeContextValue = {
  isSocketConnected: boolean;
  toast: string;
  activeChatId: string | null;
  setActiveChatId: (chatId: string | null) => void;
  clearToast: () => void;
  logout: () => void;
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

  const activeChatIdRef = useRef<string | null>(null);

  const setActiveChatId = (chatId: string | null) => {
    activeChatIdRef.current = chatId;
    setActiveChatIdState(chatId);
  };

  useEffect(() => {
    const unsubscribeStatus = appWebSocketClient.onStatusChange((isConnected) => {
      setIsSocketConnected(isConnected);
    });

    const unsubscribeEvents = appWebSocketClient.onEvent((event: AppSocketEvent) => {
      if (event.type !== "notification.new_message") {
        return;
      }

      const incomingChatId = event.chat_id ? String(event.chat_id) : null;

      if (incomingChatId && incomingChatId === activeChatIdRef.current) {
        return;
      }

      setToast(String(event.message || "New message"));
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

    const timer = window.setTimeout(() => {
      setToast("");
    }, 3500);

    return () => window.clearTimeout(timer);
  }, [toast]);

  const logout = () => {
    appWebSocketClient.disconnect();
    clearTokens();
    setActiveChatId(null);
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
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);

  if (!context) {
    throw new Error("useRealtime must be used inside RealtimeProvider");
  }

  return context;
}
