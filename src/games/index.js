import BugGame from "./BugGame.jsx";
import CidrGame from "./CidrGame.jsx";
import IamGame from "./IamGame.jsx";
import IncidentGame from "./IncidentGame.jsx";
import MatcherGame from "./MatcherGame.jsx";
import QuizGame from "./QuizGame.jsx";

export const games = [
  { id: "iam", title: "IAM Policy Debugger", badge: "IAM", topics: ["AWS"], blurb: "Read the policy. Allow or deny?", Component: IamGame },
  { id: "cidr", title: "Subnet Sizer", badge: "NET", topics: ["AWS", "Networking"], blurb: "CIDR math with AWS reserved IPs.", Component: CidrGame },
  { id: "matcher", title: "Tool Matcher", badge: "MIX", topics: ["AWS", "K8s", "Linux", "Git"], blurb: "Match tools and services to what they do.", Component: MatcherGame },
  { id: "incident", title: "Incident Responder", badge: "OPS", topics: ["AWS", "K8s", "Git", "Linux"], blurb: "Four outages. Pick the right next step.", Component: IncidentGame },
  { id: "bugs", title: "Spot the Bug", badge: "BUG", topics: ["Terraform", "K8s", "Docker", "CI"], blurb: "Find the flaw in real-looking config.", Component: BugGame },
  { id: "quiz", title: "Quiz Blitz", badge: "QZ", topics: ["Everything"], blurb: "Timed questions across the whole stack.", Component: QuizGame },
];
