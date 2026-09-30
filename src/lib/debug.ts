// lib/debug.ts
// One switch for all bill/PO flow logs.
// Turn on in the browser console:  localStorage.setItem("flowDebug", "1")  then refresh.
// Turn off:                        localStorage.removeItem("flowDebug")
const isOn = () =>
  typeof window !== "undefined" && window.localStorage.getItem("flowDebug") === "1";
 
/**
 * Stage codes (read the console top to bottom):
 *  F1 form mounted      F2 field typed       F3 form reset        F4 form submit (raw)
 *  P1 page got payload  P2 page got result
 *  H1 hook mutationFn   H2 hook onSuccess
 *  A1 api received      A2 api payload sent  A3 row the DB returned
 */
export function flow(stage: string, data?: unknown) {
  if (!isOn()) return;
  // eslint-disable-next-line no-console
  console.log(`%c[FLOW ${stage}]`, "color:#4f46e5;font-weight:bold", data ?? "");
}
 
