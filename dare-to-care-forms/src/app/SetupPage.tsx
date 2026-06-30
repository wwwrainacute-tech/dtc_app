import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SetupPage() {
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/setup/status')
      .then(res => res.json())
      .then(data => {
        if (!data.setupRequired) {
          navigate('/login');
        } else {
          setSetupRequired(true);
          setLoading(false);
        }
      })
      .catch(() => {
        setError("Could not connect to the server.");
        setLoading(false);
      });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    try {
      const res = await fetch('/api/setup/first-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete setup.");
      }
      
      navigate('/login', { state: { message: "Setup complete! Please log in." } });
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return null;
  if (!setupRequired) return null;

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Dare to Care Platform Setup</h2>
        <p>Welcome! Since this is a fresh installation, you must create the first administrator account.</p>
        
        {error && <div className="login-error">{error}</div>}
        
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            Full Name
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          </label>
          <label>
            Administrator Username
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              required 
            />
          </label>
          <label>
            Secure Password
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              minLength={10}
            />
          </label>
          <button type="submit" className="login-btn">Complete Setup</button>
        </form>
      </div>
    </div>
  );
}
