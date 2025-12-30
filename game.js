// =====================================================
// GAME STATE MANAGEMENT
// =====================================================
// --- PASTE THIS AT THE VERY TOP OF GAME.JS ---
const startYear = 2025;
const startMonth = 7; // August
const startDay = 25;  

function getGameDate(weeksPassed) {
    let gameDate = new Date(startYear, startMonth, startDay);
    gameDate.setDate(gameDate.getDate() + (weeksPassed * 7));
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return gameDate.toLocaleDateString('en-US', options);
}
// ---------------------------------------------
const GameState = {
    // Calendar system - starting January 1, 2026
    currentDate: new Date(2026, 0, 1), // Jan 1, 2026
    week: 1,
    budget: 2000000,
    
    games: [],
    retailers: [], // Keep this empty or just for HQ
    chains: [],
    retailers: [
        {
            id: 'hq',
            name: 'Iowa State Lottery Headquarters',
            location: 'Des Moines',
            type: 'HQ',
            weeklySales: 0,
            commission: 0
        }
    ],
    pullTabConfig: {
        payoutRate: 0.75, // We pay out 75% to players (House keeps 25%)
        active: false
    },
    
    stats: {
        weeklyRevenue: 0,
        totalRevenue: 0,
        totalPrizesPaid: 0,
        operatingCosts: 0,
        prizeReserves: 0,
        reputation: 0, // 0-100 scale
        playerCount: 0
    },
    financials: {
        currentWeek: {
            scratchSales: 0,
            scratchPayouts: 0,
            instaplaySales: 0,   // <--- NEW
            instaplayPayouts: 0, // <--- NEW
            pullTabHandle: 0,
            pullTabPayouts: 0,
            commissions: 0,
            printing: 0,      
            infrastructure: 0,
            maintenance: 0,   
            staffing: 0,      
            marketing: 0      
        },
        history: {
            scratchSales: 0,
            scratchPayouts: 0,
            instaplaySales: 0,   // <--- NEW
            instaplayPayouts: 0, // <--- NEW
            pullTabHandle: 0,
            pullTabPayouts: 0,
            commissions: 0,
            printing: 0,
            infrastructure: 0,
            maintenance: 0,
            staffing: 0,
            marketing: 0
        }
    },
    history: {
        events: [
            {
                date: new Date(2026, 0, 1),
                dateString: 'January 1, 2026',
                title: 'LOTTERY AUTHORIZED!',
                description: 'The Iowa Legislature has officially authorized the creation of a state lottery. Governor signs bill into law. You\'ve been appointed as the founding director with a $2M startup budget. Good luck!'
            }
        ],
        weeklyRevenue: [0],
        weeklySpending: [0]
    }
};

// Helper function to format date
function formatDate(date) {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Helper function to get month name
function getMonthName(date) {
    return date.toLocaleDateString('en-US', { month: 'long' });
}

// Helper function to check if date is near a holiday
function checkHoliday(date) {
    const month = date.getMonth();
    const day = date.getDate();
    
    // Check for major holidays (will affect marketing/sales)
    if (month === 0 && day === 1) return { name: "New Year's Day", boost: 1.2 };
    if (month === 1 && day >= 10 && day <= 14) return { name: "Valentine's Week", boost: 1.15 };
    if (month === 2 && day >= 14 && day <= 17) return { name: "St. Patrick's Day", boost: 1.1 };
    if (month === 3 && day >= 1 && day <= 30) return { name: "Easter Season", boost: 1.15 };
    if (month === 4 && day >= 23 && day <= 27) return { name: "Memorial Day Week", boost: 1.1 };
    if (month === 6 && day >= 1 && day <= 7) return { name: "Independence Day Week", boost: 1.2 };
    if (month === 8 && day >= 1 && day <= 7) return { name: "Labor Day Week", boost: 1.1 };
    if (month === 9 && day >= 25 && day <= 31) return { name: "Halloween Week", boost: 1.15 };
    if (month === 10 && day >= 20 && day <= 30) return { name: "Thanksgiving Week", boost: 1.25 };
    if (month === 11 && day >= 15 && day <= 31) return { name: "Christmas Season", boost: 1.3 };
    
    return null;
}

// =====================================================
// TIME SYSTEM - ADVANCE WEEK
// =====================================================

function advanceWeek() {
    const nextDate = new Date(GameState.currentDate);
    nextDate.setDate(nextDate.getDate() + 7);
    
    // REMOVED: The confirm() popup check
    
    // Update date and week
    GameState.currentDate = nextDate;
    GameState.week++;
    
    // Check for holiday effects
    const holiday = checkHoliday(GameState.currentDate);
    
    // Calculate weekly operations
    const weekResults = simulateWeek(holiday);
    GameState.financials.currentWeek = {
        scratchSales: 0, pullTabHandle: 0, scratchPayouts: 0, pullTabPayouts: 0,
        commissions: 0, printing: 0, infrastructure: 0, maintenance: 0, 
        staffing: 0, marketing: 0
    };
    
    // Update game state
    GameState.budget += weekResults.netChange;
    GameState.stats.weeklyRevenue = weekResults.revenue;
    GameState.stats.totalRevenue += weekResults.revenue;
    GameState.stats.totalPrizesPaid += weekResults.prizesPaid;
    GameState.stats.operatingCosts += weekResults.operatingCosts;
    
    // Add to history
    GameState.history.weeklyRevenue.push(weekResults.revenue);
    GameState.history.weeklySpending.push(weekResults.spending);
    
    // Add holiday event if applicable
    if (holiday) {
        weekResults.events.push({
            title: `${holiday.name}!`,
            description: `Holiday boost: ${Math.round((holiday.boost - 1) * 100)}% increase in sales this week`
        });
    }
    
    // Add events if any occurred
    if (weekResults.events.length > 0) {
        weekResults.events.forEach(event => {
            GameState.history.events.unshift({
                date: new Date(GameState.currentDate),
                dateString: formatDate(GameState.currentDate),
                ...event
            });
        });
    }
    
    // Update UI
    updateAllUI();
    

}

function simulateWeek(holiday) {
    const holidayBoost = holiday ? holiday.boost : 1.0;
    
    // Safety check for new save files
    if (!GameState.financials.currentWeek.instaplaySales) {
        GameState.financials.currentWeek.instaplaySales = 0;
        GameState.financials.currentWeek.instaplayPayouts = 0;
    }
    const ledger = GameState.financials.currentWeek;
    
    const results = { revenue: 0, spending: 0, netChange: 0, events: [] };
    
    // 1. Staffing & Operations
    const activeGamesCount = GameState.games.filter(g => g.active).length;
    const activeRetailerCount = getTotalActiveStores();
    // Safety check for old saves
    if (!GameState.office) GameState.office = { baseUpkeep: 20000 }; 
    
    const baseUpkeep = GameState.office.baseUpkeep;
    // Lower variable costs to help early game profitability
    const variableCost = (activeGamesCount * 200) + (activeRetailerCount * 50); 
    
    const staffingCost = baseUpkeep + variableCost;
    ledger.staffing += staffingCost;
    
    // 2. Process Scratch Tickets
    GameState.games.forEach(game => {
        if (game.active && game.inventory > 0 && game.type === 'scratch') {
            const stats = simulateGameSales(game, holidayBoost);
            ledger.scratchSales += stats.revenue;
            ledger.scratchPayouts += stats.prizesPaid;
            
            if (stats.bigWinner) {
                results.events.push({ title: `SCRATCH WINNER!`, description: `$${game.topPrize.toLocaleString()} won on ${game.name}!` });
            }
            if (game.inventory < 5000) {
                results.events.push({ title: `Low Stock`, description: `${game.name} is nearly empty.` });
            }
        }
    });

    // 3. Process Instaplay Games (NEW SEPARATE LOGIC)
    GameState.games.forEach(game => {
        if (game.active && game.type === 'instaplay') {
            // This function calculates sales based strictly on 'lottoMachines' count
            const ipStats = simulateInstaplaySales(game, holidayBoost);
            
            // SEPARATE BUCKETS
            ledger.instaplaySales += ipStats.revenue;
            ledger.instaplayPayouts += ipStats.prizesPaid;

            if (ipStats.jackpotHit) {
                results.events.push({
                    title: `INSTAPLAY JACKPOT!`,
                    description: `$${Math.round(ipStats.prizesPaid).toLocaleString()} won on ${game.name}!`
                });
            }
        }
    });
    
    // 4. Process Pull Tabs
    const ptStats = simulatePullTabs(holidayBoost);
    ledger.pullTabHandle += ptStats.handle;
    ledger.pullTabPayouts += ptStats.payouts;
    ledger.maintenance += ptStats.maintenance;
    GameState.games.forEach(game => {
        if (game.active && game.type === 'draw') {
            const drawStats = simulateDrawGame(game, holidayBoost);
            
            ledger.instaplaySales += drawStats.revenue; 
            ledger.instaplayPayouts += drawStats.prizesPaid; // Now includes Contribution + Re-seed
            
            ledger.maintenance += 5000; // <--- Broadcast fee handled here
            
            // ... events ...
        }
    });

    // 5. Calculate Lotto Machine Upkeep
    let totalLottoMachines = 0;
    GameState.chains.forEach(c => totalLottoMachines += (c.lottoMachines || 0));
    ledger.maintenance += (totalLottoMachines * 10); // $10/week upkeep

    // 6. Calculate Commissions
    let totalWeekCommissions = 0;
    const totalRev = ledger.scratchSales + ledger.pullTabHandle + ledger.instaplaySales; // Include Instaplay in commissionable revenue
    
    GameState.chains.forEach(chain => {
        if (chain.activeStores > 0) {
            const commRate = chain.contract ? chain.contract.commission : 0.05;
            const chainShare = chain.activeStores / getTotalActiveStores();
            const chainEstSales = totalRev * chainShare;
            const chainComm = chainEstSales * commRate;
            
            totalWeekCommissions += chainComm;
            
            // Update Chain Stats
            if(!chain.stats) chain.stats = { totalSales: 0, totalCommission: 0, totalProfit: 0 };
            chain.stats.totalSales += chainEstSales;
            chain.stats.totalCommission += chainComm;
            chain.stats.totalProfit += (chainEstSales - chainComm);
        }
    });
    ledger.commissions += totalWeekCommissions;

    // 7. Final Totals
    const totalRevenue = ledger.scratchSales + ledger.pullTabHandle + ledger.instaplaySales;
    const totalExpenses = ledger.scratchPayouts + ledger.pullTabPayouts + ledger.instaplayPayouts + ledger.commissions + ledger.printing + ledger.infrastructure + ledger.maintenance + ledger.staffing + ledger.marketing;
    
    const netProfit = totalRevenue - totalExpenses;
    
    // Update History
    const history = GameState.financials.history;
    for (const [key, value] of Object.entries(ledger)) {
        if (history[key] !== undefined) history[key] += value;
        // Handle new keys if old save
        else history[key] = value;
    }
    
    results.revenue = totalRevenue;
    results.spending = totalExpenses;
    results.netChange = netProfit;
    
    return results;
}
// =====================================================
// MATH HELPERS
// =====================================================

function applyVariance(baseValue, volatility) {
    if (baseValue <= 0) return 0;
    
    // 1. Percentage Swing (e.g. 0.2 = +/- 20%)
    const swing = 1 + ((Math.random() * (volatility * 2)) - volatility);
    let result = baseValue * swing;
    
    // 2. Micro-Chaos (Adds +/- 2 to prevent clean numbers like "100.00")
    result += (Math.random() * 4) - 2;
    
    return Math.max(0, result);
}
function simulateGameSales(game, holidayBoost) {
    const sales = { revenue: 0, prizesPaid: 0, ticketsSold: 0, bigWinner: null };
    
    // 1. BASE DEMAND
    const totalStores = getTotalActiveStores();
    if (totalStores === 0) return sales;
    
    // Base: 120 tickets/store
    let demand = totalStores * 120;
    
   // 2. HYPE DECAY
    const weeksOld = (new Date(GameState.currentDate) - new Date(game.releaseDate)) / (1000 * 60 * 60 * 24 * 7);
    const hype = Math.max(0.4, 2.5 - (weeksOld * 0.15)); 
    
    // BRAND BOOST (New)
    const brandBoost = GameState.office.brandMult || 1.0; 

    demand = demand * hype * brandBoost * holidayBoost;
    
    // 3. APPLY VARIANCE (High volatility for scratchers = 25%)
    // This ensures you never get the same number twice
    const actualDemand = Math.floor(applyVariance(demand, 0.25));
    
    sales.ticketsSold = Math.min(actualDemand, game.inventory);
    sales.revenue = sales.ticketsSold * game.price;

    // 4. PRIZE LOGIC (Standard)
    if (sales.ticketsSold > 0 && game.prizePoolRemaining > 0) {
        const percentSold = sales.ticketsSold / game.inventory;
        const expectedPayout = game.prizePoolRemaining * percentSold;
        
        // Payouts also fluctuate! (Winners are random)
        sales.prizesPaid = Math.floor(applyVariance(expectedPayout, 0.3));
        if (sales.prizesPaid > game.prizePoolRemaining) sales.prizesPaid = game.prizePoolRemaining;
        
        game.prizePoolRemaining -= sales.prizesPaid;
    }

    // Check for Jackpots
    if (game.jackpotsRemaining > 0 && sales.ticketsSold > 0) {
        const oddsPerTicket = game.jackpotsRemaining / game.inventory;
        if (Math.random() < (oddsPerTicket * sales.ticketsSold)) {
            sales.bigWinner = game.topPrize;
            sales.prizesPaid += game.topPrize;
            game.jackpotsRemaining--;
        }
    }

    game.inventory -= sales.ticketsSold;
    game.totalSold += sales.ticketsSold;
    game.totalRevenue += sales.revenue;
    game.totalPrizes += sales.prizesPaid;
    
    return sales;
}

// =====================================================
// UI UPDATE FUNCTIONS
// =====================================================

// =====================================================
// MASTER UI UPDATE
// =====================================================

function updateAllUI() {
    console.log("Refreshing all UI...");

    // 1. Critical Updates (Must work)
    try { updateHeader(); } catch(e) { console.error("Header error:", e); }
    try { updateDashboard(); } catch(e) { console.error("Dashboard error:", e); }
    
    // 2. Game List Update (This is the one you want!)
    try { updateGamesPage(); } catch(e) { console.error("Games Page error:", e); }
    
    // 3. Secondary Updates (May not be built yet)
    // We use checks here to prevent crashes if you haven't written these functions yet
    if (typeof updateRetailerPage === 'function') {
        try { updateRetailerPage(); } catch(e) { console.error("Retailer UI error:", e); }
    }
    
    if (typeof updateAnalyticsPage === 'function') {
        try { updateAnalyticsPage(); } catch(e) { console.error("Analytics UI error:", e); }
    }
    
    if (typeof updateNewsPage === 'function') {
        try { updateNewsPage(); } catch(e) { console.error("News UI error:", e); }
    }
}



function updateRetailerPage() {
    const container = document.querySelector('#retailers');
    if (!container) return;
    
    const office = GameState.office || { tier: 1 };
    const currentTier = office.tier;

    // Calc Network Stats
    let totalStores = 0;
    let totalCommRate = 0;
    let activeChainCount = 0;

    GameState.chains.forEach(c => {
        if (c.active) {
            totalStores += c.activeStores;
            totalCommRate += c.contract.commission;
            activeChainCount++;
        }
    });

    const avgComm = activeChainCount > 0 ? (totalCommRate / activeChainCount) * 100 : 0;

    let html = `
        <div class="page-section">
            <div class="dashboard-card" style="background: #1a1a2e; border-bottom: 4px solid #2196F3; margin-bottom: 25px;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h2 style="margin:0;">RETAIL PARTNERS</h2>
                        <div style="color: #888; font-size: 0.9em;">Manage distribution network.</div>
                    </div>
                    <div style="text-align: right; font-size: 0.9em;">
                        <div style="color: #ccc;">Active Stores: <strong style="color: #fff;">${totalStores}</strong></div>
                        <div style="color: #ccc;">Avg Commission: <strong style="color: #f4d03f;">${avgComm.toFixed(1)}%</strong></div>
                    </div>
                </div>
            </div>
            <div class="chain-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
    `;

    GameState.chains.forEach(chain => {
        // 1. LOCK LOGIC
        let isLocked = false;
        let lockReason = "";
        
        if (chain.type === 'BAR' && currentTier < 2) {
            isLocked = true;
            lockReason = "Requires Tier 2 (Regional Ops)";
        } else if (chain.type === 'GROCERY' && currentTier < 3) {
            isLocked = true;
            lockReason = "Requires Tier 3 (State HQ)";
        }

        if (isLocked) {
            html += `
                <div class="chain-card locked" style="background: #111; border: 1px solid #333; padding: 20px; opacity: 0.6; position: relative;">
                    <div style="filter: blur(2px);">
                        <h3 style="color: #666;">${chain.name}</h3>
                        <div style="color: #444;">${chain.totalStores} Locations</div>
                    </div>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%;">
                        <div style="background: #000; padding: 5px 10px; border: 1px solid #555; display: inline-block; color: #ff4444; font-weight: bold; font-size: 0.8em;">🔒 LOCKED</div>
                        <div style="color: #ccc; font-size: 0.8em; margin-top: 5px;">${lockReason}</div>
                    </div>
                </div>`;
            return;
        }

        // 2. ACTIVE vs UNSIGNED
        const isActive = chain.active;
        const color = isActive ? '#4CAF50' : '#888';
        const border = isActive ? '2px solid #4CAF50' : '1px solid #444';
        const commRate = chain.contract ? (chain.contract.commission * 100).toFixed(1) : "5.0";

        html += `
            <div class="chain-card" style="background: #16213e; border: ${border}; padding: 15px; position: relative;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <h3 style="margin: 0; color: #fff;">${chain.name}</h3>
                        <div style="font-size: 0.8em; color: #aaa;">${chain.type} • ${chain.totalStores} Locations</div>
                    </div>
                    <div style="text-align: right;">
                         ${isActive 
                            ? `<span style="background: #4CAF50; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 0.7em;">PARTNER</span>` 
                            : `<span style="border: 1px solid #888; color: #888; padding: 2px 6px; border-radius: 4px; font-size: 0.7em;">UNSIGNED</span>`}
                    </div>
                </div>
        `;

        if (!isActive) {
            // ESTIMATED COST FIX: Match logic in openNegotiation
            // Pilot Program (5 stores) * Setup Cost
            const pilotCost = 5 * chain.setupCostPerStore;
            
            html += `
                <div style="background: #111; padding: 10px; font-size: 0.9em; margin-bottom: 15px;">
                    <div style="color: #ccc;">Commission Demand: <strong style="color: #fff;">~5.0%</strong></div>
                    <div style="color: #ccc;">Market Reach: <strong style="color: #fff;">${chain.totalStores} Stores</strong></div>
                </div>
                <button class="btn" onclick="openNegotiation('${chain.id}')" style="width: 100%; background: #2196F3;">
                    NEGOTIATE CONTRACT<br><span style="font-size: 0.8em;">Pilot Cost: $${pilotCost.toLocaleString()}</span>
                </button>
            `;
        } else {
            // ... (Management View - Identical to previous) ...
             const activeStores = chain.activeStores || 0;
            const lottoMachines = chain.lottoMachines || 0;
            const pullTabStores = chain.pullTabStores || 0;
            const stats = chain.stats || { totalSales: 0, totalProfit: 0 };

            html += `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8em; margin-bottom: 15px;">
                    <div style="background: #111; padding: 8px;">
                        <div style="color:#aaa;">Scratch Retailers</div>
                        <div style="font-size: 1.1em; color: #fff;">${activeStores} / ${chain.totalStores}</div>
                        ${activeStores < chain.totalStores 
                            ? `<button class="small-btn" onclick="promoteChain('${chain.id}')" style="margin-top:5px; width:100%; font-size:0.9em;">+ Expand</button>` 
                            : `<div style="color:#4CAF50; font-size:0.8em; margin-top:5px;">Fully Stocked</div>`
                        }
                    </div>
                    <div style="background: #111; padding: 8px;">
                        <div style="color:#aaa;">Lotto Terminals</div>
                        <div style="font-size: 1.1em; color: #E91E63;">${lottoMachines}</div>
                        ${lottoMachines < activeStores 
                            ? `<button class="small-btn" onclick="openLottoMgmt('${chain.id}')" style="margin-top:5px; width:100%; font-size:0.9em; border-color: #E91E63; color: #E91E63;">+ Terminal</button>` 
                            : `<div style="color:#E91E63; font-size:0.8em; margin-top:5px;">Maxed Out</div>`
                        }
                    </div>
                    <div style="background: #111; padding: 8px; grid-column: span 2;">
                        <div style="display: flex; justify-content: space-between;">
                            <div>
                                <div style="color:#aaa;">Pull Tab Vending</div>
                                <div style="font-size: 1.1em; color: #FF9800;">${pullTabStores} units</div>
                            </div>
                            <div style="text-align: right;">
                                ${pullTabStores < activeStores 
                                    ? `<button class="small-btn" onclick="openPullTabMgmt('${chain.id}')" style="border-color: #FF9800; color: #FF9800;">+ Vending</button>` 
                                    : `<span style="color:#FF9800; font-size:0.8em;">Maxed Out</span>`
                                }
                            </div>
                        </div>
                    </div>
                </div>
                <div style="border-top: 1px solid #444; padding-top: 10px; font-size: 0.8em; color: #888; display: flex; justify-content: space-between;">
                    <div>Lifetime Profit: <span style="color: #fff;">$${Math.floor(stats.totalProfit).toLocaleString()}</span></div>
                    <div>Rate: ${commRate}%</div>
                </div>
            `;
        }
        
        html += `</div>`; 
    });

    html += `</div></div>`; 
    container.innerHTML = html;
}

function updateAnalyticsPage() {
    const container = document.querySelector('#analytics');
    if (!container) return;
    
    const h = GameState.financials.history;
    const totalRev = h.scratchSales + h.pullTabHandle + (h.instaplaySales || 0);
    const totalExp = h.scratchPayouts + h.pullTabPayouts + (h.instaplayPayouts || 0) + h.commissions + h.printing + h.infrastructure + h.maintenance + h.staffing;
    const profit = totalRev - totalExp;
    
    const fmt = (num) => num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
    
    let html = `
        <h2>FINANCIAL ANALYTICS</h2>
        
        <div class="page-section">
            <div class="quick-stats">
                <div class="quick-stat-card">
                    <div class="quick-stat-label">Lifetime Revenue</div>
                    <div class="quick-stat-value" style="color: #4CAF50;">${fmt(totalRev)}</div>
                </div>
                <div class="quick-stat-card">
                    <div class="quick-stat-label">Lifetime Expenses</div>
                    <div class="quick-stat-value" style="color: #ff4444;">${fmt(totalExp)}</div>
                </div>
                <div class="quick-stat-card">
                    <div class="quick-stat-label">Net Profit</div>
                    <div class="quick-stat-value" style="color: ${profit >= 0 ? '#4CAF50' : '#ff4444'};">${fmt(profit)}</div>
                </div>
            </div>
        </div>

        <div class="page-section">
            <h3>Income Statement</h3>
            <table style="width: 100%; border-collapse: collapse; color: #eee; font-size: 0.9em;">
                <tr style="border-bottom: 2px solid #444; text-align: left;">
                    <th style="padding: 10px;">Category</th>
                    <th style="padding: 10px; text-align: right;">Amount</th>
                    <th style="padding: 10px; text-align: right;">% of Rev</th>
                </tr>
                
                <tr style="background: #1a2634;">
                    <td style="padding: 10px; color: #4CAF50; font-weight: bold;">REVENUE</td>
                    <td></td><td></td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Scratcher Sales</td>
                    <td style="text-align: right;">${fmt(h.scratchSales)}</td>
                    <td style="text-align: right; color: #888;">${((h.scratchSales/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Instaplay Sales (Digital)</td>
                    <td style="text-align: right;">${fmt(h.instaplaySales || 0)}</td>
                    <td style="text-align: right; color: #888;">${((h.instaplaySales/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Pull Tab Handle</td>
                    <td style="text-align: right;">${fmt(h.pullTabHandle)}</td>
                    <td style="text-align: right; color: #888;">${((h.pullTabHandle/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr style="border-top: 1px solid #444; font-weight: bold;">
                    <td style="padding: 8px 20px;">TOTAL REVENUE</td>
                    <td style="text-align: right; color: #4CAF50;">${fmt(totalRev)}</td>
                    <td></td>
                </tr>

                <tr style="background: #1a2634;">
                    <td style="padding: 10px; color: #ff4444; font-weight: bold; margin-top: 20px;">EXPENSES</td>
                    <td></td><td></td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Prize Payouts (Scratch)</td>
                    <td style="text-align: right;">-${fmt(h.scratchPayouts)}</td>
                    <td style="text-align: right; color: #888;">${((h.scratchPayouts/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Prize Payouts (Instaplay)</td>
                    <td style="text-align: right;">-${fmt(h.instaplayPayouts || 0)}</td>
                    <td style="text-align: right; color: #888;">${((h.instaplayPayouts/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Prize Payouts (Pull Tabs)</td>
                    <td style="text-align: right;">-${fmt(h.pullTabPayouts)}</td>
                    <td style="text-align: right; color: #888;">${((h.pullTabPayouts/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Retailer Commissions</td>
                    <td style="text-align: right;">-${fmt(h.commissions)}</td>
                    <td style="text-align: right; color: #888;">${((h.commissions/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Staffing & Operations</td>
                    <td style="text-align: right;">-${fmt(h.staffing)}</td>
                    <td style="text-align: right; color: #888;">${((h.staffing/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Maintenance (Machines)</td>
                    <td style="text-align: right;">-${fmt(h.maintenance)}</td>
                    <td style="text-align: right; color: #888;">${((h.maintenance/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                 <tr>
                    <td style="padding: 8px 20px;">Ticket Printing / Dev</td>
                    <td style="text-align: right;">-${fmt(h.printing)}</td>
                    <td style="text-align: right; color: #888;">${((h.printing/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
                <tr>
                    <td style="padding: 8px 20px;">Infrastructure (Installs)</td>
                    <td style="text-align: right;">-${fmt(h.infrastructure)}</td>
                    <td style="text-align: right; color: #888;">${((h.infrastructure/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>

                <tr style="border-top: 1px solid #444; font-weight: bold;">
                    <td style="padding: 8px 20px;">TOTAL EXPENSES</td>
                    <td style="text-align: right; color: #ff4444;">-${fmt(totalExp)}</td>
                    <td></td>
                </tr>

                <tr style="border-top: 2px solid #fff; font-size: 1.1em; background: #222;">
                    <td style="padding: 15px;">NET INCOME</td>
                    <td style="text-align: right; color: ${profit >= 0 ? '#4CAF50' : '#ff4444'};">${fmt(profit)}</td>
                    <td style="text-align: right;">${((profit/totalRev)*100 || 0).toFixed(1)}%</td>
                </tr>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
}

function updateNewsPage() {
    // Logic for news feed will go here later
}

function updateDashboard() {
    // 1. QUICK STATS (Top Row)
    const activeGames = GameState.games.filter(g => g.active).length;
    const activeRetailers = getTotalActiveStores(); // Uses your helper
    const weeklyRev = GameState.stats.weeklyRevenue || 0;
    
    // Update the DOM elements by index (simple but effective for this layout)
    const statValues = document.querySelectorAll('.quick-stat-value');
    if (statValues.length >= 4) {
        statValues[0].innerText = `$${(GameState.budget / 1000000).toFixed(2)}M`;
        statValues[1].innerText = activeGames;
        statValues[2].innerText = activeRetailers; // Now shows total stores, not just chains
        statValues[3].innerText = `$${weeklyRev.toLocaleString()}`;
    }

    // 2. STARTUP CHECKLIST (Real Tracking)
    const checklist = document.querySelector('.dashboard-header .margin-top-10'); // Finds the container
    if (checklist) {
        // Logic Checks
        const hasGame = GameState.games.length > 0;
        const hasRetailer = activeRetailers >= 10;
        const hasSales = GameState.stats.totalRevenue > 100000;
        const hasWinner = GameState.stats.totalPrizesPaid > 0;

        // Re-render list
        checklist.innerHTML = `
            <div style="margin-bottom: 8px; color: ${hasGame ? '#4CAF50' : '#888'};">
                ${hasGame ? '✅' : '☐'} Create at least one game
            </div>
            <div style="margin-bottom: 8px; color: ${hasRetailer ? '#4CAF50' : '#888'};">
                ${hasRetailer ? '✅' : '☐'} Recruit 10+ retailer locations
            </div>
            <div style="margin-bottom: 8px; color: ${hasSales ? '#4CAF50' : '#888'};">
                ${hasSales ? '✅' : '☐'} Make first $100K in sales
            </div>
            <div style="margin-bottom: 8px; color: ${hasWinner ? '#4CAF50' : '#888'};">
                ${hasWinner ? '✅' : '☐'} Pay out first prize winner
            </div>
        `;
    }

    // 3. FINANCIAL GRID (Bottom)
    // We need to calculate these buckets from the current game state
    
    // Committed = Unsold Inventory Value (Printing cost sunk)
    let committed = 0; 
    GameState.games.forEach(g => {
        if(g.type === 'scratch') {
            // Estimate remaining print cost value
            committed += (g.inventory * 0.08); 
        }
    });

    // Reserves = Money set aside for Jackpots (Instaplay/Draw) + Estimated scratch redemptions
    let reserves = 0;
    GameState.games.forEach(g => {
        if (g.type === 'scratch') reserves += (g.prizePoolRemaining || 0);
        if (g.type === 'instaplay' || g.type === 'draw') reserves += (g.currentJackpot || 0);
    });

    const finGrid = document.querySelectorAll('.dashboard-header .grid-template-columns div div');
    // We target the VALUE divs specifically (every 2nd div in the grid sets)
    // This is fragile DOM traversal, so let's stick to IDs if possible, but for now:
    // Update text content of the values
    const gridValues = document.querySelectorAll('.dashboard-header .grid-template-columns .quick-stat-value');
    
    // Safety check in case the grid HTML isn't exactly as expected
    if (gridValues.length >= 3) {
        // Available Funds (Budget) is handled by Header, but let's sync
        // gridValues[0] is usually budget, already updated? No, let's explicit it:
        const budgetBox = document.querySelectorAll('.dashboard-header .grid-template-columns div')[0].querySelector('.quick-stat-value');
        if(budgetBox) budgetBox.innerText = `$${(GameState.budget / 1000000).toFixed(2)}M`;

        // Committed (Inventory Value)
        const commitBox = document.querySelectorAll('.dashboard-header .grid-template-columns div')[1].querySelector('.quick-stat-value');
        if(commitBox) commitBox.innerText = `$${(committed / 1000).toFixed(1)}k`;

        // Reserves (Prize Liability)
        const reserveBox = document.querySelectorAll('.dashboard-header .grid-template-columns div')[2].querySelector('.quick-stat-value');
        if(reserveBox) reserveBox.innerText = `$${(reserves / 1000000).toFixed(2)}M`;
        
        // Revenue (Week)
        const revBox = document.querySelectorAll('.dashboard-header .grid-template-columns div')[3].querySelector('.quick-stat-value');
        if(revBox) revBox.innerText = `$${weeklyRev.toLocaleString()}`;
    }

    // 4. ACTIVITY FEED (Live Events)
    const feedContainer = document.querySelector('.activity-feed');
    if (feedContainer) {
        let html = `<h3>🚀 RECENT ACTIVITY</h3>`;
        
        // Take last 4 events from history
        const recentEvents = GameState.history.events.slice(0, 5);
        
        if (recentEvents.length === 0) {
            html += `<p style="color:#666;">No activity yet.</p>`;
        } else {
            recentEvents.forEach(e => {
                html += `
                    <div class="activity-item">
                        <div><strong style="color: #f4d03f;">${e.title}</strong></div>
                        <div style="color: #aaa; margin-top: 5px; font-size: 0.9em;">${e.description}</div>
                        <div style="color: #666; font-size: 0.8em; margin-top: 2px;">${e.dateString}</div>
                    </div>
                `;
            });
        }
        feedContainer.innerHTML = html;
    }
}
function distributeChainSales(totalWeeklyRevenue) {
    const totalActive = getTotalActiveStores();
    if (totalActive === 0) return;

    GameState.chains.forEach(chain => {
        // Initialize stats object if it doesn't exist
        if (!chain.stats) chain.stats = { totalSales: 0, totalCommission: 0, totalProfit: 0 };
        
        if (chain.activeStores > 0) {
            // Calculate this chain's share of the total market this week
            const marketShare = chain.activeStores / totalActive;
            
            // Attributed Revenue
            const chainRevenue = totalWeeklyRevenue * marketShare;
            
            // Commission Cost (based on their specific contract rate)
            const commissionRate = chain.contract ? chain.contract.commission : 0.05;
            const chainComm = chainRevenue * commissionRate;
            
            // "Profit" (Net Revenue to Lottery from this chain, pre-prizes)
            const chainProfit = chainRevenue - chainComm;
            
            // Update Cumulative Stats
            chain.stats.totalSales += chainRevenue;
            chain.stats.totalCommission += chainComm;
            chain.stats.totalProfit += chainProfit;
        }
    });
}
function updateHeader() {
    // Update stat bar in header
    document.querySelector('.stats-bar').innerHTML = `
        <div class="stat">
            <div class="stat-label">BUDGET</div>
            <div class="stat-value">$${(GameState.budget / 1000000).toFixed(2)}M</div>
        </div>
        <div class="stat">
            <div class="stat-label">WEEKLY SALES</div>
            <div class="stat-value">$${GameState.stats.weeklyRevenue.toLocaleString()}</div>
        </div>
        <div class="stat">
            <div class="stat-label">REPUTATION</div>
            <div class="stat-value">${GameState.stats.reputation}/100</div>
        </div>
        <div class="stat">
            <div class="stat-label">DATE</div>
            <div class="stat-value">${formatDate(GameState.currentDate)}</div>
        </div>
    `;
}

// =====================================================
// NAVIGATION & SYSTEM FUNCTIONS
// =====================================================

function startGame() {
    // Hide menu, show game
    document.getElementById('mainMenu').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    GameState.chains = generateChains();
    // Initialize UI
    updateAllUI();
    showPage('dashboard');
}

function returnToMenu() {
    if (confirm("Return to main menu? Unsaved progress will be lost.")) {
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
        checkSaveExists(); // <--- Add this
    }
}

function showPage(pageId) {
    // Hide all pages
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
    
    // Deactivate all nav buttons
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => btn.classList.remove('active'));
    
    // Show target page
    document.getElementById(pageId).classList.add('active');
    
    // Activate specific button (simple check based on onclick attribute)
    // In a real app we might use IDs, but this works for your setup
    const activeBtn = Array.from(navBtns).find(btn => 
        btn.getAttribute('onclick').includes(`'${pageId}'`)
    );
    if (activeBtn) activeBtn.classList.add('active');
}

function showGameTab(tabType) {
    // Hide all game tabs
    document.querySelectorAll('.game-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.sub-nav-btn').forEach(btn => btn.classList.remove('active'));
    
    // Show selected
    if (tabType === 'lottery') {
        document.getElementById('lottery-tab').classList.add('active');
        document.querySelector('.sub-nav-btn:first-child').classList.add('active');
    } else {
        document.getElementById('lotto-tab').classList.add('active');
        document.querySelector('.sub-nav-btn:last-child').classList.add('active');
    }
    
    // FORCE UPDATE THE UI
    updateGamesPage();
}

// =====================================================
// EMAIL SYSTEM
// =====================================================

const emailContent = {
    'welcome': {
        from: 'Director Sarah Chen - State Gaming Commission',
        subject: 'Welcome to Your New Role!',
        date: 'Week 1',
        body: `Director,\n\nCongratulations on your appointment. The Governor has high hopes for the Iowa State Lottery.\n\nYour mandate is simple: generate revenue for the state while maintaining integrity and public trust.\n\nYou have $2,000,000 in startup capital. Use it to design games, build a retailer network, and market to the public.\n\nGood luck,\nSarah Chen`
    },
    'startup_guide': {
        from: 'Operations Team',
        subject: 'Start Here: Building From Scratch',
        date: 'Week 1',
        body: `Here is your cheat sheet for the first month:\n\n1. GAMES: You cannot sell what you don't have. Go to the Games tab and create a simple Scratch Ticket.\n\n2. RETAILERS: You need places to sell the tickets. Recruit gas stations and grocery stores.\n\n3. MARKETING: Once you have a game and retailers, run a small ad campaign to let people know.\n\nWARNING: Do not overspend on prizes early on!`
    },
    'budget_tips': {
        from: 'Patricia Okonkwo - Finance',
        subject: 'Managing Your $2M Startup Budget',
        date: 'Week 1',
        body: `Director,\n\nA quick note on the finances. That $2M looks like a lot, but it will go fast.\n\nPrinting tickets costs money upfront. Retailer recruitment requires training costs. And you MUST keep a reserve for paying out prizes.\n\nIf we hit $0, the state will shut us down.\n\n- Patricia`
    }
};

function openEmail(emailId) {
    const email = emailContent[emailId];
    if (!email) return;

    // Populate detail view
    document.getElementById('detailFrom').textContent = `FROM: ${email.from}`;
    document.getElementById('detailSubject').textContent = email.subject;
    document.getElementById('detailDate').textContent = email.date;
    document.getElementById('detailBody').innerText = email.body;

    // Toggle views
    document.getElementById('emailListView').style.display = 'none';
    document.getElementById('emailDetailView').style.display = 'block';
    
    // Mark as read (visual only for now)
    const emailEl = document.querySelector(`[onclick="openEmail('${emailId}')"]`);
    if (emailEl) emailEl.classList.remove('unread');
    
    // Update badge count
    const unreadCount = document.querySelectorAll('.email-item.unread').length;
    document.getElementById('unreadCount').textContent = unreadCount;
    if (unreadCount === 0) document.getElementById('unreadCount').style.display = 'none';
}

function closeEmail() {
    document.getElementById('emailDetailView').style.display = 'none';
    document.getElementById('emailListView').style.display = 'block';
}

function archiveEmail() {
    alert("Email archived");
    closeEmail();
}

function openGameDesigner() {
    // Reset defaults
    document.getElementById('designName').value = '';
    document.getElementById('designPrice').value = '1';
    document.getElementById('designQty').value = '50000';
    document.getElementById('designPayout').value = '60';
    document.getElementById('designJackpot').value = '1000';
    generateRandomGame();
    
    // Show modal
    document.getElementById('gameDesignerModal').style.display = 'block';
    updateTicketPreview();
}

function closeGameDesigner() {
    document.getElementById('gameDesignerModal').style.display = 'none';
}

function updateTicketPreview() {
    // 1. Get Values
    const name = document.getElementById('designName').value || 'New Game';
    const price = parseInt(document.getElementById('designPrice').value);
    const qty = parseInt(document.getElementById('designQty').value);
    const payoutPct = parseInt(document.getElementById('designPayout').value);
    const theme = document.getElementById('designTheme').value;
    
    // 2. Financial Calculations
    const totalRevenue = price * qty;
    const totalPrizePool = totalRevenue * (payoutPct / 100);
    const printCost = qty * 0.08;
    
    // Dynamic Max Jackpot Calculation
    // We cannot allow a jackpot so high it consumes the entire pool.
    // Let's cap the single jackpot value at 20% of the total pool to ensure we can have at least one.
    const maxPossibleJackpot = Math.floor(totalPrizePool * 0.20);
    const jackpotInput = document.getElementById('designJackpot');
    
    // Update the slider max if needed, but try to keep user value if valid
    if (parseInt(jackpotInput.max) !== maxPossibleJackpot) {
         jackpotInput.max = maxPossibleJackpot;
    }
    
    let jackpot = parseInt(jackpotInput.value);
    // Clamp jackpot
    if(jackpot > maxPossibleJackpot) jackpot = maxPossibleJackpot;
    if(jackpot < price * 10) jackpot = price * 10; // Minimum jackpot is 10x price

    // 3. REALISTIC JACKPOT COUNT LOGIC
    // A healthy game dedicates about 25-35% of its money to the top prizes,
    // and the rest (65-75%) to small "churn" prizes ($2, $5, $10) to keep people playing.
    const jackpotAllocation = totalPrizePool * 0.30; 
    
    // How many jackpots fit in that 30% budget?
    let numJackpots = Math.round(jackpotAllocation / jackpot);
    
    // We must have at least 1 jackpot
    if (numJackpots < 1) numJackpots = 1;
    
    // If 1 jackpot costs more than 50% of the pool, warn or cap? 
    // The maxPossibleJackpot check above prevents this, so we are safe.

    // Recalculate the REAL split
    const moneyForJackpots = numJackpots * jackpot;
    const moneyForSmallPrizes = totalPrizePool - moneyForJackpots;
    
    // Calculate "Small Prize Odds" (Churn)
    // Assume average small prize is roughly 2.5x the ticket price (standard industry avg)
    const avgSmallPrize = price * 2.5;
    const numSmallWinners = Math.floor(moneyForSmallPrizes / avgSmallPrize);
    const totalWinners = numJackpots + numSmallWinners;
    const odds = qty / totalWinners;

    // 4. Update Visuals
    const ticketCard = document.getElementById('ticketPreview');
    ticketCard.className = `ticket-card theme-${theme}`;
    document.getElementById('previewName').innerText = name;
    document.getElementById('previewPrice').innerText = `$${price}`;
    document.getElementById('previewJackpot').innerText = `$${jackpot.toLocaleString()}`;
    
    // 5. Update Labels & Stats
    document.getElementById('qtyDisplay').innerText = `${qty.toLocaleString()} tickets`;
    document.getElementById('jackpotDisplay').innerText = `$${jackpot.toLocaleString()}`;
    document.getElementById('payoutDisplay').innerText = `${payoutPct}%`;

    // DOM Updates for Stats
    document.getElementById('statPrintCost').innerText = `-$${printCost.toLocaleString()}`;
    document.getElementById('statPrizePool').innerText = `-$${totalPrizePool.toLocaleString()}`;
    document.getElementById('statRevenue').innerText = `$${totalRevenue.toLocaleString()}`;
    
    const projectedProfit = totalRevenue - totalPrizePool - printCost;
    const profitEl = document.getElementById('statProfit');
    profitEl.innerText = `$${projectedProfit.toLocaleString()}`;
    profitEl.style.color = projectedProfit > 0 ? '#4CAF50' : '#ff4444';
    
    document.getElementById('statOdds').innerHTML = `
        1 in ${odds.toFixed(2)}<br>
        <span style="font-size: 0.8em; color: #f4d03f">(${numJackpots} Jackpots in deck)</span>
    `;
    
    // Store calculated values in hidden attributes for the publish function to grab
    ticketCard.dataset.numJackpots = numJackpots;
    ticketCard.dataset.smallPrizePool = moneyForSmallPrizes;
}

function publishGame() {
    const name = document.getElementById('designName').value;
    if (!name) { alert("Please give your game a name!"); return; }

    const price = parseInt(document.getElementById('designPrice').value);
    const qty = parseInt(document.getElementById('designQty').value);
    const jackpot = parseInt(document.getElementById('designJackpot').value);
    
    // Get values from the Preview logic
    const ticketCard = document.getElementById('ticketPreview');
    const numJackpots = parseInt(ticketCard.dataset.numJackpots) || 1;
    const smallPrizeTotal = parseFloat(ticketCard.dataset.smallPrizePool) || 0;
    
    const printCost = qty * 0.08;
    
    if (GameState.budget < printCost) {
        alert(`Insufficient funds! Need $${printCost.toLocaleString()}`);
        return;
    }
    
    if (!confirm(`Launch "${name}"?\n\n• Printing: ${qty.toLocaleString()} tickets\n• Jackpots: ${numJackpots} available ($${jackpot.toLocaleString()} each)\n• Cost: $${printCost.toLocaleString()}`)) return;
    
    GameState.budget -= printCost;
    GameState.financials.currentWeek.printing += printCost;
    
    const newGame = {
        id: 'game_' + Date.now(),
        name: name,
        type: 'scratch',
        price: price,
        inventory: qty,
        totalPrinted: qty,
        totalSold: 0,
        
        // FINANCIALS
        topPrize: jackpot,
        jackpotsTotal: numJackpots,
        jackpotsRemaining: numJackpots,
        
        // THE NEW POOL SYSTEM
        // We don't use a fixed % rate anymore. We use a bucket of money.
        prizePoolTotal: smallPrizeTotal,     
        prizePoolRemaining: smallPrizeTotal, 
        
        // Tracking
        totalRevenue: 0,
        totalPrizes: 0,
        printCost: printCost,
        active: true,
        releaseDate: new Date(GameState.currentDate)
    };
    
    GameState.games.push(newGame);
    GameState.stats.operatingCosts += printCost;
    
    closeGameDesigner();
    updateAllUI(); 
    showPage('games');
}

function updateGamesPage() {
    // 1. Get Containers
    const lottoContainer = document.querySelector('#lotto-tab');
    const lotteryContainer = document.querySelector('#lottery-tab');
    
    // =====================================================
    // TAB 1: LOTTERY (Scratch & Pull Tabs)
    // =====================================================
    if (lotteryContainer) {
        const scratchGames = GameState.games.filter(g => g.type === 'scratch' && g.active);
        
        // Pull Tab Section
        let ptHtml = '';
        const totalMachines = GameState.chains.reduce((acc, c) => acc + (c.pullTabStores || 0), 0);
        
        if (totalMachines > 0) {
            const h = GameState.financials.history; 
            ptHtml = `
                <div class="page-section" style="margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
                    <h3>Pull Tab Operations</h3>
                    <div class="dashboard-card" style="background: #1a1a2e; border: 1px solid #e65100; padding: 20px;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div style="color: #e65100; font-weight: bold;">NETWORK ACTIVE</div>
                                <div style="font-size: 1.5em; color: #fff;">${totalMachines.toLocaleString()} <span style="font-size: 0.6em; color: #888;">Active Machines</span></div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #aaa; font-size: 0.8em;">Lifetime Handle</div>
                                <div style="color: #fff; font-weight: bold;">$${Math.floor(h.pullTabHandle).toLocaleString()}</div>
                            </div>
                        </div>
                    </div>
                </div>`;
        }

        // Scratch List
        let scratchHtml = '';
        if (scratchGames.length === 0) {
            scratchHtml = `<p style="color: #666; font-style: italic;">No active scratch tickets.</p>`;
        } else {
            scratchHtml = `<div class="game-list">`;
            scratchGames.forEach(game => {
                // CALCS
                const totalExpenses = game.totalPrizes + game.printCost;
                const profit = game.totalRevenue - totalExpenses;
                const profitColor = profit >= 0 ? '#4CAF50' : '#ff4444';
                const stockPct = (game.inventory / game.totalPrinted) * 100;

                scratchHtml += `
                    <div class="game-card" style="background: #16213e; border: 1px solid #444; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${profitColor};">
                        
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center;">
                            <div>
                                <strong style="color: #f4d03f; font-size: 1.1em;">🎫 ${game.name}</strong>
                                <span style="background: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 10px;">$${game.price}</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: ${profitColor}; font-weight: bold;">$${profit.toLocaleString()}</div>
                                <div style="font-size: 0.7em; color: #888;">NET PROFIT</div>
                            </div>
                        </div>
                        
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 0.8em; margin-bottom: 8px; background: #222; padding: 8px; border-radius: 4px;">
                            <div>
                                <div style="color: #aaa;">Total Sales</div>
                                <div style="color: #fff;">$${game.totalRevenue.toLocaleString()}</div>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: #aaa;">Total Expenses</div>
                                <div style="color: #ff4444;">-$${totalExpenses.toLocaleString()}</div>
                            </div>
                        </div>

                        <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #ccc; margin-bottom: 5px;">
                            <div>Jackpots Left: <strong style="color: #f4d03f;">${game.jackpotsRemaining}</strong></div>
                            <div>Top Prize: $${game.topPrize.toLocaleString()}</div>
                        </div>
                        
                        <div style="margin-top: 5px; background: #000; height: 6px; border-radius: 3px; overflow: hidden;">
                            <div style="width: ${stockPct}%; background: #2196F3; height: 100%;"></div>
                        </div>
                        <div style="text-align: right; font-size: 0.7em; color: #666; margin-top: 2px;">${game.inventory.toLocaleString()} / ${game.totalPrinted.toLocaleString()} tickets remaining</div>
                    </div>
                `;
            });
            scratchHtml += `</div>`;
        }

        lotteryContainer.innerHTML = `
            <div class="page-section">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Active Scratch Tickets</h3>
                    <button class="small-btn" onclick="openGameDesigner()">+ NEW SCRATCHER</button>
                </div>
                ${scratchHtml}
            </div>
            ${ptHtml}
        `;
    }

    // =====================================================
    // TAB 2: LOTTO (Instaplay & Draw Games)
    // =====================================================
    if (lottoContainer) {
        // C. Instaplay Games
        const instaGames = GameState.games.filter(g => g.type === 'instaplay' && g.active);
        
        let instaHtml = `
            <div class="page-section">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Active Instaplay Games</h3>
                    <button class="small-btn" onclick="openInstaplayDesigner()">+ CREATE INSTAPLAY</button>
                </div>
                <p style="color: #888; font-size: 0.9em; margin-bottom: 15px;">
                    Digital games printed on demand. Jackpots pre-funded.
                </p>
        `;

        if (instaGames.length === 0) {
            instaHtml += `<p style="color: #666; font-style: italic;">No active Instaplay games.</p>`;
        } else {
            instaHtml += `<div class="game-list">`;
            instaGames.forEach(game => {
                const profit = game.totalRevenue - game.totalPrizes;
                const profitColor = profit >= 0 ? '#4CAF50' : '#ff4444';
                const isProgressive = game.flavor !== 'steady';
                const typeLabel = isProgressive ? 'Progressive' : 'Steady';
                const typeColor = isProgressive ? '#E91E63' : '#4CAF50';
                
                instaHtml += `
                    <div class="game-card" style="background: #16213e; border: 1px solid #E91E63; padding: 15px; margin-bottom: 15px; border-left: 4px solid #E91E63;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <strong style="color: #E91E63; font-size: 1.1em;">⚡ ${game.name}</strong>
                                <span style="background: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 10px;">$${game.price}</span>
                                <span style="font-size: 0.7em; color: ${typeColor}; border: 1px solid ${typeColor}; padding: 1px 4px; margin-left: 5px; border-radius: 3px;">${typeLabel}</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: ${profitColor}; font-weight: bold;">$${profit.toLocaleString()}</div>
                                <button onclick="deleteGame('${game.id}')" style="cursor:pointer; color: #ff4444; background: transparent; border: 1px solid #ff4444; border-radius: 4px; font-size: 0.7em; padding: 2px 6px; margin-top: 5px;">STOP</button>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                            <div>
                                <div style="font-size: 0.7em; color: #aaa;">CURRENT JACKPOT</div>
                                <div style="font-size: 1.5em; color: #fff; font-weight: bold; text-shadow: 0 0 10px #E91E63;">
                                    $${Math.floor(game.currentJackpot).toLocaleString()}
                                </div>
                            </div>
                            <div style="text-align: right; font-size: 0.8em; color: #ccc;">
                                Sales: $${game.totalRevenue.toLocaleString()}
                            </div>
                        </div>
                    </div>
                `;
            });
            instaHtml += `</div>`;
        }
        instaHtml += `</div>`;

        // D. Draw Games
        const drawGames = GameState.games.filter(g => g.type === 'draw' && g.active);
        
        let drawHtml = `
            <div class="page-section" style="margin-top: 40px; border-top: 1px solid #333; padding-top: 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h3>Televised Draw Games</h3>
                    <button class="small-btn" onclick="openDrawGameDesigner()">+ NEW BROADCAST</button>
                </div>
        `;
        
        if (drawGames.length === 0) {
            drawHtml += `<p style="color: #666; font-style: italic;">No active draw games.</p>`;
        } else {
            drawHtml += `<div class="game-list">`;
            drawGames.forEach(game => {
                const profit = game.totalRevenue - game.totalPrizes;
                const profitColor = profit >= 0 ? '#4CAF50' : '#ff4444';
                const weeklySales = game.lastWeekSales || 0;
                
                drawHtml += `
                    <div class="game-card" style="background: #16213e; border: 1px solid #9C27B0; padding: 15px; margin-bottom: 15px; border-left: 4px solid #9C27B0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <div>
                                <strong style="color: #9C27B0; font-size: 1.1em;">📺 ${game.name}</strong>
                                <span style="background: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 10px;">$${game.price}</span>
                            </div>
                            <div style="text-align: right;">
                                <div style="color: ${profitColor}; font-weight: bold;">$${profit.toLocaleString()}</div>
                                <button onclick="deleteGame('${game.id}')" style="cursor:pointer; color: #ff4444; background: transparent; border: 1px solid #ff4444; border-radius: 4px; font-size: 0.7em; padding: 2px 6px; margin-top: 5px;">STOP</button>
                            </div>
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                            <div>
                                <div style="font-size: 0.7em; color: #aaa;">NEXT DRAW JACKPOT</div>
                                <div style="font-size: 1.5em; color: #fff; font-weight: bold; text-shadow: 0 0 10px #9C27B0;">
                                    $${Math.floor(game.currentJackpot).toLocaleString()}
                                </div>
                            </div>
                            <div style="text-align: right; font-size: 0.8em; color: #ccc;">
                                <div style="color: #fff; font-weight: bold;">$${weeklySales.toLocaleString()} / week</div>
                                <div style="font-size: 0.9em; margin-top: 3px;">Draws: ${game.drawFreq}/wk</div>
                            </div>
                        </div>
                    </div>
                `;
            });
            drawHtml += `</div>`;
        }
        drawHtml += `</div>`;

        // Combine
        lottoContainer.innerHTML = instaHtml + drawHtml;
    }
}
function updatePullTabInstallCalc() {
    const qty = parseInt(document.getElementById('ptInstallQty').value);
    
    // Grab synergy from the dataset we set in openPullTabMgmt
    // Note: We need to make sure openPullTabMgmt sets a "Base Handle" value now
    const baseHandle = parseFloat(document.getElementById('ptInstallQty').dataset.baseHandle);
    
    const cost = qty * 500; // $500 install fee
    const estHandle = qty * baseHandle;
    const estProfit = estHandle * 0.25; // Assuming default 25% margin
    
    document.getElementById('ptInstallCount').innerText = `${qty} Machines`;
    document.getElementById('ptInstallCost').innerText = `-$${cost.toLocaleString()}`;
    document.getElementById('ptInstallRev').innerText = `$${estHandle.toLocaleString()}`;
    document.getElementById('ptInstallProfit').innerText = `+$${estProfit.toLocaleString()}`;
}

// Update openPullTabMgmt to set the Base Handle correctly
function openPullTabMgmt(chainId) {
    const chain = GameState.chains.find(c => c.id === chainId);
    if (!chain) return;
    
    currentPtChainId = chainId;
    
    let baseHandle = 0;
    let synergyText = "";
    
    // UPDATED ESTIMATES FOR UI
    if (chain.type === 'BAR') { baseHandle = 2500; synergyText = "HIGH ($2,500/week)"; }
    else if (chain.type === 'GAS') { baseHandle = 1000; synergyText = "MEDIUM ($1,000/week)"; }
    else { baseHandle = 150; synergyText = "LOW ($150/week)"; }
    
    // UI Updates
    document.getElementById('ptMgmtTitle').innerText = `INSTALL: ${chain.name.toUpperCase()}`;
    document.getElementById('ptMgmtType').innerText = chain.type;
    document.getElementById('ptMgmtSynergy').innerText = synergyText;
    
    // Slider Setup
    const available = chain.activeStores - chain.pullTabStores;
    const slider = document.getElementById('ptInstallQty');
    slider.min = 0;
    slider.max = available;
    slider.value = 0;
    slider.dataset.baseHandle = baseHandle; 
    
    document.getElementById('ptAvailable').innerText = `Available Locations: ${available}`;
    updatePullTabInstallCalc();
    document.getElementById('pullTabMgmtModal').style.display = 'block';
}

// 3. UPDATE CALC (New Cost: $2,500)
function updatePullTabInstallCalc() {
    const qty = parseInt(document.getElementById('ptInstallQty').value);
    const baseHandle = parseFloat(document.getElementById('ptInstallQty').dataset.baseHandle);
    
    // NEW COST: $2,500 PER MACHINE
    const cost = qty * 2500; 
    
    const estHandle = qty * baseHandle;
    const estProfit = estHandle * 0.25; // Gross profit before overhead
    
    document.getElementById('ptInstallCount').innerText = `${qty} Machines`;
    document.getElementById('ptInstallCost').innerText = `-$${cost.toLocaleString()}`;
    document.getElementById('ptInstallRev').innerText = `$${estHandle.toLocaleString()}`;
    // Show net profit estimate (minus the $50 op cost)
    const netEst = estProfit - (qty * 50);
    document.getElementById('ptInstallProfit').innerText = `+$${netEst.toLocaleString()}`;
}
// Simple updater for the slider
function updatePtConfig(value) {
    GameState.pullTabConfig.payoutRate = parseInt(value) / 100;
    document.getElementById('ptPayoutDisplay').innerText = value + "%";
}
function renderGameList(games, type) {
    if (games.length === 0) return `<p style="color: #666; font-style: italic;">No active games.</p>`;
    
    let listHtml = `<div class="game-list">`;
    
    games.forEach(game => {
        const profit = game.totalRevenue - game.totalPrizes - game.printCost;
        const profitColor = profit >= 0 ? '#4CAF50' : '#ff4444';
        const stockPct = (game.inventory / game.totalPrinted) * 100;
        
        // Visual distinction for Pull Tabs
        const icon = type === 'scratch' ? '🎫' : '🎰';
        const subtext = type === 'scratch' 
            ? `Top Prize: $${game.topPrize.toLocaleString()}` 
            : `Margin: ${(game.profitMargin * 100)}%`;

        listHtml += `
            <div class="game-card" style="background: #16213e; border: 1px solid #444; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${profitColor};">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div>
                        <strong style="color: #f4d03f; font-size: 1.1em;">${icon} ${game.name}</strong>
                        <span style="background: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 10px;">$${game.price.toFixed(2)}</span>
                    </div>
                    <div style="color: ${profitColor}; font-weight: bold;">$${profit.toLocaleString()}</div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 0.8em; color: #ccc;">
                    <div>${subtext}</div>
                    <div>Sales: $${game.totalRevenue.toLocaleString()}</div>
                </div>
                
                <div style="margin-top: 10px; background: #000; height: 6px; border-radius: 3px; overflow: hidden;">
                    <div style="width: ${stockPct}%; background: #2196F3; height: 100%;"></div>
                </div>
                <div style="text-align: right; font-size: 0.7em; color: #666; margin-top: 2px;">${game.inventory.toLocaleString()} remaining</div>
            </div>
        `;
    });
    
    return listHtml + `</div>`;
}
function generateRandomGame() {
    // 1. Randomize Price ($1, $2, $5, $10, $20)
    const pricePoints = [1, 1, 1, 2, 2, 5, 5, 5, 10, 10, 20]; // Weighted to favor lower prices
    const price = pricePoints[Math.floor(Math.random() * pricePoints.length)];
    
    // 2. Name Generators
    const prefixes = [
        "Super", "Mega", "Ultra", "Lucky", "Golden", "Royal", "Neon", "Wild", 
        "Instant", "Ruby", "Diamond", "Emerald", "Sapphire", "Extreme", "Quick", 
        "Hot", "Cold", "Bonus", "Double", "Triple", "Max", "Iowa"
    ];
    
    const nouns = [
        "Cash", "Riches", "Gold", "Fortune", "Payout", "Bucks", "Bonanza", 
        "Jackpot", "Millions", "Winnings", "Rewards", "Loot", "Treasures", 
        "Moolah", "Bankroll", "Payday"
    ];
    
    const styles = ["Crossword", "Bingo", "Slots", "Blackjack", "Poker", "Roulette"];
    
    // 3. Special Theme Logic (Catchy Numbers)
    let name = "";
    let theme = "gold";
    let jackpot = 0;

    const roll = Math.random();
    
    if (roll < 0.2) {
        // TYPE A: "Lucky 7s" Style (Number Themed)
        const num = [7, 8, 9, 777][Math.floor(Math.random() * 4)];
        name = `Lucky ${num}s`;
        theme = num === 7 || num === 777 ? "red" : "neon";
        
        // Jackpot ends in the number (e.g., $7,777)
        jackpot = parseInt(`${num}${num}${num}${num}`); // 7777
        if (price >= 5) jackpot = parseInt(`${num}${num}${num}${num}${num}`); // 77777
        
    } else if (roll < 0.4) {
        // TYPE B: "Style" Game (Crossword/Bingo)
        const style = styles[Math.floor(Math.random() * styles.length)];
        const adj = prefixes[Math.floor(Math.random() * prefixes.length)];
        name = `${adj} ${style}`;
        theme = "blue";
        // Standard round jackpot
        jackpot = price * 2000; 
        
    } else if (roll < 0.6) {
        // TYPE C: "Specific Price" Name (e.g. "$500 Frenzy")
        // Use a realistic top prize as the name
        const targetPrize = price === 1 ? 500 : (price * 100);
        name = `$${targetPrize} Frenzy`;
        theme = "green";
        jackpot = targetPrize;
        
    } else {
        // TYPE D: Generic Catchy Name (Adjective + Noun)
        const p = prefixes[Math.floor(Math.random() * prefixes.length)];
        const n = nouns[Math.floor(Math.random() * nouns.length)];
        name = `${p} ${n}`;
        theme = ["gold", "green", "red", "blue", "neon"][Math.floor(Math.random() * 5)];
        // Random catchy jackpot
        jackpot = price * (1000 + Math.floor(Math.random() * 5000));
    }

    // 4. Ensure Jackpot constraints
    // Max jackpot is usually limited by price * quantity logic, so let's keep it safe
    // We cap it at $250k for basic games to be realistic
    if (jackpot > 250000) jackpot = 250000;
    
    // 5. Apply to UI
    document.getElementById('designName').value = name;
    document.getElementById('designPrice').value = price;
    document.getElementById('designTheme').value = theme;
    
    // Set Quantity based on price (Cheap games need more printed to be profitable)
    const qty = price === 1 ? 100000 : (price === 20 ? 20000 : 50000);
    document.getElementById('designQty').value = qty;
    
    // Set Jackpot
    // We have to set the max attribute first or the value might be clamped by HTML
    const maxRev = price * qty;
    document.getElementById('designJackpot').max = Math.floor(maxRev * 0.2); 
    document.getElementById('designJackpot').value = jackpot;
    
    // Randomize Payout slightly (60-75%)
    document.getElementById('designPayout').value = 60 + Math.floor(Math.random() * 15);
    
    // 6. Update Visuals
    updateTicketPreview();
}

function generateChains() {
    const counts = { GAS: 12, GROCERY: 5, BAR: 3 };
    const personalities = ['GREEDY', 'SKEPTICAL', 'EASYGOING', 'VOLUME_FOCUSED'];
    
    const chainTypes = {
        GAS: { type: 'GAS', icon: '⛽', setup: 2500, min: 20, max: 200 },
        GROCERY: { type: 'GROCERY', icon: '🛒', setup: 15000, min: 5, max: 50 },
        BAR: { type: 'BAR', icon: '🍺', setup: 1000, min: 10, max: 40 }
    };
    
    // Name Pools
    const names = {
        GAS: [
            "Kwik-Stop", "SpeedyMart", "Pump 'n Go", "FuelUp", "Metro Express", 
            "Road Ranger", "Casey's General", "Kum & Go", "Git-n-Go", "TravelCenters",
            "Pilot Flying J", "Love's Stop", "Sinclair", "Dino Mart", "Circle K", 
            "7-Eleven", "RaceTrac", "Sheetz", "Wawa", "QuikTrip"
        ],
        GROCERY: [
            "MegaMart", "FreshFoods", "Corner Market", "Super Saver", "Hy-Vee", 
            "Fareway", "Whole Earth", "Aldi's Choice", "Trader Joe's", "Publix", "Kroger"
        ],
        BAR: [
            "The Pub", "Joe's Grill", "Lucky's Lounge", "Buffalo Wilds", "The Library", 
            "Sports Column", "Brothers Bar", "Old Chicago", "Applebee's"
        ]
    };
    
    const chains = [];
    let idCounter = 0;

    // Helper to generate a chain
    function createChain(typeKey) {
        const typeObj = chainTypes[typeKey];
        const namePool = names[typeKey];
        
        // Pick a random name and remove it from the pool so we don't repeat
        const nameIndex = Math.floor(Math.random() * namePool.length);
        let name = namePool[nameIndex];
        
        // Remove used name from array (or use generic if pool empty)
        if (name) {
            namePool.splice(nameIndex, 1); 
        } else {
            name = `${typeObj.type} Chain ${idCounter}`;
        }

        // Randomize size
        const sizeMultiplier = 0.5 + Math.random() * 1.5; 
        const totalStores = Math.floor(
            (typeObj.min + Math.random() * (typeObj.max - typeObj.min)) * sizeMultiplier
        );

        // NEW: Assign Personality
        const personality = personalities[Math.floor(Math.random() * personalities.length)];
        
        chains.push({
            id: `chain_${idCounter++}`,
            name: name,
            type: typeObj.type,
            icon: typeObj.icon,
            totalStores: totalStores,
            activeStores: 0,
            tier: 0, 
            pullTabStores: 0,
            lottoMachines: 0,
            setupCostPerStore: typeObj.setup,
            
            // NEW RELATIONSHIP STATS
            personality: personality,
            relationship: 50, // Starts neutral
            contract: {
                commission: 0.05, // Default 5%
                exclusivity: false
            },
            history: [] // Track past deals
        });
    }

    // 2. Loop through and create them
    for (let i = 0; i < counts.GAS; i++) createChain('GAS');
    for (let i = 0; i < counts.GROCERY; i++) createChain('GROCERY');
    for (let i = 0; i < counts.BAR; i++) createChain('BAR');
    
    return chains;
}
function commitPullTabInstall() {
    const chain = GameState.chains.find(c => c.id === currentPtChainId);
    const qty = parseInt(document.getElementById('ptInstallQty').value);
    
    // NEW COST
    const cost = qty * 2500;
    
    if (qty === 0) return;
    
    if (GameState.budget < cost) {
        alert(`Insufficient funds. Need $${cost.toLocaleString()}`);
        return;
    }
    
    GameState.budget -= cost;
    GameState.financials.currentWeek.infrastructure += cost;
    chain.pullTabStores += qty;
    
    document.getElementById('pullTabMgmtModal').style.display = 'none';
    updateRetailerPage();
    updateAllUI(); // Refresh header budget
    alert(`Installed ${qty} Pull Tab machines in ${chain.name}.\nCost: $${cost.toLocaleString()}`);
}
function promoteChain(chainId) {
    const chain = GameState.chains.find(c => c.id === chainId);
    if (!chain) return;
    
    let cost = 0;
    let newStoreCount = 0;
    let actionName = "";
    
    // Determine Next Step
    if (chain.tier === 0) {
        // PITCH -> PILOT (5 Stores)
        actionName = "Launch Pilot Program";
        newStoreCount = Math.min(5, chain.totalStores);
        cost = newStoreCount * chain.setupCostPerStore + 5000; // +$5k Marketing Fee
    } else if (chain.tier === 1) {
        // PILOT -> REGIONAL (30% of stores)
        actionName = "Regional Expansion";
        newStoreCount = Math.floor(chain.totalStores * 0.30);
        cost = (newStoreCount - chain.activeStores) * chain.setupCostPerStore;
    } else if (chain.tier === 2) {
        // REGIONAL -> STATEWIDE (100% of stores)
        actionName = "Statewide Rollout";
        newStoreCount = chain.totalStores;
        cost = (newStoreCount - chain.activeStores) * chain.setupCostPerStore;
    }
    
    // Validation
    if (GameState.budget < cost) {
        alert(`Insufficient Budget! You need $${cost.toLocaleString()} for this expansion.`);
        return;
    }
    
    if (!confirm(`${actionName} with ${chain.name}?\n\n• New Stores: +${(newStoreCount - chain.activeStores)}\n• Cost: $${cost.toLocaleString()}`)) {
        return;
    }
    
    // Execute
    GameState.budget -= cost;
    chain.activeStores = newStoreCount;
    chain.tier += 1;
    
    // Add Event
    GameState.history.events.unshift({
        date: new Date(GameState.currentDate),
        dateString: formatDate(GameState.currentDate),
        title: `PARTNERSHIP EXPANDED: ${chain.name}`,
        description: `We have expanded operations to ${chain.activeStores} locations.`
    });
    
    updateAllUI();
}

function getTotalActiveStores() {
    // Sum of all active stores in all chains + 1 for HQ
    return GameState.chains.reduce((sum, chain) => sum + chain.activeStores, 0) + 1;
}
let currentNegotiation = null;

function openNegotiation(chainId) {
    const chain = GameState.chains.find(c => c.id === chainId);
    if (!chain) return;

    currentNegotiation = { chainId: chainId };
    
    // Determine the Goal
    let actionText = "";
    let baseCost = 0;
    
    if (chain.tier === 0) {
        actionText = "Pilot Program (5 Stores)";
        baseCost = 5 * chain.setupCostPerStore;
    } else if (chain.tier === 1) {
        actionText = "Regional Expansion (30% Stores)";
        const newCount = Math.floor(chain.totalStores * 0.3);
        baseCost = (newCount - chain.activeStores) * chain.setupCostPerStore;
    } else {
        actionText = "Statewide Saturation (100% Stores)";
        const newCount = chain.totalStores;
        baseCost = (newCount - chain.activeStores) * chain.setupCostPerStore;
    }
    
    currentNegotiation.baseCost = baseCost;
    
    // Populate UI
    document.getElementById('negChainName').innerText = `NEGOTIATION: ${chain.name.toUpperCase()}`;
    document.getElementById('negType').innerText = chain.type;
    document.getElementById('negPersonality').innerText = chain.personality;
    document.getElementById('negActionDisplay').innerText = actionText;
    
    // Personality Hints
    const hints = {
        'GREEDY': "Prioritizes Commission % above all else.",
        'SKEPTICAL': "Hates risk. Wants a large upfront Cash Bonus.",
        'VOLUME_FOCUSED': "Wants marketing support (lower setup fees, but high expectations).",
        'EASYGOING': "Easy to please, but gets annoyed if you lowball."
    };
    document.getElementById('negDesc').innerText = hints[chain.personality];
    
    // Reset Inputs
    document.getElementById('offerComm').value = 5;
    document.getElementById('offerBonus').value = Math.floor(baseCost * 0.1); // Default 10% bonus
    
    document.getElementById('negotiationModal').style.display = 'block';
    updateOfferStats();
}

function updateOfferStats() {
    if (!currentNegotiation) return;
    
    const comm = parseFloat(document.getElementById('offerComm').value);
    const bonus = parseInt(document.getElementById('offerBonus').value);
    const totalCost = currentNegotiation.baseCost + bonus;
    
    document.getElementById('offerCommDisplay').innerText = comm.toFixed(1) + "%";
    document.getElementById('offerBonusDisplay').innerText = "$" + bonus.toLocaleString();
    document.getElementById('negTotalCost').innerText = "$" + totalCost.toLocaleString();
    
    // Calculate Probability
    const chain = GameState.chains.find(c => c.id === currentNegotiation.chainId);
    let score = 50; // Base chance
    
    // 1. Commission Score
    const commDiff = comm - 5.0; // difference from standard
    if (chain.personality === 'GREEDY') score += commDiff * 25; // Huge swing for Greedy
    else score += commDiff * 15;
    
    // 2. Bonus Score
    // Compare bonus to the base setup cost
    const bonusRatio = bonus / currentNegotiation.baseCost;
    if (chain.personality === 'SKEPTICAL') score += bonusRatio * 100; // Loves cash
    else score += bonusRatio * 50;
    
    // 3. Relationship Base
    score += (chain.relationship - 50) * 0.5;
    
    // Clamp
    score = Math.min(95, Math.max(5, score));
    
    // Update Bar
    const bar = document.getElementById('acceptanceBar');
    bar.style.width = score + "%";
    bar.style.backgroundColor = score > 70 ? '#4CAF50' : (score > 40 ? '#f4d03f' : '#ff4444');
    document.getElementById('acceptanceText').innerText = Math.floor(score) + "%";
    
    currentNegotiation.winChance = score;
}

function closeNegotiation() {
    document.getElementById('negotiationModal').style.display = 'none';
}

function submitOffer() {
    const chain = GameState.chains.find(c => c.id === currentNegotiation.chainId);
    const comm = parseFloat(document.getElementById('offerComm').value);
    const bonus = parseInt(document.getElementById('offerBonus').value);
    const totalCost = currentNegotiation.baseCost + bonus;
    
    if (GameState.budget < totalCost) {
        alert("Insufficient funds for this offer!");
        return;
    }
    
    // Roll the dice
    const roll = Math.random() * 100;
    const success = roll < currentNegotiation.winChance;
    
    if (success) {
        // 1. DEDUCT BUDGET
        GameState.budget -= totalCost;
        if(GameState.financials && GameState.financials.currentWeek) {
            GameState.financials.currentWeek.infrastructure += totalCost;
        }

        // 2. ACTIVATE CHAIN (This was missing!)
        chain.active = true; // <--- CRITICAL FIX
        chain.contract.commission = comm / 100;
        
        // 3. SET INITIAL TIER
        // If they were Tier 0 (Unsigned), they become Tier 1 (Pilot)
        if (chain.tier === 0) {
            chain.tier = 1;
            chain.activeStores = 5; // Start with 5 pilot stores
        } 
        
        // Boost Relationship
        chain.relationship = Math.min(100, chain.relationship + 15);
        
        closeNegotiation();
        updateAllUI(); // Will now render the "Partner" view
        alert(`AGREEMENT REACHED!\n\n${chain.name} accepted your terms.\nStatus: ACTIVE PARTNER`);
        
    } else {
        // FAIL
        chain.relationship = Math.max(0, chain.relationship - 10);
        alert(`OFFER REJECTED.\n\n${chain.name} was not impressed.\nRelationship dropped to ${chain.relationship}.`);
        closeNegotiation();
    }
}
function openPullTabDesigner() {
    // Basic Madlib name generator for Pull Tabs
    const names = ["Cherry Bells", "Bar Room Gold", "Red Hot 7s", "Lucky Lager", "Pub Pennies", "Freedom Flyer"];
    document.getElementById('ptName').value = names[Math.floor(Math.random() * names.length)];
    document.getElementById('pullTabModal').style.display = 'block';
    updatePullTabStats();
}

function updatePullTabStats() {
    const qty = parseInt(document.getElementById('ptQty').value);
    const price = parseFloat(document.getElementById('ptPrice').value);
    const margin = parseFloat(document.getElementById('ptMargin').value);
    
    // Costs
    const printCost = qty * 0.02; // Cheaper to print than scratchers
    // Setup cost: Assumes we install machines in 50% of current retailers
    const activeRetailers = getTotalActiveStores();
    const machineCost = Math.max(2000, activeRetailers * 50); // $50 per store to install bracket
    
    // Revenue Est
    const totalRev = qty * price;
    const profit = totalRev * margin;
    
    document.getElementById('ptQtyDisplay').innerText = qty.toLocaleString();
    document.getElementById('ptPrintCost').innerText = `-$${printCost.toLocaleString()}`;
    document.getElementById('ptSetupCost').innerText = `-$${machineCost.toLocaleString()}`;
    
    // Estimate steady drip revenue
    const weeklyEst = (profit / 52) * 2; // Rough estimate
    document.getElementById('ptWeeklyProfit').innerText = `$${Math.floor(weeklyEst).toLocaleString()} / week`;
}

function publishPullTab() {
    const name = document.getElementById('ptName').value;
    const qty = parseInt(document.getElementById('ptQty').value);
    const price = parseFloat(document.getElementById('ptPrice').value);
    const margin = parseFloat(document.getElementById('ptMargin').value);
    
    // Calculate final costs
    const printCost = qty * 0.02;
    const activeRetailers = getTotalActiveStores();
    const machineCost = Math.max(2000, activeRetailers * 50); 
    const totalUpfront = printCost + machineCost;
    
    if (GameState.budget < totalUpfront) {
        alert(`Insufficient Funds. You need $${totalUpfront.toLocaleString()} for printing and dispenser installation.`);
        return;
    }
    
    GameState.budget -= totalUpfront;
    
    // Create Game Object
    // Note: Pull tabs don't use the complex "Jackpot" system. 
    // They use a simple "Margin" system because the prizes are small and fixed.
    const newGame = {
        id: 'pt_' + Date.now(),
        name: name,
        type: 'pulltab', // IMPORTANT: New type
        price: price,
        inventory: qty,
        totalPrinted: qty,
        totalSold: 0,
        profitMargin: margin, // Fixed profit margin (e.g., 0.25 means we keep 25 cents on the dollar)
        
        // Tracking
        totalRevenue: 0,
        totalPrizes: 0,
        printCost: totalUpfront,
        active: true,
        releaseDate: new Date(GameState.currentDate)
    };
    
    GameState.games.push(newGame);
    document.getElementById('pullTabModal').style.display = 'none';
    updateAllUI();
    showPage('games');
    alert(`${name} Dispatched! Dispensers are being installed in bars and stations.`);
}
function simulatePullTabs(holidayBoost) {
    const config = GameState.pullTabConfig;
    let totalMachineCount = 0;
    let totalHandle = 0; 
    
    // 1. Calculate Handle (Cash In) per Chain
    GameState.chains.forEach(chain => {
        if (chain.pullTabStores > 0) {
            totalMachineCount += chain.pullTabStores;
            
            // Rebalanced Handles (Weekly Cash In)
            let avgHandle = 0;
            if (chain.type === 'BAR') avgHandle = 2500;      
            else if (chain.type === 'GAS') avgHandle = 1000; 
            else if (chain.type === 'GROCERY') avgHandle = 150; 
            
            // Volume Logic: Higher payouts = more play time = higher volume
            // Base logic: If payout is 0.75, factor is ~1.4
            const playerSatisfaction = (config.payoutRate - 0.60) / 0.25; 
            const volumeFactor = 0.8 + (playerSatisfaction * 0.4);
            
            const chainHandle = chain.pullTabStores * avgHandle * volumeFactor * holidayBoost;
            
            // APPLY VARIANCE (20% Swing)
            // This prevents the number from being the same every week
            const actualHandle = applyVariance(chainHandle, 0.20);
            
            totalHandle += actualHandle;
        }
    });

    if (totalMachineCount === 0) return { handle: 0, payouts: 0, maintenance: 0, profit: 0 };
    
    GameState.pullTabConfig.active = true;

    // 2. Financial Breakdown
    // Payouts are calculated on the ACTUAL handle for this week
    const payouts = totalHandle * config.payoutRate;
    
    // Maintenance: $50 per machine (Paper, Lease, Service)
    const maintenance = totalMachineCount * 50; 
    
    return {
        handle: totalHandle,
        payouts: payouts, 
        maintenance: maintenance,
        profit: totalHandle - payouts - maintenance
    };
}
let currentLottoChainId = null;

function openLottoMgmt(chainId) {
    const chain = GameState.chains.find(c => c.id === chainId);
    if (!chain) return;
    
    currentLottoChainId = chainId;
    
    // UI Updates
    document.getElementById('lottoMgmtTitle').innerText = `SECURE INSTALL: ${chain.name.toUpperCase()}`;
    document.getElementById('lottoMgmtName').innerText = chain.name;
    
    // Slider Setup
    const available = chain.activeStores - chain.lottoMachines;
    const slider = document.getElementById('lottoInstallQty');
    slider.min = 0;
    slider.max = available;
    slider.value = 0;
    
    document.getElementById('lottoAvailable').innerText = `Available Locations: ${available}`;
    updateLottoInstallCalc();
    document.getElementById('lottoMgmtModal').style.display = 'block';
}

function updateLottoInstallCalc() {
    const qty = parseInt(document.getElementById('lottoInstallQty').value);
    
    const cost = qty * 10000; // $10k per machine
    const upkeep = qty * 10;  // $10/week upkeep
    
    document.getElementById('lottoInstallCount').innerText = `${qty} Terminals`;
    document.getElementById('lottoInstallCost').innerText = `-$${cost.toLocaleString()}`;
    document.getElementById('lottoInstallUpkeep').innerText = `-$${upkeep.toLocaleString()}/week`;
}

function commitLottoInstall() {
    const chain = GameState.chains.find(c => c.id === currentLottoChainId);
    const qty = parseInt(document.getElementById('lottoInstallQty').value);
    const cost = qty * 10000;
    
    if (qty === 0) return;
    
    if (GameState.budget < cost) {
        alert(`Insufficient funds. Security hardware is expensive!\nNeed $${cost.toLocaleString()}`);
        return;
    }
    
    // Deduct and Track
    GameState.budget -= cost;
    if(GameState.financials && GameState.financials.currentWeek) {
        GameState.financials.currentWeek.infrastructure += cost;
    }

    chain.lottoMachines += qty;
    
    document.getElementById('lottoMgmtModal').style.display = 'none';
    updateRetailerPage();
    updateAllUI();
    alert(`Authorized ${qty} Secure Terminals for ${chain.name}.\nCost: $${cost.toLocaleString()}`);
}
function openInstaplayDesigner() {
    if (GameState.office.tier < 2) {
        alert("TECHNOLOGY LOCKED\nRequires Tier 2 (Regional Ops)");
        return;
    }

    const modal = document.getElementById('instaplayModal');
    if (!modal) return;
    modal.style.display = 'block';
    
    // Attach listener to dropdown if not already done (safe to do here)
    document.getElementById('ipFlavor').onchange = updateInstaplayPreview;
    
    generateInstaplayName();
    updateInstaplayPreview(); // Run once to set initial state
}
function publishInstaplay() {
    const name = document.getElementById('ipName').value;
    const price = parseInt(document.getElementById('ipPrice').value);
    const startJackpot = parseInt(document.getElementById('ipBaseJackpot').value);
    const flavor = document.getElementById('ipFlavor').value;
    
    // NEW FIELDS
    const smallPct = parseInt(document.getElementById('ipSmallPct').value);
    const jackpotPct = parseInt(document.getElementById('ipJackpotPct').value);
    const odds = parseInt(document.getElementById('ipOdds').value);
    
    const devCost = 5000;
    const totalCost = devCost + startJackpot; 

    // Validation
    let totalTerminals = 0;
    GameState.chains.forEach(c => totalTerminals += (c.lottoMachines || 0));
    
    if (totalTerminals === 0) {
        alert("System Error: No Lotto Terminals detected!");
        return;
    }
    if (GameState.budget < totalCost) {
        alert(`Insufficient funds. Need $${totalCost.toLocaleString()}.`);
        return;
    }

    // Pay Upfront
    GameState.budget -= totalCost;
    if(GameState.financials && GameState.financials.currentWeek) {
        GameState.financials.currentWeek.printing += devCost; 
        GameState.financials.currentWeek.instaplayPayouts += startJackpot; 
    }

    const newGame = {
        id: 'ip_' + Date.now(),
        name: name,
        type: 'instaplay',
        flavor: flavor,
        price: price,
        
        // NEW MATH CONFIG
        smallPrizePct: smallPct,
        jackpotFundPct: jackpotPct,
        winOdds: odds,
        
        baseJackpot: startJackpot,
        currentJackpot: startJackpot,
        
        totalRevenue: 0,
        totalPrizes: 0,
        active: true,
        releaseDate: new Date(GameState.currentDate)
    };

    GameState.games.push(newGame);
    document.getElementById('instaplayModal').style.display = 'none';
    updateAllUI();
    showGameTab('lotto'); 
    alert(`${name} launched!\nOdds set to 1 in ${odds.toLocaleString()}.`);
}
function generateInstaplayName() {
    const prefixes = ["Cyber", "Digital", "Neon", "Quick", "Lightning", "Turbo", "Pixel", "Insta", "Flash", "Mega", "Hyper", "Electronic"];
    const nouns = ["Cash", "Gold", "Riches", "7s", "Payout", "Fortune", "Gems", "Jackpot", "Money", "Bucks", "Bank", "Win"];
    const suffixes = ["Pro", "X", "2000", "Plus", "Extreme", "Live", "Now"];

    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const n = nouns[Math.floor(Math.random() * nouns.length)];
    
    let name = `${p} ${n}`;
    if (Math.random() > 0.7) {
        const s = suffixes[Math.floor(Math.random() * suffixes.length)];
        name += ` ${s}`;
    }
    
    document.getElementById('ipName').value = name;
}
function simulateInstaplaySales(game, holidayBoost) {
    const sales = { revenue: 0, prizesPaid: 0, jackpotHit: false };

    // 1. Network Check
    let totalTerminals = 0;
    if (GameState.chains) {
        GameState.chains.forEach(c => totalTerminals += (c.lottoMachines || 0));
    }
    
    if (totalTerminals === 0) return sales;

    // 2. Determine Sales Volume
    let hype = 1.0;
    
    // Hype Logic (Progressive Only)
    if (game.flavor === 'progressive' && game.baseJackpot > 0) {
        const multiple = game.currentJackpot / game.baseJackpot;
        hype = Math.min(15, Math.max(1, multiple)); 
    }
    
    // --- BUG FIX IS HERE ---
    // We calculate Total Payout % by adding Small Prizes + Jackpot Funding
    // If those are missing (old save), we default to 65% total.
    const effectivePayout = (game.smallPrizePct || 60) + (game.jackpotFundPct || 5);
    
    // Quality Modifier: Range 0.9x to 1.1x impact based on generosity
    const quality = 1 + ((effectivePayout - 65) / 100); 
    // -----------------------

    const baseDemandPerTerminal = game.flavor === 'steady' ? 80 : 40;
    const rawDemand = totalTerminals * baseDemandPerTerminal;
    
    // Apply Multipliers
    let demand = rawDemand * hype * quality * holidayBoost;

    // Variance
    const ticketsSold = Math.floor(applyVariance(demand, 0.25));
    
    sales.revenue = ticketsSold * game.price;

    const smallRate = (game.smallPrizePct || 60) / 100;
    const smallPrizes = sales.revenue * smallRate;
    
    // LOGIC FIX: Force 0 contribution if steady
    let fundRate = (game.jackpotFundPct || 5) / 100;
    if (game.flavor === 'steady') fundRate = 0; 
    
    const potContribution = sales.revenue * fundRate;

    // 4. WIN CHECK
    const odds = game.winOdds || 10000;
    // Safety check for div by zero
    if (odds > 0) {
        const hitChance = ticketsSold / odds;
        if (Math.random() < hitChance) {
            sales.jackpotHit = true;
            const reseedCost = game.baseJackpot;
            sales.prizesPaid += reseedCost; 
            game.currentJackpot = game.baseJackpot;
        }
    }

    game.totalRevenue += sales.revenue;
    game.totalPrizes += sales.prizesPaid;

    return sales;
}   
function deleteGame(gameId) {
    const game = GameState.games.find(g => g.id === gameId);
    if (!game) return;

    if (!confirm(`Are you sure you want to decommission "${game.name}"?\n\nThis will permanently stop sales and remove it from the dashboard.`)) {
        return;
    }

    // Remove from the array
    GameState.games = GameState.games.filter(g => g.id !== gameId);
    
    // Refresh UI
    updateAllUI();
    // Force switch to lotto tab so you see it disappear
    showGameTab('lotto'); 
}
function updateInstaplayPreview() {
    const flavor = document.getElementById('ipFlavor').value;
    const desc = document.getElementById('ipFlavorDesc'); // Note: Make sure this ID exists in your HTML if using it
    
    // New Logic for Hiding
    const jackpotRow = document.getElementById('ipJackpotRow');
    
    if (flavor === 'steady') {
        // Hide the progressive slider
        if (jackpotRow) jackpotRow.style.display = 'none';
        
        // Force the value to 0 for calculations
        document.getElementById('ipJackpotPct').value = 0;
        
    } else {
        // Show the slider
        if (jackpotRow) jackpotRow.style.display = 'block';
        
        // Reset to default if it was 0
        if (document.getElementById('ipJackpotPct').value == 0) {
            document.getElementById('ipJackpotPct').value = 5;
        }
    }
    
    // Trigger the math update to refresh the text/stats
    updateInstaplayMath();
}
function updateInstaplayMath() {
    // 1. Get Values
    const smallPct = parseInt(document.getElementById('ipSmallPct').value);
    const jackpotPct = parseInt(document.getElementById('ipJackpotPct').value);
    const odds = parseInt(document.getElementById('ipOdds').value);
    const baseJackpot = parseInt(document.getElementById('ipBaseJackpot').value);
    
    // 2. Update Text Displays
    document.getElementById('dispSmall').innerText = smallPct + "%";
    document.getElementById('dispJackpot').innerText = jackpotPct + "%";
    document.getElementById('dispOdds').innerText = `1 in ${odds.toLocaleString()}`;
    
    // 3. RTP Calculation
    const totalRTP = smallPct + jackpotPct;
    const rtpEl = document.getElementById('calcRTP');
    rtpEl.innerText = totalRTP + "%";
    
    // Warn if unprofitable
    if (totalRTP > 95) rtpEl.style.color = "#ff4444"; // Losing money
    else if (totalRTP < 50) rtpEl.style.color = "#E91E63"; // Too greedy
    else rtpEl.style.color = "#4CAF50"; // Good
    
    // 4. Winner Frequency Prediction
    // Based on ACTUAL terminal count
    let totalTerminals = 0;
    if (GameState.chains) {
        GameState.chains.forEach(c => totalTerminals += (c.lottoMachines || 0));
    }
    
    // Estimate sales: 50 tix per machine per week average
    const estWeeklyTickets = Math.max(1, totalTerminals * 50); 
    const winnersPerWeek = estWeeklyTickets / odds;
    
    const winEl = document.getElementById('calcWinners');
    if (winnersPerWeek >= 1) {
        winEl.innerText = `${winnersPerWeek.toFixed(1)} / week`;
    } else {
        const weeksPerWin = 1 / winnersPerWeek;
        winEl.innerText = `Once every ${Math.round(weeksPerWin)} weeks`;
    }
    
    // 5. Cost
    const totalCost = 5000 + baseJackpot;
    document.getElementById('calcCost').innerText = `$${totalCost.toLocaleString()}`;
}
let currentPrizeTiers = [
    { name: "Jackpot", prize: 0, odds: 1000000, isJackpot: true }, // Dynamic prize
    { name: "Match 5", prize: 10000, odds: 50000, isJackpot: false },
    { name: "Match 4", prize: 100, odds: 500, isJackpot: false },
    { name: "Match 3", prize: 7, odds: 50, isJackpot: false }
];

function openDrawGameDesigner() {
    // LOCK CHECK
    if (GameState.office.tier < 3) {
        alert("BROADCAST LOCKED\n\nYour current facility does not have a secure studio environment.\n\nUpgrade to Tier 3 (State Headquarters) to launch TV Draw Games.");
        return;
    }
    
    document.getElementById('drawGameModal').style.display = 'block';
    renderPrizeTable();
}

function renderPrizeTable() {
    const tbody = document.getElementById('prizeTableBody');
    tbody.innerHTML = '';
    
    currentPrizeTiers.forEach((tier, index) => {
        const tr = document.createElement('tr');
        
        // Jackpot row is special (read only prize)
        const prizeInput = tier.isJackpot 
            ? `<span style="color:#9C27B0; font-weight:bold;">JACKPOT + Growth</span>`
            : `<input type="number" value="${tier.prize}" style="width:80px; padding:5px;" onchange="updateTier(${index}, 'prize', this.value)">`;
            
        const removeBtn = tier.isJackpot 
            ? `` 
            : `<button onclick="removePrizeTier(${index})" style="background:#ff4444; border:none; color:white; padding:2px 6px; cursor:pointer;">×</button>`;

        tr.innerHTML = `
            <td><input type="text" value="${tier.name}" style="width:100px; padding:5px;" onchange="updateTier(${index}, 'name', this.value)"></td>
            <td>${prizeInput}</td>
            <td>1 in <input type="number" value="${tier.odds}" style="width:80px; padding:5px;" onchange="updateTier(${index}, 'odds', this.value)"></td>
            <td>${removeBtn}</td>
        `;
        tbody.appendChild(tr);
    });
    
    updateDrawStats();
}

function addPrizeTier() {
    if (currentPrizeTiers.length >= 8) {
        alert("Maximum 8 prize tiers allowed.");
        return;
    }
    currentPrizeTiers.push({ name: "New Tier", prize: 10, odds: 100, isJackpot: false });
    renderPrizeTable();
}

function removePrizeTier(index) {
    currentPrizeTiers.splice(index, 1);
    renderPrizeTable();
}

function updateTier(index, field, value) {
    if (field === 'prize' || field === 'odds') value = parseInt(value);
    currentPrizeTiers[index][field] = value;
    updateDrawStats();
}

function updateDrawStats() {
    // 1. Calculate Overall Odds
    // Probability = Sum(1/odds)
    let totalProb = 0;
    let expectedReturn = 0; // For small prizes
    
    currentPrizeTiers.forEach(tier => {
        if (tier.odds > 0) {
            totalProb += (1 / tier.odds);
            if (!tier.isJackpot) {
                expectedReturn += (tier.prize * (1 / tier.odds));
            }
        }
    });
    
    const overallOdds = totalProb > 0 ? (1 / totalProb) : 0;
    
    // RTP % for fixed prizes (Ticket Price is usually $1 or $2, let's grab from UI)
    const price = parseInt(document.getElementById('drawPrice').value);
    const rtpPct = (expectedReturn / price) * 100;

    document.getElementById('calcDrawOdds').innerText = `1 in ${overallOdds.toFixed(1)}`;
    const rtpEl = document.getElementById('calcDrawRTP');
    rtpEl.innerText = `${rtpPct.toFixed(1)}%`;
    
    // Warn if RTP is too high (losing money on fixed prizes alone!)
    if (rtpPct > 90) rtpEl.style.color = '#ff4444';
    else rtpEl.style.color = '#fff';
}
function publishDrawGame() {
    const name = document.getElementById('drawName').value;
    if (!name) { alert("Please name your game."); return; }
    
    const price = parseInt(document.getElementById('drawPrice').value);
    const startJackpot = parseInt(document.getElementById('drawBaseJackpot').value);
    const freq = parseInt(document.getElementById('drawFreq').value);
    
    const setupCost = 50000; // Studio Setup
    const reserveCost = startJackpot; // Initial Jackpot Funding
    const totalCost = setupCost + reserveCost;

    if (GameState.budget < totalCost) {
        alert(`Insufficient funds. Need $${totalCost.toLocaleString()} (Studio + Jackpot Reserve).`);
        return;
    }

    GameState.budget -= totalCost;
    // Log Expense (Split between infrastructure and payouts)
    if(GameState.financials && GameState.financials.currentWeek) {
        GameState.financials.currentWeek.infrastructure += setupCost;
        GameState.financials.currentWeek.scratchPayouts += reserveCost; // Using scratch bucket for general payouts for now
    }

    const newGame = {
        id: 'draw_' + Date.now(),
        name: name,
        type: 'draw', // NEW TYPE
        price: price,
        drawFreq: freq, // Draws per week
        
        // Jackpot
        baseJackpot: startJackpot,
        currentJackpot: startJackpot,
        
        // Data
        tiers: JSON.parse(JSON.stringify(currentPrizeTiers)), // Deep copy
        
        // Stats
        totalRevenue: 0,
        totalPrizes: 0,
        active: true,
        releaseDate: new Date(GameState.currentDate)
    };

    GameState.games.push(newGame);
    document.getElementById('drawGameModal').style.display = 'none';
    updateAllUI();
    showGameTab('lotto');
    alert(`BROADCAST LIVE!\n${name} is now on air.`);
}
function simulateDrawGame(game, holidayBoost) {
    const stats = { revenue: 0, prizesPaid: 0, events: [] };
    
    const retailers = getTotalActiveStores();
    if (retailers === 0) return stats;
    
    // 1. CALCULATE HYPE (The Exponential Curve)
    const ratio = game.currentJackpot / game.baseJackpot;
    let hype = 1.0;

    if (ratio < 2) {
        // Normal Growth
        hype = ratio; 
    } else if (ratio < 10) {
        // Momentum Building (Power of 1.5)
        hype = Math.pow(ratio, 1.5);
    } else {
        // JACKPOT FEVER (Viral Status - Power of 2.2)
        // Once it passes 10x, people who don't gamble start buying
        hype = Math.pow(ratio, 2.2);
    }

    // Cap hype at 100x to prevent integer overflow/game breaking
    hype = Math.min(100, hype);

    // 2. BASE DEMAND
    const baseWeeklyTickets = retailers * 200;
    let totalDemand = baseWeeklyTickets * hype * holidayBoost;
    
    // 3. APPLY VARIANCE (15% Swing)
    const totalWeeklyTickets = Math.floor(applyVariance(totalDemand, 0.15));
    
    stats.revenue = totalWeeklyTickets * game.price;
    game.lastWeekSales = stats.revenue;
    
    // 4. DRAW PROCESS
    const ticketsPerDraw = Math.floor(totalWeeklyTickets / game.drawFreq);
    
    for (let i = 0; i < game.drawFreq; i++) {
        // A. Fixed Tiers
        game.tiers.forEach(tier => {
            if (!tier.isJackpot) {
                // Winners fluctuate too!
                const theoreticalWinners = ticketsPerDraw / tier.odds;
                const actualWinners = Math.floor(applyVariance(theoreticalWinners, 0.1));
                stats.prizesPaid += actualWinners * tier.prize;
            }
        });

        // B. Jackpot Growth
        const drawRevenue = ticketsPerDraw * game.price;
        const growth = drawRevenue * 0.30; 
        
        game.currentJackpot += growth;
        stats.prizesPaid += growth; 
        
        // C. Jackpot Win Check
        const jackpotTier = game.tiers.find(t => t.isJackpot);
        // Using raw odds here (no variance on the math check itself)
        const partialWinChance = (ticketsPerDraw / jackpotTier.odds);
        
        // Poisson-ish approximation for winning
        if (Math.random() < partialWinChance) {
            stats.events.push(`JACKPOT HIT! $${Math.floor(game.currentJackpot).toLocaleString()} won on ${game.name}`);
            stats.prizesPaid += game.baseJackpot; 
            game.currentJackpot = game.baseJackpot;
        }
    }
    
    game.totalRevenue += stats.revenue;
    game.totalPrizes += stats.prizesPaid;
    
    return stats;
}
function saveGame() {
    try {
        // 1. Serialize State
        const json = JSON.stringify(GameState, null, 2); // Pretty print for readability
        
        // 2. Create Blob
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        // 3. Generate Filename (e.g. "lottery_save_Week_12.json")
        const filename = `lottery_save_Week_${GameState.week}.json`;
        
        // 4. Trigger Download
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
    } catch (e) {
        console.error("Save export failed:", e);
        alert("Error: Could not generate save file.");
    }
}

function loadGameFromFile(inputElement) {
    const file = inputElement.files[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const json = e.target.result;
            
            // 1. Parse JSON with Date Reviver
            const parsedState = JSON.parse(json, (key, value) => {
                if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
                    return new Date(value);
                }
                return value;
            });

            // 2. Load State
            Object.assign(GameState, parsedState);

            // 3. Switch Screens
            document.getElementById('mainMenu').style.display = 'none';
            document.getElementById('gameScreen').style.display = 'block';
            
            // 4. Refresh UI
            updateAllUI();
            showPage('dashboard');
            
            // 5. Reset the input so you can load the same file again if needed
            inputElement.value = '';
            
            alert(`Game Loaded: Week ${GameState.week}`);

        } catch (err) {
            console.error("Load failed:", err);
            alert("Error: Invalid Save File.");
        }
    };

    reader.readAsText(file);
}

// Update Return to Menu to just go back (no check needed)
function returnToMenu() {
    if (confirm("Return to main menu? Unsaved progress will be lost.")) {
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
    }
}
const OFFICE_TIERS = [
    { 
        tier: 1, 
        name: "Administrative Office", 
        cost: 0, 
        upkeep: 2000, 
        maxGames: 5, 
        maxMachines: 0, 
        brandMult: 1.0,
        desc: "Unlocks Gas Stations (Scratchers Only)." 
    },
    { 
        tier: 2, 
        name: "Regional Operations", 
        cost: 40000, 
        upkeep: 8500, 
        maxGames: 12, 
        maxMachines: 250, 
        brandMult: 1.1, 
        desc: "Unlocks Bars (Pull Tabs) & Instaplay." 
    },
    { 
        tier: 3, 
        name: "State Headquarters", 
        cost: 150000, 
        upkeep: 25000, 
        maxGames: 40, 
        maxMachines: 2500, 
        brandMult: 1.25, 
        desc: "Unlocks Grocery Chains & TV Draws." 
    },
    { 
        tier: 4, 
        name: "Multi-State Commission", 
        cost: 1000000, 
        upkeep: 75000, 
        maxGames: 999, 
        maxMachines: 99999, 
        brandMult: 1.5, 
        desc: "Unlimited Capacity." 
    }
];
function openHQModal() {
    try {
        const modal = document.getElementById('hqModal');
        if (!modal) {
            console.error('HQ Modal element not found in DOM');
            return;
        }
        
        // Auto-fix for saves without office data
        if (!GameState.office) GameState.office = JSON.parse(JSON.stringify(OFFICE_TIERS[0]));

        const current = GameState.office;
        const tierConfig = OFFICE_TIERS.find(t => t.tier === current.tier) || OFFICE_TIERS[0];
        const nextTier = OFFICE_TIERS.find(t => t.tier === current.tier + 1);

        // 1. Status
        const hqName = document.getElementById('hqName');
        if (hqName) hqName.innerText = `Tier ${current.tier}: ${current.name}`;
        
        const hqUpkeep = document.getElementById('hqUpkeep');
        const upkeepAmount = current.baseUpkeep || current.upkeep || 0;
        if (hqUpkeep) hqUpkeep.innerText = `-$${upkeepAmount.toLocaleString()} / week`;
        
        const hqBonus = document.getElementById('hqBonus');
        if (hqBonus) hqBonus.innerText = `Brand Impact: ${tierConfig.brandMult}x Sales`;
        
        const hqTech = document.getElementById('hqTech');
        if (hqTech) hqTech.innerText = tierConfig.desc;
        
        // 2. Bars
        const activeGames = (GameState.games && Array.isArray(GameState.games)) ? GameState.games.filter(g => g.active).length : 0;
        const hqCapGames = document.getElementById('hqCapGames');
        if (hqCapGames) hqCapGames.innerText = `${activeGames} / ${current.maxGames}`;
        
        const hqBarGames = document.getElementById('hqBarGames');
        if (hqBarGames) hqBarGames.style.width = Math.min(100, (activeGames/current.maxGames)*100) + '%';
        
        let activeMachines = 0;
        if (GameState.chains && Array.isArray(GameState.chains)) {
            GameState.chains.forEach(c => activeMachines += (c.pullTabStores || 0) + (c.lottoMachines || 0));
        }
        const maxMach = current.maxMachines;
        
        const hqCapMachines = document.getElementById('hqCapMachines');
        if (hqCapMachines) hqCapMachines.innerText = `${activeMachines.toLocaleString()} / ${maxMach.toLocaleString()}`;
        
        // Handle 0/0 edge case for bar width
        const machPct = maxMach > 0 ? (activeMachines/maxMach)*100 : 100;
        const hqBarMachines = document.getElementById('hqBarMachines');
        if (hqBarMachines) hqBarMachines.style.width = Math.min(100, machPct) + '%';

        // 3. Upgrade
        const upgDiv = document.getElementById('hqUpgradeContainer');
        if (upgDiv && nextTier) {
            upgDiv.style.display = 'flex';
            const nextTierName = document.getElementById('nextTierName');
            if (nextTierName) nextTierName.innerText = `Tier ${nextTier.tier}: ${nextTier.name}`;
            
            const nextTierCost = document.getElementById('nextTierCost');
            if (nextTierCost) nextTierCost.innerText = `$${nextTier.cost.toLocaleString()}`;
            
            // Dynamic perks list
            let perks = `<li>Capacity: ${nextTier.maxGames} Games, ${nextTier.maxMachines.toLocaleString()} Terminals</li>`;
            perks += `<li>${nextTier.desc}</li>`;
            perks += `<li>Brand Impact: ${(nextTier.brandMult * 100) - 100}% Boost</li>`;
            
            const nextTierPerks = document.getElementById('nextTierPerks');
            if (nextTierPerks) nextTierPerks.innerHTML = perks;
            
            const btn = document.getElementById('btnUpgradeHQ');
            if (btn) {
                if (GameState.budget >= nextTier.cost) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                } else {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                }
            }
        } else if (upgDiv) {
            upgDiv.style.display = 'none';
        }

        modal.style.display = 'block';
        modal.style.visibility = 'visible';
    } catch (error) {
        console.error('Error in openHQModal:', error);
    }
}
function upgradeOffice() {
    const currentTier = GameState.office.tier;
    const nextTier = OFFICE_TIERS.find(t => t.tier === currentTier + 1);
    
    if (!nextTier || GameState.budget < nextTier.cost) return;
    
    GameState.budget -= nextTier.cost;
    
    // Apply properties
    GameState.office.tier = nextTier.tier;
    GameState.office.name = nextTier.name;
    GameState.office.baseUpkeep = nextTier.upkeep;
    GameState.office.maxGames = nextTier.maxGames;
    GameState.office.maxMachines = nextTier.maxMachines;
    GameState.office.brandMult = nextTier.brandMult; // <--- NEW
    
    openHQModal();
    updateAllUI();
    alert(`Expansion Complete!\nSales across the board will increase by ${((nextTier.brandMult-1)*100).toFixed(0)}%.`);
}