CREATE OR REPLACE FUNCTION public.handle_delivery_order_status_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- Ensure user_id is not changed by the user
  IF OLD.user_id IS DISTINCT FROM NEW.user_id THEN
    RAISE EXCEPTION 'Cannot change user_id of a delivery order.';
  END IF;

  -- Only validate status transitions if the status is actually changing
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Prevent changes from final states
    IF OLD.status IN ('delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Cannot change status of a % delivery order once it is in a final state.', OLD.status;
    END IF;

    -- Enforce notes for specific status changes
    IF NEW.status = 'cancelled' AND (NEW.notes IS NULL OR TRIM(NEW.notes) = '') THEN
      RAISE EXCEPTION 'Reason (notes) is required for status change to CANCELLED.';
    END IF;

    -- Allow transitions from pending
    IF OLD.status = 'pending' THEN
      IF NEW.status NOT IN ('on_delivery', 'delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from PENDING to %.', NEW.status;
      END IF;
    -- Allow transitions from on_delivery
    ELSIF OLD.status = 'on_delivery' THEN
      IF NEW.status NOT IN ('delivered', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from ON_DELIVERY to %.', NEW.status;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;