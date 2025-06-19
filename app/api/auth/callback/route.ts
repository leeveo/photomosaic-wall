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

    // Directly redirect with token in URL parameter for cross-domain scenarios
    // This ensures the token is available even if cookies don't transfer
    const targetUrl = new URL(returnUrl);
    targetUrl.searchParams.set('token', token);
    
    console.log('Redirecting to target with token in URL:', targetUrl.toString());
    
    // Create HTML response with special handling for cross-origin issues
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
          <p>Redirecting in <span id="countdown">2</span> seconds...</p>
        </div>
        
        <script>
          // Set token in localStorage for persistent access
          const token = "${token}";
          localStorage.setItem('auth_token', token);
          
          // Also try to set cookies with various settings
          try {
            // Standard cookie
            document.cookie = "shared_auth_token=" + token + "; path=/; max-age=2592000"; // 30 days
            
            // Try SameSite=None cookie (requires Secure)
            document.cookie = "shared_auth_token_secure=" + token + "; path=/; max-age=2592000; SameSite=None; Secure";
          } catch(e) {
            console.error("Error setting cookies:", e);
          }
          
          // Direct navigation with the token in URL
          setTimeout(() => {
            window.location.href = "${targetUrl.toString()}";
          }, 2000);
        </script>
      </body>
      </html>
    `;
    
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  } catch (error) {
    console.error('Error in auth callback:', error);
    return NextResponse.redirect(new URL('/', req.url));
  }
}
