import { pool } from "./db";
import { getSetting } from "./storage";

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
    aiToday,
    aiWeek,
    aiMonth,
    aiByDay,
    aiTopUsers,
    msgLimitSetting,
    fileLimitSetting,
    tokenToday,
    tokenWeek,
    tokenMonth,
    tokenTopUsers,
    memoryStats,
    memoryTopNodes,
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

    // AI usage today
    pool.query(`
      SELECT COALESCE(SUM(messages_count),0)::int AS messages, COALESCE(SUM(files_count),0)::int AS files
      FROM ai_usage
      WHERE date = TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ messages: 0, files: 0 }] })),

    // AI usage last 7 days
    pool.query(`
      SELECT COALESCE(SUM(messages_count),0)::int AS messages, COALESCE(SUM(files_count),0)::int AS files
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '6 days', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ messages: 0, files: 0 }] })),

    // AI usage last 30 days
    pool.query(`
      SELECT COALESCE(SUM(messages_count),0)::int AS messages, COALESCE(SUM(files_count),0)::int AS files
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '29 days', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ messages: 0, files: 0 }] })),

    // AI messages by day (last 30 days)
    pool.query(`
      SELECT date, COALESCE(SUM(messages_count),0)::int AS messages
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '29 days', 'YYYY-MM-DD')
      GROUP BY date
      ORDER BY date
    `).catch(() => ({ rows: [] })),

    // Top 10 users by AI messages
    pool.query(`
      SELECT u.email,
             COALESCE(SUM(a.messages_count),0)::int AS total_messages,
             COALESCE(SUM(a.files_count),0)::int    AS total_files
      FROM ai_usage a
      JOIN users u ON u.id = a.user_id
      GROUP BY u.email
      ORDER BY total_messages DESC
      LIMIT 10
    `).catch(() => ({ rows: [] })),

    getSetting("daily_message_limit"),
    getSetting("daily_file_limit"),

    // Token usage today
    pool.query(`
      SELECT
        COALESCE(SUM(input_tokens),0)::int AS input_tokens,
        COALESCE(SUM(output_tokens),0)::int AS output_tokens,
        COALESCE(SUM(input_tokens+output_tokens),0)::int AS total_tokens
      FROM ai_usage
      WHERE date = TO_CHAR(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ input_tokens: 0, output_tokens: 0, total_tokens: 0 }] })),

    // Token usage last 7 days
    pool.query(`
      SELECT
        COALESCE(SUM(input_tokens),0)::int AS input_tokens,
        COALESCE(SUM(output_tokens),0)::int AS output_tokens,
        COALESCE(SUM(input_tokens+output_tokens),0)::int AS total_tokens
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '6 days', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ input_tokens: 0, output_tokens: 0, total_tokens: 0 }] })),

    // Token usage last 30 days
    pool.query(`
      SELECT
        COALESCE(SUM(input_tokens),0)::int AS input_tokens,
        COALESCE(SUM(output_tokens),0)::int AS output_tokens,
        COALESCE(SUM(input_tokens+output_tokens),0)::int AS total_tokens
      FROM ai_usage
      WHERE date >= TO_CHAR(NOW() AT TIME ZONE 'UTC' - INTERVAL '29 days', 'YYYY-MM-DD')
    `).catch(() => ({ rows: [{ input_tokens: 0, output_tokens: 0, total_tokens: 0 }] })),

    // Top 10 users by tokens
    pool.query(`
      SELECT
        u.email,
        COALESCE(SUM(a.input_tokens),0)::int AS input_tokens,
        COALESCE(SUM(a.output_tokens),0)::int AS output_tokens,
        COALESCE(SUM(a.input_tokens+a.output_tokens),0)::int AS total_tokens
      FROM ai_usage a
      JOIN users u ON u.id = a.user_id
      GROUP BY u.email
      HAVING SUM(a.input_tokens+a.output_tokens) > 0
      ORDER BY total_tokens DESC
      LIMIT 10
    `).catch(() => ({ rows: [] })),

    // Memory stats: per-user summary
    pool.query(`
      SELECT
        u.email,
        COUNT(m.id)::int AS node_count,
        COALESCE(SUM(length(m.content)),0)::int AS total_chars,
        COALESCE(SUM(length(m.content)/4),0)::int AS est_tokens
      FROM user_memory_nodes m
      JOIN users u ON u.id = m.user_id
      GROUP BY u.email
      ORDER BY node_count DESC
      LIMIT 15
    `).catch(() => ({ rows: [] })),

    // Top memory segments by estimated token size (across all users)
    pool.query(`
      SELECT
        u.email,
        m.segment,
        m.category,
        length(m.content)::int AS chars,
        (length(m.content)/4)::int AS est_tokens,
        LEFT(m.content, 120) AS preview
      FROM user_memory_nodes m
      JOIN users u ON u.id = m.user_id
      ORDER BY length(m.content) DESC
      LIMIT 20
    `).catch(() => ({ rows: [] })),
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
    aiToday: aiToday.rows[0] ?? { messages: 0, files: 0 },
    aiWeek: aiWeek.rows[0] ?? { messages: 0, files: 0 },
    aiMonth: aiMonth.rows[0] ?? { messages: 0, files: 0 },
    aiByDay: aiByDay.rows,
    aiTopUsers: aiTopUsers.rows,
    settings: {
      daily_message_limit: msgLimitSetting ?? "20",
      daily_file_limit: fileLimitSetting ?? "2",
    },
    tokenToday: tokenToday.rows[0] ?? { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    tokenWeek: tokenWeek.rows[0] ?? { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    tokenMonth: tokenMonth.rows[0] ?? { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
    tokenTopUsers: tokenTopUsers.rows,
    memoryStats: memoryStats.rows,
    memoryTopNodes: memoryTopNodes.rows,
  };
}

export function renderAdminPage(stats: Awaited<ReturnType<typeof getAdminStats>>, adminKey?: string, saved?: boolean): string {
  const regLabels = JSON.stringify(stats.registrationsByDay.map((r) => r.day));
  const regData = JSON.stringify(stats.registrationsByDay.map((r) => r.count));
  const aiDayLabels = JSON.stringify(stats.aiByDay.map((r) => r.date));
  const aiDayData = JSON.stringify(stats.aiByDay.map((r) => r.messages));

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
<title>Toothy — Аналитика</title>
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
  .section-title{font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.5px;padding:20px 32px 0}
  .ai-stat-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08);border-left:4px solid #4A90D9}
  .ai-stat-card .label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
  .ai-stat-card .value{font-size:28px;font-weight:700;color:#4A90D9}
  .ai-stat-card .sub{font-size:12px;color:#94a3b8;margin-top:2px}
  .settings-card{background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 3px rgba(0,0,0,.08);margin:0 32px 16px}
  .settings-card h2{font-size:14px;font-weight:600;color:#475569;margin-bottom:16px}
  .settings-form{display:flex;flex-wrap:wrap;gap:16px;align-items:flex-end}
  .settings-field{display:flex;flex-direction:column;gap:4px}
  .settings-field label{font-size:12px;color:#64748b;font-weight:500}
  .settings-field input{padding:8px 12px;border:1px solid #cbd5e1;border-radius:8px;font-size:14px;width:120px;color:#1e293b}
  .settings-field input:focus{outline:none;border-color:#4A90D9}
  .settings-btn{padding:9px 20px;background:#4A90D9;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;font-weight:500}
  .settings-btn:hover{background:#3b7ec8}
  .saved-banner{background:#dcfce7;color:#166534;padding:8px 16px;border-radius:8px;font-size:13px;font-weight:500;display:inline-block;margin-left:12px}
</style>
</head>
<body>
<header>
  <svg width="28" height="28" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="white"/><path d="M13,18 C13,12 16,9 20,9 C24,9 27,12 27,18 L26,28 C26,31 25,34 23,34 C22,34 21,32 20.5,30 L20,30 L19.5,30 C19,32 18,34 17,34 C15,34 14,31 14,28 Z" fill="#4A90D9"/></svg>
  <div>
    <h1>Toothy Admin</h1>
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

<p class="section-title">Использование ИИ</p>
<div class="grid" style="padding-top:12px">
  <div class="ai-stat-card">
    <div class="label">Сообщений сегодня</div>
    <div class="value">${stats.aiToday.messages}</div>
    <div class="sub">файлов: ${stats.aiToday.files} · лимит: ${stats.settings.daily_message_limit}/день</div>
  </div>
  <div class="ai-stat-card">
    <div class="label">Сообщений за 7 дней</div>
    <div class="value">${stats.aiWeek.messages}</div>
    <div class="sub">файлов: ${stats.aiWeek.files}</div>
  </div>
  <div class="ai-stat-card">
    <div class="label">Сообщений за 30 дней</div>
    <div class="value">${stats.aiMonth.messages}</div>
    <div class="sub">файлов: ${stats.aiMonth.files}</div>
  </div>
</div>

<div class="charts" style="padding-top:16px">
  <div class="chart-card" style="grid-column:1/-1">
    <h2>Сообщений в день (последние 30 дней)</h2>
    <div class="chart-wrap"><canvas id="aiChart"></canvas></div>
  </div>
</div>

<div class="settings-card">
  <h2>⚙️ Настройки лимитов ИИ (в день на пользователя)</h2>
  <form class="settings-form" method="POST" action="/admin/settings">
    <input type="hidden" name="key" value="${adminKey ?? ""}" />
    <div class="settings-field">
      <label>Сообщений (бесплатно)</label>
      <input type="number" name="daily_message_limit" value="${stats.settings.daily_message_limit}" min="0" max="9999" />
    </div>
    <div class="settings-field">
      <label>Файлов (бесплатно)</label>
      <input type="number" name="daily_file_limit" value="${stats.settings.daily_file_limit}" min="0" max="99" />
    </div>
    <button type="submit" class="settings-btn">Сохранить</button>
    ${saved ? `<span class="saved-banner">✓ Сохранено</span>` : ""}
  </form>
</div>

<div class="table-card">
  <h2>Топ пользователей по ИИ</h2>
  <table>
    <thead><tr><th>Email</th><th>Сообщений (всего)</th><th>Файлов (всего)</th></tr></thead>
    <tbody>
      ${stats.aiTopUsers.map((u: any) => `
      <tr>
        <td>${u.email}</td>
        <td><strong>${u.total_messages}</strong></td>
        <td>${u.total_files}</td>
      </tr>`).join("") || `<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:24px">Данных пока нет</td></tr>`}
    </tbody>
  </table>
</div>

<p class="section-title">Статистика токенов</p>
<div class="grid" style="padding-top:12px">
  <div class="ai-stat-card" style="border-top-color:#a78bfa">
    <div class="label">Токенов сегодня</div>
    <div class="value" style="color:#a78bfa">${stats.tokenToday.total_tokens.toLocaleString("ru")}</div>
    <div class="sub">вход: ${stats.tokenToday.input_tokens.toLocaleString("ru")} · выход: ${stats.tokenToday.output_tokens.toLocaleString("ru")}</div>
  </div>
  <div class="ai-stat-card" style="border-top-color:#a78bfa">
    <div class="label">Токенов за 7 дней</div>
    <div class="value" style="color:#a78bfa">${stats.tokenWeek.total_tokens.toLocaleString("ru")}</div>
    <div class="sub">вход: ${stats.tokenWeek.input_tokens.toLocaleString("ru")} · выход: ${stats.tokenWeek.output_tokens.toLocaleString("ru")}</div>
  </div>
  <div class="ai-stat-card" style="border-top-color:#a78bfa">
    <div class="label">Токенов за 30 дней</div>
    <div class="value" style="color:#a78bfa">${stats.tokenMonth.total_tokens.toLocaleString("ru")}</div>
    <div class="sub">вход: ${stats.tokenMonth.input_tokens.toLocaleString("ru")} · выход: ${stats.tokenMonth.output_tokens.toLocaleString("ru")}</div>
  </div>
</div>

${stats.tokenTopUsers.length > 0 ? `
<div class="table-card">
  <h2>Топ пользователей по токенам</h2>
  <table>
    <thead><tr><th>Email</th><th>Входящих</th><th>Исходящих</th><th>Всего токенов</th></tr></thead>
    <tbody>
      ${stats.tokenTopUsers.map((u: any) => `
      <tr>
        <td>${u.email}</td>
        <td>${Number(u.input_tokens).toLocaleString("ru")}</td>
        <td>${Number(u.output_tokens).toLocaleString("ru")}</td>
        <td><strong>${Number(u.total_tokens).toLocaleString("ru")}</strong></td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>` : ""}

<p class="section-title">Нейронная память пациентов</p>

${stats.memoryStats.length > 0 ? `
<div class="table-card">
  <h2>Память по пользователям</h2>
  <table>
    <thead><tr><th>Email</th><th>Узлов</th><th>Символов</th><th>≈ Токенов</th></tr></thead>
    <tbody>
      ${stats.memoryStats.map((m: any) => `
      <tr>
        <td>${m.email}</td>
        <td><strong>${m.node_count}</strong></td>
        <td>${Number(m.total_chars).toLocaleString("ru")}</td>
        <td style="color:#a78bfa"><strong>~${Number(m.est_tokens).toLocaleString("ru")}</strong></td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>

<div class="table-card">
  <h2>Топ узлов памяти по размеру</h2>
  <table>
    <thead><tr><th>Email</th><th>Сегмент</th><th>Категория</th><th>≈ Токенов</th><th>Превью</th></tr></thead>
    <tbody>
      ${stats.memoryTopNodes.map((n: any) => `
      <tr>
        <td style="font-size:12px;color:#94a3b8">${n.email}</td>
        <td><code style="font-size:11px;background:#1e293b;padding:2px 6px;border-radius:4px">${n.segment}</code></td>
        <td><span class="badge badge-${n.category}" style="font-size:11px">${n.category}</span></td>
        <td style="color:#a78bfa;font-weight:bold">~${Number(n.est_tokens).toLocaleString("ru")}</td>
        <td style="font-size:12px;color:#94a3b8;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${(n.preview || "").replace(/</g, "&lt;")}</td>
      </tr>`).join("")}
    </tbody>
  </table>
</div>
` : `<div class="table-card" style="text-align:center;color:#94a3b8;padding:32px">Узлов памяти пока нет. Они появятся после диалогов с пациентами.</div>`}

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

<footer>Toothy Admin · Данные обновляются при каждом открытии страницы</footer>

<script>
const PROB_RU = ${JSON.stringify(PROBLEM_RU)};
const RISK_RU = ${JSON.stringify(RISK_RU)};

new Chart(document.getElementById('aiChart'), {
  type: 'line',
  data: {
    labels: ${aiDayLabels},
    datasets: [{ label: 'Сообщений', data: ${aiDayData}, borderColor: '#4A90D9', backgroundColor: 'rgba(74,144,217,0.1)', borderWidth: 2, fill: true, tension: 0.3, pointRadius: 3 }]
  },
  options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 } } }, maintainAspectRatio: false }
});

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
