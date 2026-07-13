async function notifyNewUserWebhook(username, email, userId) {
    try {
        await supabaseFetch(API_URL + '/rpc/send_to_discord', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ p_type: 'new_user', p_body: JSON.stringify({ username: username, email: email, user_id: userId }) })
        });
    } catch (e) {
        console.warn('Failed to send Discord webhook:', e);
    }
}
