import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createPublicClient, type PublicAuthClient } from "../lib/supabase";
import Account from "./Account";
import { AuthProvider } from "./AuthProvider";
import { registerAccountPurger } from "./purge";
import { MAX_APP_SESSION_MS, SESSION_STARTED_KEY } from "./session";
import { createTabAuthStorage, SESSION_SLOT } from "./tab-storage";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});
function ownerClient(revoke: () => Promise<{ error: null }>) {
  return {
    auth: {
      getSession: async () => ({
        data: { session: { access_token: "test-only" } },
        error: null,
      }),
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      getUser: async () => ({
        data: {
          user: {
            id: "owner",
            email: "owner@example.test",
            email_confirmed_at: "confirmed",
          },
        },
        error: null,
      }),
      stopAutoRefresh: async () => {},
      admin: { signOut: revoke },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: { id: "owner" }, error: null }),
        }),
      }),
    }),
  } as unknown as PublicAuthClient;
}
async function renderOwner(client: PublicAuthClient) {
  sessionStorage.setItem(SESSION_SLOT, "private-session");
  sessionStorage.setItem(SESSION_STARTED_KEY, String(Date.now()));
  await act(async () => {
    render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <Account />
        </AuthProvider>
      </MemoryRouter>,
    );
  });
  await screen.findByRole("heading", { name: "Akses pemilik disahkan" });
}
describe("immediate local logout", () => {
  it("purges before delayed remote completion, then focuses signed-out heading", async () => {
    let resolve: (value: { error: null }) => void = () => {};
    const remote = new Promise<{ error: null }>((done) => {
      resolve = done;
    });
    const revoke = vi.fn(() => remote);
    const purge = vi.fn();
    const remove = registerAccountPurger(purge);
    await renderOwner(ownerClient(revoke));
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Akses pemilik disahkan" }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Log keluar semua sesi" }),
    );
    expect(sessionStorage.getItem(SESSION_SLOT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_STARTED_KEY)).toBeNull();
    expect(purge).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("test-only", "global");
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Log masuk" }),
    );
    await act(async () => resolve({ error: null }));
    expect(
      (screen.getByRole("button", { name: "Log masuk" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    remove();
  });
  it("bounds a never-resolving revocation and leaves no reload-restorable credentials", async () => {
    await renderOwner(ownerClient(() => new Promise(() => {})));
    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Log keluar tab ini" }));
    expect(sessionStorage.getItem(SESSION_SLOT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_STARTED_KEY)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4001);
    });
    expect(
      (screen.getByRole("button", { name: "Log masuk" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(
      screen.getByText(/Pembatalan sesi pelayan tidak dapat disahkan/),
    ).toBeTruthy();
  });
  it("expiry purges immediately even if remote revocation never resolves", async () => {
    await renderOwner(ownerClient(() => new Promise(() => {})));
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + MAX_APP_SESSION_MS + 1);
    fireEvent(document, new Event("visibilitychange"));
    expect(sessionStorage.getItem(SESSION_SLOT)).toBeNull();
    expect(sessionStorage.getItem(SESSION_STARTED_KEY)).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4001);
    });
    expect(
      (screen.getByRole("button", { name: "Log masuk" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });
});
describe("tab broadcast and persistence adapter", () => {
  it("gives SDK BroadcastChannel instances separate page names", async () => {
    const names: string[] = [];
    class IsolatedChannel {
      onmessage: unknown = null;
      constructor(name: string) {
        names.push(name);
      }
      addEventListener() {}
      postMessage() {}
      close() {}
    }
    vi.stubGlobal("BroadcastChannel", IsolatedChannel);
    const url = "https://abcdefghijklmnopqrst.supabase.co";
    const key = `sb_publishable_${"a".repeat(32)}`;
    const first = createPublicClient(url, key, sessionStorage);
    const second = createPublicClient(url, key, sessionStorage);
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(names).toHaveLength(2);
    expect(names[0]).not.toBe(names[1]);
    await first?.auth.stopAutoRefresh();
    await second?.auth.stopAutoRefresh();
  });

  it("uses distinct channel names while restoring the same per-tab stable slot", () => {
    const first = createTabAuthStorage(sessionStorage);
    first.adapter.setItem(first.channelKey, "session");
    const reload = createTabAuthStorage(sessionStorage);
    expect(first.channelKey).not.toBe(reload.channelKey);
    expect(reload.adapter.getItem(reload.channelKey)).toBe("session");
    expect(reload.adapter.getItem(first.channelKey)).toBeNull();
  });
  it("permanently fences stale refresh writes and removals after logout", () => {
    const old = createTabAuthStorage(sessionStorage);
    old.adapter.setItem(old.channelKey, "old");
    old.seal();
    old.adapter.setItem(old.channelKey, "stale-refresh");
    expect(sessionStorage.getItem(SESSION_SLOT)).toBeNull();
    const next = createTabAuthStorage(sessionStorage);
    next.adapter.setItem(next.channelKey, "fresh");
    old.adapter.setItem(old.channelKey, "stale-again");
    old.adapter.removeItem(old.channelKey);
    old.seal();
    expect(next.adapter.getItem(next.channelKey)).toBe("fresh");
  });
});
