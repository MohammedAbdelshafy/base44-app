# Merge all buyer contacts + distressed property leads into one master CSV
$Artifacts = "C:\Users\omare\OneDrive\Desktop\AI\MBM\Artifacts"
$Clients = "C:\Users\omare\OneDrive\Desktop\AI\MBM\Clients\BAGA"
$MasterBuyers = "$Artifacts\master_buyers_list.csv"

$all = [System.Collections.ArrayList]@()

# --- 1. Buyer/Wholesaler Contacts ---
if (Test-Path $MasterBuyers) {
  $buyers = Import-Csv $MasterBuyers
  foreach ($row in $buyers) {
    $null = $all.Add([PSCustomObject]@{
      Lead_Type = "Buyer Contact"
      Entity_Name = $row.Company
      Contact_Name = $row.Contact_Name
      Email = $row.Email
      Phone = $row.Phone
      Website = $row.Website
      Property_Address = ""
      City = $row.City
      State = if ($row.City -match ", ([A-Z]{2})") { $matches[1] } else { "" }
      Distress_Signal = ""
      Signal_Date = ""
      Owner_Name = ""
      Owner_Phone = ""
      Category = $row.Category
      Lead_Source = $row.Lead_Source
      Status = $row.Status
      Confidence = $row.Confidence
      QA_Status = $row.QA_Status
      Verification_Status = $row.Verification_Status
      Evidence = $row.Evidence
      Source_File = $row.Source_File
    })
  }
}

# --- 2. Distressed Properties from BAGA client batches ---
$bagaFiles = Get-ChildItem -Path "$Clients\Dallas_Distressed_Batch_01_*.csv" -ErrorAction SilentlyContinue
foreach ($f in $bagaFiles) {
  $props = Import-Csv $f.FullName
  foreach ($row in $props) {
    $null = $all.Add([PSCustomObject]@{
      Lead_Type = "Distressed Property"
      Entity_Name = $row.Owner_Name
      Contact_Name = ""
      Email = ""
      Phone = $row.Phone
      Website = ""
      Property_Address = $row.Property_Address
      City = $row.City
      State = $row.State
      Distress_Signal = $row.Distress_Signal
      Signal_Date = $row.Signal_Date
      Owner_Name = $row.Owner_Name
      Owner_Phone = $row.Phone
      Category = "Distressed"
      Lead_Source = "Dallas 311 API"
      Status = "New"
      Confidence = ""
      QA_Status = ""
      Verification_Status = ""
      Evidence = ""
      Source_File = $f.Name
    })
  }
}

# --- 3. Raw Dallas 311 leads (non-duplicate addresses) ---
$rawFiles = Get-ChildItem -Path "$Artifacts\raw_leads_Dallas_311_*.csv" -ErrorAction SilentlyContinue
$seenAddrs = @{}
foreach ($row in $all) { if ($row.Property_Address) { $seenAddrs[$row.Property_Address.ToUpper().Trim()] = $true } }

foreach ($f in $rawFiles) {
  $props = Import-Csv $f.FullName
  foreach ($row in $props) {
    $addr = ($row.address -replace '"', '').Trim()
    if ($seenAddrs.ContainsKey($addr.ToUpper())) { continue }
    $seenAddrs[$addr.ToUpper()] = $true
    $state = if ($addr -match ", ([A-Z]{2}),") { $matches[1] } else { "" }
    $city = if ($addr -match ", ([A-Z\s]+), [A-Z]{2}") { $matches[1].Trim() } else { "" }
    $null = $all.Add([PSCustomObject]@{
      Lead_Type = "Distressed Property"
      Entity_Name = ""
      Contact_Name = ""
      Email = ""
      Phone = ""
      Website = ""
      Property_Address = $addr
      City = $city
      State = $state
      Distress_Signal = $row.service_request_type
      Signal_Date = $row.created_date
      Owner_Name = ""
      Owner_Phone = ""
      Category = "Distressed"
      Lead_Source = "Dallas 311 API"
      Status = $row.status
      Confidence = ""
      QA_Status = ""
      Verification_Status = ""
      Evidence = "Department: $($row.department); Priority: $($row.priority)"
      Source_File = $f.Name
    })
  }
}

# Deduplicate
$seen = @{}
$deduped = $all | Where-Object {
  if ($_.Lead_Type -eq "Buyer Contact") {
    $key = "BUYER|$($_.Entity_Name)|$($_.Contact_Name)|$($_.Email)"
  } else {
    $key = "PROP|$($_.Property_Address)"
  }
  if (-not $seen.ContainsKey($key)) { $seen[$key] = $true; $true } else { $false }
}

$deduped | Sort-Object Lead_Type, Category, Entity_Name | Export-Csv -Path "$Artifacts\all_leads_master.csv" -NoTypeInformation
Write-Host "Merged $($deduped.Count) total leads -> all_leads_master.csv"
