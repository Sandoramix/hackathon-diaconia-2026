import { ICON_COLOR_MAP, parseLucideIcon } from "~/lib/lucideIcons";
import { LucideIcon } from "./LucideIcon";
import { cn } from "~/lib/utils";
import type { Home } from "lucide-react";

type LucideProps = React.ComponentProps<typeof Home>;

export const RenderIcon = ({
  icon,
  className,
  style,
  ...iconProps
}: { icon: string } & Omit<LucideProps, "name">) => {
  const parsed = parseLucideIcon(icon);

  if (parsed.type === "emoji") {
    // @ts-ignore
    return <span className={className} style={style} {...iconProps}>{parsed.value}</span>;
  }

  if (parsed.type === "composite") {
    if (parsed.layers.length === 0) return null;
    return (
      <span className={cn("relative inline-flex", className)} style={style}>
        {parsed.layers.map((layer, i) => {
          const color = ICON_COLOR_MAP[layer.color];
          return (
            <LucideIcon
              key={i}
              name={layer.name}
              {...iconProps}
              className={cn(
                color?.textColor,
                color?.darkTextColor,
                i > 0 && "absolute top-0 left-0",
              )}
            />
          );
        })}
      </span>
    );
  }

  const color = ICON_COLOR_MAP[parsed.color];

  return (
    <LucideIcon
      name={parsed.name}
      {...iconProps}
      className={cn(color.textColor, color.darkTextColor, className)}
    />
  );
};
