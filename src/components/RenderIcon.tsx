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
    const { size, ...restIconProps } = iconProps as { size?: number } & typeof iconProps;
    const iconSize = size ?? 24;
    const multi = parsed.layers.length > 1;
    return (
      <span
        className={cn("relative inline-flex items-center justify-center flex-shrink-0", className)}
        style={{ width: iconSize, height: iconSize, ...style }}
      >
        {parsed.layers.map((layer, i) => {
          const color = ICON_COLOR_MAP[layer.color];
          const layerSize = multi && i === 0 ? Math.round(iconSize * 0.6) : iconSize;
          return (
            <LucideIcon
              key={i}
              name={layer.name}
              {...restIconProps}
              size={layerSize}
              className={cn(
                color?.textColor,
                color?.darkTextColor,
                i > 0 && "absolute top-0 left-0",
                layer.className,
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
