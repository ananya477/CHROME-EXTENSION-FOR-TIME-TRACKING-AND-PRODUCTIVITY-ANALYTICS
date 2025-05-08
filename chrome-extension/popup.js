// Add this at the top of the file
const DAILY_LIMITS = {
    unproductive: 120, // 2 hours in minutes
    warning: 90 // Warning at 1.5 hours
};

document.addEventListener('DOMContentLoaded', () => {
    loadAndUpdateDashboard();
    // Refresh data every 30 seconds instead of every second
    setInterval(loadAndUpdateDashboard, 30000);
});

function updateSiteList(timeData) {
    const siteList = document.getElementById('siteList');
    siteList.innerHTML = '';
    
    Object.entries(timeData)
        .sort(([_, a], [__, b]) => b.totalTime - a.totalTime)
        .forEach(([domain, data]) => {
            // Show minutes and seconds for more precise tracking
            const minutes = Math.floor(data.totalTime / 60000);
            const seconds = Math.floor((data.totalTime % 60000) / 1000);
            const row = document.createElement('tr');
            row.className = data.isProductive ? 'productive' : data.isUnproductive ? 'unproductive' : '';
            row.innerHTML = `
                <td>${domain}</td>
                <td>${minutes}m ${seconds}s</td>
            `;
            siteList.appendChild(row);
        });
}

function loadAndUpdateDashboard() {
    console.log('Loading dashboard'); // Debug log
    chrome.storage.local.get(['timeData'], (result) => {
        console.log('Time data:', result.timeData); // Debug log
        const timeData = result.timeData || {};
        updateDashboard(timeData);
    });
}

let currentChart = null;

function updateDashboard(timeData) {
    console.log('Updating dashboard with:', timeData);
    
    const productiveTime = Object.entries(timeData)
        .filter(([_, data]) => data.isProductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0);

    const unproductiveTime = Object.entries(timeData)
        .filter(([_, data]) => data.isUnproductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0);

    const neutralTime = Object.entries(timeData)
        .filter(([_, data]) => !data.isProductive && !data.isUnproductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0);

    // Destroy existing chart if it exists
    if (currentChart) {
        currentChart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById('productivityChart').getContext('2d');
    currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Productive', 'Unproductive', 'Neutral'],
            datasets: [{
                data: [
                    Math.round(productiveTime / 60000),
                    Math.round(unproductiveTime / 60000),
                    Math.round(neutralTime / 60000)
                ],
                backgroundColor: ['#4CAF50', '#F44336', '#9E9E9E']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Update remaining content
    updateSiteList(timeData);
}

function updateSiteList(timeData) {
    const siteList = document.getElementById('siteList');
    siteList.innerHTML = '';
    
    Object.entries(timeData)
        .sort(([_, a], [__, b]) => b.totalTime - a.totalTime)
        .forEach(([domain, data]) => {
            const minutes = Math.round(data.totalTime / 60000);
            const row = document.createElement('tr');
            row.className = data.isProductive ? 'productive' : data.isUnproductive ? 'unproductive' : '';
            row.innerHTML = `
                <td>${domain}</td>
                <td>${minutes} minutes</td>
            `;
            siteList.appendChild(row);
        });

    // Update time remaining
    const unproductiveTime = Object.entries(timeData)
        .filter(([_, data]) => data.isUnproductive)
        .reduce((acc, [_, data]) => acc + data.totalTime, 0);
    
    const minutesSpent = Math.round(unproductiveTime / 60000);
    const timeRemaining = Math.max(0, DAILY_LIMITS.unproductive - minutesSpent);
    document.getElementById('timeRemaining').textContent = timeRemaining;
}

function addProductivityStats(timeData) {
    const stats = calculateStats(timeData);
    const statsDiv = document.createElement('div');
    statsDiv.className = 'stats-container';
    statsDiv.innerHTML = `
        <h3>Daily Statistics</h3>
        <div class="stat-item">
            <span>Productivity Score:</span>
            <span>${stats.productivityScore}%</span>
        </div>
        <div class="stat-item">
            <span>Most Productive Hour:</span>
            <span>${stats.mostProductiveHour}</span>
        </div>
        <div class="stat-item">
            <span>Time Saved:</span>
            <span>${stats.timeSaved} minutes</span>
        </div>
    `;
    document.body.appendChild(statsDiv);
}


function addCustomCategory(domain, category) {
    chrome.storage.local.get(['customCategories'], (result) => {
        const customCategories = result.customCategories || {};
        customCategories[domain] = category;
        chrome.storage.local.set({ customCategories });
    });
}