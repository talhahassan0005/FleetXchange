# Project Startup Guide

## Problem Fixed! 🎉

The issue was that `export default router;` was in the middle of the routes file (pods.ts), causing routes defined after it to not be registered.

**Fixed:** Moved the export statement to the end of the file.

## How to Start the Project

### 1. Start Backend Server

```powershell
cd workspace\backend
npm run dev
```

**Expected Output:**
```
Server running on port 5000
MongoDB connected successfully
WebSocket server initialized
```

### 2. Start Frontend Development Server

```powershell
cd workspace\shadcn-ui
npm run dev
```

**Expected Output:**
```
VITE ready in XXXms
Local: http://localhost:5173/
```

## Files Fixed

### Backend:
- ✅ `workspace/backend/src/routes/pods.ts` - Moved export to end of file
- ✅ All routes now properly registered

### Frontend:
- ✅ `workspace/shadcn-ui/src/pages/PodsPage.tsx` - Fixed status comparison error

## Common Issues & Solutions

### Issue 1: Port Already in Use
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solution:**
```powershell
# Kill the process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F

# Or change the port in backend/.env
PORT=5001
```

### Issue 2: MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```

**Solution:**
```powershell
# Start MongoDB
net start MongoDB

# Or if using MongoDB replica set
.\start-mongodb-replica.bat
```

### Issue 3: Module Not Found
```
Error: Cannot find module 'express'
```

**Solution:**
```powershell
# Reinstall dependencies
cd workspace\backend
npm install

cd ..\shadcn-ui
npm install
```

### Issue 4: TypeScript Compilation Error
```
Error: TS2304: Cannot find name 'X'
```

**Solution:**
```powershell
# Clean build cache
cd workspace\backend
rmdir /s /q node_modules
rmdir /s /q dist
npm install

cd ..\shadcn-ui
rmdir /s /q node_modules
rmdir /s /q .vite
npm install
```

## Testing After Startup

### 1. Check Backend Health
```powershell
# Test API endpoint
curl http://localhost:5000/api/health
```

### 2. Check Frontend
- Open browser: http://localhost:5173
- You should see the login page

### 3. Test Login
- **Admin:** admin@fleetxchange.com / admin123
- **Client:** Test client account
- **Transporter:** Test transporter account

## New Features Available After Startup

### For Admin:
1. Navigate to any load
2. Click "View Financials" or go to `/load/{loadId}/financials`
3. You can:
   - Approve PODs
   - Approve Invoices
   - Generate client invoices with commission
   - Track payments

### For Client:
1. Go to "Review PODs/Invoices" tab
2. Select a load
3. You can:
   - Approve/Reject PODs
   - Approve/Reject invoices
   - View financial summary

### For Transporter:
1. Go to `/pods` page
2. Upload POD for assigned load
3. After approval, submit invoice
4. Track status updates

## Verification Checklist

- ✅ Backend starts without errors
- ✅ Frontend starts without errors
- ✅ Can login successfully
- ✅ Can navigate to different portals
- ✅ POD upload works
- ✅ Invoice submission works
- ✅ Admin/Client approval works
- ✅ Real-time updates work (WebSocket)

## Troubleshooting Commands

```powershell
# Check if servers are running
netstat -ano | findstr "5000 5173"

# View backend logs
cd workspace\backend
npm run dev

# View frontend logs
cd workspace\shadcn-ui
npm run dev

# Check Node.js version (should be 16+)
node --version

# Check npm version
npm --version
```

## Environment Variables

Make sure these are set in `workspace/backend/.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/fleetxchange
JWT_SECRET=your-secret-key-here
JWT_EXPIRES_IN=7d
```

## Next Steps After Startup

1. ✅ Login as admin
2. ✅ Create test load
3. ✅ Assign to transporter
4. ✅ Transporter uploads POD
5. ✅ Admin/Client approves POD
6. ✅ Transporter submits invoice
7. ✅ Admin generates client invoice
8. ✅ Check financial dashboard

---

## Quick Start Commands (Copy-Paste)

### Terminal 1 - Backend:
```powershell
cd C:\Users\Talha\Downloads\Logistics\workspace\backend
npm run dev
```

### Terminal 2 - Frontend:
```powershell
cd C:\Users\Talha\Downloads\Logistics\workspace\shadcn-ui
npm run dev
```

That's it! Project should be running now! 🚀
