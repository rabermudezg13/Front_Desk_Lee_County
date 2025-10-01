/*
Copyright (c) 2025 Rodrigo Bermudez Cafe Cultura LLC
All rights reserved.
*/

// OPTIMIZED ADMIN STATISTICS DASHBOARD

class OptimizedAdminDashboard {
    constructor(db) {
        this.db = db;
        this.charts = {};
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.filters = {
            dateRange: 'today',
            visitType: 'all',
            recruiter: 'all',
            customStart: null,
            customEnd: null
        };
        this.data = {
            visits: [],
            completions: [],
            fingerprints: [],
            orientations: []
        };
        this.isLoading = false;
        this.lastUpdate = null;
        this.realtimeUnsubscribers = [];
    }

    async init() {
        this.showSkeletonLoader();
        await this.loadData();
        this.renderDashboard();
        this.setupEventListeners();
        this.setupOptimizedRealtimeUpdates();
        this.hideSkeletonLoader();
    }

    // QUERY OPTIMIZATION WITH CACHING
    async loadData() {
        if (this.isLoading) return;
        
        try {
            this.isLoading = true;
            const cacheKey = this.getCacheKey();
            
            // Check cache first
            if (this.cache.has(cacheKey)) {
                const cachedData = this.cache.get(cacheKey);
                if (Date.now() - cachedData.timestamp < this.cacheTimeout) {
                    this.data = cachedData.data;
                    this.lastUpdate = cachedData.timestamp;
                    return;
                }
            }

            const dateRange = this.getDateRange();
            
            // Parallel batch queries for better performance
            const queries = await Promise.allSettled([
                this.loadVisitsOptimized(dateRange),
                this.loadCompletionsOptimized(dateRange),
                this.loadFingerprintsOptimized(dateRange),
                this.loadOrientationsOptimized(dateRange)
            ]);

            // Process results
            this.data.visits = queries[0].status === 'fulfilled' ? queries[0].value : [];
            this.data.completions = queries[1].status === 'fulfilled' ? queries[1].value : [];
            this.data.fingerprints = queries[2].status === 'fulfilled' ? queries[2].value : [];
            this.data.orientations = queries[3].status === 'fulfilled' ? queries[3].value : [];

            // Cache the result
            this.cache.set(cacheKey, {
                data: { ...this.data },
                timestamp: Date.now()
            });

            this.lastUpdate = Date.now();

        } catch (error) {
            console.error('Error loading dashboard data:', error);
            this.showErrorState('Failed to load dashboard data');
        } finally {
            this.isLoading = false;
        }
    }

    // OPTIMIZED COLLECTION QUERIES
    async loadVisitsOptimized(dateRange) {
        try {
            let query = this.db.collection('visits');
            
            // Apply date filter with proper indexing
            if (dateRange.start && dateRange.end) {
                query = query
                    .where('timestamp', '>=', dateRange.start)
                    .where('timestamp', '<=', dateRange.end)
                    .orderBy('timestamp', 'desc');
            }

            // Apply visit type filter if specified
            if (this.filters.visitType !== 'all') {
                query = query.where('type', '==', this.filters.visitType);
            }

            // Limit results for performance (pagination-ready)
            query = query.limit(1000);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading visits:', error);
            return [];
        }
    }

    async loadCompletionsOptimized(dateRange) {
        try {
            let query = this.db.collection('document-completions');
            
            if (dateRange.start && dateRange.end) {
                query = query
                    .where('timestamp', '>=', dateRange.start)
                    .where('timestamp', '<=', dateRange.end)
                    .orderBy('timestamp', 'desc');
            }

            query = query.limit(1000);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error loading completions:', error);
            return [];
        }
    }

    async loadFingerprintsOptimized(dateRange) {
        try {
            let query = this.db.collection('fingerprints');
            
            if (dateRange.start && dateRange.end) {
                query = query
                    .where('timestamp', '>=', dateRange.start)
                    .where('timestamp', '<=', dateRange.end)
                    .orderBy('timestamp', 'desc');
            }

            query = query.limit(1000);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.log('Fingerprints collection not found or no data');
            return [];
        }
    }

    async loadOrientationsOptimized(dateRange) {
        try {
            let query = this.db.collection('orientations');
            
            if (dateRange.start && dateRange.end) {
                query = query
                    .where('timestamp', '>=', dateRange.start)
                    .where('timestamp', '<=', dateRange.end)
                    .orderBy('timestamp', 'desc');
            }

            query = query.limit(1000);

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.log('Orientations collection not found or no data');
            return [];
        }
    }

    getCacheKey() {
        return `dashboard_${this.filters.dateRange}_${this.filters.visitType}_${this.filters.recruiter}_${this.filters.customStart}_${this.filters.customEnd}`;
    }

    getDateRange() {
        if (this.filters.customStart && this.filters.customEnd) {
            return {
                start: new Date(this.filters.customStart),
                end: new Date(this.filters.customEnd)
            };
        }

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
            case 'quarter':
                const quarterStart = new Date(today);
                quarterStart.setDate(today.getDate() - 90);
                return { start: quarterStart, end: now };
            case 'year':
                const yearStart = new Date(today);
                yearStart.setFullYear(today.getFullYear() - 1);
                return { start: yearStart, end: now };
            case 'all':
            default:
                return {
                    start: new Date(2020, 0, 1),
                    end: now
                };
        }
    }

    // SKELETON LOADER IMPLEMENTATION
    showSkeletonLoader() {
        const container = document.getElementById('admin-dashboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-header skeleton-container">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-filters"></div>
            </div>

            <div class="kpi-cards">
                ${Array(4).fill().map(() => `
                    <div class="kpi-card skeleton-container">
                        <div class="skeleton skeleton-icon"></div>
                        <div class="skeleton-content">
                            <div class="skeleton skeleton-text"></div>
                            <div class="skeleton skeleton-number"></div>
                            <div class="skeleton skeleton-breakdown"></div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="charts-container">
                <div class="chart-section skeleton-container">
                    <div class="skeleton skeleton-chart-title"></div>
                    <div class="skeleton skeleton-chart"></div>
                </div>
                <div class="chart-section skeleton-container">
                    <div class="skeleton skeleton-chart-title"></div>
                    <div class="skeleton skeleton-chart"></div>
                </div>
                <div class="chart-section skeleton-container">
                    <div class="skeleton skeleton-chart-title"></div>
                    <div class="skeleton skeleton-heatmap"></div>
                </div>
            </div>
        `;
    }

    hideSkeletonLoader() {
        // Skeleton will be replaced by renderDashboard()
    }

    showErrorState(message) {
        const container = document.getElementById('admin-dashboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <h3>Dashboard Error</h3>
                <p>${message}</p>
                <button onclick="window.location.reload()" class="retry-button">
                    🔄 Retry
                </button>
            </div>
        `;
    }

    renderDashboard() {
        const container = document.getElementById('admin-dashboard-container');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-header">
                <div class="dashboard-title-section">
                    <h2>📊 Admin Statistics Dashboard</h2>
                    <div class="last-update">
                        Last updated: ${this.lastUpdate ? new Date(this.lastUpdate).toLocaleTimeString() : 'Never'}
                        <button id="refresh-dashboard" class="refresh-btn" title="Refresh Data">🔄</button>
                    </div>
                </div>
                <div class="dashboard-filters">
                    <div class="filter-group">
                        <label>Time Period:</label>
                        <select id="date-range-filter">
                            <option value="today" ${this.filters.dateRange === 'today' ? 'selected' : ''}>Today</option>
                            <option value="week" ${this.filters.dateRange === 'week' ? 'selected' : ''}>Last 7 Days</option>
                            <option value="month" ${this.filters.dateRange === 'month' ? 'selected' : ''}>Last 30 Days</option>
                            <option value="quarter" ${this.filters.dateRange === 'quarter' ? 'selected' : ''}>Last 90 Days</option>
                            <option value="year" ${this.filters.dateRange === 'year' ? 'selected' : ''}>Last Year</option>
                            <option value="custom" ${this.filters.dateRange === 'custom' ? 'selected' : ''}>Custom Range</option>
                            <option value="all" ${this.filters.dateRange === 'all' ? 'selected' : ''}>All Time</option>
                        </select>
                    </div>
                    
                    <div class="filter-group custom-date-range" style="display: ${this.filters.dateRange === 'custom' ? 'flex' : 'none'};">
                        <input type="date" id="custom-start-date" value="${this.filters.customStart || ''}" />
                        <span>to</span>
                        <input type="date" id="custom-end-date" value="${this.filters.customEnd || ''}" />
                    </div>
                    
                    <div class="filter-group">
                        <label>Visit Type:</label>
                        <select id="visit-type-filter">
                            <option value="all">All Types</option>
                            <option value="info-session">Info Session</option>
                            <option value="fingerprints">Fingerprints</option>
                            <option value="badge">Badge</option>
                            <option value="orientation">New Hire Orientation</option>
                            <option value="document-completion">Document Completion</option>
                        </select>
                    </div>
                    
                    <div class="filter-group">
                        <label>Staff Member:</label>
                        <select id="recruiter-filter">
                            <option value="all">All Staff</option>
                            ${this.getStaffOptions()}
                        </select>
                    </div>
                </div>
            </div>

            <div class="performance-metrics">
                <div class="metric-card">
                    <span class="metric-label">Query Performance:</span>
                    <span class="metric-value" id="query-time">-</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Cache Status:</span>
                    <span class="metric-value" id="cache-status">-</span>
                </div>
                <div class="metric-card">
                    <span class="metric-label">Data Points:</span>
                    <span class="metric-value" id="data-count">-</span>
                </div>
            </div>

            <div class="kpi-cards">
                ${this.renderEnhancedKPICards()}
            </div>

            <div class="charts-container">
                <div class="chart-section">
                    <div class="chart-header">
                        <h3>📈 Visits Over Time</h3>
                        <div class="chart-controls">
                            <button class="chart-toggle" data-chart="timeline" data-type="line">Line</button>
                            <button class="chart-toggle" data-chart="timeline" data-type="bar">Bar</button>
                        </div>
                    </div>
                    <canvas id="visits-timeline-chart"></canvas>
                </div>
                
                <div class="chart-section">
                    <div class="chart-header">
                        <h3>📊 Visit Type Distribution</h3>
                        <div class="chart-controls">
                            <button class="chart-toggle" data-chart="distribution" data-type="doughnut">Donut</button>
                            <button class="chart-toggle" data-chart="distribution" data-type="pie">Pie</button>
                            <button class="chart-toggle" data-chart="distribution" data-type="bar">Bar</button>
                        </div>
                    </div>
                    <canvas id="visit-type-chart"></canvas>
                </div>
                
                <div class="chart-section full-width">
                    <div class="chart-header">
                        <h3>🕐 Peak Hours Heatmap</h3>
                        <div class="chart-controls">
                            <button class="view-toggle" data-view="hourly">Hourly</button>
                            <button class="view-toggle" data-view="daily">Daily</button>
                        </div>
                    </div>
                    <div id="peak-hours-heatmap"></div>
                </div>
                
                <div class="chart-section full-width">
                    <div class="chart-header">
                        <h3>📊 Staff Performance</h3>
                    </div>
                    <canvas id="staff-performance-chart"></canvas>
                </div>
            </div>

            <div class="data-table-section">
                <div class="table-header">
                    <h3>📋 Recent Activity</h3>
                    <div class="table-controls">
                        <input type="text" id="search-table" placeholder="🔍 Search..." />
                        <select id="table-filter">
                            <option value="all">All Activities</option>
                            <option value="today">Today Only</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                        </select>
                        <button id="export-data">📊 Export</button>
                    </div>
                </div>
                <div class="table-container">
                    ${this.renderEnhancedDataTable()}
                </div>
                <div class="table-pagination">
                    <button id="prev-page">← Previous</button>
                    <span id="page-info">Page 1 of 1</span>
                    <button id="next-page">Next →</button>
                </div>
            </div>
        `;

        this.updatePerformanceMetrics();
        this.renderEnhancedCharts();
    }

    renderEnhancedKPICards() {
        const stats = this.calculateEnhancedStats();
        
        return `
            <div class="kpi-card primary">
                <div class="kpi-icon">📅</div>
                <div class="kpi-content">
                    <h4>Today's Activity</h4>
                    <div class="kpi-value">${stats.today.total}</div>
                    <div class="kpi-trend ${stats.today.trend >= 0 ? 'positive' : 'negative'}">
                        ${stats.today.trend >= 0 ? '↗' : '↘'} ${Math.abs(stats.today.trend)}% from yesterday
                    </div>
                    <div class="kpi-breakdown">
                        Info: ${stats.today.infoSession} | Docs: ${stats.today.documents} | Prints: ${stats.today.fingerprints}
                    </div>
                </div>
            </div>
            
            <div class="kpi-card secondary">
                <div class="kpi-icon">📊</div>
                <div class="kpi-content">
                    <h4>Period Total</h4>
                    <div class="kpi-value">${stats.period.total}</div>
                    <div class="kpi-trend">
                        Daily Avg: ${stats.period.dailyAvg}
                    </div>
                    <div class="kpi-breakdown">
                        Peak Day: ${stats.period.peakDay} (${stats.period.peakCount})
                    </div>
                </div>
            </div>
            
            <div class="kpi-card success">
                <div class="kpi-icon">✅</div>
                <div class="kpi-content">
                    <h4>Completion Rate</h4>
                    <div class="kpi-value">${stats.completion.rate}%</div>
                    <div class="kpi-trend ${stats.completion.trend >= 0 ? 'positive' : 'negative'}">
                        ${stats.completion.trend >= 0 ? '↗' : '↘'} ${Math.abs(stats.completion.trend)}% efficiency
                    </div>
                    <div class="kpi-breakdown">
                        Completed: ${stats.completion.completed} | Pending: ${stats.completion.pending}
                    </div>
                </div>
            </div>
            
            <div class="kpi-card warning">
                <div class="kpi-icon">⏱️</div>
                <div class="kpi-content">
                    <h4>Avg Duration</h4>
                    <div class="kpi-value">${stats.duration.average} min</div>
                    <div class="kpi-trend">
                        Range: ${stats.duration.min}-${stats.duration.max} min
                    </div>
                    <div class="kpi-breakdown">
                        Fastest: ${stats.duration.fastest} | Slowest: ${stats.duration.slowest}
                    </div>
                </div>
            </div>
        `;
    }

    calculateEnhancedStats() {
        const allData = [...this.data.visits, ...this.data.completions, ...this.data.fingerprints, ...this.data.orientations];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

        // Today's stats
        const todayData = allData.filter(item => {
            const date = this.getItemDate(item);
            return date >= today;
        });

        // Yesterday's stats for comparison
        const yesterdayData = allData.filter(item => {
            const date = this.getItemDate(item);
            return date >= yesterday && date < today;
        });

        // Calculate trend
        const todayTotal = todayData.length;
        const yesterdayTotal = yesterdayData.length;
        const trend = yesterdayTotal > 0 ? ((todayTotal - yesterdayTotal) / yesterdayTotal * 100) : 0;

        // Period stats
        const periodStats = this.calculatePeriodStats(allData);
        const completionStats = this.calculateCompletionStats(allData);
        const durationStats = this.calculateDurationStats(allData);

        return {
            today: {
                total: todayTotal,
                trend: Math.round(trend),
                infoSession: todayData.filter(item => item.type === 'info-session').length,
                documents: todayData.filter(item => item.type === 'document-completion' || this.data.completions.includes(item)).length,
                fingerprints: todayData.filter(item => item.type === 'fingerprints').length
            },
            period: periodStats,
            completion: completionStats,
            duration: durationStats
        };
    }

    calculatePeriodStats(data) {
        const dayGroups = {};
        data.forEach(item => {
            const date = this.getItemDate(item).toDateString();
            dayGroups[date] = (dayGroups[date] || 0) + 1;
        });

        const counts = Object.values(dayGroups);
        const peakDay = Object.keys(dayGroups).reduce((a, b) => dayGroups[a] > dayGroups[b] ? a : b, '');
        
        return {
            total: data.length,
            dailyAvg: counts.length > 0 ? Math.round(data.length / counts.length) : 0,
            peakDay: peakDay ? new Date(peakDay).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'N/A',
            peakCount: dayGroups[peakDay] || 0
        };
    }

    calculateCompletionStats(data) {
        const completed = data.filter(item => item.status === 'completed' || !item.status).length;
        const pending = data.filter(item => item.status === 'pending' || item.status === 'in-progress').length;
        const total = completed + pending;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 100;
        
        return {
            rate,
            completed,
            pending,
            trend: rate >= 90 ? 5 : rate >= 70 ? 0 : -5 // Simplified trend based on rate
        };
    }

    calculateDurationStats(data) {
        const durations = data.map(item => this.estimateDuration(item)).filter(d => d > 0);
        
        if (durations.length === 0) {
            return { average: 0, min: 0, max: 0, fastest: 'N/A', slowest: 'N/A' };
        }

        const average = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
        const min = Math.min(...durations);
        const max = Math.max(...durations);

        return {
            average,
            min,
            max,
            fastest: this.getTypeLabel(data.find(item => this.estimateDuration(item) === min)?.type),
            slowest: this.getTypeLabel(data.find(item => this.estimateDuration(item) === max)?.type)
        };
    }

    estimateDuration(item) {
        // Enhanced duration estimation based on type and actual data if available
        if (item.duration) return item.duration;
        
        const durations = {
            'info-session': 45,
            'document-completion': 25,
            'fingerprints': 15,
            'orientation': 60,
            'badge': 20
        };
        
        return durations[item.type] || 30;
    }

    getItemDate(item) {
        return item.timestamp?.toDate() || new Date(item.time || item.date || Date.now());
    }

    getTypeLabel(type) {
        const labels = {
            'info-session': 'Info Session',
            'document-completion': 'Documents',
            'fingerprints': 'Fingerprints',
            'orientation': 'Orientation',
            'badge': 'Badge'
        };
        return labels[type] || type || 'Unknown';
    }

    updatePerformanceMetrics() {
        const queryTime = this.lastUpdate ? `${Date.now() - this.lastUpdate}ms` : 'N/A';
        const cacheStatus = this.cache.size > 0 ? `${this.cache.size} entries` : 'Empty';
        const dataCount = Object.values(this.data).flat().length;

        document.getElementById('query-time').textContent = queryTime;
        document.getElementById('cache-status').textContent = cacheStatus;
        document.getElementById('data-count').textContent = dataCount.toLocaleString();
    }

    renderEnhancedCharts() {
        this.renderResponsiveTimelineChart();
        this.renderInteractiveDistributionChart();
        this.renderAdvancedHeatmap();
        this.renderStaffPerformanceChart();
    }

    renderResponsiveTimelineChart() {
        const ctx = document.getElementById('visits-timeline-chart');
        if (!ctx) return;

        const timelineData = this.prepareEnhancedTimelineData();

        if (this.charts.timeline) {
            this.charts.timeline.destroy();
        }

        this.charts.timeline = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timelineData.labels,
                datasets: [
                    {
                        label: 'Total Visits',
                        data: timelineData.totals,
                        borderColor: '#4CAF50',
                        backgroundColor: 'rgba(76, 175, 80, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Info Sessions',
                        data: timelineData.infoSessions,
                        borderColor: '#2196F3',
                        backgroundColor: 'rgba(33, 150, 243, 0.1)',
                        tension: 0.4
                    },
                    {
                        label: 'Document Completions',
                        data: timelineData.documents,
                        borderColor: '#FF9800',
                        backgroundColor: 'rgba(255, 152, 0, 0.1)',
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: function(context) {
                                return timelineData.labels[context[0].dataIndex];
                            },
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                return [
                                    `Peak Hour: ${timelineData.peakHours[index]}`,
                                    `Avg Duration: ${timelineData.avgDurations[index]} min`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: this.filters.dateRange === 'today' ? 'Hour' : 'Date'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        ticks: {
                            stepSize: 1
                        },
                        title: {
                            display: true,
                            text: 'Number of Visits'
                        }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    prepareEnhancedTimelineData() {
        const allData = [...this.data.visits, ...this.data.completions, ...this.data.fingerprints, ...this.data.orientations];
        
        if (this.filters.dateRange === 'today') {
            return this.prepareTodayHourlyData(allData);
        } else {
            return this.prepareDailyData(allData);
        }
    }

    prepareTodayHourlyData(data) {
        const hours = Array.from({length: 24}, (_, i) => i);
        const result = {
            labels: hours.map(h => `${h}:00`),
            totals: new Array(24).fill(0),
            infoSessions: new Array(24).fill(0),
            documents: new Array(24).fill(0),
            peakHours: new Array(24).fill('N/A'),
            avgDurations: new Array(24).fill(0)
        };

        data.forEach(item => {
            const date = this.getItemDate(item);
            const hour = date.getHours();
            
            result.totals[hour]++;
            
            if (item.type === 'info-session') result.infoSessions[hour]++;
            if (item.type === 'document-completion' || this.data.completions.includes(item)) {
                result.documents[hour]++;
            }
        });

        return result;
    }

    prepareDailyData(data) {
        const days = this.filters.dateRange === 'week' ? 7 : 
                    this.filters.dateRange === 'month' ? 30 : 
                    this.filters.dateRange === 'quarter' ? 90 : 30;
        
        const result = {
            labels: [],
            totals: [],
            infoSessions: [],
            documents: [],
            peakHours: [],
            avgDurations: []
        };

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            result.labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            
            const dayData = data.filter(item => {
                const itemDate = this.getItemDate(item);
                return itemDate.toDateString() === date.toDateString();
            });
            
            result.totals.push(dayData.length);
            result.infoSessions.push(dayData.filter(item => item.type === 'info-session').length);
            result.documents.push(dayData.filter(item => 
                item.type === 'document-completion' || this.data.completions.includes(item)
            ).length);
            
            // Calculate peak hour for the day
            const hourCounts = {};
            dayData.forEach(item => {
                const hour = this.getItemDate(item).getHours();
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });
            const peakHour = Object.keys(hourCounts).reduce((a, b) => 
                hourCounts[a] > hourCounts[b] ? a : b, '0'
            );
            result.peakHours.push(`${peakHour}:00`);
            
            // Calculate average duration
            const durations = dayData.map(item => this.estimateDuration(item));
            const avgDuration = durations.length > 0 ? 
                Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;
            result.avgDurations.push(avgDuration);
        }

        return result;
    }

    renderInteractiveDistributionChart() {
        const ctx = document.getElementById('visit-type-chart');
        if (!ctx) return;

        const typeData = this.prepareVisitTypeData();

        if (this.charts.distribution) {
            this.charts.distribution.destroy();
        }

        this.charts.distribution = new Chart(ctx, {
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
                        '#9C27B0',
                        '#607D8B'
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            },
                            afterLabel: function(context) {
                                return `Avg Duration: ${typeData.avgDurations[context.dataIndex]} min`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true
                }
            }
        });
    }

    prepareVisitTypeData() {
        const allData = [...this.data.visits, ...this.data.completions, ...this.data.fingerprints, ...this.data.orientations];
        const types = {};
        const durations = {};
        
        allData.forEach(item => {
            const type = item.type || 'unknown';
            types[type] = (types[type] || 0) + 1;
            
            if (!durations[type]) durations[type] = [];
            durations[type].push(this.estimateDuration(item));
        });

        const avgDurations = Object.keys(types).map(type => {
            const typeDurations = durations[type] || [0];
            return Math.round(typeDurations.reduce((a, b) => a + b, 0) / typeDurations.length);
        });

        return {
            labels: Object.keys(types).map(key => this.getTypeLabel(key)),
            data: Object.values(types),
            avgDurations
        };
    }

    renderAdvancedHeatmap() {
        const container = document.getElementById('peak-hours-heatmap');
        if (!container) return;

        const heatmapData = this.prepareAdvancedHeatmapData();
        
        container.innerHTML = `
            <div class="heatmap-legend">
                <span>Low Activity</span>
                <div class="legend-gradient"></div>
                <span>High Activity</span>
            </div>
            <div class="heatmap-grid">
                ${heatmapData.map((item, index) => `
                    <div class="heatmap-cell enhanced" 
                         style="background-color: ${this.getEnhancedHeatmapColor(item.value, heatmapData)}"
                         data-tooltip="${item.tooltip}"
                         onclick="window.optimizedDashboard.showHourDetails('${item.hour}', ${item.value})">
                        <div class="hour-label">${item.hour}</div>
                        <div class="hour-value">${item.value}</div>
                        <div class="hour-trend">${item.trend}</div>
                    </div>
                `).join('')}
            </div>
        `;

        // Add hover effects
        container.querySelectorAll('.heatmap-cell').forEach(cell => {
            cell.addEventListener('mouseenter', (e) => {
                this.showTooltip(e.target, e.target.dataset.tooltip);
            });
            cell.addEventListener('mouseleave', () => {
                this.hideTooltip();
            });
        });
    }

    prepareAdvancedHeatmapData() {
        const allData = [...this.data.visits, ...this.data.completions, ...this.data.fingerprints, ...this.data.orientations];
        const hours = Array.from({length: 24}, (_, i) => ({ hour: i, value: 0, types: {} }));
        
        allData.forEach(item => {
            const date = this.getItemDate(item);
            const hour = date.getHours();
            hours[hour].value++;
            
            const type = item.type || 'unknown';
            hours[hour].types[type] = (hours[hour].types[type] || 0) + 1;
        });

        return hours.map(h => {
            const mostCommonType = Object.keys(h.types).reduce((a, b) => 
                h.types[a] > h.types[b] ? a : b, 'unknown'
            );
            
            return {
                hour: `${h.hour}:00`,
                value: h.value,
                trend: h.value > 5 ? '📈' : h.value > 2 ? '➡️' : '📉',
                tooltip: `${h.hour}:00 - ${h.value} visits\nMost common: ${this.getTypeLabel(mostCommonType)}\nTypes: ${Object.keys(h.types).length}`
            };
        });
    }

    getEnhancedHeatmapColor(value, data) {
        const max = Math.max(...data.map(d => d.value));
        const min = Math.min(...data.map(d => d.value));
        
        if (max === min) return 'rgba(76, 175, 80, 0.3)';
        
        const intensity = (value - min) / (max - min);
        const hue = 120; // Green hue
        const saturation = 70;
        const lightness = 90 - (intensity * 40); // Darker for higher values
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    renderStaffPerformanceChart() {
        const ctx = document.getElementById('staff-performance-chart');
        if (!ctx) return;

        const staffData = this.prepareStaffPerformanceData();

        if (this.charts.staff) {
            this.charts.staff.destroy();
        }

        this.charts.staff = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: staffData.labels,
                datasets: [
                    {
                        label: 'Visits Handled',
                        data: staffData.visits,
                        backgroundColor: 'rgba(76, 175, 80, 0.8)',
                        borderColor: '#4CAF50',
                        borderWidth: 1
                    },
                    {
                        label: 'Avg Duration (min)',
                        data: staffData.durations,
                        backgroundColor: 'rgba(33, 150, 243, 0.8)',
                        borderColor: '#2196F3',
                        borderWidth: 1,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true
                    },
                    tooltip: {
                        callbacks: {
                            afterBody: function(context) {
                                const index = context[0].dataIndex;
                                return [
                                    `Efficiency: ${staffData.efficiency[index]}%`,
                                    `Satisfaction: ${staffData.satisfaction[index]}/5`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Number of Visits'
                        }
                    },
                    y1: {
                        type: 'linear',
                        display: true,
                        position: 'right',
                        title: {
                            display: true,
                            text: 'Average Duration (minutes)'
                        },
                        grid: {
                            drawOnChartArea: false
                        }
                    }
                }
            }
        });
    }

    prepareStaffPerformanceData() {
        // This would be enhanced with actual staff data from the database
        const staffMembers = ['Staff A', 'Staff B', 'Staff C', 'Staff D'];
        
        return {
            labels: staffMembers,
            visits: [45, 38, 52, 41],
            durations: [25, 32, 28, 30],
            efficiency: [92, 88, 95, 85],
            satisfaction: [4.5, 4.2, 4.8, 4.1]
        };
    }

    getStaffOptions() {
        // This would be populated from actual staff data
        return `
            <option value="staff-a">Staff A</option>
            <option value="staff-b">Staff B</option>
            <option value="staff-c">Staff C</option>
            <option value="staff-d">Staff D</option>
        `;
    }

    renderEnhancedDataTable() {
        const allData = [...this.data.visits, ...this.data.completions, ...this.data.fingerprints, ...this.data.orientations]
            .sort((a, b) => {
                const dateA = this.getItemDate(a);
                const dateB = this.getItemDate(b);
                return dateB - dateA;
            })
            .slice(0, 100); // Show last 100 entries

        if (allData.length === 0) {
            return '<div class="empty-state">📭 No recent activity found.</div>';
        }

        return `
            <table class="data-table enhanced">
                <thead>
                    <tr>
                        <th onclick="window.optimizedDashboard.sortTable('time')" class="sortable">
                            Time <span class="sort-icon">↕️</span>
                        </th>
                        <th onclick="window.optimizedDashboard.sortTable('name')" class="sortable">
                            Name <span class="sort-icon">↕️</span>
                        </th>
                        <th onclick="window.optimizedDashboard.sortTable('type')" class="sortable">
                            Type <span class="sort-icon">↕️</span>
                        </th>
                        <th onclick="window.optimizedDashboard.sortTable('status')" class="sortable">
                            Status <span class="sort-icon">↕️</span>
                        </th>
                        <th onclick="window.optimizedDashboard.sortTable('duration')" class="sortable">
                            Duration <span class="sort-icon">↕️</span>
                        </th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${allData.map((item, index) => `
                        <tr class="table-row ${index % 2 === 0 ? 'even' : 'odd'}" data-id="${item.id}">
                            <td class="time-cell">${this.formatDateTime(this.getItemDate(item))}</td>
                            <td class="name-cell">${item.name || 'Anonymous'}</td>
                            <td class="type-cell">
                                <span class="type-badge type-${item.type || 'unknown'}">
                                    ${this.getTypeLabel(item.type || 'unknown')}
                                </span>
                            </td>
                            <td class="status-cell">
                                <span class="status-badge status-${item.status || 'completed'}">
                                    ${this.formatStatus(item.status || 'completed')}
                                </span>
                            </td>
                            <td class="duration-cell">${this.estimateDuration(item)} min</td>
                            <td class="actions-cell">
                                <button onclick="window.optimizedDashboard.viewDetails('${item.id}')" class="action-btn view">👁️</button>
                                <button onclick="window.optimizedDashboard.exportItem('${item.id}')" class="action-btn export">📊</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    formatStatus(status) {
        const statusMap = {
            'completed': 'Completed',
            'pending': 'Pending',
            'in-progress': 'In Progress',
            'cancelled': 'Cancelled'
        };
        return statusMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
    }

    formatDateTime(date) {
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    // OPTIMIZED REAL-TIME UPDATES
    setupOptimizedRealtimeUpdates() {
        // Cleanup existing listeners
        this.realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.realtimeUnsubscribers = [];

        // Throttled update function
        const throttledUpdate = this.throttle(() => {
            this.invalidateCache();
            this.refreshDashboard();
        }, 10000); // Update at most every 10 seconds

        // Set up listeners for each collection
        const collections = ['visits', 'document-completions', 'fingerprints', 'orientations'];
        
        collections.forEach(collection => {
            try {
                const unsubscribe = this.db.collection(collection)
                    .where('timestamp', '>=', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Only listen to recent data
                    .onSnapshot(() => {
                        throttledUpdate();
                    }, (error) => {
                        console.warn(`Real-time listener error for ${collection}:`, error);
                    });
                
                this.realtimeUnsubscribers.push(unsubscribe);
            } catch (error) {
                console.warn(`Could not set up listener for ${collection}:`, error);
            }
        });
    }

    throttle(func, delay) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function (...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    invalidateCache() {
        this.cache.clear();
    }

    setupEventListeners() {
        // Filter change listeners
        document.getElementById('date-range-filter')?.addEventListener('change', (e) => {
            this.filters.dateRange = e.target.value;
            this.toggleCustomDateRange();
            this.refreshDashboard();
        });

        document.getElementById('visit-type-filter')?.addEventListener('change', (e) => {
            this.filters.visitType = e.target.value;
            this.refreshDashboard();
        });

        document.getElementById('recruiter-filter')?.addEventListener('change', (e) => {
            this.filters.recruiter = e.target.value;
            this.refreshDashboard();
        });

        // Custom date range listeners
        document.getElementById('custom-start-date')?.addEventListener('change', (e) => {
            this.filters.customStart = e.target.value;
            if (this.filters.dateRange === 'custom') {
                this.refreshDashboard();
            }
        });

        document.getElementById('custom-end-date')?.addEventListener('change', (e) => {
            this.filters.customEnd = e.target.value;
            if (this.filters.dateRange === 'custom') {
                this.refreshDashboard();
            }
        });

        // Refresh button
        document.getElementById('refresh-dashboard')?.addEventListener('click', () => {
            this.invalidateCache();
            this.refreshDashboard();
        });

        // Search functionality
        document.getElementById('search-table')?.addEventListener('input', (e) => {
            this.filterTable(e.target.value);
        });

        // Export button
        document.getElementById('export-data')?.addEventListener('click', () => {
            this.exportData();
        });
    }

    toggleCustomDateRange() {
        const customRange = document.querySelector('.custom-date-range');
        if (customRange) {
            customRange.style.display = this.filters.dateRange === 'custom' ? 'flex' : 'none';
        }
    }

    filterTable(searchTerm) {
        const table = document.querySelector('.data-table tbody');
        if (!table) return;

        const rows = table.querySelectorAll('tr');
        const term = searchTerm.toLowerCase();

        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(term) ? '' : 'none';
        });
    }

    exportData() {
        const allData = [...this.data.visits, ...this.data.completions, ...this.data.fingerprints, ...this.data.orientations];
        const csv = this.convertToCSV(allData);
        this.downloadCSV(csv, `kelly-dashboard-export-${new Date().toISOString().split('T')[0]}.csv`);
    }

    convertToCSV(data) {
        if (data.length === 0) return '';

        const headers = ['Date', 'Time', 'Name', 'Type', 'Status', 'Duration (min)'];
        const rows = data.map(item => [
            this.getItemDate(item).toLocaleDateString(),
            this.getItemDate(item).toLocaleTimeString(),
            item.name || 'Anonymous',
            this.getTypeLabel(item.type || 'unknown'),
            this.formatStatus(item.status || 'completed'),
            this.estimateDuration(item)
        ]);

        return [headers, ...rows].map(row => 
            row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
    }

    downloadCSV(csv, filename) {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    async refreshDashboard() {
        if (this.isLoading) return;
        
        this.showSkeletonLoader();
        await this.loadData();
        this.renderDashboard();
        this.hideSkeletonLoader();
    }

    // Public methods for interaction
    showHourDetails(hour, value) {
        alert(`Hour ${hour}: ${value} visits\n\nClick OK to see detailed breakdown.`);
    }

    viewDetails(itemId) {
        console.log('Viewing details for item:', itemId);
        // Implementation would show detailed modal
    }

    exportItem(itemId) {
        console.log('Exporting item:', itemId);
        // Implementation would export single item
    }

    sortTable(column) {
        console.log('Sorting by:', column);
        // Implementation would sort table by column
    }

    showTooltip(element, text) {
        // Simple tooltip implementation
        const tooltip = document.createElement('div');
        tooltip.className = 'custom-tooltip';
        tooltip.textContent = text;
        document.body.appendChild(tooltip);
        
        const rect = element.getBoundingClientRect();
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = (rect.top - tooltip.offsetHeight - 5) + 'px';
    }

    hideTooltip() {
        const tooltip = document.querySelector('.custom-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    destroy() {
        // Cleanup method
        this.realtimeUnsubscribers.forEach(unsubscribe => unsubscribe());
        this.realtimeUnsubscribers = [];
        
        Object.values(this.charts).forEach(chart => {
            if (chart && chart.destroy) {
                chart.destroy();
            }
        });
        
        this.cache.clear();
    }
}

// Global instance
let optimizedDashboard = null;

// Initialize optimized admin dashboard
function initOptimizedAdminDashboard() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        
        // Cleanup existing dashboard if it exists
        if (window.optimizedDashboard) {
            window.optimizedDashboard.destroy();
        }
        
        optimizedDashboard = new OptimizedAdminDashboard(db);
        window.optimizedDashboard = optimizedDashboard;
        optimizedDashboard.init();
        
        console.log('✅ Optimized Admin Dashboard initialized successfully');
    } else {
        console.error('Firebase not available for optimized admin dashboard');
    }
}

// Make functions globally available
window.initOptimizedAdminDashboard = initOptimizedAdminDashboard;