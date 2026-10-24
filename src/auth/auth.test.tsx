import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type PublicAuthClient, parsePublicConfig } from "../lib/supabase";
import Account from "./Account";
import { AuthProvider } from "./AuthProvider";
import { verifiedOwner } from "./owner";
import { purgeAccountData, registerAccountPurger } from "./purge";
import { loginSchema } from "./validation";

afterEach(cleanup);
const validUrl = "https://abcdefghijklmnopqrst.supabase.co";
const validKey = `sb_publishable_${"a".repeat(32)}`;
describe("public auth boundary", () => {
  it("rejects unsafe URL shapes and privileged or legacy keys", () => {
    expect(parsePublicConfig(validUrl, validKey)).not.toBeNull();
    for (const url of [
      "http://abcdefghijklmnopqrst.supabase.co",
      "https://abcdefghijklmnopqrst.supabase.co.attacker.test",
      "https://user@abcdefghijklmnopqrst.supabase.co",
      "https://abcdefghijklmnopqrst.supabase.co/auth",
      "https://localhost",
    ])
      expect(parsePublicConfig(url, validKey)).toBeNull();
    for (const key of [
      "sb_secret_not-public",
      "service_role",
      "eyJlegacy.token.signature",
      "",
    ])
      expect(parsePublicConfig(validUrl, key)).toBeNull();
  });
  it("bounds and validates login input without changing passwords", () => {
    expect(
      loginSchema.safeParse({
        email: "learner@example.test",
        password: "a".repeat(8),
      }).success,
    ).toBe(true);
    for (const value of [
      { email: "invalid", password: "password" },
      { email: "x@y.test", password: "short" },
      { email: "x@y.test", password: "x".repeat(129) },
      { email: `${"x".repeat(255)}@y.test`, password: "password" },
    ])
      expect(loginSchema.safeParse(value).success).toBe(false);
  });
  it("renders honest preview access without a fake login when unconfigured", () => {
    render(
      <MemoryRouter>
        <AuthProvider client={null}>
          <Account />
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText("Akaun awan belum disambungkan.")).toBeTruthy();
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(
      screen
        .getByRole("link", { name: "Teruskan latihan setempat" })
        .getAttribute("href"),
    ).toBe("/unit-0");
  });
  it("does not authorize a confirmed second user without an allowed profile", async () => {
    const from = vi.fn(() => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }),
      }),
    }));
    const client = {
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "second",
              email: "second@example.test",
              email_confirmed_at: "2026-01-01",
            },
          },
          error: null,
        }),
      },
      from,
    } as unknown as PublicAuthClient;
    expect(await verifiedOwner(client)).toBeNull();
    expect(from).toHaveBeenCalledWith("profiles");
  });
  it("does not query owner data before authenticated user verification", async () => {
    const from = vi.fn();
    const client = {
      auth: {
        getUser: async () => ({
          data: { user: null },
          error: { message: "untrusted" },
        }),
      },
      from,
    } as unknown as PublicAuthClient;
    expect(await verifiedOwner(client)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });
  it("shows a generic login error without server error content and cleans its subscription", async () => {
    const unsubscribe = vi.fn();
    const signInWithPassword = vi.fn(async () => ({
      error: { message: "<script>internal backend detail</script>" },
    }));
    const client = {
      auth: {
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe } } }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword,
      },
    } as unknown as PublicAuthClient;
    const view = render(
      <MemoryRouter>
        <AuthProvider client={client}>
          <Account />
        </AuthProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByLabelText("E-mel")).toBeTruthy());
    fireEvent.change(screen.getByLabelText("E-mel"), {
      target: { value: "learner@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Kata laluan"), {
      target: { value: "password12" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Log masuk" })
        .closest("form") as HTMLFormElement,
    );
    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain(
        "Log masuk tidak berjaya",
      ),
    );
    expect(screen.queryByText(/internal backend detail/)).toBeNull();
    expect(
      (screen.getByLabelText("Kata laluan") as HTMLInputElement).value,
    ).toBe("");
    view.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
  it("invokes all registered account data purgers and supports cleanup", async () => {
    const first = vi.fn();
    const second = vi.fn();
    const remove = registerAccountPurger(first);
    const removeSecond = registerAccountPurger(second);
    await purgeAccountData();
    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
    remove();
    removeSecond();
  });
});

describe("maximum app session age", () => {
  it("expires after 12 hours without resetting on reads", async () => {
    const { remainingAppSession, MAX_APP_SESSION_MS, SESSION_STARTED_KEY } =
      await import("./session");
    const started = 100000;
    const storage = {
      getItem: (key: string) =>
        key === SESSION_STARTED_KEY ? String(started) : null,
    };
    expect(remainingAppSession(storage, started + 1)).toBe(
      MAX_APP_SESSION_MS - 1,
    );
    expect(remainingAppSession(storage, started + MAX_APP_SESSION_MS)).toBe(0);
    expect(remainingAppSession({ getItem: () => null }, started)).toBe(0);
    expect(remainingAppSession(storage, started - 1)).toBe(0);
  });
});
