import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-card group-[.toaster]:text-card-foreground group-[.toaster]:border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground hover:group-[.toast]:bg-primary/90",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground hover:group-[.toast]:bg-muted/80",
          success: "group-[.toaster]:!bg-primary/10 group-[.toaster]:!border-primary/30 group-[.toaster]:!text-foreground [&_svg]:!text-primary",
          error: "group-[.toaster]:!bg-destructive/10 group-[.toaster]:!border-destructive/30 group-[.toaster]:!text-foreground [&_svg]:!text-destructive",
          warning: "group-[.toaster]:!bg-amber-500/10 group-[.toaster]:!border-amber-500/30 group-[.toaster]:!text-foreground [&_svg]:!text-amber-600 dark:[&_svg]:!text-amber-500",
          info: "group-[.toaster]:!bg-blue-500/10 group-[.toaster]:!border-blue-500/30 group-[.toaster]:!text-foreground [&_svg]:!text-blue-600 dark:[&_svg]:!text-blue-500",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
