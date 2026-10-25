import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Player } from "../learning/LessonPlayer";
import { useLessonPlayer, usePractice } from "../learning/store";
import { useLocalTestOut } from "../learning/testout";
import { useLocalReviews } from "../reviews/local";
import Reviews from "../reviews/Reviews";
import TestOut from "../reviews/TestOut";
import { canonicalAnswer, lessons } from "./curriculum";
import { localizedMeaning, localizedTitle } from "./localization";
import { updateSettings } from "./settings";

const fixture = vi.hoisted(() => ({ completed: [] as string[] }));
vi.mock("../auth/AuthProvider", () => ({
  useAuth: () => ({ status: "signedOut", owner: null, client: null }),
}));
vi.mock("../learning/cloud", async (original) => {
  const actual = await original<typeof import("../learning/cloud")>();
  return {
    ...actual,
    useLearningProgress: () => ({
      scope: "practice",
      owner: false,
      offline: false,
      verifying: false,
      completed: fixture.completed,
      query: { isError: false, isPending: false },
    }),
  };
});
vi.mock("../reviews/cloud", () => ({
  useReviewData: () => ({
    progress: {
      scope: "practice",
      owner: false,
      offline: false,
      verifying: false,
    },
    auth: { status: "signedOut", owner: null, client: null },
    query: { isError: false },
  }),
}));
function show(component: React.ReactNode) {
  return render(<MemoryRouter>{component}</MemoryRouter>);
}
const vocab = lessons.find((lesson) => lesson.unit === 1);
if (!vocab) throw new Error("Vocabulary fixture");
beforeEach(() => {
  updateSettings({ language: "en" });
  useLessonPlayer.getState().clear();
  usePractice.setState({ events: [], stored: true });
  useLocalReviews.setState({ events: [], stored: true });
  useLocalTestOut.setState({ events: [], stored: true });
  fixture.completed = lessons
    .filter((lesson) => lesson.unit === 0)
    .map((lesson) => lesson.id);
});
afterEach(() => {
  cleanup();
  updateSettings({ language: "ms" });
});
const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
describe("English learning preserves canonical grading", () => {
  it("shows the English meaning immediately and records the Malay canonical choice after direct Next", () => {
    const item = vocab.items[0];
    show(<Player lesson={vocab} scope="practice" />);
    expect(
      screen.getByRole("heading", { name: localizedTitle(vocab, "en") }),
    ).toBeTruthy();
    expect(
      document
        .querySelector(".flash-meaning")
        ?.textContent?.includes(`Meaning: ${localizedMeaning(item, "en")}`),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Show explanation" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(
      screen.getByRole("button", {
        name: new RegExp(
          `^[1-4] ${escapePattern(localizedMeaning(item, "en"))}$`,
        ),
      }),
    );
    expect(useLessonPlayer.getState().answers[0].answer).toBe(
      canonicalAnswer(item),
    );
    expect(useLessonPlayer.getState().correct).toBe(true);
  });
  it("maps an English review response before local scoring and event persistence", () => {
    usePractice.setState({
      events: [
        {
          id: crypto.randomUUID(),
          scope: "practice",
          lessonId: vocab.id,
          contentVersion: vocab.content_version,
          answers: vocab.items.map((item) => ({
            item_id: item.id,
            answer: canonicalAnswer(item),
          })),
          createdAt: new Date().toISOString(),
          durationSeconds: 60,
        },
      ],
    });
    show(<Reviews />);
    expect(screen.getByText("Type the English meaning")).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Answer"), {
      target: { value: localizedMeaning(vocab.items[0], "en") },
    });
    fireEvent.click(screen.getByRole("button", { name: "Check answer" }));
    expect(useLocalReviews.getState().events[0].correct).toBe(true);
  });
  it("maps all English test-out meanings into the unchanged canonical payload", async () => {
    show(<TestOut />);
    const inputs = screen.getAllByLabelText(/Type the English meaning/);
    const words = lessons
      .filter((lesson) => lesson.unit === 1)
      .flatMap((lesson) => lesson.items);
    for (const [index, item] of words.entries())
      fireEvent.change(inputs[index], {
        target: { value: localizedMeaning(item, "en") },
      });
    fireEvent.click(screen.getByRole("button", { name: "Check" }));
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /100%/ })).toBeTruthy(),
    );
    expect(
      useLocalTestOut.getState().events[0].answers.map((row) => row.answer),
    ).toEqual(words.map(canonicalAnswer));
  });
});
