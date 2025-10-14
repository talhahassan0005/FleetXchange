# Get fresh token
$loginData = @{
    email = "test@test.com"
    password = "test123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $loginData -ContentType "application/json"
    $token = $loginResponse.token
    Write-Host "✅ Fresh token obtained: $($token.Substring(0, 20))..."
    
    # Save token to file for other scripts
    $token | Out-File -FilePath "token.txt" -Encoding UTF8
    Write-Host "Token saved to token.txt"
} catch {
    Write-Host "❌ Login failed: $($_.Exception.Message)"
}
