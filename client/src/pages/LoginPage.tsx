import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react'
import styles from './LoginPage.module.css'

export default function LoginPage() {
  const { login, verifyOtp } = useAuth()
  const navigate = useNavigate()
  
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  
  // OTP state
  const [otpMode, setOtpMode] = useState(false)
  const [otp, setOtp] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      if (result && result.requireOtp) {
        setOtpMode(true)
      } else {
        navigate('/dashboard')
      }
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await verifyOtp(email, otp, rememberMe)
      navigate('/dashboard')
    } catch (err: any) {
      setError(err.message || 'OTP Verification failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      {/* Left hero panel */}
      <div className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.heroLogo}>
            <div className={styles.heroLogoIcon} style={{ background: 'white', boxShadow: 'none', padding: '2px' }}>
              <img src="/logo.png" alt="LocalSM" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: '6px' }} />
            </div>
            <span className={styles.heroLogoText}>LocalSM</span>
          </div>
          <h1 className={styles.heroTitle}>
            Hiring Panel<br />of LocalSM
          </h1>
          <p className={styles.heroSub}>
            Streamline applications, manage candidates, and track hiring — all in one place.
          </p>
          <div className={styles.heroStats}>
            {[
              { value: '5k+', label: 'Applicants managed' },
              { value: '99.9%', label: 'Uptime guaranteed' },
              { value: '2s', label: 'Avg processing time' },
            ].map(stat => (
              <div key={stat.label} className={styles.heroStat}>
                <div className={styles.heroStatValue}>{stat.value}</div>
                <div className={styles.heroStatLabel}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.heroGlow} />
      </div>

      {/* Right login form */}
      <div className={styles.formSide}>
        {!otpMode ? (
          <form className={styles.form} onSubmit={handleLoginSubmit}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>Welcome back</h2>
              <p className={styles.formSub}>Sign in to your account to continue</p>
            </div>

            {error && (
              <div className={styles.errorBox}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input"
                placeholder="you@localsm.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{ paddingRight: '2.5rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  style={{
                    position: 'absolute', right: '0.7rem', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text-muted)', cursor: 'pointer',
                    display: 'flex', alignItems: 'center'
                  }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading}
              style={{ marginTop: '0.5rem', justifyContent: 'center' }}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <LogIn size={16} />
                  Sign In
                </>
              )}
            </button>
          </form>
        ) : (
          <form className={styles.form} onSubmit={handleOtpSubmit}>
            <div className={styles.formHeader}>
              <h2 className={styles.formTitle}>2-Step Verification</h2>
              <p className={styles.formSub}>We've sent a 6-digit code to your email.</p>
            </div>

            {error && (
              <div className={styles.errorBox}>
                <AlertCircle size={15} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="label" htmlFor="otp">Verification Code</label>
              <input
                id="otp"
                type="text"
                className="input"
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value)}
                maxLength={6}
                required
                autoFocus
                style={{ letterSpacing: '0.5rem', textAlign: 'center', fontSize: '1.25rem', fontWeight: 'bold' }}
              />
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', marginBottom: '1.5rem' }}>
              <input 
                type="checkbox" 
                id="rememberMe" 
                checked={rememberMe} 
                onChange={e => setRememberMe(e.target.checked)} 
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="rememberMe" style={{ cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-color)' }}>
                Remember me on this device
              </label>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || otp.length < 6}
              style={{ justifyContent: 'center' }}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : (
                <>
                  <ShieldCheck size={16} />
                  Verify & Sign In
                </>
              )}
            </button>
            <button
              type="button"
              className="btn w-full"
              disabled={loading}
              onClick={() => {
                setOtpMode(false);
                setOtp('');
              }}
              style={{ justifyContent: 'center', marginTop: '0.5rem', background: 'transparent', color: 'var(--text-muted)' }}
            >
              Back to Login
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
