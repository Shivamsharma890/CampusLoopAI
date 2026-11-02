import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";

import {
  Menu,
  X,
  LayoutDashboard,
  Compass,
  PlusCircle,
  ClipboardList,
  Inbox,
  Bot,
  LogOut,
  Bell,
  Search,
  Repeat2,
  Package,
} from "lucide-react";

import { useAuth } from "../context/AuthContext.jsx";
import Logo from "./Logo.jsx";
import { endpoints } from "../services/api.js";

const links = [
  ["/app", "Overview", LayoutDashboard, true],
  ["/app/marketplace", "Marketplace", Compass],
  ["/app/add-item", "Share an item", PlusCircle],
  ["/app/my-listings", "My Listings", Package],
  ["/app/my-requests", "My requests", ClipboardList],
  ["/app/borrow-requests", "Incoming requests", Inbox],
  ["/app/assistant", "AI assistant", Bot],
];

const titles = {
  "/app": "Overview",
  "/app/marketplace": "Marketplace",
  "/app/add-item": "Share an item",
  "/app/my-listings": "My Listings",
  "/app/my-requests": "My requests",
  "/app/borrow-requests": "Incoming requests",
  "/app/assistant": "CampusLoop AI",
};

export default function Layout() {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incomingPendingCount, setIncomingPendingCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const seenNotificationIds = useRef(null);

  const nav = useNavigate();
  const loc = useLocation();

  const name =
    user?.full_name || user?.name || user?.email?.split("@")[0] || "Student";

  useEffect(() => {
    let active = true;
    let toastTimer;

    const loadNotifications = async () => {
      try {
        const [notificationData, countData, requestData] = await Promise.all([
          endpoints.notifications(),
          endpoints.unreadNotificationCount(),
          endpoints.myRequests(),
        ]);

        if (!active) return;

        const rows = Array.isArray(notificationData) ? notificationData : [];

        if (seenNotificationIds.current !== null) {
          const seen = seenNotificationIds.current;

          const newest = rows.find(
            (notification) => !seen.has(notification.id),
          );

          if (newest) {
            setToast(newest);

            clearTimeout(toastTimer);

            toastTimer = setTimeout(() => {
              if (active) setToast(null);
            }, 5000);
          }
        }

        seenNotificationIds.current = new Set(
          rows.map((notification) => notification.id),
        );

        setNotifications(rows);
        setUnreadCount(Number(countData?.unread_count || 0));

        const requests = Array.isArray(requestData)
          ? requestData
          : requestData?.requests || [];

        const pendingRequests = requests.filter(
          (request) =>
            Number(request.owner_id) === Number(user?.id) &&
            String(request.status).toLowerCase() === "pending",
        );

        setIncomingPendingCount(pendingRequests.length);
      } catch (error) {
        console.error("Could not load notifications:", error);
      }
    };

    seenNotificationIds.current = null;

    loadNotifications();

    const interval = setInterval(loadNotifications, 15000);

    return () => {
      active = false;
      clearInterval(interval);
      clearTimeout(toastTimer);
    };
  }, [user?.id]);

  const openNotification = async (notification) => {
    try {
      if (!notification.is_read) {
        await endpoints.markNotificationRead(notification.id);

        setNotifications((current) =>
          current.map((item) =>
            item.id === notification.id ? { ...item, is_read: true } : item,
          ),
        );

        setUnreadCount((count) => Math.max(0, count - 1));
      }
    } catch (error) {
      console.error("Could not mark notification as read:", error);
    }

    setBellOpen(false);

    if (
      ["borrow_request", "return_requested"].includes(
        notification.notification_type,
      )
    ) {
      nav("/app/borrow-requests");
    } else {
      nav("/app/my-requests");
    }
  };

  const pendingCount = incomingPendingCount;

  return (
    <div className="min-h-screen bg-[#f7f8fc] text-slate-900">
      <button
        onClick={() => setOpen(false)}
        className={`${
          open ? "fixed" : "hidden"
        } inset-0 z-40 bg-slate-950/40 lg:hidden`}
        aria-label="Close menu"
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[265px] flex-col border-r border-slate-200 bg-white px-5 py-6 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Logo />

          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-10 px-3 text-[10px] font-black uppercase tracking-[.2em] text-slate-400">
          Workspace
        </p>

        <nav className="mt-3 flex-1 space-y-1.5">
          {links.map(([to, label, Icon, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-semibold transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                    : "text-slate-600 hover:bg-slate-100"
                }`
              }
            >
              <Icon size={18} />
              <span className="flex-1">{label}</span>

              {label === "Incoming requests" && pendingCount > 0 && (
                <span className="min-w-5 rounded-full bg-rose-500 px-1.5 py-0.5 text-center text-[10px] font-black text-white">
                  {pendingCount > 99 ? "99+" : pendingCount}
                </span>
              )}

              {label === "AI assistant" && (
                <span className="ml-auto rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700">
                  AI
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 p-4 text-white">
          <Repeat2 size={21} />
          <p className="mt-3 text-sm font-extrabold">Good things go around.</p>
          <p className="mt-1 text-xs leading-5 text-indigo-100">
            Share what you have. Find what you need.
          </p>
        </div>

        <button
          onClick={() => {
            logout();
            nav("/login");
          }}
          className="mt-4 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-500 hover:bg-rose-50 hover:text-rose-600"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </aside>

      <div className="min-h-screen lg:pl-[265px]">
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
          <div className="flex h-[72px] items-center justify-between gap-3 px-4 sm:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() => setOpen(true)}
                className="rounded-xl border border-slate-200 p-2.5 lg:hidden"
              >
                <Menu size={18} />
              </button>

              <div>
                <h1 className="text-lg font-extrabold">
                  {titles[loc.pathname] || "Item details"}
                </h1>
                <p className="hidden text-xs text-slate-500 sm:block">
                  Your campus community, at a glance.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => nav("/app/marketplace")}
                className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400 md:flex"
              >
                <Search size={15} />
                Find something
              </button>

              <div className="relative">
                <button
                  onClick={() => setBellOpen((value) => !value)}
                  aria-label="Notifications"
                  aria-expanded={bellOpen}
                  className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"
                >
                  <Bell size={18} />

                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {bellOpen && (
                  <div className="absolute right-0 top-12 z-50 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                      <div>
                        <h3 className="text-sm font-extrabold">
                          Notifications
                        </h3>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {unreadCount} unread
                        </p>
                      </div>

                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            try {
                              await endpoints.markAllNotificationsRead();

                              setNotifications((current) =>
                                current.map((item) => ({
                                  ...item,
                                  is_read: true,
                                })),
                              );

                              setUnreadCount(0);
                            } catch (error) {
                              console.error(
                                "Could not mark all as read:",
                                error,
                              );
                            }
                          }}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    {notifications.length > 0 ? (
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.map((notification) => (
                          <button
                            key={notification.id}
                            onClick={() => openNotification(notification)}
                            className={`flex w-full gap-3 border-b border-slate-100 p-4 text-left hover:bg-indigo-50 ${
                              notification.is_read
                                ? "bg-white"
                                : "bg-indigo-50/60"
                            }`}
                          >
                            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
                              <Inbox size={18} />
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex items-start justify-between gap-2">
                                <span className="block text-sm font-bold text-slate-800">
                                  {notification.title}
                                </span>

                                {!notification.is_read && (
                                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-indigo-600" />
                                )}
                              </span>

                              <span className="mt-1 block text-xs leading-5 text-slate-500">
                                {notification.message}
                              </span>

                              <span className="mt-1 block text-[11px] text-slate-400">
                                {notification.created_at
                                  ? new Date(
                                      notification.created_at,
                                    ).toLocaleString()
                                  : ""}
                              </span>
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <Bell size={25} className="mx-auto text-slate-300" />
                        <p className="mt-2 text-sm font-bold text-slate-700">
                          You're all caught up!
                        </p>
                        <p className="mt-1 text-xs text-slate-400">
                          New activity will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-100 text-sm font-black text-indigo-700">
                  {name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden max-w-28 sm:block">
                  <p className="truncate text-xs font-bold">{name}</p>
                  <p className="text-[10px] text-slate-400">Campus member</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
          <Outlet />
        </main>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed right-4 top-20 z-[100] w-[min(360px,calc(100vw-2rem))] rounded-2xl border border-indigo-100 bg-white p-4 shadow-2xl"
        >
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
              <Bell size={19} />
            </span>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-extrabold text-slate-900">
                {toast.title}
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                {toast.message}
              </p>

              <button
                onClick={() => openNotification(toast)}
                className="mt-2 text-xs font-bold text-indigo-600"
              >
                View notification →
              </button>
            </div>

            <button
              onClick={() => setToast(null)}
              aria-label="Dismiss notification"
              className="text-slate-400 hover:text-slate-700"
            >
              <X size={17} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
