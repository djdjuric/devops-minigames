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
    "Adjust a real Deployment manifest using the control panel.",
    "Apply it and watch Pods become Ready, NotReady, or OOMKilled.",
    "Meet capacity, probe, resource, and rolling-update checks together."
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
  { id: "k8s", howTo: HOW.k8s, title: "Kubernetes Control Room", badge: "K8S", topics: ["Kubernetes", "SRE"], blurb: "Tune replicas, probes, resources and rollouts while traffic hits the cluster.", duck: "You are operating a Kubernetes Deployment. Running is not the same as Ready: probes control endpoints, requests affect scheduling, limits affect survival, and replicas provide capacity.", Component: K8sGame },
  { id: "shell", howTo: HOW.shell, title: "Shell Lab", badge: "SH", topics: ["Docker", "Linux", "Logs"], blurb: "A simulated terminal. Debug broken containers and noisy logs.", Component: ShellGame },
  { id: "sg", howTo: HOW.sg, title: "Security Group Defender", badge: "SG", topics: ["AWS", "Networking"], blurb: "Fix the firewall rules, then send traffic and watch who gets through.", Component: SgGame },
  { id: "iam", howTo: HOW.iam, title: "IAM Policy Debugger", badge: "IAM", topics: ["AWS"], blurb: "Read the policy. Allow or deny?", Component: IamGame },
  { id: "cidr", howTo: HOW.cidr, title: "Subnet Sizer", badge: "NET", topics: ["AWS", "Networking"], blurb: "CIDR math with AWS reserved IPs.", Component: CidrGame },
  { id: "matcher", howTo: HOW.matcher, title: "Tool Matcher", badge: "MIX", topics: ["AWS", "K8s", "Linux", "Git"], blurb: "Match tools and services to what they do.", Component: MatcherGame },
  { id: "incident", howTo: HOW.incident, title: "Incident Responder", badge: "OPS", topics: ["AWS", "K8s", "Git", "Linux"], blurb: "Four outages. Pick the right next step.", Component: IncidentGame },
  { id: "bugs", howTo: HOW.bugs, title: "Spot the Bug", badge: "BUG", topics: ["Terraform", "K8s", "Docker", "CI"], blurb: "Find the flaw in real-looking config.", Component: BugGame },
  { id: "quiz", howTo: HOW.quiz, title: "Quiz Blitz", badge: "QZ", topics: ["Everything"], blurb: "Timed questions across the whole stack.", Component: QuizGame },
];
