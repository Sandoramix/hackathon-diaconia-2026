import { ICON_MAP } from "~/lib/lucideIcons";
import type { Home } from "lucide-react";

export const LucideIcon = ({
  name,
  ...props
}: { name: string } & React.ComponentProps<typeof Home>) => {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) {
    return null;
  }
  return <IconComponent {...props} />;
};
