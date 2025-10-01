/*
Copyright (c) 2025 Rodrigo Bermudez Cafe Cultura LLC
All rights reserved.
*/

// DASHBOARD INTEGRATION AND MIGRATION UTILITY

class DashboardIntegration {
    constructor() {
        this.isOptimizedEnabled = localStorage.getItem('kelly-dashboard-optimized') === 'true';
        this.performanceMetrics = {
            loadTimes: [],
            queryTimes: [],
            errorCount: 0,
            cacheHitRate: 0
        };
    }

    init() {
        // Only initialize if we're in the admin dashboard
        if (!this.isAdminDashboardVisible()) {
            console.log('Admin dashboard not visible, skipping dashboard integration init');
            return;
        }
        
        this.setupToggleButton();
        this.initializeDashboard();
        this.setupPerformanceMonitoring();
        this.monitorErrors();
    }

    isAdminDashboardVisible() {
        const adminScreen = document.getElementById('admin-dashboard');
        return adminScreen && adminScreen.classList.contains('active');
    }

    setupToggleButton() {
        const container = document.getElementById('admin-dashboard-container');
        if (!container) {
            console.log('Admin dashboard container not found, skipping toggle setup');
            return;
        }

        const toggleButton = document.createElement('div');
        toggleButton.innerHTML = `
            <div class="dashboard-toggle-container">
                <div class="toggle-info">
                    <span class="toggle-label">🚀 Optimized Dashboard</span>
                    <span class="toggle-description">Enhanced performance and features</span>
                </div>
                <label class="dashboard-toggle">
                    <input type="checkbox" id="dashboard-optimization-toggle" ${this.isOptimizedEnabled ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `;

        // Insert before the main dashboard content
        container.parentNode.insertBefore(toggleButton, container);

        document.getElementById('dashboard-optimization-toggle').addEventListener('change', (e) => {
            this.toggleOptimizedDashboard(e.target.checked);
        });
    }

    toggleOptimizedDashboard(enabled) {
        this.isOptimizedEnabled = enabled;
        localStorage.setItem('kelly-dashboard-optimized', enabled.toString());
        
        // Show transition notification
        this.showTransitionNotification(enabled);
        
        // Cleanup current dashboard
        this.cleanup();
        
        // Initialize new dashboard after a brief delay
        setTimeout(() => {
            this.initializeDashboard();
        }, 500);
    }

    initializeDashboard() {
        const startTime = performance.now();
        
        try {
            if (this.isOptimizedEnabled) {
                console.log('🚀 Initializing Optimized Dashboard...');
                if (typeof initOptimizedAdminDashboard === 'function') {
                    initOptimizedAdminDashboard();
                } else {
                    console.error('Optimized dashboard not available');
                    this.fallbackToLegacy();
                }
            } else {
                console.log('📊 Initializing Legacy Dashboard...');
                if (typeof initAdminDashboard === 'function') {
                    initAdminDashboard();
                } else {
                    console.error('Legacy dashboard not available');
                }
            }
            
            const loadTime = performance.now() - startTime;
            this.recordPerformanceMetric('loadTime', loadTime);
            
        } catch (error) {
            console.error('Dashboard initialization error:', error);
            this.recordError(error);
            this.fallbackToLegacy();
        }
    }

    fallbackToLegacy() {
        console.log('⚠️ Falling back to legacy dashboard...');
        this.isOptimizedEnabled = false;
        localStorage.setItem('kelly-dashboard-optimized', 'false');
        
        if (typeof initAdminDashboard === 'function') {
            initAdminDashboard();
        }
        
        this.showErrorNotification('Optimized dashboard unavailable, using legacy version');
    }

    cleanup() {
        // Cleanup optimized dashboard
        if (window.optimizedDashboard && window.optimizedDashboard.destroy) {
            window.optimizedDashboard.destroy();
            window.optimizedDashboard = null;
        }
        
        // Cleanup legacy dashboard
        if (window.adminDashboard && window.adminDashboard.destroy) {
            window.adminDashboard.destroy();
            window.adminDashboard = null;
        }
        
        // Clear the container
        const container = document.getElementById('admin-dashboard-container');
        if (container) {
            container.innerHTML = '';
        }
    }

    setupPerformanceMonitoring() {
        // Monitor Firebase query performance
        if (typeof firebase !== 'undefined' && firebase.firestore) {
            const originalGet = firebase.firestore.Query.prototype.get;
            const self = this;
            
            firebase.firestore.Query.prototype.get = function() {
                const startTime = performance.now();
                return originalGet.apply(this, arguments).then(result => {
                    const queryTime = performance.now() - startTime;
                    self.recordPerformanceMetric('queryTime', queryTime);
                    return result;
                }).catch(error => {
                    self.recordError(error);
                    throw error;
                });
            };
        }
        
        // Monitor page load performance
        window.addEventListener('load', () => {
            if (window.performance && window.performance.timing) {
                const loadTime = window.performance.timing.loadEventEnd - window.performance.timing.navigationStart;
                this.recordPerformanceMetric('pageLoad', loadTime);
            }
        });
    }

    monitorErrors() {
        window.addEventListener('error', (event) => {
            this.recordError({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                stack: event.error?.stack
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.recordError({
                message: 'Unhandled Promise Rejection',
                reason: event.reason
            });
        });
    }

    recordPerformanceMetric(type, value) {
        if (type === 'loadTime') {
            this.performanceMetrics.loadTimes.push(value);
        } else if (type === 'queryTime') {
            this.performanceMetrics.queryTimes.push(value);
        }
        
        // Keep only last 50 measurements
        if (this.performanceMetrics.loadTimes.length > 50) {
            this.performanceMetrics.loadTimes.shift();
        }
        if (this.performanceMetrics.queryTimes.length > 50) {
            this.performanceMetrics.queryTimes.shift();
        }
        
        this.updatePerformanceDisplay();
    }

    recordError(error) {
        this.performanceMetrics.errorCount++;
        console.error('Dashboard Error:', error);
        
        // Send error to analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'exception', {
                description: error.message || 'Unknown dashboard error',
                fatal: false
            });
        }
    }

    updatePerformanceDisplay() {
        const metrics = this.getPerformanceStats();
        
        // Update performance metrics in UI if optimized dashboard is active
        if (this.isOptimizedEnabled && window.optimizedDashboard) {
            const queryTimeElement = document.getElementById('query-time');
            const cacheStatusElement = document.getElementById('cache-status');
            
            if (queryTimeElement) {
                queryTimeElement.textContent = `${metrics.avgQueryTime}ms`;
            }
            
            if (cacheStatusElement && window.optimizedDashboard.cache) {
                cacheStatusElement.textContent = `${window.optimizedDashboard.cache.size} entries`;
            }
        }
    }

    getPerformanceStats() {
        const avgLoadTime = this.performanceMetrics.loadTimes.length > 0 
            ? Math.round(this.performanceMetrics.loadTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.loadTimes.length)
            : 0;
            
        const avgQueryTime = this.performanceMetrics.queryTimes.length > 0
            ? Math.round(this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length)
            : 0;

        return {
            avgLoadTime,
            avgQueryTime,
            errorCount: this.performanceMetrics.errorCount,
            totalQueries: this.performanceMetrics.queryTimes.length
        };
    }

    showTransitionNotification(optimized) {
        const notification = document.createElement('div');
        notification.className = 'dashboard-notification';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">${optimized ? '🚀' : '📊'}</div>
                <div class="notification-text">
                    <h4>Dashboard ${optimized ? 'Optimized' : 'Legacy'} Mode</h4>
                    <p>Switching to ${optimized ? 'enhanced performance' : 'standard'} dashboard...</p>
                </div>
            </div>
            <div class="notification-progress"></div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    showErrorNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'dashboard-notification error';
        notification.innerHTML = `
            <div class="notification-content">
                <div class="notification-icon">⚠️</div>
                <div class="notification-text">
                    <h4>Dashboard Notice</h4>
                    <p>${message}</p>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.add('hide');
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 4000);
    }

    exportPerformanceReport() {
        const stats = this.getPerformanceStats();
        const report = {
            timestamp: new Date().toISOString(),
            dashboardMode: this.isOptimizedEnabled ? 'optimized' : 'legacy',
            metrics: {
                averageLoadTime: stats.avgLoadTime,
                averageQueryTime: stats.avgQueryTime,
                totalErrors: stats.errorCount,
                totalQueries: stats.totalQueries,
                loadTimeHistory: this.performanceMetrics.loadTimes.slice(-10),
                queryTimeHistory: this.performanceMetrics.queryTimes.slice(-10)
            },
            browser: {
                userAgent: navigator.userAgent,
                viewport: {
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            }
        };

        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `kelly-dashboard-performance-${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    // Performance comparison utility
    async runPerformanceComparison() {
        console.log('🔍 Running dashboard performance comparison...');
        
        const results = {
            legacy: await this.benchmarkDashboard(false),
            optimized: await this.benchmarkDashboard(true)
        };
        
        const improvement = {
            loadTime: ((results.legacy.loadTime - results.optimized.loadTime) / results.legacy.loadTime * 100).toFixed(1),
            queryTime: ((results.legacy.queryTime - results.optimized.queryTime) / results.legacy.queryTime * 100).toFixed(1)
        };
        
        console.log('📊 Performance Comparison Results:');
        console.log(`Load Time: Legacy ${results.legacy.loadTime}ms vs Optimized ${results.optimized.loadTime}ms (${improvement.loadTime}% improvement)`);
        console.log(`Query Time: Legacy ${results.legacy.queryTime}ms vs Optimized ${results.optimized.queryTime}ms (${improvement.queryTime}% improvement)`);
        
        return { results, improvement };
    }

    async benchmarkDashboard(optimized) {
        return new Promise((resolve) => {
            const originalMode = this.isOptimizedEnabled;
            this.isOptimizedEnabled = optimized;
            
            const startTime = performance.now();
            
            this.cleanup();
            this.initializeDashboard();
            
            // Wait for dashboard to load
            setTimeout(() => {
                const loadTime = performance.now() - startTime;
                const avgQueryTime = this.performanceMetrics.queryTimes.length > 0
                    ? this.performanceMetrics.queryTimes.reduce((a, b) => a + b, 0) / this.performanceMetrics.queryTimes.length
                    : 0;
                
                // Restore original mode
                this.isOptimizedEnabled = originalMode;
                
                resolve({
                    loadTime: Math.round(loadTime),
                    queryTime: Math.round(avgQueryTime)
                });
            }, 3000);
        });
    }
}

// CSS for notifications and toggle
const integrationStyles = `
<style>
.dashboard-toggle-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 30px;
    border-radius: 15px;
    margin-bottom: 20px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
}

.toggle-info {
    display: flex;
    flex-direction: column;
    gap: 5px;
}

.toggle-label {
    font-size: 1.1rem;
    font-weight: 600;
}

.toggle-description {
    font-size: 0.9rem;
    opacity: 0.9;
}

.dashboard-toggle {
    position: relative;
    display: inline-block;
    width: 60px;
    height: 34px;
}

.dashboard-toggle input {
    opacity: 0;
    width: 0;
    height: 0;
}

.toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255,255,255,0.3);
    transition: .4s;
    border-radius: 34px;
}

.toggle-slider:before {
    position: absolute;
    content: "";
    height: 26px;
    width: 26px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
}

input:checked + .toggle-slider {
    background-color: rgba(76, 175, 80, 0.8);
}

input:checked + .toggle-slider:before {
    transform: translateX(26px);
}

.dashboard-notification {
    position: fixed;
    top: 20px;
    right: 20px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    min-width: 320px;
    z-index: 10000;
    transform: translateX(400px);
    transition: all 0.3s ease;
    border-left: 4px solid #4CAF50;
}

.dashboard-notification.error {
    border-left-color: #F44336;
}

.dashboard-notification.show {
    transform: translateX(0);
}

.dashboard-notification.hide {
    transform: translateX(400px);
    opacity: 0;
}

.notification-content {
    display: flex;
    align-items: center;
    padding: 20px;
    gap: 15px;
}

.notification-icon {
    font-size: 2rem;
    min-width: 40px;
    text-align: center;
}

.notification-text h4 {
    margin: 0 0 5px 0;
    color: #333;
    font-size: 1rem;
}

.notification-text p {
    margin: 0;
    color: #666;
    font-size: 0.9rem;
}

.notification-progress {
    height: 3px;
    background: linear-gradient(90deg, #4CAF50, #2196F3);
    animation: progress 2s linear;
}

@keyframes progress {
    from { width: 0%; }
    to { width: 100%; }
}

@media (max-width: 768px) {
    .dashboard-toggle-container {
        flex-direction: column;
        gap: 15px;
        text-align: center;
    }
    
    .dashboard-notification {
        right: 10px;
        left: 10px;
        min-width: auto;
        transform: translateY(-100px);
    }
    
    .dashboard-notification.show {
        transform: translateY(0);
    }
    
    .dashboard-notification.hide {
        transform: translateY(-100px);
    }
}
</style>
`;

// Inject styles
document.head.insertAdjacentHTML('beforeend', integrationStyles);

// Global instance
let dashboardIntegration = null;

// Initialize integration only when admin dashboard is accessed
function initializeDashboardIntegration() {
    if (!dashboardIntegration) {
        dashboardIntegration = new DashboardIntegration();
        dashboardIntegration.init();
        
        // Make available globally for debugging
        window.dashboardIntegration = dashboardIntegration;
    }
}

// Make function globally available
window.initializeDashboardIntegration = initializeDashboardIntegration;

// Performance testing utilities
window.runDashboardBenchmark = () => {
    if (dashboardIntegration) {
        return dashboardIntegration.runPerformanceComparison();
    }
};

window.exportDashboardPerformance = () => {
    if (dashboardIntegration) {
        dashboardIntegration.exportPerformanceReport();
    }
};