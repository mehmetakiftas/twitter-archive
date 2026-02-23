import { 
    escapeHtml, 
    formatDate, 
    toggleSidebar, 
    setupSidebarToggle, 
    loadStats as loadStatsUtil,
    loadTwitterWidgets 
} from './utils.js';

const API_BASE = '';

let currentPage = 0;
const PAGE_SIZE = 8;
let totalTweets = 0;
let currentCategoryId = null;
let currentSearch = '';
let currentStartDate = '';
let currentEndDate = '';
let categories = [];
let tweetToDelete = null;
let tweetToEditCategories = null;
let existingTweetId = null;
let pendingTweetUrl = null;
let categoryToRename = null;

document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    setupEventListeners();
    loadTwitterWidgets();
    
    await Promise.all([
        loadCategories(),
        loadStats(),
        loadTweets()
    ]);
}

function setupEventListeners() {
    setupSidebarToggle();
    
    document.getElementById('searchBtn').addEventListener('click', handleSearch);
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    document.getElementById('applyFilters').addEventListener('click', applyDateFilters);
    document.getElementById('clearFilters').addEventListener('click', clearFilters);
    
    document.getElementById('exportBtn').addEventListener('click', handleExport);
    document.getElementById('addTweetBtn').addEventListener('click', () => openModal('addTweetModal'));
    document.getElementById('closeAddTweetModal').addEventListener('click', () => closeModal('addTweetModal'));
    document.getElementById('cancelAddTweet').addEventListener('click', () => closeModal('addTweetModal'));
    document.getElementById('submitTweet').addEventListener('click', submitTweet);
    
    document.getElementById('addCategoryBtn').addEventListener('click', () => openModal('addCategoryModal'));
    document.getElementById('closeAddCategoryModal').addEventListener('click', () => closeModal('addCategoryModal'));
    document.getElementById('cancelAddCategory').addEventListener('click', () => closeModal('addCategoryModal'));
    document.getElementById('submitCategory').addEventListener('click', submitCategory);
    document.getElementById('categoryName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitCategory();
    });
    
    document.getElementById('closeRenameCategoryModal').addEventListener('click', () => closeModal('renameCategoryModal'));
    document.getElementById('cancelRenameCategory').addEventListener('click', () => closeModal('renameCategoryModal'));
    document.getElementById('submitRenameCategory').addEventListener('click', submitRenameCategory);
    document.getElementById('renameCategoryName').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') submitRenameCategory();
    });
    
    document.getElementById('closeEditCategoriesModal').addEventListener('click', () => closeModal('editCategoriesModal'));
    document.getElementById('cancelEditCategories').addEventListener('click', () => closeModal('editCategoriesModal'));
    document.getElementById('saveCategories').addEventListener('click', saveCategories);
    
    document.getElementById('closeConfirmDeleteModal').addEventListener('click', () => closeModal('confirmDeleteModal'));
    document.getElementById('cancelDelete').addEventListener('click', () => closeModal('confirmDeleteModal'));
    document.getElementById('confirmDelete').addEventListener('click', confirmDeleteTweet);
    
    document.getElementById('closeExistingTweetModal').addEventListener('click', () => closeModal('existingTweetModal'));
    document.getElementById('cancelExisting').addEventListener('click', () => closeModal('existingTweetModal'));
    document.getElementById('confirmExisting').addEventListener('click', confirmAddToCategories);

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const activeModal = document.querySelector('.modal.active');
            if (activeModal) {
                closeModal(activeModal.id);
            }
        }
    });
}

async function loadCategories(forceFetch = false) {
    try {
        if (!forceFetch) {
            const cached = localStorage.getItem('categories');
            const cacheTime = localStorage.getItem('categories_timestamp');
            
            if (cached && cacheTime) {
                const age = Date.now() - parseInt(cacheTime);
                if (age < 60000) {
                    categories = JSON.parse(cached);
                    renderCategoryList();
                    renderModalCategories();
                    return;
                }
            }
        }
        
        const response = await fetch(`${API_BASE}/categories`);
        categories = await response.json();
        
        localStorage.setItem('categories', JSON.stringify(categories));
        localStorage.setItem('categories_timestamp', Date.now().toString());
        
        renderCategoryList();
        renderModalCategories();
    } catch (error) {
        console.error('Failed to load categories:', error);
        
        const cached = localStorage.getItem('categories');
        if (cached) {
            categories = JSON.parse(cached);
            renderCategoryList();
            renderModalCategories();
        }
    }
}

function renderCategoryList() {
    const container = document.getElementById('categoryList');
    
    const allTweetsItem = document.createElement('div');
    allTweetsItem.className = `category-item ${currentCategoryId === null ? 'active' : ''}`;
    allTweetsItem.innerHTML = `
        <span>All Tweets</span>
        <span class="count">${totalTweets}</span>
    `;
    allTweetsItem.addEventListener('click', () => {
        currentCategoryId = null;
        currentPage = 0;
        loadTweets();
        renderCategoryList();
    });
    
    container.innerHTML = '';
    container.appendChild(allTweetsItem);
    
    categories.forEach(cat => {
        const item = document.createElement('div');
        item.className = `category-item ${currentCategoryId === cat.id ? 'active' : ''}`;
        item.innerHTML = `
            <span class="category-name">${escapeHtml(cat.name)}</span>
            <div style="display: flex; align-items: center; gap: 0.5rem;">
                <span class="count">${cat.tweet_count || 0}</span>
                <div class="category-actions">
                    <button class="category-rename" data-id="${cat.id}" data-name="${escapeHtml(cat.name)}" title="Rename category">✏️</button>
                    <button class="category-delete" data-id="${cat.id}" title="Delete category">×</button>
                </div>
            </div>
        `;
        
        item.querySelector('.category-name').addEventListener('click', () => {
            currentCategoryId = cat.id;
            currentPage = 0;
            loadTweets();
            renderCategoryList();
        });
        
        item.querySelector('.category-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            openRenameCategoryModal(cat.id, cat.name);
        });
        
        item.querySelector('.category-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteCategory(cat.id);
        });
        
        container.appendChild(item);
    });
}

function renderModalCategories() {
    const containers = ['modalCategoryList', 'editCategoryList', 'existingCategoryList'];
    
    containers.forEach(containerId => {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = categories.map(cat => `
            <label class="checkbox-item">
                <input type="checkbox" value="${cat.id}" />
                <span>${escapeHtml(cat.name)}</span>
            </label>
        `).join('');
    });
}

async function loadStats() {
    totalTweets = await loadStatsUtil('statsPanel');
    renderCategoryList();
}

async function loadTweets() {
    const container = document.getElementById('tweetsContainer');
    container.innerHTML = '<div class="loading">Loading tweets...</div>';
    
    try {
        const params = new URLSearchParams({
            limit: PAGE_SIZE,
            offset: currentPage * PAGE_SIZE
        });
        
        if (currentCategoryId) params.append('category_id', currentCategoryId);
        if (currentSearch) params.append('search', currentSearch);
        if (currentStartDate) params.append('start_date', currentStartDate);
        if (currentEndDate) params.append('end_date', currentEndDate + 'T23:59:59');
        
        const response = await fetch(`${API_BASE}/tweets?${params}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        
        totalTweets = data.total || 0;
        renderTweets(data.tweets || []);
        renderPagination(data.total || 0);
    } catch (error) {
        console.error('Failed to load tweets:', error);
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><h2>Failed to load tweets</h2><p>Please try again later.</p></div>';
    }
}

function renderTweets(tweets) {
    const container = document.getElementById('tweetsContainer');
    
    if (!tweets || tweets.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <h2>No tweets found</h2>
                <p>Add your first tweet to get started!</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = tweets.map(tweet => `
        <div class="tweet-card" data-id="${tweet.id}">
            <div class="tweet-actions">
                <button class="tweet-action-btn edit-categories" data-id="${tweet.id}" title="Edit categories">🏷️</button>
                <button class="tweet-action-btn delete" data-id="${tweet.id}" title="Delete tweet">🗑️</button>
            </div>
            <div class="tweet-embed">
                ${tweet.embed_html}
            </div>
            <div class="tweet-categories">
                ${tweet.categories && tweet.categories.length > 0 
                    ? tweet.categories.map(cat => `<span class="category-badge">${escapeHtml(cat.name)}</span>`).join('')
                    : '<span class="no-categories">No categories</span>'
                }
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.tweet-action-btn.delete').forEach(btn => {
        btn.addEventListener('click', () => {
            tweetToDelete = btn.dataset.id;
            openModal('confirmDeleteModal');
        });
    });
    
    document.querySelectorAll('.tweet-action-btn.edit-categories').forEach(btn => {
        btn.addEventListener('click', () => {
            const tweetId = btn.dataset.id;
            const tweet = tweets.find(t => t.id === tweetId);
            openEditCategoriesModal(tweet);
        });
    });
    
    loadTwitterWidgets();
}

function renderPagination(total) {
    const container = document.getElementById('pagination');
    const totalPages = Math.ceil(total / PAGE_SIZE);
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    container.innerHTML = `
        <button id="prevPage" ${currentPage === 0 ? 'disabled' : ''}>← Previous</button>
        <span class="page-info">Page ${currentPage + 1} of ${totalPages}</span>
        <button id="nextPage" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Next →</button>
    `;
    
    document.getElementById('prevPage').addEventListener('click', () => {
        if (currentPage > 0) {
            currentPage--;
            loadTweets();
            window.scrollTo(0, 0);
        }
    });
    
    document.getElementById('nextPage').addEventListener('click', () => {
        if (currentPage < totalPages - 1) {
            currentPage++;
            loadTweets();
            window.scrollTo(0, 0);
        }
    });
}

function handleSearch() {
    currentSearch = document.getElementById('searchInput').value.trim();
    currentPage = 0;
    loadTweets();
}

function applyDateFilters() {
    currentStartDate = document.getElementById('startDate').value;
    currentEndDate = document.getElementById('endDate').value;
    currentPage = 0;
    loadTweets();
}

function clearFilters() {
    currentSearch = '';
    currentStartDate = '';
    currentEndDate = '';
    currentCategoryId = null;
    currentPage = 0;
    
    document.getElementById('searchInput').value = '';
    document.getElementById('startDate').value = '';
    document.getElementById('endDate').value = '';
    
    loadTweets();
    renderCategoryList();
}

async function handleExport() {
    const btn = document.getElementById('exportBtn');
    const originalText = btn.textContent;
    
    try {
        btn.disabled = true;
        btn.textContent = 'Exporting...';
        
        const response = await fetch(`${API_BASE}/export`);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `twitter-archive-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        btn.textContent = '✓ Exported';
        setTimeout(() => {
            btn.textContent = originalText;
        }, 2000);
    } catch (error) {
        console.error('Failed to export:', error);
        alert('Failed to export tweets: ' + error.message);
        btn.textContent = originalText;
    } finally {
        btn.disabled = false;
    }
}

async function submitTweet() {
    const urlInput = document.getElementById('tweetUrl');
    const errorDiv = document.getElementById('addTweetError');
    const successDiv = document.getElementById('addTweetSuccess');
    const submitBtn = document.getElementById('submitTweet');
    
    const tweetUrl = urlInput.value.trim();
    
    if (!tweetUrl) {
        showError(errorDiv, 'Please enter a tweet URL');
        return;
    }
    
    const selectedCategories = Array.from(
        document.querySelectorAll('#modalCategoryList input:checked')
    ).map(input => input.value);
    
    submitBtn.disabled = true;
    submitBtn.textContent = 'Archiving...';
    hideMessages();
    
    try {
        const response = await fetch(`${API_BASE}/tweets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tweet_url: tweetUrl,
                category_ids: selectedCategories
            })
        });
        
        const data = await response.json();
        
        if (response.status === 409 && data.existed) {
            existingTweetId = data.existing_tweet_id;
            pendingTweetUrl = tweetUrl;
            closeModal('addTweetModal');
            openModal('existingTweetModal');
            return;
        }
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to archive tweet');
        }
        
        showSuccess(successDiv, 'Tweet archived successfully!');
        urlInput.value = '';
        document.querySelectorAll('#modalCategoryList input:checked').forEach(input => {
            input.checked = false;
        });
        
        await loadTweets();
        await loadCategories(true);
        await loadStats();
        
        setTimeout(() => {
            closeModal('addTweetModal');
            hideMessages();
        }, 1500);
        
    } catch (error) {
        showError(errorDiv, error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Archive Tweet';
    }
}

async function confirmAddToCategories() {
    const selectedCategories = Array.from(
        document.querySelectorAll('#existingCategoryList input:checked')
    ).map(input => input.value);
    
    if (selectedCategories.length === 0) {
        closeModal('existingTweetModal');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/tweets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tweet_url: pendingTweetUrl,
                category_ids: selectedCategories,
                force_add: true
            })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to update categories');
        }
        
        closeModal('existingTweetModal');
        await loadTweets();
        await loadCategories(true);
        
    } catch (error) {
        console.error('Failed to add to categories:', error);
    } finally {
        existingTweetId = null;
        pendingTweetUrl = null;
    }
}

async function submitCategory() {
    const nameInput = document.getElementById('categoryName');
    const errorDiv = document.getElementById('addCategoryError');
    
    const name = nameInput.value.trim();
    
    if (!name) {
        showError(errorDiv, 'Please enter a category name');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to create category');
        }
        
        nameInput.value = '';
        closeModal('addCategoryModal');
        await loadCategories(true);
        
    } catch (error) {
        showError(errorDiv, error.message);
    }
}

function openRenameCategoryModal(categoryId, currentName) {
    categoryToRename = categoryId;
    document.getElementById('renameCategoryName').value = currentName;
    openModal('renameCategoryModal');
}

async function submitRenameCategory() {
    const nameInput = document.getElementById('renameCategoryName');
    const errorDiv = document.getElementById('renameCategoryError');
    
    const name = nameInput.value.trim();
    
    if (!name) {
        showError(errorDiv, 'Please enter a category name');
        return;
    }
    
    if (!categoryToRename) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/categories/${categoryToRename}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });
        
        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to rename category');
        }
        
        closeModal('renameCategoryModal');
        await loadCategories(true);
        await loadTweets();
        
    } catch (error) {
        showError(errorDiv, error.message);
    } finally {
        categoryToRename = null;
    }
}

async function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category? Tweets will not be deleted.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/categories/${categoryId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete category');
        }
        
        if (currentCategoryId === categoryId) {
            currentCategoryId = null;
        }
        
        await loadCategories(true);
        await loadTweets();
        
    } catch (error) {
        console.error('Failed to delete category:', error);
    }
}

function openEditCategoriesModal(tweet) {
    tweetToEditCategories = tweet;
    
    const checkboxes = document.querySelectorAll('#editCategoryList input');
    checkboxes.forEach(checkbox => {
        checkbox.checked = tweet.categories?.some(cat => cat.id === checkbox.value) || false;
    });
    
    openModal('editCategoriesModal');
}

async function saveCategories() {
    if (!tweetToEditCategories) return;
    
    const selectedCategories = Array.from(
        document.querySelectorAll('#editCategoryList input:checked')
    ).map(input => input.value);
    
    try {
        const response = await fetch(`${API_BASE}/tweets/${tweetToEditCategories.id}/categories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category_ids: selectedCategories })
        });
        
        if (!response.ok) {
            throw new Error('Failed to update categories');
        }
        
        closeModal('editCategoriesModal');
        await loadTweets();
        await loadCategories(true);
        
    } catch (error) {
        console.error('Failed to save categories:', error);
    } finally {
        tweetToEditCategories = null;
    }
}

async function confirmDeleteTweet() {
    if (!tweetToDelete) return;
    
    try {
        const response = await fetch(`${API_BASE}/tweets/${tweetToDelete}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            throw new Error('Failed to delete tweet');
        }
        
        closeModal('confirmDeleteModal');
        await loadTweets();
        await loadStats();
        await loadCategories(true);
        
    } catch (error) {
        console.error('Failed to delete tweet:', error);
    } finally {
        tweetToDelete = null;
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    hideMessages();
}

function showError(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function showSuccess(element, message) {
    element.textContent = message;
    element.classList.add('show');
}

function hideMessages() {
    document.querySelectorAll('.error-message, .success-message').forEach(el => {
        el.classList.remove('show');
    });
}

