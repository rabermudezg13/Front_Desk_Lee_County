/*
Copyright (c) 2025 Rodrigo Bermudez Cafe Cultura LLC
All rights reserved.
VERSION: 2024-12-25
*/

// PERSISTENT DOCUMENT COMPLETION CHECKLIST

window.PersistentChecklist = class PersistentChecklist {
    constructor(db) {
        this.db = db;
        this.userId = null;
        this.userName = '';
        this.steps = {
            drug_screening: false,
            onboarding365: false,
            i9: false,
            fieldprint: false
        };
        this.init();
    }

    async init() {
        // Generate or retrieve user ID
        this.userId = this.getUserId();
        await this.loadUserProgress();
        this.renderChecklist();
        this.setupEventListeners();
    }

    getUserId() {
        let userId = localStorage.getItem('persistent_checklist_user_id');
        if (!userId) {
            userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('persistent_checklist_user_id', userId);
        }
        return userId;
    }

    async loadUserProgress() {
        try {
            const doc = await this.db.collection('document-completion-progress').doc(this.userId).get();
            if (doc.exists) {
                const data = doc.data();
                this.steps = { ...this.steps, ...data.steps };
                this.userName = data.userName || '';
            }
        } catch (error) {
            console.error('Error loading user progress:', error);
        }
    }

    async saveProgress() {
        try {
            await this.db.collection('document-completion-progress').doc(this.userId).set({
                userId: this.userId,
                userName: this.userName,
                steps: this.steps,
                updatedAt: new Date().toISOString()
            });
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }

    renderChecklist() {
        const container = document.getElementById('persistent-checklist-container');
        if (!container) return;

        const checkedCount = Object.values(this.steps).filter(Boolean).length;
        const totalSteps = Object.keys(this.steps).length;

        container.innerHTML = `
            <div class="checklist-header">
                <h3>📋 Document Completion Checklist</h3>
                
                <div class="name-section">
                    <label for="user-name">👤 Full Name:</label>
                    <input type="text" id="user-name" value="${this.userName}" placeholder="Enter your full name" class="name-input">
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(checkedCount / totalSteps) * 100}%"></div>
                </div>
                <p class="progress-text">${checkedCount}/${totalSteps} steps completed</p>
            </div>
            
            <div class="checklist-steps">
                <div class="step-item ${this.steps.drug_screening ? 'completed' : ''}" data-step="drug_screening">
                    <div class="step-checkbox">
                        <input type="checkbox" id="step-drug-screening" ${this.steps.drug_screening ? 'checked' : ''}>
                        <label for="step-drug-screening"></label>
                    </div>
                    <div class="step-content">
                        <h4>🧪 Drug Screening</h4>
                        <p>Please fill out the paper you have in front of you, only the yellow fields and your phone number on the back side. Wait for instructions from Kelly representatives to do drug screening.</p>
                    </div>
                </div>

                <div class="step-item ${this.steps.onboarding365 ? 'completed' : ''}" data-step="onboarding365">
                    <div class="step-checkbox">
                        <input type="checkbox" id="step-onboarding365" ${this.steps.onboarding365 ? 'checked' : ''}>
                        <label for="step-onboarding365"></label>
                    </div>
                    <div class="step-content">
                        <h4>💼 Onboarding 365</h4>
                        <p>Please search in your email for an email that says "First Steps with Kelly", click on the blue link that says Onboarding 365. When you receive the congratulations window, you can continue to the next step.</p>
                    </div>
                </div>

                <div class="step-item ${this.steps.i9 ? 'completed' : ''}" data-step="i9">
                    <div class="step-checkbox">
                        <input type="checkbox" id="step-i9" ${this.steps.i9 ? 'checked' : ''}>
                        <label for="step-i9"></label>
                    </div>
                    <div class="step-content">
                        <h4>📝 Form I-9</h4>
                        <p>Look for an email from Kelly with the title "Gryphon HR", fill out the information.</p>
                    </div>
                </div>

                <div class="step-item ${this.steps.fieldprint ? 'completed' : ''}" data-step="fieldprint">
                    <div class="step-checkbox">
                        <input type="checkbox" id="step-fieldprint" ${this.steps.fieldprint ? 'checked' : ''}>
                        <label for="step-fieldprint"></label>
                    </div>
                    <div class="step-content">
                        <h4>👆 Fingerprints</h4>
                        <p>If you haven't done fingerprints before, please only create the account by scanning the QR code that has the title "Fingerprints". You will schedule appointment, sign up, fill out the information. When it asks for Verification code, the system sends it to your email. When it asks for Fieldprint code, you stop there. Check the submit box and wait for us to call you.</p>
                    </div>
                </div>
            </div>

            <div class="checklist-actions">
                <button class="btn btn-reset" onclick="persistentChecklist.resetProgress()">
                    🔄 Reset Progress
                </button>
                ${checkedCount === totalSteps ? `
                    <button class="btn btn-success" onclick="persistentChecklist.completeProcess()">
                        ✅ All Steps Complete
                    </button>
                ` : ''}
            </div>
        `;
    }

    setupEventListeners() {
        const container = document.getElementById('persistent-checklist-container');
        if (!container) return;

        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.id.startsWith('step-')) {
                const stepKey = e.target.closest('.step-item').dataset.step;
                this.steps[stepKey] = e.target.checked;
                this.saveProgress();
                this.renderChecklist();
                
                // Add visual feedback
                const stepItem = e.target.closest('.step-item');
                stepItem.classList.add('update-flash');
                setTimeout(() => stepItem.classList.remove('update-flash'), 500);
            }
        });

        // Handle name input changes
        container.addEventListener('input', (e) => {
            if (e.target.id === 'user-name') {
                this.userName = e.target.value.trim();
                this.saveProgress();
            }
        });

        // Handle name input blur to re-render and save
        container.addEventListener('blur', (e) => {
            if (e.target.id === 'user-name') {
                this.userName = e.target.value.trim();
                this.saveProgress();
            }
        }, true);
    }

    async resetProgress() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
            this.userName = '';
            this.steps = {
                drug_screening: false,
                onboarding365: false,
                i9: false,
                fieldprint: false
            };
            await this.saveProgress();
            this.renderChecklist();
        }
    }

    async completeProcess() {
        try {
            console.log('🔍 completeProcess() called on:', this.constructor.name);
            console.log('🔍 containerId:', this.containerId);
            
            // Validate that name is provided
            if (!this.userName.trim()) {
                alert('Please enter your full name before completing the process.');
                document.getElementById('user-name')?.focus();
                return;
            }

            // Save completion record
            await this.db.collection('document-queue').add({
                type: 'document-completion',
                name: this.userName,
                userId: this.userId,
                completedSteps: this.steps,
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleString(),
                completedAt: new Date().toLocaleString(),
                persistent: true
            });

            // Show success message (only for PersistentChecklist, not DocumentCompletionChecklist)
            if (this.constructor.name !== 'DocumentCompletionChecklist') {
                this.showChecklistSuccessMessage();
            } else {
                console.log('Skipping showChecklistSuccessMessage for DocumentCompletionChecklist');
            }
            
            // Optionally reset after completion
            setTimeout(() => {
                if (confirm('Process completed! Would you like to reset for a new session?')) {
                    this.resetProgress();
                }
            }, 2000);

        } catch (error) {
            console.error('Error completing process:', error);
            alert('Error saving completion. Please try again.');
        }
    }

    showChecklistSuccessMessage() {
        // Check if this is being called from DocumentCompletionChecklist context
        if (this.containerId === 'document-completion-checklist-container') {
            console.warn('showChecklistSuccessMessage called on DocumentCompletionChecklist - this should not happen');
            console.warn('Using DocumentCompletionChecklist override instead');
            return; // Prevent parent method execution
        }
        
        const container = document.getElementById('persistent-checklist-container');
        if (!container) {
            console.warn('Container not found for checklist success message');
            return;
        }
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-content">
                <h3>🎉 Congratulations, ${this.userName}!</h3>
                <p>All document completion steps have been finished successfully.</p>
                <p>Please proceed to the front desk for next steps.</p>
            </div>
        `;
        
        container.insertBefore(successDiv, container.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }
}

// Document Completion Checklist Class (for document-completion-form page)
window.DocumentCompletionChecklist = class DocumentCompletionChecklist extends PersistentChecklist {
    constructor(db) {
        super(db);
        this.containerId = 'document-completion-checklist-container';
        
        // SAFETY: Override any potential showSuccessMessage calls to prevent container errors
        this.showSuccessMessage = function(message) {
            console.warn('🚨 showSuccessMessage called on DocumentCompletionChecklist - preventing potential error');
            console.warn('🚨 Message was:', message);
            console.warn('🚨 Using showChecklistSuccessMessage instead');
            if (typeof message === 'string') {
                // If it's a string message, show it using the global function
                if (window.showSuccessMessage && typeof window.showSuccessMessage === 'function') {
                    window.showSuccessMessage(message);
                }
            }
            // Don't execute any container operations
            return;
        };
    }

    renderChecklist() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const checkedCount = Object.values(this.steps).filter(Boolean).length;
        const totalSteps = Object.keys(this.steps).length;

        container.innerHTML = `
            <div class="checklist-header">
                <h3>📋 Document Completion Checklist</h3>
                
                <div class="name-section">
                    <label for="doc-completion-user-name">👤 Full Name:</label>
                    <input type="text" id="doc-completion-user-name" value="${this.userName}" placeholder="Enter your full name" class="name-input">
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${(checkedCount / totalSteps) * 100}%"></div>
                </div>
                <p class="progress-text">${checkedCount}/${totalSteps} steps completed</p>
            </div>
            
            <div class="checklist-steps">
                <div class="step-item ${this.steps.drug_screening ? 'completed' : ''}" data-step="drug_screening">
                    <div class="step-checkbox">
                        <input type="checkbox" id="doc-step-drug-screening" ${this.steps.drug_screening ? 'checked' : ''}>
                        <label for="doc-step-drug-screening"></label>
                    </div>
                    <div class="step-content">
                        <h4>🧪 Drug Screening</h4>
                        <p>Please fill out the paper you have in front of you, only the yellow fields and your phone number on the back side. Wait for instructions from Kelly representatives to do drug screening.</p>
                    </div>
                </div>

                <div class="step-item ${this.steps.onboarding365 ? 'completed' : ''}" data-step="onboarding365">
                    <div class="step-checkbox">
                        <input type="checkbox" id="doc-step-onboarding365" ${this.steps.onboarding365 ? 'checked' : ''}>
                        <label for="doc-step-onboarding365"></label>
                    </div>
                    <div class="step-content">
                        <h4>💼 Onboarding 365</h4>
                        <p>Please search in your email for an email that says "First Steps with Kelly", click on the blue link that says Onboarding 365. When you receive the congratulations window, you can continue to the next step.</p>
                    </div>
                </div>

                <div class="step-item ${this.steps.i9 ? 'completed' : ''}" data-step="i9">
                    <div class="step-checkbox">
                        <input type="checkbox" id="doc-step-i9" ${this.steps.i9 ? 'checked' : ''}>
                        <label for="doc-step-i9"></label>
                    </div>
                    <div class="step-content">
                        <h4>📝 Form I-9</h4>
                        <p>Look for an email from Kelly with the title "Gryphon HR", fill out the information.</p>
                    </div>
                </div>

                <div class="step-item ${this.steps.fieldprint ? 'completed' : ''}" data-step="fieldprint">
                    <div class="step-checkbox">
                        <input type="checkbox" id="doc-step-fieldprint" ${this.steps.fieldprint ? 'checked' : ''}>
                        <label for="doc-step-fieldprint"></label>
                    </div>
                    <div class="step-content">
                        <h4>👆 Fingerprints</h4>
                        <p>If you haven't done fingerprints before, please only create the account by scanning the QR code that has the title "Fingerprints". You will schedule appointment, sign up, fill out the information. When it asks for Verification code, the system sends it to your email. When it asks for Fieldprint code, you stop there. Check the submit box and wait for us to call you.</p>
                    </div>
                </div>
            </div>

            <div class="checklist-actions">
                <button class="btn btn-reset" onclick="documentCompletionChecklist.resetProgress()">
                    🔄 Reset Progress
                </button>
                <button class="btn btn-success" id="submit-completion-btn" onclick="documentCompletionChecklist.submitCompletion()" ${!this.userName.trim() ? 'disabled' : ''}>
                    ✅ Submit Document Completion
                </button>
            </div>
        `;
        
        // Update submit button state after render
        setTimeout(() => this.updateSubmitButton(), 100);
    }

    setupEventListeners() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox' && e.target.id.startsWith('doc-step-')) {
                const stepKey = e.target.closest('.step-item').dataset.step;
                this.steps[stepKey] = e.target.checked;
                this.saveProgress();
                this.renderChecklist();
                
                // Add visual feedback
                const stepItem = e.target.closest('.step-item');
                stepItem.classList.add('update-flash');
                setTimeout(() => stepItem.classList.remove('update-flash'), 500);
            }
        });

        // Handle name input changes
        container.addEventListener('input', (e) => {
            if (e.target.id === 'doc-completion-user-name') {
                this.userName = e.target.value.trim();
                this.saveProgress();
                this.updateSubmitButton();
            }
        });

        // Handle name input blur to re-render and save
        container.addEventListener('blur', (e) => {
            if (e.target.id === 'doc-completion-user-name') {
                this.userName = e.target.value.trim();
                this.saveProgress();
                this.updateSubmitButton();
            }
        }, true);
    }

    updateSubmitButton() {
        const submitBtn = document.getElementById('submit-completion-btn');
        if (submitBtn) {
            if (this.userName.trim()) {
                submitBtn.disabled = false;
                submitBtn.style.opacity = '1';
                submitBtn.style.cursor = 'pointer';
            } else {
                submitBtn.disabled = true;
                submitBtn.style.opacity = '0.5';
                submitBtn.style.cursor = 'not-allowed';
            }
        }
    }

    async submitCompletion() {
        try {
            console.log('🚀 Starting document completion submission...');
            
            // Mobile detection
            const isMobile = /iPad|iPhone|iPod|Android/i.test(navigator.userAgent);
            
            // Validate that name is provided
            if (!this.userName.trim()) {
                alert('Please enter your full name before submitting.');
                document.getElementById('doc-completion-user-name')?.focus();
                return;
            }

            console.log('✅ Name validated:', this.userName);

            // Disable submit button
            const submitBtn = document.getElementById('submit-completion-btn');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.textContent = '⏳ Submitting...';
            }

            // SIMPLE SUBMISSION - Get consecutive number
            console.log('📝 Using simple direct submission with consecutive numbering...');
            
            const todayKey = new Date().toISOString().split('T')[0];
            
            // Get next consecutive number using Firestore transaction
            const counterRef = this.db.collection('counters').doc(`queue_${todayKey}`);
            
            let queueNumber;
            try {
                queueNumber = await this.db.runTransaction(async (transaction) => {
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
                    date: todayKey,
                    updatedAt: new Date().toISOString()
                });
                
                return nextNumber;
            });
            } catch (transactionError) {
                console.error('Transaction failed:', transactionError);
                throw transactionError;
            }
            
            const formattedNumber = `${todayKey}-Q${queueNumber.toString().padStart(2, '0')}`;
            console.log('📝 Assigned consecutive queue number:', formattedNumber);

            // Prepare completion data
            const completionData = {
                type: 'document-completion',
                name: this.userName,
                queueNumber: queueNumber,
                formattedNumber: formattedNumber,
                userId: this.userId,
                completedSteps: this.steps,
                status: 'pending-recruiter-contact',
                assignedRecruiter: 'Front Desk Administrator',
                recruiterEmail: 'admin@kellyeducation.com',
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleString(),
                completedAt: new Date().toLocaleString(),
                persistent: true,
                simpleMode: true
            };

            console.log('💾 Saving to Firestore...');
            
            // Save completion record
            try {
                const docRef = await this.db.collection('document-queue').add(completionData);
                console.log('✅ Successfully saved with ID:', docRef.id);
            } catch (saveError) {
                console.error('❌ Save failed:', saveError);
                throw saveError;
            }

            // Show success message
            alert(`✅ Success! ${this.userName}, your queue number is ${formattedNumber}`);
            
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '✅ Submit Document Completion';
            }

        } catch (error) {
            console.error('❌ Error submitting completion:', error);
            
            // Re-enable submit button
            const submitBtn = document.getElementById('submit-completion-btn');
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '✅ Submit Document Completion';
            }
            
            // Simple error message
            alert(`❌ Error submitting completion: ${error.message}\n\nPlease try again.`);
        }
    }

    // Fallback method using old system
    async submitCompletionFallback() {
        try {
            console.log('🔄 Using fallback submission method...');
            
            const submitBtn = document.getElementById('submit-completion-btn');
            if (submitBtn) {
                submitBtn.textContent = '⏳ Submitting (Fallback)...';
            }

            // Generate old-style queue number
            const now = new Date();
            const queueNumber = Math.floor(now.getTime() / 1000) % 10000;

            // Prepare completion data
            const completionData = {
                type: 'document-completion',
                name: this.userName,
                queueNumber: queueNumber,
                userId: this.userId,
                completedSteps: this.steps,
                status: 'pending-recruiter-contact',
                assignedRecruiter: 'Front Desk Administrator',
                recruiterEmail: 'admin@kellyeducation.com',
                timestamp: new Date().toISOString(),
                date: new Date().toISOString().split('T')[0],
                time: new Date().toLocaleString(),
                completedAt: new Date().toLocaleString(),
                persistent: true,
                fallbackMode: true
            };

            // Save completion record
            const docRef = await this.db.collection('document-queue').add(completionData);
            
            console.log('✅ Fallback submission successful with ID:', docRef.id);

            // Show success message
            alert(`✅ Success! ${this.userName}, your queue number is #${queueNumber}`);
            
            // Re-enable submit button
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = '✅ Submit Document Completion';
            }

        } catch (error) {
            console.error('❌ Fallback submission failed:', error);
            throw error;
        }
    }

    // Override completeProcess to prevent parent method calls
    async completeProcess() {
        console.warn('completeProcess() called on DocumentCompletionChecklist - redirecting to submitCompletion()');
        return this.submitCompletion();
    }

    // Override showChecklistSuccessMessage to use correct container
    showChecklistSuccessMessage() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.warn('Container not found for checklist success message:', this.containerId);
            return;
        }
        
        const successDiv = document.createElement('div');
        successDiv.className = 'success-message';
        successDiv.innerHTML = `
            <div class="success-content">
                <h3>🎉 Congratulations, ${this.userName}!</h3>
                <p>Document completion submitted successfully!</p>
                <p>Please proceed to the front desk for next steps.</p>
            </div>
        `;
        
        container.insertBefore(successDiv, container.firstChild);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.remove();
            }
        }, 5000);
    }
}

// Global instances
let persistentChecklist = null;
let documentCompletionChecklist = null;

// EMERGENCY FIX: Override any accidental showSuccessMessage calls that might cause container issues
if (typeof window !== 'undefined') {
    const originalShowSuccessMessage = window.showSuccessMessage;
    window.showSuccessMessage = function(message) {
        // If this is being called without a string message (which suggests it's the wrong function call)
        if (typeof message !== 'string') {
            console.error('🚨 PREVENTED: showSuccessMessage called with non-string parameter:', message);
            console.error('🚨 This suggests a function call collision. Ignoring to prevent TypeError.');
            return;
        }
        
        // If the message contains container-related terms, it's likely the wrong call
        if (message && (message.toString().includes('container') || message.toString().includes('insertBefore'))) {
            console.error('🚨 PREVENTED: showSuccessMessage called with container-related parameter:', message);
            return;
        }
        
        // Otherwise, call the original function
        if (originalShowSuccessMessage) {
            return originalShowSuccessMessage.call(this, message);
        }
    };
}

// Initialize when DOM is ready and Firebase is available
function initPersistentChecklist() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        persistentChecklist = new PersistentChecklist(db);
    } else {
        console.error('Firebase not available for persistent checklist');
    }
}

// Initialize document completion checklist
function initDocumentCompletionChecklist() {
    if (typeof firebase !== 'undefined' && firebase.firestore) {
        const db = firebase.firestore();
        documentCompletionChecklist = new DocumentCompletionChecklist(db);
    } else {
        console.error('Firebase not available for document completion checklist');
    }
}

// Initialize when Firebase is ready
function initializeWhenReady() {
    if (typeof firebase !== 'undefined' && firebase.firestore && document.readyState === 'complete') {
        const db = firebase.firestore();
        
        // Initialize persistent checklist if container exists
        if (document.getElementById('persistent-checklist-container')) {
            persistentChecklist = new PersistentChecklist(db);
        }
        
        // Initialize document completion checklist if container exists
        if (document.getElementById('document-completion-checklist-container')) {
            documentCompletionChecklist = new DocumentCompletionChecklist(db);
        }
    } else {
        // Retry after a short delay
        setTimeout(initializeWhenReady, 200);
    }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeWhenReady();
});

// Also try to initialize when window loads (fallback)
window.addEventListener('load', function() {
    setTimeout(initializeWhenReady, 1000);
});

// Ultra-simple submission function for mobile fallback
// Remove this unused function since we have the main form working
window.submitCompletionUltraSimple = null;