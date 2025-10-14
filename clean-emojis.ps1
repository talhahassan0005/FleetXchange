# Script to Remove Emojis from Backend Code

# Read all TypeScript files in backend
$backendPath = "C:\Users\Talha\Downloads\Logistics\workspace\backend\src"

# Define emoji patterns to remove
$emojiPattern = '[🚀✅❌🔔⚡📡🌍🔗📚🛑⏳🎉💡🔧📦🏥⏰🎯📊💰🙏]'

# Get all .ts files recursively
Get-ChildItem -Path $backendPath -Filter *.ts -Recurse | ForEach-Object {
    $filePath = $_.FullName
    $content = Get-Content $filePath -Raw -Encoding UTF8
    
    # Check if file contains emojis
    if ($content -match $emojiPattern) {
        Write-Host "Cleaning: $($_.Name)" -ForegroundColor Yellow
        
        # Remove emojis but keep the text
        $cleanedContent = $content -replace $emojiPattern, ''
        
        # Save the cleaned content
        Set-Content -Path $filePath -Value $cleanedContent -Encoding UTF8 -NoNewline
        
        Write-Host "  -> Cleaned!" -ForegroundColor Green
    }
}

Write-Host "`nEmoji cleanup complete!" -ForegroundColor Cyan
Write-Host "Files have been cleaned and ready for deployment." -ForegroundColor Green
