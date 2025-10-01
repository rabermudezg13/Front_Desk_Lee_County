/*
Copyright (c) 2025 Rodrigo Bermudez Cafe Cultura LLC
All rights reserved.
*/

// ADMIN STATISTICS DASHBOARD

class AdminDashboard {
    constructor(db) {
        this.db = db;
        this.charts = {};
        this.filters = {
            dateRange: 'today',
            visitType: 'all',
            recruiter: 'all'
        };
        this.data = {
            visits: [],
            completions: [],
            fingerprints: [],
            orientations: []
        };
    }

    async init() {
        await this.loadData();
        this.renderDashboard();
        this.setupEventListeners();
        this.setupRealtimeUpdates();
    }

    async loadData() {
        try {
            const dateRange = this.getDateRange();
            
            // Load visits data
            const visitsQuery = this.db.collection('visits')
                .where('timestamp', '>=', dateRange.start)
                .where('timestamp', '<=', dateRange.end)
                .orderBy('timestamp', 'desc');
            
            const visitsSnapshot = await visitsQuery.get();
            this.data.visits = visitsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Load document completions
            const completionsQuery = this.db.collection('document-completions')
                .where('timestamp', '>=', dateRange.start)
                .where('timestamp', '<=', dateRange.end)
                .orderBy('timestamp', 'desc');
            
            const completionsSnapshot = await completionsQuery.get();
            this.data.completions = completionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Load fingerprints (if collection exists)
            try {
                const fingerprintsQuery = this.db.collection('fingerprints')
                    .where('timestamp', '>=', dateRange.start)
                    .where('timestamp', '<=', dateRange.end)
                    .orderBy('timestamp', 'desc');
                
                const fingerprintsSnapshot = await fingerprintsQuery.get();
                this.data.fingerprints = fingerprintsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.log('Fingerprints collection not found or no data');
                this.data.fingerprints = [];
            }

            // Load orientations (if collection exists)
            try {
                const orientationsQuery = this.db.collection('orientations')
                    .where('timestamp', '>=', dateRange.start)
                    .where('timestamp', '<=', dateRange.end)
                    .orderBy('timestamp', 'desc');
                
                const orientationsSnapshot = await orientationsQuery.get();
                this.data.orientations = orientationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            } catch (error) {
                console.log('Orientations collection not found or no data');
                this.data.orientations = [];
            }

        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    getDateRange() {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (this.filters.dateRange) {
            case 'today':
                return {
                    start: today,
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)
                };
            case 'week':
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - 7);
                return { start: weekStart, end: now };
            case 'month':
                const monthStart = new Date(today);
                monthStart.setDate(today.getDate() - 30);
                return { start: monthStart, end: now };
            case 'all':
            default:
                return {
                    start: new Date(2020, 0, 1),
                    end: now
                };
        }
    }

    renderDashboard() {
        const container = document.getElementById('admin-dashboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-header">
                <h2>📊 Admin Statistics Dashboard</h2>
                <div class="dashboard-filters">
                    <select id="date-range-filter">
                        <option value="today" ${this.filters.dateRange === 'today' ? 'selected' : ''}>Today</option>
                        <option value="week" ${this.filters.dateRange === 'week' ? 'selected' : ''}>Last 7 Days</option>
                        <option value="month" ${this.filters.dateRange === 'month' ? 'selected' : ''}>Last 30 Days</option>
                        <option value="all" ${this.filters.dateRange === 'all' ? 'selected' : ''}>All Time</option>
                    </select>
                    <select id="visit-type-filter">
                        <option value="all">All Types</option>
                        <option value="info-session">Info Session</option>
                        <option value="fingerprints">Fingerprints</option>
                        <option value="badge">Badge</option>
                        <option value="orientation">New Hire Orientation</option>
                        <option value="document-completion">Document Completion</option>
                    </select>
                </div>
            </div>

            <div class="kpi-cards">
                ${this.renderKPICards()}
            </div>

            <div class="charts-container">
                <div class="chart-section">
                    <h3>📈 Visits Over Time</h3>
                    <canvas id="visits-timeline-chart"></canvas>
                </div>
                
                <div class="chart-section">
                    <h3>📊 Visit Type Distribution</h3>
                    <canvas id="visit-type-chart"></canvas>
                </div>
                
                <div class="chart-section">
                    <h3>🕐 Peak Hours Heatmap</h3>
                    <div id="peak-hours-heatmap"></div>
                </div>
            </div>

            <div class="data-table-section">
                <h3>📋 Recent Activity</h3>
                <div class="table-container">
                    ${this.renderDataTable()}
                </div>
            </div>
        `;

        this.renderCharts();
    }

    renderKPICards() {
        const today = this.getFilteredData('today');
        const week = this.getFilteredData('week');
        const month = this.getFilteredData('month');
        
        const avgDuration = this.calculateAverageDuration();

        return `
            <div class="kpi-card">
                <div class="kpi-icon">📅</div>
                <div class="kpi-content">
                    <h4>Today's Visits</h4>
                    <div class="kpi-value">${today.total}</div>
                    <div class="kpi-breakdown">
                        Info: ${today.infoSession} | Docs: ${today.documents} | Prints: ${today.fingerprints}
                    </div>
                </div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-icon">📊</div>
                <div class="kpi-content">
                    <h4>This Week</h4>
                    <div class="kpi-value">${week.total}</div>
                    <div class="kpi-breakdown">
                        Daily Avg: ${Math.round(week.total / 7)}
                    </div>
                </div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-icon">📈</div>
                <div class="kpi-content">
                    <h4>This Month</h4>
                    <div class="kpi-value">${month.total}</div>
                    <div class="kpi-breakdown">
                        Daily Avg: ${Math.round(month.total / 30)}
                    </div>
                </div>
            </div>
            
            <div class="kpi-card">
                <div class="kpi-icon">⏱️</div>
                <div class="kpi-content">
                    <h4>Avg Duration</h4>
                    <div class="kpi-value">${avgDuration} min</div>
                    <div class="kpi-breakdown">
                        Per visit session
                    </div>
                </div>
            </div>
        `;
    }

    getFilteredData(period) {
        const dateRange = period === 'today' ? this.getDateRange() : 
                         period === 'week' ? (() => { const range = this.getDateRange(); range.dateRange = 'week'; return range; })() :
                         (() => { const range = this.getDateRange(); range.dateRange = 'month'; return range; })();

        const filteredVisits = this.data.visits.filter(visit => {
            const visitDate = visit.timestamp?.toDate() || new Date(visit.time || visit.date);
            return visitDate >= dateRange.start && visitDate <= dateRange.end;
        });

        const filteredCompletions = this.data.completions.filter(completion => {
            const completionDate = completion.timestamp?.toDate() || new Date(completion.time || completion.date);
            return completionDate >= dateRange.start && completionDate <= dateRange.end;
        });

        return {
            total: filteredVisits.length + filteredCompletions.length,
            infoSession: filteredVisits.filter(v => v.type === 'info-session').length,
            documents: filteredCompletions.length,
            fingerprints: filteredVisits.filter(v => v.type === 'fingerprints').length,
            orientations: filteredVisits.filter(v => v.type === 'orientation').length
        };
    }

    calculateAverageDuration() {
        // Simple calculation - could be enhanced with actual duration tracking
        const sessions = [...this.data.visits, ...this.data.completions];
        if (sessions.length === 0) return 0;
        
        // Estimate based on visit type (this is a placeholder - real duration would come from data)
        const estimatedDurations = sessions.map(session => {
            switch (session.type) {
                case 'info-session': return 45;
                case 'document-completion': return 30;
                case 'fingerprints': return 20;
                case 'orientation': return 60;
                default: return 30;
            }
        });

        return Math.round(estimatedDurations.reduce((a, b) => a + b, 0) / estimatedDurations.length);
    }

    renderCharts() {
        this.renderVisitsTimelineChart();
        this.renderVisitTypeChart();
        this.renderPeakHoursHeatmap();
    }

    renderVisitsTimelineChart() {
        const ctx = document.getElementById('visits-timeline-chart');
        if (!ctx) return;

        // Prepare timeline data
        const timelineData = this.prepareTimelineData();

        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [{
                    label: 'Total Visits',
                    data: timelineData.data,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: true
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        }
                    }
                }
            }
        });
    }

    renderVisitTypeChart() {
        const ctx = document.getElementById('visit-type-chart');
        if (!ctx) return;

        const typeData = this.prepareVisitTypeData();

        if (this.charts.visitType) {
            this.charts.visitType.destroy();
        }

        this.charts.visitType = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: typeData.labels,
                datasets: [{
                    data: typeData.data,
                    backgroundColor: [
                        '#4CAF50',
                        '#2196F3',
                        '#FF9800',
                        '#F44336',
                        '#9C27B0'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    renderPeakHoursHeatmap() {
        const container = document.getElementById('peak-hours-heatmap');
        if (!container) return;

        const heatmapData = this.preparePeakHoursData();
        
        container.innerHTML = `
            <div class="heatmap-grid">
                ${heatmapData.map((hour, index) => `
                    <div class="heatmap-cell" style="background-color: ${this.getHeatmapColor(hour.value, heatmapData)}">
                        <div class="hour-label">${hour.hour}</div>
                        <div class="hour-value">${hour.value}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    prepareTimelineData() {
        const allData = [...this.data.visits, ...this.data.completions];
        const dateRange = this.getDateRange();
        
        if (this.filters.dateRange === 'today') {
            // Hourly data for today
            const hours = Array.from({length: 24}, (_, i) => i);
            return {
                labels: hours.map(h => `${h}:00`),
                data: hours.map(hour => {
                    return allData.filter(item => {
                        const date = item.timestamp?.toDate() || new Date(item.time || item.date);
                        return date.getHours() === hour;
                    }).length;
                })
            };
        } else {
            // Daily data for week/month
            const days = this.filters.dateRange === 'week' ? 7 : 30;
            const labels = [];
            const data = [];
            
            for (let i = days - 1; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
                
                const dayData = allData.filter(item => {
                    const itemDate = item.timestamp?.toDate() || new Date(item.time || item.date);
                    return itemDate.toDateString() === date.toDateString();
                });
                data.push(dayData.length);
            }
            
            return { labels, data };
        }
    }

    prepareVisitTypeData() {
        const allData = [...this.data.visits, ...this.data.completions];
        const types = {};
        
        allData.forEach(item => {
            const type = item.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
        });

        return {
            labels: Object.keys(types).map(key => this.formatTypeLabel(key)),
            data: Object.values(types)
        };
    }

    preparePeakHoursData() {
        const allData = [...this.data.visits, ...this.data.completions];
        const hours = Array.from({length: 24}, (_, i) => ({ hour: i, value: 0 }));
        
        allData.forEach(item => {
            const date = item.timestamp?.toDate() || new Date(item.time || item.date);
            const hour = date.getHours();
            hours[hour].value++;
        });

        return hours.map(h => ({
            hour: `${h.hour}:00`,
            value: h.value
        }));
    }

    getHeatmapColor(value, data) {
        const max = Math.max(...data.map(d => d.value));
        const intensity = max > 0 ? value / max : 0;
        const alpha = 0.1 + (intensity * 0.7);
        return `rgba(76, 175, 80, ${alpha})`;
    }

    formatTypeLabel(type) {
        const labels = {
            'info-session': 'Info Session',
            'document-completion': 'Document Completion',
            'fingerprints': 'Fingerprints',
            'orientation': 'New Hire Orientation',
            'badge': 'Badge Creation'
        };
        return labels[type] || type.charAt(0).toUpperCase() + type.slice(1);
    }

    renderDataTable() {
        const allData = [...this.data.visits, ...this.data.completions]
            .sort((a, b) => {
                const dateA = a.timestamp?.toDate() || new Date(a.time || a.date);
                const dateB = b.timestamp?.toDate() || new Date(b.time || b.date);
                return dateB - dateA;
            })
            .slice(0, 50); // Show last 50 entries

        if (allData.length === 0) {
            return '<p style="text-align: center; color: #666;">No recent activity found.</p>';
        }

        return `
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Time</th>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${allData.map(item => `
                        <tr>
                            <td>${this.formatDateTime(item.timestamp?.toDate() || new Date(item.time || item.date))}</td>
                            <td>${item.name || 'N/A'}</td>
                            <td><span class="type-badge type-${item.type}">${this.formatTypeLabel(item.type || 'unknown')}</span></td>
                            <td><span class="status-badge status-${item.status || 'completed'}">${(item.status || 'completed').charAt(0).toUpperCase() + (item.status || 'completed').slice(1)}</span></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    formatDateTime(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    setupEventListeners() {
        document.getElementById('date-range-filter')?.addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.refreshDashboard();
        });

        document.getElementById('visit-type-filter')?.addEventListener('change', (e) => {
            this.filters.visitType = e.target.value;
            this.refreshDashboard();
        });
    }

    setupRealtimeUpdates() {
        // Listen for real-time updates
        this.db.collection('visits').onSnapshot(() => {
            this.refreshDashboard();
        });

        this.db.collection('document-completions').onSnapshot(() => {
            this.refreshDashboard();
        });
    }

    async refreshDashboard() {
        await this.loadData();
        this.renderDashboard();
    }
}

// Global instance
let adminDashboard = null;

// Switch between queue views
function switchQueueView(viewType) {
    console.log('🔄 Switching queue view to:', viewType);
    
    // Get view containers
    const newView = document.getElementById('queue-view-new');
    const legacyView = document.getElementById('queue-view-legacy');
    
    // Get tab buttons
    const newTab = document.getElementById('queue-tab-new');
    const legacyTab = document.getElementById('queue-tab-legacy');
    
    if (viewType === 'new') {
        // Show new sequential queue view
        if (newView) newView.style.display = 'block';
        if (legacyView) legacyView.style.display = 'none';
        
        // Update tab styles
        if (newTab) {
            newTab.style.background = '#4CAF50';
            newTab.style.color = 'white';
        }
        if (legacyTab) {
            legacyTab.style.background = 'transparent';
            legacyTab.style.color = '#666';
        }
        
        // Initialize sequential queue if available and not already initialized
        if (window.queueUIManager && !window.sequentialQueueInitialized) {
            console.log('📋 Initializing sequential queue view...');
            window.queueUIManager.setupRealtimeUpdates('sequential-queue-container');
            window.sequentialQueueInitialized = true;
        }
        
    } else if (viewType === 'legacy') {
        // Show legacy view
        if (newView) newView.style.display = 'none';
        if (legacyView) legacyView.style.display = 'block';
        
        // Update tab styles
        if (newTab) {
            newTab.style.background = 'transparent';
            newTab.style.color = '#666';
        }
        if (legacyTab) {
            legacyTab.style.background = '#4CAF50';
            legacyTab.style.color = 'white';
        }
        
        // Initialize legacy admin dashboard if not already done
        if (!adminDashboard && typeof initAdminDashboard === 'function') {
            console.log('📊 Initializing legacy admin dashboard...');
            initAdminDashboard();
        }
    }
    
    console.log('✅ Queue view switched successfully');
}

// Make function globally available
window.switchQueueView = switchQueueView;

// Initialize admin dashboard
function initAdminDashboard() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        adminDashboard = new AdminDashboard(db);
        adminDashboard.init();
    } else {
        console.error('Firebase not available for admin dashboard');
    }
}