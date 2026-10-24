import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as learning from "../learning/cloud";
import { Player } from "../learning/LessonPlayer";
import { useLessonPlayer } from "../learning/store";
import { canonicalAnswer, lessons } from "../lib/curriculum";
import { queueMutation } from "../offline/dispatch";
import TestOut from "./TestOut";

const fixtures = vi.hoisted(() => ({
  ownerId: "11111111-1111-4111-8111-111111111111",
  rejected: true,
  completed: [] as string[],
}));
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({
    status: "owner",
    owner: { id: fixtures.ownerId, email: "owner@example.test" },
    client: {},
  }),
}));
vi.mock("../offline/receipts", () => ({
  useEventResolution: (id: string | null) => ({
    outcome:
      id && fixtures.rejected
        ? { state: "rejected", reason: "conflict" }
        : null,
    receipt: null,
  }),
}));
vi.mock("../offline/dispatch", () => ({
  queueMutation: vi.fn(async () => {
    throw new Error("permanent conflict");
  }),
}));
vi.mock("../learning/cloud", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../learning/cloud")>();
  return {
    ...actual,
    useLearningProgress: () => ({
      scope: fixtures.ownerId,
      owner: true,
      offline: false,
      verifying: false,
      completed: fixtures.completed,
      query: { isPending: false, isError: false },
    }),
  };
});
beforeEach(() => {
  fixtures.rejected = true;
  fixtures.completed = lessons
    .filter((lesson) => lesson.unit === 0)
    .map((lesson) => lesson.id);
  useLessonPlayer.getState().clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});
function show(element: React.ReactNode) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}
describe("permanent rejection recovery", () => {
  it("starts a fresh test-out form without resending the rejected request and focuses its first input", async () => {
    show(<TestOut />);
    const inputs = screen.getAllByLabelText(/Taip maksud Melayu/);
    const words = lessons
      .filter((lesson) => lesson.unit === 1)
      .flatMap((lesson) => lesson.items);
    for (const [index, item] of words.entries())
      fireEvent.change(inputs[index], {
        target: { value: canonicalAnswer(item) },
      });
    fireEvent.click(screen.getByRole("button", { name: "Semak" }));
    await waitFor(() =>
      expect(screen.getByText(/Percubaan ini ditolak/)).toBeTruthy(),
    );
    expect(
      (screen.getAllByLabelText(/Taip maksud Melayu/)[0] as HTMLInputElement)
        .disabled,
    ).toBe(true);
    expect(screen.queryByRole("button", { name: "Hantar semula" })).toBeNull();
    expect(queueMutation).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cuba lagi" }));
    const first = screen.getAllByLabelText(
      /Taip maksud Melayu/,
    )[0] as HTMLInputElement;
    expect(first.disabled).toBe(false);
    expect(first.value).toBe("");
    expect(document.activeElement).toBe(first);
    expect(queueMutation).toHaveBeenCalledTimes(1);
  });
  it("shows terminal lesson rejection instead of unconfirmed resend and offers a new attempt", () => {
    const lesson = lessons[0];
    useLessonPlayer.getState().start(lesson.id, fixtures.ownerId);
    useLessonPlayer.getState().finish({
      id: crypto.randomUUID(),
      scope: fixtures.ownerId,
      lessonId: lesson.id,
      contentVersion: lesson.content_version,
      answers: lesson.items.map((item) => ({
        item_id: item.id,
        answer: canonicalAnswer(item),
      })),
      createdAt: new Date().toISOString(),
      durationSeconds: 60,
    });
    const submit = vi.spyOn(learning, "submitLesson");
    show(<Player lesson={lesson} scope={fixtures.ownerId} />);
    expect(screen.getByText(/Percubaan ini ditolak/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Hantar semula" })).toBeNull();
    expect(submit).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getAllByRole("button", { name: "Ulang pelajaran" })[0],
    );
    expect(useLessonPlayer.getState().event).toBeNull();
    expect(useLessonPlayer.getState().stage).toBe("flash");
  });
  it("manual lesson retry forwards force with the original event and never changes its ID", async () => {
    fixtures.rejected = false;
    const lesson = lessons[0];
    const event = {
      id: crypto.randomUUID(),
      scope: fixtures.ownerId,
      lessonId: lesson.id,
      contentVersion: lesson.content_version,
      answers: lesson.items.map((item) => ({
        item_id: item.id,
        answer: canonicalAnswer(item),
      })),
      createdAt: new Date().toISOString(),
      durationSeconds: 60,
    };
    useLessonPlayer.getState().start(lesson.id, fixtures.ownerId);
    useLessonPlayer.getState().finish(event);
    const submit = vi
      .spyOn(learning, "submitLesson")
      .mockRejectedValue(new Error("paused"));
    show(<Player lesson={lesson} scope={fixtures.ownerId} />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Hantar semula" }),
      ).toBeTruthy(),
    );
    fireEvent.click(screen.getByRole("button", { name: "Hantar semula" }));
    await waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    expect(submit.mock.calls[1][2]).toEqual(event);
    expect(submit.mock.calls[1][3]).toBe(true);
  });
});
