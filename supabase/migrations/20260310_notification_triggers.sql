-- Add 'success' to severity check (existing table only has 'info', 'warning', 'error')
ALTER TABLE public.user_notifications
  DROP CONSTRAINT IF EXISTS user_notifications_severity_check;

ALTER TABLE public.user_notifications
  ADD CONSTRAINT user_notifications_severity_check
  CHECK (severity IN ('info', 'warning', 'error', 'success'));

-- =====================================================
-- TRIGGER: support_tickets → user_notifications
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_support_ticket_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status actually changes
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, severity, action_url)
    VALUES (
      NEW.user_id,
      'support_update',
      CASE NEW.status
        WHEN 'in_progress' THEN 'Tu consulta está siendo atendida'
        WHEN 'resolved'    THEN 'Tu consulta fue resuelta'
        WHEN 'closed'      THEN 'Tu consulta fue cerrada'
        ELSE                    'Tu consulta fue actualizada'
      END,
      CASE
        WHEN NEW.status = 'resolved' AND NEW.admin_response IS NOT NULL
          THEN NEW.admin_response
        ELSE 'Asunto: ' || NEW.subject
      END,
      CASE NEW.status
        WHEN 'resolved'    THEN 'success'
        WHEN 'in_progress' THEN 'info'
        ELSE                    'info'
      END,
      '/help'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_support_ticket ON public.support_tickets;

CREATE TRIGGER trg_notify_support_ticket
  AFTER UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_support_ticket_change();

-- =====================================================
-- TRIGGER: suggestions → user_notifications
-- =====================================================

CREATE OR REPLACE FUNCTION public.notify_suggestion_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.user_notifications (user_id, type, title, message, severity, action_url)
    VALUES (
      NEW.user_id,
      'suggestion_update',
      CASE NEW.status
        WHEN 'under_review'  THEN 'Tu sugerencia está siendo revisada'
        WHEN 'planned'       THEN '¡Tu sugerencia fue aceptada!'
        WHEN 'implemented'   THEN '¡Tu sugerencia fue implementada!'
        WHEN 'rejected'      THEN 'Tu sugerencia fue revisada'
        ELSE                      'Tu sugerencia fue actualizada'
      END,
      CASE NEW.status
        WHEN 'planned'     THEN 'Está planificada para una próxima versión: ' || NEW.title
        WHEN 'implemented' THEN 'Ya podés usar la funcionalidad: ' || NEW.title
        ELSE                    NEW.title
      END,
      CASE NEW.status
        WHEN 'planned'      THEN 'success'
        WHEN 'implemented'  THEN 'success'
        ELSE                     'info'
      END,
      '/help'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_suggestion ON public.suggestions;

CREATE TRIGGER trg_notify_suggestion
  AFTER UPDATE ON public.suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_suggestion_change();
