import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from "firebase/auth";
import { signInWithGoogle } from "../utils/googleLogin";
import { auth, db } from "../firebase";
import { doc, setDoc } from "firebase/firestore";
import { useTheme } from "../contexts/ThemeContext";

const Signup = () => {
  const { isDark } = useTheme();
  const [values, setValues] = useState({
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
  });
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});
  const [isValidating, setIsValidating] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '', visible: false });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  const handleChange = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const validateAll = useCallback(() => {
    const newErrors = {};
    if (!values.email) newErrors.email = 'Email is required';
    else if (!validateEmail(values.email)) newErrors.email = 'Please enter a valid email address';

    if (!values.username) newErrors.username = 'Username is required';
    else if (values.username.length < 3) newErrors.username = 'Username must be at least 3 characters';

    if (!values.password) newErrors.password = 'Password is required';
    else if (values.password.length < 8) newErrors.password = 'Password must be at least 8 characters';

    if (values.password !== values.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const inputClasses = (field) => `
    mt-1 block w-full px-4 py-3 border-2 rounded-xl transition-all duration-200 placeholder-gray-400
    ${touched[field] && errors[field]
      ? 'border-red-300 bg-red-50 focus:border-red-500'
      : isDark
      ? 'border-gray-600 bg-gray-700 text-gray-100 focus:border-emerald-500 hover:border-gray-500'
      : 'border-gray-200 bg-white text-gray-900 focus:border-emerald-500 hover:border-gray-300'}
  `;

  const renderError = (field) =>
    touched[field] && errors[field] && (
      <p className="text-xs text-red-500 mt-1">{errors[field]}</p>
    );

  const handleSubmit = async () => {
    setIsValidating(true);
    const isValid = validateAll();
    if (!isValid) {
      setToast({ message: 'Please fix the errors above.', type: 'error', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
      setIsValidating(false);
      return;
    }

    try {
      const userCred = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const userId = userCred.user.uid;

      await setDoc(doc(db, "users", userId), {
        email: values.email,
        username: values.username,
        totalPoints: 0,
        role: "resident"
      });

      setToast({ message: 'Account created successfully!', type: 'success', visible: true });
      localStorage.setItem('signupEmail', values.email);

      setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error(error);
      setToast({ message: error.message || 'Signup failed.', type: 'error', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    }

    setIsValidating(false);
  };

  const handleGoogleSignup = async () => {
    try {
      const user = await signInWithGoogle();
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        username: user.displayName,
        profilePicture: user.photoURL,
        totalPoints: 0,
        role: "resident"
      });
      navigate("/dashboard");
    } catch (error) {
      console.error("Google signup error:", error);
      setToast({ message: error.message || 'Google signup failed.', type: 'error', visible: true });
      setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 4000);
    }
  };

  return (
    <div className={`${isDark ? 'bg-gray-900 text-gray-100' : 'bg-emerald-50 text-gray-900'} min-h-screen flex items-center justify-center p-6 transition-colors duration-300`}>
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} w-full max-w-md p-8 rounded-2xl shadow-xl space-y-6 transition-colors duration-300`}>
        <div className="text-center">
          <h1 className={`${isDark ? 'text-emerald-400' : 'text-emerald-700'} text-2xl font-bold`}>Create Account</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-500'} text-sm`}>Join us and start your journey</p>
        </div>

        <button
          onClick={handleGoogleSignup}
          className={`${isDark ? 'border-gray-600 text-gray-200 hover:bg-gray-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'} w-full flex items-center justify-center gap-3 py-3 px-4 border-2 rounded-xl transition-all duration-200`}
        >
          {/* Google SVG icon */}
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          <span className="font-medium">Sign up with Google</span>
        </button>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className={inputClasses('email')}
            value={values.email}
            onChange={(e) => handleChange('email', e.target.value)}
            onBlur={() => handleBlur('email')}
          />
          {renderError('email')}

          <input
            type="text"
            placeholder="Username"
            className={inputClasses('username')}
            value={values.username}
            onChange={(e) => handleChange('username', e.target.value)}
            onBlur={() => handleBlur('username')}
          />
          {renderError('username')}

          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            className={inputClasses('password')}
            value={values.password}
            onChange={(e) => handleChange('password', e.target.value)}
            onBlur={() => handleBlur('password')}
          />
          {renderError('password')}

          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm Password"
            className={inputClasses('confirmPassword')}
            value={values.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            onBlur={() => handleBlur('confirmPassword')}
          />
          {renderError('confirmPassword')}

          <button
            onClick={handleSubmit}
            disabled={isValidating}
            className={`${isDark ? 'bg-emerald-700 hover:bg-emerald-800 text-white' : "bg-emerald-600 hover:bg-emerald-700 text-white"} w-full py-3 rounded-xl font-semibold transition-all duration-200`}
          >
            {isValidating ? 'Creating Account...' : 'Create Account'}
          </button>
        </div>

        <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} text-center text-sm`}>
          Already have an account?{' '}
          <button
            onClick={() => navigate("/login")}
            className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} font-semibold hover:underline`}
          >
            Sign in
          </button>
        </p>
      </div>

      {toast.visible && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2
          px-4 py-2 rounded-xl text-white shadow-lg z-50
          transition-all duration-300 max-w-xl w-auto
          whitespace-nowrap overflow-x-auto
          ${toast.type === 'success' ? 'bg-green-700' : toast.type === 'error' ? 'bg-red-500' : ''}`}>
          {toast.message}
        </div>
      )}

    </div>
  );
};

export default Signup;