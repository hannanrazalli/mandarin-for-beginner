import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { purgeAccountData } from "../auth/purge";

const fixture = vi.hoisted(() => ({ refetch: vi.fn(), download: vi.fn() }));
vi.mock("../reviews/Statistics", () => ({
  default: () => <h1>Statistics</h1>,
}));
vi.mock("../lib/settings", () => ({ useSettings: () => ({ language: "ms" }) }));
vi.mock("./model", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./model")>()),
  downloadExport: fixture.download,
}));
vi.mock("./data", () => ({
  useAnalytics: () => ({
    auth: { status: "owner", owner: { id: "owner-one" } },
    progress: { scope: "owner-one", owner: true, verifying: false },
    query: {
      isSuccess: true,
      isError: false,
      isPending: false,
      refetch: fixture.refetch,
      data: {
        sessions: [],
        insights: { items: [], reviews: [] },
        words: [],
        tables: { study_sessions: [] },
      },
    },
  }),
}));

import AnalyticsPage from "./AnalyticsPage";

it("cancels a pending private export synchronously when account data is purged", async () => {
  let resolve: ((value: unknown) => void) | undefined;
  fixture.refetch.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    }),
  );
  render(<AnalyticsPage />);
  fireEvent.click(screen.getByRole("button", { name: "JSON" }));
  await waitFor(() => expect(fixture.refetch).toHaveBeenCalledOnce());
  await act(async () => {
    await purgeAccountData();
    resolve?.({ data: { tables: { profiles: [{ id: "owner-one" }] } } });
  });
  expect(fixture.download).not.toHaveBeenCalled();
  expect(screen.queryByText("Fail eksport telah disediakan.")).toBeNull();
});
