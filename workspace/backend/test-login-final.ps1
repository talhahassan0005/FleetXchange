$body = @{
    email = "test@test.com"
    password = "test123"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/auth/login" -Method POST -Body $body -ContentType "application/json"
    Write-Host "✅ Login Successful!"
    Write-Host "User: $($response.user.email)"
    Write-Host "Type: $($response.user.userType)"
    Write-Host "Token: $($response.token.Substring(0, 20))..."
} catch {
    Write-Host "❌ Login Failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
