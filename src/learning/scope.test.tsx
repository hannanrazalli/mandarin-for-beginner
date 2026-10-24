import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../auth/AuthProvider";
import { canonicalAnswer, lessons } from "../lib/curriculum";
import type { PublicAuthClient } from "../lib/supabase";
import * as audioModule from "./audio";
import * as cloud from "./cloud";
import { Player } from "./LessonPlayer";
import { type LearningEvent, useLessonPlayer, usePractice } from "./store";

vi.mock("../auth/AuthProvider", () => ({ useAuth: vi.fn() }));
const client = {} as PublicAuthClient;
function auth(status: "owner" | "signedOut" | "initializing") {
  vi.mocked(useAuth).mockReturnValue({
    status,
    owner:
      status === "owner"
        ? { id: "owner-a", email: "owner@example.test" }
        : null,
    client: status === "owner" ? client : null,
    pending: false,
    message: null,
    login: async () => false,
    logout: async () => {},
    retry: () => {},
  });
}
function event(scope: string): LearningEvent {
  return {
    id: crypto.randomUUID(),
    scope,
    lessonId: lessons[0].id,
    contentVersion: 1,
    answers: lessons[0].items.map((item) => ({
      item_id: item.id,
      answer: canonicalAnswer(item),
    })),
    createdAt: new Date().toISOString(),
    durationSeconds: 60,
  };
}
function ui(scope: string, suspended = false) {
  return (
    <MemoryRouter>
      <Player lesson={lessons[0]} scope={scope} suspended={suspended} />
    </MemoryRouter>
  );
}
beforeEach(() => {
  useLessonPlayer.getState().clear();
  usePractice.setState({ events: [], stored: true });
  auth("signedOut");
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
describe("learning scope isolation", () => {
  it("does not persist a previous owner result during owner-to-practice transition", () => {
    const add = vi.spyOn(usePractice.getState(), "add");
    const submit = vi.spyOn(cloud, "submitLesson");
    useLessonPlayer.getState().start(lessons[0].id, "owner-a");
    useLessonPlayer.getState().finish(event("owner-a"));
    render(ui("practice"));
    expect(add).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(useLessonPlayer.getState().scope).toBe("practice");
    expect(useLessonPlayer.getState().event).toBeNull();
  });
  it("does not submit a previous practice result during practice-to-owner transition", () => {
    const add = vi.spyOn(usePractice.getState(), "add");
    const submit = vi.spyOn(cloud, "submitLesson");
    useLessonPlayer.getState().start(lessons[0].id, "practice");
    useLessonPlayer.getState().finish(event("practice"));
    auth("owner");
    render(ui("owner-a"));
    expect(add).not.toHaveBeenCalled();
    expect(submit).not.toHaveBeenCalled();
    expect(useLessonPlayer.getState().scope).toBe("owner-a");
    expect(useLessonPlayer.getState().event).toBeNull();
  });
  it("preserves owner query scope and completion data during verification", () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { staleTime: Infinity } },
    });
    queryClient.setQueryData(["owner", "owner-a", "learning"], {
      completed: [lessons[0].id],
      sessions: [],
      totalXp: 10,
    });
    auth("owner");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const hook = renderHook(() => cloud.useLearningProgress(), { wrapper });
    expect(hook.result.current.scope).toBe("owner-a");
    auth("initializing");
    hook.rerender();
    expect(hook.result.current.scope).toBe("owner-a");
    expect(hook.result.current.verifying).toBe(true);
    expect(hook.result.current.completed).toEqual([lessons[0].id]);
    queryClient.clear();
  });
  it("suspends an owner player without resetting answers while verification is pending", () => {
    auth("owner");
    useLessonPlayer.getState().start(lessons[0].id, "owner-a");
    useLessonPlayer.getState().answer(lessons[0].items[0].id, "wrong", false);
    const view = render(ui("owner-a"));
    const answers = useLessonPlayer.getState().answers;
    auth("initializing");
    view.rerender(ui("owner-a", true));
    expect(useLessonPlayer.getState().scope).toBe("owner-a");
    expect(useLessonPlayer.getState().answers).toEqual(answers);
    expect(useLessonPlayer.getState().stage).toBe("feedback");
  });
  it("rejects owner events at the local persistence boundary", () => {
    usePractice.getState().add(event("owner-a"));
    expect(usePractice.getState().events).toEqual([]);
  });
});
describe("lesson fallback and focus", () => {
  it("shows explanation immediately and moves directly to a graded question", () => {
    render(ui("practice"));
    expect(screen.getByRole("region", { name: "Penerangan" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Penerangan" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Seterusnya" }));
    expect(useLessonPlayer.getState().stage).toBe("question");
    expect(useLessonPlayer.getState().answers).toEqual([]);
  });
  it("reveals text after a listening voice error", () => {
    const stop = vi.fn();
    const mock = vi
      .spyOn(audioModule, "useMandarinAudio")
      .mockReturnValue({ available: true, state: "idle", play: vi.fn(), stop });
    useLessonPlayer.getState().start(lessons[0].id, "practice");
    useLessonPlayer.setState({ index: 1, stage: "question" });
    const view = render(ui("practice"));
    expect(screen.getByRole("heading", { name: "♪" })).toBeTruthy();
    mock.mockReturnValue({
      available: true,
      state: "error",
      play: vi.fn(),
      stop,
    });
    act(() => view.rerender(ui("practice")));
    expect(
      screen.getByRole("heading", { name: lessons[0].items[1].hanzi }),
    ).toBeTruthy();
    expect(screen.getByText(/Suara peranti gagal dimainkan/)).toBeTruthy();
  });
});
