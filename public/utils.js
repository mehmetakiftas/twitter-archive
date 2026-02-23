export function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

export function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

export function formatDateLong(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', { 
        weekday: 'long',
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
    });
}

export function formatTime(dateStr) {
    const date = new Date(dateStr);
    // Note: If you change TZ in .env, update this to match
    const timezone = 'Europe/Istanbul';
    return date.toLocaleTimeString('en-US', { 
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
    });
}

export function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

export async function loadStats(containerId) {
    const API_BASE = '';
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const stats = await response.json();
        
        const container = document.getElementById(containerId);
        let html = `
            <div class="stat-item">
                <span>Total Tweets</span>
                <span class="stat-value">${stats.totalTweetCount}</span>
            </div>
        `;
        
        if (stats.mostActiveDays && stats.mostActiveDays.length > 0) {
            const topDay = stats.mostActiveDays[0];
            html += `
                <div class="stat-item">
                    <span>Most Active Day</span>
                    <span class="stat-value">${formatDate(topDay.date)} (${topDay.count})</span>
                </div>
            `;
        }
        
        container.innerHTML = html;
        return stats.totalTweetCount;
    } catch (error) {
        console.error('Failed to load stats:', error);
        return 0;
    }
}

export function setupSidebarToggle() {
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const sidebarBtn = document.getElementById('sidebarToggle');
    
    if (mobileBtn) mobileBtn.addEventListener('click', toggleSidebar);
    if (sidebarBtn) sidebarBtn.addEventListener('click', toggleSidebar);
}

let widgetScriptLoaded = false;

export function loadTwitterWidgets() {
    if (window.twttr && window.twttr.widgets) {
        window.twttr.widgets.load();
    } else if (!widgetScriptLoaded) {
        widgetScriptLoaded = true;
        const script = document.createElement('script');
        script.src = 'https://platform.twitter.com/widgets.js';
        script.async = true;
        document.body.appendChild(script);
    }
}
