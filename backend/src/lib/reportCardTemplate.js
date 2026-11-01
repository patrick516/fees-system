const generateReportCardHTML = (data) => {
  const { student, school, term, academicYear, subjects, summary } = data;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; color: #000; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; position: relative; }
        .header-logo { height: 70px; width: 70px; object-fit: contain; margin: 0 auto 8px auto; display: block; }
        .header h1 { margin: 0; font-size: 18px; text-transform: uppercase; letter-spacing: 1px; }
        .header h2 { margin: 5px 0; font-size: 16px; color: #1e3a8a; }
        .header p { margin: 2px 0; font-size: 10px; }
        .student-info { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 11px; }
        .student-info div { width: 48%; }
        .student-info p { margin: 4px 0; display: flex; justify-content: space-between; border-bottom: 1px dotted #ccc; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        th, td { border: 1px solid #000; padding: 6px; text-align: center; font-size: 10px; }
        th { background-color: #1e3a8a; color: #fff; font-weight: bold; }
        .text-left { text-align: left; }
        .summary-table td { text-align: left; font-weight: bold; }
        .summary-table td span { font-weight: normal; }
        .grading-key { display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 9px; }
        .grading-key div { border: 1px solid #000; padding: 4px; text-align: center; width: 11%; }
        .comments { border: 1px solid #000; padding: 10px; margin-bottom: 15px; min-height: 50px; }
        .footer { display: flex; justify-content: space-between; font-size: 10px; margin-top: 20px; gap: 20px; }
        .footer div { flex: 1; text-align: center; }
        .footer .signature-block { display: flex; flex-direction: column; justify-content: flex-end; align-items: center; min-height: 80px; }
        .footer .signature-img { max-height: 40px; margin-bottom: 4px; }
        .footer .stamp-img { max-height: 60px; margin-bottom: 4px; }
        .footer .line { width: 100%; border-top: 1px solid #000; padding-top: 4px; font-size: 9px; }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        ${school.logo ? `<img src="${school.logo}" alt="Logo" class="header-logo" />` : ""}
        <p>REPUBLIC OF MALAWI</p>
        <p>MINISTRY OF EDUCATION</p>
        <h2>${school.name.toUpperCase()}</h2>
   <p>${school.address || "P.O. Box ____"} | Tel: ${school.phone || "+265 ____"}</p>
        <h1 style="margin-top: 10px; background: #1e3a8a; color: white; padding: 5px;">STUDENT TERMLY PROGRESS REPORT</h1>
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info">
        <div>
          <p><strong>Student Name:</strong> <span>${student.fullName}</span></p>
          <p><strong>Form / Class:</strong> <span>${student.class.name}</span></p>
          <p><strong>Student Type:</strong> <span>${student.studentType === "BOARDING" ? "Boarder" : "Day Scholar"}</span></p>
          <p><strong>No. of Students:</strong> <span>${summary.totalStudents}</span></p>
        </div>
        <div>
          <p><strong>Student ID:</strong> <span>${student.studentCode}</span></p>
          <p><strong>Term:</strong> <span>${term.replace("_", " ")}</span></p>
          <p><strong>Academic Year:</strong> <span>${academicYear}</span></p>
        </div>
      </div>

      <!-- MARKS TABLE -->
      <table>
        <thead>
          <tr>
            <th style="width: 20%;">SUBJECT</th>
            <th>TEST 1<br>/100</th>
            <th>TEST 2<br>/100</th>
            <th>END OF<br>TERM /100</th>
            <th>TOTAL<br>%</th>
            <th>MSCE<br>GRADE</th>
            <th>POSN</th>
            <th style="width: 20%;">TEACHER'S REMARKS</th>
            <th>INIT.</th>
          </tr>
        </thead>
        <tbody>
          ${subjects
            .map(
              (sub) => `
            <tr>
              <td class="text-left">${sub.name}</td>
              <td>${sub.test1 || "-"}</td>
              <td>${sub.test2 || "-"}</td>
              <td>${sub.endTerm || "-"}</td>
              <td>${sub.total || "-"}</td>
              <td><strong>${sub.grade || "-"}</strong></td>
              <td>${sub.position || "-"}</td>
              <td class="text-left">${sub.remarks || ""}</td>
              <td></td>
            </tr>
          `,
            )
            .join("")}
        </tbody>
      </table>

      <!-- SUMMARY -->
      <table class="summary-table">
        <tr>
          <td>Total Marks: <span>${summary.totalMarks} / 1400</span></td>
          <td>Average %: <span>${summary.average}%</span></td>
          <td>Aggregate (best 6): <span>${summary.aggregate}</span></td>
          <td>Position: <span>${summary.position} out of ${summary.totalStudents}</span></td>
          <td>Overall Grade: <span>${summary.overallGrade}</span></td>
        </tr>
        <tr>
          <td colspan="5">
            <strong>Result:</strong> 
            <span>[ ${summary.result === "PROMOTED" ? "✓" : " "} ] PROMOTED</span>
            <span>[ ${summary.result === "REPEAT" ? "✓" : " "} ] REPEAT</span>
            <span>[ ${summary.result === "DISCONTINUED" ? "✓" : " "} ] DISCONTINUED</span>
            <span>[ ${summary.result === "TRIAL" ? "✓" : " "} ] PROMOTED ON TRIAL</span>
          </td>
        </tr>
      </table>

      <!-- GRADING KEY -->
      <div class="grading-key">
        <div style="background:#d1fae5;">Grade 1<br>80-100%</div>
        <div style="background:#d1fae5;">Grade 2<br>75-79%</div>
        <div style="background:#fef3c7;">Grade 3<br>70-74%</div>
        <div style="background:#fef3c7;">Grade 4<br>65-69%</div>
        <div style="background:#fef3c7;">Grade 5<br>60-64%</div>
        <div style="background:#fee2e2;">Grade 6<br>55-59%</div>
        <div style="background:#fee2e2;">Grade 7<br>50-54%</div>
        <div style="background:#fee2e2;">Grade 8<br>45-49%</div>
        <div style="background:#fca5a5;">Grade 9<br>0-44%</div>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <p><strong>CLASS TEACHER'S COMMENT:</strong></p>
        <p style="color: #555; font-style: italic; white-space: pre-wrap;">${summary.classTeacherComment || ""}</p>
      </div>
      <div class="comments">
        <p><strong>HEAD TEACHER'S COMMENT:</strong></p>
        <p style="color: #555; font-style: italic; white-space: pre-wrap;">${summary.headTeacherComment || ""}</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div class="signature-block">
          ${school.headTeacherStampUrl ? `<img src="${school.headTeacherStampUrl}" alt="School Stamp" class="stamp-img" />` : ""}
          <div class="line">School Stamp</div>
        </div>
        <div class="signature-block">
          ${school.headTeacherSignatureUrl ? `<img src="${school.headTeacherSignatureUrl}" alt="Head Teacher Signature" class="signature-img" />` : ""}
          <div class="line">${school.headTeacherName || "Head Teacher"}</div>
        </div>
        <div class="signature-block">
          <div class="line">Date</div>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = { generateReportCardHTML };
