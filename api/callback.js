// 後台（Decap CMS）登入第二步：用 GitHub 導回的 code 換 access token，
// 再用 Decap CMS 標準的 postMessage 交握協定把 token 交回後台頁面。
module.exports = async (req, res) => {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const url = new URL(req.url, `http://${req.headers.host}`);
  const code = url.searchParams.get('code');

  if (!clientId || !clientSecret) {
    res.status(500).send('Missing GITHUB_OAUTH_CLIENT_ID / GITHUB_OAUTH_CLIENT_SECRET environment variables.');
    return;
  }
  if (!code) {
    res.status(400).send('Missing code from GitHub.');
    return;
  }

  let data;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    data = await tokenRes.json();
  } catch (err) {
    res.status(502).send('Failed to reach GitHub: ' + err.message);
    return;
  }

  if (!data.access_token) {
    res.status(400).send('GitHub OAuth error: ' + (data.error_description || data.error || 'no token returned'));
    return;
  }

  const message = 'authorization:github:success:' + JSON.stringify({ token: data.access_token, provider: 'github' });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!DOCTYPE html>
<html><body>
<script>
(function() {
  function receiveMessage(e) {
    window.opener.postMessage(${JSON.stringify(message)}, e.origin);
    window.removeEventListener('message', receiveMessage, false);
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
</body></html>`);
};
