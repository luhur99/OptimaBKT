-- Drop existing trigger to allow function modification
DROP TRIGGER IF EXISTS on_sr_approved_create_schedule ON public.scheduling_requests;

-- Drop existing function (if it still exists from previous changes)
DROP FUNCTION IF EXISTS public.create_schedule_on_sr_approval();

-- Create or replace the function to create a delivery order
CREATE OR REPLACE FUNCTION public.create_delivery_order_on_sr_approval()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_delivery_order_id UUID;
BEGIN
  -- Check if the status has just changed to 'approved' and a do_number has been generated
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.do_number IS NOT NULL THEN
    -- Insert into delivery_orders table
    INSERT INTO public.delivery_orders (
      request_id,
      user_id,
      do_number,
      items_json, -- Placeholder for items, as scheduling_requests doesn't have detailed items
      delivery_date,
      delivery_time,
      status,
      notes
    ) VALUES (
      NEW.id, -- Link to the scheduling_request
      NEW.user_id,
      NEW.do_number,
      '[]'::jsonb, -- Default to empty JSON array for items
      NEW.requested_date,
      NEW.requested_time,
      'pending'::public.delivery_order_status, -- Initial status for the delivery order
      NEW.notes
    )
    RETURNING id INTO new_delivery_order_id;

    -- Update the scheduling_requests table with the new delivery_order_id
    UPDATE public.scheduling_requests
    SET delivery_order_id = new_delivery_order_id
    WHERE id = NEW.id;

  END IF;
  RETURN NEW;
END;
$function$;

-- Recreate the trigger to call the new function
CREATE TRIGGER on_sr_approved_create_delivery_order
  AFTER UPDATE ON public.scheduling_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' AND NEW.do_number IS NOT NULL)
  EXECUTE FUNCTION public.create_delivery_order_on_sr_approval();