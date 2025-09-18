'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn, signUp, forgotPassword } from '@/lib/auth';
import { signInWithGoogle } from '@/lib/signinWithGoogle';

export default function AuthForm() {
  const [isRegister, setIsRegister] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setShowEmailConfirmation(false);

    try {
      const { error } = isRegister 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      if (isRegister) {
        setShowEmailConfirmation(true);
      } else {
        router.push('/dashboard');
      }
      setLoading(false);
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    setShowEmailConfirmation(false);

    try {
      const { error } = await signInWithGoogle();
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.push('/dashboard');
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error } = await forgotPassword(email);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setShowEmailConfirmation(true);
      setShowForgotPassword(false);
      setLoading(false);
    } catch (err) {
      setError('An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div>
        <h2 className="text-2xl font-bold">
          {showForgotPassword ? 'Reset your password' : isRegister ? 'Create your account' : 'Sign in to your account'}
        </h2>
        <p className="text-sm mt-2">
          {showForgotPassword ? (
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setError(null);
              }}
              className="text-blue-600 hover:underline"
            >
              Back to {isRegister ? 'sign up' : 'login'}
            </button>
          ) : (
            <>
              {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
              <button
                onClick={() => {
                  setIsRegister(!isRegister);
                  setError(null);
                  setShowEmailConfirmation(false);
                }}
                className="text-blue-600 hover:underline"
              >
                {isRegister ? 'Log in' : 'Sign up'}
              </button>
            </>
          )}
        </p>
      </div>

      {!showForgotPassword && (
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2 px-4 border border-gray-300 rounded-md flex items-center justify-center gap-2 hover:bg-gray-100 disabled:opacity-50"
        >
          <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
          Continue with Google
        </button>
      )}

      {!showForgotPassword && (
        <div className="flex items-center gap-2">
          <hr className="flex-grow border-gray-300" />
          <span className="text-gray-500 text-sm">OR</span>
          <hr className="flex-grow border-gray-300" />
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />

          {!showForgotPassword && (
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          )}

          {!isRegister && !showForgotPassword && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot password?
              </button>
            </div>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        {showEmailConfirmation && (
          <p className="text-green-500 text-sm">
            {showForgotPassword 
              ? 'Password reset link sent to your email' 
              : 'Please check your email to confirm your account.'}
          </p>
        )}

        {showForgotPassword ? (
          <button
            type="button"
            onClick={handleForgotPassword}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send reset link'}
          </button>
        ) : (
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : isRegister ? 'Create free account' : 'Sign in'}
          </button>
        )}
      </form>

      <p className="text-xs text-gray-500">
        By {isRegister ? 'creating an account' : 'signing in'}, you agree to our{' '}
        <Link href="/terms-and-conditions" className="underline">Terms of Service</Link> and{' '}
        <Link href="/privacy-policy" className="underline">Privacy Policy</Link>
      </p>
    </div>
  );
}
