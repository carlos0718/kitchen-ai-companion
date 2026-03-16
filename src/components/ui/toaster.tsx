import React from "react";
import { CheckCircle2, AlertTriangle, Info, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import type { ToastVariant } from "@/components/ui/toast";

const variantIcon: Record<NonNullable<ToastVariant>, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />,
  destructive: <XCircle className="h-5 w-5 shrink-0 text-red-200" />,
  warning: <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />,
  info: <Info className="h-5 w-5 shrink-0 text-blue-500" />,
};

export function Toaster() {
  const { toasts } = useToast();

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const icon = variantIcon[(variant ?? "default") as ToastVariant];
        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {icon && <span className="mt-0.5">{icon}</span>}
              <div className="grid gap-1 min-w-0">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && <ToastDescription>{description}</ToastDescription>}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
