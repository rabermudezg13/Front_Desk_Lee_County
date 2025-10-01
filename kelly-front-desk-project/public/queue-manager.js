/*
Copyright (c) 2025 Rodrigo Bermudez Cafe Cultura LLC
All rights reserved.
*/

// DOCUMENT COMPLETION QUEUE MANAGER

class QueueManager {
    constructor(db) {
        this.db = db;
        this.todayKey = this.getTodayKey();
    }

    // Get today's date key (YYYY-MM-DD format)
    getTodayKey() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    // Get the next queue number using Firestore transaction
    async getNextQueueNumber() {
        try {
            console.log('🔢 Getting next queue number for date:', this.todayKey);
            
            const counterRef = this.db.collection('counters').doc(`queue_${this.todayKey}`);
            
            return await this.db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                
                let nextNumber = 1;
                
                if (counterDoc.exists) {
                    const currentData = counterDoc.data();
                    nextNumber = (currentData.lastNumber || 0) + 1;
                    console.log('📊 Found existing counter, next number:', nextNumber);
                } else {
                    console.log('🆕 Creating new counter for today, starting at:', nextNumber);
                }
                
                // Update the counter
                transaction.set(counterRef, {
                    lastNumber: nextNumber,
                    date: this.todayKey,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                return nextNumber;
            });
            
        } catch (error) {
            console.error('❌ Error getting next queue number:', error);
            throw new Error('Failed to generate queue number: ' + error.message);
        }
    }

    // Format queue number with date prefix
    formatQueueNumber(number) {
        const paddedNumber = number.toString().padStart(2, '0');
        return `${this.todayKey}-Q${paddedNumber}`;
    }

    // Add user to queue with consecutive number
    async addToQueue(userData) {
        try {
            console.log('🎫 Adding user to queue:', userData.name);
            console.log('🎫 User data:', userData);
            
            // Get next consecutive number
            console.log('📊 Getting next queue number...');
            const queueNumber = await this.getNextQueueNumber();
            const formattedNumber = this.formatQueueNumber(queueNumber);
            
            console.log('📝 Assigned queue number:', formattedNumber);
            
            // Prepare queue entry
            const queueEntry = {
                userId: userData.userId,
                name: userData.name,
                turno: queueNumber,
                formattedTurno: formattedNumber,
                estado: 'esperando',
                completedSteps: userData.completedSteps || {},
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                date: this.todayKey,
                time: new Date().toLocaleString(),
                assignedRecruiter: 'Front Desk Administrator',
                recruiterEmail: 'admin@kellyeducation.com',
                type: 'document-completion',
                persistent: true
            };
            
            // Save to both collections
            console.log('💾 Preparing batch write...');
            const batch = this.db.batch();
            
            // Add to daily queue
            const queueRef = this.db.collection('queue').doc(this.todayKey).collection('entries').doc();
            console.log('📁 Queue ref path:', queueRef.path);
            batch.set(queueRef, queueEntry);
            
            // Add to document-completions (for compatibility with existing admin dashboard)
            const completionRef = this.db.collection('document-completions').doc();
            console.log('📁 Completion ref path:', completionRef.path);
            const completionData = {
                ...queueEntry,
                queueNumber: queueNumber, // Keep original field for compatibility
                queueId: formattedNumber   // New formatted field
            };
            console.log('📄 Completion data:', completionData);
            batch.set(completionRef, completionData);
            
            console.log('💾 Committing batch...');
            await batch.commit();
            console.log('✅ Batch committed successfully');
            
            console.log('✅ User successfully added to queue with number:', formattedNumber);
            
            return {
                success: true,
                queueNumber: queueNumber,
                formattedNumber: formattedNumber,
                queueEntry: queueEntry
            };
            
        } catch (error) {
            console.error('❌ Error adding to queue:', error);
            throw new Error('Failed to add to queue: ' + error.message);
        }
    }

    // Get current queue for today
    async getTodaysQueue() {
        try {
            console.log('📋 Loading today\'s queue for:', this.todayKey);
            
            const queueSnapshot = await this.db
                .collection('queue')
                .doc(this.todayKey)
                .collection('entries')
                .orderBy('turno', 'asc')
                .get();
            
            const queueEntries = [];
            queueSnapshot.forEach(doc => {
                queueEntries.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('📊 Found', queueEntries.length, 'entries in today\'s queue');
            return queueEntries;
            
        } catch (error) {
            console.error('❌ Error loading today\'s queue:', error);
            return [];
        }
    }

    // Update queue entry status
    async updateQueueStatus(entryId, newStatus) {
        try {
            console.log('🔄 Updating queue entry status:', entryId, 'to', newStatus);
            
            const entryRef = this.db
                .collection('queue')
                .doc(this.todayKey)
                .collection('entries')
                .doc(entryId);
                
            await entryRef.update({
                estado: newStatus,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Queue entry status updated successfully');
            
        } catch (error) {
            console.error('❌ Error updating queue status:', error);
            throw new Error('Failed to update queue status: ' + error.message);
        }
    }

    // Setup real-time listener for today's queue
    setupQueueListener(callback) {
        console.log('🔔 Setting up real-time queue listener for:', this.todayKey);
        
        return this.db
            .collection('queue')
            .doc(this.todayKey)
            .collection('entries')
            .orderBy('turno', 'asc')
            .onSnapshot(
                (snapshot) => {
                    const queueEntries = [];
                    snapshot.forEach(doc => {
                        queueEntries.push({
                            id: doc.id,
                            ...doc.data()
                        });
                    });
                    
                    console.log('🔄 Queue updated, entries:', queueEntries.length);
                    callback(queueEntries);
                },
                (error) => {
                    console.error('❌ Error in queue listener:', error);
                    callback([]);
                }
            );
    }

    // Get queue statistics
    async getQueueStats() {
        try {
            const queueEntries = await this.getTodaysQueue();
            
            const stats = {
                total: queueEntries.length,
                esperando: queueEntries.filter(entry => entry.estado === 'esperando').length,
                enProceso: queueEntries.filter(entry => entry.estado === 'en proceso').length,
                completado: queueEntries.filter(entry => entry.estado === 'completado').length,
                lastNumber: queueEntries.length > 0 ? Math.max(...queueEntries.map(e => e.turno)) : 0
            };
            
            return stats;
            
        } catch (error) {
            console.error('❌ Error getting queue stats:', error);
            return {
                total: 0,
                esperando: 0,
                enProceso: 0,
                completado: 0,
                lastNumber: 0
            };
        }
    }

    // Reset queue at midnight (utility function)
    scheduleQueueReset() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const timeUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            console.log('🌅 New day started, updating queue key');
            this.todayKey = this.getTodayKey();
            
            // Schedule the next reset
            this.scheduleQueueReset();
        }, timeUntilMidnight);
        
        console.log('⏰ Queue reset scheduled for midnight');
    }
}

// Queue UI Manager
class QueueUIManager {
    constructor(queueManager) {
        this.queueManager = queueManager;
        this.queueListener = null;
    }

    // Render queue table
    renderQueueTable(entries, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (entries.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <div style="font-size: 48px; margin-bottom: 20px;">📋</div>
                    <h3>No Queue Entries Today</h3>
                    <p>The queue is empty for ${this.queueManager.todayKey}</p>
                </div>
            `;
            return;
        }

        const tableHTML = `
            <div class="queue-header">
                <h3>📋 Document Completion Queue - ${this.queueManager.todayKey}</h3>
                <div class="queue-stats">
                    <span class="stat-badge waiting">Waiting: ${entries.filter(e => e.estado === 'esperando').length}</span>
                    <span class="stat-badge processing">Processing: ${entries.filter(e => e.estado === 'en proceso').length}</span>
                    <span class="stat-badge completed">Completed: ${entries.filter(e => e.estado === 'completado').length}</span>
                </div>
            </div>
            
            <div class="queue-table-container">
                <table class="queue-table">
                    <thead>
                        <tr>
                            <th>Queue #</th>
                            <th>Name</th>
                            <th>Time</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entries.map(entry => `
                            <tr class="queue-row status-${entry.estado}">
                                <td class="queue-number">
                                    <span class="queue-badge">${entry.formattedTurno || entry.turno}</span>
                                </td>
                                <td class="queue-name">
                                    <strong>${entry.name || 'N/A'}</strong>
                                </td>
                                <td class="queue-time">
                                    ${entry.time || 'N/A'}
                                </td>
                                <td class="queue-status">
                                    <span class="status-badge status-${entry.estado}">
                                        ${this.formatStatus(entry.estado)}
                                    </span>
                                </td>
                                <td class="queue-actions">
                                    ${this.renderActionButtons(entry)}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = tableHTML;
    }

    // Format status text
    formatStatus(status) {
        const statusMap = {
            'esperando': '⏳ Waiting',
            'en proceso': '🔄 Processing',
            'completado': '✅ Completed',
            'cancelado': '❌ Cancelled'
        };
        return statusMap[status] || status;
    }

    // Render action buttons based on status
    renderActionButtons(entry) {
        const baseClass = 'btn btn-sm';
        
        switch (entry.estado) {
            case 'esperando':
                return `
                    <button class="${baseClass} btn-primary" onclick="queueUIManager.updateStatus('${entry.id}', 'en proceso')">
                        Start Processing
                    </button>
                `;
            case 'en proceso':
                return `
                    <button class="${baseClass} btn-success" onclick="queueUIManager.updateStatus('${entry.id}', 'completado')">
                        Mark Complete
                    </button>
                    <button class="${baseClass} btn-secondary" onclick="queueUIManager.updateStatus('${entry.id}', 'esperando')">
                        Back to Queue
                    </button>
                `;
            case 'completado':
                return `
                    <button class="${baseClass} btn-secondary" onclick="queueUIManager.updateStatus('${entry.id}', 'esperando')">
                        Reopen
                    </button>
                `;
            default:
                return '';
        }
    }

    // Update status with UI feedback
    async updateStatus(entryId, newStatus) {
        try {
            await this.queueManager.updateQueueStatus(entryId, newStatus);
            // UI will update automatically via real-time listener
        } catch (error) {
            alert('Error updating status: ' + error.message);
        }
    }

    // Setup real-time updates
    setupRealtimeUpdates(containerId) {
        if (this.queueListener) {
            this.queueListener(); // Unsubscribe previous listener
        }

        this.queueListener = this.queueManager.setupQueueListener((entries) => {
            this.renderQueueTable(entries, containerId);
        });
    }

    // Cleanup
    destroy() {
        if (this.queueListener) {
            this.queueListener();
            this.queueListener = null;
        }
    }
}

// Global instances
let queueManager = null;
let queueUIManager = null;

// Initialize queue manager
function initQueueManager() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        queueManager = new QueueManager(db);
        queueUIManager = new QueueUIManager(queueManager);
        
        // Expose globally
        window.queueManager = queueManager;
        window.queueUIManager = queueUIManager;
        
        // Schedule automatic queue reset
        queueManager.scheduleQueueReset();
        
        console.log('✅ Queue Manager initialized successfully');
        return true;
    } else {
        console.error('❌ Firebase not available for queue manager');
        return false;
    }
}

// Export for global use
window.QueueManager = QueueManager;
window.QueueUIManager = QueueUIManager;
window.initQueueManager = initQueueManager;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initQueueManager, 1000);
});