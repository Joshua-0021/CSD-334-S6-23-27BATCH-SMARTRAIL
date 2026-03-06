import { useEffect, useState, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User } from "lucide-react";
import LabelNavbar from "../LabelNavbar";
import Auth from "../Auth";
import { supabase } from "../../utils/supabaseClient";

function Header({ onLoginClick }) {
  const [hidden, setHidden] = useState(false);
  const [user, setUser] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const isPaymentPage = location.pathname.startsWith('/payment');
  const hideLabelNavbar = location.pathname.startsWith('/seat-layout') || location.pathname.startsWith('/passenger-details') || isPaymentPage;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    // Get current user from Supabase
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Extract first name from full name or email
        const fullName = user.user_metadata?.full_name || user.email?.split('@')[0];
        const firstName = fullName?.split(' ')[0] || 'User';
        setUser({
          id: user.id,
          email: user.email,
          name: firstName
        });
      }
    };

    getUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0];
        const firstName = fullName?.split(' ')[0] || 'User';
        setUser({
          id: session.user.id,
          email: session.user.email,
          name: firstName
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isPaymentPage) {
    return null;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setUser(null);
    setShowDropdown(false);
    window.location.reload();
  };

  return (
    <>
      <header
        className={`
          fixed top-0 left-0 z-[60] w-full h-[70px]
          flex items-center justify-between
          px-4 sm:px-8
          bg-[#FFFFFF] dark:bg-[#2B2B2B]
          border-b border-[#D4D4D4]
        `}
      >
        <div className="flex items-center gap-3">
          <div
            onClick={() => {
              navigate('/');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <img src="/trainnew.png" alt="Logo" className="h-[54px] hidden sm:block" />
            <span className="text-[28px] font-bold text-[#2B2B2B] dark:text-white">
              SmartRail
            </span>
          </div>
        </div>

        {user ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="px-3 sm:px-5 py-2 rounded-lg border border-[#2B2B2B] text-[#2B2B2B] dark:text-white dark:border-white hover:bg-[#2B2B2B] hover:text-white dark:hover:bg-gray-700 transition font-medium flex items-center gap-2"
            >
              <User className="h-4 w-4 sm:hidden" />
              <span className="hidden sm:inline">Hi, {user.name}</span>
              <span>▾</span>
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#2B2B2B] border border-[#D4D4D4] rounded-lg shadow-lg py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => {
                    navigate('/');
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-4 py-2 text-[#2B2B2B] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Booking History
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-[#2B2B2B] dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Logout
                </button>
                {/* Add more options here later */}
              </div>
            )}
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="px-5 py-2 rounded-lg border border-[#2B2B2B] text-[#2B2B2B] hover:bg-[#2B2B2B] hover:text-white transition"
          >
            Login
          </button>
        )}
      </header>

      {!hideLabelNavbar && <LabelNavbar hidden={hidden} setHidden={setHidden} />}
    </>
  );
}

export default Header;