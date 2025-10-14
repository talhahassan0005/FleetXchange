@echo off
cd /d C:\Users\Talha\Downloads\Logistics\workspace\backend
echo Setting JWT_SECRET...
"C:\Program Files\heroku\bin\heroku.cmd" config:set JWT_SECRET=fleetxchange-super-secret-jwt-key-production-2025-talha --app=fleetxchange-backend-talha

echo Setting NODE_ENV...
"C:\Program Files\heroku\bin\heroku.cmd" config:set NODE_ENV=production --app=fleetxchange-backend-talha

echo Setting CORS_ORIGINS...
"C:\Program Files\heroku\bin\heroku.cmd" config:set CORS_ORIGINS=https://fleetxchange-frontend-talha-0a5db6a6c66b.herokuapp.com --app=fleetxchange-backend-talha

echo Setting RATE_LIMIT...
"C:\Program Files\heroku\bin\heroku.cmd" config:set RATE_LIMIT_WINDOW_MS=900000 --app=fleetxchange-backend-talha

"C:\Program Files\heroku\bin\heroku.cmd" config:set RATE_LIMIT_MAX_REQUESTS=1000 --app=fleetxchange-backend-talha

echo Setting ADMIN_PASSWORD...
"C:\Program Files\heroku\bin\heroku.cmd" config:set ADMIN_PASSWORD=FleetX2025!Talha --app=fleetxchange-backend-talha

echo Done!
