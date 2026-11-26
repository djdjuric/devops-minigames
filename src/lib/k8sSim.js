const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || min));

export function normalizeConfig(config) {
  return {
    replicas: clamp(config.replicas, 1, 6),
    memoryRequest: clamp(config.memoryRequest, 32, 2048),
    memoryLimit: clamp(config.memoryLimit, 32, 2048),
    readinessPath: String(config.readinessPath || "/"),
    maxUnavailable: clamp(config.maxUnavailable, 0, 6),
    maxSurge: clamp(config.maxSurge, 0, 6),
  };
}

export function simulateDeployment(level, rawConfig) {
  const config = normalizeConfig(rawConfig);
  const pods = Array.from({ length: config.replicas }, (_, index) => {
    const memoryOk = config.memoryLimit >= level.memoryNeeded;
    const ready = memoryOk && config.readinessPath === level.healthPath;
    return {
      id: `pod-${index + 1}`,
      memoryOk,
      ready,
      state: !memoryOk ? "OOMKilled" : ready ? "Ready" : "NotReady",
    };
  });
  const readyPods = pods.filter((pod) => pod.ready).length;
  const capacity = readyPods * level.requestsPerPod;
  const trafficOk = capacity >= level.traffic;
  const requestOk = config.memoryRequest >= level.minimumRequest;
  const resourceOrderOk = config.memoryLimit >= config.memoryRequest;
  const rolloutCapacity = Math.max(0, config.replicas - config.maxUnavailable + config.maxSurge);
  const rolloutOk = !level.requireZeroDowntime || (config.maxUnavailable === 0 && rolloutCapacity >= level.minimumReady);

  const checks = [
    { id: "pods", label: "Pods become Ready", pass: readyPods === config.replicas },
    { id: "traffic", label: `Capacity handles ${level.traffic} req/s`, pass: trafficOk },
    { id: "request", label: "Memory request is realistic", pass: requestOk },
    { id: "limits", label: "Memory limit is not below the request", pass: resourceOrderOk },
  ];
  if (level.requireZeroDowntime) {
    checks.push({ id: "rollout", label: "Rolling update keeps capacity online", pass: rolloutOk });
  }

  return {
    config,
    pods,
    readyPods,
    capacity,
    rolloutCapacity,
    checks,
    solved: checks.every((check) => check.pass),
  };
}

export function simulationScore(attempts, hintsUsed) {
  return Math.max(10, 100 - Math.max(0, attempts - 1) * 15 - hintsUsed * 20);
}
