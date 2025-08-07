# PowerShell script to commit changes with a custom message
# This script prompts for a commit message and then runs git add and git commit

Write-Host "=== Git Commit Script ===" -ForegroundColor Cyan
Write-Host ""

# Prompt for commit message
$commitMessage = Read-Host "Enter your commit message"

# Check if commit message is empty
if ([string]::IsNullOrWhiteSpace($commitMessage)) {
    Write-Host "Error: Commit message cannot be empty!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Running git commands..." -ForegroundColor Yellow

# Run git add .
Write-Host "1. Adding all files to staging..." -ForegroundColor Green
git add .

# Check if git add was successful
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to add files to staging!" -ForegroundColor Red
    exit 1
}

# Run git commit with the provided message
Write-Host "2. Committing changes with message: '$commitMessage'" -ForegroundColor Green
git commit -m $commitMessage

# Check if git commit was successful
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to commit changes!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Successfully committed changes!" -ForegroundColor Green