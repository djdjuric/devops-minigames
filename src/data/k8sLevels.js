const DEPLOY_DOC = "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/";
const SERVICE_DOC = "https://kubernetes.io/docs/concepts/services-networking/service/";
const HPA_DOC = "https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/";

const pod = (name, version, state, zone = "zone-a") => ({ name, version, state, zone });
const action = (id, label, good, outcome, result) => ({ id, label, good, outcome, result });

export const k8sLevels = [
  {
    id: "rollout",
    title: "Release api:v2 without downtime",
    brief: "api:v1 is healthy behind the Service. Ship api:v2, watch the rollout, and protect users if the new version misbehaves.",
    concepts: ["rolling deployments", "readiness gates", "rollback"],
    hints: ["A safe rollout replaces Pods gradually and waits for readiness.", "A rising error rate during a rollout is a reason to pause and roll back, not continue faster."],
    learned: "A Deployment can roll out gradually while the Service keeps routing to Ready Pods. Pause and roll back when the new ReplicaSet fails its service-level signals.",
    doc: DEPLOY_DOC,
    steps: [
      {
        id: "strategy",
        prompt: "Choose how to release api:v2.",
        scene: {
          status: "Healthy", traffic: "1,200 req/s", errorRate: "0.2%", latency: "145 ms", version: "api:v1",
          pods: [pod("api-7c9-a", "v1", "Ready"), pod("api-7c9-b", "v1", "Ready"), pod("api-7c9-c", "v1", "Ready")],
          events: ["Deployment api is available: 3/3", "Service api has 3 Ready endpoints"],
        },
        actions: [
          action("rolling", "Start a rolling update and wait for each v2 Pod to become Ready", true, "The controller starts one v2 Pod while all v1 endpoints continue serving traffic.", {
            status: "Deploying", version: "api:v1 → api:v2", pods: [pod("api-7c9-a", "v1", "Ready"), pod("api-7c9-b", "v1", "Ready"), pod("api-91f-a", "v2", "Starting")],
            events: ["Created ReplicaSet api-91f", "Waiting for api-91f-a readiness"],
          }),
          action("recreate", "Use Recreate: stop every v1 Pod, then start v2", false, "The Service immediately loses every endpoint. Users receive 503s until v2 starts.", {
            status: "Outage", errorRate: "100%", pods: [pod("api-91f-a", "v2", "Starting")], events: ["Service api has 0 Ready endpoints", "HTTP 503 spike"]
          }),
          action("delete", "Delete all v1 Pods manually and let the Deployment recover", false, "Manual deletion creates the same capacity gap and bypasses rollout safety.", {
            status: "Degraded", errorRate: "42%", pods: [pod("api-91f-a", "v2", "Pending"), pod("api-91f-b", "v2", "Pending")], events: ["Available replicas dropped below minimum"]
          }),
        ],
      },
      {
        id: "rollback",
        prompt: "The first v2 Pods are Ready, but production metrics are getting worse. What do you do?",
        scene: {
          status: "Degraded", traffic: "1,200 req/s", errorRate: "18.4%", latency: "1.8 s", version: "api:v1 + api:v2",
          pods: [pod("api-7c9-a", "v1", "Ready"), pod("api-91f-a", "v2", "Ready"), pod("api-91f-b", "v2", "Ready")],
          events: ["Error budget burn rate: 24x", "v2: panic in checkout client", "Rollout progress: 2/3 v2"],
        },
        actions: [
          action("rollback", "Pause the rollout and roll back to the previous ReplicaSet", true, "Traffic returns to the known-good v1 Pods while the faulty image is investigated.", {
            status: "Recovered", errorRate: "0.2%", latency: "150 ms", version: "api:v1", pods: [pod("api-7c9-a", "v1", "Ready"), pod("api-7c9-b", "v1", "Ready"), pod("api-7c9-c", "v1", "Ready")], events: ["Rolled back deployment/api to revision 12"]
          }),
          action("continue", "Continue to 100%; the new Pods are technically Ready", false, "Readiness only says a Pod can receive traffic. It does not prove that business requests succeed.", { status: "Incident", errorRate: "31.7%", latency: "2.6 s" }),
          action("restart", "Restart the v2 Pods and hope the error clears", false, "The same image and configuration produce the same failure after every restart.", { status: "Degraded", events: ["Restarted v2 Pods", "Error rate unchanged"] }),
        ],
      },
    ],
  },
  {
    id: "load-balancer",
    title: "The load balancer has no targets",
    brief: "The frontend receives 503s even though all API Pods say Ready. Trace traffic from the load balancer through the Service to the Pods.",
    concepts: ["Services", "selectors", "endpoints", "load balancing"],
    hints: ["Ready Pods do not receive Service traffic unless their labels match its selector.", "Inspect the Service endpoints and compare the selector with Pod labels."],
    learned: "A Service load balances only across Ready endpoints selected by its labels. Healthy Pods with the wrong labels are invisible to the Service.",
    doc: SERVICE_DOC,
    steps: [
      {
        id: "inspect",
        prompt: "Where do you look first?",
        scene: {
          status: "503 responses", traffic: "850 req/s", errorRate: "100%", latency: "12 ms", version: "api:v3",
          pods: [pod("api-a", "v3", "Ready"), pod("api-b", "v3", "Ready"), pod("api-c", "v3", "Ready")],
          routes: ["Load balancer → Service/api", "Service/api → 0 endpoints"], events: ["target group: unhealthy", "Endpoints/api: <none>"],
        },
        actions: [
          action("endpoints", "Inspect the Service selector and EndpointSlice", true, "The Service selector is app=api, but the Pods are labelled app=api-v3.", { events: ["Service selector: app=api", "Pod labels: app=api-v3", "EndpointSlice: 0 addresses"] }),
          action("lb-restart", "Restart the external load balancer", false, "The load balancer is forwarding correctly. The empty Service endpoint list is inside the cluster.", { events: ["Load balancer restarted", "Service/api still has 0 endpoints"] }),
          action("pod-restart", "Restart every Ready Pod", false, "The replacement Pods receive the same labels, so the Service still selects none of them.", { events: ["3 Pods restarted", "EndpointSlice remains empty"] }),
        ],
      },
      {
        id: "selector",
        prompt: "Fix traffic without exposing the Pods directly.",
        scene: {
          status: "Root cause found", traffic: "850 req/s", errorRate: "100%", latency: "12 ms", version: "api:v3",
          pods: [pod("api-a", "v3", "Ready"), pod("api-b", "v3", "Ready"), pod("api-c", "v3", "Ready")],
          routes: ["Service selector: app=api", "Pod label: app=api-v3"], events: ["No selector match"],
        },
        actions: [
          action("fix-selector", "Update the Service selector to app=api-v3", true, "The EndpointSlice immediately gains all three Ready Pod IPs and traffic recovers.", { status: "Healthy", errorRate: "0.1%", latency: "92 ms", routes: ["Load balancer → Service/api", "Service/api → 3 Ready endpoints"], events: ["EndpointSlice updated: 3 addresses"] }),
          action("nodeport", "Change the Service to NodePort and bypass the selector", false, "NodePort still routes through Service endpoints. It does not repair a selector mismatch.", { status: "503 responses" }),
          action("public-pods", "Expose each Pod IP directly in the load balancer", false, "Pod IPs are ephemeral and this bypasses Kubernetes readiness and service discovery.", { status: "Fragile configuration", events: ["Warning: unmanaged Pod targets"] }),
        ],
      },
    ],
  },
  {
    id: "canary",
    title: "Canary the checkout release",
    brief: "checkout:v8 needs production validation. Shift traffic gradually, read the metrics, and decide whether to promote it.",
    concepts: ["canary delivery", "traffic splitting", "SLOs"],
    hints: ["Start with a small percentage so failures affect few users.", "A canary with much worse errors and latency should be rolled back."],
    learned: "A canary limits blast radius. Promotion depends on service metrics, not merely Pod readiness or elapsed time.",
    doc: "https://kubernetes.io/docs/concepts/cluster-administration/manage-deployment/#canary-deployments",
    steps: [
      {
        id: "initial-split",
        prompt: "How much traffic should checkout:v8 receive first?",
        scene: {
          status: "Stable", traffic: "2,400 req/s", errorRate: "0.3%", latency: "210 ms", version: "checkout:v7",
          pods: [pod("checkout-stable-a", "v7", "Ready"), pod("checkout-stable-b", "v7", "Ready"), pod("checkout-canary-a", "v8", "Ready")],
          routes: ["stable v7: 100%", "canary v8: 0%"], events: ["v8 passed staging smoke tests"],
        },
        actions: [
          action("ten", "Send 10% to v8 and compare metrics", true, "A small production sample reaches v8 while most users stay on v7.", { status: "Canary active", routes: ["stable v7: 90%", "canary v8: 10%"], events: ["Collecting canary metrics"] }),
          action("hundred", "Send 100% to v8 immediately", false, "This is a full rollout, not a canary. Any defect affects every checkout request.", { status: "High risk", routes: ["canary v8: 100%"] }),
          action("zero", "Keep v8 at 0% and call the release validated", false, "Without production traffic there is no canary evidence to evaluate.", { status: "No validation" }),
        ],
      },
      {
        id: "evaluate",
        prompt: "After five minutes, what is the safe release decision?",
        scene: {
          status: "Canary degraded", traffic: "2,400 req/s", errorRate: "v7 0.3% · v8 7.8%", latency: "v7 210 ms · v8 1.4 s", version: "checkout:v7 + v8",
          pods: [pod("checkout-stable-a", "v7", "Ready"), pod("checkout-stable-b", "v7", "Ready"), pod("checkout-canary-a", "v8", "Ready")],
          routes: ["stable v7: 90%", "canary v8: 10%"], events: ["v8 exceeds error SLO", "v8 p95 latency 6.6x stable"],
        },
        actions: [
          action("rollback-canary", "Route the canary back to 0% and keep v7 serving", true, "The bad release is contained to the small canary population and normal metrics return.", { status: "Recovered", errorRate: "0.3%", latency: "210 ms", routes: ["stable v7: 100%", "canary v8: 0%"], events: ["Canary aborted"] }),
          action("promote", "Promote v8 to 100%; its Pods are Ready", false, "Readiness does not override clear production evidence that v8 is failing users.", { status: "Major incident", errorRate: "7.8%" }),
          action("fifty", "Increase v8 to 50% to collect more data", false, "The signal is already conclusive. More traffic only increases the blast radius.", { status: "Growing incident", routes: ["stable v7: 50%", "canary v8: 50%"] }),
        ],
      },
    ],
  },
  {
    id: "autoscaling",
    title: "Survive a traffic spike",
    brief: "A flash sale drives CPU and latency upward. Use Kubernetes autoscaling without manually chasing replica counts.",
    concepts: ["HPA", "resource metrics", "cluster autoscaling"],
    hints: ["Use a HorizontalPodAutoscaler for recurring workload demand.", "Pending Pods mean the workload scaler needs more node capacity."],
    learned: "The HPA adds workload capacity from metrics; a node autoscaler supplies cluster capacity when new Pods cannot be scheduled.",
    doc: HPA_DOC,
    steps: [
      {
        id: "hpa",
        prompt: "Traffic is still rising. What is the sustainable response?",
        scene: {
          status: "Saturated", traffic: "4,800 req/s", errorRate: "2.1%", latency: "1.9 s", version: "store:v5",
          pods: [pod("store-a", "v5", "Ready"), pod("store-b", "v5", "Ready")],
          events: ["CPU: 94%", "p95 latency: 1.9 s", "queue depth increasing"],
        },
        actions: [
          action("hpa", "Enable an HPA using CPU utilization with safe min/max bounds", true, "The HPA requests additional Pods as CPU remains above target.", { status: "Scaling", pods: [pod("store-a", "v5", "Ready"), pod("store-b", "v5", "Ready"), pod("store-c", "v5", "Pending"), pod("store-d", "v5", "Pending")], events: ["HPA: desired replicas 4", "2 Pods Pending"] }),
          action("manual", "Manually set a much larger replica count and watch it all day", false, "Manual scaling is slow, error-prone, and does not respond when demand changes again.", { status: "Temporary guess" }),
          action("restart", "Restart the busy Pods to clear their CPU", false, "Restarts remove capacity during the spike; demand returns as soon as each Pod starts.", { status: "Outage risk", errorRate: "14%" }),
        ],
      },
      {
        id: "nodes",
        prompt: "The HPA created two Pods, but both remain Pending: Insufficient cpu. What next?",
        scene: {
          status: "Cluster full", traffic: "4,800 req/s", errorRate: "1.8%", latency: "1.6 s", version: "store:v5",
          pods: [pod("store-a", "v5", "Ready", "node-a"), pod("store-b", "v5", "Ready", "node-b"), pod("store-c", "v5", "Pending", "unscheduled"), pod("store-d", "v5", "Pending", "unscheduled")],
          events: ["0/2 nodes available: Insufficient cpu", "HPA desired: 4 · current: 2"],
        },
        actions: [
          action("cluster-autoscaler", "Let the node autoscaler add capacity for the Pending Pods", true, "A new node joins, Pending Pods schedule, and latency returns to normal.", { status: "Healthy", errorRate: "0.2%", latency: "240 ms", pods: [pod("store-a", "v5", "Ready", "node-a"), pod("store-b", "v5", "Ready", "node-b"), pod("store-c", "v5", "Ready", "node-c"), pod("store-d", "v5", "Ready", "node-c")], events: ["node-c Ready", "HPA current replicas: 4"] }),
          action("lower-requests", "Set CPU requests close to zero so the Pods fit", false, "Artificially low requests overcommit the nodes and can starve every workload under load.", { status: "Node pressure" }),
          action("ignore", "Wait; Pending Pods eventually run without free capacity", false, "A scheduler cannot place Pods when no node satisfies their requests.", { status: "Still saturated" }),
        ],
      },
    ],
  },
  {
    id: "ingress",
    title: "Repair ingress routing",
    brief: "The website works, but /api requests return the frontend HTML. Trace the path rules and restore correct service routing.",
    concepts: ["Ingress", "path precedence", "TLS"],
    hints: ["Inspect which backend handles /api before changing Pods.", "The specific /api path should route to api-service before the / catch-all."],
    learned: "Ingress routes by host and path. Specific application paths must target the correct Service, and TLS issues should be fixed at the certificate boundary.",
    doc: "https://kubernetes.io/docs/concepts/services-networking/ingress/",
    steps: [
      {
        id: "trace-route",
        prompt: "What evidence narrows the failure fastest?",
        scene: {
          status: "Wrong backend", traffic: "620 req/s", errorRate: "API clients: 100%", latency: "80 ms", version: "web:v4 · api:v9",
          pods: [pod("web-a", "v4", "Ready"), pod("api-a", "v9", "Ready"), pod("api-b", "v9", "Ready")],
          routes: ["/ → web-service", "/api → web-service"], events: ["GET /api/orders: 200 text/html", "Expected: application/json"],
        },
        actions: [
          action("inspect-ingress", "Inspect the Ingress host/path rules and selected backends", true, "The /api rule points to web-service instead of api-service.", { events: ["Matched rule: /api Prefix → web-service:80", "api-service has 2 Ready endpoints"] }),
          action("restart-api", "Restart the healthy API Pods", false, "The API never receives these requests. Restarting it cannot change Ingress routing.", { status: "Wrong backend" }),
          action("clear-browser", "Ask users to clear their browser cache", false, "The response is generated by the wrong backend on every request, not by a stale browser cache.", { status: "Wrong backend" }),
        ],
      },
      {
        id: "fix-route",
        prompt: "Apply the smallest safe routing fix.",
        scene: {
          status: "Misrouted", traffic: "620 req/s", errorRate: "API clients: 100%", latency: "80 ms", version: "web:v4 · api:v9",
          pods: [pod("web-a", "v4", "Ready"), pod("api-a", "v9", "Ready"), pod("api-b", "v9", "Ready")],
          routes: ["/api → web-service", "/ → web-service"], events: ["api-service endpoints: 2"],
        },
        actions: [
          action("api-route", "Route /api to api-service and keep / on web-service", true, "Ingress sends API calls to the API endpoints while the website continues using the frontend.", { status: "Healthy", errorRate: "0.1%", latency: "95 ms", routes: ["/api → api-service", "/ → web-service"], events: ["GET /api/orders: 200 application/json"] }),
          action("all-api", "Route every path to api-service", false, "API calls recover, but the website now returns API responses instead of the frontend.", { status: "Frontend outage", routes: ["/ → api-service"] }),
          action("expose-nodeport", "Expose api-service through a public NodePort", false, "This bypasses the existing TLS and routing boundary instead of repairing it.", { status: "Security regression" }),
        ],
      },
    ],
  },
  {
    id: "availability",
    title: "Drain a node without an outage",
    brief: "A worker node needs maintenance. Move workloads safely, then prevent a single availability-zone failure from removing every replica.",
    concepts: ["drain", "PodDisruptionBudget", "topology spread"],
    hints: ["Cordon and drain through the eviction API so disruption budgets are respected.", "Spread replicas across zones instead of allowing the scheduler to place them together."],
    learned: "Planned maintenance should respect disruption budgets, and topology spread protects the workload from a node or zone failure.",
    doc: "https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/",
    steps: [
      {
        id: "drain",
        prompt: "node-a requires a kernel update. How do you remove it safely?",
        scene: {
          status: "Maintenance due", traffic: "900 req/s", errorRate: "0.1%", latency: "120 ms", version: "orders:v6",
          pods: [pod("orders-a", "v6", "Ready", "node-a"), pod("orders-b", "v6", "Ready", "node-a"), pod("orders-c", "v6", "Ready", "node-b")],
          events: ["PodDisruptionBudget: minAvailable 2", "node-a: maintenance required"],
        },
        actions: [
          action("drain", "Cordon node-a, then drain it through the eviction API", true, "Kubernetes schedules replacements and the disruption budget keeps two replicas available.", { status: "Maintenance safe", pods: [pod("orders-c", "v6", "Ready", "node-b"), pod("orders-d", "v6", "Ready", "node-c"), pod("orders-e", "v6", "Ready", "node-c")], events: ["node-a cordoned", "Evictions respected PDB"] }),
          action("shutdown", "Shut down node-a immediately", false, "Two of three replicas disappear at once, violating the availability target.", { status: "Degraded", errorRate: "12%", pods: [pod("orders-c", "v6", "Ready", "node-b")] }),
          action("delete", "Force-delete the Pods on node-a", false, "Force deletion bypasses graceful termination and disruption controls.", { status: "Degraded", events: ["PDB bypassed"] }),
        ],
      },
      {
        id: "spread",
        prompt: "All replacement Pods landed in one zone. How do you remove that failure domain?",
        scene: {
          status: "Zone risk", traffic: "900 req/s", errorRate: "0.1%", latency: "120 ms", version: "orders:v6",
          pods: [pod("orders-c", "v6", "Ready", "zone-a"), pod("orders-d", "v6", "Ready", "zone-a"), pod("orders-e", "v6", "Ready", "zone-a")],
          events: ["3/3 replicas in zone-a", "zone-b has available capacity"],
        },
        actions: [
          action("topology", "Add zone topology spread constraints and roll out gradually", true, "Replicas redistribute across zones while the Service continues using Ready endpoints.", { status: "Resilient", pods: [pod("orders-c", "v6", "Ready", "zone-a"), pod("orders-d", "v6", "Ready", "zone-b"), pod("orders-e", "v6", "Ready", "zone-c")], events: ["maxSkew: 1", "3 zones represented"] }),
          action("hope", "Leave placement unchanged; the zone has been reliable", false, "Reliability history does not remove a shared failure domain.", { status: "Zone risk" }),
          action("three-deployments", "Create a separate Deployment manually for each zone", false, "This duplicates rollout and scaling management when topology constraints solve the placement problem directly.", { status: "Operational complexity" }),
        ],
      },
    ],
  },
];
