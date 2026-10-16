import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ApiError } from '../api/client';
import { useAuth } from '../auth/useAuth';

export function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.details.length > 0 ? error.details : [error.message]);
      } else {
        setErrors(['Não foi possível conectar ao servidor']);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = mode === 'login';

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>{isLogin ? 'Entrar' : 'Criar conta'}</h1>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input
              placeholder="Nome"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          )}
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={isLogin ? undefined : 8}
            required
          />

          {errors.length > 0 && (
            <ul className="errors">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}

          <button type="submit" disabled={submitting}>
            {isLogin ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        <p className="muted">
          {isLogin ? (
            <>
              Não tem conta? <Link to="/register">Cadastre-se</Link>
            </>
          ) : (
            <>
              Já tem conta? <Link to="/login">Entrar</Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}