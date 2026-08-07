interface BuiltInCalloutType {
  type: string;
  aliases: string[];
  icon: string;
  label: string;
  color: string;
}

export interface CalloutTypeInfo {
  type: string;
  label: string;
  icon: string;
  color: string;
}

const BUILT_IN_CALLOUT_TYPES: readonly BuiltInCalloutType[] = [
  {
    type: "note",
    aliases: [],
    icon: "lucide-pencil",
    label: "Note",
    color: "var(--callout-default)",
  },
  {
    type: "abstract",
    aliases: ["summary", "tldr"],
    icon: "lucide-clipboard-list",
    label: "Abstract",
    color: "var(--callout-summary)",
  },
  {
    type: "info",
    aliases: [],
    icon: "lucide-info",
    label: "Info",
    color: "var(--callout-info)",
  },
  {
    type: "todo",
    aliases: [],
    icon: "lucide-check-circle-2",
    label: "Todo",
    color: "var(--callout-todo)",
  },
  {
    type: "important",
    aliases: [],
    icon: "lucide-flame",
    label: "Important",
    color: "var(--callout-important)",
  },
  {
    type: "tip",
    aliases: ["hint"],
    icon: "lucide-flame",
    label: "Tip",
    color: "var(--callout-tip)",
  },
  {
    type: "success",
    aliases: ["check", "done"],
    icon: "lucide-check",
    label: "Success",
    color: "var(--callout-success)",
  },
  {
    type: "question",
    aliases: ["help", "faq"],
    icon: "lucide-help-circle",
    label: "Question",
    color: "var(--callout-question)",
  },
  {
    type: "warning",
    aliases: ["caution", "attention"],
    icon: "lucide-alert-triangle",
    label: "Warning",
    color: "var(--callout-warning)",
  },
  {
    type: "failure",
    aliases: ["fail", "missing"],
    icon: "lucide-x",
    label: "Failure",
    color: "var(--callout-fail)",
  },
  {
    type: "danger",
    aliases: ["error"],
    icon: "lucide-zap",
    label: "Danger",
    color: "var(--callout-error)",
  },
  {
    type: "bug",
    aliases: [],
    icon: "lucide-bug",
    label: "Bug",
    color: "var(--callout-bug)",
  },
  {
    type: "example",
    aliases: [],
    icon: "lucide-list",
    label: "Example",
    color: "var(--callout-example)",
  },
  {
    type: "quote",
    aliases: ["cite"],
    icon: "lucide-quote",
    label: "Quote",
    color: "var(--callout-quote)",
  },
];

export function buildCalloutOptions(): CalloutTypeInfo[] {
  const options: CalloutTypeInfo[] = [];

  for (const builtIn of BUILT_IN_CALLOUT_TYPES) {
    options.push({
      type: builtIn.type,
      label: builtIn.label,
      icon: builtIn.icon,
      color: builtIn.color,
    });
    for (const alias of builtIn.aliases) {
      options.push({
        type: alias,
        label: `${builtIn.label} (${alias})`,
        icon: builtIn.icon,
        color: builtIn.color,
      });
    }
  }

  return options;
}
