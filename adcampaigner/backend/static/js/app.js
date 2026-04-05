/**
 * AdCampaigner — Frontend SPA (vanilla JS, Hebrew RTL)
 * Professional Campaigner Dashboard
 */

const API = '';  // same origin
let token = localStorage.getItem('ac_token') || '';
let userName = localStorage.getItem('ac_user') || '';
let adAccountId = localStorage.getItem('ac_account') || '';
let selectedAccountId = '';
let latestAnalysisData = null;  // cache for AI agent

// ══════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function switchTab(tabName, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.style.display = 'none');
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.getElementById('tab-' + tabName).style.display = 'block';
    if (btn) btn.classList.add('active');
}

// ══════════════════════════════════════════════
// API HELPERS
// ══════════════════════════════════════════════

async function api(method, path, body = null) {
    const opts = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    if (token) {
        opts.headers['Authorization'] = 'Bearer ' + token;
    }
    if (body) {
        opts.body = JSON.stringify(body);
    }
    const resp = await fetch(API + path, opts);
    if (resp.status === 401) {
        logout();
        throw new Error('session expired');
    }
    const data = await resp.json();
    if (!resp.ok) {
        throw new Error(data.detail || 'API error');
    }
    return data;
}

// ══════════════════════════════════════════════
// AUTH — FACEBOOK LOGIN
// ══════════════════════════════════════════════

function fbLogin() {
    if (typeof FB === 'undefined') {
        showLoginError('Facebook SDK לא נטען. נסה לרענן את הדף');
        return;
    }

    FB.login(function(response) {
        if (response.authResponse) {
            const fbToken = response.authResponse.accessToken;
            loginWithToken(fbToken);
        } else {
            showLoginError('ההתחברות בוטלה');
        }
    }, {scope: 'ads_read,ads_management,business_management'});
}

async function loginWithToken(fbToken) {
    try {
        const data = await api('POST', '/api/auth/facebook-login', {
            fb_access_token: fbToken,
        });
        token = data.access_token;
        userName = data.user_name;
        adAccountId = data.ad_account_id;

        localStorage.setItem('ac_token', token);
        localStorage.setItem('ac_user', userName);
        localStorage.setItem('ac_account', adAccountId);

        if (adAccountId) {
            enterDashboard();
        } else {
            showScreen('screen-onboarding');
        }
    } catch (e) {
        showLoginError(e.message);
    }
}

function showLoginError(msg) {
    const el = document.getElementById('login-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function logout() {
    token = '';
    userName = '';
    adAccountId = '';
    latestAnalysisData = null;
    localStorage.removeItem('ac_token');
    localStorage.removeItem('ac_user');
    localStorage.removeItem('ac_account');
    showScreen('screen-login');
}

// ══════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════

async function saveOnboarding() {
    const name = document.getElementById('onboard-name').value.trim();
    const description = document.getElementById('onboard-description').value.trim();

    if (!name || !description) {
        alert('נא למלא לפחות שם עסק ותיאור');
        return;
    }

    try {
        await api('POST', '/api/auth/onboarding', {
            business_name: name,
            description: description,
            website: document.getElementById('onboard-website').value.trim(),
            products: document.getElementById('onboard-products').value.trim(),
            audience: document.getElementById('onboard-audience').value.trim(),
            usp: document.getElementById('onboard-usp').value.trim(),
        });
        loadAdAccounts();
    } catch (e) {
        alert('שגיאה: ' + e.message);
    }
}

function skipOnboarding() {
    loadAdAccounts();
}

// ══════════════════════════════════════════════
// AD ACCOUNT SELECTION
// ══════════════════════════════════════════════

async function loadAdAccounts() {
    document.getElementById('user-name-accounts').textContent = userName;
    showScreen('screen-accounts');

    try {
        const data = await api('GET', '/api/auth/ad-accounts');
        const list = document.getElementById('accounts-list');

        if (!data.accounts || data.accounts.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="icon">⚠️</div><p>לא נמצאו חשבונות מודעות</p></div>';
            return;
        }

        list.innerHTML = data.accounts.map(a => `
            <div class="account-option" onclick="pickAccount('${a.ad_account_id}', this)">
                <div class="account-name">${a.name || a.ad_account_id}</div>
                <div class="account-id">${a.ad_account_id} | ${a.currency} | ${a.status}</div>
            </div>
        `).join('');
    } catch (e) {
        document.getElementById('accounts-list').innerHTML =
            `<div class="empty-state"><div class="icon">❌</div><p>שגיאה: ${e.message}</p></div>`;
    }
}

function pickAccount(accountId, el) {
    selectedAccountId = accountId;
    document.querySelectorAll('.account-option').forEach(o => o.classList.remove('selected'));
    el.classList.add('selected');
    document.getElementById('btn-select-account').disabled = false;
}

async function selectAccount() {
    if (!selectedAccountId) return;
    try {
        await api('POST', '/api/auth/set-ad-account', {ad_account_id: selectedAccountId});
        adAccountId = selectedAccountId;
        localStorage.setItem('ac_account', adAccountId);
        enterDashboard();
    } catch (e) {
        alert('שגיאה: ' + e.message);
    }
}

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

async function enterDashboard() {
    document.getElementById('user-name-dashboard').textContent = userName;
    showScreen('screen-dashboard');
    loadDashboardStats();
    loadHistory();
    loadLatestAnalysis();
}

async function loadDashboardStats() {
    try {
        const stats = await api('GET', '/api/dashboard/stats');

        if (stats.latest_run) {
            const run = stats.latest_run;
            document.getElementById('stat-spend').textContent = fmtMoney(run.total_spend);
            document.getElementById('stat-purchases').textContent = fmtInt(run.total_purchases);
            document.getElementById('stat-roas').textContent = fmtDecimal(run.total_roas);
            document.getElementById('stat-recs').textContent = run.recommendations_count;

            // Trend
            const trendMap = {
                'improving': {text: 'מגמת עלייה', cls: 'up', arrow: '▲'},
                'declining': {text: 'מגמת ירידה', cls: 'down', arrow: '▼'},
                'stable': {text: 'יציב', cls: 'neutral', arrow: '►'},
            };
            const t = trendMap[stats.trend] || {text: stats.trend || '-', cls: 'neutral', arrow: ''};
            document.getElementById('trend-badge').innerHTML =
                `<span class="trend-badge trend-${t.cls}">${t.arrow} ${t.text}</span>`;

            // Top recommendation
            if (stats.top_recommendation) {
                document.getElementById('top-recommendation').textContent = stats.top_recommendation;
            }

            document.getElementById('trend-summary').textContent =
                `ניתוח אחרון: ${new Date(run.created_at).toLocaleDateString('he-IL')} | ${run.summary || ''}`;
        }

        // Business profile
        if (stats.business_summary) {
            document.getElementById('business-profile-card').style.display = 'block';
            document.getElementById('business-profile-content').textContent = stats.business_summary;
        } else if (stats.business_profile_status === 'pending' || stats.business_profile_status === 'none') {
            document.getElementById('business-profile-card').style.display = 'block';
            document.getElementById('business-profile-content').innerHTML =
                '<div class="loading"><div class="spinner"></div>מחקר עסקי מתבצע ברקע...</div>';
            setTimeout(loadDashboardStats, 10000);
        }
    } catch (e) {
        console.error('Failed to load stats:', e);
    }
}

async function refreshResearch() {
    try {
        await api('POST', '/api/auth/refresh-research');
        document.getElementById('business-profile-content').innerHTML =
            '<div class="loading"><div class="spinner"></div>מריץ מחקר עסקי מחדש...</div>';
        setTimeout(loadDashboardStats, 15000);
    } catch (e) {
        alert('שגיאה: ' + e.message);
    }
}

// ══════════════════════════════════════════════
// RUN ANALYSIS
// ══════════════════════════════════════════════

async function runAnalysis() {
    showLoading('מריץ ניתוח מעמיק... זה יכול לקחת עד דקה');

    try {
        const result = await api('POST', '/api/analysis/run', {});
        hideLoading();

        loadDashboardStats();
        loadHistory();
        loadAnalysisResult(result.id);

        alert('הניתוח הושלם בהצלחה!');
    } catch (e) {
        hideLoading();
        alert('שגיאה בניתוח: ' + e.message);
    }
}

async function loadAnalysisResult(runId) {
    try {
        const data = await api('GET', `/api/analysis/runs/${runId}`);
        if (data.result_json) {
            latestAnalysisData = data.result_json;
            renderFullDashboard(data.result_json);
        }
    } catch (e) {
        console.error('Failed to load analysis:', e);
    }
}

async function loadLatestAnalysis() {
    try {
        const data = await api('GET', '/api/analysis/latest');
        if (data.result) {
            latestAnalysisData = data.result;
            renderFullDashboard(data.result);
        }
    } catch (e) {
        // No analysis yet
    }
}

// ══════════════════════════════════════════════
// RENDER — FULL DASHBOARD FROM ANALYSIS DATA
// ══════════════════════════════════════════════

function renderFullDashboard(result) {
    renderRecommendations(result.recommendations || []);
    const adsObj = result.ads || {};
    const allAds = adsObj.ads || adsObj.top5 || [];
    renderCampaigns(result.campaigns || {}, allAds);
    renderTopBottomAds(allAds);
    renderPeriodComparison(result.period_comparison || null);
    renderPerformanceTables(result.trends || {});
    renderFunnel(result.trends || {});
    renderStatChanges(result.period_comparison || null);
    renderDemographics(result.demographics || null);
}

// ══════════════════════════════════════════════
// RENDER — PERIOD COMPARISON
// ══════════════════════════════════════════════

function renderStatChanges(pc) {
    if (!pc) return;

    const weekComp = pc.week || pc.weekly || null;
    const monthComp = pc.month || pc.monthly || null;

    const comp = weekComp || monthComp;
    if (!comp) return;

    setChangeIndicator('stat-spend-change', comp.spend_change, true);
    setChangeIndicator('stat-purchases-change', comp.purchases_change, false);
    setChangeIndicator('stat-roas-change', comp.roas_change, false);
}

function setChangeIndicator(elId, changeVal, invertColor) {
    const el = document.getElementById(elId);
    if (!el || changeVal === undefined || changeVal === null) return;

    const pct = typeof changeVal === 'number' ? changeVal : parseFloat(changeVal);
    if (isNaN(pct)) return;

    const isPositive = pct > 0;
    const arrow = isPositive ? '▲' : pct < 0 ? '▼' : '►';
    let cls;
    if (invertColor) {
        cls = isPositive ? 'down' : pct < 0 ? 'up' : '';
    } else {
        cls = isPositive ? 'up' : pct < 0 ? 'down' : '';
    }
    el.className = 'stat-change ' + cls;
    el.textContent = `${arrow} ${Math.abs(pct).toFixed(1)}%`;
}

function renderPeriodComparison(pc) {
    if (!pc) return;

    const card = document.getElementById('period-comparison-card');
    const wrap = document.getElementById('period-comparison-content');

    const sections = [];

    const weekComp = pc.week || pc.weekly || null;
    if (weekComp) {
        sections.push(buildComparisonSection('שבוע נוכחי מול שבוע קודם', weekComp));
    }

    const monthComp = pc.month || pc.monthly || null;
    if (monthComp) {
        sections.push(buildComparisonSection('חודש נוכחי מול חודש קודם', monthComp));
    }

    if (sections.length > 0) {
        card.style.display = 'block';
        wrap.innerHTML = sections.join('');
    }
}

function buildComparisonSection(title, comp) {
    const metrics = [
        {key: 'spend', label: 'הוצאה', current: comp.current_spend, previous: comp.previous_spend, change: comp.spend_change, format: 'money', invert: true},
        {key: 'purchases', label: 'רכישות', current: comp.current_purchases, previous: comp.previous_purchases, change: comp.purchases_change, format: 'int'},
        {key: 'roas', label: 'ROAS', current: comp.current_roas, previous: comp.previous_roas, change: comp.roas_change, format: 'decimal'},
        {key: 'ctr', label: 'CTR', current: comp.current_ctr, previous: comp.previous_ctr, change: comp.ctr_change, format: 'pct'},
        {key: 'cpc', label: 'CPC', current: comp.current_cpc, previous: comp.previous_cpc, change: comp.cpc_change, format: 'money', invert: true},
    ];

    const items = metrics.filter(m => m.current !== undefined && m.current !== null).map(m => {
        const change = m.change !== undefined ? parseFloat(m.change) : null;
        let arrow = '', cls = '';
        if (change !== null && !isNaN(change)) {
            const isUp = change > 0;
            arrow = isUp ? '▲' : change < 0 ? '▼' : '►';
            if (m.invert) {
                cls = isUp ? 'down' : change < 0 ? 'up' : 'neutral';
            } else {
                cls = isUp ? 'up' : change < 0 ? 'down' : 'neutral';
            }
        }

        const fmtCurrent = formatByType(m.current, m.format);
        const fmtPrevious = formatByType(m.previous, m.format);

        return `
            <div class="comparison-item">
                <div class="comparison-label">${m.label}</div>
                <div class="comparison-values">
                    <span class="comparison-current">${fmtCurrent}</span>
                    <span class="comparison-arrow ${cls}">${arrow} ${change !== null ? Math.abs(change).toFixed(1) + '%' : ''}</span>
                    <span class="comparison-previous">${fmtPrevious}</span>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="comparison-section">
            <h3 class="comparison-title">${title}</h3>
            <div class="comparison-items">${items}</div>
        </div>
    `;
}

function formatByType(val, type) {
    if (val === null || val === undefined) return '-';
    switch (type) {
        case 'money': return fmtMoney(val);
        case 'int': return fmtInt(val);
        case 'decimal': return fmtDecimal(val);
        case 'pct': return fmtPct(val);
        default: return String(val);
    }
}

// ══════════════════════════════════════════════
// RENDER — PERFORMANCE TABLES (with highlights)
// ══════════════════════════════════════════════

function renderPerformanceTables(trends) {
    if (trends.monthly && trends.monthly.length) {
        renderPerfTable('monthly-table-wrap', trends.monthly, false);
    }
    if (trends.weekly && trends.weekly.length) {
        renderPerfTable('weekly-table-wrap', trends.weekly, false);
    }
    if (trends.daily && trends.daily.length) {
        const last14 = trends.daily.slice(-14);
        renderPerfTable('daily-table-wrap', last14, true);
    }
}

function renderPerfTable(wrapId, rows, isDaily) {
    const wrap = document.getElementById(wrapId);
    if (!rows.length) {
        wrap.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>אין נתונים</p></div>';
        return;
    }

    const periodLabel = isDaily ? 'תאריך' : 'תקופה';

    // Find best and worst ROAS rows
    let bestIdx = -1, worstIdx = -1, bestRoas = -Infinity, worstRoas = Infinity;
    rows.forEach((r, i) => {
        const roas = parseFloat(r.roas) || 0;
        if (roas > bestRoas) { bestRoas = roas; bestIdx = i; }
        if (roas < worstRoas && roas > 0) { worstRoas = roas; worstIdx = i; }
    });

    // Calculate totals
    const totals = {
        spend: 0, purchases: 0, atc: 0, clicks: 0, impressions: 0,
    };
    rows.forEach(r => {
        totals.spend += parseFloat(r.spend) || 0;
        totals.purchases += parseInt(r.purchases) || 0;
        totals.atc += parseInt(r.add_to_cart || r.atc) || 0;
    });
    const avgRoas = totals.spend > 0 ? (rows.reduce((s, r) => s + (parseFloat(r.roas) || 0), 0) / rows.length) : 0;
    const avgCtr = rows.reduce((s, r) => s + (parseFloat(r.ctr) || 0), 0) / rows.length;
    const avgFreq = rows.reduce((s, r) => s + (parseFloat(r.frequency) || 0), 0) / rows.length;
    const avgCpp = totals.purchases > 0 ? (totals.spend / totals.purchases) : 0;

    const tableRows = rows.map((r, i) => {
        const period = formatPeriod(r.period || r.date || r.week_start || r.week || r.month || '-', isDaily);
        const roas = parseFloat(r.roas) || 0;
        const roasCls = roasCellClass(roas);
        let rowCls = '';
        if (i === bestIdx && rows.length > 2) rowCls = 'row-best';
        else if (i === worstIdx && rows.length > 2) rowCls = 'row-worst';

        const cpp = r.cost_per_purchase || r.cpp || r.cost_per_result;
        const cppDisplay = (cpp !== null && cpp !== undefined && isFinite(cpp)) ? fmtMoney(cpp) : '-';

        return `
            <tr class="${rowCls}">
                <td><strong>${period}</strong></td>
                <td>${fmtMoney(r.spend)}</td>
                <td>${fmtInt(r.purchases)}</td>
                <td><span class="roas-pill ${roasPillClass(roas)}">${fmtDecimal(roas)}</span></td>
                <td>${fmtInt(r.add_to_cart || r.atc || 0)}</td>
                <td>${fmtPct(r.ctr)}</td>
                <td>${fmtDecimal(r.frequency)}</td>
                <td>${cppDisplay}</td>
            </tr>
        `;
    }).join('');

    const totalsRow = `
        <tr class="row-totals">
            <td>סה"כ / ממוצע</td>
            <td>${fmtMoney(totals.spend)}</td>
            <td>${fmtInt(totals.purchases)}</td>
            <td><span class="roas-pill ${roasPillClass(avgRoas)}">${fmtDecimal(avgRoas)}</span></td>
            <td>${fmtInt(totals.atc)}</td>
            <td>${fmtPct(avgCtr)}</td>
            <td>${fmtDecimal(avgFreq)}</td>
            <td>${avgCpp > 0 ? fmtMoney(avgCpp) : '-'}</td>
        </tr>
    `;

    wrap.innerHTML = `
        <div class="table-wrap">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>${periodLabel}</th>
                        <th>הוצאה</th>
                        <th>רכישות</th>
                        <th>ROAS</th>
                        <th>הוספה לסל</th>
                        <th>CTR</th>
                        <th>תדירות</th>
                        <th>עלות/רכישה</th>
                    </tr>
                </thead>
                <tbody>${tableRows}${totalsRow}</tbody>
            </table>
        </div>
    `;
}

function formatPeriod(raw, isDaily) {
    if (!raw || raw === '-') return '-';
    const months = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
    // Try to parse YYYY-MM or YYYY-MM-DD
    const parts = raw.split('-');
    if (parts.length === 3 && isDaily) {
        // YYYY-MM-DD → DD.MM
        return `${parts[2]}.${parts[1]}`;
    }
    if (parts.length >= 2) {
        const monthIdx = parseInt(parts[1]) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
            if (parts.length === 2) {
                // YYYY-MM → "מרץ 2026"
                return `${months[monthIdx]} ${parts[0]}`;
            }
            if (parts.length === 3 && !isDaily) {
                // Week start: YYYY-MM-DD → "שבוע 20.03"
                return `שבוע ${parts[2]}.${parts[1]}`;
            }
        }
    }
    return raw;
}

function roasPillClass(roas) {
    if (!roas || roas <= 0) return 'roas-bad';
    if (roas >= 3) return 'roas-good';
    if (roas >= 1.5) return 'roas-ok';
    return 'roas-bad';
}

function roasCellClass(roas) {
    if (!roas || roas <= 0) return 'roas-cell-bad';
    if (roas >= 3) return 'roas-cell-good';
    if (roas >= 1.5) return 'roas-cell-ok';
    return 'roas-cell-bad';
}

function roasClass(roas) {
    if (!roas) return '';
    if (roas >= 3) return 'text-success';
    if (roas >= 1.5) return 'text-warning';
    return 'text-danger';
}

// ══════════════════════════════════════════════
// RENDER — FUNNEL (visual with gradient colors)
// ══════════════════════════════════════════════

function renderFunnel(trends) {
    const container = document.getElementById('funnel-container');
    const overall = trends.overall || {};

    const impressions = overall.impressions || 0;
    const clicks = overall.clicks || 0;
    const viewContent = overall.view_content || overall.content_views || 0;
    const addToCart = overall.add_to_cart || overall.atc || 0;
    const checkout = overall.checkouts || overall.initiate_checkout || 0;
    const purchases = overall.purchases || 0;

    if (impressions === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>הרץ ניתוח כדי לראות את המשפך</p></div>';
        return;
    }

    const steps = [
        {label: 'חשיפות', value: impressions, icon: '👁️'},
        {label: 'קליקים', value: clicks, icon: '👆'},
        {label: 'צפייה בתוכן', value: viewContent, icon: '📄'},
        {label: 'הוספה לסל', value: addToCart, icon: '🛒'},
        {label: 'תחילת תשלום', value: checkout, icon: '💳'},
        {label: 'רכישה', value: purchases, icon: '✅'},
    ].filter(s => s.value > 0);

    if (steps.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>אין נתוני משפך</p></div>';
        return;
    }

    const maxVal = steps[0].value;
    const funnelColors = ['var(--funnel-1)', 'var(--funnel-2)', 'var(--funnel-3)', 'var(--funnel-4)', 'var(--funnel-5)', 'var(--funnel-6)'];

    let funnelHTML = '';
    steps.forEach((step, i) => {
        const pct = maxVal > 0 ? (step.value / maxVal * 100) : 0;
        const convRate = i > 0 && steps[0].value > 0
            ? (step.value / steps[0].value * 100).toFixed(2)
            : null;

        const color = funnelColors[i] || funnelColors[funnelColors.length - 1];

        funnelHTML += `
            <div class="funnel-step" style="animation-delay: ${i * 0.1}s">
                <div class="funnel-label">
                    <span class="funnel-icon">${step.icon}</span>
                    <span class="funnel-name">${step.label}</span>
                </div>
                <div class="funnel-bar-wrap">
                    <div class="funnel-bar" style="width:${Math.max(pct, 4)}%;background:${color}">
                        <span class="funnel-bar-pct">${pct.toFixed(0)}%</span>
                        <span class="funnel-bar-value">${fmtInt(step.value)}</span>
                    </div>
                </div>
                <div class="funnel-meta">
                    ${convRate !== null ? `<span class="funnel-rate">${convRate}%</span>` : '<span class="funnel-rate">100%</span>'}
                </div>
            </div>
        `;

        // Add conversion arrow between steps
        if (i < steps.length - 1 && steps[i].value > 0) {
            const nextStep = steps[i + 1];
            const stepConv = ((nextStep.value / step.value) * 100).toFixed(1);
            const dropoff = (100 - parseFloat(stepConv)).toFixed(1);
            funnelHTML += `
                <div class="funnel-step-divider">
                    <span class="funnel-conv-arrow">↓ ${stepConv}% המרה · ${dropoff}% נשירה</span>
                </div>
            `;
        }
    });

    container.innerHTML = funnelHTML;

    const periodEl = document.getElementById('funnel-period');
    if (periodEl && overall.period) {
        periodEl.textContent = overall.period;
    }
}

// ══════════════════════════════════════════════
// RENDER — RECOMMENDATIONS
// ══════════════════════════════════════════════

function renderRecommendations(recs) {
    const list = document.getElementById('recs-list');
    const countEl = document.getElementById('recs-count');
    if (countEl) countEl.textContent = `${recs.length} המלצות`;

    if (!recs.length) {
        list.innerHTML = '<div class="empty-state"><div class="icon">📋</div><p>הרץ ניתוח כדי לקבל המלצות</p></div>';
        return;
    }

    list.innerHTML = recs.map(r => {
        const path = [r.campaign, r.adset, r.ad].filter(x => x && x !== 'כללי').join(' → ');
        return `
            <li class="rec-item priority-${r.priority}">
                <span class="rec-icon">${r.icon}</span>
                <div class="rec-text">
                    ${r.text}
                    ${path ? `<div class="rec-path">${path}</div>` : ''}
                </div>
            </li>
        `;
    }).join('');
}

// ══════════════════════════════════════════════
// RENDER — CAMPAIGNS AS CARDS
// ══════════════════════════════════════════════

function renderCampaigns(campaignData, adsData) {
    const wrap = document.getElementById('campaigns-table-wrap');
    const campaigns = campaignData.campaigns || [];
    const ads = adsData || [];
    const countEl = document.getElementById('campaigns-count');

    if (countEl) countEl.textContent = `${campaigns.length} קמפיינים`;

    if (!campaigns.length) {
        wrap.innerHTML = '<div class="empty-state"><div class="icon">📊</div><p>הרץ ניתוח כדי לראות נתוני קמפיינים</p></div>';
        return;
    }

    const cardsHTML = campaigns.map((c, idx) => {
        const roas = parseFloat(c.roas) || 0;
        const healthCls = roas >= 3 ? 'health-good' : roas >= 1.5 ? 'health-warning' : 'health-bad';
        const cpp = c.cost_per_result;
        const cppDisplay = (cpp !== null && cpp !== undefined && isFinite(cpp)) ? fmtMoney(cpp) : '-';

        // Find ads for this campaign
        const campaignAds = ads.filter(a =>
            a.campaign_name === c.campaign_name || a.campaign_id === c.campaign_id
        );

        let adsSection = '';
        if (campaignAds.length > 0) {
            const adsHTML = campaignAds.map(a => {
                const adRoas = parseFloat(a.roas) || 0;
                const adCpp = a.cost_per_result;
                const adCppDisplay = (adCpp !== null && adCpp !== undefined && isFinite(adCpp)) ? fmtMoney(adCpp) : '-';
                return `
                    <div class="ad-mini-card">
                        <div class="ad-mini-name">↳ ${a.ad_name || a.name || '-'}</div>
                        <div class="ad-mini-metric">
                            <span class="ad-mini-val">${fmtMoney(a.spend)}</span>
                            <span class="ad-mini-lbl">הוצאה</span>
                        </div>
                        <div class="ad-mini-metric">
                            <span class="ad-mini-val">${fmtInt(a.purchases)}</span>
                            <span class="ad-mini-lbl">רכישות</span>
                        </div>
                        <div class="ad-mini-metric">
                            <span class="ad-mini-val roas-pill ${roasPillClass(adRoas)}">${fmtDecimal(adRoas)}</span>
                            <span class="ad-mini-lbl">ROAS</span>
                        </div>
                        <div class="ad-mini-metric">
                            <span class="ad-mini-val">${fmtPct(a.ctr)}</span>
                            <span class="ad-mini-lbl">CTR</span>
                        </div>
                        <div class="ad-mini-metric">
                            <span class="ad-mini-val">${adCppDisplay}</span>
                            <span class="ad-mini-lbl">עלות/רכישה</span>
                        </div>
                    </div>
                `;
            }).join('');

            adsSection = `
                <div class="campaign-card-ads">
                    <button class="campaign-ads-toggle" onclick="toggleCampaignAds(${idx}, this)">
                        ▼ הצג ${campaignAds.length} מודעות
                    </button>
                    <div class="campaign-ads-list" id="campaign-ads-${idx}">
                        ${adsHTML}
                    </div>
                </div>
            `;
        }

        return `
            <div class="campaign-card slide-in" style="animation-delay: ${idx * 0.08}s">
                <div class="campaign-card-header">
                    <div class="campaign-card-name">
                        <span class="campaign-health ${healthCls}"></span>
                        ${c.campaign_name || '-'}
                    </div>
                    <span class="roas-pill ${roasPillClass(roas)}">${fmtDecimal(roas)} ROAS</span>
                </div>
                <div class="campaign-card-metrics">
                    <div class="campaign-metric">
                        <div class="campaign-metric-value">${fmtMoney(c.spend)}</div>
                        <div class="campaign-metric-label">הוצאה</div>
                    </div>
                    <div class="campaign-metric">
                        <div class="campaign-metric-value">${fmtInt(c.purchases)}</div>
                        <div class="campaign-metric-label">רכישות</div>
                    </div>
                    <div class="campaign-metric">
                        <div class="campaign-metric-value">${fmtInt(c.impressions)}</div>
                        <div class="campaign-metric-label">חשיפות</div>
                    </div>
                    <div class="campaign-metric">
                        <div class="campaign-metric-value">${fmtInt(c.clicks)}</div>
                        <div class="campaign-metric-label">קליקים</div>
                    </div>
                    <div class="campaign-metric">
                        <div class="campaign-metric-value">${fmtPct(c.ctr)}</div>
                        <div class="campaign-metric-label">CTR</div>
                    </div>
                    <div class="campaign-metric">
                        <div class="campaign-metric-value">${cppDisplay}</div>
                        <div class="campaign-metric-label">עלות/רכישה</div>
                    </div>
                    <div class="campaign-metric">
                        <div class="campaign-metric-value">${fmtDecimal(c.frequency)}</div>
                        <div class="campaign-metric-label">תדירות</div>
                    </div>
                </div>
                ${adsSection}
            </div>
        `;
    }).join('');

    wrap.innerHTML = `<div class="campaign-cards-grid">${cardsHTML}</div>`;
}

function toggleCampaignAds(idx, btn) {
    const list = document.getElementById(`campaign-ads-${idx}`);
    if (!list) return;
    const isOpen = list.classList.contains('open');
    list.classList.toggle('open');
    btn.innerHTML = isOpen
        ? `▼ הצג ${list.children.length} מודעות`
        : `▲ הסתר מודעות`;
}

// Legacy toggle for backwards compat
function toggleAds(idx, event) {
    event.stopPropagation();
    const rows = document.querySelectorAll(`.ad-row-${idx}`);
    const btn = event.target;
    const isVisible = rows[0] && rows[0].style.display !== 'none';
    rows.forEach(r => r.style.display = isVisible ? 'none' : 'table-row');
    btn.textContent = isVisible
        ? btn.textContent.replace('▲', '▼')
        : btn.textContent.replace('▼', '▲');
}

// ══════════════════════════════════════════════
// RENDER — TOP & BOTTOM ADS (on overview tab)
// ══════════════════════════════════════════════

function renderTopBottomAds(allAds) {
    const container = document.getElementById('top-bottom-ads');
    if (!container || !allAds || allAds.length < 2) {
        if (container) container.style.display = 'none';
        return;
    }

    // Sort by ROAS
    const sorted = [...allAds].filter(a => parseFloat(a.roas) > 0 || parseFloat(a.spend) > 0);
    sorted.sort((a, b) => (parseFloat(b.roas) || 0) - (parseFloat(a.roas) || 0));

    const top3 = sorted.slice(0, 3);
    const bottom3 = sorted.slice(-3).reverse();

    function renderMiniAd(ad) {
        const roas = parseFloat(ad.roas) || 0;
        return `
            <div class="mini-ad-card">
                <div class="mini-ad-info">
                    <div class="mini-ad-name">${ad.ad_name || ad.name || '-'}</div>
                    <div class="mini-ad-campaign">${ad.campaign_name || ''}</div>
                </div>
                <div class="mini-ad-stats">
                    <div class="mini-ad-stat">
                        <span class="mini-ad-stat-val">${fmtMoney(ad.spend)}</span>
                        <span class="mini-ad-stat-lbl">הוצאה</span>
                    </div>
                    <div class="mini-ad-stat">
                        <span class="mini-ad-stat-val">${fmtInt(ad.purchases)}</span>
                        <span class="mini-ad-stat-lbl">רכישות</span>
                    </div>
                    <div class="mini-ad-stat">
                        <span class="mini-ad-stat-val roas-pill ${roasPillClass(roas)}">${fmtDecimal(roas)}</span>
                        <span class="mini-ad-stat-lbl">ROAS</span>
                    </div>
                </div>
            </div>
        `;
    }

    container.style.display = 'block';
    container.querySelector('.top-bottom-grid').innerHTML = `
        <div class="top-bottom-section">
            <h3>🏆 מודעות מובילות</h3>
            ${top3.map(renderMiniAd).join('')}
        </div>
        <div class="top-bottom-section">
            <h3>⚠️ מודעות לשיפור</h3>
            ${bottom3.map(renderMiniAd).join('')}
        </div>
    `;
}

// ══════════════════════════════════════════════
// RENDER — DEMOGRAPHICS
// ══════════════════════════════════════════════

function renderDemographics(demo) {
    const container = document.getElementById('demographics-card');
    if (!container) return;

    if (!demo || (!demo.age && !demo.gender)) {
        container.style.display = 'none';
        return;
    }

    let insights = [];

    // Best age
    if (demo.age && Array.isArray(demo.age)) {
        const bestAge = [...demo.age].sort((a, b) => (parseFloat(b.roas) || 0) - (parseFloat(a.roas) || 0))[0];
        if (bestAge) {
            insights.push({
                title: 'גיל הכי רווחי',
                value: bestAge.age || bestAge.age_range || '-',
                sub: `ROAS ${fmtDecimal(bestAge.roas)} · ${fmtInt(bestAge.purchases)} רכישות`,
            });
        }
    }

    // Best gender
    if (demo.gender && Array.isArray(demo.gender)) {
        const bestGender = [...demo.gender].sort((a, b) => (parseFloat(b.roas) || 0) - (parseFloat(a.roas) || 0))[0];
        if (bestGender) {
            const genderHe = bestGender.gender === 'male' ? 'גברים' : bestGender.gender === 'female' ? 'נשים' : bestGender.gender;
            insights.push({
                title: 'מגדר הכי רווחי',
                value: genderHe,
                sub: `ROAS ${fmtDecimal(bestGender.roas)} · ${fmtInt(bestGender.purchases)} רכישות`,
            });
        }
    }

    // Best age+gender combo
    if (demo.age_gender && Array.isArray(demo.age_gender)) {
        const best = [...demo.age_gender].sort((a, b) => (parseFloat(b.roas) || 0) - (parseFloat(a.roas) || 0))[0];
        if (best) {
            const gHe = best.gender === 'male' ? 'גברים' : best.gender === 'female' ? 'נשים' : best.gender;
            insights.push({
                title: 'שילוב מנצח',
                value: `${gHe} ${best.age || best.age_range || ''}`,
                sub: `ROAS ${fmtDecimal(best.roas)} · הוצאה ${fmtMoney(best.spend)}`,
            });
        }
    }

    if (insights.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    container.querySelector('.demo-insights-grid').innerHTML = insights.map(ins => `
        <div class="demo-insight-card">
            <h4>${ins.title}</h4>
            <div class="demo-insight-val">${ins.value}</div>
            <div class="demo-insight-sub">${ins.sub}</div>
        </div>
    `).join('');
}

// ══════════════════════════════════════════════
// AI AGENT — Full Campaigner Analysis
// ══════════════════════════════════════════════

async function runAIAgent() {
    const btn = document.getElementById('btn-ai-agent');
    const output = document.getElementById('ai-agent-output');
    const responseEl = document.getElementById('ai-agent-response');

    if (!latestAnalysisData) {
        alert('אין נתוני ניתוח. הרץ ניתוח קודם.');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'מנתח נתונים...';
    output.style.display = 'block';
    responseEl.innerHTML = '<div class="loading"><div class="spinner"></div>הסוכן מנתח את כל הנתונים שלך...</div>';

    try {
        const data = await api('POST', '/api/creative/suggest', {
            suggestion_type: 'analysis',
            campaign_name: '',
            context: buildAIAgentPrompt(latestAnalysisData),
        });
        responseEl.innerHTML = formatAIResponse(data.content || data.suggestion || '');
    } catch (e) {
        responseEl.innerHTML = `<div class="ai-error">שגיאה: ${e.message}</div>`;
    }

    btn.disabled = false;
    btn.textContent = '🤖 נתח את הביצועים שלי';
}

function buildAIAgentPrompt(data) {
    const parts = [];
    parts.push('אתה קמפיינר מקצועי שמנתח ביצועי פרסום בפייסבוק. נתח את כל הנתונים הבאים ותן ניתוח מקצועי מלא בעברית.');
    parts.push('הניתוח חייב לכלול: מה עובד טוב, מה לא עובד, הקצאת תקציב, תובנות קהל, עייפות קריאייטיב, בעיות משפך, ופעולות ספציפיות לביצוע.');
    parts.push('');

    if (data.trends) {
        if (data.trends.overall) {
            parts.push('=== סיכום כללי ===');
            parts.push(JSON.stringify(data.trends.overall, null, 2));
        }
        if (data.trends.monthly) {
            parts.push('=== ביצועים חודשיים ===');
            parts.push(JSON.stringify(data.trends.monthly, null, 2));
        }
        if (data.trends.weekly) {
            parts.push('=== ביצועים שבועיים (אחרונים) ===');
            const lastWeeks = data.trends.weekly.slice(-4);
            parts.push(JSON.stringify(lastWeeks, null, 2));
        }
    }

    if (data.campaigns && data.campaigns.campaigns) {
        parts.push('=== קמפיינים ===');
        parts.push(JSON.stringify(data.campaigns.campaigns, null, 2));
    }

    if (data.period_comparison) {
        parts.push('=== השוואת תקופות ===');
        parts.push(JSON.stringify(data.period_comparison, null, 2));
    }

    if (data.fatigue) {
        parts.push('=== עייפות קריאייטיב ===');
        parts.push(JSON.stringify(data.fatigue, null, 2));
    }

    if (data.demographics) {
        parts.push('=== דמוגרפיה ===');
        parts.push(JSON.stringify(data.demographics, null, 2));
    }

    if (data.placements) {
        parts.push('=== פלייסמנטים ===');
        parts.push(JSON.stringify(data.placements, null, 2));
    }

    if (data.recommendations) {
        parts.push('=== המלצות מערכת ===');
        parts.push(data.recommendations.map(r => `[${r.priority}] ${r.text}`).join('\n'));
    }

    return parts.join('\n');
}

function formatAIResponse(text) {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // Headers
    html = html.replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h2 class="ai-h2">$1</h2>');

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Bullet points
    html = html.replace(/^[•\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="ai-list">$1</ul>');

    // Numbered lists
    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    // Paragraphs
    html = html.replace(/\n\n/g, '</p><p>');
    html = '<p>' + html + '</p>';

    // Clean up
    html = html.replace(/<p>\s*<\/p>/g, '');
    html = html.replace(/<p>\s*(<h[234])/g, '$1');
    html = html.replace(/(<\/h[234]>)\s*<\/p>/g, '$1');
    html = html.replace(/<p>\s*(<ul)/g, '$1');
    html = html.replace(/(<\/ul>)\s*<\/p>/g, '$1');

    return html;
}

// ══════════════════════════════════════════════
// CREATIVE AI
// ══════════════════════════════════════════════

async function generateCreative() {
    const btn = document.getElementById('btn-creative');
    const output = document.getElementById('creative-output');

    btn.disabled = true;
    btn.textContent = 'יוצר הצעה...';
    output.style.display = 'block';
    output.textContent = 'ממתין לתשובה מ-AI...';

    try {
        const data = await api('POST', '/api/creative/suggest', {
            suggestion_type: document.getElementById('creative-type').value,
            campaign_name: document.getElementById('creative-campaign').value,
            context: document.getElementById('creative-context').value,
        });
        output.textContent = data.content;
    } catch (e) {
        output.textContent = 'שגיאה: ' + e.message;
    }

    btn.disabled = false;
    btn.textContent = 'צור הצעה עם AI';
}

// ══════════════════════════════════════════════
// HISTORY
// ══════════════════════════════════════════════

async function loadHistory() {
    try {
        const runs = await api('GET', '/api/analysis/runs');
        const wrap = document.getElementById('history-list');

        if (!runs.length) {
            wrap.innerHTML = '<div class="empty-state"><div class="icon">📅</div><p>אין ניתוחים קודמים</p></div>';
            return;
        }

        wrap.innerHTML = runs.map(r => `
            <div class="rec-item priority-5" style="cursor:pointer" onclick="loadAnalysisResult(${r.id})">
                <span class="rec-icon">${r.status === 'completed' ? '✅' : r.status === 'failed' ? '❌' : '⏳'}</span>
                <div class="rec-text">
                    <strong>${new Date(r.created_at).toLocaleDateString('he-IL')} ${new Date(r.created_at).toLocaleTimeString('he-IL', {hour:'2-digit', minute:'2-digit'})}</strong>
                    <div class="rec-path">
                        הוצאה: ${fmtMoney(r.total_spend)} | רכישות: ${fmtInt(r.total_purchases)} | ROAS: ${fmtDecimal(r.total_roas)} | ${r.recommendations_count} המלצות
                    </div>
                </div>
            </div>
        `).join('');

        if (runs.length > 0 && runs[0].status === 'completed') {
            loadAnalysisResult(runs[0].id);
        }
    } catch (e) {
        console.error('Failed to load history:', e);
    }
}

// ══════════════════════════════════════════════
// FORMATTING HELPERS
// ══════════════════════════════════════════════

function fmtMoney(n) {
    if (n === null || n === undefined || !isFinite(n)) return '-';
    return '₪' + Number(n).toLocaleString('he-IL', {maximumFractionDigits: 0});
}

function fmtInt(n) {
    if (n === null || n === undefined || !isFinite(n)) return '-';
    return Number(n).toLocaleString('he-IL', {maximumFractionDigits: 0});
}

function fmtDecimal(n) {
    if (n === null || n === undefined || !isFinite(n)) return '-';
    return Number(n).toLocaleString('he-IL', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function fmtPct(n) {
    if (n === null || n === undefined || !isFinite(n)) return '-';
    return Number(n).toFixed(2) + '%';
}

function formatNum(n) {
    if (n === null || n === undefined) return '-';
    return Number(n).toLocaleString('he-IL', {maximumFractionDigits: 0});
}

function showLoading(text) {
    document.getElementById('loading-text').textContent = text || 'טוען...';
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

// ══════════════════════════════════════════════
// INIT — check if already logged in
// ══════════════════════════════════════════════

(function init() {
    if (token && adAccountId) {
        enterDashboard();
    } else if (token) {
        showScreen('screen-onboarding');
    }
})();
