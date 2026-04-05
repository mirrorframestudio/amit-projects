-- =============================================================================
-- Ads Dashboard — Database Schema
-- =============================================================================
-- This file runs automatically when the PostgreSQL container starts fresh.
-- To re-apply after changes: docker-compose down -v && docker-compose up
--
-- Table hierarchy:
--   campaigns
--     └── adsets
--           └── ads
--                 └── ad_insights_daily
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 1. campaigns
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
    id                 SERIAL PRIMARY KEY,
    name               VARCHAR(255) NOT NULL,
    status             VARCHAR(50)  DEFAULT 'active',   -- active | paused | archived
    budget             NUMERIC(10, 2) DEFAULT 0.00,
    spend              NUMERIC(10, 2) DEFAULT 0.00,
    impressions        INTEGER DEFAULT 0,
    clicks             INTEGER DEFAULT 0,

    -- Meta Ads fields (empty until we connect the API)
    meta_campaign_id   VARCHAR(100),                    -- ID assigned by Meta
    objective          VARCHAR(100),                    -- e.g. 'LINK_CLICKS', 'CONVERSIONS'

    created_at         TIMESTAMP DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 2. adsets  (belong to a campaign)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS adsets (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(50)  DEFAULT 'active',
    campaign_id     INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,

    -- Meta Ads fields
    meta_adset_id   VARCHAR(100),
    daily_budget    NUMERIC(10, 2),
    start_date      DATE,
    end_date        DATE,

    -- Targeting as JSON: e.g. {"age_min": 25, "countries": ["US"]}
    targeting       JSONB,

    created_at      TIMESTAMP DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 3. ads  (belong to an adset)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ads (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    status          VARCHAR(50)  DEFAULT 'active',
    adset_id        INTEGER NOT NULL REFERENCES adsets(id) ON DELETE CASCADE,

    -- Meta Ads fields
    meta_ad_id      VARCHAR(100),
    creative_title  VARCHAR(255),
    creative_body   VARCHAR(1000),

    created_at      TIMESTAMP DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 4. ad_insights_daily  (one row = one ad on one day)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ad_insights_daily (
    id          SERIAL PRIMARY KEY,
    ad_id       INTEGER NOT NULL REFERENCES ads(id) ON DELETE CASCADE,
    date_start  DATE    NOT NULL,

    -- Volume
    impressions INTEGER DEFAULT 0,    -- How many times the ad was shown
    clicks      INTEGER DEFAULT 0,    -- How many times it was clicked
    reach       INTEGER DEFAULT 0,    -- Unique people who saw it

    -- Money
    spend       NUMERIC(10, 2) DEFAULT 0.00,   -- Amount spent (USD)
    cpm         NUMERIC(10, 4),                -- Cost per 1,000 impressions
    cpc         NUMERIC(10, 4),                -- Cost per click
    ctr         NUMERIC(8,  6),                -- Click-through rate (e.g. 0.023)

    -- Conversions
    conversions INTEGER DEFAULT 0,

    created_at  TIMESTAMP DEFAULT NOW(),

    -- Prevent duplicate rows for the same ad + day
    UNIQUE (ad_id, date_start)
);


-- =============================================================================
-- Seed data — realistic-looking sample rows for local development
-- =============================================================================

-- Campaigns
INSERT INTO campaigns (name, status, budget, spend, impressions, clicks, objective) VALUES
    ('Summer Sale Campaign', 'active', 5000.00, 1200.50,  45000, 1350, 'LINK_CLICKS'),
    ('Brand Awareness Q1',   'active', 3000.00,  800.00,  32000,  640, 'REACH'),
    ('Product Launch',       'paused', 8000.00, 4100.75,  91000, 2730, 'CONVERSIONS');

-- Ad sets (one per campaign for simplicity)
INSERT INTO adsets (name, status, campaign_id, daily_budget, start_date, end_date, targeting) VALUES
    ('US 25-44 — Summer',    'active', 1, 250.00, '2026-06-01', '2026-08-31',
        '{"age_min": 25, "age_max": 44, "countries": ["US"]}'),
    ('Global Awareness',     'active', 2, 150.00, '2026-01-01', '2026-03-31',
        '{"age_min": 18, "age_max": 65, "countries": ["US", "GB", "CA"]}'),
    ('Retargeting — Launch', 'paused', 3, 400.00, '2026-03-01', '2026-04-30',
        '{"age_min": 18, "age_max": 55, "countries": ["US"]}');

-- Ads (one per ad set)
INSERT INTO ads (name, status, adset_id, creative_title, creative_body) VALUES
    ('Summer Hero Ad',     'active', 1,
        'Up to 50% off this summer!',
        'Shop our biggest sale of the year. Limited time only.'),
    ('Brand Video Ad',     'active', 2,
        'Meet the brand everyone is talking about.',
        'Quality you can trust. Discover our story today.'),
    ('Launch Retarget Ad', 'paused', 3,
        'You looked — now come back and save.',
        'Exclusive launch pricing ends soon. Don''t miss out.');

-- Daily insights (a few sample days per ad)
INSERT INTO ad_insights_daily
    (ad_id, date_start, impressions, clicks, reach, spend, cpm, cpc, ctr, conversions)
VALUES
    -- Ad 1 — summer hero
    (1, '2026-06-01',  5200, 156,  4900, 42.50, 8.17, 0.27, 0.030000, 12),
    (1, '2026-06-02',  4800, 134,  4500, 38.20, 7.96, 0.29, 0.027900, 10),
    (1, '2026-06-03',  6100, 201,  5700, 51.00, 8.36, 0.25, 0.032900, 18),

    -- Ad 2 — brand video
    (2, '2026-01-10',  8000, 112,  7500, 32.00, 4.00, 0.29, 0.014000,  0),
    (2, '2026-01-11',  9200, 138,  8800, 37.00, 4.02, 0.27, 0.015000,  0),

    -- Ad 3 — retarget
    (3, '2026-03-01',  2100,  84,  2000, 28.00, 13.33, 0.33, 0.040000, 22),
    (3, '2026-03-02',  1900,  76,  1800, 25.50, 13.42, 0.34, 0.040000, 19);


-- =============================================================================
-- P&L Feature — Additional Tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 5. shopify_orders (synced from Shopify API)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopify_orders (
    id                  SERIAL PRIMARY KEY,
    shopify_order_id    BIGINT UNIQUE NOT NULL,
    order_number        VARCHAR(50),
    created_at_shopify  TIMESTAMP NOT NULL,
    financial_status    VARCHAR(50),          -- paid, refunded, partially_refunded
    fulfillment_status  VARCHAR(50),
    total_price         NUMERIC(12, 2) NOT NULL,
    subtotal_price      NUMERIC(12, 2) NOT NULL,
    total_shipping      NUMERIC(10, 2) DEFAULT 0,
    total_tax           NUMERIC(10, 2) DEFAULT 0,
    total_discounts     NUMERIC(10, 2) DEFAULT 0,
    total_refunded      NUMERIC(12, 2) DEFAULT 0,
    currency            VARCHAR(10) DEFAULT 'ILS',
    synced_at           TIMESTAMP DEFAULT NOW(),
    created_at          TIMESTAMP DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 6. shopify_order_items (line items per order)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopify_order_items (
    id                  SERIAL PRIMARY KEY,
    order_id            INTEGER NOT NULL REFERENCES shopify_orders(id) ON DELETE CASCADE,
    shopify_product_id  BIGINT,
    shopify_variant_id  BIGINT,
    sku                 VARCHAR(100),
    title               VARCHAR(500),
    quantity            INTEGER NOT NULL DEFAULT 1,
    price               NUMERIC(10, 2) NOT NULL,
    total_discount      NUMERIC(10, 2) DEFAULT 0,
    created_at          TIMESTAMP DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 7. product_costs (manual COGS — variable cost per product over time)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_costs (
    id                  SERIAL PRIMARY KEY,
    sku                 VARCHAR(100),
    shopify_product_id  BIGINT,
    product_name        VARCHAR(500),
    cost_price          NUMERIC(10, 2) NOT NULL,
    effective_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date            DATE,                      -- NULL = still current
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW(),
    UNIQUE (sku, effective_date)
);


-- -----------------------------------------------------------------------------
-- 8. manual_expenses (ad spend, rent, salary, subscriptions, etc.)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS manual_expenses (
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255) NOT NULL,
    category            VARCHAR(100) NOT NULL,     -- ad_spend, rent, salary, subscription, other
    amount              NUMERIC(12, 2) NOT NULL,
    frequency           VARCHAR(20) NOT NULL DEFAULT 'monthly',  -- monthly, annual, one_time, daily
    start_date          DATE NOT NULL,
    end_date            DATE,                      -- NULL = ongoing
    notes               TEXT,
    created_at          TIMESTAMP DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 9. shopify_sync_log (track sync runs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shopify_sync_log (
    id                  SERIAL PRIMARY KEY,
    started_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    finished_at         TIMESTAMP,
    status              VARCHAR(20) DEFAULT 'running',  -- running, completed, failed
    orders_synced       INTEGER DEFAULT 0,
    error_message       TEXT
);


-- =============================================================================
-- P&L Seed data — sample data for development
-- =============================================================================

-- Sample Shopify orders
INSERT INTO shopify_orders (shopify_order_id, order_number, created_at_shopify, financial_status, fulfillment_status, total_price, subtotal_price, total_shipping, total_tax, total_discounts, total_refunded, currency) VALUES
    (1001, '#1001', '2026-01-15 10:30:00', 'paid',      'fulfilled',  350.00, 300.00, 30.00, 20.00, 0.00,   0.00, 'ILS'),
    (1002, '#1002', '2026-01-18 14:20:00', 'paid',      'fulfilled',  520.00, 480.00, 25.00, 15.00, 0.00,   0.00, 'ILS'),
    (1003, '#1003', '2026-01-25 09:00:00', 'refunded',  'fulfilled',  180.00, 150.00, 20.00, 10.00, 0.00, 180.00, 'ILS'),
    (1004, '#1004', '2026-02-02 11:45:00', 'paid',      'fulfilled',  790.00, 720.00, 40.00, 30.00, 0.00,   0.00, 'ILS'),
    (1005, '#1005', '2026-02-10 16:10:00', 'paid',      'unfulfilled', 250.00, 220.00, 20.00, 10.00, 0.00,  0.00, 'ILS'),
    (1006, '#1006', '2026-02-14 08:30:00', 'paid',      'fulfilled',  430.00, 390.00, 25.00, 15.00, 0.00,   0.00, 'ILS'),
    (1007, '#1007', '2026-02-20 12:00:00', 'partially_refunded', 'fulfilled', 600.00, 550.00, 30.00, 20.00, 0.00, 150.00, 'ILS');

-- Sample order items
INSERT INTO shopify_order_items (order_id, shopify_product_id, shopify_variant_id, sku, title, quantity, price, total_discount) VALUES
    (1, 2001, 3001, 'JERSEY-HOME-M',  'Home Jersey - Medium',   1, 180.00, 0.00),
    (1, 2002, 3002, 'JERSEY-AWAY-L',  'Away Jersey - Large',    1, 120.00, 0.00),
    (2, 2001, 3003, 'JERSEY-HOME-L',  'Home Jersey - Large',    2, 180.00, 0.00),
    (2, 2003, 3004, 'SHORTS-HOME-M',  'Home Shorts - Medium',   1, 120.00, 0.00),
    (3, 2002, 3005, 'JERSEY-AWAY-M',  'Away Jersey - Medium',   1, 150.00, 0.00),
    (4, 2001, 3001, 'JERSEY-HOME-M',  'Home Jersey - Medium',   3, 180.00, 0.00),
    (4, 2003, 3006, 'SHORTS-HOME-L',  'Home Shorts - Large',    1, 180.00, 0.00),
    (5, 2002, 3002, 'JERSEY-AWAY-L',  'Away Jersey - Large',    1, 220.00, 0.00),
    (6, 2001, 3003, 'JERSEY-HOME-L',  'Home Jersey - Large',    2, 180.00, 0.00),
    (6, 2004, 3007, 'SOCKS-HOME',     'Home Socks',             1,  30.00, 0.00),
    (7, 2001, 3001, 'JERSEY-HOME-M',  'Home Jersey - Medium',   2, 180.00, 0.00),
    (7, 2002, 3002, 'JERSEY-AWAY-L',  'Away Jersey - Large',    1, 190.00, 0.00);

-- Sample product costs (COGS)
INSERT INTO product_costs (sku, shopify_product_id, product_name, cost_price, effective_date) VALUES
    ('JERSEY-HOME-M',  2001, 'Home Jersey - Medium',  55.00, '2026-01-01'),
    ('JERSEY-HOME-L',  2001, 'Home Jersey - Large',   55.00, '2026-01-01'),
    ('JERSEY-AWAY-M',  2002, 'Away Jersey - Medium',  50.00, '2026-01-01'),
    ('JERSEY-AWAY-L',  2002, 'Away Jersey - Large',   50.00, '2026-01-01'),
    ('SHORTS-HOME-M',  2003, 'Home Shorts - Medium',  25.00, '2026-01-01'),
    ('SHORTS-HOME-L',  2003, 'Home Shorts - Large',   25.00, '2026-01-01'),
    ('SOCKS-HOME',     2004, 'Home Socks',            8.00,  '2026-01-01');

-- Real Meta Ads spend — February 2026 (from Meta Invoice, account 1854553242143860)
INSERT INTO manual_expenses (name, category, amount, frequency, start_date, notes) VALUES
    ('Meta Ads 03/02', 'ad_spend',   6.25, 'one_time', '2026-02-03', 'Ad Credits — txn 25899762946380292-25866559626367292'),
    ('Meta Ads 04/02', 'ad_spend', 796.00, 'one_time', '2026-02-04', 'Visa ····2701 — txn 25972122105811040-26653795934310313'),
    ('Meta Ads 08/02', 'ad_spend', 839.00, 'one_time', '2026-02-08', 'Visa ····2701 — txn 25842699325419984-25958084883881431'),
    ('Meta Ads 11/02', 'ad_spend', 734.72, 'one_time', '2026-02-11', 'Visa ····2701 — txn 26080371144986139-25898299629859956'),
    ('Meta Ads 15/02', 'ad_spend', 883.00, 'one_time', '2026-02-15', 'Visa ····2701 — txn 26762462596776979-25904896482533601'),
    ('Meta Ads 18/02', 'ad_spend', 929.00, 'one_time', '2026-02-18', 'Visa ····2701 — txn 26149901634699756-26149901701366416'),
    ('Meta Ads 22/02', 'ad_spend', 929.00, 'one_time', '2026-02-22', 'Visa ····2701 — txn 26150064551350127-26002870876069497'),
    ('Meta Ads 23/02', 'ad_spend', 929.00, 'one_time', '2026-02-23', 'Visa ····2701 — txn 26072299335793319-26166513249705257'),
    ('Meta Ads 25/02', 'ad_spend', 929.00, 'one_time', '2026-02-25', 'Visa ····2701 — txn 26121221537567764-26088203364202916'),
    ('Meta Ads 27/02', 'ad_spend', 628.89, 'one_time', '2026-02-27', 'Visa ····2701 — txn 26053889440967640-26053889494300968');
-- Total Meta Ads Feb 2026: 7,603.86 ILS (7,597.61 Visa + 6.25 Ad Credits)

-- Fixed recurring expenses
INSERT INTO manual_expenses (name, category, amount, frequency, start_date) VALUES
    ('Shopify Subscription', 'subscription',  110.00, 'monthly',  '2026-01-01');


-- =============================================================================
-- History Tables — written by daily pipelines for trend analysis
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 10. ads_daily_snapshot — one row per day, written by fb-ads-analyzer
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ads_daily_snapshot (
    id                  SERIAL PRIMARY KEY,
    report_date         DATE NOT NULL UNIQUE,   -- the day being reported (yesterday)

    -- Spend & volume
    total_spend         NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_impressions   BIGINT         NOT NULL DEFAULT 0,
    total_clicks        BIGINT         NOT NULL DEFAULT 0,
    total_reach         BIGINT         NOT NULL DEFAULT 0,

    -- Funnel
    total_atc           INTEGER        NOT NULL DEFAULT 0,  -- add to cart
    total_checkout      INTEGER        NOT NULL DEFAULT 0,  -- initiate checkout
    total_purchases     INTEGER        NOT NULL DEFAULT 0,
    total_revenue       NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- purchase value

    -- KPIs
    roas                NUMERIC(8, 4)  NOT NULL DEFAULT 0,
    ctr                 NUMERIC(8, 6)  NOT NULL DEFAULT 0,
    cpc                 NUMERIC(10, 4) NOT NULL DEFAULT 0,
    cost_per_purchase   NUMERIC(10, 2) NOT NULL DEFAULT 0,

    -- Exchange rate used
    usd_to_ils          NUMERIC(8, 4)  NOT NULL DEFAULT 3.2,

    -- Pipeline metadata
    active_campaigns    INTEGER        NOT NULL DEFAULT 0,
    active_ads          INTEGER        NOT NULL DEFAULT 0,
    fatigued_ads        INTEGER        NOT NULL DEFAULT 0,
    recommendations_count INTEGER      NOT NULL DEFAULT 0,
    drive_link          TEXT,

    created_at          TIMESTAMP DEFAULT NOW()
);


-- -----------------------------------------------------------------------------
-- 11. pnl_daily_snapshot — one row per day, written by monday-pnl
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pnl_daily_snapshot (
    id                  SERIAL PRIMARY KEY,
    report_date         DATE NOT NULL UNIQUE,   -- the day being reported

    -- Orders
    total_orders        INTEGER        NOT NULL DEFAULT 0,
    total_revenue       NUMERIC(12, 2) NOT NULL DEFAULT 0,  -- gross (ILS)
    total_vat           NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_cogs          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_shipping      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_payment_fee   NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_profit        NUMERIC(12, 2) NOT NULL DEFAULT 0,
    avg_margin          NUMERIC(6, 4)  NOT NULL DEFAULT 0,  -- e.g. 0.32 = 32%

    -- Combined (profit after ad spend)
    ad_spend            NUMERIC(12, 2) NOT NULL DEFAULT 0,
    net_profit_after_ads NUMERIC(12, 2) NOT NULL DEFAULT 0,

    -- Exchange rate used
    usd_to_ils          NUMERIC(8, 4)  NOT NULL DEFAULT 3.2,

    created_at          TIMESTAMP DEFAULT NOW()
);
