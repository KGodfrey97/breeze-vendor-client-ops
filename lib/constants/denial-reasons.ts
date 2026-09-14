export const DENIAL_REASON_GROUPS = [
  {
    label: "Authorization & Referral",
    reasons: [
      "Authorization missing or invalid",
      "Referral required but not on file",
      "Claim requires additional review",
    ],
  },
  {
    label: "Medical Necessity & Clinical Review",
    reasons: [
      "Medical necessity not established",
      "Experimental or investigational service",
      "Level of care not supported",
      "Documentation insufficient or missing",
    ],
  },
  {
    label: "Eligibility & Benefits",
    reasons: [
      "Coverage terminated on service date",
      "Service not covered under plan benefits",
      "Out-of-network provider or facility",
      "Maximum benefit or visit limit reached",
      "Non-covered preventive or screening service",
    ],
  },
  {
    label: "Coding & Billing",
    reasons: [
      "Coding or billing error",
      "Duplicate claim or service already billed",
      "Incorrect or missing modifier",
      "Diagnosis inconsistent with procedure",
      "Bundled or inclusive service denial",
      "Place of service not eligible",
      "Payment already issued or adjusted",
    ],
  },
  {
    label: "Member & Policy Information",
    reasons: [
      "Coordination of benefits issue",
      "Member information does not match payer records",
      "Policy number missing or invalid",
      "Provider credentialing issue",
    ],
  },
  {
    label: "Timely Filing & Submission",
    reasons: [
      "Timely filing limit exceeded",
      "Late submission of supporting documentation",
    ],
  },
] as const

export const COMMON_DENIAL_REASONS = DENIAL_REASON_GROUPS.flatMap((group) => group.reasons)
