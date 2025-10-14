# 🚀 FleetXchange - Heroku Deployment Quick Start (Urdu/English)

## ✅ Tayyar Files (Ready Files)

Sab files ab GitHub pe upload ho gayi hain! Deployment ke liye ye files ban gayi hain:

### Backend Files:
- ✅ `workspace/backend/Procfile` - Heroku ko batata hai kaise app run karna hai
- ✅ `workspace/backend/package.json` - Build scripts added (`heroku-postbuild`)
- ✅ `workspace/backend/.env.example` - Environment variables ki example
- ✅ `workspace/backend/.gitignore` - Git ignore configuration

### Frontend Files:
- ✅ `workspace/shadcn-ui/server.js` - Static file serving ke liye Express server
- ✅ `workspace/shadcn-ui/package.json` - Start aur build scripts added
- ✅ `workspace/shadcn-ui/.env.example` - Frontend environment variables

### Documentation:
- ✅ `workspace/DEPLOYMENT.md` - Complete step-by-step deployment guide

## 📝 Deployment Kaise Karein (How to Deploy)

### Prerequisites (Pehle Ye Karna Hai):

1. **Heroku Account Banayein**: https://signup.heroku.com/
2. **Heroku CLI Install Karein**: https://devcenter.heroku.com/articles/heroku-cli
3. **MongoDB Atlas Account**: https://www.mongodb.com/cloud/atlas (Free M0 cluster)

### Quick Steps:

#### 1. MongoDB Atlas Setup (5 minutes)
```
1. MongoDB Atlas pe free cluster banayein
2. Database user create karein (username + password)
3. Network Access mein "0.0.0.0/0" whitelist karein
4. Connection string copy karein
```

#### 2. Backend Deploy (10 minutes)
```bash
# Login
heroku login

# Backend folder mein jayein
cd workspace/backend

# Heroku app banayein
heroku create fleetxchange-backend

# Environment variables set karein
heroku config:set MONGODB_URI="your-mongodb-connection-string"
heroku config:set JWT_SECRET="your-secret-key"
heroku config:set NODE_ENV=production

# Deploy karein
git init
heroku git:remote -a fleetxchange-backend
git add .
git commit -m "Deploy backend"
git push heroku main

# URL note kar lein (e.g., https://fleetxchange-backend.herokuapp.com)
```

#### 3. Frontend Deploy (10 minutes)
```bash
# Frontend folder mein jayein
cd ../shadcn-ui

# Heroku app banayein
heroku create fleetxchange-frontend

# Backend URL set karein (upar wala URL use karein)
heroku config:set VITE_API_URL="https://fleetxchange-backend.herokuapp.com/api"
heroku config:set VITE_SOCKET_URL="https://fleetxchange-backend.herokuapp.com"

# Deploy karein
git init
heroku git:remote -a fleetxchange-frontend
git add .
git commit -m "Deploy frontend"
git push heroku main
```

#### 4. CORS Update Backend Mein
```bash
cd ../backend
heroku config:set CORS_ORIGINS="https://fleetxchange-frontend.herokuapp.com"
heroku restart
```

## ✅ Testing

1. **Backend Test**: `https://your-backend-app.herokuapp.com/health`
2. **Frontend Test**: Open `https://your-frontend-app.herokuapp.com` in browser
3. Login/Register try karein

## 🐛 Common Issues

### "Application Error" dikhai de:
```bash
heroku logs --tail -a app-name
```

### MongoDB connect nahi ho raha:
- Connection string check karein
- MongoDB Atlas whitelist check karein (0.0.0.0/0)
- Username/password verify karein

### Frontend backend se connect nahi ho raha:
- `VITE_API_URL` correct hai?
- CORS configuration backend mein sahi hai?

## 💰 Cost

- **Free Tier**: Dono apps free mein chal sakti hain
- **Limitation**: 30 minutes inactivity ke baad app sleep hota hai
- **Upgrade**: $7/month per app for no sleeping + custom domain

## 📚 Detailed Guide

Complete step-by-step instructions ke liye ye file dekhein:
👉 **workspace/DEPLOYMENT.md**

## 🆘 Help Chahiye?

1. Logs dekhein: `heroku logs --tail -a app-name`
2. Config check karein: `heroku config -a app-name`
3. App restart karein: `heroku restart -a app-name`
4. DEPLOYMENT.md file mein troubleshooting section dekhe

## 🎉 Success!

Agar sab theek se ho gaya to:
- Backend: `https://fleetxchange-backend.herokuapp.com`
- Frontend: `https://fleetxchange-frontend.herokuapp.com`

Aapka FleetXchange ab live hai! 🚀

---

**Note**: Pehli baar deploy karne mein 20-30 minutes lag sakte hain. Sabar rakhein aur logs check karte rahein!
