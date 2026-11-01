import Dialog from "@mui/material/Dialog";
import CloseIcon from "@mui/icons-material/Close";
import "./CreateScheduleDialog.css";
import { useLanguage } from "../../i18n/LanguageContext";

function CreateScheduleDialog({
  onShow,
}: {
  onShow: (value: boolean) => void;
}) {
  // 当前语言的翻译
  const { t } = useLanguage();

  return (
    <Dialog
      open={true}
      maxWidth="md"
      fullWidth
    >
      <div className="createScheduleDialog">

        {/* Header */}
        <div className="dialogHeader">

          <div>
            <h2>{t.dialog.title}</h2>

            <p>{t.dialog.description}</p>
          </div>

          <button className="dialogCloseButton" onClick={() => onShow(false)}>
            <CloseIcon />
          </button>

        </div>


        {/* Content */}
        <div className="dialogContent">

          {/* 左边：员工 */}
          <div className="employeeSection">

            <h3>{t.dialog.excludedTitle}</h3>

            <p className="sectionDescription">{t.dialog.excludedDescription}</p>


            {/* 搜索 */}
            <input
              className="employeeSearch"
              type="text"
              placeholder={t.dialog.searchPlaceholder}
            />


            {/* 员工列表 */}
            <div className="employeeList">

              <label className="employeeItem">

                <input type="checkbox" />

                <div className="employeeAvatar">
                  TJ
                </div>

                <div className="employeeInfo">
                  <strong>Tom Johnson</strong>
                  <span>{t.departments.Kitchen}</span>
                </div>

              </label>


              <label className="employeeItem">

                <input type="checkbox" />

                <div className="employeeAvatar">
                  AB
                </div>

                <div className="employeeInfo">
                  <strong>Alice Brown</strong>
                  <span>{t.departments.Service}</span>
                </div>

              </label>


              <label className="employeeItem">

                <input type="checkbox" />

                <div className="employeeAvatar">
                  JW
                </div>

                <div className="employeeInfo">
                  <strong>Jack Williams</strong>
                  <span>{t.departments.Kitchen}</span>
                </div>

              </label>


              <label className="employeeItem">

                <input type="checkbox" />

                <div className="employeeAvatar">
                  ED
                </div>

                <div className="employeeInfo">
                  <strong>Emily Davis</strong>
                  <span>{t.departments.Hall}</span>
                </div>

              </label>


              <label className="employeeItem">

                <input type="checkbox" />

                <div className="employeeAvatar">
                  DM
                </div>

                <div className="employeeInfo">
                  <strong>David Miller</strong>
                  <span>{t.departments.Service}</span>
                </div>

              </label>

            </div>

          </div>


          {/* 右边 */}
          <div className="scheduleSettings">

            <h3>{t.dialog.monthTitle}</h3>

            <p className="sectionDescription">{t.dialog.monthDescription}</p>


            {/* 月份 */}
            <label className="inputLabel">{t.dialog.monthLabel}</label>

            <input
              className="monthInput"
              type="month"
            />


            {/* 提示 */}
            <div className="scheduleNotice">

              <div className="noticeIcon">
                !
              </div>

              <div className="noticeContent">

                <strong>{t.dialog.rulesTitle}</strong>

                <ul>
                  {/* 规则列表从翻译数组生成 */}
                  {t.dialog.rules.map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ul>

              </div>

            </div>

          </div>

        </div>


        {/* Footer */}
        <div className="dialogFooter">

          <button className="cancelButton">{t.dialog.cancel}</button>

          <button className="generateButton">{t.dialog.generate}</button>

        </div>

      </div>

    </Dialog>
  );
}

export default CreateScheduleDialog;