# Clean and Start Script for FocusFlow App
# This script cleans the build cache and starts the development server

Write-Host "🧹 Cleaning build cache..." -ForegroundColor Yellow

# Remove .next directory if it exists
if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
    Write-Host "✅ Removed .next directory" -ForegroundColor Green
}

# Remove node_modules if it exists (optional - uncomment if needed)
# if (Test-Path node_modules) {
#     Remove-Item -Recurse -Force node_modules
#     Write-Host "✅ Removed node_modules directory" -ForegroundColor Green
# }

Write-Host "🚀 Starting development server..." -ForegroundColor Yellow
npm run dev
