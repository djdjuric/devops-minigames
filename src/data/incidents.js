export const incidents = [
  {
    id: "alb-502",
    title: "502s behind the load balancer",
    topic: "AWS",
    intro: "Pager goes off. Users report errors on the checkout page. Traffic goes through an Application Load Balancer.",
    doc: "https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-troubleshooting.html",
    steps: [
      {
        prompt: "What do you check first?",
        logs: ["ALB metrics: HTTPCode_ELB_502_Count rising", "HealthyHostCount: 0 / 3"],
        options: [
          { text: "Restart the load balancer", good: false, why: "The ALB is working. It reports that it has no healthy targets." },
          { text: "Open the target group and read the health check failure reasons", good: true, why: "Zero healthy hosts points at the targets or the health check, and the console shows the exact reason." },
          { text: "Scale the Auto Scaling group to 10 instances", good: false, why: "More instances that fail the same health check will not help." },
        ],
      },
      {
        prompt: "The target group says: 'Health checks failed with these codes: [404]'. What is the likely cause?",
        logs: ["Health check path: /healthz", "App routes: /, /api/v1/orders, /api/v1/health"],
        options: [
          { text: "The health check path does not exist in the app after the last deploy", good: true, why: "A 404 means the app answered, but not on the configured path." },
          { text: "The security group blocks the ALB from reaching the targets", good: false, why: "A blocked port causes a timeout, not an HTTP 404 response." },
          { text: "The TLS certificate expired", good: false, why: "That would show as a connection or handshake error, not a 404." },
        ],
      },
      {
        prompt: "What is the cleanest fix?",
        logs: ["Rollback is possible but the new release has a required DB migration"],
        options: [
          { text: "Change the target group health check path to /api/v1/health", good: true, why: "It is a small, low-risk config change and the targets recover on the next successful checks." },
          { text: "Disable health checks on the target group", good: false, why: "Health checks cannot be disabled on an ALB target group, and hiding failures is not a fix." },
          { text: "Point DNS directly at one instance", good: false, why: "It bypasses the load balancer and creates a single point of failure." },
        ],
      },
    ],
  },
  {
    id: "k8s-oom",
    title: "CrashLoopBackOff at 3 a.m.",
    topic: "Kubernetes",
    intro: "A deployment in production keeps restarting. kubectl get pods shows CrashLoopBackOff.",
    doc: "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/",
    steps: [
      {
        prompt: "Which command gives you the most useful first clue?",
        logs: ["NAME            READY  STATUS             RESTARTS", "api-6d9f7-x2k8p  0/1    CrashLoopBackOff   14"],
        options: [
          { text: "kubectl describe pod api-6d9f7-x2k8p", good: true, why: "describe shows the last state, exit code, reason and events in one place." },
          { text: "kubectl delete pod api-6d9f7-x2k8p", good: false, why: "The Deployment would recreate it with the same problem and you would lose evidence." },
          { text: "kubectl scale deployment api --replicas=0", good: false, why: "This causes an outage without telling you anything." },
        ],
      },
      {
        prompt: "describe shows: Last State: Terminated, Reason: OOMKilled, Exit Code: 137. What does it mean?",
        logs: ["Limits: memory 128Mi", "Requests: memory 64Mi"],
        options: [
          { text: "The container used more memory than its limit and the kernel killed it", good: true, why: "OOMKilled with exit code 137 means SIGKILL from the out-of-memory killer at the cgroup limit." },
          { text: "The node ran out of disk", good: false, why: "Disk pressure leads to evictions, not OOMKilled." },
          { text: "The liveness probe failed", good: false, why: "A failed probe gives a restart with a probe failure event, not OOMKilled." },
        ],
      },
      {
        prompt: "What do you do?",
        logs: ["Grafana: steady memory use of about 300Mi after startup"],
        options: [
          { text: "Raise the memory limit above the observed use, for example 512Mi, and roll out", good: true, why: "Set limits from measured use with some headroom, then watch it." },
          { text: "Remove the resources section entirely", good: false, why: "Pods without limits can starve neighbours and are the first to hit node-level OOM." },
          { text: "Set restartPolicy to Never", good: false, why: "That stops the retries but leaves the service down." },
        ],
      },
    ],
  },
  {
    id: "git-secret",
    title: "A secret in a public repo",
    topic: "Git",
    intro: "A teammate pushed a commit containing an AWS access key to a public GitHub repository 10 minutes ago.",
    doc: "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository",
    steps: [
      {
        prompt: "What is the first thing you do?",
        logs: ["Commit a1b2c3d adds .env with AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY", "Repository visibility: public"],
        options: [
          { text: "Revoke or deactivate the access key in IAM", good: true, why: "Assume it is already compromised. Bots scrape public repos within minutes." },
          { text: "Force-push to remove the commit and carry on", good: false, why: "Rewriting history does not undo exposure. The key was already copied, and cached views and forks remain." },
          { text: "Make the repository private and wait", good: false, why: "It helps a bit but the key may already be harvested." },
        ],
      },
      {
        prompt: "The key is revoked. What next?",
        logs: [],
        options: [
          { text: "Check CloudTrail for activity by that key and look for unexpected resources", good: true, why: "You need to know whether it was abused before it was revoked." },
          { text: "Nothing, the key is dead", good: false, why: "Anything created with the key, such as new users or instances, may persist." },
          { text: "Delete the whole AWS account", good: false, why: "That is out of proportion and destroys your own resources." },
        ],
      },
      {
        prompt: "How do you stop this happening again?",
        logs: [],
        options: [
          { text: "Add .env to .gitignore, enable secret scanning and push protection, use OIDC or a secrets manager", good: true, why: "Layered prevention: ignore rules, automated detection and no long-lived keys." },
          { text: "Ask people to be more careful", good: false, why: "Human attention does not scale. Use automated guardrails." },
          { text: "Rename the file to something less obvious", good: false, why: "Scanners look at content, not file names." },
        ],
      },
    ],
  },
  {
    id: "linux-disk",
    title: "The disk that is full but not full",
    topic: "Linux",
    intro: "An app server throws 'No space left on device' when writing files.",
    doc: "https://man7.org/linux/man-pages/man1/df.1.html",
    steps: [
      {
        prompt: "What do you run first?",
        logs: [],
        options: [
          { text: "df -h and df -i", good: true, why: "Check both blocks and inodes. Either one can run out." },
          { text: "rm -rf /var/*", good: false, why: "Destructive and will probably take the system down." },
          { text: "reboot", good: false, why: "A reboot does not free space and hides the cause." },
        ],
      },
      {
        prompt: "df -h shows 40% used but df -i shows 100% inodes used on /var. Likely cause?",
        logs: ["Filesystem  Inodes  IUsed  IFree  IUse%", "/dev/xvda1  655360  655360  0      100%"],
        options: [
          { text: "Millions of tiny files, such as session or cache files, exhausted the inodes", good: true, why: "Each file uses an inode no matter how small it is." },
          { text: "A single huge log file", good: false, why: "A huge file would fill blocks, not inodes." },
          { text: "A bad disk", good: false, why: "Nothing here points to hardware failure." },
        ],
      },
      {
        prompt: "How do you find where the files are?",
        logs: [],
        options: [
          { text: "Count entries per directory, for example: for d in /var/*; do echo $d $(find $d -xdev | wc -l); done", good: true, why: "It narrows down the directory with the most entries so you can clean up safely and add rotation." },
          { text: "Run du -sh /var", good: false, why: "du measures bytes used, but the problem here is the number of files." },
          { text: "Resize the volume to make more space", good: false, why: "It does not remove the cause, and the files will keep piling up." },
        ],
      },
    ],
  },
];
