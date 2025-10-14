# Test Loads API with fresh token
$token = Get-Content "token.txt" -Raw
$token = $token.Trim()

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $token"
}

Write-Host "Using token: $($token.Substring(0, 20))..."

# Test GET loads
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/loads" -Method GET -Headers $headers
    Write-Host "✅ GET loads successful!"
    Write-Host "Found $($response.loads.Count) loads"
} catch {
    Write-Host "❌ GET loads failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}

# Test POST load
$loadData = @{
    title = "Test Load"
    description = "Test Description"
    cargoType = "General"
    weight = 1000
    pickupLocation = "Lagos"
    deliveryLocation = "Abuja"
    pickupDate = "2024-01-15"
    deliveryDate = "2024-01-20"
    budgetMin = 50000
    budgetMax = 100000
    currency = "NGN"
} | ConvertTo-Json

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
    exit
}

# Test PUT load
$updateData = @{
    title = "Updated Test Load"
    description = "Updated Description"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/loads/$loadId" -Method PUT -Headers $headers -Body $updateData
    Write-Host "✅ PUT load successful!"
    Write-Host "Updated title: $($response.load.title)"
} catch {
    Write-Host "❌ PUT load failed: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "Response: $responseBody"
    }
}
