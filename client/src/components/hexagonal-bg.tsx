import { BRAND_COLORS } from "@/lib/brand";

export function HexagonalBackground() {
  return (
    <div className="absolute inset-0 opacity-40">
      <svg
        className="w-full h-full"
        viewBox="0 0 1200 800"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <pattern
            id="hex-pattern"
            x="0"
            y="0"
            width="120"
            height="104"
            patternUnits="userSpaceOnUse"
          >
            <g
              fill="none"
              stroke="url(#hex-gradient)"
              strokeWidth="1.5"
            >
              <polygon points="30,2 90,2 120,52 90,102 30,102 0,52" />
              <polygon points="90,2 150,2 180,52 150,102 90,102 60,52" />
              <polygon points="30,54 90,54 120,104 90,154 30,154 0,104" />
            </g>
          </pattern>
          <linearGradient
            id="hex-gradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor={BRAND_COLORS.pinkFlamingo}
              stopOpacity="0.3"
            />
            <stop
              offset="30%"
              stopColor={BRAND_COLORS.mediumPurple}
              stopOpacity="0.25"
            />
            <stop
              offset="60%"
              stopColor={BRAND_COLORS.royalBlue}
              stopOpacity="0.2"
            />
            <stop
              offset="100%"
              stopColor={BRAND_COLORS.luckyPoint}
              stopOpacity="0.15"
            />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#hex-pattern)" />
      </svg>
    </div>
  );
}
