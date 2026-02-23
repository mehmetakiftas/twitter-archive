import { 
    escapeHtml, 
    formatDate, 
    formatDateLong,
    formatTime,
    toggleSidebar, 
    setupSidebarToggle, 
    loadStats as loadStatsUtil 
} from './utils.js';

const API_BASE = '';

let currentYear = new Date().getFullYear();
let currentMonth = new Date().getMonth() + 1;
let calendarData = {};
let selectedDate = null;

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    await loadStats();
    await loadCalendar();
    setupEventListeners();
}

function setupEventListeners() {
    setupSidebarToggle();
    
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 1) {
            currentMonth = 12;
            currentYear--;
        }
        loadCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 12) {
            currentMonth = 1;
            currentYear++;
        }
        loadCalendar();
    });
    
    document.getElementById('closeDayPanel').addEventListener('click', () => {
        document.getElementById('dayPanel').classList.remove('active');
        selectedDate = null;
        renderCalendar();
    });
}

async function loadStats() {
    await loadStatsUtil('statsPanel');
}

async function loadCalendar() {
    updateMonthDisplay();
    
    try {
        const response = await fetch(
            `${API_BASE}/calendar?year=${currentYear}&month=${currentMonth}`
        );
        const data = await response.json();
        
        calendarData = {};
        data.forEach(item => {
            calendarData[item.date] = item.count;
        });
        
        renderCalendar();
    } catch (error) {
        console.error('Failed to load calendar:', error);
    }
}

function updateMonthDisplay() {
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    document.getElementById('currentMonth').textContent = 
        `${monthNames[currentMonth - 1]} ${currentYear}`;
}

function renderCalendar() {
    const container = document.getElementById('calendarDays');
    const firstDay = new Date(currentYear, currentMonth - 1, 1);
    const lastDay = new Date(currentYear, currentMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    let html = '';
    
    for (let i = 0; i < startingDay; i++) {
        html += '<div class="calendar-day empty"></div>';
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const count = calendarData[dateStr] || 0;
        const isToday = dateStr === todayStr;
        const isSelected = dateStr === selectedDate;
        
        let classes = 'calendar-day';
        if (isToday) classes += ' today';
        if (isSelected) classes += ' selected';
        
        html += `
            <div class="${classes}" data-date="${dateStr}">
                <span class="day-number">${day}</span>
                <span class="day-count ${count === 0 ? 'zero' : ''}">${count}</span>
            </div>
        `;
    }
    
    container.innerHTML = html;
    
    document.querySelectorAll('.calendar-day:not(.empty)').forEach(day => {
        day.addEventListener('click', () => {
            const date = day.dataset.date;
            selectDay(date);
        });
    });
}

async function selectDay(date) {
    selectedDate = date;
    renderCalendar();
    
    const panel = document.getElementById('dayPanel');
    const tweetsContainer = document.getElementById('dayTweets');
    
    document.getElementById('selectedDate').textContent = formatDateLong(date);
    panel.classList.add('active');
    tweetsContainer.innerHTML = '<div class="loading">Loading tweets...</div>';
    
    try {
        const response = await fetch(`${API_BASE}/calendar/day?date=${date}`);
        const tweets = await response.json();
        
        if (tweets.length === 0) {
            tweetsContainer.innerHTML = '<div class="no-tweets">No tweets on this day</div>';
            return;
        }
        
        tweetsContainer.innerHTML = tweets.map(tweet => `
            <div class="day-tweet-item">
                <div class="tweet-info">
                    <div class="tweet-author">
                        <a href="https://x.com/${escapeHtml(tweet.author_username)}" target="_blank" rel="noopener">
                            @${escapeHtml(tweet.author_username)}
                        </a>
                    </div>
                    <div class="tweet-preview">${escapeHtml(tweet.tweet_text_truncated || tweet.tweet_text || '')}</div>
                    <div class="tweet-time">${formatTime(tweet.tweet_created_at)}</div>
                </div>
                <a href="${escapeHtml(tweet.tweet_url)}" target="_blank" rel="noopener" class="btn-go-tweet">
                    Go to Tweet
                </a>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Failed to load day tweets:', error);
        tweetsContainer.innerHTML = '<div class="no-tweets">Failed to load tweets</div>';
    }
}

