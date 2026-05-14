import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code  = searchParams.get('code');
  const next  = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Verificar si el usuario ya vinculó StatLocker
      const { data: { user } } = await supabase.auth.getUser();
      let destination = next;

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('statlocker_url')
          .eq('id', user.id)
          .single();

        // Si no tiene StatLocker vinculado, mandarlo al onboarding
        if (!profile?.statlocker_url) {
          destination = '/onboarding';
        }
      }

      const forwardedHost = request.headers.get('x-forwarded-host');
      const isLocalEnv    = process.env.NODE_ENV === 'development';

      if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${destination}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${destination}`);
      } else {
        return NextResponse.redirect(`${origin}${destination}`);
      }
    }

    console.error('[auth/callback] exchangeCodeForSession error:', error);
  } else {
    console.error('[auth/callback] no code in URL params');
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
