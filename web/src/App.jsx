import { useEffect, useRef, useState, useCallback } from "react";
import * as api from "./api/client.js";
import Overlay from "./components/Overlay.jsx";
import EntryScreen from "./screens/EntryScreen.jsx";
import QuizScreen from "./screens/QuizScreen.jsx";
import LayoutModeScreen from "./screens/LayoutModeScreen.jsx";
import InspireScreen from "./screens/InspireScreen.jsx";
import PersonaScreen from "./screens/PersonaScreen.jsx";
import ReportScreen from "./report/ReportScreen.jsx";
import { SelectionProvider } from "./lib/selection.jsx";
import { layoutScore } from "./lib/turn.js";

let _mid = 0;
const nextId = () => ++_mid;

const ACTION_LABELS = {
  analyze:         "comfort scored",
  detect:          "conflicts detected",
  full:            "full analysis",
  edit:            "change applied",
  topologic:       "topology mapped",
  biophilic:       "biophilic audit",
  compare:         "personas compared",
  follow_up:       "follow-up",
  overview:        "room overview",
  chitchat:        "chat",
};

function avgScore(scores_json) {
  try { return layoutScore(JSON.parse(scores_json).rooms || []); }
  catch { return null; }
}

function conflictCount(conflicts_json) {
  try { return (JSON.parse(conflicts_json).flaggedRooms || []).length; }
  catch { return 0; }
}

export default function App() {
  const [screen, setScreen]       = useState(null); // nothing renders until /api/init routes us
  const [overlay, setOverlay]     = useState("starting sensi...");
  const [demoMode, setDemoMode]   = useState(false);
  const [persona, setPersona]     = useState(null);
  const [layoutId, setLayoutId]   = useState(null);
  const [layoutVersion, setLayoutVersion] = useState(0); // bumped after edits to force a plan re-fetch
  const [thinking, setThinking]   = useState(false);
  const [entryData, setEntryData] = useState(null);   // /api/init payload parked while the entry page shows
  const [user, setUser]           = useState(null);   // {sub, email, name} when signed in with Google
  const [authClientId, setAuthClientId] = useState("");

  // Quiz
  const [quizMessages, setQuizMessages] = useState([]);
  const [quizStep, setQuizStep]         = useState(0);

  // Layout mode: flat chat messages + structured turn history
  const [chatMessages, setChatMessages] = useState([]);
  const [turns, setTurns]               = useState([]);

  // Checkpoints (Task 3): committed milestones + uncommitted working-draft status
  const [checkpoints, setCheckpoints]         = useState([]);
  const [hasUncommitted, setHasUncommitted]   = useState(false);
  const [uncommittedDelta, setUncommittedDelta] = useState({});
  const [liveHead, setLiveHead]               = useState(null); // uncommitted draft as a graph point
  const [viewedTurn, setViewedTurn]           = useState(null); // a checkpoint being reviewed

  // Inspire / persona
  const [inspireMessage, setInspireMessage]   = useState("");
  const [personaMessage, setPersonaMessage]   = useState("");
  const [moodboardUrls, setMoodboardUrls]     = useState([]);

  const started = useRef(false);
  const [streaming, setStreaming] = useState(false); // a chat turn is streaming
  const abortRef = useRef(null);                     // AbortController for the live turn

  // existingId: when a streaming turn already created a live assistant bubble, finalize
  // THAT message instead of pushing a duplicate. Non-streaming callers omit it.
  const routeResponse = useCallback((data, existingId = null) => {
    setThinking(false);
    setOverlay(null);

    if (data.screen === "quiz") {
      setScreen("quiz");
      setQuizMessages((m) => [...m, { id: nextId(), role: "s", text: data.message }]);
      setQuizStep(data.quiz_step || 0);

    } else if (data.screen === "inspire") {
      setScreen("inspire");
      setInspireMessage(data.message || "");

    } else if (data.screen === "chat") {
      const newLayoutId = data.layout_id || null;
      setLayoutId(newLayoutId);
      // An edit tool mutated the layout (e.g. added furniture) — force the plan
      // canvas to re-fetch so the change actually renders.
      if (data.layout_updated) setLayoutVersion((v) => v + 1);
      setScreen("chat");

      // Push to the flat chat thread — or finalize the live streaming bubble in place.
      if (existingId != null) {
        setChatMessages((m) => m.map((msg) => msg.id === existingId
          ? { ...msg, text: data.message, data, streaming: false, tokensStarted: true }
          : msg));
      } else {
        setChatMessages((m) => [...m, { id: nextId(), role: "s", text: data.message, data }]);
      }

      // Checkpoint state rides along on every turn
      if (data.checkpoints) setCheckpoints(data.checkpoints);
      setHasUncommitted(!!data.has_uncommitted);
      setUncommittedDelta(data.uncommitted_delta || {});
      setLiveHead(data.live_head ?? null);

      // Normalize edit diffs to an array once, so every downstream consumer can
      // trust turn.layout_diffs is always an array (single-edit → 1-element array).
      const diffs = data.layout_diffs?.length
        ? data.layout_diffs
        : (data.layout_diff && Object.keys(data.layout_diff).length ? [data.layout_diff] : []);
      const isMultiEdit = data.action === "edit" && diffs.length > 1;

      // Push to structured turn history when this turn has analysis data
      if (data.scores_json || data.graph_data || data.biophilic_data || diffs.length || data.preview_scores_json) {
        setTurns((prev) => [...prev, {
          id:             nextId(),
          action:         data.action || "",
          label:          isMultiEdit ? `${diffs.length} changes`
                            : (ACTION_LABELS[data.action] || data.action || "turn"),
          scores_json:    data.scores_json    || "",
          conflicts_json: data.conflicts_json || "",
          suggestions_json: data.suggestions_json || "",
          score_interpretation: data.score_interpretation || "",
          conflict_reasoning:   data.conflict_reasoning   || "",
          suggestion_critique:  data.suggestion_critique  || "",
          layout_diff:    data.layout_diff    || {},
          layout_diffs:   diffs,
          preview_scores_json: data.preview_scores_json || "",
          preview_diff:   data.preview_diff   || {},
          preview_summary: data.preview_summary || "",
          graph_data:     data.graph_data     || {},
          biophilic_data: data.biophilic_data || {},
          persona_comparison_data: data.persona_comparison_data || {},
          avgScore:       avgScore(data.scores_json),
          conflictCount:  conflictCount(data.conflicts_json),
          timestamp:      Date.now(),
        }]);
      }
    }
  }, []);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    api.init()
      .then((data) => {
        setOverlay(null);
        setUser(data.user || null);
        setDemoMode(!!data.demo);
        setAuthClientId(data.auth_client_id || "");
        if (data.screen === "chat") {
          if (data.persona) setPersona(data.persona);
          setLayoutId(data.layout_id || null);
          // Public demo, anonymous, no remembered choice → the entry page is the
          // front door: pick the guest persona or sign in to build your own.
          if (data.demo && !data.user && localStorage.getItem("sensi_entry_choice") !== "wren") {
            setEntryData(data);
            setScreen("entry");
            try { history.replaceState({ sensi: "entry" }, ""); } catch { /* sandboxed */ }
          } else {
            setScreen("chat");
            setChatMessages([{ id: nextId(), role: "s", text: data.message }]);
            try { history.replaceState({ sensi: "chat" }, ""); } catch { /* sandboxed */ }
          }
        } else {
          setScreen("quiz");
          // Signed in with no persona yet: bridge from the Google click into the
          // quiz, instead of a bare "who are you?" that ignores the account.
          if (data.user) {
            setQuizMessages([{ id: nextId(), role: "s",
              text: `Welcome, ${data.user.name || "there"}. Let's build your comfort persona: ` +
                    `seven quick steps, about two minutes, saved to your account. ` +
                    `First, what should I call you?` }]);
          } else {
            setQuizMessages([{ id: nextId(), role: "s", text: data.message }]);
          }
          setQuizStep(data.quiz_step || 0);
        }
      })
      .catch((err) => {
        setOverlay(null);
        setQuizMessages([{ id: nextId(), role: "s", text: "Could not reach Sensi: " + err.message }]);
        setScreen("quiz");
      });
  }, []);

  // Browser back/forward walks between the entry page and the shape space, instead
  // of leaving the site — the two states pushed below are the only ones we own.
  useEffect(() => {
    const onPop = (e) => {
      const s = e.state?.sensi;
      if (s === "entry" || s === "chat") setScreen(s);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const submitQuiz = useCallback(async (text) => {
    setQuizMessages((m) => [...m, { id: nextId(), role: "u", text }]);
    setThinking(true);
    try {
      const data = await api.sendMessage(text);
      routeResponse(data);
    } catch (err) {
      setThinking(false);
      setQuizMessages((m) => [...m, { id: nextId(), role: "s", text: "Something went wrong — try again." }]);
    }
  }, [routeResponse]);

  const sendChat = useCallback(async (text) => {
    setViewedTurn(null); // a new message returns the panel to the live working draft
    const msgId = nextId();
    setChatMessages((m) => [...m,
      { id: nextId(), role: "u", text },
      { id: msgId, role: "s", text: "Thinking", streaming: true, tokensStarted: false },
    ]);

    const setMsg = (fn) => setChatMessages((m) => m.map((x) => (x.id === msgId ? fn(x) : x)));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setStreaming(true);

    try {
      await api.sendMessageStream(text, {
        // Progress labels show in the bubble ONLY until the answer starts streaming.
        onProgress: (p) => setMsg((x) => (x.tokensStarted ? x : { ...x, text: p.message })),
        // Fresh answer (also fires on the evaluator REVISE re-run) — reset the buffer.
        onMessageStart: () => setMsg((x) => ({ ...x, text: "", tokensStarted: true })),
        onToken: (t) => setMsg((x) => ({ ...x, text: x.text + t, tokensStarted: true })),
        // result carries the full payload — finalize panel/turns/checkpoints exactly
        // as the non-streaming path, updating this bubble in place.
        onResult: (data) => routeResponse(data, msgId),
        // Rate-limit refusals are polite by design — show them as-is, not as failures.
        onError: (msg, info) => setMsg((x) => ({
          ...x, streaming: false, tokensStarted: true,
          text: info?.kind === "rate_limit"
            ? msg
            : "Something went wrong — " + (msg || "try again").replace(/\.+$/, "") +
              ". Your message is above; rephrase or resend.",
        })),
      }, ctrl.signal);
    } catch (err) {
      const aborted = ctrl.signal.aborted;
      setMsg((x) => ({
        ...x, streaming: false, tokensStarted: true,
        text: aborted ? (x.text && x.text !== "Thinking" ? x.text + "\n\n(stopped)" : "Stopped.")
                      : "Something went wrong — try again.",
      }));
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [routeResponse]);

  const stopChat = useCallback(() => { abortRef.current?.abort(); }, []);

  const commitCheckpoint = useCallback(async (label) => {
    try {
      const d = await api.commit(label);
      if (d.ok) {
        if (d.checkpoints) setCheckpoints(d.checkpoints);
        setHasUncommitted(!!d.has_uncommitted);
        setUncommittedDelta({});
        setLiveHead(d.live_head ?? null);
      }
    } catch { /* leave uncommitted state as-is on failure */ }
  }, []);

  const viewCheckpoint = useCallback(async (id) => {
    try {
      const d = await api.viewCheckpoint(id);
      if (!d.ok) return;
      setViewedTurn({
        id: "cp" + d.id, checkpointId: d.id, action: "checkpoint", label: d.label,
        scores_json: d.scores_json || "", conflicts_json: d.conflicts_json || "",
        suggestions_json: d.suggestions_json || "",
      });
    } catch { /* ignore */ }
  }, []);
  const clearViewedCheckpoint = useCallback(() => setViewedTurn(null), []);

  const restoreCheckpoint = useCallback(async (id) => {
    try {
      const d = await api.restore(id);
      if (!d.ok) return;
      if (d.checkpoints) setCheckpoints(d.checkpoints);
      setHasUncommitted(!!d.has_uncommitted);
      setUncommittedDelta({});
      setLiveHead(d.live_head ?? null);
      setViewedTurn(null);
      setLayoutVersion((v) => v + 1); // working draft changed → re-fetch the canvas
      setChatMessages((m) => [...m, { id: nextId(), role: "s",
        text: `Restored to "${d.restored_label}" — the canvas now shows that checkpoint.` }]);
      // Always append the restore turn — even when the checkpoint carries no scores
      // (layout loaded → edited → restored, no analysis in between). The new turn is
      // what clears the previous edit's focus glow and score panel; skipping it left
      // the canvas contradicting the "restored" message.
      setTurns((prev) => [...prev, {
        id: nextId(), action: "restore", label: `restored: ${d.restored_label}`,
        scores_json: d.scores_json || "", conflicts_json: d.conflicts_json || "",
        suggestions_json: d.suggestions_json || "", layout_diff: {}, layout_diffs: [],
        avgScore: avgScore(d.scores_json), conflictCount: conflictCount(d.conflicts_json),
        timestamp: Date.now(),
      }]);
    } catch { /* ignore */ }
  }, []);

  const confirmPersona = useCallback(() => setScreen("chat"), []);
  const goReport = useCallback(() => setScreen("report"), []);

  // Refine the persona from a free-text statement ("I got a dog, noise bothers me more").
  // The backend patches + persists it; we update local state so the drawer card and all
  // subsequent scoring/answers use the new persona. Returns the confirmation line.
  const refinePersona = useCallback(async (text) => {
    const data = await api.refinePersona(text);
    if (data.persona) setPersona(data.persona);
    return data.message || "Updated your comfort profile.";
  }, []);

  // Start onboarding over: clear the persona + working state and return to the quiz.
  const redoOnboarding = useCallback(async () => {
    const data = await api.resetPersona();
    setPersona(null);
    setChatMessages([]);
    setTurns([]);
    setCheckpoints([]);
    setHasUncommitted(false);
    setUncommittedDelta({});
    setLiveHead(null);
    setQuizMessages([{ id: nextId(), role: "s", text: data.message }]);
    setQuizStep(data.quiz_step || 0);
    setScreen("quiz");
  }, []);

  // Entry page choices. Guest: remember it and walk into the parked chat payload —
  // Wren introduces herself as the first bubble (hello card: her line, her board,
  // a pick-a-layout chip). Returning home and back preserves the running chat.
  // Google: trade the ID token for a session cookie, then reload — /api/init now
  // routes by the signed-in user (their persona, or onboarding if none yet).
  const chooseGuest = useCallback(() => {
    localStorage.setItem("sensi_entry_choice", "wren");
    setScreen("chat");
    try { history.pushState({ sensi: "chat" }, ""); } catch { /* sandboxed */ }
    setChatMessages((m) => m.length ? m : [{
      id: nextId(), role: "s",
      text: entryData?.message || "",
      // The straight cut lands here, so she introduces herself in place: her
      // line, her board, and the first move as a chip.
      hello: {
        name: persona?.name || "Wren",
        line: `I'm ${persona?.name || "Wren"}. Warmth, soft light, a snug corner over an ` +
              `open plan: that's my brief. Pick a layout and watch what it does to me.`,
        board: (persona?.moodboard_urls || []).slice(0, 4),
      },
    }]);
  }, [entryData, persona]);

  // B1: the wordmark walks back to the front door; the chat stays warm underneath.
  const goHome = useCallback(() => {
    setScreen("entry");
    try { history.pushState({ sensi: "entry" }, ""); } catch { /* sandboxed */ }
  }, []);

  // "create your own persona" (guest drawer) — home, with the you-card called out.
  const [entryCallout, setEntryCallout] = useState(false);
  const goCreateOwn = useCallback(() => {
    setEntryCallout(true);
    setScreen("entry");
    try { history.pushState({ sensi: "entry" }, ""); } catch { /* sandboxed */ }
    setTimeout(() => setEntryCallout(false), 2600);
  }, []);

  // Signed-in visitors returning from the entry page — no reset, just walk back in.
  const continueSignedIn = useCallback(() => {
    setScreen("chat");
    try { history.pushState({ sensi: "chat" }, ""); } catch { /* sandboxed */ }
  }, []);

  // Escape hatch on the signed-in quiz: sign out and take the guest door instead.
  const exploreWrenInstead = useCallback(async () => {
    try { await api.authLogout(); } catch { /* cookie may already be gone */ }
    localStorage.setItem("sensi_entry_choice", "wren");
    api.clearSessionId();
    window.location.reload();
  }, []);

  const handleGoogleCredential = useCallback(async (credential) => {
    try {
      await api.authGoogle(credential);
      localStorage.removeItem("sensi_entry_choice");
      window.location.reload();
    } catch {
      /* stay on the entry page; the guest door still works */
    }
  }, []);

  const signOut = useCallback(async () => {
    try { await api.authLogout(); } catch { /* cookie may already be gone */ }
    localStorage.removeItem("sensi_entry_choice");
    api.clearSessionId();
    window.location.reload();
  }, []);

  return (
    <>
      <Overlay message={overlay} />

      {screen === "entry" && (
        <EntryScreen persona={user ? null : persona} clientId={authClientId} user={user}
          onGuest={chooseGuest} onGoogleCredential={handleGoogleCredential}
          onContinue={continueSignedIn} callout={entryCallout} />
      )}

      {screen === "quiz" && (
        <QuizScreen messages={quizMessages} step={quizStep} thinking={thinking} onSubmit={submitQuiz}
          user={user} defaultName={user?.name || ""}
          onExploreWren={demoMode ? exploreWrenInstead : null} />
      )}
      {screen === "inspire" && (
        <InspireScreen
          question={inspireMessage}
          setOverlay={setOverlay}
          onPersonaReady={(data) => {
            setPersona(data.persona || null);
            setPersonaMessage(data.message || "");
            setMoodboardUrls(data.moodboard_urls || []);
            setScreen("persona");
          }}
        />
      )}
      {screen === "persona" && (
        <PersonaScreen
          persona={persona} message={personaMessage} moodboardUrls={moodboardUrls}
          onConfirm={confirmPersona}
        />
      )}
      {screen === "chat" && (
        <SelectionProvider>
          <LayoutModeScreen
            messages={chatMessages}
            turns={turns}
            thinking={thinking}
            persona={persona}
            user={user}
            onSignOut={signOut}
            onHome={demoMode ? goHome : null}
            guest={demoMode && !user}
            onCreateOwn={demoMode && !user ? goCreateOwn : null}
            moodboardUrls={moodboardUrls.length ? moodboardUrls : (persona?.moodboard_urls || [])}
            onRefinePersona={refinePersona}
            onRedoOnboarding={redoOnboarding}
            layoutId={layoutId}
            layoutVersion={layoutVersion}
            onSend={sendChat}
            streaming={streaming}
            onStop={stopChat}
            onReport={goReport}
            checkpoints={checkpoints}
            hasUncommitted={hasUncommitted}
            uncommittedDelta={uncommittedDelta}
            liveHead={liveHead}
            onCommit={commitCheckpoint}
            onRestore={restoreCheckpoint}
            viewedTurn={viewedTurn}
            onViewCheckpoint={viewCheckpoint}
            onClearView={clearViewedCheckpoint}
          />
        </SelectionProvider>
      )}
      {screen === "report" && (
        <SelectionProvider>
          <ReportScreen
            turn={turns.length ? turns[turns.length - 1] : null}
            persona={persona}
            layoutId={layoutId}
            onBack={() => setScreen("chat")}
          />
        </SelectionProvider>
      )}
    </>
  );
}
