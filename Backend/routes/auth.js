const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Redirect user to Ola OAuth page
router.get('/ola', (req, res) => {
   
    const username = req.query.username; 
    if (username) {
        req.session.pendingUsername = username;
    }
    
   
    const olaAuthUrl = `https://devapi.olacabs.com/oauth2/authorize?` +
        `response_type=token&` +
        `client_id=${process.env.OLA_CLIENT_ID}&` +
        `redirect_uri=${encodeURIComponent(process.env.OLA_REDIRECT_URI)}&` +
        `scope=profile%20booking&` +
        `state=state123`;
    
    console.log('🔗 Redirecting to Ola OAuth:', olaAuthUrl);
    res.redirect(olaAuthUrl);
});

//  Handle OAuth callback (Ola returns token in URL fragment)
router.get('/ola/callback', (req, res) => {
 
    
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Ola Authorization</title>
        </head>
        <body>
            <h2>Processing Ola Authorization...</h2>
            <script>
                // Extract access token from URL fragment
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                
                const accessToken = params.get('access_token');
                const expiresIn = params.get('expires_in');
                const tokenType = params.get('token_type');
                const scope = params.get('scope');
                const state = params.get('state');
                
                if (accessToken) {
                    // Send token to backend
                    fetch('/auth/ola/save-token', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            access_token: accessToken,
                            expires_in: parseInt(expiresIn),
                            token_type: tokenType,
                            scope: scope
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('✅ Ola account linked successfully!');
                            window.location.href = '/?ola_auth=success';
                        } else {
                            alert('❌ Failed to save Ola token');
                            window.location.href = '/?error=token_save_failed';
                        }
                    })
                    .catch(error => {
                        console.error('Error saving token:', error);
                        window.location.href = '/?error=token_save_failed';
                    });
                } else {
                    alert('❌ Authorization failed - no access token received');
                    window.location.href = '/?error=ola_auth_failed';
                }
            </script>
        </body>
        </html>
    `);
});

// Step 3: Save token to session and database
router.post('/ola/save-token', async (req, res) => {
    try {
        const tokens = req.body;
        
        req.session.olaTokens = tokens;
        
        const username = req.session.pendingUsername;
        if (username) {
        
            const { error } = await supabase
                .from('alerts')
                .update({ user_oauth_tokens: tokens })
                .eq('username', username.toLowerCase())
                .eq('status', 'active')
                .order('created_at', { ascending: false })
                .limit(1);
            
            if (error) {
                console.error('Error updating alert with tokens:', error);
            } else {
                console.log('✅ Tokens saved for user:', username);
            }
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error saving Ola tokens:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check Ola auth status
router.get('/ola/status', (req, res) => {
    const authenticated = !!(req.session.olaTokens?.access_token);
    res.json({ authenticated });
});


module.exports = router;
