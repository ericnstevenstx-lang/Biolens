param(
  [string]$JsonFile = ".\automation\genspark-output\latest-product-batch.json",
  [string]$ApiUrl = "https://biolens-kappa.vercel.app/api/product-search-ingest"
)

if (!(Test-Path $JsonFile)) {
  Write-Error "JSON file not found: $JsonFile"
  exit 1
}

$body = Get-Content $JsonFile -Raw

try {
  $response = Invoke-RestMethod `
    -Method Post `
    -Uri $ApiUrl `
    -ContentType "application/json" `
    -Body $body

  $response | ConvertTo-Json -Depth 10
}
catch {
  $resp = $_.Exception.Response
  if ($resp -ne $null) {
    $reader = New-Object System.IO.StreamReader($resp.GetResponseStream())
    $reader.BaseStream.Position = 0
    $reader.DiscardBufferedData()
    $reader.ReadToEnd()
  } else {
    $_.Exception.Message
  }
}
