import { test } from "node:test";
import assert from "node:assert/strict";
import { k8sLevels } from "../src/data/k8sLevels.js";
import {
  chooseAction,
  continueMission,
  currentStep,
  displayedScene,
  initialMissionState,
  missionScore,
  revealHint,
} from "../src/lib/k8sSim.js";

test("every Kubernetes scenario has valid steps and exactly one safe action", () => {
  assert.equal(k8sLevels.length, 6);
  for (const level of k8sLevels) {
    assert.equal(level.steps.length, 2, level.id);
    assert.ok(level.doc.startsWith("https://"));
    assert.ok(level.hints.length >= 2);
    for (const step of level.steps) {
      assert.equal(step.actions.filter((action) => action.good).length, 1, `${level.id}/${step.id}`);
      assert.ok(step.scene.pods.length > 0);
      assert.ok(step.scene.events.length > 0);
      assert.ok(step.actions.every((action) => action.outcome && action.result));
    }
  }
});

test("reference safe actions complete every scenario", () => {
  for (const level of k8sLevels) {
    let state = initialMissionState();
    for (const step of level.steps) {
      assert.equal(currentStep(level, state).id, step.id);
      const safe = step.actions.find((action) => action.good);
      state = chooseAction(level, state, safe.id);
      assert.equal(state.selection.good, true);
      assert.deepEqual(displayedScene(level, state), { ...step.scene, ...safe.result });
      state = continueMission(level, state);
    }
    assert.equal(state.solved, true, level.id);
    assert.equal(missionScore(state), 100);
  }
});

test("unsafe action records a mistake and allows recovery", () => {
  const level = k8sLevels[0];
  let state = initialMissionState();
  const unsafe = level.steps[0].actions.find((action) => !action.good);
  state = chooseAction(level, state, unsafe.id);
  assert.equal(state.mistakes, 1);
  assert.equal(state.stepIndex, 0);
  state = continueMission(level, state);
  assert.equal(state.selection, null);
  assert.equal(state.stepIndex, 0);
  assert.equal(missionScore(state), 85);
});

test("actions cannot change while feedback is being shown", () => {
  const level = k8sLevels[0];
  const safe = level.steps[0].actions.find((action) => action.good);
  const first = chooseAction(level, initialMissionState(), safe.id);
  assert.equal(chooseAction(level, first, "recreate"), first);
  assert.throws(() => chooseAction(level, initialMissionState(), "missing"), /Unknown action/);
});

test("hints reduce score and stop at the available count", () => {
  const level = k8sLevels[0];
  let state = initialMissionState();
  state = revealHint(level, state);
  state = revealHint(level, state);
  state = revealHint(level, state);
  assert.equal(state.hintsUsed, 2);
  assert.equal(missionScore(state), 60);
  assert.equal(missionScore({ ...state, mistakes: 99 }), 10);
});
