import { ICON_COLOR_MAP, parseLucideIcon } from "~/lib/lucideIcons";
import { LucideIcon } from "./LucideIcon";
import { cn } from "~/lib/utils";
import type { Home } from "lucide-react";

type LucideProps = React.ComponentProps<typeof Home>;

export const RenderIcon = ({
  icon,
  ...props
}: { icon: string } & Omit<LucideProps, "name">) => {
  const parsed = parseLucideIcon(icon);

  if (parsed.type === "emoji") {
    // @ts-ignore
    return <span {...props}>{parsed.value}</span>;
  }

  const color = ICON_COLOR_MAP[parsed.color];

  return (
    <LucideIcon
      name={parsed.name}
      {...props}
      className={cn(color.textColor, color.darkTextColor, props.className)}
    />
  );
};
