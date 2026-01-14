"use client";
import { useState } from "react";

import { useNotifications } from "@/components/providers/NotificationProvider";
import type { NotificationPopupData } from "@/components/ui/notification-popup";

const testNotifications = [
  {
    notification_id: "1",
    type: "connection_request",
    title: "New Connection Request",
    message: "Alice sent you a connection request",
    sender: { user_id: "a1", name: "Alice" },
    data: {},
  timestamp: new Date(),
    is_read: false,
    action_url: "/profile/a1",
  },
  {
    notification_id: "2",
    type: "post_like",
    title: "Post Liked",
    message: "Bob liked your post",
    sender: { user_id: "b2", name: "Bob" },
    data: {},
  timestamp: new Date(),
    is_read: false,
    action_url: "/posts/123",
  },
  {
    notification_id: "3",
    type: "post_comment",
    title: "New Comment",
    message: "Charlie commented: Nice work!",
    sender: { user_id: "c3", name: "Charlie" },
    data: {},
  timestamp: new Date(),
    is_read: false,
    action_url: "/posts/123",
  },
  {
    notification_id: "4",
    type: "system",
    title: "System Update",
    message: "Your password was changed successfully.",
    sender: { user_id: "sys", name: "System" },
    data: {},
  timestamp: new Date(),
    is_read: false,
    action_url: "/settings/security",
  },
  {
    notification_id: "5",
    type: "connection_accepted",
    title: "Connection Accepted",
    message: "David accepted your connection request",
    sender: { user_id: "d4", name: "David" },
    data: {},
  timestamp: new Date(),
    is_read: false,
    action_url: "/profile/d4",
  },
];

export default function NotificationTestPage() {
  const { showNotification } = useNotifications();
  const [last, setLast] = useState<string | null>(null);

  return (
    <div className="max-w-xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Notification Test Page</h1>
      <p className="mb-6 text-gray-600">Click a button to trigger a notification popup. Use this page to debug notification rendering and errors.</p>
      <div className="space-y-3">
        {testNotifications.map((notif) => (
          <button
            key={notif.notification_id}
            className="block w-full text-left bg-blue-100 hover:bg-blue-200 rounded px-4 py-2 mb-2 font-mono"
            onClick={() => {
              showNotification(notif as Omit<NotificationPopupData, 'id'>);
              setLast(notif.notification_id);
            }}
          >
            Trigger: <span className="font-semibold">{notif.title}</span> <span className="text-xs text-gray-500">({notif.type})</span>
          </button>
        ))}
      </div>
      {last && <div className="mt-6 text-green-700">Last triggered: {last}</div>}
    </div>
  );
}
