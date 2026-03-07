import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Ticket, Info, Newspaper, Inbox, Bell, CheckCircle2 } from 'lucide-react';

const DUMMY_NOTIFICATIONS = [
    {
        id: 1,
        type: 'alert',
        title: 'Train Cancelled',
        message: 'Alert: Train 22653 has been cancelled due to track maintenance. Full refund initiated.',
        date: '10 min ago',
        read: false,
        link: null,
        forYou: true
    },
    {
        id: 2,
        type: 'reminder',
        title: 'Waitlist Alert',
        message: 'Your waitlisted ticket on Pune Express is now RAC. You can view the PNR status to confirm the coach.',
        date: '2 hours ago',
        read: false,
        link: '/pnr-status',
        forYou: true
    },
    {
        id: 3,
        type: 'news',
        title: 'New Vande Bharat Express Launched',
        message: 'Indian Railways introduces the new Vande Bharat Express connecting Trivandrum and Kasaragod in record time. Read the full article to see schedules and pricing.',
        date: '5 hours ago',
        read: false,
        link: '#',
        forYou: false
    },
    {
        id: 4,
        type: 'info',
        title: 'Admin Update',
        message: 'Kerala Express 12625 is running late by 2 hours. Expected arrival at ERS is 14:30.',
        date: '1 day ago',
        read: true,
        link: null,
        forYou: true
    },
    {
        id: 5,
        type: 'news',
        title: 'Monsoon Safety Guidelines Released',
        message: 'Please review the updated safety guidelines for traveling during the monsoon season.',
        date: '3 days ago',
        read: true,
        link: '#',
        forYou: false
    }
];

export default function AllNotifications() {
    const [notifications, setNotifications] = useState(DUMMY_NOTIFICATIONS);
    const [activeTab, setActiveTab] = useState('all'); // 'all' | 'foryou'
    const navigate = useNavigate();

    const filteredNotifications = notifications.filter(n => {
        if (activeTab === 'foryou') return n.forYou;
        return true; // 'all'
    });

    const unreadCount = filteredNotifications.filter(n => !n.read).length;

    const markAllAsRead = () => {
        setNotifications(notifications.map(n => ({ ...n, read: true })));
    };

    const markAsRead = (id) => {
        setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const handleNotificationClick = (notif) => {
        if (!notif.read) {
            markAsRead(notif.id);
        }
        if (notif.link && notif.link !== '#') {
            navigate(notif.link);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'alert':
                return <AlertTriangle size={20} className="text-red-500" />;
            case 'reminder':
                return <Ticket size={20} className="text-orange-400" />;
            case 'info':
                return <Info size={20} className="text-blue-500" />;
            case 'news':
                return <Newspaper size={20} className="text-purple-400" />;
            default:
                return <Bell size={20} className="text-gray-400" />;
        }
    };

    const getIconBg = (type) => {
        switch (type) {
            case 'alert':
                return 'bg-red-500/10 text-red-400';
            case 'reminder':
                return 'bg-orange-500/10 text-orange-400';
            case 'info':
                return 'bg-blue-500/10 text-blue-400';
            case 'news':
                return 'bg-purple-500/10 text-purple-400';
            default:
                return 'bg-gray-500/10 text-gray-400';
        }
    };

    return (
        <div className="min-h-screen pt-24 pb-20 px-4 bg-[#0f172a] text-gray-100 font-sans">
            <div className="max-w-4xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 flex items-center gap-3">
                            Notifications
                            {unreadCount > 0 && (
                                <span className="bg-orange-500/20 text-orange-400 text-sm px-3 py-1 rounded-full border border-orange-500/30 font-medium">
                                    {unreadCount} New
                                </span>
                            )}
                        </h1>
                        <p className="text-gray-400 text-sm">Stay updated with the latest alerts, waitlist statuses, and railway news.</p>
                    </div>
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="flex items-center gap-2 self-start sm:self-auto px-4 py-2 bg-[#1D2332] hover:bg-[#212838] border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm font-semibold transition"
                        >
                            <CheckCircle2 size={16} className="text-orange-500" />
                            Mark all as read
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="flex gap-2 mb-6 border-b border-gray-700pb-1">
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-colors border-b-2 ${activeTab === 'all'
                            ? 'text-orange-500 border-orange-500 bg-[#1D2332]/50'
                            : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                            }`}
                    >
                        All Notifications
                    </button>
                    <button
                        onClick={() => setActiveTab('foryou')}
                        className={`px-5 py-2.5 rounded-t-lg font-medium text-sm transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'foryou'
                            ? 'text-orange-500 border-orange-500 bg-[#1D2332]/50'
                            : 'text-gray-400 border-transparent hover:text-gray-200 hover:bg-white/5'
                            }`}
                    >
                        <Bell size={14} className={activeTab === 'foryou' ? 'text-orange-500' : 'text-gray-500'} />
                        For You
                    </button>
                </div>

                {/* Notifications List */}
                <div className="bg-[#1D2332] rounded-xl border border-gray-700 shadow-lg overflow-hidden">
                    {filteredNotifications.length === 0 ? (
                        <div className="px-6 py-16 text-center text-gray-500 flex flex-col items-center">
                            <Inbox size={48} className="mb-4 text-gray-600 opacity-50" />
                            <p className="text-lg font-medium text-gray-400">You are all caught up!</p>
                            <p className="text-sm mt-1">No pending notifications in this view.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col divide-y divide-gray-700/50">
                            {filteredNotifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`
                    px-6 py-5 cursor-pointer transition-all duration-300
                    ${notif.read ? 'bg-transparent opacity-70 hover:bg-white/5' : 'bg-[#1D2332] hover:bg-white/5 border-l-[3px] border-l-orange-500/50'}
                  `}
                                >
                                    <div className={`flex gap-4 sm:gap-6 ${notif.read ? 'ml-1' : '-ml-[3px]'}`}>
                                        {/* Icon */}
                                        <div className="shrink-0 mt-1">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getIconBg(notif.type)}`}>
                                                {getIcon(notif.type)}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-1.5 gap-1 sm:gap-4">
                                                <h4 className={`text-base font-bold tracking-wide ${notif.read ? 'text-gray-400' : 'text-gray-200'}`}>
                                                    {notif.title}
                                                </h4>
                                                <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap bg-gray-900/40 px-2 py-1 rounded">
                                                    {notif.date}
                                                </span>
                                            </div>

                                            <p className={`text-sm leading-relaxed mb-3 ${notif.read ? 'text-gray-500' : 'text-gray-400'}`}>
                                                {notif.message}
                                            </p>

                                            {/* Action Links */}
                                            {notif.link && (
                                                <div className="flex items-center gap-1.5 text-xs font-semibold text-orange-500 group-hover:text-orange-400 transition">
                                                    <span>{notif.type === 'news' ? 'Read Article' : 'View Details'}</span>
                                                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
