function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderGroupInviteLandingHtml({ token, webAppUrl }) {
  const safeToken = encodeURIComponent(String(token || '').trim());
  const appDeepLink = `studysakha://groups/invite/${safeToken}`;
  const safeAppLink = escapeHtml(appDeepLink);
  const safeWebUrl = escapeHtml(webAppUrl || `/groups/invite/${safeToken}?web=1`);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Study Sakha — Group Study Invitation</title>
  <style>
    :root { color-scheme: light dark; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
    }
    .card {
      width: 100%;
      max-width: 440px;
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 20px;
      padding: 28px 24px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 999px;
      background: rgba(59, 130, 246, 0.16);
      color: #93c5fd;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    h1 {
      margin: 14px 0 8px;
      font-size: 22px;
      line-height: 1.3;
    }
    p {
      margin: 0 0 20px;
      color: #cbd5e1;
      font-size: 14px;
      line-height: 1.55;
    }
    .btn {
      display: block;
      width: 100%;
      box-sizing: border-box;
      text-align: center;
      text-decoration: none;
      padding: 13px 16px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 10px;
    }
    .btn-primary {
      background: #2563eb;
      color: #ffffff;
    }
    .btn-secondary {
      background: #0f172a;
      color: #e2e8f0;
      border: 1px solid #334155;
    }
    .hint {
      margin-top: 14px;
      font-size: 12px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <main class="card">
    <span class="badge">Study Sakha · Group Study Room</span>
    <h1>You&apos;re invited to a Study Group</h1>
    <p>Open this invitation in the Study Sakha Android app to verify the invite and join the study room, or continue in your browser.</p>
    <a class="btn btn-primary" href="${safeAppLink}">Open in Study Sakha App</a>
    <a class="btn btn-secondary" href="${safeWebUrl}">Continue in Browser</a>
    <p class="hint">Invitation details and group access are verified securely after you sign in.</p>
  </main>
</body>
</html>`;
}

module.exports = { renderGroupInviteLandingHtml };
