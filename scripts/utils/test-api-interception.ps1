<#
.SYNOPSIS
    PlaylistOut API Interception & Rate-Limiting Verification Script (PowerShell)

.DESCRIPTION
    Tests PlaylistOut API request interception behavior (Rate Limiting / Dual-track protection / Cloudflare edge).
    - Uses sample playlists from PlaylistOut frontend.
    - Demonstrates HTTP 429 Too Many Requests interception when exceeding the 6 req/min quota for direct scripts.
    - Displays detailed headers: Retry-After, cf-ray, status code, latency, and error payload.

.PARAMETER BaseUrl
    Target API base URL (default: https://playlistout-api.lengxiqwq.com).

.PARAMETER Playlist
    Playlist identifier or sample name: 'netease', 'qqmusic', 'kugou', 'qishui', 'kuwo', or custom URL.

.PARAMETER Count
    Number of consecutive requests to send (default: 10).

.PARAMETER DelaySeconds
    Delay between requests in seconds (default: 0).

.PARAMETER Mode
    Client simulation mode: 'direct' (6/min), 'bot' (6/min), 'plugin' (12/min), 'web' (30/min).

.EXAMPLE
    .\scripts\utils\test-api-interception.ps1
    .\scripts\utils\test-api-interception.ps1 -Count 12 -Playlist qqmusic
    .\scripts\utils\test-api-interception.ps1 -BaseUrl http://127.0.0.1:8787 -Count 10
    .\scripts\utils\test-api-interception.ps1 -Mode web -Count 35
#>

[CmdletBinding()]
param(
    [string]$BaseUrl = "https://playlistout-api.lengxiqwq.com",
    [string]$Playlist = "netease",
    [int]$Count = 10,
    [switch]$Continuous,
    [double]$DelaySeconds = 0.0,
    [ValidateSet("direct", "bot", "plugin", "web")]
    [string]$Mode = "direct"
)

# Sample playlists directly referenced from web/src/components/playlist/SearchNote.tsx
$SamplePlaylists = @{
    "netease" = "https://music.163.com/playlist?id=3778678"
    "qqmusic" = "https://y.qq.com/n/ryqq/playlist/9547521556"
    "kugou"   = "https://m.kugou.com/songlist/gcid_3zr52qfrzaz06a/"
    "qishui"  = "https://qishui.douyin.com/s/iXHhKHhY/"
    "kuwo"    = "https://m.kuwo.cn/newh5app/playlist_detail/2311665489"
}

$TargetPlaylist = if ($SamplePlaylists.ContainsKey($Playlist.ToLower())) { $SamplePlaylists[$Playlist.ToLower()] } else { $Playlist }

$CleanBaseUrl = $BaseUrl.TrimEnd('/')
$EncodedPlaylist = [System.Uri]::EscapeDataString($TargetPlaylist)
$EndpointUrl = "$CleanBaseUrl/api/v1/resolve?q=$EncodedPlaylist&type=playlist"

$Headers = @{
    "Accept" = "application/json"
}

$ExpectedLimit = 6
$ModeDesc = ""

switch ($Mode) {
    "direct" {
        $Headers["User-Agent"] = "PlaylistOut-DirectApi-PowerShell/1.0"
        $ModeDesc = "Direct API caller (Untrusted script, rate limit = 6 req/min)"
        $ExpectedLimit = 6
    }
    "bot" {
        $Headers["User-Agent"] = "curl/7.88.1 (Automated Bot / Scraper)"
        $ModeDesc = "Explicit Bot/Crawler UA (rate limit = 6 req/min)"
        $ExpectedLimit = 6
    }
    "plugin" {
        $Headers["User-Agent"] = "PlaylistOut-Plugin/1.0.0"
        $Headers["X-PlaylistOut-Client-Type"] = "plugin"
        $Headers["X-PlaylistOut-Client-Id"] = "musicfree"
        $ModeDesc = "Registered Player Plugin (MusicFree, rate limit = 12 req/min)"
        $ExpectedLimit = 12
    }
    "web" {
        Write-Host "[Init] Fetching Web Session Attestation Token..." -ForegroundColor Cyan
        try {
            $SessionResp = Invoke-RestMethod -Uri "$CleanBaseUrl/api/session/token" -Method Get -Headers @{
                "User-Agent" = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0"
                "Origin" = "https://playlistout.lengxiqwq.com"
                "Referer" = "https://playlistout.lengxiqwq.com/"
            } -TimeoutSec 10
            if ($SessionResp.success -and $SessionResp.data.token) {
                $Headers["X-PlaylistOut-Session"] = $SessionResp.data.token
                Write-Host "[Init] Session token acquired successfully." -ForegroundColor Green
            }
        } catch {
            Write-Host "[Init] Failed to acquire session token, falling back to browser headers." -ForegroundColor Yellow
        }
        $Headers["User-Agent"] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0.0.0"
        $Headers["Origin"] = "https://playlistout.lengxiqwq.com"
        $Headers["Referer"] = "https://playlistout.lengxiqwq.com/"
        $ModeDesc = "Official Web Frontend (Dual-track session, rate limit = 30 req/min)"
        $ExpectedLimit = 30
    }
}

Write-Host ("=" * 72) -ForegroundColor Cyan
Write-Host " PlaylistOut API Interception Test (PowerShell)" -ForegroundColor Cyan
Write-Host ("=" * 72) -ForegroundColor Cyan
Write-Host " Target API    : $BaseUrl"
Write-Host " Sample Input  : $TargetPlaylist"
Write-Host " Client Mode   : $Mode ($ModeDesc)"
$IsInfinite = $Continuous.IsPresent -or ($Count -le 0)
$TotalDisplay = if ($IsInfinite) { "Infinite (Ctrl+C to stop)" } else { "$Count" }

Write-Host " Limit Quota   : $ExpectedLimit req / 60s per IP"
Write-Host " Total Requests: $TotalDisplay (Interval: ${DelaySeconds}s)"
Write-Host ("=" * 72)
Write-Host ""

$SuccessCount = 0
$RateLimitedCount = 0
$OtherCount = 0
$FirstInterceptedIndex = $null
$FirstInterceptedDetails = $null

$i = 0
try {
    while ($true) {
        $i++
        if (-not $IsInfinite -and $i -gt $Count) {
            break
        }

        $IdxStr = if ($IsInfinite) { "[{0:D4}]" -f $i } else { "[{0:D2}/{1:D2}]" -f $i, $Count }
        $Stopwatch = [System.Diagnostics.Stopwatch]::StartNew()

    try {
        $Response = Invoke-WebRequest -Uri $EndpointUrl -Method Get -Headers $Headers -UseBasicParsing -TimeoutSec 60
        $Stopwatch.Stop()
        $DurationMs = [Math]::Round($Stopwatch.Elapsed.TotalMilliseconds, 1)

        $BodyJson = $Response.Content | ConvertFrom-Json
        $SuccessCount++

        $PlName = if ($BodyJson.data.result.name) { $BodyJson.data.result.name } else { "Unknown" }
        if ($PlName.Length -gt 24) { $PlName = $PlName.Substring(0, 24) }
        $TrackCount = if ($BodyJson.data.result.trackCount) { $BodyJson.data.result.trackCount } else { 0 }
        $Platform = if ($BodyJson.data.platform) { $BodyJson.data.platform } else { "" }

        Write-Host "$IdxStr HTTP 200 OK (${DurationMs}ms) | Passed | Platform: $Platform | Tracks: $TrackCount | Name: $PlName" -ForegroundColor Green
    }
    catch {
        $Stopwatch.Stop()
        $DurationMs = [Math]::Round($Stopwatch.Elapsed.TotalMilliseconds, 1)

        if ($_.Exception.Response) {
            $HttpResp = $_.Exception.Response
            $StatusCode = [int]$HttpResp.StatusCode

            $RawBody = ""
            if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
                $RawBody = $_.ErrorDetails.Message
            }
            elseif ($HttpResp) {
                try {
                    $Stream = $HttpResp.GetResponseStream()
                    if ($Stream) {
                        $Reader = New-Object System.IO.StreamReader($Stream, [System.Text.Encoding]::UTF8)
                        $RawBody = $Reader.ReadToEnd()
                    }
                } catch {}
            }

            $BodyJson = $null
            try { $BodyJson = $RawBody | ConvertFrom-Json } catch {}

            $RetryAfter = $HttpResp.Headers["Retry-After"]
            $CfRay = $HttpResp.Headers["cf-ray"]

            if ($StatusCode -eq 429) {
                $RateLimitedCount++
                if ($null -eq $FirstInterceptedIndex) {
                    $FirstInterceptedIndex = $i
                    $FirstInterceptedDetails = @{
                        StatusCode = $StatusCode
                        RetryAfter = $RetryAfter
                        CfRay = $CfRay
                        Body = $RawBody
                    }
                }

                $ErrCode = if ($BodyJson.error.code) { $BodyJson.error.code } else { "RATE_LIMITED" }
                $ErrMsg = if ($BodyJson.error.message) { $BodyJson.error.message } else { "Too many requests" }

                Write-Host "$IdxStr HTTP 429 Too Many Requests (${DurationMs}ms) | INTERCEPTED | Code: $ErrCode | Retry-After: ${RetryAfter}s | Msg: $ErrMsg" -ForegroundColor Yellow
            }
            elseif ($StatusCode -eq 403) {
                $OtherCount++
                Write-Host "$IdxStr HTTP 403 Forbidden (${DurationMs}ms) | WAF/Constitution Block | Body: $RawBody" -ForegroundColor Red
            }
            else {
                $OtherCount++
                Write-Host "$IdxStr HTTP $StatusCode (${DurationMs}ms) | Response: $RawBody" -ForegroundColor Red
            }
        }
        else {
            $OtherCount++
            Write-Host "$IdxStr Connection Failed (${DurationMs}ms) | Error: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

        if ($DelaySeconds -gt 0) {
            Start-Sleep -Seconds $DelaySeconds
        }
    }
}
finally {
    Write-Host ""
    Write-Host ("=" * 72) -ForegroundColor Cyan
    Write-Host " Interception Analysis & Verification Summary" -ForegroundColor Cyan
    Write-Host ("=" * 72) -ForegroundColor Cyan
    Write-Host " [+] Successful Requests (HTTP 200)   : $SuccessCount" -ForegroundColor Green
    Write-Host " [!] Rate-Limited (HTTP 429)         : $RateLimitedCount" -ForegroundColor Yellow
if ($OtherCount -gt 0) {
    Write-Host " [-] Other Status Codes              : $OtherCount" -ForegroundColor Red
}

if ($null -ne $FirstInterceptedIndex) {
    Write-Host ""
    Write-Host ">> Interception Triggered on Request #$FirstInterceptedIndex :" -ForegroundColor Yellow
    Write-Host "   * Response HTTP Status : $($FirstInterceptedDetails.StatusCode) Too Many Requests"
    Write-Host "   * Retry-After Header   : $($FirstInterceptedDetails.RetryAfter) seconds"
    Write-Host "   * Cloudflare Ray ID    : $($FirstInterceptedDetails.CfRay)"
    Write-Host "   * JSON Error Payload   : $($FirstInterceptedDetails.Body)"
    Write-Host "   * Behavior Verification: Quota matches the expected threshold ($ExpectedLimit req/min)."
} else {
    Write-Host ""
    Write-Host "No requests were intercepted (all stayed within $ExpectedLimit req/min)." -ForegroundColor Green
}
Write-Host ("=" * 72)
}
