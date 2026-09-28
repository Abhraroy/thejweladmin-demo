# 💎 THE JWEL — Admin Dashboard & Operational Command Center

> **Centralized enterprise administration suite for THE JWEL jewellery e-commerce platform.**  
> Powers real-time catalog curation, multi-tier taxonomy, live inventory control, order fulfillment automation, logistics dispatch via RapidShyp, SMS alerting via Twilio, promotional marketing, and customer relationship management.

---

## 🏗️ Architecture Overview

THE JWEL is architected as a decoupled, multi-repository e-commerce system. The **Admin Dashboard** operates as the central management control plane, while the **Customer Storefront** delivers a high-performance customer shopping experience. Both applications interact through a shared Supabase PostgreSQL backend, Cloudflare R2 object storage, and third-party logistics/communications services.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    THE JWEL ECOSYSTEM                                  │
└────────────────────────────────────────────────────────────────────────────────────────┘

     🛒 CUSTOMER STOREFRONT                          💎 ADMIN DASHBOARD
  (Next.js App Router • Public)             (Next.js 16 App Router • Private Admin)
   • Product Browsing & Search               • Catalog & Product CRUD Management
   • Cart & Wishlist Management              • Real-Time Stock Balance & Restores
   • Razorpay Checkout & COD Orders          • Order Processing & Fulfillment
   • Customer Profile & Order History        • RapidShyp Courier Dispatch & Tracking
   • Review Submissions & Ratings            • Promo Banners, Website Assets & Coupons
                 │                                               │
                 │              SHARED CLOUD BACKEND             │
                 └───────────────────────┬───────────────────────┘
                                         │
                                         ▼
                     ┌───────────────────────────────────────┐
                     │          SUPABASE POSTGRESQL          │
                     │  • Auth & Admin Metadata Validation   │
                     │  • Relational Schema (Products/Orders)│
                     │  • Database Triggers & Webhooks       │
                     └───────┬───────────────────────┬───────┘
                             │                       │
           ┌─────────────────┴─────────┐   ┌─────────┴─────────────────┐
           ▼                           ▼   ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│    CLOUDFLARE R2    │     │   RAPIDSHYP API     │     │     TWILIO SMS      │
│ S3-Compatible Media │     │ Automated Logistics │     │ Immediate Merchant  │
│ Global CDN Delivery │     │ AWB & Courier Sync  │     │ Order Notifications │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
```

---

## 🎯 Purpose

Operating a luxury jewellery e-commerce brand requires precision in stock tracking, rapid order turnaround, high-resolution visual merchandising, and flexible promotional control.

The **THE JWEL Admin Dashboard** solves these challenges by providing:
1. **Single Source of Operational Truth**: Instant access to storewide revenue figures, order volumes, inventory levels, and customer records.
2. **End-to-End Order Lifecycle Automation**: Seamless transitions from order placement to Cash on Delivery (COD) verification, automated RapidShyp logistics booking, and cancellation stock restoration.
3. **Loss Prevention & Inventory Integrity**: Safe inventory management where cancelled or deleted orders automatically restore product stock balances.
4. **Rich Digital Merchandising**: Independent control over promotional tickers, hero banners, curated collections, styles, and occasions without requiring code redeployments.
5. **Security & Role Enforcement**: Multi-layer authentication combining Supabase Auth with server-verified admin access keys and administrative metadata claims.

---

## ✨ Features

The application is modularized into specialized management suites tailored for daily retail operations:

### 📈 1. Operational Dashboard & Analytics
Located at `/dashboard`, the analytics dashboard gives store owners an immediate pulse on commercial performance:
- **Core KPI Metrics Cards**:
  - **Total Revenue**: Aggregate monetary volume formatted in Indian Rupees (`INR`), calculated across all confirmed transactions.
  - **Total Orders**: Complete order count tracking commercial velocity.
  - **Total Products**: Live catalog item count across all categories.
  - **Customer Reviews**: Total community feedback and testimonials received.
- **7-Day Revenue Trend Chart**: Dynamic multi-day breakdown visualizing daily revenue volume and corresponding order counts.
- **Top Categories Breakdown**: Real-time sales ranking identifying top three product categories by ordered item volume.

---

### 📦 2. Catalog & Product Management
Located at `/products` and `/[product_id]`, providing an advanced catalog workstation:
- **Deterministic Product Grid**: Stable, paginated catalog view ordered deterministically by SKU and creation date to eliminate UI jumping during batch edits.
- **Comprehensive Product Attributes**:
  - **Identification**: SKU (Stock Keeping Unit), Product Name, and rich markdown descriptions.
  - **Pricing Architecture**: Base Price, Discount Percentage, and auto-computed Final Price.
  - **Specifications**: Metal type (Gold, Silver, Platinum, Brass/Alloy) and Weight in grams.
  - **Variations & Taxonomy**: Dynamic array of available ring/chain sizes, search tags, designated Style (`style_id`), and Occasion (`occasion_id`).
  - **Curated Collections**: Multi-select assignment linking products to multiple promotional collections via the `product_collections` relational junction table.
  - **Visibility Controls**: `listed_status` (public vs. archived) and `home_visibility` (flag to feature prominently on the storefront homepage).
- **Digital Asset Management**:
  - Direct integration with **Cloudflare R2** via AWS SigV4 signed requests.
  - Primary thumbnail image with automated replacement cleanup (deletes obsolete objects from R2 storage when updated).
  - Secondary product gallery images managed in the `product_images` table with individual deletion controls.
- **Cascaded Product Removal**: Product deletion automatically purges linked database records (`product_images`, `product_collections`) and deletes associated images from Cloudflare R2.

---

### 📊 3. Inventory Management & Stock Adjustment
Located within the product catalog and order processing workflows:
- **Live Stock Tracking**: Every product maintains an explicit `stock_quantity` balance.
- **Automatic Stock Decrement**: Storefront order placements automatically deduct corresponding unit quantities.
- **Automated Stock Restoration (`restoreStockForOrderItems`)**: When an order is deleted or cancelled from the admin panel, the system automatically aggregates quantities per SKU and increments the available product stock back into inventory.
- **Direct Stock Calibration**: Merchants can edit stock numbers instantly from the product edit panel to account for offline showroom purchases or new stock arrivals.

---

### 🏷️ 4. Taxonomy & Attribute Hierarchies
Full control over the navigation hierarchy and product discovery facets:
- **Categories & Subcategories** (`/categories`):
  - Primary categories with unique URL slugs, descriptive text, and Cloudflare R2 banner images.
  - Nested sub-categories linked via foreign key relations with independent images and active toggles.
- **Styles Management** (`/styles`):
  - Curate design aesthetics (e.g., *American Diamond*, *Temple Jewellery*, *Minimalist*, *Kundan*).
  - Configurable slug generation, banner media, and live status.
- **Occasions Management** (`/occasions`):
  - Curate shopping contexts (e.g., *Bridal / Wedding*, *Everyday Wear*, *Party Wear*, *Festive*).
  - Configurable slug generation, banner media, and live status.
- **Collections Management** (`/collection`):
  - Create themed seasonal campaigns (e.g., *Diwali Sparkle*, *Summer Solstice*).
  - Interactive multi-product assignment selector allowing bulk linking/unlinking of products to collections.

---

### 🛒 5. Order Management & Fulfillment Automation
Located at `/orders`, offering an order processing pipeline:
- **Comprehensive Order Ledger**: Real-time view of customer orders, displaying order IDs, generated order numbers (e.g., `COD-XXXX` or standard), order timestamps formatted in Indian Standard Time (`IST`), customer contact, shipping destination, line items, and pricing summaries.
- **Order Status Lifecycle**:
  - Supported stages: `pending` ➔ `processing` ➔ `shipped` ➔ `delivered` ➔ `cancelled` ➔ `returned`.
  - Automatic timestamp logging: transitioning to `shipped` automatically captures `shipped_date`; transitioning to `delivered` captures `delivered_date`.
- **Payment Status Tracking**: Monitor payment states across `pending(cod)`, `pending`, and `confirm`.
- **Cash on Delivery (COD) Approval Workflow**:
  - Dedicated one-click verification for pending COD orders (`approveCodOrder`).
  - Automatically advances order status to `processing`, confirms payment status, and schedules shipment.
- **RapidShyp Logistics Integration**:
  - Automatic courier order creation (`createRapidShypOrderForOrder`).
  - Parses multi-segment Indian address lines, house numbers, landmarks, and pin codes.
  - Automatically passes weight and dimension parameters to generate airway bills (AWB) and schedule pickup.
- **Order Security & Locking**:
  - `toggleLockOrder` action enables administrators to lock finalized orders to prevent accidental changes or modifications.
- **Order Deletion Safety**:
  - Safely deletes order records while triggering automatic inventory restoration for all contained line items.

---

### 🔔 6. Real-Time SMS Dispatch & Order Notifications
Located at `/api/order-notification` and `src/app/twilio-sms.ts`:
- **Database Webhook Trigger**: Supabase triggers a POST request to the admin notification endpoint upon new order insertion.
- **Twilio SMS Gateway**: Formats an order summary containing:
  - Order Number / Order ID
  - Total Order Amount (in INR)
  - Item List with Quantities
  - Customer Phone Number
  - Formatted Shipping Destination
  - Order Timestamp in IST
- **Immediate Merchant Alert**: Automatically sends an SMS to the business operations phone (`PHONE_NUMBER_TO_NOTIFY`) to ensure instant awareness of incoming purchases.

---

### 👥 7. Customer Relationship Directory
Located at `/customer-list`:
- **Paginated Customer Directory**: View registered customer profiles with customizable page sizes (10 to 50 records per page).
- **Customer Identity**: Displays user ID, customer full name, verified email, telephone number, and registration date.
- **Address Book Integration**: Inspect all saved shipping and billing addresses (`addresses` table) associated with each customer, highlighting default addresses, street details, landmark, city, state, and postal code.

---

### 🎟️ 8. Marketing, Coupons & Storefront Assets
- **Coupons Engine** (`/coupons`):
  - Create promotional coupon codes with strict validation.
  - Support for `percentage` discounts (with optional maximum discount caps) or `fixed` currency amounts.
  - Cart qualification rules: minimum purchase amount threshold.
  - Redemption control: maximum usage limits vs. live usage counts.
  - Schedule validity windows with automatic expiry detection based on IST calendar days (`isPastIstCalendarDay`).
  - Instant active/inactive kill-switch to pause promotions immediately.
- **Website Assets & Banners** (`/website-assets`, `/resources`):
  - Visual banner resource manager mapped to storefront layout slots (`homepage_hero`, `homepage_image_gallery`, etc.).
  - Upload banner creatives to Cloudflare R2 and configure custom click-through redirect routes.
  - Promotional ticker manager (`promo_content` table) controlling announcement banners and share link messaging across the storefront header.

---

### ⭐ 9. Customer Reviews Moderation
Located at `/reviews`:
- Unified moderation feed of user-submitted product feedback.
- Inspect star ratings (1–5), reviewer identity, product reference, written feedback, and user-uploaded review photos.

---

### 🔐 10. Authentication & Security Model
- **Dual-Factor Validation**:
  - Requires valid Supabase Auth credentials (Email + Password).
  - Enforces a private server-side security passphrase (`ADMIN_SECRET_KEY`).
  - Verifies administrative privileges via user metadata (`user_metadata.TYPE === 'ADMIN'`).
- **Admin Self-Provisioning**: Authorized administrators holding the master `ADMIN_SECRET_KEY` can create additional admin accounts directly through the login interface via `createAdmin`.
- **Session Continuity**: Leverages `@supabase/ssr` with secure HTTP-only cookies, handled through Next.js proxy middleware for session refresh.
- **Privileged Backend Execution**: Server actions leverage the Supabase Service Role key (`SUPABASE_SECRET_KEY`) strictly on the server side to bypass Row Level Security (RLS) safely while isolating credentials from the browser.
- **Direct S3 SigV4 Uploads**: Cloudflare R2 image operations are executed server-side via AWS Signature Version 4 HMAC calculations, eliminating the need to expose bucket secrets to the browser.

---

## 🔄 Admin ↔ Storefront Relationship

The Admin Dashboard and Customer Storefront function as two specialized lenses over the same operational data:

```text
 ┌─────────────────────────────────────────────────────────────┐
 │                     ADMIN DASHBOARD                         │
 │                                                             │
 │  • Uploads product photos & sets pricing                    │
 │  • Updates stock quantities & creates discount coupons      │
 │  • Configures homepage banners & promotional ticker text     │
 │  • Approves COD orders & triggers RapidShyp dispatch        │
 └──────────────────────────────┬──────────────────────────────┘
                                │
                                │ Writes & Manages
                                ▼
 ┌─────────────────────────────────────────────────────────────┐
 │               SUPABASE POSTGRESQL & CLOUDFLARE R2           │
 │                                                             │
 │  • Tables: products, categories, orders, coupons, etc.      │
 │  • CDN: https://pub-xxx.r2.dev/products/...                 │
 │  • Webhook: POST /api/order-notification on new order       │
 └──────────────────────────────┬──────────────────────────────┘
                                ▲
                                │ Reads & Submits
                                │
 ┌──────────────────────────────┴──────────────────────────────┐
 │                    CUSTOMER STOREFRONT                      │
 │                                                             │
 │  • Displays active products, categories, styles & occasions │
 │  • Validates and applies coupons during checkout            │
 │  • Renders dynamic hero banners & promotional copy          │
 │  • Places prepaid/COD orders & decrements stock balances    │
 └─────────────────────────────────────────────────────────────┘
```

### Data Synchronization Flow
1. **Catalog Updates**: When an admin creates or edits a product, category, or banner in the admin dashboard, server actions call Next.js `revalidatePath()`. The storefront reads directly from the shared Supabase database, displaying updates immediately.
2. **Order Placement**: When a customer completes checkout on the storefront:
   - A new row is inserted into `orders` and line items into `order_items`.
   - Inventory is decremented for ordered products.
   - Supabase fires a database webhook to the admin `/api/order-notification` route.
   - Twilio dispatches an immediate SMS alert to the store administrator.
3. **Fulfillment**: The admin reviews the order in the Admin Dashboard, clicks **Approve** (for COD orders), which updates the status to `processing` and pushes shipment metadata directly to **RapidShyp** to book courier dispatch.
4. **Order Cancellation**: If an order is cancelled or deleted in the admin interface, the `restoreStockForOrderItems` routine recalculates ordered quantities and automatically restores product inventory in the database.

---

## 💻 Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | React Server Components, Server Actions & API Routes |
| **Runtime / Library** | [React 19](https://react.dev/) | Modern concurrent UI architecture |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (v6) | Strict type-safety across schemas and actions |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) | Modern utility-first CSS styling with `@tailwindcss/postcss` |
| **Database & Auth** | [Supabase](https://supabase.com/) (`@supabase/ssr`, `@supabase/supabase-js`) | PostgreSQL database, Auth service, and Service-Role execution |
| **Object Storage** | [Cloudflare R2](https://www.cloudflare.com/products/r2/) (AWS SigV4) | S3-compatible cloud object storage with public CDN URLs |
| **Logistics Integration** | [RapidShyp API](https://www.rapidshyp.com/) | Automated courier booking, label generation, and address parsing |
| **Communications** | [Twilio](https://www.twilio.com/) | Real-time SMS notifications for incoming orders |
| **State Management** | [Zustand](https://github.com/pmndrs/zustand) (v5) | Lightweight admin modal and client-side UI state management |
| **Data Visualization** | [Chart.js](https://www.chartjs.org/) | Interactive 7-day revenue trend charts |
| **Iconography** | [Lucide React](https://lucide.dev/) & [React Icons](https://react-icons.github.io/react-icons/) | Crisp administrative UI icons |
| **Notifications** | [React-Toastify](https://fkhadra.github.io/react-toastify/) | Interactive toast notifications for CRUD feedback |
| **Package Manager** | `pnpm` (v10.28+) | High-efficiency dependency management |

---

## 📁 Repository Directory Structure

```text
TheJwel-admin-master/
├── public/                       # Static public assets (logos, icons)
│   └── logo/
│       └── cropped-logo.svg      # THE JWEL brand emblem
├── src/
│   ├── app/                      # Next.js App Router root
│   │   ├── (admin)/              # Authenticated administration route group
│   │   │   ├── [product_id]/     # Product detail editing view
│   │   │   │   ├── action.ts     # Product fetch actions
│   │   │   │   └── page.tsx      # Edit product page
│   │   │   ├── actions/          # Reusable server actions (Product, Order, Category, etc.)
│   │   │   │   ├── Product.ts    # Product CRUD, R2 upload & collection sync
│   │   │   │   ├── categories.ts # Category & subcategory CRUD
│   │   │   │   ├── coupons.ts    # Coupon lifecycle & IST expiry checking
│   │   │   │   ├── occasions.ts  # Occasions taxonomy CRUD
│   │   │   │   ├── order.ts      # Status updates, COD approval, stock restore
│   │   │   │   ├── promocontent.ts # Storefront ticker copy actions
│   │   │   │   ├── resources.ts  # Homepage banner resource management
│   │   │   │   ├── styles.ts     # Style taxonomy CRUD
│   │   │   │   └── utils.ts      # R2 key extraction utilities
│   │   │   ├── api/
│   │   │   │   └── uploadImage/  # Cloudflare R2 image upload endpoint
│   │   │   ├── categories/       # Category management workspace
│   │   │   ├── collection/       # Curated collection management workspace
│   │   │   ├── coupons/          # Marketing coupon codes manager
│   │   │   ├── customer-list/    # Paginated customer directory
│   │   │   ├── dashboard/        # Operational revenue & metrics dashboard
│   │   │   ├── login/            # Admin authentication & provisioning portal
│   │   │   ├── occasions/        # Occasions attribute manager
│   │   │   ├── orders/           # Order processing & fulfillment ledger
│   │   │   ├── products/         # Main product catalog listing
│   │   │   ├── resources/        # Asset repository & creative viewer
│   │   │   ├── reviews/          # Customer reviews moderation panel
│   │   │   ├── styles/           # Styles attribute manager
│   │   │   ├── website-assets/   # Hero banners & promotional creative manager
│   │   │   └── layout.tsx        # Persistent Admin layout (Auth guard, Sidebar, Theme)
│   │   ├── api/
│   │   │   └── order-notification/ # Supabase database webhook for SMS notification
│   │   ├── globals.css           # Global Tailwind CSS styling & custom scrollbars
│   │   ├── layout.tsx            # Root HTML & metadata layout
│   │   ├── page.tsx              # Root landing redirect to /login
│   │   ├── twilio-sms.ts         # Twilio client configuration and SMS dispatcher
│   │   └── utils/                # Administrative utilities
│   │       ├── cloudflare.ts     # AWS SigV4 client for Cloudflare R2 storage
│   │       ├── rapidShyp.ts      # RapidShyp shipment creation & address parsing
│   │       └── stockAdjustment.ts# Automated inventory increment/decrement logic
│   ├── components/
│   │   └── AdminComponents/      # Domain-specific administration components
│   │       ├── AdminSidebar.tsx  # Dynamic sidebar with expandable navigation groups
│   │       ├── Dashboard.tsx     # KPI cards, revenue charts, and category metrics
│   │       ├── adminNavConfig.ts # Centralized navigation definitions & routing
│   │       ├── category/         # Category modals, lists, and forms
│   │       ├── order/            # Orders table, status changers, and detail views
│   │       ├── product/          # Product catalogue tables and detail panels
│   │       ├── review/           # Review cards and rating components
│   │       ├── style-occasion/   # Shared style/occasion CRUD card components
│   │       └── website-assets/   # Media uploaders and banner configuration panels
│   ├── lib/
│   │   ├── admin-config.ts       # Master admin key configuration
│   │   ├── datetime.ts           # Indian Standard Time (IST) formatting helpers
│   │   ├── supabase-Utils/       # Supabase client factories
│   │   │   ├── admin.ts          # Privileged Service-Role Supabase client
│   │   │   ├── client.ts         # Browser-side Supabase client
│   │   │   ├── middleware.ts     # SSR cookie session synchronization
│   │   │   └── server.ts         # Server-side Supabase client with cookie store
│   │   └── utils.ts              # Classname and generic helpers
│   ├── schema/
│   │   └── schema.md             # Canonical PostgreSQL relational schema reference
│   ├── types/
│   │   └── TypeInterface.ts      # Global TypeScript models (Order, Product, User, etc.)
│   └── zustandStore/
│       └── AdminZustandStore.ts  # Client state for modals, drawers, and form buffers
├── .env                          # Environment variables template
├── components.json               # UI component configuration
├── next.config.ts                # Next.js runtime configuration (remote image domains)
├── package.json                  # Dependencies, scripts, and engine specifications
├── proxy.ts                      # Edge proxy configuration for Supabase session sync
└── tsconfig.json                 # TypeScript compiler options
```

---

## ⚙️ Environment Variables Configuration

Create a `.env.local` file in the root of the project by copying the template below. Ensure all credentials are fully configured for your environment:

```bash
# ==============================================================================
# THE JWEL ADMIN DASHBOARD — ENVIRONMENT CONFIGURATION
# ==============================================================================

# ------------------------------------------------------------------------------
# 1. SUPABASE (Required)
# ------------------------------------------------------------------------------
# Public Supabase URL (e.g. https://<project-ref>.supabase.co)
NEXT_PUBLIC_SUPABASE_URL="https://vjftybofrfehfoqcwdyv.supabase.co"

# Supabase Anonymous Publishable Key (safe for browser exposure)
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-supabase-publishable-key"

# Supabase Service Role Secret Key (SERVER-ONLY — NEVER EXPOSE TO CLIENT)
# Bypasses Row Level Security (RLS) for administrative server actions
SUPABASE_SECRET_KEY="your-supabase-service-role-key"

# ------------------------------------------------------------------------------
# 2. ADMIN AUTHENTICATION
# ------------------------------------------------------------------------------
# Master secret passphrase required to log into the admin dashboard
# and authorize the creation of new administrator accounts
ADMIN_SECRET_KEY="jwel-admin-secret-key-2024"

# ------------------------------------------------------------------------------
# 3. CLOUDFLARE R2 (S3-Compatible Media Storage)
# ------------------------------------------------------------------------------
# Cloudflare R2 Access Key ID
CLOUDFLARE_R2_ACCESS_KEY_ID="your-r2-access-key-id"

# Cloudflare R2 Secret Access Key
CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"

# Cloudflare R2 S3 Endpoint URL (e.g. https://<account_id>.r2.cloudflarestorage.com)
CLOUDFLARE_R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"

# Cloudflare R2 Bucket Name
CLOUDFLARE_R2_BUCKET_NAME="thejwel"

# Cloudflare R2 Public CDN Base URL (without trailing slash)
# Clean public CDN URL used to store stable image links in Supabase
CLOUDFLARE_R2_PUBLIC_URL="https://pub-38dda6db579b4f96ae558be94b4b1ac1.r2.dev"

# ------------------------------------------------------------------------------
# 4. RAPIDSHYP LOGISTICS & FULFILLMENT
# ------------------------------------------------------------------------------
# RapidShyp API Authentication Token
RAPIDSHYP_API_KEY="your-rapidshyp-api-token"

# Registered pickup location nickname in RapidShyp dashboard
RAPIDSHYP_PICKUP_ADDRESS_NAME="Primary Warehouse"

# Registered store display name in RapidShyp
RAPIDSHYP_STORE_NAME="The Jwel"

# Default parcel dimensions (in cm) and package weight (in grams)
RAPIDSHYP_PACKAGE_LENGTH="10"
RAPIDSHYP_PACKAGE_BREADTH="10"
RAPIDSHYP_PACKAGE_HEIGHT="5"
RAPIDSHYP_DEFAULT_PACKAGE_WEIGHT="200"

# ------------------------------------------------------------------------------
# 5. TWILIO (SMS Order Notifications)
# ------------------------------------------------------------------------------
# Twilio Account SID
TWILIO_ACCOUNT_SID="your-twilio-account-sid"

# Twilio Auth Token
TWILIO_AUTH_TOKEN="your-twilio-auth-token"

# Merchant phone number to receive immediate SMS notifications on new orders
PHONE_NUMBER_TO_NOTIFY="+919XXXXXXXXX"

# ------------------------------------------------------------------------------
# 6. SITE & BRAND CONFIGURATION
# ------------------------------------------------------------------------------
NEXT_PUBLIC_SITE_NAME="The Jwel"
NEXT_PUBLIC_SITE_URL="http://localhost:3000"
SITE_URL="http://localhost:3000"
```

---

## 🚀 Getting Started

Follow these step-by-step instructions to set up, run, and develop the admin dashboard locally:

### 1. Prerequisites
- **Node.js**: Version `20.x` or higher installed.
- **pnpm**: Fast, disk-space-efficient package manager (version `10.28+` recommended).
  ```bash
  npm install -g pnpm
  ```

### 2. Install Dependencies
Clone the repository and install all required packages using `pnpm`:
```bash
git clone <repository-url>
cd TheJwel-admin-master
pnpm install
```

### 3. Setup Environment Variables
Duplicate the environment template into `.env.local`:
```bash
cp .env .env.local
```
Update all Supabase, Cloudflare R2, RapidShyp, and Twilio credentials with your real keys.

### 4. Launch the Development Server
Run the local Next.js development server:
```bash
pnpm dev
```
> **Note**: The dev script executes with `--max-http-header-size=65536` to ensure robust handling of large authentication cookies and chunked SSR payloads.

Navigate to `http://localhost:3000` in your web browser. You will be redirected to the `/login` portal.

### 5. Production Build & Verification
To test production optimization, compile and test the bundle locally:
```bash
# Build production bundle
pnpm build

# Start production server
pnpm start
```

---

## 🔑 First-Time Administrator Setup

When spinning up a new development or production instance, an administrator account must be provisioned:

1. Launch the admin dashboard and open the `/login` page.
2. Select the **Create Admin** toggle on the login card.
3. Fill in:
   - **Email Address**: Your administrative email (e.g., `admin@thejwel.com`).
   - **Password**: A strong administrative password.
   - **Admin Secret Key**: Enter the secret key matching `ADMIN_SECRET_KEY` in your `.env.local` file (default: `jwel-admin-secret-key-2024`).
4. Click **Create Admin Account**. The system will register the user in Supabase Auth and inject `{ TYPE: "ADMIN" }` into the user's metadata claims.
5. Switch back to the **Login** tab, enter your email, password, and the admin key to access the command center.

---

## 📦 Operational Workflows & Business Guides

### 🔄 Order Fulfillment Workflow

```text
  Customer Places Order (Storefront)
               │
               ▼
  Supabase Database Insert (orders table)
               │
               ├────────────────────────────────────────┐
               ▼                                        ▼
   Stock Decremented Automatically            Webhook Triggers SMS Alert
   (stockAdjustment.ts)                       (Twilio sends to store manager)
               │                                        │
               └───────────────────┬────────────────────┘
                                   │
                                   ▼
                   Admin Reviews Order (/orders)
                                   │
           ┌───────────────────────┴───────────────────────┐
           ▼                                               ▼
   PREPAID ORDER                                   COD ORDER
   Payment already confirmed                       Requires merchant approval
   Admin moves to "processing"                     Admin clicks "Approve COD"
           │                                               │
           └───────────────────────┬───────────────────────┘
                                   │
                                   ▼
             Automatic RapidShyp Logistics Integration
             • Generates shipping parcel
             • Synchronizes customer shipping address
             • Assigns package dimensions and weight
             • Assigns tracking status
                                   │
                                   ▼
             Admin transitions to "shipped" -> captures shipped_date
             Admin transitions to "delivered" -> captures delivered_date
```

### 🛑 Order Cancellation & Stock Protection
If an order is cancelled or deleted:
1. Admin triggers the delete or cancellation action from `/orders`.
2. The `restoreStockForOrderItems` routine queries all line items for that order.
3. The system maps and sums quantities per `product_id`.
4. The database atomically restores the available `stock_quantity` for each affected product.
5. The order items and order records are safely cleaned up.

---

## 🛡️ Database Schema Reference

The dashboard operates on the following core PostgreSQL tables in Supabase:

| Table | Description | Key Fields |
| :--- | :--- | :--- |
| `products` | Core jewellery catalogue | `product_id`, `sku`, `product_name`, `base_price`, `discount_percentage`, `final_price`, `stock_quantity`, `weight_grams`, `metal_type`, `thumbnail_image`, `size`, `tags`, `style_id`, `occasion_id`, `listed_status`, `home_visibility` |
| `product_images` | High-res gallery images | `image_id`, `product_id`, `image_url` |
| `categories` | Main catalogue categories | `category_id`, `category_name`, `slug`, `category_image_url`, `is_active` |
| `sub_categories` | Subcategory facets | `sub_category_id`, `category_id`, `sub_category_name`, `slug`, `sub_category_image` |
| `collections` | Curated promotional sets | `collection_id`, `collection_name`, `slug`, `description`, `is_active` |
| `product_collections`| Junction table | `product_id`, `collection_id` |
| `styles` | Aesthetic styles | `style_id`, `style_name`, `slug`, `image_link`, `is_active` |
| `occasions` | Occasion types | `occasion_id`, `occasion_name`, `slug`, `image_link`, `is_active` |
| `orders` | Master order ledger | `order_id`, `order_number`, `user_id`, `order_status`, `payment_status`, `total_amount`, `shipping_address_id`, `shipped_date`, `delivered_date`, `lock_order` |
| `order_items` | Individual order line items | `order_item_id`, `order_id`, `product_id`, `quantity`, `unit_price`, `total_price` |
| `users` | Registered customer records | `user_id`, `email`, `first_name`, `last_name`, `phone_number`, `is_active` |
| `addresses` | Customer shipping addresses | `address_id`, `user_id`, `street_address`, `house_no`, `landmark`, `city`, `state`, `postal_code`, `country`, `is_default` |
| `coupons` | Promotional vouchers | `coupon_id`, `coupon_code`, `coupon_type`, `discount_type`, `discount_value`, `min_purchase_amount`, `max_discount_amount`, `usage_limit`, `usage_count`, `valid_from`, `valid_until`, `is_active` |
| `image_resources` | Storefront visual assets | `id`, `image_link`, `section_name`, `redirect_route` |
| `promo_content` | Storefront banner copy | `id`, `content`, `place_to_be_displayed` (`promotion_banner` / `share_link`) |
| `reviews` | Customer feedback | `review_id`, `product_id`, `user_id`, `rating`, `review_text` |
| `review_images` | Review photo attachments | `id`, `review_id`, `image_url` |

---

## 🚢 Deployment & Production Guidelines

### Recommended Hosting: Vercel
1. Link the repository to [Vercel](https://vercel.com/).
2. Select **Next.js** framework preset.
3. Configure all **Environment Variables** in the Vercel Project Settings (Supabase, Cloudflare R2, RapidShyp, Twilio, Admin Secret Key).
4. Deploy the main branch.

### Production Best Practices
- **Never expose `SUPABASE_SECRET_KEY`**: Ensure the service role key is only set in server-side environment variables and never prefixed with `NEXT_PUBLIC_`.
- **Change `ADMIN_SECRET_KEY`**: Set a strong, cryptographically generated passphrase for `ADMIN_SECRET_KEY` before going live.
- **Configure Database Webhooks**: In the Supabase dashboard under **Database ➔ Webhooks**, point the `orders` insert trigger to `https://admin.yourdomain.com/api/order-notification`.
- **Image Optimization & CDN**: Set up a custom domain on Cloudflare R2 (e.g., `cdn.thejwel.com`) and configure `CLOUDFLARE_R2_PUBLIC_URL` accordingly for optimal image delivery speeds.

---

## 📄 License & Attribution

Internal proprietary software developed exclusively for **THE JWEL**. All rights reserved. Unauthorized duplication, modification, or distribution is strictly prohibited.
