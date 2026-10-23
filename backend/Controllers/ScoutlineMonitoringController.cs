using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Mvc;
using Template.Api.Infrastructure.Scoutline;

namespace Template.Api.Controllers;

[ApiController]
[Route("api/scoutline/monitoring")]
public sealed class ScoutlineMonitoringController(
    ScoutlineStore store,
    IWebHostEnvironment environment) : ControllerBase
{
    private static readonly string[] Frequencies = ["5 min", "15 min", "Hourly", "Daily"];
    private static readonly Regex ScriptFileNamePattern = new(
        @"^scrape-[a-z0-9-]+-[a-f0-9]{12}\.mjs$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    [HttpGet("pages")]
    public ActionResult<IReadOnlyList<MonitoredPage>> GetPages() => Ok(store.GetPages());

    [HttpPost("pages")]
    public async Task<ActionResult<MonitoredPage>> AddPage(
        [FromBody] AddMonitoredPageRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsFacebookUrl(request.PageUrl)) return BadRequest("Enter a valid HTTPS Facebook page URL.");
        if (!Frequencies.Contains(request.Frequency, StringComparer.Ordinal))
            return BadRequest("Choose a supported monitoring frequency.");
        if (!ScriptFileNamePattern.IsMatch(request.ScriptFileName))
            return BadRequest("The approved scraper script is invalid.");

        var scriptDirectory = ScoutlinePaths.FindRepositoryDirectory(environment.ContentRootPath);
        var scriptPath = Path.Combine(scriptDirectory, request.ScriptFileName);
        if (!System.IO.File.Exists(scriptPath)) return BadRequest("Generate and approve the scraper script first.");
        var script = await System.IO.File.ReadAllTextAsync(scriptPath, cancellationToken);
        var templatePath = Path.Combine(Directory.GetParent(scriptDirectory)!.FullName, "scrape-facebook.mjs");
        var template = await System.IO.File.ReadAllTextAsync(templatePath, cancellationToken);
        if (!string.Equals(script, ScoutlinePaths.BuildScript(template, request.PageUrl, request.PostsPerRun), StringComparison.Ordinal))
            return BadRequest("The script does not match the approved page URL and settings.");

        var now = DateTimeOffset.UtcNow;
        var page = new MonitoredPage
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = string.IsNullOrWhiteSpace(request.Name) ? new Uri(request.PageUrl).AbsolutePath.Trim('/').Split('/').LastOrDefault() ?? "Facebook page" : request.Name.Trim(),
            PageUrl = request.PageUrl,
            ScriptFileName = request.ScriptFileName,
            Frequency = request.Frequency,
            PostsPerRun = request.PostsPerRun,
            IncludeImages = request.IncludeImages,
            Tags = request.Tags.Where(tag => !string.IsNullOrWhiteSpace(tag)).Select(tag => tag.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
            NextRunAt = now,
            InitialPreviewPending = true,
        };
        store.AddPage(page);
        return Ok(page);
    }

    [HttpPost("pages/{id}/preview")]
    public ActionResult<MonitoredPage> PublishInitialPreview(
        string id,
        [FromBody] ScraperSnapshotData snapshot)
    {
        var page = store.GetPages().FirstOrDefault(existing => existing.Id == id);
        if (page is null) return NotFound();
        if (snapshot.ScrapedAt == default || snapshot.Posts.Count > page.PostsPerRun)
            return BadRequest("The preview snapshot is invalid for this page.");

        var updatedPage = store.CompleteInitialPreview(id, snapshot.Posts, snapshot.ScrapedAt);
        return updatedPage is null ? NotFound() : Ok(updatedPage);
    }

    [HttpPatch("pages/{id}")]
    public async Task<ActionResult<MonitoredPage>> UpdatePage(string id, [FromBody] UpdateMonitoredPageRequest request)
    {
        if (request.Frequency is not null && !Frequencies.Contains(request.Frequency, StringComparer.Ordinal))
            return BadRequest("Choose a supported monitoring frequency.");
        if (request.PostsPerRun is < 1 or > 10) return BadRequest("Posts per run must be between 1 and 10.");

        var currentPage = store.GetPages().FirstOrDefault(existing => existing.Id == id);
        if (currentPage is null) return NotFound();
        if (request.PostsPerRun is int postsPerRun && postsPerRun != currentPage.PostsPerRun)
        {
            var scriptsDirectory = ScoutlinePaths.FindRepositoryDirectory(environment.ContentRootPath);
            var scriptPath = Path.Combine(scriptsDirectory, currentPage.ScriptFileName);
            if (!System.IO.File.Exists(scriptPath)) return BadRequest("The approved scraper script could not be found.");
            var templatePath = Path.Combine(Directory.GetParent(scriptsDirectory)!.FullName, "scrape-facebook.mjs");
            var template = await System.IO.File.ReadAllTextAsync(templatePath);
            var script = await System.IO.File.ReadAllTextAsync(scriptPath);
            if (!string.Equals(script, ScoutlinePaths.BuildScript(template, currentPage.PageUrl, currentPage.PostsPerRun), StringComparison.Ordinal))
                return BadRequest("The approved scraper script failed validation.");
            await System.IO.File.WriteAllTextAsync(
                scriptPath,
                ScoutlinePaths.BuildScript(template, currentPage.PageUrl, postsPerRun));
        }

        var now = DateTimeOffset.UtcNow;
        var page = store.UpdatePage(id, existing =>
        {
            var frequency = request.Frequency ?? existing.Frequency;
            var paused = request.Paused ?? existing.Paused;
            var scheduleChanged = frequency != existing.Frequency || paused != existing.Paused && !paused;
            return existing with
            {
                Frequency = frequency,
                PostsPerRun = request.PostsPerRun ?? existing.PostsPerRun,
                IncludeImages = request.IncludeImages ?? existing.IncludeImages,
                Tags = request.Tags is null ? existing.Tags : request.Tags.Where(tag => !string.IsNullOrWhiteSpace(tag)).Select(tag => tag.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList(),
                Paused = paused,
                NextRunAt = scheduleChanged && !paused ? now : existing.NextRunAt,
            };
        });
        return page is null ? NotFound() : Ok(page);
    }

    [HttpDelete("pages/{id}")]
    public IActionResult RemovePage(string id)
    {
        var page = store.GetPages().FirstOrDefault(existing => existing.Id == id);
        if (page is null) return NotFound();
        if (!ScriptFileNamePattern.IsMatch(page.ScriptFileName))
            return BadRequest("The page has an invalid generated scraper file name.");

        var scriptDirectory = Path.GetFullPath(
            ScoutlinePaths.FindRepositoryDirectory(environment.ContentRootPath));
        var scriptPath = Path.GetFullPath(Path.Combine(scriptDirectory, page.ScriptFileName));
        var scriptDirectoryPrefix = scriptDirectory.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        if (!scriptPath.StartsWith(scriptDirectoryPrefix, StringComparison.OrdinalIgnoreCase))
            return BadRequest("The generated scraper file is outside the repository directory.");

        try
        {
            if (System.IO.File.Exists(scriptPath)) System.IO.File.Delete(scriptPath);
        }
        catch (IOException)
        {
            return Problem("Could not remove the page's generated scraper file.");
        }
        catch (UnauthorizedAccessException)
        {
            return Problem("Permission was denied while removing the page's generated scraper file.");
        }

        return store.RemovePage(id) ? NoContent() : NotFound();
    }

    [HttpGet("feed")]
    public ActionResult<IReadOnlyList<MonitoredPost>> GetFeed() => Ok(store.GetPosts());

    private static bool IsFacebookUrl(string value) =>
        Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps && string.IsNullOrEmpty(uri.UserInfo) &&
        (uri.Host.Equals("facebook.com", StringComparison.OrdinalIgnoreCase) ||
         uri.Host.EndsWith(".facebook.com", StringComparison.OrdinalIgnoreCase));
}

public sealed class AddMonitoredPageRequest
{
    [Required, StringLength(2048)] public string PageUrl { get; init; } = string.Empty;
    [StringLength(120)] public string Name { get; init; } = string.Empty;
    [Required] public string ScriptFileName { get; init; } = string.Empty;
    [Required] public string Frequency { get; init; } = string.Empty;
    [Range(1, 10)] public int PostsPerRun { get; init; }
    public bool IncludeImages { get; init; }
    public List<string> Tags { get; init; } = [];
}

public sealed class UpdateMonitoredPageRequest
{
    public string? Frequency { get; init; }
    public int? PostsPerRun { get; init; }
    public bool? IncludeImages { get; init; }
    public List<string>? Tags { get; init; }
    public bool? Paused { get; init; }
}