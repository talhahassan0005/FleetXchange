# 🚀 FleetXchange Heroku Deployment Guide

This guide will help you deploy FleetXchange Backend and Frontend to Heroku.

## 📋 Prerequisites

1. **Heroku Account**: Create a free account at [heroku.com](https://signup.heroku.com/)
2. **Heroku CLI**: Install from [devcenter.heroku.com/articles/heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
3. **Git**: Ensure Git is installed on your system
4. **MongoDB Atlas**: Create a free MongoDB cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

## 🗄️ Step 1: Setup MongoDB Atlas

1. **Create MongoDB Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free M0 cluster
   - Choose your preferred region (closest to your Heroku region)

2. **Create Database User**:
   - Go to "Database Access"
   - Add a new database user
   - Choose a secure username and password
   - Give user "Read and write to any database" permissions

3. **Whitelist IP Addresses**:
   - Go to "Network Access"
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0) for Heroku
   - **Note**: For production, restrict to specific IPs for better security

4. **Get Connection String**:
   - Go to "Database" > "Connect"
   - Choose "Connect your application"
   - Copy the connection string
   - It will look like: `mongodb+srv://username:password@cluster.mongodb.net/fleetxchange?retryWrites=true&w=majority`
   - Replace `<password>` with your actual password

## 🔧 Step 2: Deploy Backend to Heroku

### 2.1 Login to Heroku
```bash
heroku login
```

### 2.2 Create Heroku App for Backend
```bash
# Navigate to backend folder
cd workspace/backend

# Create Heroku app (choose a unique name)
heroku create fleetxchange-backend

# Or let Heroku generate a random name
heroku create
```

### 2.3 Set Environment Variables
```bash
# MongoDB connection string (use your actual connection string)
heroku config:set MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/fleetxchange?retryWrites=true&w=majority"

# JWT Secret (use a strong random string)
heroku config:set JWT_SECRET="your-super-secret-jwt-key-change-this"

# Node environment
heroku config:set NODE_ENV=production

# Port (Heroku assigns this automatically, but we can set it)
heroku config:set PORT=5000

# CORS Origins (add your frontend Heroku URL after you deploy frontend)
heroku config:set CORS_ORIGINS="https://your-frontend-app.herokuapp.com"

# Rate limiting
heroku config:set RATE_LIMIT_WINDOW_MS=900000
heroku config:set RATE_LIMIT_MAX_REQUESTS=1000

# Admin password
heroku config:set ADMIN_PASSWORD="YourSecureAdminPassword123!"

# Optional: Email configuration (if you want to send emails)
heroku config:set EMAIL_HOST=smtp.gmail.com
heroku config:set EMAIL_PORT=587
heroku config:set EMAIL_USER="your-email@gmail.com"
heroku config:set EMAIL_PASSWORD="your-app-password"
heroku config:set EMAIL_FROM="FleetXchange <noreply@fleetxchange.com>"
```

### 2.4 Deploy Backend
```bash
# Make sure you're in the backend folder
cd workspace/backend

# Initialize git if not already done
git init

# Add Heroku remote
heroku git:remote -a fleetxchange-backend

# Deploy
git add .
git commit -m "Deploy backend to Heroku"
git push heroku main

# If you're using a different branch (e.g., master)
git push heroku master:main
```

### 2.5 Verify Backend Deployment
```bash
# Open backend in browser
heroku open

# Check logs
heroku logs --tail

# Test health endpoint
curl https://fleetxchange-backend.herokuapp.com/health
```

**Your backend should now be live!** 🎉

Note the URL (e.g., `https://fleetxchange-backend.herokuapp.com`) - you'll need this for frontend configuration.

## 🎨 Step 3: Deploy Frontend to Heroku

### 3.1 Create Heroku App for Frontend
```bash
# Navigate to frontend folder
cd ../shadcn-ui

# Create Heroku app for frontend
heroku create fleetxchange-frontend

# Or let Heroku generate a random name
heroku create
```

### 3.2 Add Node.js Buildpack
```bash
heroku buildpacks:set heroku/nodejs
```

### 3.3 Create Static Server Configuration

Create a new file `server.js` in the `shadcn-ui` folder:

```javascript
const express = require('express');
const path = require('path');
const app = express();

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Handle React routing - return index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Frontend server running on port ${PORT}`);
});
```

### 3.4 Update package.json

Add the following to `workspace/shadcn-ui/package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint --quiet ./src",
    "preview": "vite preview",
    "start": "node server.js",
    "heroku-postbuild": "npm run build"
  }
}
```

### 3.5 Set Frontend Environment Variables
```bash
# Set backend API URL (use your actual backend URL)
heroku config:set VITE_API_URL="https://fleetxchange-backend.herokuapp.com/api"

# Set Socket.IO URL
heroku config:set VITE_SOCKET_URL="https://fleetxchange-backend.herokuapp.com"
```

### 3.6 Create .env file for Frontend
Create `workspace/shadcn-ui/.env`:
```
VITE_API_URL=https://fleetxchange-backend.herokuapp.com/api
VITE_SOCKET_URL=https://fleetxchange-backend.herokuapp.com
```

### 3.7 Deploy Frontend
```bash
# Make sure you're in the shadcn-ui folder
cd workspace/shadcn-ui

# Initialize git if not already done
git init

# Add Heroku remote
heroku git:remote -a fleetxchange-frontend

# Deploy
git add .
git commit -m "Deploy frontend to Heroku"
git push heroku main
```

### 3.8 Verify Frontend Deployment
```bash
# Open frontend in browser
heroku open

# Check logs
heroku logs --tail
```

## 🔄 Step 4: Update Backend CORS Configuration

Now that you have your frontend URL, update the backend CORS configuration:

```bash
# Navigate back to backend
cd ../backend

# Update CORS origins with your frontend URL
heroku config:set CORS_ORIGINS="https://fleetxchange-frontend.herokuapp.com,http://localhost:5173"

# Restart the backend
heroku restart
```

## ✅ Step 5: Verify Complete Deployment

1. **Test Backend Health**:
   ```bash
   curl https://fleetxchange-backend.herokuapp.com/health
   ```

2. **Test Frontend**:
   - Open `https://fleetxchange-frontend.herokuapp.com` in browser
   - Try to login/register
   - Check browser console for any errors

3. **Test Real-time Features**:
   - Login as client and transporter in different browsers
   - Send messages and verify they appear in real-time
   - Place bids and check notifications

## 🐛 Troubleshooting

### Backend Issues

**Problem**: App crashes on startup
```bash
# Check logs
heroku logs --tail -a fleetxchange-backend

# Common fixes:
# 1. Verify MongoDB connection string
heroku config:get MONGODB_URI

# 2. Check if all environment variables are set
heroku config

# 3. Restart the app
heroku restart -a fleetxchange-backend
```

**Problem**: MongoDB connection fails
- Verify MongoDB Atlas whitelist includes 0.0.0.0/0
- Check username/password in connection string
- Ensure database user has proper permissions

### Frontend Issues

**Problem**: Can't connect to backend API
- Verify `VITE_API_URL` is set correctly
- Check CORS configuration on backend
- Look for CORS errors in browser console

**Problem**: WebSocket connection fails
- Verify `VITE_SOCKET_URL` is set correctly
- Check WebSocket support in Heroku (it's supported)
- Ensure Socket.IO is properly configured on backend

### General Issues

**Problem**: "Application Error" page
```bash
# Check logs for both apps
heroku logs --tail -a fleetxchange-backend
heroku logs --tail -a fleetxchange-frontend
```

**Problem**: Environment variables not working
```bash
# List all config vars
heroku config -a fleetxchange-backend
heroku config -a fleetxchange-frontend

# Set missing variables
heroku config:set KEY=value -a app-name
```

## 📊 Monitoring & Maintenance

### View Logs
```bash
# Backend logs
heroku logs --tail -a fleetxchange-backend

# Frontend logs
heroku logs --tail -a fleetxchange-frontend
```

### Restart Apps
```bash
heroku restart -a fleetxchange-backend
heroku restart -a fleetxchange-frontend
```

### Scale Dynos
```bash
# Check current dyno status
heroku ps -a fleetxchange-backend

# Scale up (requires paid plan)
heroku ps:scale web=2 -a fleetxchange-backend
```

## 💰 Cost Considerations

- **Free Tier**: Both apps can run on Heroku's free tier
- **Limitations**: 
  - Apps sleep after 30 minutes of inactivity
  - 550-1000 free dyno hours per month
  - No custom domain on free tier
- **Upgrade**: Consider Hobby ($7/month per dyno) for:
  - No sleeping
  - Custom domains
  - Better performance

## 🔐 Security Best Practices

1. **Use Strong Secrets**: Generate random JWT secret
   ```bash
   # Generate random secret
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Restrict MongoDB Access**: 
   - Use specific IP ranges instead of 0.0.0.0/0
   - Create separate database users for different environments

3. **Environment Variables**: 
   - Never commit .env files to Git
   - Use different secrets for production

4. **CORS Configuration**: 
   - Only allow your frontend domain
   - Remove localhost in production

## 🎉 Success!

Your FleetXchange application should now be live on Heroku! 

- **Backend**: `https://fleetxchange-backend.herokuapp.com`
- **Frontend**: `https://fleetxchange-frontend.herokuapp.com`

## 📚 Additional Resources

- [Heroku Node.js Documentation](https://devcenter.heroku.com/categories/nodejs-support)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Socket.IO on Heroku](https://socket.io/docs/v4/using-multiple-nodes/)

## 🆘 Need Help?

If you encounter issues:
1. Check the logs: `heroku logs --tail -a app-name`
2. Verify environment variables: `heroku config -a app-name`
3. Test locally first with production-like settings
4. Check MongoDB Atlas network access and user permissions

---

**Happy Deploying!** 🚀
