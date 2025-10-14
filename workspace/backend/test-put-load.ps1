# Test PUT load
$token = Get-Content "token.txt" -Raw
$token = $token.Trim()

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

$loadId = "68ea85496b31526740dcf086"

# Test PUT load
$updateData = @{
    title = "Updated Test Load"
    description = "Updated Description"
} | ConvertTo-Json

Write-Host "Updating load ID: $loadId"
Write-Host "Update data: $updateData"

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/loads/$loadId" -Method PUT -Headers $headers -Body $updateData
    Write-Host "✅ PUT load successful!"
    Write-Host "Updated title: $($response.load.title)"
    Write-Host "Updated description: $($response.load.description)"
} catch {
    Write-Host "❌ PUT load failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
