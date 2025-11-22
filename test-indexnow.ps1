# Test IndexNow API Request
Write-Host "Testing IndexNow API..." -ForegroundColor Cyan

$body = @{
    host = "sharedstudy.vercel.app"
    key = "8a44be3040e8d0082bebb260a6721525"
    keyLocation = "https://sharedstudy.vercel.app/8a44be3040e8d0082bebb260a6721525.txt"
    urlList = @(
        "https://sharedstudy.vercel.app/",
        "https://sharedstudy.vercel.app/browse.html"
    )
} | ConvertTo-Json

try {
    $response = Invoke-WebRequest -Uri "https://api.indexnow.org/IndexNow" `
        -Method Post `
        -ContentType "application/json; charset=utf-8" `
        -Body $body `
        -UseBasicParsing
    
    Write-Host "`n✅ SUCCESS!" -ForegroundColor Green
    Write-Host "Status Code: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Status Description: $($response.StatusDescription)" -ForegroundColor Green
    
    if ($response.StatusCode -eq 200 -or $response.StatusCode -eq 202) {
        Write-Host "`nURLs submitted successfully to IndexNow!" -ForegroundColor Green
        Write-Host "Search engines will be notified about these URLs." -ForegroundColor Yellow
    }
} catch {
    Write-Host "`n❌ ERROR!" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error Message: $($_.Exception.Message)" -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode.value__ -eq 403) {
        Write-Host "`n⚠️  Key file not accessible!" -ForegroundColor Yellow
        Write-Host "Make sure this URL is accessible:" -ForegroundColor Yellow
        Write-Host "https://sharedstudy.vercel.app/8a44be3040e8d0082bebb260a6721525.txt" -ForegroundColor Cyan
    } elseif ($_.Exception.Response.StatusCode.value__ -eq 422) {
        Write-Host "`n⚠️  URL validation error!" -ForegroundColor Yellow
        Write-Host "Check that URLs belong to the host domain." -ForegroundColor Yellow
    }
}

Write-Host "`n---" -ForegroundColor Gray
Write-Host "API Endpoint: https://api.indexnow.org/IndexNow" -ForegroundColor Gray
Write-Host "Request Method: POST" -ForegroundColor Gray
Write-Host "Content-Type: application/json; charset=utf-8" -ForegroundColor Gray


