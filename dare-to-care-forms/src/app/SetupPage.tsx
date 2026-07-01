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
    import("firebase/firestore").then(async ({ getDocs, collection, limit, query }) => {
      try {
        const { db } = await import("../config/firebase");
        const usersSnap = await getDocs(query(collection(db, "users"), limit(1)));
        if (!usersSnap.empty) {
          navigate('/login');
        } else {
          setSetupRequired(true);
          setLoading(false);
        }
      } catch {
        setError("Could not connect to Firebase.");
        setLoading(false);
      }
    }).catch(console.error);
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 10) {
      setError("Password must be at least 10 characters long.");
      return;
    }

    try {
      const { createUserWithEmailAndPassword } = await import("firebase/auth");
      const { setDoc, doc } = await import("firebase/firestore");
      const { auth, db } = await import("../config/firebase");

      // In Firebase, username acts as the email
      const userCred = await createUserWithEmailAndPassword(auth, username, password);
      
      const initials = name.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2) || '?';
      
      await setDoc(doc(db, "users", userCred.user.uid), {
        name,
        username,
        initials,
        role: "admin",
        status: "active",
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: null
      });

      // Firebase automatically signs them in after creation, so we can just log them out for a fresh start or let them proceed.
      // We'll just sign them out and let them log in normally.
      await auth.signOut();
      
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
