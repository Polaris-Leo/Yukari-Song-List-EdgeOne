export async function onRequest(context) {
  const url         = new URL(context.request.url);
  const isProtected = url.pathname.startsWith('/admin');

  if (!isProtected) {
    return context.next();
  }

  const cookieHeader = context.request.headers.get('Cookie');
  const hasSession   = cookieHeader && cookieHeader.includes('yukari_admin_session=');

  if (!hasSession) {
    if (url.pathname.startsWith('/admin/api/')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return Response.redirect(`${url.origin}/login.html`, 302);
  }

  return context.next();
}
