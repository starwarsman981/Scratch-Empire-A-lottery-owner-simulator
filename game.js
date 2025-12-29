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

const gameState = {
    budget: 50000,
    week: 1, 
    // ... rest of your state
};
const GameState = {
    // Calendar system - starting January 1, 2026
    currentDate: new Date(2026, 0, 1), // Jan 1, 2026
    week: 1,
    budget: 2000000,
    
    games: [],
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
    
    marketingCampaigns: [],
    
    stats: {
        weeklyRevenue: 0,
        totalRevenue: 0,
        totalPrizesPaid: 0,
        operatingCosts: 0,
        prizeReserves: 0,
        reputation: 0, // 0-100 scale
        playerCount: 0
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
    
    // Show week summary
    showWeekSummary(weekResults);
}

function simulateWeek(holiday) {
    const results = {
        revenue: 0,
        prizesPaid: 0,
        operatingCosts: 25000, // Base monthly overhead divided by weeks
        spending: 25000,
        netChange: 0,
        events: []
    };
    
    const holidayBoost = holiday ? holiday.boost : 1.0;
    
    // 1. Process Active Games
    GameState.games.forEach(game => {
        if (game.active && game.inventory > 0) {
            // Run sales calculation
            const gameStats = simulateGameSales(game, holidayBoost);
            
            // Add to Weekly Totals (For the Weekly Summary)
            results.revenue += gameStats.revenue;
            results.prizesPaid += gameStats.prizesPaid;
            
            // Notifications
            if (gameStats.bigWinner) {
                results.events.push({
                    title: `JACKPOT CLAIMED!`,
                    description: `A player won the $${game.topPrize.toLocaleString()} top prize on ${game.name}!`
                });
            }
            
            if (game.inventory < 5000) {
                results.events.push({
                    title: `Low Stock Warning`,
                    description: `${game.name} is nearly sold out (${game.inventory} left).`
                });
            }
        }
    });
    
    // 2. Retailer Simulation (Simplified for now)
    // Later we can track sales per retailer, for now they just enable sales
    
    // 3. Final Calculations
    results.netChange = results.revenue - results.prizesPaid - results.operatingCosts;
    
    return results;
}

function simulateGameSales(game, holidayBoost) {
    const sales = {
        revenue: 0,
        prizesPaid: 0,
        ticketsSold: 0,
        bigWinner: null
    };
    
    // 1. SALES VOLUME (Demand Logic)
    const retailerCount = GameState.retailers.length;
    let demand = retailerCount * 120 * holidayBoost; 
    
    // Marketing & Randomness
    const hasMarketing = GameState.marketingCampaigns.some(c => c.active && c.targetGame === game.id);
    if (hasMarketing) demand *= 1.5;
    const actualDemand = Math.floor(demand * (0.8 + Math.random() * 0.4));
    
    // Cap at inventory
    sales.ticketsSold = Math.min(actualDemand, game.inventory);
    sales.revenue = sales.ticketsSold * game.price;

    // 2. PRIZE SIMULATION (The Fix)
    
    // A. Small Prizes (Volatility Logic)
    if (sales.ticketsSold > 0 && game.prizePoolRemaining > 0) {
        // What % of the stack did we sell? 
        // If we sold 5% of the stack, we expect to pay out 5% of the remaining pool ON AVERAGE.
        const percentSold = sales.ticketsSold / game.inventory;
        const expectedPayout = game.prizePoolRemaining * percentSold;
        
        // VOLATILITY FACTOR
        // Real randomness: payout can swing widely week to week.
        // Factor between 0.0 (No winners found) and 2.5 (Tons of winners found)
        // We use a "bell curve-ish" random to make extreme values rarer
        const r1 = Math.random();
        const r2 = Math.random();
        const volatility = (r1 + r2) * 1.2; // Range roughly 0.0 to 2.4, centered on 1.2
        
        let actualSmallPayout = Math.floor(expectedPayout * volatility);
        
        // Safety cap: Can't pay out more than what's in the pool
        if (actualSmallPayout > game.prizePoolRemaining) {
            actualSmallPayout = game.prizePoolRemaining;
        }
        
        sales.prizesPaid += actualSmallPayout;
        
        // DEDUCT FROM POOL
        // This is key: If we overpaid this week, game.prizePoolRemaining shrinks faster,
        // making future weeks inherently more profitable (regression to mean).
        game.prizePoolRemaining -= actualSmallPayout;
    }

    // B. Jackpot Logic (Separate Event)
    // Jackpots are not part of the small prize pool simulation, they are discrete events.
    if (game.jackpotsRemaining > 0 && sales.ticketsSold > 0) {
        // Chance relative to stack depth
        const oddsPerTicket = game.jackpotsRemaining / game.inventory;
        
        // Simulate "Was the jackpot in this batch of sold tickets?"
        // We use a random check against the total batch probability
        if (Math.random() < (oddsPerTicket * sales.ticketsSold)) {
            sales.bigWinner = game.topPrize;
            sales.prizesPaid += game.topPrize;
            game.jackpotsRemaining--;
        }
    }

    // 3. Update History
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
    if (typeof updateRetailersPage === 'function') {
        try { updateRetailersPage(); } catch(e) { console.error("Retailer UI error:", e); }
    }
    
    if (typeof updateAnalyticsPage === 'function') {
        try { updateAnalyticsPage(); } catch(e) { console.error("Analytics UI error:", e); }
    }
    
    if (typeof updateNewsPage === 'function') {
        try { updateNewsPage(); } catch(e) { console.error("News UI error:", e); }
    }
}

// =====================================================
// PLACEHOLDER FUNCTIONS
// (These prevent crashes until you build the real features)
// =====================================================

function updateRetailersPage() {
    // Logic for retailers will go here later
    // For now, update the basic count in the dashboard if needed
    const retailerCount = GameState.retailers.length;
    // We can add simple logic here later
}

function updateAnalyticsPage() {
    // Logic for graphs will go here later
}

function updateNewsPage() {
    // Logic for news feed will go here later
}

function updateDashboard() {
    // Basic dashboard stat updates
    // Update the "Quick Stats" cards on the main dashboard
    const moneyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
    
    // 1. Budget
    const budgetEls = document.querySelectorAll('.quick-stat-value');
    if (budgetEls.length > 0) budgetEls[0].textContent = `$${(GameState.budget / 1000000).toFixed(2)}M`;
    
    // 2. Active Games
    const activeGames = GameState.games.filter(g => g.active).length;
    if (budgetEls.length > 1) budgetEls[1].textContent = activeGames;
    
    // 3. Retailers
    if (budgetEls.length > 2) budgetEls[2].textContent = GameState.retailers.length;
    
    // 4. Weekly Revenue
    if (budgetEls.length > 3) budgetEls[3].textContent = moneyFormatter.format(GameState.stats.weeklyRevenue);
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
    
    // Initialize UI
    updateAllUI();
    showPage('dashboard');
}

function returnToMenu() {
    if (confirm("Return to main menu? Unsaved progress will be lost.")) {
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('mainMenu').style.display = 'flex';
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
    console.log("Updating Games Page..."); // Debug check
    
    const container = document.querySelector('#lottery-tab .page-section');
    if (!container) {
        console.error("Could not find the game list container!");
        return;
    }
    
    const scratchGames = GameState.games.filter(g => g.type === 'scratch');
    
    let html = `<h3>Active Scratch Tickets</h3>`;
    
    if (scratchGames.length === 0) {
        html += `
            <div style="padding: 20px; background: #16213e; border: 1px dashed #444; text-align: center; color: #888;">
                No games active. Click "Create New Scratch Ticket" to start printing money!
            </div>`;
    } else {
        html += `<div class="game-list">`;
        
        scratchGames.forEach(game => {
            // Calculate Profit
            const profit = game.totalRevenue - game.totalPrizes - game.printCost;
            const profitColor = profit >= 0 ? '#4CAF50' : '#ff4444';
            
            // Calculate Stock %
            const stockPct = (game.inventory / game.totalPrinted) * 100;
            const stockColor = stockPct < 20 ? '#ff4444' : '#f4d03f';
            
            html += `
            <div class="game-card" style="background: #16213e; border: 1px solid #444; padding: 15px; margin-bottom: 15px; border-left: 4px solid ${profitColor};">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px; border-bottom: 1px solid #333; padding-bottom: 10px;">
                    <div>
                        <strong style="color: #f4d03f; font-size: 1.2em;">${game.name}</strong>
                        <span style="background: #000; padding: 2px 6px; border-radius: 4px; font-size: 0.8em; margin-left: 10px;">$${game.price}</span>
                    </div>
                    <div style="text-align: right;">
                        <div style="color: #aaa; font-size: 0.8em;">NET PROFIT</div>
                        <div style="color: ${profitColor}; font-weight: bold;">$${profit.toLocaleString()}</div>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; font-size: 0.9em;">
                    <div>
                        <div style="color: #aaa; margin-bottom: 5px;">STOCK LEVEL</div>
                        <div style="background: #000; height: 10px; border-radius: 5px; overflow: hidden; margin-bottom: 5px;">
                            <div style="width: ${stockPct}%; background: ${stockColor}; height: 100%;"></div>
                        </div>
                        <div style="font-size: 0.8em;">${game.inventory.toLocaleString()} / ${game.totalPrinted.toLocaleString()}</div>
                    </div>

                    <div>
                        <div style="color: #aaa; margin-bottom: 5px;">FINANCIALS</div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Sales:</span> <span style="color: #fff;">$${game.totalRevenue.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Paid Out:</span> <span style="color: #ff9800;">-$${game.totalPrizes.toLocaleString()}</span>
                        </div>
                    </div>

                    <div style="text-align: right;">
                        <div style="color: #aaa; margin-bottom: 5px;">JACKPOTS ($${game.topPrize.toLocaleString()})</div>
                        <div style="font-size: 1.5em; font-weight: bold; color: ${game.jackpotsRemaining > 0 ? '#fff' : '#444'};">
                            ${game.jackpotsRemaining} <span style="font-size: 0.6em; color: #666;">/ ${game.jackpotsTotal}</span>
                        </div>
                        ${game.jackpotsRemaining === 0 ? '<span style="color: #ff4444; font-size: 0.8em;">SOLD OUT</span>' : ''}
                    </div>
                </div>
            </div>`;
        });
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
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