/*
Copyright (c) 2025 Rodrigo Bermudez Cafe Cultura LLC
All rights reserved.
*/

// Simplified document completion function loaded

// Mobile detection variables
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/.test(navigator.userAgent);
const isChrome = /Chrome/.test(navigator.userAgent);

// SIMPLIFIED DOCUMENT COMPLETION FUNCTION
async function submitDocumentCompletionSimplified(event) {
    event.preventDefault();
    
    // Disable submit button to prevent double submission
    const submitButton = event.target.querySelector('button[type="submit"]');
    const originalText = submitButton.textContent;
    
    if (submitButton.disabled) {
        console.log('⏳ Submit already in progress, ignoring additional clicks');
        return;
    }
    
    submitButton.disabled = true;
    submitButton.textContent = '⏳ Processing...';
    submitButton.style.opacity = '0.6';
    submitButton.style.cursor = 'not-allowed';
    
    try {
        console.log('🚀 SIMPLIFIED: Starting document completion...');
        
        const name = document.getElementById('doc-name').value.trim();
        console.log(`📝 Name: ${name}`);
        
        // Basic validation
        if (!name) {
            showErrorMessage('Please enter your full name.');
            return;
        }
        
        // Get simple queue number based on timestamp
        const now = new Date();
        const queueNumber = Math.floor(now.getTime() / 1000) % 10000; // Simple queue number
        
        console.log(`🔢 Queue number: ${queueNumber}`);
        
        // Create simple completion data (no recruiter assignment needed)
        const completionData = {
            type: 'document-completion',
            name: name,
            queueNumber: queueNumber,
            assignedRecruiter: 'Front Desk Administrator',
            recruiterEmail: 'admin@kellyeducation.com',
            timestamp: new Date().toISOString(), // Use regular timestamp instead of server timestamp for mobile compatibility
            date: new Date().toISOString().split('T')[0],
            time: now.toLocaleString(),
            completedAt: new Date().toLocaleString(),
            submissionTime: now.getTime(), // Add numeric timestamp for sorting
            simplified: true // Flag to indicate this is simplified version
        };
        
        console.log('💾 Saving to database...');
        
        // Save to database with mobile retry logic - ONLY document-completions collection which allows public writes
        let saveResult = null;
        let retryAttempts = 0;
        const maxRetries = 3;
        
        while (retryAttempts < maxRetries) {
            try {
                console.log(`💾 Attempt ${retryAttempts + 1}/${maxRetries}: Saving to Firestore...`);
                
                // Mobile-specific Firebase initialization check and wait
                if (isIOS || (isAndroid && isChrome)) {
                    // Wait longer on mobile devices
                    await new Promise(resolve => setTimeout(resolve, 1000 + (retryAttempts * 500)));
                    
                    // Verify Firebase is fully initialized
                    if (!db || !db.collection) {
                        throw new Error('Firebase database not initialized');
                    }
                    
                    // Additional mobile-specific Firebase ready check
                    try {
                        // Test Firebase connectivity with a dummy read
                        const testRef = db.collection('document-completions').limit(1);
                        console.log('🧪 Testing Firebase connectivity...');
                        await testRef.get();
                        console.log('✅ Firebase connectivity test passed');
                    } catch (testError) {
                        console.log(`❌ Firebase connectivity test failed: ${testError.message}`);
                        if (retryAttempts === 0) {
                            // On first attempt, try to reinitialize Firebase for mobile
                            console.log('🔄 Attempting Firebase reinitialization...');
                            if (window.firebase && window.firebase.apps.length > 0) {
                                // Firebase is initialized, force a new instance reference
                                window.db = window.firebase.firestore();
                                db = window.db;
                                console.log('🔄 Firebase reference refreshed');
                            }
                        }
                        throw testError;
                    }
                }
                
                saveResult = await db.collection('document-completions').add(completionData);
                
                console.log(`✅ SUCCESS on attempt ${retryAttempts + 1}: Document ID ${saveResult.id}`);
                break; // Success, exit retry loop
                
            } catch (retryError) {
                retryAttempts++;
                console.error(`❌ Attempt ${retryAttempts}/${maxRetries} failed: ${retryError.message}`, retryError);
                
                if (retryAttempts >= maxRetries) {
                    // Last resort: Try alternative mobile submission method
                    if (isIOS || (isAndroid && isChrome)) {
                        console.log('🚨 All Firebase attempts failed. Trying alternative method...');
                        try {
                            await submitViaMobileFallback(completionData);
                            console.log('✅ SUCCESS via mobile fallback method!');
                            break; // Success via fallback
                        } catch (fallbackError) {
                            console.log(`❌ Mobile fallback also failed: ${fallbackError.message}`);
                            throw retryError; // Throw original error
                        }
                    } else {
                        throw retryError; // Re-throw the last error if all retries failed
                    }
                }
                
                // Wait before retry (exponential backoff)
                const waitTime = Math.pow(2, retryAttempts) * 1000;
                console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
        }
        
        console.log('✅ Saved successfully!');
        
        // Update completion screen
        document.getElementById('completion-name').textContent = name;
        document.getElementById('completion-queue').textContent = `#${queueNumber}`;
        document.getElementById('completion-time').textContent = now.toLocaleString();
        
        console.log('🔄 Showing success screen...');
        
        // Force scroll to top before showing success
        window.scrollTo(0, 0);
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
        
        // Show success screen
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        if (isMobile) {
            showScreenMobile('document-completion-success');
        } else {
            showScreen('document-completion-success');
        }
        
        // Additional scroll after delay
        setTimeout(() => {
            window.scrollTo(0, 0);
            console.log('✅ SUCCESS! Screen shown and scrolled to top');
        }, 500);
        
        // Play success sound
        playSuccessSound();
        
        // Clear form
        document.querySelector('#document-completion-form form').reset();
        
    } catch (error) {
        const errorMsg = `❌ FINAL Error: ${error.message}`;
        console.error(errorMsg, error);
        
        // Log error details
        console.error('❌ Error Code:', error.code || 'unknown');
        console.error('❌ Error Name:', error.name || 'unknown');
        console.error('❌ Full Error:', error);
        
        // More specific error messages for mobile debugging
        let userErrorMessage = 'Error submitting completion. Please try again.';
        
        if (error.message.includes('permission')) {
            userErrorMessage = 'Permission error. Try refreshing the page and submitting again.';
            console.log('🔄 SUGGESTED: Refresh page and try again');
        } else if (error.message.includes('network') || error.message.includes('UNAVAILABLE')) {
            userErrorMessage = 'Network error. Check your internet connection and try again.';
            console.log('📶 SUGGESTED: Check internet connection');
        } else if (error.message.includes('showScreen')) {
            userErrorMessage = 'Success! Your submission was saved but display failed. Check the queue.';
            console.log('✅ DATA SAVED: Check admin queue for your submission');
        } else if (error.message.includes('mobile fallback')) {
            userErrorMessage = 'Success! Your submission was saved using mobile backup method.';
            console.log('✅ MOBILE FALLBACK: Data saved successfully');
        } else if (error.message.includes('locally as backup')) {
            userErrorMessage = 'Submission saved locally. Please try again later when connection improves.';
            console.log('💾 EMERGENCY BACKUP: Data saved to device storage');
        }
        
        showErrorMessage(userErrorMessage);
        
        // Re-enable submit button on error
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            submitButton.style.opacity = '1';
            submitButton.style.cursor = 'pointer';
        }
        
        // Error handled
    }
}

// Mobile fallback submission method using different Firebase approach
async function submitViaMobileFallback(completionData) {
    // Try using direct Firebase SDK methods that are more mobile-compatible
    
    // Method 1: Force refresh Firebase connection
    if (window.firebase && window.firebase.firestore) {
        const freshDb = window.firebase.firestore();
        
        // Clear any existing offline data that might be causing issues
        if (freshDb.enableNetwork) {
            await freshDb.disableNetwork();
            await new Promise(resolve => setTimeout(resolve, 500));
            await freshDb.enableNetwork();
        }
        
        // Try with fresh connection
        const docRef = await freshDb.collection('document-completions').add(completionData);
        return docRef;
    }
    
    // Method 2: If Firebase is completely broken, use localStorage as emergency backup
    // This won't sync to server but prevents data loss
    const emergencyBackup = {
        id: `mobile_backup_${Date.now()}`,
        timestamp: new Date().toISOString(),
        data: completionData,
        needsSync: true
    };
    
    const backups = JSON.parse(localStorage.getItem('emergency_submissions') || '[]');
    backups.push(emergencyBackup);
    localStorage.setItem('emergency_submissions', JSON.stringify(backups));
    
    throw new Error('Firebase completely unavailable. Data saved locally as backup.');
}

// Add function to window object for global access
window.submitDocumentCompletionSimplified = submitDocumentCompletionSimplified;