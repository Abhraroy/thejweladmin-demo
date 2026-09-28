"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight, LogOut, Moon, Sun } from "lucide-react";
import { adminLogout } from "@/app/(admin)/login/actions";
import {
  adminNavItems,
  isNavGroup,
  type NavGroup,
  type NavItem,
  type NavLink,
} from "./adminNavConfig";

interface AdminSidebarProps {
  isDarkTheme: boolean;
  onThemeToggle: () => void;
}

function getGroupChildHrefs(group: NavGroup): string[] {
  return group.children
    .filter((child) => !child.disabled && child.href)
    .map((child) => child.href as string);
}

function isGroupActive(group: NavGroup, pathname: string | null): boolean {
  return getGroupChildHrefs(group).some((href) => isActiveHref(href, pathname));
}

function isActiveHref(href: string, pathname: string | null): boolean {
  if (href === "/dashboard") {
    return pathname === "/" || pathname === "/dashboard";
  }
  return pathname === href || Boolean(pathname?.startsWith(href + "/"));
}

export default function AdminSidebar({ isDarkTheme, onThemeToggle }: AdminSidebarProps) {
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const autoExpanded = new Set<string>();
    adminNavItems.forEach((item) => {
      if (isNavGroup(item) && isGroupActive(item, pathname)) {
        autoExpanded.add(item.id);
      }
    });
    setExpandedGroups((prev) => new Set([...prev, ...autoExpanded]));
  }, [pathname]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const handleLogout = async () => {
    try {
      const result = await adminLogout();
      if (result.success) {
        window.location.href = "/login";
      } else {
        console.error("Logout error:", result.error);
        window.location.href = "/login";
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/login";
    }
  };

  const iconSlot = (Icon?: NavLink["icon"]) => (
    <span className="flex w-5 h-5 shrink-0 items-center justify-center mr-3">
      {Icon ? <Icon className="w-5 h-5" /> : null}
    </span>
  );

  const rowBase = "w-full flex items-center px-4 py-3 rounded-lg transition-colors";

  const activeClasses = isDarkTheme
    ? "bg-gray-700 text-white"
    : "bg-black text-white";

  const inactiveClasses = isDarkTheme
    ? "text-white hover:bg-gray-800 cursor-pointer"
    : "text-gray-700 hover:bg-gray-900 hover:text-white cursor-pointer";

  const disabledClasses = isDarkTheme
    ? "text-gray-500 opacity-50 cursor-not-allowed"
    : "text-gray-400 opacity-50 cursor-not-allowed";

  const groupParentActiveClasses = isDarkTheme
    ? "bg-gray-800 text-white"
    : "bg-gray-100 text-gray-900";

  const renderNavLink = (item: NavLink, indented = false) => {
    const isDisabled = item.disabled || !item.href;
    const active = !isDisabled && item.href ? isActiveHref(item.href, pathname) : false;

    if (isDisabled) {
      return (
        <span
          className={`${rowBase} ${disabledClasses} ${indented ? "pl-11" : ""}`}
          aria-disabled="true"
        >
          {iconSlot(item.icon)}
          <span className="font-bold font-open-sans flex-1">{item.label}</span>
          <span className="text-xs font-open-sans opacity-70">Soon</span>
        </span>
      );
    }

    return (
      <Link
        href={item.href!}
        className={`${rowBase} ${indented ? "pl-11" : ""} ${
          active ? activeClasses : inactiveClasses
        }`}
      >
        {iconSlot(item.icon)}
        <span className="font-bold font-open-sans">{item.label}</span>
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    const isExpanded = expandedGroups.has(group.id);
    const hasActiveChild = isGroupActive(group, pathname);
    const isDisabled = group.disabled;

    return (
      <li key={group.id}>
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className={`${rowBase} ${
            isDisabled
              ? disabledClasses
              : hasActiveChild
                ? groupParentActiveClasses
                : inactiveClasses
          }`}
        >
          {iconSlot(group.icon)}
          <span className="font-bold font-open-sans flex-1 text-left">{group.label}</span>
          {isDisabled && <span className="text-xs font-open-sans opacity-70 mr-2">Soon</span>}
          {isExpanded ? (
            <ChevronDown className="w-6 h-6 shrink-0 opacity-100" />
          ) : (
            <ChevronRight className="w-6 h-6 shrink-0 opacity-100" />
          )}
        </button>

        {isExpanded && (
          <ul className="mt-1 space-y-1">
            {group.children.length > 0 ? (
              group.children.map((child) => (
                <li key={child.id}>{renderNavLink(child, true)}</li>
              ))
            ) : (
              <li>
                <span
                  className={`block px-4 py-2 pl-11 text-sm ${
                    isDarkTheme ? "text-gray-500" : "text-gray-400"
                  }`}
                >
                  Sub-sections coming soon
                </span>
              </li>
            )}
          </ul>
        )}
      </li>
    );
  };

  const renderNavItem = (item: NavItem) => {
    if (isNavGroup(item)) {
      return renderNavGroup(item);
    }
    return <li key={item.id}>{renderNavLink(item)}</li>;
  };

  return (
    <div
      className={`w-64 ${
        isDarkTheme ? "bg-black border-gray-700" : "bg-white border-gray-200"
      } border-r flex flex-col`}
    >
      <div
        className={`p-6 border-b ${
          isDarkTheme ? "border-gray-700" : "border-gray-200"
        }`}
      >
        <h1 className="text-2xl font-bold text-[#E94E8B]">JWEL Admin</h1>
      </div>

      <nav className="flex-1 px-4 py-6 overflow-y-auto">
        <ul className="space-y-2">{adminNavItems.map(renderNavItem)}</ul>
      </nav>

      <div
        className={`p-4 border-t ${
          isDarkTheme ? "border-gray-700" : "border-gray-200"
        } space-y-2`}
      >
        <button
          type="button"
          onClick={onThemeToggle}
          className={`${rowBase} ${inactiveClasses}`}
        >
          <span className="flex w-5 h-5 shrink-0 items-center justify-center mr-3">
            {isDarkTheme ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </span>
          <span className="font-medium">{isDarkTheme ? "Light Mode" : "Dark Mode"}</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          className={`${rowBase} ${inactiveClasses}`}
        >
          <span className="flex w-5 h-5 shrink-0 items-center justify-center mr-3">
            <LogOut className="w-5 h-5" />
          </span>
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
