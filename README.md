# CloudOps Arcade

A browser-based DevOps game with a subtle cloud-operations theme. It teaches AWS, Kubernetes, Linux, Git and infrastructure as code through safe simulations, without pretending to be a real cloud console. Every answer links to official documentation.

## Games

| Game | What it teaches |
| --- | --- |
| EKS Cluster Control Room | Rolling deployments, rollbacks, Services, load balancing, canaries, autoscaling, Ingress and availability |
| Container Task Lab | Docker logs, inspection, ports, memory limits, mounts, environment variables and log filtering |
| Security Group Defender | Protocols, port ranges, source CIDRs, least privilege and default deny |
| IAM Policy Debugger | Policy evaluation: explicit deny, implicit deny, conditions, boundaries |
| VPC Subnet Builder | CIDR math, AWS reserved addresses, overlap and alignment |
| Cloud Service Matcher | AWS, Kubernetes, Git and Linux vocabulary |
| Cloud Incident Responder | Troubleshooting an ALB 502, CrashLoopBackOff, a leaked secret, inode exhaustion |
| Infrastructure Bug Hunt | Insecure or broken Terraform, Kubernetes, Dockerfile, Actions and Bash |
| CloudOps Blitz | Timed questions across the stack |

XP, ranks, daily streaks, trophies, stars, scores and play counts are stored in the browser's localStorage. The Trophy cabinet can export and restore a JSON backup.

The persistent Duck assistant explains the current screen and offers conceptual hints. It uses Cloudflare Workers AI when available and falls back to a context-aware local helper. The backend receives a bounded description of the current screen, not saved progress or other browser data.

## Stack

- Frontend: React 19 and Vite, plain CSS, no router or state library.
- Backend: one Cloudflare Pages Function, `functions/api/chat.js`, using the Workers AI binding `AI`. No API keys are needed.
- Hosting: Cloudflare Pages. `public/_headers` sets a strict Content Security Policy.

## Develop

```
npm install
npm run dev        # frontend only, chat falls back to the local bot
npm run cf:dev     # build, then run Pages with the function and AI binding
npm run lint
npm test           # 53 logic tests and 8 component interaction tests
npm run test:ui    # Playwright in desktop and mobile Chromium
npm run build
```

`npm run cf:dev` needs `npx wrangler login`. Workers AI calls made during local dev use your account and count against its quota.

## Adding content

Content lives in `src/data/`. Each question or scenario must have an explanation and an `https://` link to official documentation. `npm test` validates the shape of every entry.

## CI/CD

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

1. Lint, 53 logic tests, 8 React component interaction tests, build and `npm audit` for production dependencies.
2. Playwright tests in desktop and mobile Chromium, including simulation flows, persistence, responsive overflow, console errors and axe accessibility checks.
3. Secret scan with gitleaks.
4. Preview deploy of same-repo pull requests (forks never receive secrets).
5. Production deploy from `main`, through the `production` GitHub environment.

CodeQL runs on pull requests and weekly. Dependabot updates npm packages and Actions.

### One-time setup

1. Create a Cloudflare Pages project named `devops-minigames` (direct upload).
2. Add repository secrets `CLOUDFLARE_API_TOKEN` (Pages edit permission) and `CLOUDFLARE_ACCOUNT_ID`.
3. Create a GitHub environment named `production`. Add required reviewers if you want manual approval.
4. Protect `main`: require the `Lint, test, build` and `Secret scan` checks and a pull request before merging.
5. Add a Cloudflare rate limiting rule on `/api/chat`. The function checks the request origin and bounds input size, but a public AI endpoint needs a rate limit too.
6. Optional: set the `AI_MODEL` variable on the Pages project to change the Workers AI model.
