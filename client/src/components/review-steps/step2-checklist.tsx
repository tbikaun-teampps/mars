import {
  FormInputField,
  FormTextareaField,
  FormToggleGroupField,
} from "@/components/ui/form";
import { Stepheader } from "./step-header";

export function Step2Checklist() {
  return (
    <div className="space-y-4">
      <Stepheader title="Checklist" />
      <p className="text-sm text-gray-600">
        Please verify the following items before proceeding with your review.
      </p>

      <div className="space-y-3">
        <FormToggleGroupField
          name="hasOpenOrders"
          label="Are there any open orders (POs, reservations, work orders)?"
        />
        <FormToggleGroupField
          name="hasForecastDemand"
          label="Does MRP/planning show any future demand in the system?"
        />
        <FormToggleGroupField
          name="checkedAlternativePlants"
          label="Have alternative plants been checked for availability?"
        />
        <FormToggleGroupField
          name="contactedProcurement"
          label="Have you contacted procurement for supplier feedback?"
        />
        <FormToggleGroupField
          name="reviewedBomUsage"
          label="Have you reviewed the BOM usage for this material?"
        />
        <FormToggleGroupField
          name="checkedHistoricalUsage"
          label="Have you checked historical usage trends beyond the last 12 months?"
        />
        <FormToggleGroupField
          name="checkedSupersession"
          label="Have you checked for any material supersession or replacements?"
        />
        {/* <FormToggleGroupField
          name="assessedDisposalOptions"
          label="Have disposal or redistribution options been assessed?"
        /> */}
      </div>

      <p className="text-sm text-gray-600">
        Please provide the following information if it is applicable.
      </p>
      <div className="space-y-3">
        <FormTextareaField
          name="openOrderNumbers"
          label="If there are open orders, please provide the order numbers:"
          placeholder="Enter order numbers separated by commas (e.g., PO12345, WO67890)"
        />
        <FormInputField
          name="forecastNext12m"
          label="If there is forecast demand, please provide the forecast quantity for the next 12 months:"
          type="number"
          placeholder="Enter forecast quantity"
        />
        <FormInputField
          name="alternativePlantQty"
          label="If alternative plants were checked, please provide the available quantity:"
          type="number"
          placeholder="Enter available quantity"
        />
        <FormTextareaField
          name="procurementFeedback"
          label="If procurement was contacted, please summarise their feedback:"
          placeholder="Enter procurement feedback"
        />
      </div>
    </div>
  );
}
