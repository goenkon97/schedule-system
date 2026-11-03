// src/components/DataTable/tableStyles.ts
// =====================================================
// 所有 MUI 表格共用的样式
//
// MUI 的 Table 默认是 Material Design 风格（大号行距、灰色分隔线），
// 和我们设计图不一样。这里统一写一份覆盖样式，
// 每张表格只要写 <Table sx={tableSx}> 就能保持外观一致，
// 以后想改表格风格，只改这一个文件。
// =====================================================

// 注意：这里故意不写 SxProps 类型。
// SxProps 本身可能是“数组”，而 sx={[tableSx, {...}]} 这种写法里不允许数组再套数组，
// 所以让 TypeScript 自己推导成普通对象类型，就可以和其他样式组合使用。

export const tableSx = {

  // 表头单元格
  "& .MuiTableHead-root .MuiTableCell-root": {
    backgroundColor: "#f9fafb",
    color: "#6b7280",
    fontSize: 13,
    fontWeight: 600,
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  },

  // 内容单元格
  "& .MuiTableBody-root .MuiTableCell-root": {
    fontSize: 14,
    color: "#374151",
    borderBottom: "1px solid #f1f5f9",
    whiteSpace: "nowrap",
  },

  // 鼠标悬停整行变浅灰
  "& .MuiTableBody-root .MuiTableRow-root:hover": {
    backgroundColor: "#f8fafc",
  },

  // 最后一行不要底线（卡片自己有边框）
  "& .MuiTableBody-root .MuiTableRow-root:last-of-type .MuiTableCell-root": {
    borderBottom: "none",
  },
};

// 头像（首字母圆圈）共用样式
export const avatarSx = {
  width: 36,
  height: 36,
  bgcolor: "#e8f0ff",
  color: "#2563eb",
  fontSize: 13,
  fontWeight: 700,
};
