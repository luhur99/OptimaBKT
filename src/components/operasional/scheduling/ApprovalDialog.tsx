import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useForm, Controller } from 'react-hook-form';
import { FormControl } from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast"; // Mengganti import toast

// Define Technician type based on schema
interface Technician {
  id: string;
  name: string;
  type: 'internal' | 'external';
}

interface ApprovalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { assignedTechnicianId: string; notes: string; status: 'approved' | 'rejected' }) => void;
  request: {
    id: string;
    assigned_technician_id?: string;
    // ... other request properties
  };
}

const ApprovalDialog = ({ isOpen, onClose, onSubmit, request }: ApprovalDialogProps) => {
  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      assignedTechnicianId: request?.assigned_technician_id || '',
      notes: '',
      status: '',
    }
  });

  const { toast } = useToast(); // Inisialisasi useToast

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loadingTechnicians, setLoadingTechnicians] = useState(true);
  const [errorTechnicians, setErrorTechnicians] = useState<string | null>(null);

  useEffect(() => {
    const fetchTechnicians = async () => {
      setLoadingTechnicians(true);
      setErrorTechnicians(null);
      const { data, error } = await supabase
        .from('technicians')
        .select('id, name, type')
        .eq('type', 'internal'); // Filter for internal technicians

      if (error) {
        console.error('Error fetching internal technicians:', error.message);
        setErrorTechnicians('Failed to load internal technicians.');
        toast({
          title: "Error",
          description: "Failed to load internal technicians.",
          variant: "destructive",
        });
      } else {
        setTechnicians(data || []);
      }
      setLoadingTechnicians(false);
    };

    if (isOpen) {
      fetchTechnicians();
      // Reset form values when dialog opens or request changes
      reset({
        assignedTechnicianId: request?.assigned_technician_id || '',
        notes: '',
        status: '',
      });
    }
  }, [isOpen, request, reset, toast]);

  const handleFormSubmit = (data: { assignedTechnicianId: string; notes: string; status: 'approved' | 'rejected' }) => {
    onSubmit(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] glassmorphism border border-gray-700 text-gray-300">
        <DialogHeader>
          <DialogTitle className="text-neon-cyan">Approve/Reject Scheduling Request</DialogTitle>
          <DialogDescription className="text-gray-400">
            Review the scheduling request and assign a technician if approving.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="assignedTechnicianId" className="text-right text-gray-300">
              Technician
            </Label>
            <Controller
              name="assignedTechnicianId"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={loadingTechnicians}>
                  <FormControl>
                    <SelectTrigger className="col-span-3 glassmorphism border border-gray-700 text-gray-300">
                      <SelectValue placeholder="Select an internal technician" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="glassmorphism border border-gray-700 text-gray-300 bg-gray-800">
                    {loadingTechnicians ? (
                      <SelectItem value="" disabled>Loading technicians...</SelectItem>
                    ) : errorTechnicians ? (
                      <SelectItem value="" disabled>{errorTechnicians}</SelectItem>
                    ) : technicians.length === 0 ? (
                      <SelectItem value="" disabled>No internal technicians found.</SelectItem>
                    ) : (
                      technicians.map((tech) => (
                        <SelectItem key={tech.id} value={tech.id}>
                          {tech.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="notes" className="text-right text-gray-300">
              Notes
            </Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  id="notes"
                  placeholder="Add any relevant notes"
                  className="col-span-3 glassmorphism border border-gray-700 text-gray-300 bg-gray-800"
                  {...field}
                />
              )}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setValue('status', 'rejected');
                handleSubmit(handleFormSubmit)();
              }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Reject
            </Button>
            <Button
              type="button"
              onClick={() => {
                setValue('status', 'approved');
                handleSubmit(handleFormSubmit)();
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Approve
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { ApprovalDialog };