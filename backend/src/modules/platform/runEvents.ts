import { EventEmitter } from "events";
import type { AnalysisRunView } from "../../types/platform";

const emitter = new EventEmitter();
emitter.setMaxListeners(200);

const eventName = (runId: string) => `run:${runId}`;

export const publishRunEvent = (snapshot: AnalysisRunView) => {
  emitter.emit(eventName(snapshot.runId), snapshot);
};

export const subscribeToRunEvents = (
  runId: string,
  listener: (snapshot: AnalysisRunView) => void,
) => {
  emitter.on(eventName(runId), listener);
  return () => emitter.off(eventName(runId), listener);
};
