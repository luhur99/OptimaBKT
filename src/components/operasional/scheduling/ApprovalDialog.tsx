import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { SchedulingRequest } from "./scheduling-columns"; // Updated import path

interface ApprovalDialogProps {
  request: SchedulingRequest | null;
  onApproveSuccess: () => void;
  onClose: () => void;
}

interface Technician {
  id: string;
  full_name: string;
}

const formSchema = z.object({
  technicianType: z.enum(["INTERNAL", "EXTERNAL"], {
    required_error: "Please select a technician type.",
  }),
  assigned_technician_id: z.string().optional(),
  external_technician_name: z.string().optional(),
  scheduled_date: z.date({
    required_error: "A scheduled date is required.",
  }),
});

export function ApprovalDialog({
  request,
  onApproveSuccess,
  onClose,
}: ApprovalDialogProps) {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      technicianType: "INTERNAL",
      assigned_technician_id: "",
      external_technician_name: "",
      scheduled_date: new Date(),
    },
  });

  const technicianType = form.watch("technicianType");

  useEffect(() => {
    const fetchTechnicians = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "TECHNICIAN");

      if (error) {
        console.error("Error fetching technicians:", error);
        showError("Failed to load technicians.");
      } else {
        setTechnicians(data || []);
      }
    };

    fetchTechnicians();
  }, []);

  useEffect(() => {
    if (request) {
      // Reset form when a new request is selected or dialog opens
      form.reset({
        technicianType: "INTERNAL",
        assigned_technician_id: "",
        external_technician_name: "",
        scheduled_date: new Date(),
      });
    }
  }, [request, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!request) return;

    setIsSubmitting(true);
    try {
      const updateData: any = {
        status: "approved",
        technician_type: values.technicianType,
        requested_date: format(values.scheduled_date, "yyyy-MM-dd"), // Update requested_date with scheduled_date
      };

      if (values.technicianType === "INTERNAL") {
        if (!values.assigned_technician_id) {
          showError("Please select an internal technician.");
          setIsSubmitting(false);
          return;
        }
        updateData.assigned_technician_id = values.assigned_technician_id;
        updateData.external_technician_name = null; // Clear external technician name
      } else {
        if (!values.external_technician_name) {
          showError("Please enter an external technician name.");
          setIsSubmitting(false);
          return;
        }
        updateData.external_technician_name = values.external_technician_name;
        updateData.assigned_technician_id = null; // Clear assigned technician ID
      }

      const { data, error } = await supabase
        .from("scheduling_requests")
        .update(updateData)
        .eq("id", request.id)
        .select("do_number") // Select do_number to show in toast
        .single();

      if (error) {
        throw new Error(error.message);
      }

      showSuccess(`Scheduling request approved! DO Number: ${data?.do_number || 'N/A'} has been issued.`);
      onApproveSuccess();
      onClose();
    } catch (error: any) {
      showError(error.message || "Failed to approve request.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!request) return null;

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Approve Scheduling Request</DialogTitle>
        <DialogDescription>
          Approve SR Number: <strong>{request.sr_number}</strong> and assign a technician.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="technicianType"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Technician Type</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                  >
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="INTERNAL" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        Internal Technician
                      </FormLabel>
                    </FormItem>
                    <FormItem className="flex items-center space-x-3 space-y-0">
                      <FormControl>
                        <RadioGroupItem value="EXTERNAL" />
                      </FormControl>
                      <FormLabel className="font-normal">
                        External Technician/Vendor
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {technicianType === "INTERNAL" && (
            <FormField
              control={form.control}
              name="assigned_technician_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Internal Technician</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an internal technician" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {technicianType === "EXTERNAL" && (
            <FormField
              control={form.control}
              name="external_technician_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>External Technician/Vendor Name</FormLabel>
                  <FormControl>
                    <Input placeholder="External Technician Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="scheduled_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Scheduled Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) => date < new Date("1900-01-01")}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Confirming..." : "Confirm & Approve"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}