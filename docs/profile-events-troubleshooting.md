# Profile Events Not Showing - Troubleshooting Guide

## ❌ **Issue**: Events table under profile shows no events despite users having signups

### 🔍 **Root Cause**
The issue was caused by browser caching of the `/api/user/events` endpoint. When the endpoint was first called (before any signups existed), it returned an empty array. The browser cached this response and continued serving the cached empty result even after users signed up for events.

### ✅ **Solution Applied**

**Backend Fix**: Added cache control headers to prevent stale data
```javascript
// In /backend/routes/user.js - /events endpoint
res.set({
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache', 
  'Expires': '0'
});
```

**Logging Added**: Added console log to verify data is being returned
```javascript
console.log(`Returning ${formattedEvents.length} events for user ${req.user.currentUser.student_id}`);
```

## 🧪 **To Test the Fix**

### 1. Clear Browser Cache
**Chrome/Firefox:**
- Press `Ctrl+Shift+R` (hard refresh)
- Or `F12` → Network tab → right-click → "Clear browser cache"
- Or incognito/private window

### 2. Verify Backend Response
```bash
# Check backend logs for the new logging
docker-compose logs --tail=20 backend | grep "Returning.*events"
```

### 3. Check Database Has Signups
```bash
# Verify signups exist in database
docker-compose exec postgres psql -U webapp_user -d webapp_db -c "
SELECT u.student_id, ce.title, es.signup_date 
FROM event_signups es 
JOIN users u ON es.user_id = u.id 
JOIN calendar_events ce ON es.event_id = ce.id 
ORDER BY es.signup_date DESC LIMIT 5;"
```

### 4. Test API Directly
```bash
# Check API returns fresh data (will show 401 without auth)
curl -I http://localhost:3001/api/user/events
# Should show Cache-Control headers: no-cache, no-store, must-revalidate
```

## 📊 **Expected Behavior**

### Before Fix:
- First request: `GET /api/user/events` → 200 (empty array)  
- Subsequent requests: `GET /api/user/events` → 304 (cached empty array)
- Profile shows: No events

### After Fix:
- All requests: `GET /api/user/events` → 200 (fresh data)
- Backend logs: "Returning X events for user STUDENT_ID"
- Profile shows: All signed up events

## 🔧 **Additional Checks**

### Verify User Has Signups
```sql
-- Run in database to check specific user
SELECT ce.title, es.signup_date 
FROM event_signups es 
JOIN calendar_events ce ON es.event_id = ce.id 
WHERE es.user_id = YOUR_USER_ID;
```

### Check Frontend Network Tab
1. Open browser dev tools (F12)
2. Go to Network tab
3. Navigate to profile page
4. Look for `/api/user/events` request
5. Should see `200` status instead of `304`

### Verify Response Data
In Network tab, click on `/api/user/events` request:
- **Response**: Should contain array of events
- **Headers**: Should show `Cache-Control: no-cache, no-store, must-revalidate`

## 🚨 **If Issue Persists**

### 1. Force Browser Cache Clear
```javascript
// Append timestamp to force fresh request (frontend fix)
fetch(`/api/user/events?t=${Date.now()}`)
```

### 2. Check User Authentication
```bash
# Verify user is properly authenticated
docker-compose logs backend | grep "profile" | tail -5
```

### 3. Test Different User
- Login as different user who has event signups
- Check if their events show up

### 4. Restart Services
```bash
# Full restart if needed
docker-compose restart backend frontend
```

## ✅ **Current Status**

**Fixed**: Backend now sends proper cache headers to prevent stale data

**Users should**:
1. Hard refresh their browser (`Ctrl+Shift+R`)
2. See their signed up events in the profile table
3. Get fresh data on every page load

**Monitoring**: Check backend logs for "Returning X events" messages to verify API is working

## 🔮 **Prevention**

This fix ensures:
- ✅ No more cached empty responses
- ✅ Fresh event data on every request  
- ✅ Immediate updates when users sign up/cancel
- ✅ Better user experience

The profile events table should now work correctly! 🎉