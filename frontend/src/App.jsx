import { useState } from "react";
import HomePage from "./pages/HomePage.jsx";
import Login from "./pages/Login.jsx";

function App() {
  const [isLogin, setIsLogin] = useState(null);

  // If not logged in, show Login page. After login, show HomePage.
  if (!isLogin) {
    return <Login onLogin={(user) => setIsLogin(user)} />;
  }

  return <HomePage isLogin={isLogin} setIsLogin={setIsLogin} />;
}

export default App;
