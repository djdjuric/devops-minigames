const running = (state, name) => state.containers.find((c) => c.name === name && c.status === "running");

function checkoutLogs() {
  const lines = [];
  for (let i = 0; i < 140; i++) {
    const second = String(i % 60).padStart(2, "0");
    const minute = String(Math.floor(i / 60) + 10).padStart(2, "0");
    const stamp = `2025-03-04T10:${minute}:${second}Z`;
    if (i % 17 === 5) {
      lines.push(`${stamp} ERROR payment call failed: connect to payments.internal:8443 timed out after 5000ms`);
    } else if (i % 29 === 7) {
      lines.push(`${stamp} WARN  cache miss for sku=${1000 + i}, falling back to catalog.internal:9200`);
    } else if (i % 2 === 0) {
      lines.push(`${stamp} INFO  order ${40000 + i} created for customer ${200 + (i % 13)}`);
    } else {
      lines.push(`${stamp} INFO  GET /cart/${300 + i} 200 ${12 + (i % 9)}ms`);
    }
  }
  return lines;
}

export const shellLevels = [
  {
    id: "missing-env",
    title: "The container that will not stay up",
    topic: "Docker",
    brief:
      "The api container keeps dying right after it starts. Find out why and get it running on port 8080 with DATABASE_URL set to postgres://db.internal/app.",
    goal: "A container named api is running with DATABASE_URL set.",
    par: 4,
    images: { "myapp:1.0": { requiredEnv: ["DATABASE_URL"], port: 8080 } },
    files: { "run-api.sh": "docker run -d --name api -p 8080:8080 myapp:1.0" },
    containers: [{ name: "api", image: "myapp:1.0", status: "exited", exitCode: 1, ports: [{ host: 8080, container: 8080 }], age: "5 minutes", logs: ["Starting myapp:1.0", "Error: DATABASE_URL is not set", "Exiting."] }],
    hints: [
      "Stopped containers do not show up in docker ps unless you add a flag.",
      "docker logs api tells you what the app complained about.",
      "A container's environment is fixed when it is created. Remove it and run it again with -e KEY=value.",
    ],
    solution: ["docker rm api", "docker run -d --name api -p 8080:8080 -e DATABASE_URL=postgres://db.internal/app myapp:1.0"],
    isSolved: (state) => Boolean(running(state, "api")?.env.DATABASE_URL),
    learned: "Read the logs first. Exit code 1 plus a clear message is usually configuration. Environment variables cannot be changed on an existing container, so you recreate it.",
    doc: "https://docs.docker.com/reference/cli/docker/container/run/#env",
  },
  {
    id: "port-clash",
    title: "Port 80 is already taken",
    topic: "Docker",
    brief:
      "Deploy a new nginx container named web that serves the site on host port 80. The deploy script fails. The old site can be retired.",
    goal: "A container named web (nginx:1.27) is running and publishes host port 80.",
    par: 4,
    images: { "nginx:1.27": { port: 80 } },
    files: { "deploy.sh": "docker run -d --name web -p 80:80 nginx:1.27" },
    containers: [{ name: "old-web", image: "nginx:1.27", status: "running", ports: [{ host: 80, container: 80 }], age: "3 weeks" }],
    hints: [
      "Try the deploy command and read the error. Then find out who owns port 80.",
      "docker ps shows the PORTS column for each running container.",
      "Stop the container that holds port 80, then run the deploy command again.",
    ],
    solution: ["docker stop old-web", "docker run -d --name web -p 80:80 nginx:1.27"],
    isSolved: (state) => {
      const web = running(state, "web");
      return Boolean(web?.ports.some((p) => p.host === 80));
    },
    learned: "A host port can be bound by only one container at a time. docker ps shows who has it, and you can either stop that container or publish on another host port.",
    doc: "https://docs.docker.com/engine/containers/run/#exposed-ports",
  },
  {
    id: "oom",
    title: "Killed with exit code 137",
    topic: "Docker",
    brief:
      "The worker container dies a few seconds after each start. Figure out why and bring it back so it can run. The worker needs about 256 MB of memory to load its dataset.",
    goal: "A container named worker is running with enough memory.",
    par: 4,
    images: { "worker:2.1": { minMemoryMb: 256, port: 9000 } },
    files: { "run-worker.sh": "docker run -d --name worker -m 64m worker:2.1" },
    containers: [{ name: "worker", image: "worker:2.1", status: "exited", exitCode: 137, oomKilled: true, memoryMb: 64, age: "2 minutes", logs: ["Starting worker:2.1", "Loading dataset into memory..."] }],
    hints: [
      "Exit code 137 is 128 + 9, which means the process received SIGKILL.",
      "docker inspect worker | grep -i -E 'oom|memory'",
      "OOMKilled is true and the limit is 64 MB. Recreate the container with a bigger -m value.",
    ],
    solution: ["docker rm worker", "docker run -d --name worker -m 512m worker:2.1"],
    isSolved: (state) => {
      const worker = running(state, "worker");
      return Boolean(worker && (worker.memoryMb === null || worker.memoryMb >= 256));
    },
    learned: "Exit code 137 plus OOMKilled=true in docker inspect means the kernel killed the process at its memory limit. Raise the limit or fix the leak.",
    doc: "https://docs.docker.com/engine/containers/resource_constraints/#limit-a-containers-access-to-memory",
  },
  {
    id: "image-tag",
    title: "The image that does not exist",
    topic: "Docker",
    brief:
      "The release script cannot start the app container. Deploy the newest version of myorg/app that is available on this machine under the name app.",
    goal: "A container named app is running the newest local myorg/app tag.",
    par: 4,
    images: { "myorg/app:1.1": { port: 3000, age: "3 weeks ago" }, "myorg/app:1.2": { port: 3000, age: "2 days ago" } },
    files: { "release.sh": "docker run -d --name app myorg/app:latest" },
    containers: [],
    hints: [
      "Run the release command and read the error. The tag latest does not exist locally or in a registry you can reach.",
      "docker images lists the tags that are available on this machine.",
      "Use the highest version tag with docker run.",
    ],
    solution: ["docker run -d --name app myorg/app:1.2"],
    isSolved: (state) => running(state, "app")?.image === "myorg/app:1.2",
    learned: "The latest tag is only a default name. If nobody pushed or tagged it, it does not exist. Pin explicit version tags in deploys.",
    doc: "https://docs.docker.com/reference/cli/docker/image/ls/",
  },
  {
    id: "log-hunt",
    title: "Find the failing dependency",
    topic: "Logs",
    brief:
      "Checkout is slow and some payments fail. The checkout container has a lot of log noise. Find which host the payment calls are timing out against.",
    goal: "Submit the hostname with: answer <hostname>",
    par: 3,
    answer: true,
    images: { "checkout:3.4": { port: 8080 } },
    files: {},
    containers: [{ name: "checkout", image: "checkout:3.4", status: "running", ports: [{ host: 8080, container: 8080 }], age: "4 days", logs: checkoutLogs() }],
    hints: [
      "Do not read every line. Filter for the severity you care about.",
      "docker logs checkout | grep ERROR",
      "The error line names the host and port that timed out. Submit only the hostname.",
    ],
    solution: ["docker logs checkout | grep ERROR | tail -n 3", "answer payments.internal"],
    isSolved: (state) => /payments\.internal/i.test(state.answer ?? ""),
    learned: "Filter with grep, narrow with head and tail, and count with wc -l. Warnings about other hosts are a distraction. The repeating ERROR is the signal.",
    doc: "https://docs.docker.com/reference/cli/docker/container/logs/",
  },
  {
    id: "readonly-mount",
    title: "Database cannot write to its data directory",
    topic: "Docker",
    brief:
      "The db container exits immediately. Someone changed how the data volume is mounted. Get Postgres running again with the same data directory mounted from /srv/pgdata.",
    goal: "A container named db is running with /var/lib/postgresql/data mounted read-write.",
    par: 5,
    images: { "postgres:16": { port: 5432, writableMount: "/var/lib/postgresql/data" } },
    files: { "start-db.sh": "docker run -d --name db -v /srv/pgdata:/var/lib/postgresql/data:ro postgres:16" },
    containers: [
      {
        name: "db",
        image: "postgres:16",
        status: "exited",
        exitCode: 1,
        age: "10 minutes",
        mounts: [{ src: "/srv/pgdata", dst: "/var/lib/postgresql/data", readOnly: true }],
        logs: ['FATAL:  could not create lock file "/var/lib/postgresql/data/postmaster.pid": Read-only file system'],
      },
    ],
    hints: [
      "Read the logs. Which part of the message names the real cause?",
      "docker inspect db shows Mounts with an RW flag for each one.",
      "Remove the container and run it again with the same -v but without the :ro suffix.",
    ],
    solution: ["docker rm db", "docker run -d --name db -v /srv/pgdata:/var/lib/postgresql/data postgres:16"],
    isSolved: (state) => {
      const db = running(state, "db");
      return Boolean(db?.mounts.some((m) => m.dst === "/var/lib/postgresql/data" && !m.readOnly));
    },
    learned: "A :ro suffix mounts a volume read-only. Databases need write access to their data directory. docker inspect shows RW for each mount.",
    doc: "https://docs.docker.com/engine/storage/bind-mounts/#use-a-read-only-bind-mount",
  },
];
