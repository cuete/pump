import { useState, useEffect } from 'react';

interface AuthUser {
  userId: string;
  userDetails: string;
  identityProvider: string;
}

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    // In development, skip auth
    if (import.meta.env.DEV) {
      setState({ user: { userId: 'dev', userDetails: 'Dev User', identityProvider: 'dev' }, loading: false });
      return;
    }

    fetch('/.auth/me')
      .then((res) => res.json())
      .then((data) => {
        const principal = data.clientPrincipal;
        if (principal) {
          setState({
            user: {
              userId: principal.userId,
              userDetails: principal.userDetails,
              identityProvider: principal.identityProvider,
            },
            loading: false,
          });
        } else {
          setState({ user: null, loading: false });
        }
      })
      .catch(() => {
        setState({ user: null, loading: false });
      });
  }, []);

  return state;
}
