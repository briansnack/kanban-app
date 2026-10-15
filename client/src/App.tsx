import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState('verificando...');

  useEffect(() => {
    fetch('http://localhost:3000/health')
      .then((r) => r.json())
      .then((d) => setStatus(d.status))
      .catch(() => setStatus('erro de conexão'));
  }, []);

  return <h1>Kanban, API: {status}</h1>;
}

export default App;