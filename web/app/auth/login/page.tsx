'use client'

import { useState, useEffect, useContext } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faGoogle } from "@fortawesome/free-brands-svg-icons"
import { apiRequest, setAccessToken } from '@/utils/api'
import { UserContext } from '@/components/UserContext'
import AuthLoading from '@/components/AuthLoading'
import LoadingScreen from '@/components/LoadingScreen'
import { saveAccount, getAccounts, setActiveAccount } from '@/utils/accounts'
import { handleOnboardingRedirect } from '@/utils/handleOnboardingRedirect';
import { useSearchParams } from "next/navigation"
import { storeRefreshToken, getRefreshToken } from "@/lib/keyStore"
import { useNavigation } from "@/utils/useNavigation";

declare global {
  interface Window {
    google: any;
  }
}

export default function LoginPage() {

  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email");
  const [email, setEmail] = useState(initialEmail || '');
  const { push, replace } = useNavigation();

  const { user, setUser, loadingUser } = useContext(UserContext)!

  const isVerified = user?.is_verified
  const isGoogleLogin = user?.auth_provider === 'google'

  const [password,setPassword] = useState('')
  const [showPassword,setShowPassword] = useState(false)
  const [remember,setRemember] = useState(false)
  const [loading,setLoading] = useState(false)
  const [authLoading, setAuthLoading] = useState(false)
  const [error,setError] = useState('')
  const [message,setMessage] = useState('')
  const [showResend,setShowResend] = useState(false)
  
  useEffect(() => {
    if (loadingUser) return;
  
    if (user) {
      replace("/main/home");
    }
  }, [loadingUser, user, replace]);
  
  // Load Google script
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Avoid adding script multiple times
    if (document.getElementById("google-client-script")) return;

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.id = "google-client-script";
    document.body.appendChild(script);

    script.onload = () => {
      if (!window?.google?.accounts?.id) return;

      // Initialize Google Sign-In
      window.google.accounts.id.initialize({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
        callback: handleGoogleResponse,
      });

      // Render the button
      const googleButtonDiv = document.getElementById("googleSignInDiv");
      if (googleButtonDiv) {
        window.google.accounts.id.renderButton(googleButtonDiv, {
          theme: "outline",
          size: "large",
        });
      }

      // Optional: auto prompt
      // window.google.accounts.id.prompt();
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return; 
    // Check if a selected account exists
    const selectedEmail = localStorage.getItem("active_account");
    const accounts = getAccounts();
    const account = accounts.find(acc => acc.email === selectedEmail);
  
    if (!account) return;
  
    if (account.type === "google" && window.google?.accounts?.id && document.getElementById("googleSignInDiv")) {
      // Auto-prompt Google One Tap
      window.google.accounts.id.prompt();
    } else if (account.type === "password") {
      // Prefill email
      setEmail(account.email);
    }
  }, []);
  
  useEffect(() => {
    window.onerror = (msg, src, line, col, err) => {
      console.log("ERROR", msg, err);
    };
  
    window.onunhandledrejection = (e) => {
      console.log("PROMISE", e.reason);
    };
  }, []);

  const handleGoogleResponse = async (googleRes: any) => {
    setAuthLoading(true)
    try {
      const res = await apiRequest("api/users/google-login/", {
        method: "POST",
        data: { token: googleRes.credential },
      });
      const { access, refresh, user } = res;

      await storeRefreshToken(user.email, refresh);
      setAccessToken(access);

      saveAccount(user, "google");
      setActiveAccount(user.email);

      const profile = await apiRequest("api/users/me/", {
        method: 'GET',
      });
      setUser(profile);

      if (remember) saveAccount(profile, "google");

      // Also set selected account
      setActiveAccount(profile.email)
      saveAccount(profile, profile.auth_provider === "google" ? "google" : "password");
      try {
          await handleOnboardingRedirect(push);
      } catch (e) {
          console.error(e);
      }

    } catch (err: any) {
      console.error(err);
      alert("Google login failed");
    } finally {
      setAuthLoading(false)
    }
  };

  // Handle email/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    setAuthLoading(true)
    try {
      const res = await apiRequest('api/users/login/', {
        method: 'POST',
        data: { email, password },
      })
      const { access, refresh, user } = res;

      await storeRefreshToken(user.email, refresh);
      setAccessToken(access);

      saveAccount(user, "password");
      setActiveAccount(user.email);

      // Fetch user profile
      const profile = await apiRequest('api/users/me/', {
        method: 'GET',
      })
      setUser(profile)

      if (remember) saveAccount(profile, "password")
      setActiveAccount(profile.email)
      saveAccount(profile, profile.auth_provider === "google" ? "google" : "password");

      // Redirect based on profile completeness
      try {
          await handleOnboardingRedirect(push);
      } catch (e) {
          console.error(e);
      }
    } catch (err:any) {

      const detail =
          err?.detail ||
          err?.message ||
          "Login failed"
  
      if (detail.includes("Email not verified")) {
  
          push(
              `/auth/verify-email?email=${encodeURIComponent(email)}`
          )
  
          return
      }
  
      if (detail.includes("credentials")) {
          setError("Wrong email or password.")
      } else {
          setError(detail)
      }
    } finally {
      setLoading(false)
      setAuthLoading(false)
    }
  };

  return (
    <>
    <AuthLoading
        show={authLoading}
        text="Signing you into Tribe..."
    />
    <div className="flex justify-center items-center rounded-2xl text-gray-700 dark:text-gray-200 dark:bg-gray-200 bg-gray-50 dark:bg-gray-950">
      <form onSubmit={handleLogin} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-lg w-96 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Login to Tribe</h1>

        {error && <div className="bg-red-100 text-red-600 px-3 py-2 rounded">{error}</div>}

        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"
          required className="w-full p-2 rounded border bg-gray-100 dark:bg-gray-800"/>

        <div className="relative">
          <input type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"
            required className="w-full p-2 rounded border bg-gray-100 dark:bg-gray-800"/>
          <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-2 top-2">
            {showPassword?<EyeOff size={18}/>:<Eye size={18}/>}
          </button>
        </div>

        <div className="flex justify-between text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={remember} onChange={()=>setRemember(!remember)}/> Remember me
          </label>
          <a href="/auth/forgot-password" className="text-indigo-600">Forgot password?</a>
        </div>

        <button
          disabled={loading}
          className={`w-full py-2 rounded text-white
          ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"}
        `}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div className="flex items-center gap-2 text-gray-400 text-sm">
          <div className="flex-1 h-px bg-gray-300"/> OR <div className="flex-1 h-px bg-gray-300"/>
        </div>

        <div id="googleSignInDiv"></div>

        <p className="text-sm text-gray-500 text-center">
          Don’t have an account? <a href="/auth/register" className="text-indigo-600 ml-1">Register</a>
        </p>

      </form>
    </div>
    </>
  )
}