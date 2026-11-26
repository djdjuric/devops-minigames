import BugGame from "./BugGame.jsx";
import CidrGame from "./CidrGame.jsx";
import IamGame from "./IamGame.jsx";
import IncidentGame from "./IncidentGame.jsx";
import K8sGame from "./K8sGame.jsx";
import MatcherGame from "./MatcherGame.jsx";
import QuizGame from "./QuizGame.jsx";
import SgGame from "./SgGame.jsx";
import ShellGame from "./ShellGame.jsx";

const HOW = {
  "shell": [
    "Read the mission brief, then type commands in the terminal like on a real server.",
    "Type help to see what you can run. Use up-arrow for history.",
    "Fix the system or find the answer. Hints cost 20 points."
  ],
  "sg": [
    "Edit the inbound rules for the server.",
    "Press Send traffic and watch which packets get through.",
    "Let customers in and keep attackers out. Failed runs cost points."
  ],
  "k8s": [
    "Read the live traffic, workload map, metrics, and Kubernetes events.",
    "Choose the safest operational action and watch the cluster state change.",
    "Resolve deployments, load balancing, canaries, autoscaling, ingress, and availability incidents."
  ],
  "iam": [
    "Read the policy and the request.",
    "Decide: Allow or Deny. Remember explicit deny wins, and the default is deny.",
    "Each correct answer is worth 10 points."
  ],
  "cidr": [
    "Each round is a CIDR or subnet question.",
    "AWS reserves 5 addresses in every subnet.",
    "Each correct answer is worth 10 points."
  ],
  "matcher": [
    "Pick a term on the left, then its description on the right.",
    "Match all 8 pairs.",
    "Each mistake costs 3 points."
  ],
  "incident": [
    "You are on call. Read the logs and pick the best next step.",
    "Four incidents, three decisions each.",
    "Each good decision is worth 10 points."
  ],
  "bugs": [
    "Read the config snippet.",
    "Click the line with the bug or security problem.",
    "Each correct line is worth 10 points."
  ],
  "quiz": [
    "Ten questions, 20 seconds each.",
    "Faster correct answers earn a speed bonus.",
    "Every answer explains itself and links to the docs."
  ]
};

export const games = [
  { id: "k8s", howTo: HOW.k8s, title: "EKS Cluster Control Room", badge: "K8S", context: "EKS workload concepts", topics: ["Kubernetes", "SRE"], blurb: "Ship releases, trace load-balancer failures, manage canaries and recover Kubernetes incidents.", duck: "You are operating a live Kubernetes workload. Read the traffic path, metrics, events, and rollout state before choosing an action; readiness alone does not prove that users are healthy.", Component: K8sGame },
  { id: "shell", howTo: HOW.shell, title: "Container Task Lab", badge: "SH", context: "ECS-style troubleshooting", topics: ["Docker", "Linux", "Logs"], blurb: "A simulated terminal. Debug broken containers and noisy logs.", Component: ShellGame },
  { id: "sg", howTo: HOW.sg, title: "Security Group Defender", badge: "SG", context: "VPC network controls", topics: ["AWS", "Networking"], blurb: "Fix the firewall rules, then send traffic and watch who gets through.", Component: SgGame },
  { id: "iam", howTo: HOW.iam, title: "IAM Policy Debugger", badge: "IAM", context: "AWS identity and access", topics: ["AWS"], blurb: "Read the policy. Allow or deny?", Component: IamGame },
  { id: "cidr", howTo: HOW.cidr, title: "VPC Subnet Builder", badge: "NET", context: "VPC address planning", topics: ["AWS", "Networking"], blurb: "CIDR math with AWS reserved IPs.", Component: CidrGame },
  { id: "matcher", howTo: HOW.matcher, title: "Cloud Service Matcher", badge: "MIX", context: "Cloud architecture", topics: ["AWS", "K8s", "Linux", "Git"], blurb: "Match tools and services to what they do.", Component: MatcherGame },
  { id: "incident", howTo: HOW.incident, title: "Cloud Incident Responder", badge: "OPS", context: "CloudWatch-style operations", topics: ["AWS", "K8s", "Git", "Linux"], blurb: "Four outages. Pick the right next step.", Component: IncidentGame },
  { id: "bugs", howTo: HOW.bugs, title: "Infrastructure Bug Hunt", badge: "BUG", context: "Infrastructure as code", topics: ["Terraform", "K8s", "Docker", "CI"], blurb: "Find the flaw in real-looking config.", Component: BugGame },
  { id: "quiz", howTo: HOW.quiz, title: "CloudOps Blitz", badge: "QZ", context: "AWS and DevOps", topics: ["Everything"], blurb: "Timed questions across the whole stack.", Component: QuizGame },
];
