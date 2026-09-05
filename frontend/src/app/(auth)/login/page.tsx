'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card shadow-lg" style={{ width: '400px', padding: '32px' }}>
        <h1 style={{ textAlign: 'center', marginBottom: '24px' }}>DealFlow360</h1>
        
        <div style={{ display: 'flex', marginBottom: '24px', borderBottom: '2px solid var(--border)' }}>
          <button 
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'none', 
              border: 'none',
              borderBottom: isLogin ? '4px solid var(--primary)' : '4px solid transparent',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={() => setIsLogin(true)}
          >
            Log In
          </button>
          <button 
            style={{ 
              flex: 1, 
              padding: '12px', 
              background: 'none', 
              border: 'none',
              borderBottom: !isLogin ? '4px solid var(--primary)' : '4px solid transparent',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
            onClick={() => setIsLogin(false)}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Full Name</label>
              <input type="text" className="input" placeholder="Enter your name" required />
            </div>
          )}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Email</label>
            <input type="email" className="input" placeholder="Enter your email" required />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Password</label>
            <input type="password" className="input" placeholder="Enter your password" required />
          </div>
          
          <button type="submit" className="btn btn-primary" style={{ marginTop: '8px', padding: '12px' }}>
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>
      </div>
    </div>
  );
}
