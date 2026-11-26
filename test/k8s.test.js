import { test } from "node:test";
import assert from "node:assert/strict";
import { k8sLevels } from "../src/data/k8sLevels.js";
import { normalizeConfig, simulateDeployment, simulationScore } from "../src/lib/k8sSim.js";

test("normalizes unsafe values", () => {
  const c = normalizeConfig({ replicas: 99, memoryRequest: 0, memoryLimit: -1, readinessPath: "", maxUnavailable: -2, maxSurge: 9 });
  assert.equal(c.replicas, 6);
  assert.equal(c.memoryRequest, 32);
  assert.equal(c.memoryLimit, 32);
  assert.equal(c.readinessPath, "/");
  assert.equal(c.maxUnavailable, 0);
  assert.equal(c.maxSurge, 6);
});

for (const level of k8sLevels) {
  test(`${level.id}: initial deployment fails and a valid configuration passes`, () => {
    assert.equal(simulateDeployment(level, level.initial).solved, false);
    const valid = {
      replicas: Math.ceil(level.traffic / level.requestsPerPod),
      memoryRequest: Math.max(level.minimumRequest, 256),
      memoryLimit: Math.max(level.memoryNeeded, level.minimumRequest, 512),
      readinessPath: level.healthPath,
      maxUnavailable: 0,
      maxSurge: 1,
    };
    const result = simulateDeployment(level, valid);
    assert.equal(result.solved, true, result.checks.filter((c) => !c.pass).map((c) => c.label).join(", "));
    assert.equal(result.readyPods, valid.replicas);
  });
}

test("wrong readiness path keeps pods out of endpoints", () => {
  const level = k8sLevels[0];
  const result = simulateDeployment(level, { ...level.initial, readinessPath: "/wrong" });
  assert.equal(result.readyPods, 0);
  assert.ok(result.pods.every((pod) => pod.state === "NotReady"));
});

test("memory limit causes OOMKilled", () => {
  const level = k8sLevels.find((item) => item.id === "oom");
  const result = simulateDeployment(level, level.initial);
  assert.ok(result.pods.every((pod) => pod.state === "OOMKilled"));
});

test("scoring penalizes retries and hints but has a floor", () => {
  assert.equal(simulationScore(1, 0), 100);
  assert.equal(simulationScore(2, 1), 65);
  assert.equal(simulationScore(99, 99), 10);
});
