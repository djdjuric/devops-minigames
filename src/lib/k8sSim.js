export function initialMissionState() {
  return { stepIndex: 0, mistakes: 0, hintsUsed: 0, selection: null, solved: false };
}

export function currentStep(level, state) {
  return level.steps[state.stepIndex];
}

export function chooseAction(level, state, actionId) {
  if (state.solved || state.selection) return state;
  const step = currentStep(level, state);
  const selected = step.actions.find((action) => action.id === actionId);
  if (!selected) throw new Error(`Unknown action: ${actionId}`);
  return {
    ...state,
    mistakes: state.mistakes + (selected.good ? 0 : 1),
    selection: selected,
  };
}

export function continueMission(level, state) {
  if (!state.selection) return state;
  if (!state.selection.good) return { ...state, selection: null };
  const last = state.stepIndex + 1 >= level.steps.length;
  return last
    ? { ...state, selection: null, solved: true }
    : { ...state, stepIndex: state.stepIndex + 1, selection: null };
}

export function revealHint(level, state) {
  if (state.hintsUsed >= level.hints.length) return state;
  return { ...state, hintsUsed: state.hintsUsed + 1 };
}

export function missionScore(state) {
  return Math.max(10, 100 - state.mistakes * 15 - state.hintsUsed * 20);
}

export function displayedScene(level, state) {
  const base = currentStep(level, state)?.scene ?? level.steps.at(-1).scene;
  return state.selection?.result ? { ...base, ...state.selection.result } : base;
}
