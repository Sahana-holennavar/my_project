"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearAuth } from "@/store/slices/authSlice";
import { motion, AnimatePresence } from "framer-motion";
import { TagInput } from '@/components/TagInput';
import { addToSearchHistory, getSearchHistory } from '@/lib/utils/searchHistory';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { NotificationBadge } from '@/components/ui/notification-badge';
import {
  Bell,
  User,
  Settings,
  Users,
  LogOut,
  Search,
  Home,
  Menu,
  X,
  FileUp,
  Briefcase,
  FileText,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { User as UserType } from "@/types/auth";

// Navigation configuration
const navLinks = [
  { label: "Home", icon: Home, href: "/feed", responsiveClass: "" },
  {
    label: "Resume Evaluator",
    icon: FileUp,
    href: "/resume-evaluator",
    responsiveClass: "",
    publicAccess: true,
  },
  {
    label: "Connections",
    icon: Users,
    href: "/connections",
    responsiveClass: "hidden md:flex",
  },
  {
    label: "Messages",
    icon: MessageCircle,
    href: "/chat",
    responsiveClass: "hidden md:flex",
  },
  {
    label: "Notifications",
    icon: Bell,
    href: "/notifications",
    responsiveClass: "hidden lg:flex",
  },
  {
    label: "Profile",
    icon: User,
    href: "/profile",
    responsiveClass: "hidden xl:flex",
  },
  {
    label: "Businesses",
    icon: Briefcase,
    href: "/businesses",
    responsiveClass: "hidden xl:flex",
  },
  {
    label: "My Applications",
    icon: Briefcase,
    href: "/applications",
    responsiveClass: "hidden xl:flex",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
    responsiveClass: "hidden xl:flex",
  },
];

const bottomNavLinks = [
  { label: "Home", icon: Home, href: "/feed" },
  { label: "Connections", icon: Users, href: "/connections" },
  { label: "Messages", icon: MessageCircle, href: "/chat" },
  { label: "Notifications", icon: Bell, href: "/notifications" },
  { label: "Applications", icon: Briefcase, href: "/applications" },
  { label: "Profile", icon: User, href: "/profile" },
];

// User Dropdown Component
const UserDropdown = ({
  user,
  profile,
  onLogout,
}: {
  user: UserType | null;
  profile: { 
    personal_information?: { first_name?: string; last_name?: string };
    avatar?: { fileUrl?: string };
  } | null;
  onLogout: () => void;
}) => {
  const getUserInitials = () => {
    if (profile?.personal_information?.first_name && profile?.personal_information?.last_name) {
      return `${profile.personal_information.first_name[0]}${profile.personal_information.last_name[0]}`.toUpperCase();
    }
    if (!user?.name || typeof user.name !== 'string' || user.name.trim() === '') return "U";
    const trimmedName = user.name.trim();
    const names = trimmedName.split(" ").filter(n => n.length > 0);
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return trimmedName.substring(0, Math.min(2, trimmedName.length)).toUpperCase();
  };

  const getDisplayName = () => {
    if (profile?.personal_information?.first_name && profile?.personal_information?.last_name) {
      return `${profile.personal_information.first_name} ${profile.personal_information.last_name}`;
    }
    return user?.name || "User";
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800/70 rounded-3xl p-2 shadow-2xl">
      <div className="p-2 flex items-center gap-3">
        <Avatar className="h-11 w-11 shrink-0">
          <AvatarImage src={profile?.avatar?.fileUrl} alt={getDisplayName()} />
          <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-semibold text-sm">
            {getUserInitials()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-base font-semibold text-neutral-800 dark:text-neutral-100 truncate">
            {getDisplayName()}
          </p>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
            {user?.email}
          </p>
        </div>
      </div>
      <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />

      {/* Navigation Items - Always visible in dropdown */}
      <div className="flex flex-col">
        <Link
          href="/notifications"
          data-tour="notifications"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
        >
          <Bell className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-neutral-700 dark:text-neutral-200">
            Notifications
          </span>
        </Link>
        <Link
          href="/profile"
          data-tour="profile"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
        >
          <User className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-neutral-700 dark:text-neutral-200">
            Profile
          </span>
        </Link>
        <Link
          href="/chat"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
        >
          <MessageCircle className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-neutral-700 dark:text-neutral-200">
            Chats
          </span>
        </Link>
        <Link
          href="/applications"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
        >
          <FileText className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-neutral-700 dark:text-neutral-200">
            My Applications
          </span>
        </Link>
        <Link
          href="/businesses"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
        >
          <Briefcase className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-neutral-700 dark:text-neutral-200">
            Businesses
          </span>
        </Link>
        <Link
          href="/settings"
          data-tour="settings"
          className="flex items-center gap-3 p-3 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-sm"
        >
          <Settings className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-neutral-700 dark:text-neutral-200">
            Settings
          </span>
        </Link>
      </div>
      <div className="my-1 h-px bg-neutral-200 dark:bg-neutral-800" />

      <button
        onClick={onLogout}
        className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 transition-colors text-sm"
      >
        <LogOut className="h-5 w-5" />
        <span className="font-medium">Sign out</span>
      </button>
    </div>
  );
};

// Hamburger Menu Component
const HamburgerMenu = ({
  isOpen,
  onClose,
  activeLink,
  setActiveLink,
}: {
  isOpen: boolean;
  onClose: () => void;
  activeLink: string;
  setActiveLink: (link: string) => void;
}) => {
  const router = useRouter();
  
  const handleNavClick = (href: string) => {
    setActiveLink(href);
    router.push(href);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          {/* Menu Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 shadow-2xl z-50 overflow-y-auto"
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                  Menu
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 p-4">
                <div className="flex flex-col gap-2">
                  {navLinks.map((item) => {
                    const isActive = activeLink === item.href;
                    return (
                      <button
                        key={item.href}
                        onClick={() => handleNavClick(item.href)}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                          isActive
                            ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                            : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        }`}
                      >
                        <item.icon className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium">{item.label}</span>
    {isActive && (
      <motion.div
                            layoutId="mobile-menu-active"
                            className="ml-auto h-2 w-2 rounded-full bg-purple-600 dark:bg-purple-400"
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -10, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, damping: 20, stiffness: 200 },
  },
  exit: {
    opacity: 0,
    y: -10,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// Mobile Search Overlay Component
const MobileSearchOverlay = ({
  isOpen,
  onClose,
  history,
  onSearch,
}: {
  isOpen: boolean;
  onClose: () => void;
  history: string[];
  onSearch: (tags: string[], searchType: 'users' | 'jobs') => void;
}) => {
  const router = useRouter();
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchType, setSearchType] = useState<'users' | 'jobs'>('users');
  
  const handleTagSearch = (tags?: string[]) => {
    const tagsToSearch = tags || searchTags;
    if (tagsToSearch.length > 0) {
      onSearch(tagsToSearch, searchType);
      setSearchTags([]);
      onClose();
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", stiffness: 120, damping: 25 }}
          className="fixed inset-0 bg-white dark:bg-neutral-950 z-50 md:hidden"
        >
          <div className="p-4 pt-5 flex flex-col gap-4">
            {/* Search Type Toggle */}
            <div className="flex gap-2 p-1 bg-neutral-100 dark:bg-neutral-900 rounded-xl">
              <button
                onClick={() => setSearchType('users')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === 'users'
                    ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Search Users
              </button>
              <button
                onClick={() => setSearchType('jobs')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  searchType === 'jobs'
                    ? 'bg-white dark:bg-neutral-800 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-neutral-600 dark:text-neutral-400'
                }`}
              >
                Search Jobs
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <TagInput
                value={searchTags}
                onChange={setSearchTags}
                placeholder={searchType === 'users' ? 'Search users (e.g., john doe, developer)' : 'Search jobs (e.g., software engineer, react)'}
                maxTags={5}
                suggestions={history}
                onEnter={(tags) => {
                  if (tags.length > 0) {
                    handleTagSearch(tags);
                  }
                }}
              />
              <button
                onClick={onClose}
                className="text-sm text-purple-600 font-semibold whitespace-nowrap"
              >
                Cancel
              </button>
            </div>
            {searchTags.length > 0 && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleTagSearch();
                }}
                className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-medium"
              >
                <Search size={18} />
                Search {searchType === 'users' ? 'Users' : 'Jobs'}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Bottom Navigation Component
const BottomNav = ({
  activeLink,
  setActiveLink,
  notificationCounts,
}: {
  activeLink: string;
  setActiveLink: (link: string) => void;
  notificationCounts: { unreadCount: number; pendingConnectionsCount: number };
}) => {
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const router = useRouter();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 25, delay: 0.2 }}
      className="fixed bottom-0 left-0 right-0 h-[72px] bg-white/80 dark:bg-neutral-950/80 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-800 md:hidden z-40"
      style={{ borderRadius: "32px 32px 0 0" }}
    >
      <div className="flex justify-around items-center h-full max-w-md mx-auto relative">
        {bottomNavLinks.map((item) => {
          const isActive = activeLink === item.href;
          // Map href to data-tour attribute
          let dataTour = '';
          if (item.href === '/notifications') dataTour = 'notifications';
          else if (item.href === '/profile') dataTour = 'profile';
          else if (item.href === '/settings') dataTour = 'settings';
          else if (item.href === '/connections') dataTour = 'connections';
          
          // Determine badge count
          let badgeCount = 0;
          if (item.href === '/notifications') {
            badgeCount = notificationCounts.unreadCount;
          } else if (item.href === '/connections') {
            badgeCount = notificationCounts.pendingConnectionsCount;
          }
          
          return (
            <button
              key={item.href}
              onClick={() => {
                setActiveLink(item.href);
                router.push(item.href);
              }}
              onMouseEnter={() => setHoveredLink(item.href)}
              onMouseLeave={() => setHoveredLink(null)}
              className="relative flex flex-col items-center gap-1 text-neutral-500 w-16 h-16 justify-center"
              data-tour={dataTour}
            >
              {hoveredLink === item.href && (
                <motion.div
                  layoutId="hover-chip"
                  className="absolute -top-8 bg-neutral-800 dark:bg-neutral-700 text-white text-xs px-2 py-1 rounded-md z-50"
                >
                  {item.label}
                </motion.div>
              )}
              <div className="relative">
                <AnimatePresence>
                  {isActive && (
                    <motion.div
                      layoutId="mobile-active-circle"
                      className="absolute -inset-3 bg-purple-100 dark:bg-purple-900/40 rounded-full"
                      initial={{ scale: 0.5 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0.5 }}
                    />
                  )}
                </AnimatePresence>
                <item.icon
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`relative h-7 w-7 transition-colors duration-300 ${
                    isActive ? "text-purple-600 dark:text-purple-400" : ""
                  }`}
                />
                {badgeCount > 0 && (
                  <NotificationBadge 
                    count={badgeCount} 
                    size="sm"
                  />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </motion.nav>
  );
};

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  const profile = useAppSelector((state) => state.profile.profile);

  // Fetch notification counts
  const { counts: notificationCounts } = useNotificationCounts({
    autoFetch: true,
    enablePolling: true,
    pollingInterval: 60000, // Poll every 60 seconds
  });

  const [isUserDropdownOpen, setUserDropdownOpen] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [searchTags, setSearchTags] = useState<string[]>([]);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [activeLink, setActiveLink] = useState(pathname || "/");
  const [isHamburgerMenuOpen, setHamburgerMenuOpen] = useState(false);
  
  // Load search history on mount
  useEffect(() => {
    const history = getSearchHistory();
    // Extract unique tags from history
    const allTags = new Set<string>();
    history.forEach(item => {
      item.tags.forEach(tag => allTags.add(tag));
    });
    setSearchHistory(Array.from(allTags));
  }, []);

  const userDropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Update active link when pathname changes
  useEffect(() => {
    setActiveLink(pathname || "/");
  }, [pathname]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        // Search closed when clicking outside
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    dispatch(clearAuth());
    setUserDropdownOpen(false);
    router.push("/login");
  };

  const getUserInitials = () => {
    // Try to get initials from profile first
    if (profile?.personal_information?.first_name && profile?.personal_information?.last_name) {
      return `${profile.personal_information.first_name[0]}${profile.personal_information.last_name[0]}`.toUpperCase();
    }
    
    // Fallback to user name
    if (!user?.name || typeof user.name !== 'string') return "U";
    const names = user.name.split(" ");
    return names.length >= 2
      ? `${names[0][0]}${names[1][0]}`.toUpperCase()
      : user.name.substring(0, 2).toUpperCase();
  };

  const handleTagSearch = (tags?: string[]) => {
    // Use provided tags or fallback to current searchTags state
    const currentTags = tags || searchTags;
    if (currentTags.length === 0) {
      return;
    }
    
    // Update state if tags were provided
    if (tags && tags.length > 0) {
      setSearchTags(tags);
    }
    
    // Save to search history
    addToSearchHistory(currentTags);
    
    // Navigate to /search with query params (for user search by default)
    const queryParam = currentTags.join(' ');
    router.push(`/search?q=${encodeURIComponent(queryParam)}`);
    setSearchTags([]);
  };

  const handleSearch = (term: string) => {
    // Legacy function for backward compatibility (if needed)
    // Navigate to /search for user search
    if (term.trim() !== "") {
      const tags = [term.trim()];
      addToSearchHistory(tags, term);
      router.push(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800/70 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between gap-2 sm:gap-4 lg:gap-6">
            {/* Left Section - Logo */}
            <div className="flex items-center shrink-0">
              <Link
                href={isAuthenticated ? "/" : "/"}
                className="flex items-center gap-2 shrink-0"
              >
                <div className="relative h-10 w-10 bg-neutral-900 dark:bg-neutral-800 rounded-lg flex items-center justify-center transition-transform hover:scale-105 shadow-sm">
                  <Image
                    src="/logo.png"
                    alt="Logo"
                    width={36}
                    height={36}
                    className="w-7 h-7 object-contain"
                    priority
                  />
                </div>
                <span className="text-xl font-bold text-neutral-900 dark:text-white">
                  Techvruk
                </span>
              </Link>
            </div>

            {/* Center Section - Desktop Search with Tags */}
            {isAuthenticated && (
              <div
                className="relative flex-1 max-w-4xl mx-2 sm:mx-4 lg:mx-8 hidden sm:flex"
                ref={searchRef}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="flex-1 min-w-0 w-full">
                    <TagInput
                      value={searchTags}
                      onChange={setSearchTags}
                      placeholder="Search users (e.g., john doe, developer)"
                      maxTags={5}
                      suggestions={searchHistory}
                      onEnter={(tags) => handleTagSearch(tags)}
                    />
                  </div>
                  {searchTags.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleTagSearch();
                      }}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors flex items-center gap-2 font-medium disabled:opacity-50 shrink-0"
                      title="Search"
                    >
                      <Search size={18} />
                      <span className="hidden lg:inline">Search</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Right Side Actions */}
            <div className="flex items-center gap-2">
              {/* Resume Evaluator - Always visible */}
              <Link
                href="/resume-evaluator"
                className={`p-2 rounded-xl transition-colors ${
                  activeLink === "/resume-evaluator"
                    ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                    : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                }`}
                onClick={() => setActiveLink("/resume-evaluator")}
                aria-label="Resume Evaluator"
              >
                <FileUp className="h-5 w-5" />
              </Link>
              
              {isAuthenticated ? (
                <>
                  {/* Navigation Icons - Home and Connections (Desktop/Tablet) */}
                  <div className="hidden sm:flex items-center gap-1">
                    <Link
                      href="/feed"
                      data-tour="home"
                      className={`p-2 rounded-xl transition-colors ${
                        activeLink === "/feed"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                          : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      }`}
                      onClick={() => setActiveLink("/feed")}
                      aria-label="Home"
                    >
                      <Home className="h-5 w-5" />
                    </Link>
                    <Link
                      href="/connections"
                      data-tour="connections"
                      className={`relative p-2 rounded-xl transition-colors ${
                        activeLink === "/connections"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                          : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      }`}
                      onClick={() => setActiveLink("/connections")}
                      aria-label="Connections"
                    >
                      <Users className="h-5 w-5" />
                      <NotificationBadge 
                        count={notificationCounts.pendingConnectionsCount} 
                        size="sm"
                      />
                    </Link>
                    {/* Notifications Bell - Desktop/Tablet */}
                    <Link
                      href="/notifications"
                      data-tour="notifications"
                      className={`relative p-2 rounded-xl transition-colors ${
                        activeLink === "/notifications"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                          : "hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                      }`}
                      onClick={() => setActiveLink("/notifications")}
                      aria-label="Notifications"
                    >
                      <Bell className="h-5 w-5" />
                      <NotificationBadge 
                        count={notificationCounts.unreadCount} 
                        size="sm"
                      />
                    </Link>
                  </div>

                  {/* Hamburger Menu Button - Mobile Only */}
                  <button
                    aria-label="Open menu"
                    onClick={() => setHamburgerMenuOpen(true)}
                    className="sm:hidden p-2 rounded-xl transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  {/* Mobile Search Button */}
                  <button
                    aria-label="Open search"
                    onClick={() => setShowMobileSearch(true)}
                    className="sm:hidden p-2 rounded-xl transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300"
                  >
                    <Search className="h-5 w-5" />
                  </button>

                  {/* User Dropdown */}
                  <div className="relative" ref={userDropdownRef}>
                    <button
                      aria-label="User menu"
                      onClick={() => setUserDropdownOpen((o) => !o)}
                      className="relative h-10 w-10 rounded-full p-0 transition-all hover:ring-4 hover:ring-purple-500/20"
                    >
                      <Avatar className="h-10 w-10 ring-1 ring-neutral-200 dark:ring-neutral-700">
                        <AvatarImage src={profile?.avatar?.fileUrl} alt={user?.name || "User"} />
                        <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white font-semibold text-sm">
                          {getUserInitials()}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                    <AnimatePresence>
                      {isUserDropdownOpen && (
                        <motion.div
                          variants={dropdownVariants}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          className="absolute top-14 right-0 w-72"
                        >
                          <UserDropdown user={user} profile={profile} onLogout={handleLogout} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <Link href="/login" className="hidden sm:block">
                    <Button
                      variant="ghost"
                      className="rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hamburger Menu */}
      {isAuthenticated && (
        <HamburgerMenu
          isOpen={isHamburgerMenuOpen}
          onClose={() => setHamburgerMenuOpen(false)}
          activeLink={activeLink}
          setActiveLink={setActiveLink}
        />
      )}

      {/* Mobile Search Overlay */}
      <MobileSearchOverlay
        isOpen={showMobileSearch}
        onClose={() => setShowMobileSearch(false)}
        history={searchHistory}
        onSearch={(tags, searchType) => {
          addToSearchHistory(tags);
          const queryParam = tags.join(' ');
          // Navigate to search page with type parameter
          router.push(`/search?q=${encodeURIComponent(queryParam)}&type=${searchType}`);
        }}
      />

      {/* Bottom Navigation (Mobile) */}
      {isAuthenticated && (
        <BottomNav
          activeLink={activeLink}
          setActiveLink={setActiveLink}
          notificationCounts={{
            unreadCount: notificationCounts.unreadCount,
            pendingConnectionsCount: notificationCounts.pendingConnectionsCount,
          }}
        />
      )}
    </>
  );
}

