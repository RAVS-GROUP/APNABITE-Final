<!DOCTYPE html>
<html lang="en">

<head>

  <meta charset="UTF-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0, viewport-fit=cover"
  >

  <meta
    name="theme-color"
    content="#111827"
  >

  <meta
    name="description"
    content="ApnaBite secure founder and administration control centre"
  >

  <link
    rel="manifest"
    href="../../manifest.json"
  >

  <link
    rel="icon"
    type="image/webp"
    href="../../shared/assets/images/apnabite-logo.webp"
  >

  <title>
    Admin Control Centre | ApnaBite
  </title>


  <!-- Shared styles -->

  <link
    rel="stylesheet"
    href="../../shared/css/reset.css"
  >

  <link
    rel="stylesheet"
    href="../../shared/css/variables.css"
  >

  <link
    rel="stylesheet"
    href="../../shared/css/common.css"
  >

  <link
    rel="stylesheet"
    href="../../shared/css/components.css"
  >

  <link
    rel="stylesheet"
    href="../../shared/css/responsive.css"
  >


  <!-- Admin styles -->

  <link
    rel="stylesheet"
    href="../css/admin-common.css"
  >

  <link
    rel="stylesheet"
    href="../css/dashboard.css"
  >

  <link
    rel="stylesheet"
    href="../css/district-control.css"
  >

</head>


<body data-required-role="Admin">

  <main class="admin-app">


    <!-- =====================================================
         ROLE ACCESS LOADER
         ===================================================== -->

    <div
      class="admin-role-loader"
      id="roleHomeLoader"
    >

      <div
        class="loader-spinner"
        aria-hidden="true"
      ></div>

      <strong>
        Opening Admin Control Centre
      </strong>

      <p>
        Verifying secure access...
      </p>

    </div>


    <!-- =====================================================
         PROTECTED ADMIN CONTENT
         ===================================================== -->

    <div
      class="admin-shell hidden"
      id="roleHomeContent"
    >


      <!-- ===================================================
           DESKTOP SIDEBAR
           =================================================== -->

      <aside
        class="admin-sidebar"
        aria-label="Admin navigation"
      >

        <div class="admin-sidebar-brand">

          <div
            class="admin-brand-mark"
            aria-hidden="true"
          >
            A
          </div>

          <div>

            <strong>
              ApnaBite
            </strong>

            <span>
              Control Centre
            </span>

          </div>

        </div>


        <div class="admin-identity">

          <span class="admin-identity-icon">
            👤
          </span>

          <div>

            <small>
              SIGNED IN AS
            </small>

            <strong id="roleHomeUserRole">
              Admin
            </strong>

            <span id="roleHomeUserMobile">
              Verified administrator
            </span>

          </div>

        </div>


        <nav class="admin-sidebar-navigation">

          <p>
            COMMAND CENTRE
          </p>


          <button
            class="admin-navigation-item active"
            type="button"
            data-admin-view="overview"
          >

            <span aria-hidden="true">
              ◫
            </span>

            <strong>
              Founder Overview
            </strong>

          </button>


          <button
            class="admin-navigation-item"
            type="button"
            data-admin-view="finance"
          >

            <span aria-hidden="true">
              ₹
            </span>

            <strong>
              Finance & Audit
            </strong>

          </button>


          <button
            class="admin-navigation-item"
            type="button"
            data-admin-view="operations"
          >

            <span aria-hidden="true">
              ⚙
            </span>

            <strong>
              Operations
            </strong>

          </button>


          <button
            class="admin-navigation-item"
            type="button"
            data-admin-view="growth"
          >

            <span aria-hidden="true">
              ↗
            </span>

            <strong>
              Growth & Offers
            </strong>

          </button>


          <p>
            MANAGEMENT
          </p>


          <a
            class="admin-navigation-item"
            href="kyc-review.html"
          >

            <span aria-hidden="true">
              ✓
            </span>

            <strong>
              Partner KYC
            </strong>

            <b id="sidebarKycCount">
              0
            </b>

          </a>


          <button
            class="admin-navigation-item"
            type="button"
            data-admin-view="support"
          >

            <span aria-hidden="true">
              ◉
            </span>

            <strong>
              Support
            </strong>

          </button>


          <button
            class="admin-navigation-item"
            type="button"
            data-admin-view="districts"
          >

            <span aria-hidden="true">
              ⌖
            </span>

            <strong>
              State & Districts
            </strong>

          </button>

        </nav>


        <div class="admin-sidebar-footer">

          <button
            class="admin-logout-button"
            id="roleLogoutButton"
            type="button"
          >

            <span aria-hidden="true">
              ↪
            </span>

            Logout

          </button>

        </div>

      </aside>


      <!-- ===================================================
           MAIN WORKSPACE
           =================================================== -->

      <section class="admin-workspace">


        <!-- =================================================
             TOP HEADER
             ================================================= -->

        <header class="admin-topbar">

          <div class="admin-topbar-title">

            <small>
              APNABITE ADMIN
            </small>

            <h1>
              Control Centre
            </h1>

            <p>
              Founder, finance and operations overview
            </p>

          </div>


          <div class="admin-topbar-actions">

            <div class="admin-live-status">

              <span></span>

              Live data

            </div>


            <button
              class="admin-refresh-button"
              id="refreshAdminDashboardButton"
              type="button"
              aria-label="Refresh dashboard"
            >

              <span aria-hidden="true">
                ↻
              </span>

              <strong>
                Refresh
              </strong>

            </button>


            <button
              class="admin-mobile-logout"
              id="adminMobileLogoutButton"
              type="button"
              aria-label="Logout"
            >
              ↪
            </button>

          </div>

        </header>


        <!-- Role/session message -->

        <div
          class="admin-global-message hidden"
          id="roleHomeMessage"
          role="alert"
          aria-live="polite"
        ></div>


        <!-- Dashboard request error -->

        <div
          class="admin-global-message admin-error-message hidden"
          id="adminDashboardError"
          role="alert"
          aria-live="assertive"
        >

          <div>

            <strong>
              Dashboard could not be updated
            </strong>

            <p id="adminDashboardErrorText">
              Please try again.
            </p>

          </div>

          <button
            id="retryAdminDashboardButton"
            type="button"
          >
            Retry
          </button>

        </div>


        <!-- =================================================
             DASHBOARD SKELETON
             ================================================= -->

        <section
          class="admin-dashboard-skeleton"
          id="adminDashboardSkeleton"
          aria-label="Loading dashboard"
        >

          <div class="admin-skeleton-heading"></div>

          <div class="admin-skeleton-grid">

            <div class="admin-skeleton-card"></div>
            <div class="admin-skeleton-card"></div>
            <div class="admin-skeleton-card"></div>
            <div class="admin-skeleton-card"></div>

          </div>

          <div class="admin-skeleton-panels">

            <div></div>
            <div></div>

          </div>

        </section>


        <!-- =================================================
             LIVE DASHBOARD
             ================================================= -->

        <div
          class="admin-dashboard hidden"
          id="adminDashboardContent"
        >


          <!-- ===============================================
               OVERVIEW VIEW
               =============================================== -->

          <section
            class="admin-view active"
            data-admin-panel="overview"
          >

            <div class="admin-page-heading">

              <div>

                <span class="admin-eyebrow">
                  FOUNDER OVERVIEW
                </span>

                <h2>
                  Business at a glance
                </h2>

                <p>
                  Revenue, orders and operational health in one place.
                </p>

              </div>


              <div class="admin-updated-time">

                <span>
                  Last updated
                </span>

                <strong id="adminLastUpdated">
                  —
                </strong>

              </div>

            </div>


            <div class="admin-primary-metrics">

              <article class="admin-metric-card metric-gmv">

                <div class="admin-metric-top">

                  <span class="admin-metric-icon">
                    ₹
                  </span>

                  <span class="admin-metric-label">
                    TOTAL GMV
                  </span>

                </div>

                <strong id="totalGmvValue">
                  ₹0
                </strong>

                <p>
                  Paid non-cancelled order value
                </p>

              </article>


              <article class="admin-metric-card">

                <div class="admin-metric-top">

                  <span class="admin-metric-icon revenue">
                    ↗
                  </span>

                  <span class="admin-metric-label">
                    PLATFORM REVENUE
                  </span>

                </div>

                <strong id="platformRevenueValue">
                  ₹0
                </strong>

                <p>
                  Commission and platform fees
                </p>

              </article>


              <article class="admin-metric-card">

                <div class="admin-metric-top">

                  <span class="admin-metric-icon contribution">
                    ◈
                  </span>

                  <span class="admin-metric-label">
                    EST. CONTRIBUTION
                  </span>

                </div>

                <strong id="estimatedContributionValue">
                  ₹0
                </strong>

                <p>
                  Preliminary, not audited profit
                </p>

              </article>


              <article class="admin-metric-card">

                <div class="admin-metric-top">

                  <span class="admin-metric-icon orders">
                    ▣
                  </span>

                  <span class="admin-metric-label">
                    TOTAL ORDERS
                  </span>

                </div>

                <strong id="totalOrdersValue">
                  0
                </strong>

                <p>

                  <b id="todayOrdersInline">
                    0
                  </b>

                  orders today

                </p>

              </article>

            </div>


            <div class="admin-secondary-metrics">

              <article>

                <span>
                  TODAY GMV
                </span>

                <strong id="todayGmvValue">
                  ₹0
                </strong>

              </article>


              <article>

                <span>
                  AVERAGE ORDER
                </span>

                <strong id="averageOrderValue">
                  ₹0
                </strong>

              </article>


              <article>

                <span>
                  ACTIVE CUSTOMERS
                </span>

                <strong id="activeCustomersValue">
                  0
                </strong>

              </article>


              <article>

                <span>
                  OPEN KITCHENS
                </span>

                <strong id="activeKitchensValue">
                  0
                </strong>

              </article>


              <article>

                <span>
                  ACTIVE RIDERS
                </span>

                <strong id="activeRidersValue">
                  0
                </strong>

              </article>


              <article>

                <span>
                  OPEN TICKETS
                </span>

                <strong id="openSupportValue">
                  0
                </strong>

              </article>

            </div>


            <div class="admin-panel-grid">

              <section class="admin-panel">

                <div class="admin-panel-heading">

                  <div>

                    <span class="admin-eyebrow">
                      ORDER CONTROL
                    </span>

                    <h3>
                      Order performance
                    </h3>

                  </div>

                  <button
                    type="button"
                    data-admin-view-target="operations"
                  >
                    View operations
                  </button>

                </div>


                <div class="admin-status-grid">

                  <article>

                    <span class="status-dot delivered"></span>

                    <div>

                      <small>
                        Delivered
                      </small>

                      <strong id="deliveredOrdersValue">
                        0
                      </strong>

                    </div>

                  </article>


                  <article>

                    <span class="status-dot processing"></span>

                    <div>

                      <small>
                        In process
                      </small>

                      <strong id="inProcessOrdersValue">
                        0
                      </strong>

                    </div>

                  </article>


                  <article>

                    <span class="status-dot cancelled"></span>

                    <div>

                      <small>
                        Cancelled
                      </small>

                      <strong id="cancelledOrdersValue">
                        0
                      </strong>

                    </div>

                  </article>


                  <article>

                    <span class="status-dot failed"></span>

                    <div>

                      <small>
                        Failed
                      </small>

                      <strong id="failedOrdersValue">
                        0
                      </strong>

                    </div>

                  </article>

                </div>

              </section>


              <section class="admin-panel">

                <div class="admin-panel-heading">

                  <div>

                    <span class="admin-eyebrow">
                      ATTENTION CENTRE
                    </span>

                    <h3>
                      Action required
                    </h3>

                  </div>

                  <span
                    class="admin-count-badge"
                    id="managementAlertCount"
                  >
                    0
                  </span>

                </div>


                <div
                  class="admin-alert-list"
                  id="managementAlertList"
                ></div>


                <div
                  class="admin-empty-state"
                  id="managementAlertEmpty"
                >

                  <span aria-hidden="true">
                    ✓
                  </span>

                  <strong>
                    All systems clear
                  </strong>

                  <p>
                    No urgent management action is required.
                  </p>

                </div>

              </section>

            </div>


            <section class="admin-management-section">

              <div class="admin-section-heading">

                <div>

                  <span class="admin-eyebrow">
                    MANAGEMENT
                  </span>

                  <h2>
                    Business controls
                  </h2>

                </div>

                <p>
                  Secure access to key operational modules
                </p>

              </div>


              <div class="admin-management-grid">

                <a
                  class="admin-management-card"
                  href="kyc-review.html"
                >

                  <span class="management-icon kyc">
                    ✓
                  </span>

                  <div>

                    <strong>
                      Partner KYC
                    </strong>

                    <p>
                      Review and approve kitchens
                    </p>

                  </div>

                  <b id="managementKycCount">
                    0
                  </b>

                  <i>
                    →
                  </i>

                </a>


                <button
                  class="admin-management-card"
                  type="button"
                  data-admin-view-target="finance"
                >

                  <span class="management-icon finance">
                    ₹
                  </span>

                  <div>

                    <strong>
                      Finance & Audit
                    </strong>

                    <p>
                      Revenue, refunds and liabilities
                    </p>

                  </div>

                  <i>
                    →
                  </i>

                </button>


                <button
                  class="admin-management-card"
                  type="button"
                  data-admin-view-target="operations"
                >

                  <span class="management-icon operations">
                    ⚙
                  </span>

                  <div>

                    <strong>
                      Live Operations
                    </strong>

                    <p>
                      Partners, riders and orders
                    </p>

                  </div>

                  <i>
                    →
                  </i>

                </button>


                <button
                  class="admin-management-card"
                  type="button"
                  data-admin-view-target="growth"
                >

                  <span class="management-icon growth">
                    ↗
                  </span>

                  <div>

                    <strong>
                      Offers & Growth
                    </strong>

                    <p>
                      Promotions and acquisition controls
                    </p>

                  </div>

                  <i>
                    →
                  </i>

                </button>


                <button
                  class="admin-management-card"
                  type="button"
                  data-admin-view-target="support"
                >

                  <span class="management-icon support">
                    ◉
                  </span>

                  <div>

                    <strong>
                      Support Centre
                    </strong>

                    <p>
                      Customer and partner issues
                    </p>

                  </div>

                  <i>
                    →
                  </i>

                </button>


                <button
                  class="admin-management-card"
                  type="button"
                  data-admin-view-target="districts"
                >

                  <span class="management-icon districts">
                    ⌖
                  </span>

                  <div>

                    <strong>
                      State & District Control
                    </strong>

                    <p>
                      Pan-India service coverage
                    </p>

                  </div>

                  <i>
                    →
                  </i>

                </button>

              </div>

            </section>

          </section>


          <!-- ===============================================
               FINANCE VIEW
               =============================================== -->

          <section
            class="admin-view"
            data-admin-panel="finance"
          >

            <div class="admin-page-heading">

              <div>

                <span class="admin-eyebrow">
                  FINANCE & AUDIT
                </span>

                <h2>
                  Financial control room
                </h2>

                <p>
                  Turnover, revenue, liabilities and preliminary contribution.
                </p>

              </div>

              <span
                class="admin-status-pill preliminary"
                id="profitLossStatus"
              >
                PRELIMINARY
              </span>

            </div>


            <div
              class="admin-finance-warning"
              id="financeAuditWarning"
            >

              <span>
                !
              </span>

              <div>

                <strong>
                  Net profit is not final
                </strong>

                <p id="financeAuditMessage">
                  A complete expense ledger is required before audited profit can be calculated.
                </p>

              </div>

            </div>


            <div class="admin-finance-grid">

              <article>
                <span>Commission revenue</span>
                <strong id="commissionRevenueValue">₹0</strong>
              </article>

              <article>
                <span>Platform fee revenue</span>
                <strong id="platformFeeRevenueValue">₹0</strong>
              </article>

              <article>
                <span>Delivery fee collected</span>
                <strong id="deliveryFeeCollectedValue">₹0</strong>
              </article>

              <article class="finance-negative">
                <span>Promotion cost</span>
                <strong id="promotionCostValue">₹0</strong>
              </article>

              <article class="finance-negative">
                <span>Refund outflow</span>
                <strong id="refundOutflowValue">₹0</strong>
              </article>

              <article class="finance-negative">
                <span>Recorded expenses</span>
                <strong id="recordedExpensesValue">₹0</strong>
              </article>

            </div>


            <div class="admin-panel-grid">

              <section class="admin-panel">

                <div class="admin-panel-heading">

                  <div>
                    <span class="admin-eyebrow">PAYABLES</span>
                    <h3>Settlement liabilities</h3>
                  </div>

                </div>

                <div class="admin-liability-list">

                  <article>
                    <span>Food Partner payable</span>
                    <strong id="partnerPayableValue">₹0</strong>
                  </article>

                  <article>
                    <span>Rider payable</span>
                    <strong id="riderPayableValue">₹0</strong>
                  </article>

                  <article>
                    <span>Pending settlement</span>
                    <strong id="pendingSettlementValue">₹0</strong>
                  </article>

                </div>

              </section>


              <section class="admin-panel">

                <div class="admin-panel-heading">

                  <div>
                    <span class="admin-eyebrow">PAYMENT HEALTH</span>
                    <h3>Payments and refunds</h3>
                  </div>

                </div>

                <div class="admin-status-grid">

                  <article>
                    <span class="status-dot delivered"></span>
                    <div>
                      <small>Successful</small>
                      <strong id="successfulPaymentsValue">0</strong>
                    </div>
                  </article>

                  <article>
                    <span class="status-dot processing"></span>
                    <div>
                      <small>Pending</small>
                      <strong id="pendingPaymentsValue">0</strong>
                    </div>
                  </article>

                  <article>
                    <span class="status-dot failed"></span>
                    <div>
                      <small>Failed</small>
                      <strong id="failedPaymentsValue">0</strong>
                    </div>
                  </article>

                  <article>
                    <span class="status-dot cancelled"></span>
                    <div>
                      <small>Pending refunds</small>
                      <strong id="pendingRefundsValue">0</strong>
                    </div>
                  </article>

                </div>

              </section>

            </div>

          </section>


          <!-- ===============================================
               OPERATIONS VIEW
               =============================================== -->

          <section
            class="admin-view"
            data-admin-panel="operations"
          >

            <div class="admin-page-heading">

              <div>
                <span class="admin-eyebrow">OPERATIONS</span>
                <h2>Marketplace operations</h2>
                <p>Monitor kitchens, riders, products and order flow.</p>
              </div>

            </div>


            <div class="admin-operations-grid">

              <section class="admin-operation-card">

                <div class="operation-card-icon">🍳</div>

                <div>
                  <span>FOOD PARTNERS</span>
                  <strong id="totalPartnersValue">0</strong>
                  <p><b id="approvedPartnersValue">0</b> approved</p>
                </div>

              </section>


              <section class="admin-operation-card">

                <div class="operation-card-icon">🟢</div>

                <div>
                  <span>OPEN KITCHENS</span>
                  <strong id="openKitchensValue">0</strong>
                  <p><b id="closedKitchensValue">0</b> currently closed</p>
                </div>

              </section>


              <section class="admin-operation-card">

                <div class="operation-card-icon">🛵</div>

                <div>
                  <span>TOTAL RIDERS</span>
                  <strong id="totalRidersValue">0</strong>
                  <p><b id="operatingRidersValue">0</b> active</p>
                </div>

              </section>


              <section class="admin-operation-card">

                <div class="operation-card-icon">🍱</div>

                <div>
                  <span>PRODUCTS</span>
                  <strong id="totalProductsValue">0</strong>
                  <p><b id="availableProductsValue">0</b> available</p>
                </div>

              </section>

            </div>


            <div class="admin-panel-grid">

              <section class="admin-panel">

                <div class="admin-panel-heading">

                  <div>
                    <span class="admin-eyebrow">APPROVAL PIPELINE</span>
                    <h3>Partner verification</h3>
                  </div>

                  <a href="kyc-review.html">
                    Review KYC
                  </a>

                </div>

                <div class="admin-liability-list">

                  <article>
                    <span>Pending approval</span>
                    <strong id="pendingPartnerApprovalValue">0</strong>
                  </article>

                  <article>
                    <span>Pending KYC</span>
                    <strong id="pendingPartnerKycValue">0</strong>
                  </article>

                  <article>
                    <span>Rejected partners</span>
                    <strong id="rejectedPartnersValue">0</strong>
                  </article>

                </div>

              </section>


              <section class="admin-panel">

                <div class="admin-panel-heading">

                  <div>
                    <span class="admin-eyebrow">RIDER NETWORK</span>
                    <h3>Delivery workforce</h3>
                  </div>

                </div>

                <div class="admin-liability-list">

                  <article>
                    <span>Approved riders</span>
                    <strong id="approvedRidersValue">0</strong>
                  </article>

                  <article>
                    <span>Pending rider approval</span>
                    <strong id="pendingRiderApprovalValue">0</strong>
                  </article>

                  <article>
                    <span>Rider KYC pending</span>
                    <strong id="pendingRiderKycValue">0</strong>
                  </article>

                </div>

              </section>

            </div>

          </section>


          <!-- ===============================================
               GROWTH VIEW
               =============================================== -->

          <section
            class="admin-view"
            data-admin-panel="growth"
          >

            <div class="admin-page-heading">

              <div>
                <span class="admin-eyebrow">GROWTH & OFFERS</span>
                <h2>Promotion control</h2>
                <p>Monitor active, scheduled and expired campaigns.</p>
              </div>

            </div>


            <div class="admin-growth-grid">

              <article>
                <span>TOTAL OFFERS</span>
                <strong id="totalOffersValue">0</strong>
              </article>

              <article class="growth-active">
                <span>ACTIVE</span>
                <strong id="activeOffersValue">0</strong>
              </article>

              <article>
                <span>SCHEDULED</span>
                <strong id="scheduledOffersValue">0</strong>
              </article>

              <article>
                <span>EXPIRED</span>
                <strong id="expiredOffersValue">0</strong>
              </article>

              <article>
                <span>DISABLED</span>
                <strong id="disabledOffersValue">0</strong>
              </article>

            </div>


            <section class="admin-panel admin-coming-panel">

              <span>↗</span>

              <div>
                <h3>Offer management workspace</h3>
                <p>
                  Create, schedule and audit discount campaigns from the dedicated Growth module.
                </p>
              </div>

              <b>NEXT MODULE</b>

            </section>

          </section>


          <!-- ===============================================
               SUPPORT VIEW
               =============================================== -->

          <section
            class="admin-view"
            data-admin-panel="support"
          >

            <div class="admin-page-heading">

              <div>
                <span class="admin-eyebrow">SUPPORT CONTROL</span>
                <h2>Service resolution</h2>
                <p>Monitor open, urgent and resolved support cases.</p>
              </div>

            </div>


            <div class="admin-growth-grid">

              <article>
                <span>TOTAL TICKETS</span>
                <strong id="totalTicketsValue">0</strong>
              </article>

              <article>
                <span>OPEN</span>
                <strong id="openTicketsValue">0</strong>
              </article>

              <article class="support-urgent">
                <span>HIGH PRIORITY</span>
                <strong id="highPriorityTicketsValue">0</strong>
              </article>

              <article class="growth-active">
                <span>RESOLVED</span>
                <strong id="resolvedTicketsValue">0</strong>
              </article>

              <article>
                <span>CLOSED</span>
                <strong id="closedTicketsValue">0</strong>
              </article>

            </div>

          </section>


          <!-- ===============================================
               STATE AND DISTRICTS VIEW
               =============================================== -->

          <section
            class="admin-view"
            data-admin-panel="districts"
          >

            <div
              class="admin-global-message hidden"
              id="geographyPageMessage"
              role="alert"
              aria-live="polite"
            ></div>


            <!-- Geography loading skeleton -->

            <section
              class="geography-skeleton"
              id="geographyPageSkeleton"
              aria-label="Loading service geography"
            >

              <div class="geography-skeleton-heading"></div>

              <div class="geography-skeleton-cards">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>

              <div class="geography-skeleton-toolbar"></div>

              <div class="geography-skeleton-list">
                <div></div>
                <div></div>
                <div></div>
                <div></div>
              </div>

            </section>


            <!-- Geography live content -->

            <div
              class="geography-page hidden"
              id="geographyPageContent"
            >

              <div class="geography-page-heading">

                <div>

                  <span class="admin-eyebrow">
                    PAN-INDIA SERVICE CONTROL
                  </span>

                  <h2>
                    State and district coverage
                  </h2>

                  <p>
                    Activate service state-wise and manage individual district rules.
                  </p>

                </div>


                <div class="geography-page-heading-actions">

                  <div class="geography-last-updated">

                    <span>
                      Last updated
                    </span>

                    <strong id="geographyLastUpdated">
                      —
                    </strong>

                  </div>


                  <button
                    class="admin-refresh-button"
                    id="refreshGeographyButton"
                    type="button"
                  >

                    <span aria-hidden="true">
                      ↻
                    </span>

                    <strong>
                      Refresh coverage
                    </strong>

                  </button>

                </div>

              </div>


              <!-- Geography metrics -->

              <section class="geography-summary-grid">

                <article class="geography-summary-card total">

                  <div>
                    <span>TOTAL STATES & UTS</span>
                    <strong id="totalStatesValue">0</strong>
                  </div>

                  <b>🇮🇳</b>

                  <p>Official LGD coverage</p>

                </article>


                <article class="geography-summary-card active">

                  <div>
                    <span>ACTIVE STATES</span>
                    <strong id="activeStatesValue">0</strong>
                  </div>

                  <b>✓</b>

                  <p>States accepting service</p>

                </article>


                <article class="geography-summary-card districts">

                  <div>
                    <span>TOTAL DISTRICTS</span>
                    <strong id="totalDistrictsValue">0</strong>
                  </div>

                  <b>◈</b>

                  <p>Official districts available</p>

                </article>


                <article class="geography-summary-card live">

                  <div>
                    <span>LIVE DISTRICTS</span>
                    <strong id="effectiveActiveDistrictsValue">0</strong>
                  </div>

                  <b>●</b>

                  <p>Effectively active for customers</p>

                </article>

              </section>


              <!-- Secondary geography metrics -->

              <section class="geography-status-strip">

                <div>
                  <span>Inactive states</span>
                  <strong id="inactiveStatesValue">0</strong>
                </div>

                <div>
                  <span>Active districts</span>
                  <strong id="activeDistrictsValue">0</strong>
                </div>

                <div>
                  <span>Inactive districts</span>
                  <strong id="inactiveDistrictsValue">0</strong>
                </div>

                <div>
                  <span>Coming soon</span>
                  <strong id="comingSoonDistrictsValue">0</strong>
                </div>

              </section>


              <!-- State filters -->

              <section class="geography-filter-panel">

                <div class="geography-search-box">

                  <span>⌕</span>

                  <input
                    id="stateSearchInput"
                    type="search"
                    placeholder="Search state or union territory"
                    autocomplete="off"
                  >

                </div>


                <select
                  id="stateStatusFilter"
                  aria-label="Filter states by status"
                >

                  <option value="ALL">
                    All service statuses
                  </option>

                  <option value="ACTIVE">
                    Active states
                  </option>

                  <option value="INACTIVE">
                    Inactive states
                  </option>

                </select>


                <button
                  class="geography-clear-filter"
                  id="clearStateFiltersButton"
                  type="button"
                >
                  Clear filters
                </button>

              </section>


              <!-- State directory -->

              <section class="geography-directory-card">

                <header class="geography-directory-heading">

                  <div>

                    <span class="admin-eyebrow">
                      NATIONAL COVERAGE
                    </span>

                    <h3>
                      States and union territories
                    </h3>

                    <p>

                      Showing

                      <strong id="visibleStatesCount">
                        0
                      </strong>

                      records

                    </p>

                  </div>

                </header>


                <div
                  class="geography-state-list"
                  id="stateList"
                  aria-live="polite"
                ></div>


                <div
                  class="geography-empty-state hidden"
                  id="stateEmptyState"
                >

                  <span>◈</span>

                  <strong>
                    No states found
                  </strong>

                  <p>
                    Change the search or service-status filter.
                  </p>

                </div>

              </section>


              <aside class="geography-safety-note">

                <span>!</span>

                <div>

                  <strong>
                    State status controls effective service
                  </strong>

                  <p>
                    Deactivating a state makes all its districts unavailable
                    to customers. Individual district settings remain preserved
                    and return when the state is activated again.
                  </p>

                </div>

              </aside>

            </div>


            <!--
              Compatibility elements for dashboard.js V2.
              These remain hidden until dashboard.js is updated.
            -->

            <div class="hidden" aria-hidden="true">

              <table>
                <tbody id="districtPerformanceBody"></tbody>
              </table>

              <div
                class="admin-empty-state hidden"
                id="districtPerformanceEmpty"
              ></div>

            </div>

          </section>


          <!-- ===============================================
               DATA QUALITY FOOTER
               =============================================== -->

          <footer class="admin-data-footer">

            <div>

              <span>
                DATA STATUS
              </span>

              <strong id="adminDataStatus">
                Live operational data
              </strong>

            </div>

            <p id="adminDataQualityNote">
              Financial values are calculated from current order and transaction records.
            </p>

          </footer>

        </div>


        <!-- =================================================
             MOBILE BOTTOM NAVIGATION
             ================================================= -->

        <nav
          class="admin-mobile-navigation"
          aria-label="Mobile Admin navigation"
        >

          <button
            class="active"
            type="button"
            data-admin-view="overview"
          >

            <span>◫</span>
            <strong>Overview</strong>

          </button>


          <button
            type="button"
            data-admin-view="finance"
          >

            <span>₹</span>
            <strong>Finance</strong>

          </button>


          <button
            type="button"
            data-admin-view="operations"
          >

            <span>⚙</span>
            <strong>Operations</strong>

          </button>


          <button
            type="button"
            data-admin-view="growth"
          >

            <span>↗</span>
            <strong>Growth</strong>

          </button>

        </nav>

      </section>

    </div>


    <!-- =====================================================
         STATE DISTRICT DRAWER
         ===================================================== -->

    <div
      class="geography-drawer-dialog hidden"
      id="districtPanel"
      aria-hidden="true"
    >

      <button
        class="geography-dialog-backdrop"
        id="districtPanelBackdrop"
        type="button"
        aria-label="Close district panel"
      ></button>


      <section
        class="geography-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="selectedStateName"
      >

        <header class="geography-drawer-header">

          <div>

            <small>
              STATE OPERATIONS
            </small>

            <h2 id="selectedStateName">
              State districts
            </h2>

            <p id="selectedStateMeta">
              Select a state to manage its districts.
            </p>

          </div>


          <button
            id="closeDistrictPanelButton"
            type="button"
            aria-label="Close district panel"
          >
            ×
          </button>

        </header>


        <div class="geography-drawer-content">

          <section class="selected-state-card">

            <div>

              <span
                class="geography-status-badge inactive"
                id="selectedStateStatusBadge"
              >
                INACTIVE
              </span>

              <strong id="selectedStateControlName">
                —
              </strong>

              <small id="selectedStateControlCode">
                State code —
              </small>

            </div>


            <button
              class="geography-state-status-button"
              id="stateStatusButton"
              type="button"
            >
              Activate state
            </button>

          </section>


          <section class="district-summary-grid">

            <article>
              <span>Total districts</span>
              <strong id="selectedStateDistrictCount">0</strong>
            </article>

            <article>
              <span>Stored active</span>
              <strong id="selectedStateActiveCount">0</strong>
            </article>

            <article>
              <span>Effectively live</span>
              <strong id="selectedStateEffectiveCount">0</strong>
            </article>

          </section>


          <section class="district-filter-panel">

            <div class="geography-search-box">

              <span>⌕</span>

              <input
                id="districtSearchInput"
                type="search"
                placeholder="Search district"
                autocomplete="off"
              >

            </div>


            <select
              id="districtStatusFilter"
              aria-label="Filter districts by status"
            >

              <option value="ALL">
                All district statuses
              </option>

              <option value="ACTIVE">
                Active
              </option>

              <option value="INACTIVE">
                Inactive
              </option>

            </select>

          </section>


          <section class="district-bulk-toolbar">

            <label>

              <input
                id="selectAllDistrictsCheckbox"
                type="checkbox"
              >

              <span>
                Select visible districts
              </span>

            </label>


            <div>

              <button
                class="geography-bulk-activate"
                id="bulkActivateDistrictsButton"
                type="button"
                disabled
              >
                Activate
              </button>

              <button
                class="geography-bulk-deactivate"
                id="bulkDeactivateDistrictsButton"
                type="button"
                disabled
              >
                Deactivate
              </button>

            </div>

          </section>


          <div
            class="district-loading hidden"
            id="districtLoading"
          >

            <span></span>

            <strong>
              Loading districts
            </strong>

            <p>
              Fetching only this state's district records.
            </p>

          </div>


          <div
            class="admin-global-message admin-error-message hidden"
            id="districtError"
            role="alert"
          ></div>


          <div
            class="district-list"
            id="districtList"
            aria-live="polite"
          ></div>


          <div
            class="geography-empty-state hidden"
            id="districtEmptyState"
          >

            <span>◈</span>

            <strong>
              No districts found
            </strong>

            <p>
              Change the search or district-status filter.
            </p>

          </div>

        </div>

      </section>

    </div>


    <!-- =====================================================
         STATUS CONFIRMATION DIALOG
         ===================================================== -->

    <div
      class="geography-confirm-dialog hidden"
      id="serviceStatusDialog"
      aria-hidden="true"
    >

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="serviceStatusDialogTitle"
      >

        <span class="geography-confirm-icon">
          !
        </span>

        <h2 id="serviceStatusDialogTitle">
          Confirm service-status change
        </h2>

        <p id="serviceStatusDialogDescription">
          Confirm the selected service-status action.
        </p>

        <label for="serviceStatusReasonInput">
          Change reason
        </label>

        <textarea
          id="serviceStatusReasonInput"
          maxlength="500"
          placeholder="Enter a clear operational reason"
        ></textarea>

        <div
          class="geography-form-error hidden"
          id="serviceStatusDialogError"
          role="alert"
        ></div>

        <div class="geography-confirm-actions">

          <button
            class="geography-secondary-button"
            id="cancelServiceStatusButton"
            type="button"
          >
            Cancel
          </button>

          <button
            class="geography-primary-button"
            id="confirmServiceStatusButton"
            type="button"
          >
            Confirm change
          </button>

        </div>

      </section>

    </div>


    <!-- =====================================================
         DISTRICT RULES DIALOG
         ===================================================== -->

    <div
      class="geography-confirm-dialog hidden"
      id="districtRulesDialog"
      aria-hidden="true"
    >

      <section
        class="district-rules-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="districtRulesTitle"
      >

        <header>

          <div>

            <small>
              DELIVERY CONFIGURATION
            </small>

            <h2 id="districtRulesTitle">
              District service rules
            </h2>

            <p id="districtRulesId">
              —
            </p>

          </div>

        </header>


        <div class="district-rules-grid">

          <label>

            <span>
              Service radius (KM)
            </span>

            <input
              id="districtServiceRadiusInput"
              type="number"
              min="1"
              max="100"
              step="0.5"
              inputmode="decimal"
            >

          </label>


          <label>

            <span>
              Delivery fee per KM
            </span>

            <input
              id="districtDeliveryFeeInput"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
            >

          </label>


          <label>

            <span>
              Minimum delivery fee
            </span>

            <input
              id="districtMinimumDeliveryFeeInput"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
            >

          </label>


          <label>

            <span>
              Long-distance delivery
            </span>

            <select id="districtLongDistanceInput">

              <option value="TRUE">
                Enabled
              </option>

              <option value="FALSE">
                Disabled
              </option>

            </select>

          </label>


          <label class="district-rules-full-field">

            <span>
              Update reason
            </span>

            <textarea
              id="districtRulesReasonInput"
              maxlength="500"
              placeholder="Enter the reason for changing district rules"
            ></textarea>

          </label>

        </div>


        <div
          class="geography-form-error hidden"
          id="districtRulesError"
          role="alert"
        ></div>


        <div class="geography-confirm-actions">

          <button
            class="geography-secondary-button"
            id="cancelDistrictRulesButton"
            type="button"
          >
            Cancel
          </button>

          <button
            class="geography-primary-button"
            id="saveDistrictRulesButton"
            type="button"
          >
            Save service rules
          </button>

        </div>

      </section>

    </div>

  </main>


  <!-- =======================================================
       SHARED JAVASCRIPT
       ======================================================= -->

  <script src="../../shared/js/storage.js"></script>

  <script src="../../shared/js/cache.js"></script>

  <script src="../../shared/js/api.js"></script>

  <script src="../../shared/js/session.js"></script>

  <script src="../../shared/js/auth.js"></script>

  <script src="../../shared/js/app-router.js"></script>

  <script src="../../shared/js/role-home.js"></script>


  <!-- Admin modules -->

  <script src="../js/dashboard.js"></script>

  <script src="../js/district-control.js"></script>

</body>

</html>
