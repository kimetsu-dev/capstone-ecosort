import { Navigate } from "react-router-dom";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

export default function PrivateRoute({ children }) {
  const [user, loading, error] = useAuthState(auth);

  if (loading) {
    return <div className="p-6 text-xl">Loading...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">Auth error: {error.message}</div>;
  }

  return user ? children : <Navigate to="/login" />;
}
