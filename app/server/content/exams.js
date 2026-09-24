// Exams draw questions from the topic quizzes of a skill (and tier). No hints, no teaching.
export const EXAMS = [
  { id: 'exam-excel-b', title: 'Excel Beginner Exam', skill: 'excel', tier: 'Beginner', count: 12, minutes: 20, pass: 70 },
  { id: 'exam-excel-i', title: 'Excel Intermediate Exam', skill: 'excel', tier: 'Intermediate', count: 12, minutes: 25, pass: 70 },
  { id: 'exam-excel-a', title: 'Excel Advanced Exam', skill: 'excel', tier: 'Advanced', count: 10, minutes: 25, pass: 70 },
  { id: 'exam-sql-b', title: 'SQL Beginner Exam', skill: 'sql', tier: 'Beginner', count: 12, minutes: 25, pass: 70 },
  { id: 'exam-sql-i', title: 'SQL Intermediate Exam', skill: 'sql', tier: 'Intermediate', count: 10, minutes: 30, pass: 70 },
  { id: 'exam-sql-a', title: 'SQL Advanced Exam', skill: 'sql', tier: 'Advanced', count: 8, minutes: 35, pass: 70 },
  { id: 'exam-pq', title: 'Power Query Exam', skill: 'pq', tier: null, count: 12, minutes: 20, pass: 70 },
  { id: 'exam-pbi-b', title: 'Power BI Beginner Exam', skill: 'pbi', tier: 'Beginner', count: 12, minutes: 20, pass: 70 },
  { id: 'exam-think', title: 'Analyst Thinking Exam', skill: 'think', tier: null, count: 10, minutes: 15, pass: 70 },
];
