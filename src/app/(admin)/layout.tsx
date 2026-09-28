"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { checkAdminAuth } from "./login/actions";
import AdminSidebar from "@/components/AdminComponents/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mainScrollRef.current?.scrollTo(0, 0);
  }, [pathname]);

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      // Don't check auth on login page
      if (pathname?.includes("/login")) {
        setIsLoading(false);
        return;
      }
      
      try {
        const authResult = await checkAdminAuth();
        if (authResult.authenticated) {
          setIsAuthenticated(true);
        } else if ("authError" in authResult && authResult.authError) {
          router.push("/");
          return;
        } else {
          router.push("/login");
          return;
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        router.push("/");
        return;
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router, pathname]);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("adminTheme");
    if (savedTheme === "dark") {
      setIsDarkTheme(true);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    // Store theme preference in localStorage
    localStorage.setItem("adminTheme", !isDarkTheme ? "dark" : "light");
    // Apply theme to html element
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      if (!isDarkTheme) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  };

  // Apply theme to html on mount
  useEffect(() => {
    if (typeof document !== "undefined") {
      const html = document.documentElement;
      if (isDarkTheme) {
        html.classList.add("dark");
      } else {
        html.classList.remove("dark");
      }
    }
  }, [isDarkTheme]);

  // Show loading while checking authentication (skip for login page)
  if (pathname?.includes("/login")) {
    return <>{children}</>;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated && !pathname?.includes("/login")) {
    return null; // Will redirect in useEffect
  }

  return (
    <div
      className={`h-screen flex overflow-hidden ${
        isDarkTheme ? "bg-black text-white" : "bg-gray-50 text-gray-900"
      }`}
      data-theme={isDarkTheme ? "dark" : "light"}
    >
      <AdminSidebar isDarkTheme={isDarkTheme} onThemeToggle={toggleTheme} />
      
      {/* Main Content */}
      <div ref={mainScrollRef} className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}


