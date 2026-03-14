import {
    UilEstate,
    UilEnvelope,    // Better for Inbox
    UilUsersAlt,
    UilPackage,     // Better for Orders
    UilChart,       // Better for Analytics
    UilSignOutAlt,
    UilSetting,
    UilUsdSquare,
    UilClipboardAlt,
    UilClipboardAlt as UilTasks,   // Reusing Clipboard icon for Tasks
} from "@iconscout/react-unicons";

export const SidebarData = [
    { icon: UilEstate, heading: "Dashboard" },
    { icon: UilEnvelope, heading: "Inbox" },
    { icon: UilUsersAlt, heading: "Customers" },
    { icon: UilPackage, heading: "Tickets" },
    { icon: UilChart, heading: "Analytics" },
    { icon: UilSetting, heading: "Settings" },
    { icon: UilSignOutAlt, heading: "Logout" },
    { icon: UilTasks, heading: "Tasks" },
];

export const CardsData = [
    {
        title: "Sales",
        color: { backGround: "linear-gradient(180deg, #bb67ff 0%, #c484f3 100%)", boxShadow: "0px 10px 20px 0px #e0c6f5" },
        barValue: 70, value: "25,970", png: UilUsdSquare,
        series: [{ name: "Sales", data: [31, 40, 28, 51, 42, 109, 100] }],
    },
    {
        title: "Revenue",
        color: { backGround: "linear-gradient(180deg, #16a34a 0%, #15803d 100%)", boxShadow: "0px 10px 20px 0px #dcfce7"},
        barValue: 50, value: "15,000", png: UilClipboardAlt,
        series: [{ name: "Revenue", data: [25, 30, 35, 40, 45, 50, 55] }],
    },
    {
        title: "Expenses",
        color: { backGround: "linear-gradient(180deg,rgb(141, 173, 61) 0%,rgb(146, 175, 18) 100%)", boxShadow: "0px 10px 20px 0px #e5e7eb" },
        barValue: 40, value: "4,250", png: UilPackage,
        series: [{ name: "Expenses", data: [15, 25, 12, 35, 14, 20, 18] }],
    }

];

export const tickets = [
  {
    id: 1,
    subject: "Issue with order #12345",
    from: "customer@example.com",
    to: "support@company.com",
    status: "Open",
    messages: [
      { sender: "customer", body: "Hello, I have not received my order yet.", timestamp: "2026-02-20 09:15" },
      { sender: "agent", body: "Thanks for reaching out. We're checking on your order.", timestamp: "2026-02-20 09:45" }
    ]
  },
  {
    id: 2,
    subject: "Login error on Mobile App",
    from: "marcus.smith@gmail.com",
    to: "support@company.com",
    status: "Pending",
    messages: [
      { sender: "customer", body: "The app shows a white screen after the splash page.", timestamp: "2026-02-20 11:45" },
      { sender: "agent", body: "Hi Marcus, are you on the latest version of iOS?", timestamp: "2026-02-20 12:10" }
    ]
  },
  {
    id: 3,
    subject: "Refund for duplicate charge",
    from: "jenny.v@outlook.com",
    to: "billing@company.com",
    status: "Closed",
    messages: [
      { sender: "customer", body: "I was charged twice. Please refund the $29.00 duplicate.", timestamp: "2026-02-20 16:15" }
    ]
  }
];
export const CustomersData = [
    {
        id: 1,
        name: "Rachel Green",
        email: "rachel.g@mail.com",
        phone: "+1 (555) 789-0123",
        status: "active",
        tickets: { total: 2, open: 1 },
        lastActivity: "about 13 hours ago",
        tags: ["new-user", "mobile"]
    },
    {
        id: 2,
        name: "David Martinez",
        company: "Martinez Solutions",
        email: "david.m@example.org",
        phone: "+1 (555) 456-7890",
        status: "active",
        tickets: { total: 15, open: 1 },
        lastActivity: "about 15 hours ago",
        tags: ["premium", "frequent"]
    },
    {
        id: 3,
        name: "David Martinez",
        company: "Martinez Solutions",
        email: "david.m@example.org",
        phone: "+1 (555) 456-7890",
        status: "active",
        tickets: { total: 15, open: 1 },
        lastActivity: "about 15 hours ago",
        tags: ["premium", "frequent"]
    }

    // Add others from your image...
];