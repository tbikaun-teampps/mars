"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller,
  FormProvider,
  useFormContext,
  useFormState,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectItemWithDescription,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error("useFormField should be used within <FormField>");
  }

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: `${id}-form-item`,
    formDescriptionId: `${id}-form-item-description`,
    formMessageId: `${id}-form-item-message`,
    ...fieldState,
  };
};

type FormItemContextValue = {
  id: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue
);

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div
        data-slot="form-item"
        className={cn("grid gap-2", className)}
        {...props}
      />
    </FormItemContext.Provider>
  );
}

function FormLabel({
  className,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  const { error, formItemId } = useFormField();

  return (
    <Label
      data-slot="form-label"
      data-error={!!error}
      className={cn("data-[error=true]:text-destructive", className)}
      htmlFor={formItemId}
      {...props}
    />
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } =
    useFormField();

  return (
    <Slot
      data-slot="form-control"
      id={formItemId}
      aria-describedby={
        !error
          ? `${formDescriptionId}`
          : `${formDescriptionId} ${formMessageId}`
      }
      aria-invalid={!!error}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();

  return (
    <p
      data-slot="form-description"
      id={formDescriptionId}
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

function FormMessage({ className, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error?.message ?? "") : props.children;

  if (!body) {
    return null;
  }

  return (
    <p
      data-slot="form-message"
      id={formMessageId}
      className={cn("text-destructive text-sm", className)}
      {...props}
    >
      {body}
    </p>
  );
}

// Higher-level wrapper components for common field types
type FormInputFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  label?: string;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  min?: string;
  max?: string;
  className?: string;
  disabled?: boolean;
  /** Show a red asterisk after the label to indicate required field */
  required?: boolean;
};

function FormInputField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  placeholder,
  type = "text",
  min,
  max,
  className,
  disabled,
  required,
}: FormInputFieldProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  // Helper function to convert date string to Date object
  const stringToDate = (dateString: string): Date | undefined => {
    if (!dateString) return undefined;
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? undefined : date;
  };

  // Helper function to convert Date object to string (YYYY-MM-DD)
  const dateToString = (date: Date | undefined | null): string => {
    if (!date || !(date instanceof Date) || isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        // Handle value conversion for date inputs
        const inputValue =
          type === "date"
            ? dateToString(field.value as Date)
            : field.value ?? "";

        return (
          <FormItem className={className}>
            {label && (
              <FormLabel>
                {label}
                {required && <span className="text-destructive ml-1">*</span>}
              </FormLabel>
            )}
            <FormControl>
              <Input
                type={type}
                placeholder={placeholder}
                min={min}
                max={max}
                disabled={disabled}
                {...field}
                onChange={(e) => {
                  if (type === "number") {
                    // Convert NaN (from cleared input) to null for proper validation
                    const value = e.target.valueAsNumber;
                    field.onChange(Number.isNaN(value) ? null : value);
                  } else if (type === "date") {
                    field.onChange(stringToDate(e.target.value));
                  } else {
                    field.onChange(e);
                  }
                }}
                value={inputValue}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}

type FormCheckboxFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  label: string;
  className?: string;
  disabled?: boolean;
};

function FormCheckboxField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  className,
  disabled,
}: FormCheckboxFieldProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            "flex flex-row items-start space-x-3 space-y-0",
            className
          )}
        >
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel className="text-sm font-normal cursor-pointer">
              {label}
            </FormLabel>
          </div>
        </FormItem>
      )}
    />
  );
}

type FormTextareaFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  label?: string;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  /** Show a red asterisk after the label to indicate required field */
  required?: boolean;
};

function FormTextareaField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  placeholder,
  rows = 4,
  className,
  disabled,
  required,
}: FormTextareaFieldProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <FormControl>
            <Textarea
              placeholder={placeholder}
              rows={rows}
              disabled={disabled}
              {...field}
              value={field.value ?? ""}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type FormToggleGroupFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  label: string;
  className?: string;
  disabled?: boolean;
  /** Show a red asterisk after the label to indicate required field */
  required?: boolean;
};

function FormToggleGroupField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  className,
  disabled,
  required,
}: FormToggleGroupFieldProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <div className="flex items-center justify-between gap-4">
            <FormLabel className="text-sm font-normal flex-1">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
            <FormControl>
              <ToggleGroup
                type="single"
                value={
                  field.value === undefined || field.value === null
                    ? undefined
                    : field.value
                    ? "yes"
                    : "no"
                }
                onValueChange={(value) => {
                  if (value === "yes") {
                    field.onChange(true);
                  } else if (value === "no") {
                    field.onChange(false);
                  }
                  // Don't allow unsetting back to undefined - once a value is selected,
                  // user can only switch between yes and no, not back to empty
                  // This prevents accidental validation errors from unclicking
                }}
                className="justify-start"
                disabled={disabled}
              >
                <ToggleGroupItem
                  value="yes"
                  aria-label="Yes"
                  className="w-16 data-[state=on]:bg-primary data-[state=on]:text-white"
                >
                  Yes
                </ToggleGroupItem>
                <ToggleGroupItem
                  value="no"
                  aria-label="No"
                  className="w-16 data-[state=on]:bg-primary data-[state=on]:text-white"
                >
                  No
                </ToggleGroupItem>
              </ToggleGroup>
            </FormControl>
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface SelectOption {
  value: string;
  label: string;
}

type FormSelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  label?: string;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
  /** Show a red asterisk after the label to indicate required field */
  required?: boolean;
};

function FormSelectField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  placeholder = "Select...",
  options,
  className,
  disabled,
  required,
}: FormSelectFieldProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <Select
            onValueChange={field.onChange}
            value={field.value as string}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

interface GroupedSelectOption {
  value: string;
  label: string;
  description?: string | null;
}

interface GroupedSelectGroup {
  group_name: string | null;
  group_order: number;
  options: GroupedSelectOption[];
}

type FormGroupedSelectFieldProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> = {
  name: TName;
  label?: string;
  placeholder?: string;
  groups: GroupedSelectGroup[];
  className?: string;
  disabled?: boolean;
  /** Show a red asterisk after the label to indicate required field */
  required?: boolean;
};

function FormGroupedSelectField<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  label,
  placeholder = "Select...",
  groups,
  className,
  disabled,
  required,
}: FormGroupedSelectFieldProps<TFieldValues, TName>) {
  const { control } = useFormContext<TFieldValues>();

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && (
            <FormLabel>
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </FormLabel>
          )}
          <Select
            onValueChange={field.onChange}
            value={field.value as string}
            disabled={disabled}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {groups.map((group) => (
                <SelectGroup key={group.group_name ?? "ungrouped"}>
                  {group.group_name && (
                    <SelectLabel>{group.group_name}</SelectLabel>
                  )}
                  {group.options.map((option) => (
                    <SelectItemWithDescription
                      key={option.value}
                      value={option.value}
                      description={option.description}
                    >
                      {option.label}
                    </SelectItemWithDescription>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export {
  useFormField,
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  FormInputField,
  FormCheckboxField,
  FormTextareaField,
  FormToggleGroupField,
  FormSelectField,
  FormGroupedSelectField,
  type SelectOption,
  type GroupedSelectOption,
  type GroupedSelectGroup,
};
