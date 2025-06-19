import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Get token from the URL parameters
    const token = req.nextUrl.searchParams.get('token');
    console.log('Auth callback received token:', !!token, 'Length:', token?.length);
    
    if (!token) {
      console.error('No token in callback');
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Get returnUrl from parameters or default to admin
    const returnUrl = req.nextUrl.searchParams.get('returnUrl') || '/admin';
    
    // HTML response with embedded script to set cookies reliably
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Authentication Complete</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            padding: 20px;
            text-align: center;
          }
          .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0,0,0,0.1);
            padding: 40px;
            max-width: 500px;
            width: 100%;
          }
          h1 {
            color: #4f46e5;
            margin-top: 0;
          }
          p {
            color: #4b5563;
            margin-bottom: 25px;
          }
          .loader {
            border: 3px solid #f3f3f3;
            border-radius: 50%;
            border-top: 3px solid #6366f1;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          #countdown {
            font-weight: bold;
            color: #4f46e5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Authentication Successful!</h1>
          <p>You've been successfully authenticated. Redirecting you to the admin dashboard...</p>
          <div class="loader"></div>
          <p>Redirecting in <span id="countdown">3</span> seconds...</p>
        </div>
        
        <script>
          // Set multiple cookies to ensure at least one works
          function setCookie(name, value, days) {
            let expires = '';
            if (days) {
              const date = new Date();
              date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
              expires = '; expires=' + date.toUTCString();
            }
            
            // Standard cookie
            document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/';
            
            // Try with SameSite=None for cross-domain
            try {
              document.cookie = name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=None; Secure';
            } catch (e) {
              console.error('Error setting SameSite=None cookie:', e);
            }
          }
          
          // Set the auth token in multiple places
          const token = "${token}";
          
          // Set regular cookie
          setCookie('shared_auth_token', token, 30); // 30 days
          
          // Also set a JS-only cookie as backup
          setCookie('shared_auth_token_js', token, 30);
          
          // Store in localStorage as additional backup
          try {
            localStorage.setItem('auth_token', token);
            console.log('Auth token stored in localStorage');
          } catch (e) {
            console.error('Failed to store in localStorage:', e);
          }
          
          // Countdown for redirection
          let seconds = 3;
          const countdown = document.getElementById('countdown');
          const interval = setInterval(() => {
            seconds--;
            countdown.textContent = seconds.toString();
            if (seconds <= 0) {
              clearInterval(interval);
              // Add token as URL parameter as final fallback
              window.location.href = "${returnUrl}?token=${token}";
            }
          }, 1000);
        </script>
      </body>
      </html>
    `;
    
    // Return the HTML page with the embedded script
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // Set cookies in response headers as well
        'Set-Cookie': [
          `shared_auth_token=${token}; Path=/; Max-Age=${60*60*24*30}; SameSite=None; Secure`,
          `shared_auth_token_secure=${token}; Path=/; Max-Age=${60*60*24*30}; HttpOnly; SameSite=None; Secure`
        ].join(', ')
      }
    });
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
