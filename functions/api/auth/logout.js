export async function onRequestPost(context) {
  return new Response(JSON.stringify({ success: true }), {
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'yukari_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0'
    }
  });
}
