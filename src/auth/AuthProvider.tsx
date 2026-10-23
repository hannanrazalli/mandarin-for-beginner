import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type PublicAuthClient,
  renewPublicClient,
  revokePublicSession,
  sealPublicClient,
  supabase,
} from "../lib/supabase";
import { verifiedOwner } from "./owner";
import { purgeAccountData } from "./purge";
import {
  remainingAppSession,
  SESSION_STARTED_KEY,
  startAppSession,
} from "./session";
import { loginSchema } from "./validation";

type Owner = { id: string; email: string };
type Status =
  | "unconfigured"
  | "initializing"
  | "signedOut"
  | "owner"
  | "blocked"
  | "error";
type Message =
  | "invalid"
  | "failed"
  | "loggedOut"
  | "globalOut"
  | "sessionExpired"
  | "logoutFailed"
  | null;
type AuthContextValue = {
  status: Status;
  owner: Owner | null;
  pending: boolean;
  message: Message;
  login: (email: string, password: string) => Promise<boolean>;
  logout: (global?: boolean) => Promise<void>;
  retry: () => void;
};
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({
  children,
  client: initialClient = supabase,
}: {
  children: ReactNode;
  client?: PublicAuthClient | null;
}) {
  const [client, setClient] = useState(initialClient);
  const [status, setStatus] = useState<Status>(
    client ? "initializing" : "unconfigured",
  );
  const [owner, setOwner] = useState<Owner | null>(null);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(0);
  const mounted = useRef(true);
  const signingOut = useRef(false);
  const stopSubscription = useRef(() => {});
  const accessToken = useRef<string | null>(null);
  const endSession = useCallback(
    async (global = false, expired = false, blocked = false) => {
      if (!client || signingOut.current) return;
      signingOut.current = true;
      const token = accessToken.current;
      accessToken.current = null;
      ++revision.current;
      setOwner(null);
      setStatus(blocked ? "blocked" : "signedOut");
      setPending(true);
      setMessage(null);
      let localFailed = false;
      try {
        sealPublicClient(client);
      } catch {
        localFailed = true;
      }
      stopSubscription.current();
      // Invoke every local purge now, before remote revocation or any await.
      const purge = purgeAccountData();
      let purgeFailed = false;
      void purge.catch(() => {
        purgeFailed = true;
      });
      const revoked = await revokePublicSession(client, token, global);
      // Private stores must clear synchronously; optional asynchronous cleanup cannot hold UI pending.
      if (mounted.current) {
        setMessage(
          localFailed || purgeFailed || !revoked
            ? "logoutFailed"
            : expired
              ? "sessionExpired"
              : global
                ? "globalOut"
                : "loggedOut",
        );
        setPending(false);
        setClient(renewPublicClient(client));
      }
      signingOut.current = false;
    },
    [client],
  );
  const verify = useCallback(async () => {
    if (!client || signingOut.current) return;
    if (remainingAppSession() <= 0) {
      await endSession(false, true);
      return;
    }
    const revisionAtStart = ++revision.current;
    setStatus("initializing");
    setOwner(null);
    try {
      const verified = await verifiedOwner(client);
      if (
        !mounted.current ||
        signingOut.current ||
        revisionAtStart !== revision.current
      )
        return;
      if (remainingAppSession() <= 0) {
        await endSession(false, true);
        return;
      }
      if (verified) {
        setOwner(verified);
        setStatus("owner");
      } else {
        await endSession(false, false, true);
      }
    } catch {
      if (mounted.current && revisionAtStart === revision.current) {
        setOwner(null);
        setStatus("error");
      }
    }
  }, [client, endSession]);
  useEffect(() => {
    if (status !== "owner") return;
    const check = () => {
      if (remainingAppSession() <= 0) void endSession(false, true);
    };
    const timer = setTimeout(check, remainingAppSession());
    document.addEventListener("visibilitychange", check);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [status, endSession]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: The retry counter deliberately restarts initialization.
  useEffect(() => {
    mounted.current = true;
    if (!client) return;
    let active = true;
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (!active || signingOut.current) return;
      if (event === "SIGNED_OUT") {
        void endSession();
      } else if (session) {
        accessToken.current = session.access_token;
        queueMicrotask(() => {
          if (active && !signingOut.current) void verify();
        });
      }
    });
    stopSubscription.current = () => {
      active = false;
      subscription.unsubscribe();
    };
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active || signingOut.current) return;
        if (error) {
          setStatus("error");
          return;
        }
        if (!data.session) {
          setStatus((previous) =>
            previous === "blocked" ? "blocked" : "signedOut",
          );
          return;
        }
        accessToken.current = data.session.access_token;
        void verify();
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => {
      active = false;
      mounted.current = false;
      ++revision.current;
      subscription.unsubscribe();
    };
  }, [client, verify, endSession, attempt]);
  const login = useCallback(
    async (email: string, password: string) => {
      if (!client || pending || signingOut.current) return false;
      const parsed = loginSchema.safeParse({ email, password });
      if (!parsed.success) {
        setMessage("invalid");
        return false;
      }
      setPending(true);
      setMessage(null);
      try {
        startAppSession();
        const { data, error } = await client.auth.signInWithPassword(
          parsed.data,
        );
        if (error) {
          sessionStorage.removeItem(SESSION_STARTED_KEY);
          setMessage("failed");
          return false;
        }
        accessToken.current = data.session?.access_token ?? accessToken.current;
        await verify();
        return true;
      } catch {
        setMessage("failed");
        return false;
      } finally {
        if (!signingOut.current) setPending(false);
      }
    },
    [client, pending, verify],
  );
  const logout = useCallback(
    async (global = false) => {
      if (!pending) await endSession(global);
    },
    [endSession, pending],
  );
  const value = useMemo(
    () => ({
      status,
      owner,
      pending,
      message,
      login,
      logout,
      retry: () => setAttempt((value) => value + 1),
    }),
    [status, owner, pending, message, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider missing");
  return value;
}
