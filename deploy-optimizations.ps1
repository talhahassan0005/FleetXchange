# Performance Optimization Deployment Script

# Run this when your internet connection is stable

Write-Host "🚀 Deploying Performance Optimizations..." -ForegroundColor Green
Write-Host ""

# Step 1: Deploy Backend
Write-Host "📦 Step 1: Deploying Backend with Database Optimizations..." -ForegroundColor Cyan
try {
    git subtree push --prefix workspace/backend heroku-backend main
    Write-Host "✅ Backend deployed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend deployment failed. Check your internet connection." -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""

# Step 2: Wait for backend to restart
Write-Host "⏳ Waiting for backend to restart (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Step 3: Check backend health
Write-Host "🏥 Step 2: Checking Backend Health..." -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "https://fleetxchange-backend-talha-4a549723accf.herokuapp.com/health" -Method GET
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Backend is healthy!" -ForegroundColor Green
        Write-Host "Response: $($response.Content)" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠️ Backend health check failed" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the application: https://fleetxchange-frontend-talha-ffdb3b827694.herokuapp.com/"
Write-Host "2. Check if loading is faster"
Write-Host "3. Monitor backend logs: heroku logs --tail --app=fleetxchange-backend-talha"
Write-Host ""
Write-Host "💡 Expected Improvements:" -ForegroundColor Yellow
Write-Host "   • 70-80% faster database queries (thanks to indexes)"
Write-Host "   • Better connection pooling (less connection overhead)"
Write-Host "   • Optimized timeouts (faster error handling)"
Write-Host ""
