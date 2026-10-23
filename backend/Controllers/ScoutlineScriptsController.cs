using System.ComponentModel.DataAnnotations;
using System.Diagnostics;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using System.Net.Http.Json;
using Template.Api.Infrastructure.Scoutline;

namespace Template.Api.Controllers;

[ApiController]
[Route("api/scoutline/scripts")]
public sealed class ScoutlineScriptsController(
    IHttpClientFactory httpClientFactory,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ScoutlineScriptDraftStore drafts) : ControllerBase
{
    [HttpPost("generate")]
    public async Task<ActionResult<GeneratedScriptResponse>> Generate(
        [FromBody] GenerateScriptRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsFacebookUrl(request.PageUrl))
        {
            return BadRequest("Enter a valid HTTPS Facebook page URL.");
        }

        try
        {
            var approvedConfig = await GetFaraConfigAsync(request, cancellationToken);
            if (approvedConfig.PageUrl != request.PageUrl ||
                approvedConfig.MaxPosts != request.MaxPosts)
            {
                return StatusCode(StatusCodes.Status502BadGateway,
                    "Fara returned settings that do not match the request.");
            }

            var scriptDirectory = GetRepositoryDirectory();
            var templatePath = Path.Combine(
                Path.GetDirectoryName(scriptDirectory)!, "scrape-facebook.mjs");
            var template = await System.IO.File.ReadAllTextAsync(
                templatePath, cancellationToken);
            var script = BuildScript(template, approvedConfig.PageUrl, approvedConfig.MaxPosts);
            var draftId = drafts.Create(script);
            return Ok(new GeneratedScriptResponse(draftId, script));
        }
        catch (HttpRequestException)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                "Fara is unavailable. Confirm the model server is running on port 5000.");
        }
        catch (InvalidOperationException exception)
        {
            return StatusCode(StatusCodes.Status502BadGateway, exception.Message);
        }
    }

    [HttpPost("preview")]
    public async Task<ActionResult<ScriptPreviewResponse>> Preview(
        [FromBody] PreviewScriptRequest request,
        CancellationToken cancellationToken)
    {
        if (!Guid.TryParseExact(request.DraftId, "N", out _))
        {
            return BadRequest("Invalid generated script draft ID.");
        }

        string script;
        try
        {
            script = drafts.Read(request.DraftId);
        }
        catch (FileNotFoundException)
        {
            return NotFound("Generated script draft not found.");
        }

        var scriptDirectory = GetRepositoryDirectory();
        var pageUrlMatch = Regex.Match(script, "const PAGE_URL = (.+);", RegexOptions.CultureInvariant);
        var maxPostsMatch = Regex.Match(script, @"const MAX_POSTS = (\d+);", RegexOptions.CultureInvariant);
        if (!pageUrlMatch.Success || !maxPostsMatch.Success)
        {
            return BadRequest("The generated script is missing its approved settings.");
        }

        string pageUrl;
        try
        {
            pageUrl = JsonSerializer.Deserialize<string>(pageUrlMatch.Groups[1].Value)
                ?? throw new JsonException();
        }
        catch (JsonException)
        {
            return BadRequest("The generated script has an invalid page URL.");
        }

        var maxPosts = int.Parse(maxPostsMatch.Groups[1].Value);
        var templatePath = Path.Combine(Path.GetDirectoryName(scriptDirectory)!, "scrape-facebook.mjs");
        var template = await System.IO.File.ReadAllTextAsync(templatePath, cancellationToken);
        if (!IsFacebookUrl(pageUrl) || maxPosts is < 1 or > 10 ||
            !string.Equals(script, BuildScript(template, pageUrl, maxPosts), StringComparison.Ordinal))
        {
            return BadRequest("Only scripts generated from the approved Facebook template can be run.");
        }

        var outputDirectory = Path.Combine(Path.GetTempPath(), "scoutline", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(outputDirectory);
        var outputPath = Path.Combine(outputDirectory, "posts.json");
        var previewDirectory = Path.Combine(Path.GetDirectoryName(scriptDirectory)!, ".preview-temp");
        Directory.CreateDirectory(previewDirectory);
        var previewScriptPath = Path.Combine(previewDirectory, $"{Guid.NewGuid():N}.mjs");

        using var process = new Process
        {
            StartInfo = new ProcessStartInfo
            {
                FileName = configuration["Scraper:NodeExecutable"] ?? "node",
                WorkingDirectory = scriptDirectory,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true,
            },
            EnableRaisingEvents = true,
        };
        process.StartInfo.ArgumentList.Add(previewScriptPath);
        process.StartInfo.Environment["SCRAPER_OUTPUT_DIR"] = outputDirectory;
        process.StartInfo.Environment["SCRAPER_OUTPUT_FILE"] = outputPath;

        try
        {
            await System.IO.File.WriteAllTextAsync(previewScriptPath, script, cancellationToken);
            process.Start();
            var stdoutTask = process.StandardOutput.ReadToEndAsync(cancellationToken);
            var stderrTask = process.StandardError.ReadToEndAsync(cancellationToken);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromMinutes(2));
            await process.WaitForExitAsync(timeout.Token);
            var stdout = await stdoutTask;
            var stderr = await stderrTask;

            if (process.ExitCode != 0)
            {
                return StatusCode(StatusCodes.Status502BadGateway,
                    string.IsNullOrWhiteSpace(stderr)
                        ? "The scraper did not complete successfully."
                        : stderr.Trim());
            }

            if (!System.IO.File.Exists(outputPath))
            {
                return StatusCode(StatusCodes.Status502BadGateway,
                    "The scraper finished without producing a posts.json file.");
            }

            await using var output = System.IO.File.OpenRead(outputPath);
            using var json = await JsonDocument.ParseAsync(output, cancellationToken: cancellationToken);
            return Ok(new ScriptPreviewResponse(
                json.RootElement.Clone(), stdout.Trim(), stderr.Trim()));
        }
        catch (OperationCanceledException)
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            if (cancellationToken.IsCancellationRequested) throw;
            return StatusCode(StatusCodes.Status504GatewayTimeout, "The scraper exceeded its two-minute limit.");
        }
        catch (System.ComponentModel.Win32Exception)
        {
            return StatusCode(
                StatusCodes.Status503ServiceUnavailable,
                "Node.js was not found. Install Node.js and the frontend dependencies first.");
        }
        finally
        {
            try
            {
                System.IO.File.Delete(previewScriptPath);
                if (!Directory.EnumerateFileSystemEntries(previewDirectory).Any())
                    Directory.Delete(previewDirectory);
            }
            catch (IOException) { }
            try { Directory.Delete(outputDirectory, recursive: true); }
            catch (IOException) { }
        }
    }

    [HttpDelete("drafts/{draftId}")]
    public IActionResult DiscardDraft(string draftId)
    {
        if (!Guid.TryParseExact(draftId, "N", out _))
            return BadRequest("Invalid generated script draft ID.");
        drafts.Delete(draftId);
        return NoContent();
    }

    private async Task<FaraScriptConfig> GetFaraConfigAsync(
        GenerateScriptRequest request,
        CancellationToken cancellationToken)
    {
        var baseUrl = configuration["Fara:BaseUrl"] ?? "http://localhost:5000";
        var prompt = 
          $"Configure the approved Facebook scraper for this request. Return only JSON with exactly two fields: PAGE_URL (string) and MAX_POSTS (number). Copy the values exactly; do not write or modify code. PAGE_URL: {request.PageUrl}\nMAX_POSTS: {request.MaxPosts}";
        using var response = await httpClientFactory.CreateClient("Fara").PostAsJsonAsync(
            $"{baseUrl.TrimEnd('/')}/v1/chat/completions",
            new
            {
                model = "fara",
                temperature = 0,
                max_tokens = 100,
                response_format = new { type = "json_object" },
                messages = new[]
                {
                    new { role = "system", content = "You produce a minimal JSON configuration for a fixed scraper template. Never generate code." },
                    new { role = "user", content = prompt },
                },
            },
            cancellationToken);
        response.EnsureSuccessStatusCode();

        string? content;
        try
        {
            using var payload = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cancellationToken),
                cancellationToken: cancellationToken);
            content = payload.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString();
        }
        catch (Exception exception) when (exception is JsonException or KeyNotFoundException or InvalidOperationException)
        {
            throw new InvalidOperationException("Fara returned an unexpected response format.");
        }
        if (string.IsNullOrWhiteSpace(content))
            throw new InvalidOperationException("Fara returned an empty script configuration.");

        try
        {
            return JsonSerializer.Deserialize<FaraScriptConfig>(content,
                new JsonSerializerOptions { PropertyNameCaseInsensitive = true })
                ?? throw new JsonException();
        }
        catch (JsonException)
        {
            throw new InvalidOperationException("Fara returned an invalid script configuration. Try generating again.");
        }
    }

    private string GetRepositoryDirectory()
    {
        var starts = new[] { environment.ContentRootPath, AppContext.BaseDirectory, Directory.GetCurrentDirectory() };
        foreach (var start in starts)
        {
            var current = new DirectoryInfo(start);
            while (current is not null)
            {
                var scripts = Path.Combine(current.FullName, "frontend", "agent", "scripts");
                if (System.IO.File.Exists(Path.Combine(scripts, "scrape-facebook.mjs")))
                    return Path.Combine(scripts, "repository");
                current = current.Parent;
            }
        }

        throw new InvalidOperationException("Could not find frontend/agent/scripts/scrape-facebook.mjs in the repository.");
    }

    private static bool IsFacebookUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps &&
        string.IsNullOrEmpty(uri.UserInfo) &&
        (uri.Host.Equals("facebook.com", StringComparison.OrdinalIgnoreCase) ||
         uri.Host.EndsWith(".facebook.com", StringComparison.OrdinalIgnoreCase));

    private static string BuildScript(string template, string pageUrl, int maxPosts)
    {
        var withUrl = Regex.Replace(
            template,
            @"const PAGE_URL = .*?;",
            _ => $"const PAGE_URL = {JsonSerializer.Serialize(pageUrl).Replace(";", "\\u003B", StringComparison.Ordinal)};",
            RegexOptions.CultureInvariant);
        return Regex.Replace(
            withUrl,
            @"const MAX_POSTS = \d+;",
            _ => $"const MAX_POSTS = {maxPosts};",
            RegexOptions.CultureInvariant);
    }
}

public sealed class GenerateScriptRequest
{
    [Required]
    [StringLength(2048)]
    public string PageUrl { get; init; } = string.Empty;

    [Range(1, 10)]
    public int MaxPosts { get; init; }
}

public sealed class PreviewScriptRequest
{
    [Required]
    public string DraftId { get; init; } = string.Empty;
}

public sealed record GeneratedScriptResponse(string DraftId, string Script);
public sealed record ScriptPreviewResponse(JsonElement Snapshot, string StandardOutput, string StandardError);

internal sealed class FaraScriptConfig
{
    [JsonPropertyName("PAGE_URL")]
    public string PageUrl { get; init; } = string.Empty;

    [JsonPropertyName("MAX_POSTS")]
    public int MaxPosts { get; init; }
}
