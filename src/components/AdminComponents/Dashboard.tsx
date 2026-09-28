'use client';

import React, { useEffect, useRef } from 'react';
import Chart from "chart.js/auto";

// Icon Components
const ProductIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
    />
  </svg>
);

const OrdersIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h11.25c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
    />
  </svg>
);

const ReviewIcon = ({ className = 'w-5 h-5' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className={className}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5z"
    />
  </svg>
);

interface DailyRevenue {
  date: string;
  dateLabel: string;
  total: number;
  orderCount: number;
}

interface TopCategory {
  categoryId: string;
  categoryName: string;
  itemCount: number;
}

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalReviews: number;
  totalRevenue: number;
  formattedRevenue: string;
  dailyRevenue: DailyRevenue[];
  topCategories: TopCategory[];
}

interface DashboardProps {
  isDarkTheme: boolean;
  stats: DashboardStats;
}

export default function Dashboard({ isDarkTheme, stats }: DashboardProps) {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  const pieChartRef = useRef<HTMLCanvasElement>(null);
  const pieChartInstanceRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current || !stats.dailyRevenue) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    const ctx = chartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare data for chart
    const labels = stats.dailyRevenue.map(day => day.dateLabel);
    const revenueData = stats.dailyRevenue.map(day => day.total);
    const orderCounts = stats.dailyRevenue.map(day => day.orderCount);

    // Format revenue for display
    const currencyFormatter = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Daily Revenue (₹)',
            data: revenueData,
            borderColor: 'rgb(236, 72, 153)', // rose-500
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            borderWidth: 2,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: 'rgb(236, 72, 153)',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
                weight: 'normal',
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function(context) {
                const index = context.dataIndex;
                const revenue = context.parsed.y || 0;
                const orders = orderCounts[index] || 0;
                return [
                  `Revenue: ${currencyFormatter.format(revenue)}`,
                  `Orders: ${orders}`,
                ];
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                if (typeof value === 'number') {
                  return '₹' + value.toLocaleString('en-IN');
                }
                return '₹0';
              },
              font: {
                size: 11,
              },
            },
            grid: {
              color: isDarkTheme ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
            },
          },
          x: {
            ticks: {
              font: {
                size: 11,
              },
            },
            grid: {
              display: false,
            },
          },
        },
      },
    });

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [stats.dailyRevenue, isDarkTheme]);

  // Pie chart for top categories
  useEffect(() => {
    if (!pieChartRef.current || !stats.topCategories || stats.topCategories.length === 0) return;

    // Destroy existing chart if it exists
    if (pieChartInstanceRef.current) {
      pieChartInstanceRef.current.destroy();
    }

    const ctx = pieChartRef.current.getContext('2d');
    if (!ctx) return;

    // Prepare data for pie chart
    const labels = stats.topCategories.map(cat => cat.categoryName);
    const data = stats.topCategories.map(cat => cat.itemCount);

    // Chart.js colors - rose, pink, purple shades
    const colors = [
      'rgb(236, 72, 153)',   // rose-500
      'rgb(219, 39, 119)',   // rose-600
      'rgb(190, 24, 93)',    // rose-700
    ];
    const backgroundColor = colors.slice(0, stats.topCategories.length);
    const borderColor = backgroundColor;

    pieChartInstanceRef.current = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Order Items',
            data: data,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
                weight: 'normal',
              },
            },
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: {
              size: 14,
              weight: 'bold',
            },
            bodyFont: {
              size: 13,
            },
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${value} items (${percentage}%)`;
              },
            },
          },
        },
      },
    });

    // Cleanup function
    return () => {
      if (pieChartInstanceRef.current) {
        pieChartInstanceRef.current.destroy();
      }
    };
  }, [stats.topCategories, isDarkTheme]);

  return (
    <div className="p-6">
      <h1 className={`text-3xl font-bold mb-6 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Dashboard Cards */}
        <div className={`${isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <ProductIcon className={`w-6 h-6 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Total Products</p>
              <p className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalProducts.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className={`${isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <OrdersIcon className={`w-6 h-6 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Total Orders</p>
              <p className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalOrders.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className={`${isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <ReviewIcon className={`w-6 h-6 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`} />
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Total Reviews</p>
              <p className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalReviews.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        <div className={`${isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'} rounded-lg shadow p-6`}>
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${isDarkTheme ? 'bg-gray-700' : 'bg-gray-100'}`}>
              <svg className={`w-6 h-6 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-gray-400' : 'text-gray-600'}`}>Revenue</p>
              <p className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                {stats.formattedRevenue}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Revenue Chart */}
      <div className="mt-8">
        <h2 className={`text-xl font-semibold mb-4 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
          Revenue Trend (Last 7 Days)
        </h2>
        <div className={`${isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'} rounded-lg shadow overflow-hidden p-6`}>
          <div className="h-[400px] relative">
            <canvas ref={chartRef} />
          </div>
        </div>
      </div>

      {/* Top Categories Pie Chart */}
      {stats.topCategories && stats.topCategories.length > 0 && (
        <div className="mt-8">
          <h2 className={`text-xl font-semibold mb-4 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
            Top Categories by Order Items
          </h2>
          <div className={`${isDarkTheme ? 'bg-black border border-gray-700' : 'bg-white'} rounded-lg shadow overflow-hidden p-6`}>
            <div className="h-[400px] relative max-w-md mx-auto">
              <canvas ref={pieChartRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

