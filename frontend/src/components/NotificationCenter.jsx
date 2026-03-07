import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Ticket, Info, Newspaper, Bell, Inbox, CheckCircle2 } from 'lucide-react';

// Dummy data for notifications
const DUMMY_NOTIFICATIONS = [
    {
        id: 1,
        type: 'alert',
        title: 'Train Cancelled',
        message: 'Alert: Train 22653 has been cancelled due to track maintenance.',
        date: '10 min ago',
        read: false,
        forYou: true
    },
    {
        id: 2,
        type: 'reminder',
        title: 'Waitlist Alert',
        message: 'Your waitlisted ticket on Pune Express is now RAC.',
        date: '2 hours ago',
        read: false,
        forYou: true
    },
    {
        id: 3,
        type: 'info',
        title: 'Admin Update',
        message: 'Kerala Express 12625 is running late by 2 hours.',
        date: '1 day ago',
        read: true,
        forYou: true
    },
    {
        id: 4,
        type: 'news',
        title: 'New Vande Bharat Express Launched',
        message: 'Indian Railways introduces the new Vande Bharat Express.',
        date: '5 hours ago',
        read: true,
        forYou: false
    }
];

export default function NotificationCenter() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'foryou'
    const dropdownRef = useRef(null);

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'foryou') return n.forYou;
        return true;
    });

    // Calculate unread count (global)
    const unreadCount = notifications.filter(n => !n.read).length;

    // Handle click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Mark all as read
    const markAllAsRead = (e) => {
        e.stopPropagation(); // prevent closing dropdown
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    // Mark single as read
    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const getIcon = (type) => {
        switch (type) {
            case 'alert': return <AlertTriangle size={16} className="text-red-500" />;
            case 'reminder': return <Ticket size={16} className="text-orange-400" />;
            case 'info': return <Info size={16} className="text-blue-500" />;
            case 'news': return <Newspaper size={16} className="text-purple-400" />;
            default: return <Bell size={16} className="text-gray-400" />;
        }
    };

    const getIconBg = (type) => {
        switch (type) {
            case 'alert': return 'bg-red-500/10 text-red-500';
            case 'reminder': return 'bg-orange-500/10 text-orange-400';
            case 'info': return 'bg-blue-500/10 text-blue-500';
            case 'news': return 'bg-purple-500/10 text-purple-400';
            default: return 'bg-gray-500/10 text-gray-400';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Notification Bell / Trigger Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative group whitespace-nowrap text-sm font-medium text-[#2B2B2B] hover:text-black cursor-pointer px-1 transition-colors duration-200"
            >
                <div className="flex items-center gap-1.5">
                    Notifications
                    {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-2 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500 border border-white"></span>
                        </span>
                    )}
                </div>
                <span className="absolute left-0 -bottom-1 h-[2px] w-0 bg-[#2B2B2B] transition-all duration-300 group-hover:w-full"></span>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="fixed sm:absolute inset-x-4 top-[120px] sm:inset-x-auto sm:top-auto sm:-right-4 mt-1 sm:mt-3 w-auto sm:w-96 bg-[#1D2332] border border-gray-700 rounded-xl shadow-[0_15px_50px_rgba(0,0,0,0.6)] z-50 overflow-hidden flex flex-col"
                    style={{ transformOrigin: 'top right' }}>

                    {/* Header */}
                    <div className="flex flex-col border-b border-gray-700 bg-[#212838]">
                        <div className="flex justify-between items-center px-5 py-4 pb-2">
                            <h3 className="text-white font-bold text-[17px] flex items-center gap-2">
                                Notifications
                                {unreadCount > 0 && (
                                    <span className="bg-orange-500/20 text-orange-400 font-semibold text-[11px] px-2 py-0.5 rounded-full border border-orange-500/30">
                                        {unreadCount} New
                                    </span>
                                )}
                            </h3>
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-orange-500 hover:text-orange-400 transition font-medium flex items-center gap-1"
                                >
                                    <CheckCircle2 size={12} />
                                    Mark all read
                                </button>
                            )}
                        </div>

                        {/* Tabs */}
                        <div className="flex px-5 mt-1 gap-4">
                            <button
                                onClick={() => setActiveTab('all')}
                                className={`pb-2 text-xs font-semibold transition-colors border-b-2 ${activeTab === 'all' ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-300'
                                    }`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setActiveTab('foryou')}
                                className={`pb-2 text-xs font-semibold transition-colors border-b-2 flex items-center gap-1 ${activeTab === 'foryou' ? 'text-orange-500 border-orange-500' : 'text-gray-400 border-transparent hover:text-gray-300'
                                    }`}
                            >
                                <Bell size={12} />
                                For You
                            </button>
                        </div>
                    </div>

                    {/* Body List */}
                    <div className="max-h-80 overflow-y-auto scrollbar-hide bg-[#181d2a]">
                        {filteredNotifications.length === 0 ? (
                            <div className="px-5 py-12 text-center text-gray-500 flex flex-col items-center">
                                <Inbox size={32} className="mb-2 text-gray-600 opacity-50" />
                                <p className="text-sm font-medium">No notifications found.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col divide-y divide-gray-800/80">
                                {filteredNotifications.map((notif) => (
                                    <div
                                        key={notif.id}
                                        onClick={() => markAsRead(notif.id)}
                                        className={`
                                            px-5 py-4 cursor-pointer transition-all duration-300 group
                                            ${notif.read ? 'bg-transparent opacity-75 hover:bg-white/5' : 'bg-[#1D2332] hover:bg-white/5 border-l-[2px] border-l-orange-500/50'}
                                        `}
                                    >
                                        <div className={`flex gap-3 ${notif.read ? 'ml-0.5' : '-ml-0.5'}`}>
                                            {/* Icon */}
                                            <div className="mt-1 shrink-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconBg(notif.type)} transition-transform group-hover:scale-105`}>
                                                    {getIcon(notif.type)}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5 gap-2">
                                                    <h4 className={`text-sm font-bold truncate ${notif.read ? 'text-gray-400' : 'text-gray-200'}`}>
                                                        {notif.title}
                                                    </h4>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap mt-0.5 bg-gray-900/40 px-1.5 rounded">
                                                        {notif.date}
                                                    </span>
                                                </div>
                                                <p className={`text-xs leading-relaxed line-clamp-2 ${notif.read ? 'text-gray-500' : 'text-gray-400'}`}>
                                                    {notif.message}
                                                </p>
                                            </div>

                                            {/* Unread Dot Indicator */}
                                            {!notif.read && (
                                                <div className="shrink-0 flex items-center self-center pl-1">
                                                    <div className="w-2 h-2 rounded-full bg-[#4ab86d] shadow-[0_0_8px_rgba(74,184,109,0.6)]"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-700 bg-[#212838] text-center">
                        <Link
                            to="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-orange-500 hover:text-orange-400 transition font-semibold hover:underline underline-offset-2"
                        >
                            View All Notifications
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
