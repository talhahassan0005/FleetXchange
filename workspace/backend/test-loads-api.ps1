# Test Loads API
$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OGVhODQyMTlmYjUzZjViYmQ0OTc0ODYiLCJlbWFpbCI6InRlc3RAdGVzdC5jb20iLCJ1c2VyVHlwZSI6IkNMSUVOVCIsImlhdCI6MTczOTEwMzU4MCwiZXhwIjoxNzM5MTkwNzgwfQ.6QyCJ3QJ3QJ3QJ3QJ3QJ3QJ3QJ3QJ3QJ3QJ3QJ3Q"
}

# Test GET loads
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/api/loads" -Method GET -Headers $headers
    Write-Host "✅ GET loads successful!"
    Write-Host "Found $($response.loads.Count) loads"
} catch {
    Write-Host "❌ GET loads failed: $($_.Exception.Message)"
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
}
