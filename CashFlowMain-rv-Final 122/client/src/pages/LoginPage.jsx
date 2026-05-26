// import React, { useState } from "react";
// import { useAuth } from "../context/AuthContext.jsx";
// import api from "../services/api.js";
// import logo from "../assets/cashflow-logo.webp";
// import toast from "react-hot-toast";

// export default function LoginPage({ onNavigate }) {
//   const [isRegistering, setIsRegistering] = useState(false);

//   // Form State
//   const [companyName, setCompanyName] = useState("");
//   const [fullName, setFullName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);

//   const { login } = useAuth();

//   const handleLogin = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       const data = await api.login(email.trim(), password);
//       login(data);
//       onNavigate("dashboard");
//     } catch (err) {
//       setError(err.message || "Login failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleRegister = async (e) => {
//     e.preventDefault();
//     setError("");
//     setLoading(true);

//     try {
//       // Call the API to register the company AND the first admin user
//       await api.registerCompany({
//         company_name: companyName.trim(),
//         full_name: fullName.trim(),
//         email: email.trim(),
//         password: password,
//       });

//       toast.success("Company registered successfully! Please sign in.");

//       // Reset form and switch back to login mode
//       setIsRegistering(false);
//       setPassword("");
//       // We keep the email populated so they can just type the password and log in!
//     } catch (err) {
//       setError(err.message || "Registration failed");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-[#0052D4] p-4 sm:p-8 animate-fadeIn">
//       <div className="flex w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px]">
//         {/* Left Side: Branding */}
//         <div className="hidden lg:flex w-1/2 bg-[#0052D4] flex-col justify-between p-12 text-white relative overflow-hidden">
//           <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-white opacity-10 blur-3xl"></div>
//           <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-blue-400 opacity-20 blur-2xl"></div>

//           <div className="relative z-10">
//             <div className="flex items-center gap-3 mb-12">
//               <div className="bg-white p-2.5 rounded-xl shadow-lg">
//                 <img src={logo} alt="Logo" className="w-8 h-8 object-contain" />
//               </div>
//               <span className="text-2xl font-extrabold tracking-tight">
//                 CashFlow
//               </span>
//             </div>
//             <h1 className="text-4xl font-extrabold leading-tight mb-6">
//               {isRegistering ? "Start Your Journey" : "Welcome Back"}
//             </h1>
//             <p className="text-blue-100 text-lg font-medium max-w-sm leading-relaxed">
//               {isRegistering
//                 ? "Create a workspace for your business and manage your market cashflow seamlessly."
//                 : "Enter your credentials to securely access your market analytics and approvals."}
//             </p>
//           </div>

//           <div className="relative z-10 flex items-center gap-4 text-sm font-semibold text-blue-200">
//             <span>© 2026 CashFlow App</span>
//             <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
//             <span>All rights reserved</span>
//           </div>
//         </div>

//         {/* Right Side: Form */}
//         <div className="w-full lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-center bg-white relative">
//           <div className="max-w-md w-full mx-auto">
//             {/* Mobile Branding */}
//             <div className="flex lg:hidden items-center gap-3 mb-8">
//               <div className="bg-[#0052D4] p-2 rounded-xl shadow-md">
//                 <img
//                   src={logo}
//                   alt="Logo"
//                   className="w-6 h-6 object-contain brightness-0 invert"
//                 />
//               </div>
//               <span className="text-2xl font-extrabold text-slate-800 tracking-tight">
//                 CashFlow
//               </span>
//             </div>

//             <div className="mb-8">
//               <h2 className="text-3xl font-extrabold text-slate-800 mb-2">
//                 {isRegistering ? "Register Company" : "Sign in"}
//               </h2>
//               <p className="text-slate-500 font-medium">
//                 {isRegistering
//                   ? "Set up your company and admin account."
//                   : "Please enter your details to continue."}
//               </p>
//             </div>

//             <form
//               onSubmit={isRegistering ? handleRegister : handleLogin}
//               className="space-y-5"
//             >
//               {/* Registration Only Fields */}
//               {isRegistering && (
//                 <>
//                   <div className="space-y-1.5">
//                     <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
//                       Company Name
//                     </label>
//                     <input
//                       type="text"
//                       value={companyName}
//                       onChange={(e) => setCompanyName(e.target.value)}
//                       placeholder="e.g. Acme Corp"
//                       required
//                       className="w-full px-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
//                     />
//                   </div>
//                   <div className="space-y-1.5">
//                     <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
//                       Admin Full Name
//                     </label>
//                     <input
//                       type="text"
//                       value={fullName}
//                       onChange={(e) => setFullName(e.target.value)}
//                       placeholder="e.g. John Doe"
//                       required
//                       className="w-full px-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
//                     />
//                   </div>
//                 </>
//               )}

//               {/* Shared Fields (Email & Password) */}
//               <div className="space-y-1.5">
//                 <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
//                   Email Address
//                 </label>
//                 <input
//                   type="email"
//                   value={email}
//                   onChange={(e) => setEmail(e.target.value)}
//                   placeholder="name@company.com"
//                   autoComplete="email"
//                   required
//                   className="w-full px-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
//                 />
//               </div>

//               <div className="space-y-1.5 relative">
//                 <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
//                   Password
//                 </label>
//                 <input
//                   type={showPassword ? "text" : "password"}
//                   value={password}
//                   onChange={(e) => setPassword(e.target.value)}
//                   placeholder={
//                     isRegistering ? "Create a strong password" : "••••••••"
//                   }
//                   autoComplete={
//                     isRegistering ? "new-password" : "current-password"
//                   }
//                   required
//                   className="w-full px-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
//                 />
//                 <button
//                   type="button"
//                   onClick={() => setShowPassword(!showPassword)}
//                   className="absolute bottom-3.5 right-4 flex items-center text-[11px] font-bold text-[#0B63F6] hover:text-blue-800 tracking-wider uppercase"
//                 >
//                   {showPassword ? "Hide" : "Show"}
//                 </button>
//               </div>

//               <button
//                 type="submit"
//                 disabled={loading}
//                 className="w-full bg-[#1A365D] hover:bg-[#122543] disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] mt-2"
//               >
//                 {loading
//                   ? "Processing..."
//                   : isRegistering
//                     ? "Register Company"
//                     : "Sign in"}
//               </button>

//               {error && (
//                 <div className="p-3 mt-2 bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100 rounded-lg text-center animate-fadeIn">
//                   {error}
//                 </div>
//               )}
//             </form>

//             <div className="mt-8 text-center">
//               <button
//                 type="button"
//                 onClick={() => {
//                   setIsRegistering(!isRegistering);
//                   setError("");
//                 }}
//                 className="text-sm font-semibold text-slate-500 hover:text-[#0B63F6] transition-colors"
//               >
//                 {isRegistering
//                   ? "Already have an account? Sign in"
//                   : "Don't have an account? Register Company"}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../services/api.js";
import logo from "../assets/cashflow-logo.webp";
import toast from "react-hot-toast";

export default function LoginPage({ onNavigate }) {
  const [isRegistering, setIsRegistering] = useState(false);

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await api.login(email.trim(), password);
      login(data);
      onNavigate("dashboard");
    } catch (err) {
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Call the API to register the company AND the first admin user
      await api.registerCompany({
        company_name: companyName.trim(),
        full_name: fullName.trim(),
        email: email.trim(),
        password: password,
      });

      toast.success("Company registered successfully! Please sign in.");

      // Reset form and switch back to login mode
      setIsRegistering(false);
      setPassword("");
      // We keep the email populated so they can just type the password and log in!
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0052D4] p-4 sm:p-8">
      {/* Main Split Card Container */}
      <div className="flex w-full max-w-5xl bg-white rounded-[2rem] shadow-2xl overflow-hidden min-h-[600px] relative z-10">
        {/* --- LEFT PANEL: Blue Bubbles & Welcome Text (Hidden on mobile) --- */}
        <div className="hidden md:flex md:w-1/2 relative bg-gradient-to-br from-[#0B63F6] to-[#003EA3] p-12 flex-col justify-center overflow-hidden">
          {/* Decorative CSS Bubbles */}
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] rounded-full opacity-90 shadow-2xl"></div>
          <div className="absolute -bottom-24 -right-16 w-80 h-80 bg-gradient-to-tr from-[#023E8A] to-[#0077B6] rounded-full opacity-90 shadow-2xl"></div>
          <div className="absolute bottom-12 left-12 w-48 h-48 bg-[#00B4D8] rounded-full opacity-80 shadow-xl"></div>

          {/* Left Panel Content */}
          <div className="relative z-10 text-white mt-12">
            <h1 className="text-5xl font-extrabold mb-2 tracking-wide uppercase drop-shadow-md">
              {isRegistering ? "Get Started" : "Welcome"}
            </h1>
            <h2 className="text-xl font-bold mb-6 tracking-widest text-blue-100 uppercase drop-shadow-sm">
              {isRegistering ? "With CashFlow Pro" : "To Cashflow Pro"}
            </h2>
            <p className="text-sm text-blue-50 leading-relaxed max-w-sm drop-shadow-sm">
              {isRegistering
                ? "Create a workspace for your business and manage your market cashflow seamlessly."
                : "Sign in to access your financial dashboard. Manage your cashflow, track expenses, and forecast your business growth with precision."}
            </p>
          </div>
        </div>

        {/* --- RIGHT PANEL: Form --- */}
        <div className="w-full md:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white relative">
          <div className="max-w-md w-full mx-auto">
            {/* Logo Placement */}
            <div className="flex justify-start sm:justify-center mb-8">
              <img
                src={logo}
                alt="CashFlow Pro Logo"
                className="h-28 w-full object-contain"
              />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 mb-1">
              {isRegistering ? "Register Company" : "Sign in"}
            </h2>

            {isRegistering ? (
              <p className="text-sm text-slate-500 mb-6 font-medium">
                Set up your company and admin account.
              </p>
            ) : (
              <div className="mb-6"></div>
            )}

            <form
              onSubmit={isRegistering ? handleRegister : handleLogin}
              className="space-y-4"
            >
              {isRegistering && (
                <>
                  {/* Company Name */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h8a2 2 0 012 2v2h3a1 1 0 011 1v9a2 2 0 01-2 2H4a2 2 0 01-2-2V7a1 1 0 011-1h3V4zm2 2h8V4H6v2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Company Name (e.g. Acme Corp)"
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Admin Full Name */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                      <svg
                        className="w-5 h-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                          fillRule="evenodd"
                        ></path>
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Admin Full Name"
                      required
                      className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
                    />
                  </div>
                </>
              )}

              {/* Username / Email Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  {/* Switch icon based on mode to keep it perfectly styled */}
                  {isRegistering ? (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                        fillRule="evenodd"
                      ></path>
                    </svg>
                  )}
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  autoComplete="email"
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-[#F8F9FA] border border-transparent rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                {/* Left Icon */}
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2V7a3 3 0 00-6 0v2h6z"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                {/* Input */}
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isRegistering ? "Create a password" : "Password"}
                  autoComplete={
                    isRegistering ? "new-password" : "current-password"
                  }
                  required
                  className="w-full pl-12 pr-16 py-3.5 bg-[#F8F9FA] border border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#0B63F6] focus:bg-white transition-all"
                />

                {/* Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-3 flex items-center justify-center text-slate-500 hover:text-[#0B63F6] transition-colors"
                >
                  {showPassword ? (
                    // Eye Slash Icon
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074L3.707 2.293z"
                        clipRule="evenodd"
                      />
                      <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                    </svg>
                  ) : (
                    // Eye Icon
                    <svg
                      className="w-5 h-5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                      <path
                        fillRule="evenodd"
                        d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#1A365D] hover:bg-[#122543] disabled:bg-slate-400 text-white font-bold py-3.5 rounded-xl transition-all shadow-md active:scale-[0.98] mt-2"
              >
                {loading
                  ? "Processing..."
                  : isRegistering
                    ? "Register Company"
                    : "Sign in"}
              </button>

              {/* Error Message */}
              {error && (
                <div className="p-3 mt-2 bg-rose-50 text-rose-600 text-xs font-semibold border border-rose-100 rounded-xl text-center animate-fadeIn">
                  {error}
                </div>
              )}
            </form>

            <div className="mt-8 text-center">
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError("");
                }}
                className="text-sm font-semibold text-slate-500 hover:text-[#0B63F6] transition-colors"
              >
                {isRegistering
                  ? "Already have an account? Sign in"
                  : "Don't have an account? Register Company"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
