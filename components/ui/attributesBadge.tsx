import React from "react";
import { Badge } from "@/components/ui/badge"
import { attributeColors } from "@/constants/attributesColors";

type Attribute = keyof typeof attributeColors;
export type AttributeValue<T extends Attribute> =
  Extract<keyof typeof attributeColors[T], string>;

type AttributeBadgeProps<T extends Attribute> = {
  attribute: T;
  value: AttributeValue<T>;
  className?: string;
  /** Whether to show the special prefix/suffix formatting */
  showLabel?: boolean;
};

const AttributeBadge = <T extends Attribute>({
  attribute,
  value,
  className = "",
  showLabel = false,
}: AttributeBadgeProps<T>) => {
  const typeColors = attributeColors[attribute];
  const colorClasses = typeColors[value] ?? "bg-muted text-muted-foreground";

  // Base formatting (underscores → spaces, uppercase)
  const formattedValue = value.replace(/_/g, " ").toUpperCase();

  let displayValue = formattedValue;

  if (showLabel) {
    if (attribute === "priority") {
      displayValue = `${formattedValue} PRIORITY`;
    } else if (attribute === "letterStatus") {
      displayValue = `LETTER: ${formattedValue}`;
    }
  }

  return <Badge variant="outline" className={`${colorClasses} ${className}`}>{displayValue}</Badge>;
};

export { AttributeBadge }