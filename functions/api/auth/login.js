export async function onRequestPost(context) {
  try {
    const { username, password } = await context.request.json();

    const ADMIN_USER     = context.env.ADMIN_USER     || 'Yukari';
    const ADMIN_PASSWORD = context.env.ADMIN_PASSWORD || 'MoWang0719';

    if (username === ADMIN_USER && password === ADMIN_PASSWORD) {
      const sessionValue = btoa(`${username}:${Date.now()}:yukari-secret`);
      return new Response(JSON.stringify({ success: true }), {
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': `yukari_admin_session=${sessionValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
        }
      });
    }

    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
