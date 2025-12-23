// OAuth callback page
// Handles the redirect from GitHub OAuth with the token

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (error) {
      navigate(`/login?error=${error}`);
      return;
    }

    if (token) {
      // Save token and redirect to notes
      loginWithToken(token);
      navigate('/notes');
    } else {
      navigate('/login?error=no_token');
    }
  }, [searchParams, navigate, loginWithToken]);

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Signing you in...</h1>
        <p className="subtitle">Please wait while we complete authentication.</p>
      </div>
    </div>
  );
}
