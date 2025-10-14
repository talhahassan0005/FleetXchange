# Test POST load with detailed error
$token = Get-Content "token.txt" -Raw
$token = $token.Trim()

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

# Test POST load with proper date format
$loadData = @{
    title = "Test Load 2"
    description = "Test Description 2"
    cargoType = "General"
    weight = 1000
    pickupLocation = "Lagos"
    deliveryLocation = "Abuja"
    pickupDate = "2024-01-15T00:00:00.000Z"
    deliveryDate = "2024-01-20T00:00:00.000Z"
    budgetMin = 50000
    budgetMax = 100000
    currency = "NGN"
} | ConvertTo-Json

Write-Host "Sending load data:"
Write-Host $loadData

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/loads" -Method POST -Headers $headers -Body $loadData
    Write-Host "✅ POST load successful!"
    Write-Host "Load ID: $($response.load.id)"
    $loadId = $response.load.id
} catch {
    Write-Host "❌ POST load failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
