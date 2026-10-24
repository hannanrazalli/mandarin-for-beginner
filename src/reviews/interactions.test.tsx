import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePractice } from "../learning/store";
import { useLocalTestOut } from "../learning/testout";
import { canonicalAnswer, lessons } from "../lib/curriculum";
import Exercises from "./Exercises";
import { useLocalReviews, vocabulary } from "./local";
import Reviews from "./Reviews";
import TestOut from "./TestOut";

const fixtures = vi.hoisted(() => ({
  progress: {
    owner: false,
    scope: "practice",
    verifying: false,
    completed: [] as string[],
  },
  auth: { status: "signedOut", owner: null, client: null },
}));
vi.mock("../learning/cloud", () => ({
  useLearningProgress: () => fixtures.progress,
  learningQueryClient: { invalidateQueries: vi.fn() },
}));
vi.mock("../auth/AuthProvider", () => ({ useAuth: () => fixtures.auth }));
vi.mock("./cloud", () => ({
  useReviewData: () => ({
    progress: fixtures.progress,
    auth: fixtures.auth,
    query: { isError: false, data: undefined },
  }),
  reviewResultSchema: { parse: vi.fn() },
}));
beforeEach(() => {
  fixtures.progress.completed = lessons.map((lesson) => lesson.id);
  fixtures.progress.verifying = false;
  useLocalReviews.setState({ events: [], stored: true });
  useLocalTestOut.setState({ events: [], stored: true });
  usePractice.setState({ events: [], stored: true });
});
afterEach(() => {
  cleanup();
  localStorage.clear();
});
function show(element: React.ReactNode) {
  return render(<MemoryRouter>{element}</MemoryRouter>);
}
describe("exercise interactions", () => {
  it("orders authored pinyin as separate tokens", () => {
    show(<Exercises />);
    fireEvent.click(screen.getByRole("button", { name: "Susun contoh ayat" }));
    const tokens = vocabulary[0].example.pinyin.split(/\s+/);
    expect(tokens.length).toBeGreaterThan(1);
    expect(
      screen.queryByRole("button", { name: vocabulary[0].example.pinyin }),
    ).toBeNull();
    for (const token of tokens)
      fireEvent.click(screen.getByRole("button", { name: token }));
    fireEvent.click(screen.getByRole("button", { name: "Semak" }));
    expect(screen.getByRole("status").textContent).toBe("Tepat.");
  });
  it("resets matched pairs on retry and when returning to the tab", () => {
    show(<Exercises />);
    fireEvent.click(screen.getByRole("button", { name: "Padankan perkataan" }));
    const word = vocabulary[0];
    const chinese = () =>
      screen.getByRole("button", { name: word.hanzi }) as HTMLButtonElement;
    fireEvent.click(chinese());
    expect(chinese().getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: word.meaning_ms }));
    expect(chinese().disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Cuba lagi" }));
    expect(chinese().disabled).toBe(false);
    fireEvent.click(chinese());
    fireEvent.click(screen.getByRole("button", { name: word.meaning_ms }));
    fireEvent.click(screen.getByRole("button", { name: "Pinyin dan nada" }));
    fireEvent.click(screen.getByRole("button", { name: "Padankan perkataan" }));
    expect(chinese().disabled).toBe(false);
    expect(chinese().getAttribute("aria-pressed")).toBe("false");
  });
});
describe("review and test-out keyboard focus", () => {
  it("grades local case/trim like the server and focuses the next review input", () => {
    const lesson = lessons.find((value) => value.unit === 1);
    if (!lesson) throw new Error("Vocabulary fixture missing");
    usePractice.setState({
      events: [
        {
          id: crypto.randomUUID(),
          scope: "practice",
          lessonId: lesson.id,
          contentVersion: lesson.content_version,
          answers: lesson.items.map((item) => ({
            item_id: item.id,
            answer: canonicalAnswer(item),
          })),
          createdAt: new Date().toISOString(),
          durationSeconds: 60,
        },
      ],
    });
    show(<Reviews />);
    fireEvent.change(screen.getByLabelText("Jawapan"), {
      target: { value: ` ${vocabulary[0].meaning_ms.toUpperCase()} ` },
    });
    fireEvent.click(screen.getByRole("button", { name: "Semak jawapan" }));
    expect(useLocalReviews.getState().events.at(-1)?.correct).toBe(true);
    const next = screen.getByRole("button", { name: "Bahan seterusnya" });
    next.focus();
    fireEvent.click(next);
    expect(document.activeElement).toBe(screen.getByLabelText("Jawapan"));
    expect((document.activeElement as HTMLInputElement).disabled).toBe(false);
  });
  it("asks for Malay meanings and moves focus to results, then back to the fresh form", async () => {
    show(<TestOut />);
    const inputs = screen.getAllByLabelText(/Taip maksud Melayu/);
    expect(inputs).toHaveLength(20);
    for (const [index, word] of vocabulary
      .filter((word) => word.lessonId.startsWith("u1-"))
      .entries())
      fireEvent.change(inputs[index], { target: { value: word.meaning_ms } });
    const submit = screen.getByRole("button", { name: "Semak" });
    submit.focus();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: /100%/ })).toBeTruthy(),
    );
    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: /100%/ }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Cuba lagi" }));
    expect(document.activeElement).toBe(
      screen.getAllByLabelText(/Taip maksud Melayu/)[0],
    );
    expect((document.activeElement as HTMLInputElement).value).toBe("");
  });
});
