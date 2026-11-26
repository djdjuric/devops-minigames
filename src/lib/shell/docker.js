const NO_SUCH = (name) => `Error response from daemon: No such container: ${name}`;

export function fakeId(seed) {
  let hash = 2166136261;
  let out = "";
  for (let round = 0; out.length < 64; round++) {
    for (const char of `${seed}:${round}`) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619) >>> 0;
    }
    out += hash.toString(16).padStart(8, "0");
  }
  return out.slice(0, 64);
}

export function normalizeImage(name) {
  const last = name.split("/").pop();
  return last.includes(":") ? name : `${name}:latest`;
}

export function parseMemoryMb(text) {
  const match = /^(\d+)([kmg]?)b?$/i.exec(text);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (unit === "g") return value * 1024;
  if (unit === "k") return value / 1024;
  return value;
}

function table(headers, rows) {
  const widths = headers.map((header, i) => Math.max(header.length, ...rows.map((row) => String(row[i]).length)));
  const format = (row) =>
    row
      .map((cell, i) => String(cell).padEnd(widths[i]))
      .join("  ")
      .trimEnd();
  return [format(headers), ...rows.map(format)].join("\n");
}

export function createContainer(state, spec) {
  const container = {
    id: fakeId(`${spec.name}:${state.counter++}`),
    name: spec.name,
    image: normalizeImage(spec.image),
    status: "created",
    exitCode: 0,
    oomKilled: false,
    ports: spec.ports ?? [],
    env: spec.env ?? {},
    memoryMb: spec.memoryMb ?? null,
    mounts: spec.mounts ?? [],
    logs: spec.logs ?? [],
    age: spec.age ?? "a few seconds",
  };
  state.containers.push(container);
  return container;
}

// Decides how a container behaves when started, based on its image definition.
export function startContainer(state, container) {
  const image = state.images[container.image] ?? {};
  const fail = (code, logs, oom = false) => {
    container.status = "exited";
    container.exitCode = code;
    container.oomKilled = oom;
    container.logs = logs;
  };

  const missing = (image.requiredEnv ?? []).find((key) => !container.env[key]);
  if (missing) return fail(1, [`Starting ${container.image}`, `Error: ${missing} is not set`, "Exiting."]);

  if (image.minMemoryMb && container.memoryMb !== null && container.memoryMb < image.minMemoryMb) {
    return fail(137, [`Starting ${container.image}`, "Loading dataset into memory..."], true);
  }

  if (image.writableMount) {
    const mount = container.mounts.find((m) => m.dst === image.writableMount);
    if (mount?.readOnly) {
      return fail(1, [
        `FATAL:  could not create lock file "${image.writableMount}/postmaster.pid": Read-only file system`,
      ]);
    }
  }

  container.status = "running";
  container.exitCode = 0;
  container.oomKilled = false;
  container.logs = [`Starting ${container.image}`, `Listening on :${image.port ?? 80}`, "Ready to accept connections"];
  return undefined;
}

function findContainer(state, ref) {
  return state.containers.find((c) => c.name === ref || c.id.startsWith(ref));
}

function portsText(container) {
  if (container.status !== "running") return "";
  return container.ports.map((p) => `0.0.0.0:${p.host}->${p.container}/tcp`).join(", ");
}

function statusText(container) {
  if (container.status === "running") return `Up ${container.age}`;
  return `Exited (${container.exitCode}) ${container.age} ago`;
}

function ps(state, args) {
  const all = args.includes("-a") || args.includes("--all");
  const quiet = args.includes("-q");
  const list = state.containers.filter((c) => all || c.status === "running");
  if (quiet) return { out: list.map((c) => c.id.slice(0, 12)).join("\n") };
  const rows = list.map((c) => [c.id.slice(0, 12), c.image, '"/entrypoint.sh"', `${c.age} ago`, statusText(c), portsText(c), c.name]);
  return { out: table(["CONTAINER ID", "IMAGE", "COMMAND", "CREATED", "STATUS", "PORTS", "NAMES"], rows) };
}

function images(state) {
  const rows = Object.entries(state.images).map(([name, def]) => {
    const [repo, tag] = [name.slice(0, name.lastIndexOf(":")), name.slice(name.lastIndexOf(":") + 1)];
    return [repo, tag, fakeId(name).slice(0, 12), def.age ?? "2 weeks ago", def.size ?? "120MB"];
  });
  return { out: table(["REPOSITORY", "TAG", "IMAGE ID", "CREATED", "SIZE"], rows) };
}

function logs(state, args) {
  let tail = null;
  const rest = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--tail") tail = Number(args[++i]);
    else if (args[i].startsWith("--tail=")) tail = Number(args[i].slice(7));
    else if (!args[i].startsWith("-")) rest.push(args[i]);
  }
  if (!rest[0]) return { out: '"docker logs" requires exactly 1 argument.', error: true };
  const container = findContainer(state, rest[0]);
  if (!container) return { out: NO_SUCH(rest[0]), error: true };
  const lines = Number.isInteger(tail) && tail >= 0 ? container.logs.slice(-tail || undefined) : container.logs;
  return { out: tail === 0 ? "" : lines.join("\n") };
}

function inspect(state, args) {
  const ref = args.find((a) => !a.startsWith("-"));
  if (!ref) return { out: '"docker inspect" requires at least 1 argument.', error: true };
  const c = findContainer(state, ref);
  if (!c) return { out: `Error: No such object: ${ref}`, error: true };
  const doc = [
    {
      Id: c.id,
      Name: `/${c.name}`,
      State: {
        Status: c.status,
        Running: c.status === "running",
        OOMKilled: c.oomKilled,
        ExitCode: c.exitCode,
      },
      Config: { Image: c.image, Env: Object.entries(c.env).map(([k, v]) => `${k}=${v}`) },
      HostConfig: {
        Memory: c.memoryMb === null ? 0 : Math.round(c.memoryMb * 1024 * 1024),
        PortBindings: Object.fromEntries(
          c.ports.map((p) => [`${p.container}/tcp`, [{ HostIp: "", HostPort: String(p.host) }]]),
        ),
      },
      Mounts: c.mounts.map((m) => ({ Source: m.src, Destination: m.dst, RW: !m.readOnly })),
    },
  ];
  return { out: JSON.stringify(doc, null, 4) };
}

function stats(state) {
  const rows = state.containers
    .filter((c) => c.status === "running")
    .map((c) => [
      c.id.slice(0, 12),
      c.name,
      "0.20%",
      c.memoryMb === null ? "48MiB / 7.6GiB" : `48MiB / ${c.memoryMb}MiB`,
    ]);
  return { out: table(["CONTAINER ID", "NAME", "CPU %", "MEM USAGE / LIMIT"], rows) };
}

function parseRun(args) {
  const spec = { ports: [], env: {}, mounts: [], memoryMb: null, name: null, image: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const value = () => (arg.includes("=") ? arg.slice(arg.indexOf("=") + 1) : args[++i]);
    if (spec.image) break;
    if (arg === "-d" || arg === "--detach" || arg === "--rm" || arg === "-it" || arg === "-i" || arg === "-t") continue;
    if (arg === "--name" || arg.startsWith("--name=")) spec.name = value();
    else if (arg === "-p" || arg === "--publish") {
      const [host, container] = (value() ?? "").split(":");
      if (!/^\d+$/.test(host ?? "") || !/^\d+$/.test(container ?? "")) {
        return { error: `docker: invalid publish opts format (should be hostPort:containerPort).` };
      }
      spec.ports.push({ host: Number(host), container: Number(container) });
    } else if (arg === "-e" || arg === "--env") {
      const pair = value() ?? "";
      const eq = pair.indexOf("=");
      if (eq < 1) return { error: `docker: invalid env '${pair}' (use KEY=value).` };
      spec.env[pair.slice(0, eq)] = pair.slice(eq + 1);
    } else if (arg === "-m" || arg === "--memory" || arg.startsWith("--memory=")) {
      const mb = parseMemoryMb(value() ?? "");
      if (mb === null) return { error: "docker: invalid memory format (examples: 512m, 1g)." };
      spec.memoryMb = mb;
    } else if (arg === "-v" || arg === "--volume") {
      const [src, dst, mode] = (value() ?? "").split(":");
      if (!src || !dst) return { error: "docker: invalid volume spec (use source:destination[:ro])." };
      spec.mounts.push({ src, dst, readOnly: mode === "ro" });
    } else if (arg.startsWith("-")) {
      return { error: `unknown flag: ${arg}\nSee 'docker run --help'.` };
    } else spec.image = arg;
  }
  if (!spec.image) return { error: `"docker run" requires at least 1 argument.` };
  return { spec };
}

function run(state, args) {
  const parsed = parseRun(args);
  if (parsed.error) return { out: parsed.error, error: true };
  const { spec } = parsed;
  const imageName = normalizeImage(spec.image);

  if (!state.images[imageName]) {
    const repo = spec.image.split(":")[0];
    return {
      out: [
        `Unable to find image '${imageName}' locally`,
        `docker: Error response from daemon: pull access denied for ${repo}, repository does not exist or may require 'docker login'.`,
      ].join("\n"),
      error: true,
    };
  }

  spec.name = spec.name ?? `container_${state.counter}`;
  const existing = state.containers.find((c) => c.name === spec.name);
  if (existing) {
    return {
      out: `docker: Error response from daemon: Conflict. The container name "/${spec.name}" is already in use by container "${existing.id}". You have to remove (or rename) that container to be able to reuse that name.`,
      error: true,
    };
  }

  const clash = spec.ports.find((p) =>
    state.containers.some((c) => c.status === "running" && c.ports.some((q) => q.host === p.host)),
  );
  if (clash) {
    return {
      out: `docker: Error response from daemon: driver failed programming external connectivity on endpoint ${spec.name}: Bind for 0.0.0.0:${clash.host} failed: port is already allocated.`,
      error: true,
    };
  }

  const container = createContainer(state, { ...spec, image: imageName });
  startContainer(state, container);
  return { out: container.id };
}

function lifecycle(state, verb, args) {
  const force = args.includes("-f") || args.includes("--force");
  const refs = args.filter((a) => !a.startsWith("-"));
  if (refs.length === 0) return { out: `"docker ${verb}" requires at least 1 argument.`, error: true };
  const lines = [];
  let failed = false;
  for (const ref of refs) {
    const container = findContainer(state, ref);
    if (!container) {
      lines.push(NO_SUCH(ref));
      failed = true;
      continue;
    }
    if (verb === "stop" && container.status === "running") {
      container.status = "exited";
      container.exitCode = 0;
      container.logs = [...container.logs, "Received SIGTERM, shutting down"];
    } else if (verb === "start" || verb === "restart") {
      if (verb === "restart" && container.status === "running") container.status = "exited";
      const conflict = container.ports.find((p) =>
        state.containers.some((c) => c !== container && c.status === "running" && c.ports.some((q) => q.host === p.host)),
      );
      if (conflict) {
        lines.push(`Error response from daemon: driver failed programming external connectivity: Bind for 0.0.0.0:${conflict.host} failed: port is already allocated`);
        failed = true;
        continue;
      }
      startContainer(state, container);
    } else if (verb === "rm") {
      if (container.status === "running" && !force) {
        lines.push(
          `Error response from daemon: cannot remove container "/${container.name}": container is running: stop the container before removing or force remove`,
        );
        failed = true;
        continue;
      }
      state.containers.splice(state.containers.indexOf(container), 1);
    }
    lines.push(ref);
  }
  return { out: lines.join("\n"), error: failed };
}

export function runDocker(state, args) {
  const [sub, ...rest] = args;
  switch (sub) {
    case undefined:
      return { out: "Usage:  docker [OPTIONS] COMMAND\n\nCommon commands: ps, logs, inspect, run, start, stop, restart, rm, images, stats" };
    case "ps":
      return ps(state, rest);
    case "images":
      return images(state);
    case "logs":
      return logs(state, rest);
    case "inspect":
      return inspect(state, rest);
    case "stats":
      return stats(state);
    case "run":
      return run(state, rest);
    case "stop":
    case "start":
    case "restart":
    case "rm":
      return lifecycle(state, sub, rest);
    default:
      return { out: `docker: '${sub}' is not supported in this lab. Try: ps, logs, inspect, run, start, stop, restart, rm, images, stats`, error: true };
  }
}
