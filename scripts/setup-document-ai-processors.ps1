# Document AI Processor Setup Script for DocBare
# This script helps create the necessary Document AI processors

param(
    [string]$ProjectId = "",
    [string]$Location = "us"
)

# Check if gcloud is installed and authenticated
Write-Host "🔍 Checking Google Cloud setup..." -ForegroundColor Blue

try {
    $gcloudVersion = gcloud version --format="value(basic.version)" 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ gcloud CLI not found. Please install Google Cloud CLI first." -ForegroundColor Red
        Write-Host "   Download from: https://cloud.google.com/sdk/docs/install" -ForegroundColor Yellow
        exit 1
    }
    Write-Host "✅ gcloud CLI found: $gcloudVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ gcloud CLI not found. Please install Google Cloud CLI first." -ForegroundColor Red
    exit 1
}

# Check authentication
try {
    $account = gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $account) {
        Write-Host "❌ Not authenticated with gcloud. Please run: gcloud auth login" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Authenticated as: $account" -ForegroundColor Green
} catch {
    Write-Host "❌ Authentication failed. Please run: gcloud auth login" -ForegroundColor Red
    exit 1
}

# Get project ID if not provided
if (-not $ProjectId) {
    $ProjectId = gcloud config get-value project 2>$null
    if ($LASTEXITCODE -ne 0 -or -not $ProjectId) {
        Write-Host "❌ No project ID set. Please run: gcloud config set project YOUR_PROJECT_ID" -ForegroundColor Red
        exit 1
    }
}

Write-Host "📋 Using project: $ProjectId" -ForegroundColor Blue

# Enable Document AI API
Write-Host "🔧 Enabling Document AI API..." -ForegroundColor Blue
gcloud services enable documentai.googleapis.com --project=$ProjectId

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to enable Document AI API" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Document AI API enabled" -ForegroundColor Green

# Define processor configurations
$processors = @(
    @{
        Type = "ocr-processor"
        DisplayName = "DocBare General Document Processor"
        Description = "General document processing and OCR for legal documents"
        EnvVar = "DOCUMENT_AI_GENERAL_PROCESSOR_ID"
    },
    @{
        Type = "form-parser-processor"
        DisplayName = "DocBare Legal Form Processor"
        Description = "Form parsing for legal documents and structured forms"
        EnvVar = "DOCUMENT_AI_LEGAL_DOCUMENT_PROCESSOR_ID"
    },
    @{
        Type = "layout-parser-processor"
        DisplayName = "DocBare Layout Processor"
        Description = "Layout parsing for complex legal document structures"
        EnvVar = "DOCUMENT_AI_LAYOUT_PROCESSOR_ID"
    }
)

Write-Host "🚀 Creating Document AI processors..." -ForegroundColor Blue

$createdProcessors = @{}

foreach ($processor in $processors) {
    Write-Host "📝 Creating $($processor.DisplayName)..." -ForegroundColor Yellow
    
    # Create processor using REST API since gcloud documentai might not be available
    $createUrl = "https://documentai.googleapis.com/v1/projects/$ProjectId/locations/$Location/processors"
    $createBody = @{
        type = $processor.Type
        displayName = $processor.DisplayName
        description = $processor.Description
    } | ConvertTo-Json -Depth 10
    
    try {
        $accessToken = gcloud auth print-access-token 2>$null
        $headers = @{
            "Authorization" = "Bearer $accessToken"
            "Content-Type" = "application/json"
        }
        
        $response = Invoke-RestMethod -Uri $createUrl -Method POST -Headers $headers -Body $createBody
        
        if ($response.name) {
            $processorId = $response.name.Split('/')[-1]
            $createdProcessors[$processor.EnvVar] = $processorId
            Write-Host "✅ Created $($processor.DisplayName) with ID: $processorId" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ Failed to create $($processor.DisplayName): $($_.Exception.Message)" -ForegroundColor Red
        
        # Try alternative method using gcloud
        Write-Host "🔄 Trying alternative method..." -ForegroundColor Yellow
        $result = gcloud ai document processors create --processor-type=$($processor.Type) --location=$Location --display-name="$($processor.DisplayName)" --project=$ProjectId 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            $processorId = ($result | Select-String "name:" | ForEach-Object { $_.ToString().Split('/')[-1].Trim() })
            if ($processorId) {
                $createdProcessors[$processor.EnvVar] = $processorId
                Write-Host "✅ Created $($processor.DisplayName) with ID: $processorId" -ForegroundColor Green
            }
        } else {
            Write-Host "❌ Alternative method also failed" -ForegroundColor Red
        }
    }
}

# Generate environment variables
Write-Host "📋 Generated environment variables:" -ForegroundColor Blue
Write-Host ""

foreach ($envVar in $createdProcessors.Keys) {
    Write-Host "$envVar=$($createdProcessors[$envVar])" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "📝 Add these to your .env file:" -ForegroundColor Yellow
Write-Host ""

# Create .env template
$envContent = @"
# Google Cloud Configuration
GOOGLE_CLOUD_PROJECT_ID=$ProjectId
GOOGLE_APPLICATION_CREDENTIALS=./secrets/docbare-document-ai-key.json

# Document AI Configuration
DOCUMENT_AI_LOCATION=$Location
"@

foreach ($envVar in $createdProcessors.Keys) {
    $envContent += "`n$envVar=$($createdProcessors[$envVar])"
}

$envContent += @"

# Additional Document AI Processors (if needed)
# DOCUMENT_AI_OCR_PROCESSOR_ID=your-ocr-processor-id
# DOCUMENT_AI_FORM_PARSER_PROCESSOR_ID=your-form-processor-id
"@

Write-Host $envContent -ForegroundColor White

# Save to .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8
Write-Host ""
Write-Host "✅ Environment variables saved to .env file" -ForegroundColor Green

Write-Host ""
Write-Host "🎉 Document AI processors setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📚 Next steps:" -ForegroundColor Blue
Write-Host "1. Create a service account key for Document AI" -ForegroundColor White
Write-Host "2. Place the key file in ./secrets/docbare-document-ai-key.json" -ForegroundColor White
Write-Host "3. Test the integration with: npm run test:document-ai" -ForegroundColor White
Write-Host ""
Write-Host "📖 For more information, see: Docs/DOCUMENT_AI_SETUP.md" -ForegroundColor Yellow
