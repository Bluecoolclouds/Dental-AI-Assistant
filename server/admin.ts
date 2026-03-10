import { pool } from "./db";

export async function getAdminStats() {
  const [
    totalUsers,
    registrationsByDay,
    testStats,
    riskDistribution,
    toothProblems,
    feedbackList,
    activeUsers,
    feedbackCategories,
  ] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS count FROM users`),

    pool.query(`
      SELECT
        TO_CHAR(created_at, 'YYYY-MM-DD') AS day,
        COUNT(*)::int AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY day
      ORDER BY day
    `),

    pool.query(`
      SELECT
        COUNT(*)::int AS total,
        ROUND(AVG(teeth_risk_score))::int AS avg_teeth,
        ROUND(AVG(gums_risk_score))::int AS avg_gums
      FROM test_results
    `),

    pool.query(`
      SELECT overall_risk_level, COUNT(*)::int AS count
      FROM test_results
      GROUP BY overall_risk_level
      ORDER BY count DESC
    `),

    pool.query(`
      SELECT
        problem,
        COUNT(*)::int AS count
      FROM test_results tr,
        jsonb_array_elements_text(
          CASE
            WHEN jsonb_typeof(tr.recommendations) = 'array' THEN tr.recommendations
            ELSE '[]'::jsonb
          END
        ) AS problem
      GROUP BY problem
      ORDER BY count DESC
      LIMIT 10
    `).catch(() => ({ rows: [] })),

    pool.query(`
      SELECT
        f.category,
        f.message,
        f.created_at,
        u.email
      FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
      LIMIT 30
    `),

    pool.query(`
      SELECT COUNT(DISTINCT user_id)::int AS count
      FROM test_results
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `),

    pool.query(`
      SELECT category, COUNT(*)::int AS count
      FROM feedback
      GROUP BY category
      ORDER BY count DESC
    `),
  ]);

  // Also query tooth_data for most common tooth problems
  const toothDataProblems = await pool.query(`
    SELECT
      problem,
      COUNT(*)::int AS count
    FROM tooth_data,
      jsonb_array_elements_text(problems) AS problem
    WHERE problem != 'treated'
    GROUP BY problem
    ORDER BY count DESC
    LIMIT 10
  `).catch(() => ({ rows: [] }));

  return {
    totalUsers: totalUsers.rows[0].count,
    registrationsByDay: registrationsByDay.rows,
    testStats: testStats.rows[0],
    riskDistribution: riskDistribution.rows,
    toothProblems: toothDataProblems.rows,
    feedbackList: feedbackList.rows,
    activeUsers: activeUsers.rows[0].count,
    feedbackCategories: feedbackCategories.rows,
  };
}

export function renderAdminPage(stats: Awaited<ReturnType<typeof getAdminStats>>): string {
  const regLabels = JSON.stringify(stats.registrationsByDay.map((r) => r.day));
  const regData = JSON.stringify(stats.registrationsByDay.map((r) => r.count));

  const riskLabels = JSON.stringify(stats.riskDistribution.map((r) => r.overall_risk_level));
  const riskData = JSON.stringify(stats.riskDistribution.map((r) => r.count));
  const riskColors = JSON.stringify(stats.riskDistribution.map((r) => {
    if (r.overall_risk_level === "low") return "#22c55e";
    if (r.overall_risk_level === "moderate") return "#f59e0b";
    return "#ef4444";
  }));

  const probLabels = JSON.stringify(stats.toothProblems.map((p) => p.problem));
  const probData = JSON.stringify(stats.toothProblems.map((p) => p.count));

  const fbCatLabels = JSON.stringify(stats.feedbackCategories.map((f) => f.category));
  const fbCatData = JSON.stringify(stats.feedbackCategories.map((f) => f.count));

  const CATEGORY_RU: Record<string, string> = {
    bug: "Ошибка",
    feature: "Идея",
    other: "Другое",
  };
  const PROBLEM_RU: Record<string, string> = {
    cavity: "Кариес",
    pain: "Боль",
    crack: "Трещина",
    sensitivity: "Чувствит-ть",
    gum_issue: "Дёсны",
    bleeding: "Кровоточ-ть",
    chip: "Скол",
    filling: "Пломба",
    treated: "Вылечен",
  };
  const RISK_RU: Record<string, string> = { low: "Низкий", moderate: "Средний", high: "Высокий" };

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Dentcor — Аналитика</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f1f5f9;color:#1e293b}
  header{background:#4A90D9;color:#fff;padding:18px 32px;display:flex;align-items:center;gap:12px}
  header h1{font-size:20px;font-weight:700}
  header span{font-size:13px;opacity:.8}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;padding:24px 32px 0}
  .stat-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .stat-card .label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .stat-card .value{font-size:32px;font-weight:700;color:#4A90D9}
  .stat-card .sub{font-size:12px;color:#94a3b8;margin-top:2px}
  .charts{display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;padding:20px 32px}
  .chart-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08)}
  .chart-card h2{font-size:14px;font-weight:600;color:#475569;margin-bottom:16px}
  .chart-wrap{position:relative;height:220px}
  .table-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin:0 32px 32px}
  .table-card h2{font-size:14px;font-weight:600;color:#475569;margin-bottom:12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:8px 12px;background:#f8fafc;color:#64748b;font-weight:600;border-bottom:1px solid #e2e8f0}
  td{padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#334155}
  tr:last-child td{border-bottom:none}
  .badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:11px;font-weight:600}
  .badge-bug{background:#fee2e2;color:#b91c1c}
  .badge-feature{background:#dbeafe;color:#1d4ed8}
  .badge-other{background:#f1f5f9;color:#475569}
  .ts{color:#94a3b8;font-size:12px}
  footer{text-align:center;padding:16px;color:#94a3b8;font-size:12px}
</style>
</head>
<body>
<header>
  <svg width="28" height="28" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="white"/><path d="M13,18 C13,12 16,9 20,9 C24,9 27,12 27,18 L26,28 C26,31 25,34 23,34 C22,34 21,32 20.5,30 L20,30 L19.5,30 C19,32 18,34 17,34 C15,34 14,31 14,28 Z" fill="#4A90D9"/></svg>
  <div>
    <h1>Dentcor Admin</h1>
    <span>Панель аналитики · ${new Date().toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
  </div>
</header>

<div class="grid">
  <div class="stat-card">
    <div class="label">Всего пользователей</div>
    <div class="value">${stats.totalUsers}</div>
  </div>
  <div class="stat-card">
    <div class="label">Активных (30 дней)</div>
    <div class="value">${stats.activeUsers}</div>
    <div class="sub">прошли тест здоровья</div>
  </div>
  <div class="stat-card">
    <div class="label">Тестов пройдено</div>
    <div class="value">${stats.testStats?.total ?? 0}</div>
  </div>
  <div class="stat-card">
    <div class="label">Ср. риск зубов / дёсен</div>
    <div class="value">${stats.testStats?.avg_teeth ?? "—"}<span style="font-size:16px;color:#94a3b8"> / ${stats.testStats?.avg_gums ?? "—"}</span></div>
    <div class="sub">баллов из 100</div>
  </div>
  <div class="stat-card">
    <div class="label">Отзывов получено</div>
    <div class="value">${stats.feedbackList.length}</div>
    <div class="sub">последние 30</div>
  </div>
</div>

<div class="charts">
  <div class="chart-card" style="grid-column:1/-1">
    <h2>Новые регистрации (последние 30 дней)</h2>
    <div class="chart-wrap"><canvas id="regChart"></canvas></div>
  </div>
  <div class="chart-card">
    <h2>Уровень риска пациентов</h2>
    <div class="chart-wrap"><canvas id="riskChart"></canvas></div>
  </div>
  <div class="chart-card">
    <h2>Частые проблемы с зубами</h2>
    <div class="chart-wrap"><canvas id="probChart"></canvas></div>
  </div>
  <div class="chart-card">
    <h2>Категории отзывов</h2>
    <div class="chart-wrap"><canvas id="fbChart"></canvas></div>
  </div>
</div>

<div class="table-card">
  <h2>Последние отзывы пользователей</h2>
  <table>
    <thead><tr><th>Категория</th><th>Сообщение</th><th>Email</th><th>Дата</th></tr></thead>
    <tbody>
      ${stats.feedbackList.map((f) => `
      <tr>
        <td><span class="badge badge-${f.category}">${CATEGORY_RU[f.category] ?? f.category}</span></td>
        <td>${f.message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</td>
        <td>${f.email ?? "<i style='color:#94a3b8'>аноним</i>"}</td>
        <td class="ts">${new Date(f.created_at).toLocaleDateString("ru-RU")}</td>
      </tr>`).join("") || `<tr><td colspan="4" style="text-align:center;color:#94a3b8;padding:24px">Отзывов пока нет</td></tr>`}
    </tbody>
  </table>
</div>

<footer>Dentcor Admin · Данные обновляются при каждом открытии страницы</footer>

<script>
const PROB_RU = ${JSON.stringify(PROBLEM_RU)};
const RISK_RU = ${JSON.stringify(RISK_RU)};

new Chart(document.getElementById('regChart'), {
  type: 'bar',
  data: {
    labels: ${regLabels},
    datasets: [{ label: 'Регистраций', data: ${regData}, backgroundColor: '#4A90D9', borderRadius: 4 }]
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: false }
});

new Chart(document.getElementById('riskChart'), {
  type: 'doughnut',
  data: {
    labels: ${riskLabels}.map(l => RISK_RU[l] || l),
    datasets: [{ data: ${riskData}, backgroundColor: ${riskColors}, borderWidth: 2 }]
  },
  options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
});

new Chart(document.getElementById('probChart'), {
  type: 'bar',
  data: {
    labels: ${probLabels}.map(l => PROB_RU[l] || l),
    datasets: [{ label: 'Случаев', data: ${probData}, backgroundColor: '#7AADE6', borderRadius: 4 }]
  },
  options: { plugins: { legend: { display: false } }, indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: false }
});

new Chart(document.getElementById('fbChart'), {
  type: 'pie',
  data: {
    labels: ${fbCatLabels}.map(l => ({ bug: 'Ошибка', feature: 'Идея', other: 'Другое' })[l] || l),
    datasets: [{ data: ${fbCatData}, backgroundColor: ['#ef4444','#3b82f6','#94a3b8'], borderWidth: 2 }]
  },
  options: { plugins: { legend: { position: 'bottom' } }, maintainAspectRatio: false }
});
</script>
</body>
</html>`;
}
