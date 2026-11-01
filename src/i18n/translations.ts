// src/i18n/translations.ts
// =====================================================
// 多语言翻译字典
//
// 思路：
// 页面里不再直接写死 "Schedule"、"Login" 这种文字，
// 而是写 t.nav.schedule、t.login 这样的“key”。
// 当前语言是什么，就去对应的字典里取文字。
//
// 三份字典（en / zh / ja）结构必须完全一样，
// 所以先写英文版 en，再用 typeof en 推导出类型 Dictionary，
// 中文和日文都必须符合这个类型 —— 漏写或拼错 key，TypeScript 会直接报错。
// =====================================================

// 支持的语言代码
export type Language = "en" | "zh" | "ja";

// 班次类型：烤肉店只有白班和晚班（时间和需要人数见 src/data/shifts.ts）
export type ShiftType = "day" | "evening";

// 部门（mock 数据里用的是英文值，显示时再翻译）
export type Department = "Kitchen" | "Hall";   // 厨房 / 服务员（大厅）

// 职位（mock 数据里存英文值，显示时翻译）
export type Position = "Chef" | "Cook" | "Server" | "Dishwasher" | "Host" | "Manager";

// 员工状态：在职 / 休假中
export type EmployeeStatus = "active" | "onLeave";

// 每种语言对应的浏览器 locale，用来格式化日期（月份名、年月日顺序）
export const localeMap: Record<Language, string> = {
  en: "en-US",
  zh: "zh-CN",
  ja: "ja-JP",
};

// 切换按钮上显示的文字
export const languageLabels: Record<Language, string> = {
  en: "EN",
  zh: "中文",
  ja: "日本語",
};

// =====================================================
// 英文（基准字典）
// =====================================================
const en = {
  appTitle: "Staff Scheduling System",
  login: "Login",

  // 左侧菜单
  nav: {
    dashboard: "Dashboard",
    schedule: "Schedule",
    employee: "Employee",
    settings: "Settings",
  },

  // 班次名称
  shifts: {
    day: "Day",
    evening: "Evening",
  } as Record<ShiftType, string>,

  leave: "Leave",
  onLeave: "On Leave",
  off: "OFF",

  // 部门
  departments: {
    Kitchen: "Kitchen",
    Hall: "Hall",
  } as Record<Department, string>,
  allDepartments: "All Departments",

  // 带数字的文字写成函数：传入人数，返回整句
  // （因为不同语言里数字的位置不一样）
  staffCount: (n: number) => `${n} staff`,
  leaveCount: (n: number) => `${n} leave`,
  // 排了几个 / 需要几个；不够时显示缺几人
  coverage: (assigned: number, required: number) => `${assigned}/${required}`,
  shortBy: (n: number) => `${n} short`,

  dashboard: {
    title: "Dashboard",
    welcome: "Welcome back, Admin! Here's what's happening today.",
    totalEmployees: "Total Employees",
    scheduledToday: "Scheduled Today",
    onLeaveToday: "On Leave Today",
    totalOvertime: "Total Overtime",
    // 卡片底部说明
    vsLastMonth: "vs last month",
    ofAllStaff: (pct: number) => `${pct}% of all staff`,
    pendingRequests: (n: number) => `${n} requests pending`,
    thisWeek: "this week",
    hours: "h",
    todayOverview: "Today's Schedule Overview",
    employee: "Employee",
    viewFull: "View Full Schedule →",
    noShiftToday: "No one is scheduled today.",
  },

  schedule: {
    title: "Schedule",
    subtitle: "Manage and view staff schedules for the entire month.",
    create: "Create Schedule",
    // 星期：从周日开始（和 Date.getDay() 的 0~6 对应）
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    scheduled: (n: number) => `${n} staff scheduled`,
    viewDetails: "View Details →",
    shortLegend: "Short-staffed",
    shortLegendDesc: "Fewer than required",
  },

  dialog: {
    title: "Create New Schedule",
    description: "Select employees and month to generate a new schedule.",
    excludedTitle: "Employees not included",
    excludedDescription:
      "All employees are included by default. Select the employees who should not participate in this schedule.",
    searchPlaceholder: "Search employee...",
    monthTitle: "Select Month",
    monthDescription: "Choose the month you want to create the schedule for.",
    monthLabel: "Month",
    rulesTitle: "Default scheduling rules",
    rules: [
      "Employees are scheduled as evenly as possible.",
      "Each employee works at most one shift per day.",
      "If there aren't enough staff, the slot is left empty.",
      "You can manually adjust the generated schedule afterwards.",
      "Approved leave is applied after the schedule is created: that shift becomes a day off.",
    ],
    requiredTitle: "Required staff per shift",
    cancel: "Cancel",
    generate: "Generate Schedule",
  },

  settings: {
    title: "Settings",
    subtitle: "Configure system settings and preferences.",
    // 左侧标签
    tabs: {
      general: "General",
      departments: "Departments",
      shifts: "Shifts",
      roles: "Roles & Permissions",
      notifications: "Notifications",
      security: "Security",
      backup: "Backup & Restore",
    },
    generalTitle: "General Settings",
    companyName: "Company Name",
    timeZone: "Time Zone",
    dateFormat: "Date Format",
    timeFormat: "Time Format",
    hour24: "24 Hour",
    hour12: "12 Hour",
    swapTitle: "Allow employees to swap shifts",
    swapDesc: "Enable shift swap requests between employees",
    overtimeTitle: "Require approval for overtime",
    overtimeDesc: "Managers must approve overtime requests",
    save: "Save Changes",
    saved: "Settings saved",
    comingSoon: "This section is coming soon.",
  },

  employee: {
    title: "Employee",
    subtitle: "Manage employee information and details.",
    searchPlaceholder: "Search employees...",
    add: "Add Employee",
    export: "Export",
    colEmployee: "Employee",
    colDepartment: "Department",
    colPosition: "Position",
    colPhone: "Phone",
    colStatus: "Status",
    colActions: "Actions",
    status: { active: "Active", onLeave: "On Leave" } as Record<EmployeeStatus, string>,
    positions: {
      Chef: "Chef",
      Cook: "Cook",
      Server: "Server",
      Dishwasher: "Dishwasher",
      Host: "Host",
      Manager: "Manager",
    } as Record<Position, string>,
    // 分页说明：显示第 from~to 条，共 total 条
    showing: (from: number, to: number, total: number) =>
      `Showing ${from} to ${to} of ${total} employees`,
    empty: "No employees found.",
    edit: "Edit",
    delete: "Delete",
    deleteConfirm: (name: string) => `Delete ${name}?`,
    addComingSoon: "The add-employee form will be built together with the back end.",
  },
};

// 用英文字典自动推导出“字典的形状”
export type Dictionary = typeof en;

// =====================================================
// 中文
// =====================================================
const zh: Dictionary = {
  appTitle: "员工排班系统",
  login: "登录",

  nav: {
    dashboard: "仪表盘",
    schedule: "排班",
    employee: "员工",
    settings: "设置",
  },

  shifts: {
    day: "白班",
    evening: "晚班",
  },

  leave: "请假",
  onLeave: "休假中",
  off: "休息",

  departments: {
    Kitchen: "厨房",
    Hall: "服务员",
  },
  allDepartments: "全部部门",

  staffCount: (n) => `${n} 人`,
  leaveCount: (n) => `${n} 人请假`,
  coverage: (assigned, required) => `${assigned}/${required}`,
  shortBy: (n) => `缺 ${n} 人`,

  dashboard: {
    title: "仪表盘",
    welcome: "欢迎回来，管理员！这是今天的概况。",
    totalEmployees: "员工总数",
    scheduledToday: "今日排班",
    onLeaveToday: "今日请假",
    totalOvertime: "加班总时长",
    vsLastMonth: "较上月",
    ofAllStaff: (pct) => `占全体员工 ${pct}%`,
    pendingRequests: (n) => `${n} 条申请待审批`,
    thisWeek: "本周",
    hours: "小时",
    todayOverview: "今日排班概览",
    employee: "员工",
    viewFull: "查看完整排班 →",
    noShiftToday: "今天没有人排班。",
  },

  schedule: {
    title: "排班",
    subtitle: "管理并查看整个月的员工排班。",
    create: "新建排班",
    weekdays: ["周日", "周一", "周二", "周三", "周四", "周五", "周六"],
    scheduled: (n) => `已排班 ${n} 人`,
    viewDetails: "查看详情 →",
    shortLegend: "缺人",
    shortLegendDesc: "少于需要人数",
  },

  dialog: {
    title: "新建排班",
    description: "选择员工和月份，生成新的排班表。",
    excludedTitle: "不参加排班的员工",
    excludedDescription: "默认所有员工都参加排班。请勾选本次不参加排班的员工。",
    searchPlaceholder: "搜索员工…",
    monthTitle: "选择月份",
    monthDescription: "选择要生成排班的月份。",
    monthLabel: "月份",
    rulesTitle: "默认排班规则",
    rules: [
      "尽量平均地为每位员工排班。",
      "每位员工每天最多上一个班。",
      "人数不够时，空位保持空着。",
      "生成后可以手动调整排班。",
      "请假在排班之后处理：批准后，他那天的班会改成休息。",
    ],
    requiredTitle: "每个班次需要的人数",
    cancel: "取消",
    generate: "生成排班",
  },

  settings: {
    title: "设置",
    subtitle: "配置系统设置和偏好。",
    // 左侧标签
    tabs: {
      general: "通用",
      departments: "部门",
      shifts: "班次",
      roles: "角色与权限",
      notifications: "通知",
      security: "安全",
      backup: "备份与恢复",
    },
    generalTitle: "通用设置",
    companyName: "公司名称",
    timeZone: "时区",
    dateFormat: "日期格式",
    timeFormat: "时间格式",
    hour24: "24 小时制",
    hour12: "12 小时制",
    swapTitle: "允许员工换班",
    swapDesc: "允许员工之间发起换班申请",
    overtimeTitle: "加班需要审批",
    overtimeDesc: "加班申请必须由管理员批准",
    save: "保存更改",
    saved: "设置已保存",
    comingSoon: "此部分即将推出。",
  },

  employee: {
    title: "员工",
    subtitle: "管理员工的基本信息。",
    searchPlaceholder: "搜索员工…",
    add: "添加员工",
    export: "导出",
    colEmployee: "员工",
    colDepartment: "部门",
    colPosition: "职位",
    colPhone: "电话",
    colStatus: "状态",
    colActions: "操作",
    status: { active: "在职", onLeave: "休假中" },
    positions: {
      Chef: "主厨",
      Cook: "厨师",
      Server: "服务员",
      Dishwasher: "洗碗工",
      Host: "接待",
      Manager: "店长",
    },
    showing: (from, to, total) => `第 ${from}–${to} 条，共 ${total} 名员工`,
    empty: "没有找到员工。",
    edit: "编辑",
    delete: "删除",
    deleteConfirm: (name) => `确定删除 ${name} 吗？`,
    addComingSoon: "添加员工的表单会和后端一起做。",
  },
};

// =====================================================
// 日文
// =====================================================
const ja: Dictionary = {
  appTitle: "スタッフシフト管理システム",
  login: "ログイン",

  nav: {
    dashboard: "ダッシュボード",
    schedule: "シフト",
    employee: "従業員",
    settings: "設定",
  },

  shifts: {
    day: "昼シフト",
    evening: "夜シフト",
  },

  leave: "休暇",
  onLeave: "休暇中",
  off: "休み",

  departments: {
    Kitchen: "キッチン",
    Hall: "ホール",
  },
  allDepartments: "すべての部署",

  staffCount: (n) => `${n}名`,
  leaveCount: (n) => `休暇 ${n}名`,
  coverage: (assigned, required) => `${assigned}/${required}`,
  shortBy: (n) => `${n}名不足`,

  dashboard: {
    title: "ダッシュボード",
    welcome: "おかえりなさい、管理者さん！本日の状況はこちらです。",
    totalEmployees: "従業員数",
    scheduledToday: "本日の出勤",
    onLeaveToday: "本日の休暇",
    totalOvertime: "残業合計",
    vsLastMonth: "先月比",
    ofAllStaff: (pct) => `全従業員の${pct}%`,
    pendingRequests: (n) => `承認待ち ${n}件`,
    thisWeek: "今週",
    hours: "時間",
    todayOverview: "本日のシフト概要",
    employee: "従業員",
    viewFull: "シフト表をすべて見る →",
    noShiftToday: "本日はシフトがありません。",
  },

  schedule: {
    title: "シフト",
    subtitle: "1か月分のスタッフのシフトを管理・確認できます。",
    create: "シフト作成",
    weekdays: ["日", "月", "火", "水", "木", "金", "土"],
    scheduled: (n) => `${n}名が出勤予定`,
    viewDetails: "詳細を見る →",
    shortLegend: "人手不足",
    shortLegendDesc: "必要人数に届かない",
  },

  dialog: {
    title: "新しいシフトを作成",
    description: "従業員と月を選んで、新しいシフトを作成します。",
    excludedTitle: "シフトに入らない従業員",
    excludedDescription:
      "初期状態では全員がシフトに含まれます。今回シフトに入らない従業員を選択してください。",
    searchPlaceholder: "従業員を検索…",
    monthTitle: "月を選択",
    monthDescription: "シフトを作成する月を選んでください。",
    monthLabel: "月",
    rulesTitle: "基本のシフトルール",
    rules: [
      "できるだけ均等にシフトを割り当てます。",
      "1人1日1シフトまでです。",
      "人数が足りない場合、その枠は空いたままになります。",
      "作成後に手動で調整できます。",
      "休暇はシフト作成後に反映され、その日のシフトは休みになります。",
    ],
    requiredTitle: "シフトごとの必要人数",
    cancel: "キャンセル",
    generate: "シフトを作成",
  },

  settings: {
    title: "設定",
    subtitle: "システムの設定と環境設定を行います。",
    // 左侧标签
    tabs: {
      general: "一般",
      departments: "部署",
      shifts: "シフト",
      roles: "役割と権限",
      notifications: "通知",
      security: "セキュリティ",
      backup: "バックアップと復元",
    },
    generalTitle: "一般設定",
    companyName: "会社名",
    timeZone: "タイムゾーン",
    dateFormat: "日付の形式",
    timeFormat: "時刻の形式",
    hour24: "24時間表示",
    hour12: "12時間表示",
    swapTitle: "従業員同士のシフト交換を許可",
    swapDesc: "従業員間でシフト交換の申請ができるようにします",
    overtimeTitle: "残業は承認制にする",
    overtimeDesc: "残業の申請には管理者の承認が必要です",
    save: "変更を保存",
    saved: "設定を保存しました",
    comingSoon: "この項目は準備中です。",
  },

  employee: {
    title: "従業員",
    subtitle: "従業員の情報を管理します。",
    searchPlaceholder: "従業員を検索…",
    add: "従業員を追加",
    export: "エクスポート",
    colEmployee: "従業員",
    colDepartment: "部署",
    colPosition: "役職",
    colPhone: "電話番号",
    colStatus: "ステータス",
    colActions: "操作",
    status: { active: "在籍", onLeave: "休暇中" },
    positions: {
      Chef: "シェフ",
      Cook: "調理",
      Server: "ホールスタッフ",
      Dishwasher: "洗い場",
      Host: "案内係",
      Manager: "店長",
    },
    showing: (from, to, total) => `全${total}名中 ${from}〜${to}名を表示`,
    empty: "該当する従業員がいません。",
    edit: "編集",
    delete: "削除",
    deleteConfirm: (name) => `${name}さんを削除しますか？`,
    addComingSoon: "従業員の追加フォームはバックエンドと一緒に作ります。",
  },
};

// 三份字典汇总，用语言代码取：translations["ja"]
export const translations: Record<Language, Dictionary> = { en, zh, ja };
