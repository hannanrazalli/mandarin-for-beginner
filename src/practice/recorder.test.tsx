import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { purgeAccountData } from "../auth/purge";
import Recorder from "./Recorder";

const stopTrack = vi.fn();
const input = {
  getTracks: () => [{ stop: stopTrack }],
} as unknown as MediaStream;
let rec: FakeRecorder;
class FakeRecorder {
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(_stream: MediaStream) {
    rec = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["recorded"]) });
    this.onstop?.();
  }
}
const getUserMedia = vi.fn(),
  revoke = vi.fn();
beforeEach(() => {
  stopTrack.mockClear();
  getUserMedia.mockReset();
  revoke.mockClear();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia },
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: false,
  });
  vi.stubGlobal("MediaRecorder", FakeRecorder);
  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:private-recording"),
    revokeObjectURL: revoke,
  });
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
it("asks only on a recording gesture and stops late permission after unmount", async () => {
  let resolve: ((value: MediaStream) => void) | undefined;
  getUserMedia.mockImplementation(
    () =>
      new Promise<MediaStream>((done) => {
        resolve = done;
      }),
  );
  const view = render(<Recorder language="en" />);
  expect(getUserMedia).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Record" }));
  view.unmount();
  await act(async () => {
    resolve?.(input);
  });
  expect(stopTrack).toHaveBeenCalledOnce();
});
it("stops on hide and revokes playback on account purge", async () => {
  getUserMedia.mockResolvedValue(input);
  render(<Recorder language="en" />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
  });
  fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
  expect(screen.getByLabelText("Listen to your recording")).toBeTruthy();
  await act(async () => {
    await purgeAccountData();
  });
  expect(revoke).toHaveBeenCalledWith("blob:private-recording");
  expect(screen.queryByLabelText("Listen to your recording")).toBeNull();
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Record" }));
  });
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: true,
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
  expect(rec.state).toBe("inactive");
  expect(stopTrack.mock.calls.length).toBeGreaterThanOrEqual(2);
});
it("caps recording at twenty seconds", async () => {
  vi.useFakeTimers();
  getUserMedia.mockResolvedValue(input);
  render(<Recorder language="ms" />);
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Rakam" }));
  });
  act(() => vi.advanceTimersByTime(20000));
  expect(rec.state).toBe("inactive");
  expect(stopTrack).toHaveBeenCalled();
  vi.useRealTimers();
});
