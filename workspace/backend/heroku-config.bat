@echo off
cd /d C:\Users\Talha\Downloads\Logistics\workspace\backend
"C:\Program Files\heroku\bin\heroku.cmd" config:set MONGODB_URI="mongodb+srv://talhamoveon9_db_user:hUYW8cuIWpidCszL@cluster0.43730er.mongodb.net/fleetxchange?retryWrites=true&w=majority&appName=Cluster0" --app=fleetxchange-backend-talha
"C:\Program Files\heroku\bin\heroku.cmd" config:set JWT_SECRET="fleetxchange-super-secret-jwt-key-production-2025-talha" --app=fleetxchange-backend-talha
"C:\Program Files\heroku\bin\heroku.cmd" config:set NODE_ENV="production" --app=fleetxchange-backend-talha
"C:\Program Files\heroku\bin\heroku.cmd" config:set PORT="5000" --app=fleetxchange-backend-talha
"C:\Program Files\heroku\bin\heroku.cmd" config:set CORS_ORIGINS="https://fleetxchange-frontend-talha-0a5db6a6c66b.herokuapp.com" --app=fleetxchange-backend-talha
"C:\Program Files\heroku\bin\heroku.cmd" config:set RATE_LIMIT_WINDOW_MS="900000" --app=fleetxchange-backend-talha
"C:\Program Files\heroku\bin\heroku.cmd" config:set RATE_LIMIT_MAX_REQUESTS="1000" --app=fleetxchange-backend-talha
"C:\Program Files\heroku\bin\heroku.cmd" config:set ADMIN_PASSWORD="FleetX2025!Talha" --app=fleetxchange-backend-talha
echo Configuration completed!
pause
