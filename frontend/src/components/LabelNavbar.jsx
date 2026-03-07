import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import NotificationCenter from "./NotificationCenter";

function LabelNavbar({ hidden, setHidden }) {
  // If parent doesn't provide setHidden, manage local hidden state so
  // the component still hides/shows when used standalone.
  const [hiddenInternal, setHiddenInternal] = useState(false);
  const hasExternal = typeof setHidden === "function";
  const safeSetHidden = (val) => {
    if (hasExternal) setHidden(val);
    setHiddenInternal(val);
  };

  const hasNotification = true;
  const lastScrollY = useRef(0);
  const timeoutRef = useRef(null);

  const navItem =
    "relative group whitespace-nowrap text-sm font-medium text-[#2B2B2B] hover:text-black cursor-pointer px-1 transition-colors duration-200";

  useEffect(() => {
    const shouldLog = (() => {
      try {
        return (window.__SCROLL_DEBUG__ === true) || (localStorage.getItem && localStorage.getItem('debugScrollLogs') === 'true');
      } catch (e) {
        return false;
      }
    })();

    const onScroll = () => {
      const currentY = window.scrollY;
      const diff = currentY - lastScrollY.current;

      // scroll down: hide after short debounce
      if (diff > 10 && currentY > 150) {
        if (!timeoutRef.current) {
          timeoutRef.current = setTimeout(() => {
            safeSetHidden(true);
            if (shouldLog) {
              // eslint-disable-next-line no-console
              console.log('LabelNavbar:setHidden true', { currentY, diff });
            }
            timeoutRef.current = null;
          }, 200);
        }
      }

      // scroll up: cancel debounce and show immediately
      if (diff < -5) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        safeSetHidden(false);
        if (shouldLog) {
          // eslint-disable-next-line no-console
          console.log('LabelNavbar:setHidden false', { currentY, diff });
        }
      }

      lastScrollY.current = currentY;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [setHidden]);

  const effectiveHidden = hasExternal ? hidden : hiddenInternal;
  const navigate = useNavigate();

  const goToPnrSection = (e) => {
    e.preventDefault();
    if (window.location.pathname !== "/") {
      navigate("/");
      setTimeout(() => {
        const el = document.getElementById("pnr-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } else {
      const el = document.getElementById("pnr-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav
      className={`
        fixed
        top-[70px]
        left-0
        w-full
        h-[48px]
        z-40
        bg-[#D4D4D4]
        border-b border-[#B3B3B3]
        transition-all duration-500 ease-out
        ${effectiveHidden ? "-translate-y-6 opacity-0" : "translate-y-0 opacity-100"}
      `}
    >
      <div
        className="
          h-full
          flex
          items-center
          gap-8
          px-4
          justify-start
          overflow-x-auto
          lg:justify-center
          lg:overflow-x-visible
          scrollbar-hide
        "
      >
        <button onClick={(e) => {
          e.preventDefault();
          window.dispatchEvent(new Event("switchToTrainMode"));
          if (window.location.pathname !== "/") {
            navigate("/");
            setTimeout(() => {
              const el = document.getElementById("booking-card");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
            }, 80);
          } else {
            const el = document.getElementById("booking-card");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }} className={navItem}>
          Seat Availability
          <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-[#2B2B2B] transition-all duration-300 group-hover:w-full"></span>
        </button>


        <button onClick={goToPnrSection} className={navItem}>
          PNR Status
          <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-[#2B2B2B] transition-all duration-300 group-hover:w-full"></span>
        </button>


        <NotificationCenter />


        <button onClick={(e) => {
          e.preventDefault();
          if (window.location.pathname !== "/") {
            navigate("/");
            setTimeout(() => {
              const el = document.getElementById("reviews-section");
              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
            }, 80);
          } else {
            const el = document.getElementById("reviews-section");
            if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }} className={navItem}>
          Reviews Hub
          <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-[#2B2B2B] transition-all duration-300 group-hover:w-full"></span>
        </button>

        <button onClick={(e) => {
          e.preventDefault();
          const el = document.getElementById("support-section");
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
        }} className={navItem}>
          Support
          <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-[#2B2B2B] transition-all duration-300 group-hover:w-full"></span>
        </button>
        <Link to="/" className={navItem}>
          About Us
          <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-[#2B2B2B] transition-all duration-300 group-hover:w-full"></span>
        </Link>
      </div>
    </nav>
  );
}

export default LabelNavbar;
