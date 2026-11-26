# devops-minigames

Short browser games that teach AWS, Kubernetes, Linux, Git and IaC. Players need nothing installed. Every answer links to the official documentation.

## Games

| Game | What it teaches |
| --- | --- |
| IAM Policy Debugger | Policy evaluation: explicit deny, implicit deny, conditions, boundaries |
| Subnet Sizer | CIDR math, AWS reserved addresses, overlap and alignment |
| Tool Matcher | AWS, Kubernetes, Git and Linux vocabulary |
| Incident Responder | Troubleshooting an ALB 502, CrashLoopBackOff, a leaked secret, inode exhaustion |
| Spot the Bug | Insecure or broken Terraform, Kubernetes, Dockerfile, Actions and Bash |
| Quiz Blitz | Timed questions across the stack |

Scores are stored in the browser's localStorage. There is also a chat helper ("the Duck") backed by Cloudflare Workers AI. If the backend is not reachable it falls back to a small built-in bot.

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
npm test
npm run build
```

`npm run cf:dev` needs `npx wrangler login`. Workers AI calls made during local dev use your account and count against its quota.

## Adding content

Content lives in `src/data/`. Each question or scenario must have an explanation and an `https://` link to official documentation. `npm test` validates the shape of every entry.

## CI/CD

`.github/workflows/ci.yml` runs on every pull request and push to `main`:

1. Lint, test, build and `npm audit` for production dependencies.
2. Secret scan with gitleaks.
3. Preview deploy of same-repo pull requests (forks never receive secrets).
4. Production deploy from `main`, through the `production` GitHub environment.

CodeQL runs on pull requests and weekly. Dependabot updates npm packages and Actions.

### One-time setup

1. Create a Cloudflare Pages project named `devops-minigames` (direct upload).
2. Add repository secrets `CLOUDFLARE_API_TOKEN` (Pages edit permission) and `CLOUDFLARE_ACCOUNT_ID`.
3. Create a GitHub environment named `production`. Add required reviewers if you want manual approval.
4. Protect `main`: require the `Lint, test, build` and `Secret scan` checks and a pull request before merging.
5. Add a Cloudflare rate limiting rule on `/api/chat`. The function checks the request origin and bounds input size, but a public AI endpoint needs a rate limit too.
6. Optional: set the `AI_MODEL` variable on the Pages project to change the Workers AI model.
