// src/components/EmployeeFormDialog/EmployeeFormDialog.tsx
// =====================================================
// 添加 / 编辑员工的弹窗（同一个组件，两种用法）
//
// - 传了 employee → 编辑模式：表单里先填好这个人的数据，按钮是「保存」
// - 没传 employee → 添加模式：表单是空的（带默认值），按钮是「添加」
//
// 表单规则（和 docs/business-rules.md 一致）：
// 1. 姓名、电话必填；电话只能是数字和「-」，而且不能和别人重复
// 2. 职位跟着部门走：厨房 = 主厨 / 厨师 / 洗碗工，服务员 = 服务员 / 接待 / 店长
// 3. 厨房全部是正社员，选了厨房就不能选兼职；店长也一定是正社员，选了店长同样不能选兼职
// 4. 职位是「店长」时，点添加 / 保存后会再弹一个确认框，确认后才真正提交
//    （店长以后对应管理权限，填错影响很大，所以多确认一次）
//
// 这个组件只负责“填表 + 检查”，真正保存（调接口）由父组件 onSubmit 去做
// =====================================================

import { useState, type FormEvent } from "react";
import Dialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";

import { useLanguage } from "../../i18n/LanguageContext";
import type { Department, EmployeeStatus, EmploymentType, Position } from "../../i18n/translations";
import { positionsByDepartment, type Employee, type EmployeeInput } from "../../data/employees";
import "./EmployeeFormDialog.css";

interface Props {
  employee?: Employee;                     // 有 = 编辑，没有 = 添加
  allEmployees: Employee[];                // 用来检查电话是否重复
  onClose: () => void;
  onSubmit: (input: EmployeeInput) => void;
}

// 每个字段的错误信息（没有错误就是 undefined）
type Errors = Partial<Record<"name" | "phone", string>>;

// 电话格式：只允许数字和「-」，至少 6 位
const PHONE_PATTERN = /^[0-9-]{6,20}$/;

// 添加模式的默认值：服务员部门、服务员职位、兼职、在职
const EMPTY_FORM: EmployeeInput = {
  name: "",
  phone: "",
  department: "Hall",
  position: "Server",
  employment: "partTime",
  status: "active",
};

export default function EmployeeFormDialog({ employee, allEmployees, onClose, onSubmit }: Props) {
  const { t } = useLanguage();
  const isEdit = !!employee;

  // 表单数据：编辑模式用这个人的数据（去掉 id），添加模式用默认值
  const [form, setForm] = useState<EmployeeInput>(() => {
    if (!employee) return EMPTY_FORM;
    return {
      name: employee.name,
      phone: employee.phone,
      department: employee.department,
      position: employee.position,
      employment: employee.employment,
      status: employee.status,
    };
  });
  const [errors, setErrors] = useState<Errors>({});

  // 是否正在显示「职位是店长，确定吗？」确认框
  const [askManager, setAskManager] = useState(false);

  // 改某一个字段，同时清掉这个字段之前的错误提示
  const setField = <K extends keyof EmployeeInput>(key: K, value: EmployeeInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  // 必须是正社员的情况：厨房的人，或者职位是店长
  const mustBeFullTime = (department: Department, position: Position) =>
    department === "Kitchen" || position === "Manager";

  // 换职位：选了店长，雇佣类型自动变成正社员
  const changePosition = (position: Position) => {
    setForm((prev) => ({
      ...prev,
      position,
      employment: mustBeFullTime(prev.department, position) ? "fullTime" : prev.employment,
    }));
  };

  // 换部门：职位换成新部门的第一个；厨房强制正社员
  const changeDepartment = (department: Department) => {
    setForm((prev) => ({
      ...prev,
      department,
      position: positionsByDepartment[department].includes(prev.position)
        ? prev.position
        : positionsByDepartment[department][0],
      employment: department === "Kitchen" ? "fullTime" : prev.employment,
    }));
  };

  // ---------- 提交前检查 ----------
  const validate = (): Errors => {
    const e: Errors = {};
    const name = form.name.trim();
    const phone = form.phone.trim();

    if (!name) e.name = t.employee.errNameRequired;

    if (!phone) e.phone = t.employee.errPhoneRequired;
    else if (!PHONE_PATTERN.test(phone)) e.phone = t.employee.errPhoneFormat;
    // 电话重复：编辑时要排除自己
    else if (allEmployees.some((x) => x.phone === phone && x.id !== employee?.id)) e.phone = t.employee.errPhoneDuplicate;

    return e;
  };

  const handleSubmit = (ev: FormEvent) => {
    ev.preventDefault();                       // 阻止表单默认的“刷新页面”
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;     // 有错误就不提交

    // 职位是店长：先不提交，弹确认框，让店长再确认一遍
    if (form.position === "Manager") {
      setAskManager(true);
      return;
    }
    submitNow();
  };

  // 真正提交（去掉姓名、电话前后多余的空格）
  const submitNow = () => {
    setAskManager(false);
    onSubmit({ ...form, name: form.name.trim(), phone: form.phone.trim() });
  };

  // 雇佣类型下面的说明文字
  const employmentHint =
    form.department === "Kitchen" ? t.employee.kitchenFullTimeOnly
      : form.position === "Manager" ? t.employee.managerFullTimeOnly
      : form.employment === "fullTime" ? t.employee.fullTimeHint
        : t.employee.partTimeHint;

  const departments: Department[] = ["Kitchen", "Hall"];
  const employments: EmploymentType[] = ["fullTime", "partTime"];
  const statuses: EmployeeStatus[] = ["active", "onLeave"];

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      {/* noValidate：不用浏览器自带的气泡提示，用我们自己的错误文字 */}
      <form className="empForm" onSubmit={handleSubmit} noValidate>

        {/* ===== 标题 ===== */}
        <div className="efHeader">
          <div>
            <h2>{isEdit ? t.employee.formEditTitle : t.employee.formAddTitle}</h2>
            <p>{isEdit ? t.employee.formEditDesc : t.employee.formAddDesc}</p>
          </div>
          <button type="button" className="efClose" onClick={onClose} aria-label={t.employee.cancel}>
            <CloseIcon />
          </button>
        </div>

        {/* ===== 表单内容 ===== */}
        <div className="efBody">

          {/* 姓名 + 电话：一行两个
              用 <label> 把文字和输入框包在一起：点文字也能让输入框获得焦点 */}
          <div className="efRow">
            <label className="efField">
              <span>{t.employee.fieldName} <b>*</b></span>
              <input
                className={errors.name ? "hasError" : ""}
                value={form.name}
                placeholder={t.employee.fieldNamePlaceholder}
                onChange={(e) => setField("name", e.target.value)}
                autoFocus
                maxLength={40}
              />
              {errors.name && <small className="efError">{errors.name}</small>}
            </label>

            <label className="efField">
              <span>{t.employee.fieldPhone} <b>*</b></span>
              <input
                className={errors.phone ? "hasError" : ""}
                value={form.phone}
                placeholder={t.employee.fieldPhonePlaceholder}
                onChange={(e) => setField("phone", e.target.value)}
                inputMode="tel"
                maxLength={20}
              />
              {errors.phone && <small className="efError">{errors.phone}</small>}
            </label>
          </div>

          {/* 部门：两个大按钮（分段选择）
              type="button"：在 <form> 里的按钮默认是「提交」，必须写成 button 才不会一点就提交表单 */}
          <div className="efField">
            <span>{t.employee.fieldDepartment}</span>
            <div className="efSegment">
              {departments.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={form.department === d ? "active" : ""}
                  onClick={() => changeDepartment(d)}
                >
                  {t.departments[d]}
                </button>
              ))}
            </div>
          </div>

          {/* 职位：只显示这个部门能选的 */}
          <div className="efField">
            <span>{t.employee.fieldPosition}</span>
            <div className="efSegment">
              {positionsByDepartment[form.department].map((p: Position) => (
                <button
                  type="button"
                  key={p}
                  className={form.position === p ? "active" : ""}
                  onClick={() => changePosition(p)}
                >
                  {t.employee.positions[p]}
                </button>
              ))}
            </div>
          </div>

          {/* 雇佣类型 + 状态：一行两个 */}
          <div className="efRow">
            <div className="efField">
              <span>{t.employee.fieldEmployment}</span>
              <div className="efSegment">
                {employments.map((m) => (
                  <button
                    type="button"
                    key={m}
                    className={form.employment === m ? "active" : ""}
                    // 厨房、店长只能是正社员，兼职按钮变灰
                    disabled={mustBeFullTime(form.department, form.position) && m === "partTime"}
                    onClick={() => setField("employment", m)}
                  >
                    {t.employee.employment[m]}
                  </button>
                ))}
              </div>
              <small className="efHint">{employmentHint}</small>
            </div>

            <div className="efField">
              <span>{t.employee.fieldStatus}</span>
              <div className="efSegment">
                {statuses.map((st) => (
                  <button
                    type="button"
                    key={st}
                    className={form.status === st ? "active" : ""}
                    onClick={() => setField("status", st)}
                  >
                    {t.employee.status[st]}
                  </button>
                ))}
              </div>
              {form.status === "onLeave" && <small className="efHint">{t.employee.onLeaveHint}</small>}
            </div>
          </div>

        </div>

        {/* ===== 底部按钮 ===== */}
        <div className="efFooter">
          <button type="button" className="efBtn" onClick={onClose}>{t.employee.cancel}</button>
          <button type="submit" className="efBtn primary">{isEdit ? t.employee.saveEdit : t.employee.saveAdd}</button>
        </div>

      </form>

      {/* ===== 职位是店长时的二次确认框 =====
          弹窗里再开一个弹窗，MUI 会自动把它叠在上面 */}
      <Dialog open={askManager} onClose={() => setAskManager(false)} maxWidth="xs" fullWidth>
        <div className="confirmBox">
          <h3>{t.employee.managerConfirmTitle(form.name.trim())}</h3>
          <p>{t.employee.managerConfirmDesc}</p>
          <div className="confirmActions">
            {/* 返回修改：关掉确认框，回到表单，填的内容都还在 */}
            <button type="button" className="confirmCancel" onClick={() => setAskManager(false)}>
              {t.employee.managerConfirmBack}
            </button>
            <button type="button" className="confirmPrimary" onClick={submitNow}>
              {t.employee.managerConfirmOk}
            </button>
          </div>
        </div>
      </Dialog>
    </Dialog>
  );
}
