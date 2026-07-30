export interface AdmonitionIconDefinition {
  name: string;
  type: string; // 'default' means Admonition handles it
  svg?: string;
}

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
  icon: string | AdmonitionIconDefinition;
  color: string;
  isAdmonition: boolean;
  sourcePlugin?: string;
}

// An entry in the Admonition plugin's type registry, asserted rather than
// validated. `icon` is an object on current Admonition and a bare name on older
// releases, so both are accepted.
export interface AdmonitionDefinition {
  type: string;
  title?: string;
  icon: string | AdmonitionIconDefinition;
  color: string; // "R,G,B"
  command: boolean;
  injectColor?: boolean;
  noTitle: boolean;
  copy?: boolean;
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

// Built-ins first, each alias its own pickable entry, then Admonition's types. A
// built-in of the same name wins, so Admonition cannot shadow `[!note]`.
export function buildCalloutOptions(
  admonitionDefinitions?: Record<string, AdmonitionDefinition>,
): CalloutTypeInfo[] {
  const options: CalloutTypeInfo[] = [];

  for (const builtIn of BUILT_IN_CALLOUT_TYPES) {
    options.push({
      type: builtIn.type,
      label: builtIn.label,
      icon: builtIn.icon,
      color: builtIn.color,
      isAdmonition: false,
    });
    for (const alias of builtIn.aliases) {
      options.push({
        type: alias,
        label: `${builtIn.label} (${alias})`,
        icon: builtIn.icon,
        color: builtIn.color,
        isAdmonition: false,
      });
    }
  }

  for (const admonition of Object.values(admonitionDefinitions ?? {})) {
    if (options.some((opt) => opt.type === admonition.type)) continue;
    options.push({
      type: admonition.type,
      label:
        admonition.title ||
        admonition.type.charAt(0).toUpperCase() + admonition.type.slice(1),
      icon: admonition.icon,
      color: `rgb(${admonition.color})`,
      isAdmonition: true,
      sourcePlugin: "Admonition",
    });
  }

  return options;
}
