const EVAL = "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic.html";
const ELEMENTS = "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements.html";
const BOUNDARY = "https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_boundaries.html";
const S3_ACTIONS = "https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html";

const allow = (Action, Resource, extra = {}) => ({ Effect: "Allow", Action, Resource, ...extra });
const deny = (Action, Resource, extra = {}) => ({ Effect: "Deny", Action, Resource, ...extra });
const policy = (...Statement) => ({ Version: "2012-10-17", Statement });

export const iamScenarios = [
  {
    policies: [policy(allow("s3:GetObject", "arn:aws:s3:::my-bucket/*"))],
    request: { action: "s3:GetObject", resource: "arn:aws:s3:::my-bucket/report.csv" },
    answer: "Allow",
    explain: "The action and the object ARN both match the Allow statement, and nothing denies it.",
    doc: EVAL,
  },
  {
    policies: [policy(allow("s3:*", "*"), deny("s3:DeleteObject", "*"))],
    request: { action: "s3:DeleteObject", resource: "arn:aws:s3:::my-bucket/old.log" },
    answer: "Deny",
    explain: "An explicit Deny always wins over any Allow, no matter how broad the Allow is.",
    doc: EVAL,
  },
  {
    policies: [policy(allow("s3:GetObject", "arn:aws:s3:::my-bucket/*"))],
    request: { action: "s3:PutObject", resource: "arn:aws:s3:::my-bucket/new.txt" },
    answer: "Deny",
    explain: "Requests are denied by default. Nothing allows s3:PutObject, so it is an implicit deny.",
    doc: EVAL,
  },
  {
    policies: [policy(allow("s3:ListBucket", "arn:aws:s3:::my-bucket/*"))],
    request: { action: "s3:ListBucket", resource: "arn:aws:s3:::my-bucket" },
    answer: "Deny",
    explain:
      "s3:ListBucket applies to the bucket ARN (arn:aws:s3:::my-bucket), not to objects (my-bucket/*). The resource does not match.",
    doc: S3_ACTIONS,
  },
  {
    policies: [
      policy(
        allow("ec2:StartInstances", "*", {
          Condition: { StringEquals: { "aws:RequestedRegion": "eu-west-1" } },
        }),
      ),
    ],
    request: {
      action: "ec2:StartInstances",
      resource: "arn:aws:ec2:us-east-1:111122223333:instance/i-0abc",
      context: { "aws:RequestedRegion": "us-east-1" },
    },
    answer: "Deny",
    explain: "The condition requires eu-west-1 but the request targets us-east-1, so the Allow does not apply.",
    doc: ELEMENTS,
  },
  {
    policies: [
      policy(
        allow("*", "*"),
        deny("iam:*", "*", { Condition: { BoolIfExists: { "aws:MultiFactorAuthPresent": "false" } } }),
      ),
    ],
    request: {
      action: "iam:CreateUser",
      resource: "*",
      context: "Signed with long-term access keys (the MFA key is absent from the request)",
    },
    answer: "Deny",
    explain:
      "BoolIfExists also matches when the key is missing. Without MFA the Deny applies, and it overrides the Allow.",
    doc: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_condition_operators.html",
  },
  {
    policies: [policy(allow("dynamodb:GetItem", "arn:aws:dynamodb:eu-west-1:111122223333:table/Orders"))],
    request: { action: "dynamodb:GetItem", resource: "arn:aws:dynamodb:eu-west-1:111122223333:table/Customers" },
    answer: "Deny",
    explain: "The policy only covers the Orders table. Customers is a different resource, so it is denied by default.",
    doc: EVAL,
  },
  {
    policies: [policy(allow("s3:Get*", "arn:aws:s3:::my-bucket/*"))],
    request: { action: "s3:GetObjectAcl", resource: "arn:aws:s3:::my-bucket/photo.png" },
    answer: "Allow",
    explain: "s3:Get* is a wildcard that matches s3:GetObjectAcl, and the object ARN matches my-bucket/*.",
    doc: ELEMENTS,
  },
  {
    policies: [policy({ Effect: "Allow", NotAction: "iam:*", Resource: "*" })],
    request: { action: "iam:CreateUser", resource: "*" },
    answer: "Deny",
    explain:
      "NotAction with Allow grants everything except the listed actions. iam:CreateUser is excluded, so nothing allows it.",
    doc: "https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_elements_notaction.html",
  },
  {
    policies: [
      { label: "Identity policy", ...policy(allow("ec2:RunInstances", "*")) },
      { label: "Permissions boundary", ...policy(allow("s3:*", "*")) },
    ],
    request: { action: "ec2:RunInstances", resource: "*" },
    answer: "Deny",
    explain:
      "The effective permissions are the intersection of the identity policy and the permissions boundary. The boundary does not allow EC2.",
    doc: BOUNDARY,
  },
];
