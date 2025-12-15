import { useMemo } from "react";
import { useLookupOptions } from "@/api/queries";
import type { GroupedSelectGroup } from "@/components/ui/form";

const FALLBACK_OPTIONS: GroupedSelectGroup[] = [
  {
    group_name: null,
    group_order: 0,
    options: [
      { label: "Scrap", value: "scrap", description: "Dispose of the material" },
      { label: "Reduce", value: "reduce", description: "Reduce stock levels" },
      { label: "Keep", value: "keep", description: "Maintain current levels" },
      { label: "Alternative Use", value: "alternative_use", description: "Find alternative application" },
      { label: "Other", value: "other", description: "Specify a custom action" },
    ],
  },
];

export function useProposedActionOptions() {
  const { data: proposedActionOptions, isLoading } =
    useLookupOptions("proposed_action");

  const groups = useMemo((): GroupedSelectGroup[] => {
    if (!proposedActionOptions?.groups) {
      return FALLBACK_OPTIONS;
    }

    // Map the API response to grouped select format
    const mappedGroups: GroupedSelectGroup[] = proposedActionOptions.groups.map((group) => ({
      group_name: group.group_name ?? null,
      group_order: group.group_order,
      options: group.options.map((opt) => ({
        value: opt.value,
        label: opt.label,
        description: opt.description ?? null,
      })),
    }));

    // Ensure "Other" option exists
    const hasOther = mappedGroups.some((g) =>
      g.options.some((opt) => opt.value === "other")
    );

    if (!hasOther) {
      const ungrouped = mappedGroups.find((g) => g.group_name === null);
      if (ungrouped) {
        ungrouped.options.push({
          label: "Other",
          value: "other",
          description: "Specify a custom action",
        });
      } else {
        mappedGroups.push({
          group_name: null,
          group_order: 999,
          options: [
            { label: "Other", value: "other", description: "Specify a custom action" },
          ],
        });
      }
    }

    return mappedGroups;
  }, [proposedActionOptions]);

  return { groups, isLoading };
}
