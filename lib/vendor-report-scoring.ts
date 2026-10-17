
export type ComparisonOperator =
  | ">="
  | "<="
  | ">"
  | "<"
  | "="

export type MetricResultStatus =
  | "met"
  | "missed"
  | "not_measured"

export function calculateMetricStatus(
  actualValue: number,
  targetValue: number,
  operator: ComparisonOperator
): MetricResultStatus {
  if (
    !Number.isFinite(actualValue) ||
    !Number.isFinite(targetValue)
  ) {
    throw new Error("Invalid metric value")
  }

  switch (operator) {
    case ">=":
      return actualValue >= targetValue ? "met" : "missed"

    case "<=":
      return actualValue <= targetValue ? "met" : "missed"

    case ">":
      return actualValue > targetValue ? "met" : "missed"

    case "<":
      return actualValue < targetValue ? "met" : "missed"

    case "=":
      return actualValue === targetValue ? "met" : "missed"

    default:
      throw new Error(
        `Unsupported comparison operator: ${operator}`
      )
  }
}
