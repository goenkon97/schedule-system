// components/Card/Card.tsx
// =====================================================
// 统计卡片组件（Dashboard 顶部的四张卡片）
//
// 布局：
// ┌──────────────────────────────┐
// │ 标题（灰色小字）      [图标]  │
// │ 24 （大号数字 + 可选单位）     │
// │ [↑ +2] 说明文字               │
// └──────────────────────────────┘
//
// 用 MUI 的 Card / CardContent / Box / Typography 实现，
// 样式全部写在 sx 里，所以不再需要 Card.css。
// tone 决定这张卡片的主题色（图标底色、图标颜色）。
// =====================================================

import type { ElementType } from "react";
import MuiCard from "@mui/material/Card";          // 改名为 MuiCard，避免和我们自己的 Card 重名
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";

// 卡片可选的主题色
export type CardTone = "blue" | "green" | "amber" | "purple";

// 每种主题色：main = 图标颜色，soft = 图标底色
const toneColors: Record<CardTone, { main: string; soft: string }> = {
  blue:   { main: "#2563EB", soft: "#EFF6FF" },
  green:  { main: "#16A34A", soft: "#DCFCE7" },
  amber:  { main: "#D97706", soft: "#FEF3C7" },
  purple: { main: "#7C3AED", soft: "#EDE9FE" },
};

// ====================
// Card 组件接收的数据
// ====================
interface CardProps {
  title: string;            // 标题
  value: number;            // 数值
  icon: ElementType;        // MUI 图标组件
  tone?: CardTone;          // 主题色，默认蓝色
  unit?: string;            // 数值后面的单位（可选），例如 "h"
  description?: string;     // 底部说明文字（可选）

  // 趋势（可选）：label 显示的文字，例如 "+2"
  // good 表示这个变化是“好事”（绿色）还是“坏事”（红色）
  // —— 员工变多是好事，加班变多是坏事，所以不能只看正负号
  trend?: { label: string; direction: "up" | "down"; good: boolean };
}

export default function Card({
  title,
  value,
  icon: Icon,               // 解构时改名为大写开头，才能当组件用 <Icon />
  tone = "blue",
  unit,
  description,
  trend,
}: CardProps) {

  const color = toneColors[tone];
  const TrendIcon = trend?.direction === "down" ? TrendingDownIcon : TrendingUpIcon;

  return (
    <MuiCard
      elevation={0}           // 不用 MUI 默认的阴影，下面自己写更柔和的
      sx={{
        borderRadius: "16px",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)",
        transition: "transform 0.2s, box-shadow 0.2s",
        // 鼠标悬停时轻微上浮
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 2px 4px rgba(15,23,42,0.06), 0 10px 28px rgba(15,23,42,0.08)",
        },
      }}
    >
      <CardContent sx={{ p: 3, "&:last-child": { pb: 3 } }}>

        {/* ===== 第一行：标题 + 图标 ===== */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>

          <Typography sx={{ fontSize: 14, fontWeight: 500, color: "#6B7280" }}>
            {title}
          </Typography>

          {/* 图标放在带底色的圆角方块里 */}
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              bgcolor: color.soft,
              color: color.main,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon sx={{ fontSize: 24 }} />
          </Box>

        </Box>

        {/* ===== 第二行：大号数字 ===== */}
        <Typography
          component="div"
          sx={{ mt: 0.5, fontSize: 32, fontWeight: 700, color: "#111827", lineHeight: 1.1 }}
        >
          {value}
          {unit && (
            <Box component="span" sx={{ ml: 0.5, fontSize: 16, fontWeight: 600, color: "#6B7280" }}>
              {unit}
            </Box>
          )}
        </Typography>

        {/* ===== 第三行：趋势 + 说明 ===== */}
        {(trend || description) && (
          <Box sx={{ mt: 1.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>

            {trend && (
              <Box
                component="span"
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.25,
                  px: 0.75,
                  py: 0.25,
                  borderRadius: "6px",
                  fontSize: 12,
                  fontWeight: 600,
                  // 好事绿色，坏事红色
                  bgcolor: trend.good ? "#DCFCE7" : "#FEE2E2",
                  color: trend.good ? "#15803D" : "#B91C1C",
                }}
              >
                <TrendIcon sx={{ fontSize: 14 }} />
                {trend.label}
              </Box>
            )}

            {description && (
              <Typography component="span" sx={{ fontSize: 13, color: "#9CA3AF" }}>
                {description}
              </Typography>
            )}

          </Box>
        )}

      </CardContent>
    </MuiCard>
  );
}
