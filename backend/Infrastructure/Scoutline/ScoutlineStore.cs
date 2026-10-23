using System.Diagnostics;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Template.Api.Infrastructure.Scoutline;

public sealed record MonitoredPage
{
    public string Id { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public string PageUrl { get; init; } = string.Empty;
    public string ScriptFileName { get; init; } = string.Empty;
    public string Frequency { get; init; } = "15 min";
    public int PostsPerRun { get; init; } = 3;
    public bool IncludeImages { get; init; } = true;
    public List<string> Tags { get; init; } = [];
    public bool Paused { get; init; }
    public bool InitialPreviewPending { get; init; }
    public bool IsRunning { get; init; }
    public DateTimeOffset? LastChecked { get; init; }
    public DateTimeOffset NextRunAt { get; init; } = DateTimeOffset.UtcNow;
    public string? LastError { get; init; }
}

public sealed record MonitoredPost
{
    public string Id { get; init; } = string.Empty;
    public string PageId { get; init; } = string.Empty;
    public string Source { get; init; } = string.Empty;
    public string? Url { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public List<ScrapedMedia> Media { get; init; } = [];
    public DateTimeOffset CreatedAt { get; init; }
    public List<string> Tags { get; init; } = [];
}

public sealed record ScrapedMedia
{
    public string Type { get; init; } = "image";
    public string? Url { get; init; }
    public string? Poster { get; init; }
}

public sealed class ScoutlineStore
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly object gate = new();
    private readonly string statePath;
    private StoreState state;

    public ScoutlineStore(IWebHostEnvironment environment)
    {
        var dataDirectory = Path.Combine(environment.ContentRootPath, "App_Data");
        Directory.CreateDirectory(dataDirectory);
        statePath = Path.Combine(dataDirectory, "scoutline-state.json");
        state = System.IO.File.Exists(statePath)
            ? JsonSerializer.Deserialize<StoreState>(System.IO.File.ReadAllText(statePath), JsonOptions) ?? new()
            : new();
        // A process restart should not leave jobs marked as running forever.
        state.Pages = state.Pages.Select(page => page with { IsRunning = false }).ToList();
    }

    public IReadOnlyList<MonitoredPage> GetPages()
    {
        lock (gate) return state.Pages.OrderBy(page => page.Name).ToArray();
    }

    public IReadOnlyList<MonitoredPost> GetPosts()
    {
        lock (gate) return state.Posts.OrderByDescending(post => post.CreatedAt).ToArray();
    }

    public MonitoredPage AddPage(MonitoredPage page)
    {
        lock (gate)
        {
            state.Pages.Add(page);
            Save();
            return page;
        }
    }

    public MonitoredPage? UpdatePage(string id, Func<MonitoredPage, MonitoredPage> update)
    {
        lock (gate)
        {
            var index = state.Pages.FindIndex(page => page.Id == id);
            if (index < 0) return null;
            state.Pages[index] = update(state.Pages[index]);
            Save();
            return state.Pages[index];
        }
    }

    public bool RemovePage(string id)
    {
        lock (gate)
        {
            var removed = state.Pages.RemoveAll(page => page.Id == id) > 0;
            if (removed)
            {
                state.Posts.RemoveAll(post => post.PageId == id);
                Save();
            }
            return removed;
        }
    }

    public MonitoredPage? TakeDuePage(DateTimeOffset now)
    {
        lock (gate)
        {
            var index = state.Pages.FindIndex(page =>
                !page.Paused && !page.InitialPreviewPending && !page.IsRunning && page.NextRunAt <= now);
            if (index < 0) return null;
            state.Pages[index] = state.Pages[index] with { IsRunning = true };
            Save();
            return state.Pages[index];
        }
    }

    public void CompleteRun(string pageId, IEnumerable<ScrapedPostData> posts, DateTimeOffset scrapedAt)
    {
        lock (gate)
        {
            var index = state.Pages.FindIndex(page => page.Id == pageId);
            if (index < 0) return;
            var page = state.Pages[index];
            AddFeedPosts(page, posts, scrapedAt);
            state.Pages[index] = page with
            {
                IsRunning = false,
                LastChecked = scrapedAt,
                NextRunAt = scrapedAt.Add(FrequencyInterval(page.Frequency)),
                LastError = null,
            };
            Save();
        }
    }

    public MonitoredPage? CompleteInitialPreview(
        string pageId,
        IEnumerable<ScrapedPostData> posts,
        DateTimeOffset scrapedAt)
    {
        lock (gate)
        {
            var index = state.Pages.FindIndex(page => page.Id == pageId);
            if (index < 0) return null;
            var page = state.Pages[index];
            if (!page.InitialPreviewPending)
            {
                Save();
                return page;
            }
            AddFeedPosts(page, posts, scrapedAt);
            state.Pages[index] = page with
            {
                InitialPreviewPending = false,
                LastChecked = scrapedAt,
                NextRunAt = scrapedAt.Add(FrequencyInterval(page.Frequency)),
                LastError = null,
            };
            Save();
            return state.Pages[index];
        }
    }

    public void FailRun(string pageId, string message, DateTimeOffset failedAt)
    {
        lock (gate)
        {
            var index = state.Pages.FindIndex(page => page.Id == pageId);
            if (index < 0) return;
            var page = state.Pages[index];
            state.Pages[index] = page with
            {
                IsRunning = false,
                LastChecked = failedAt,
                NextRunAt = failedAt.Add(FrequencyInterval(page.Frequency)),
                LastError = message,
            };
            Save();
        }
    }

    public static TimeSpan FrequencyInterval(string frequency) => frequency switch
    {
        "5 min" => TimeSpan.FromMinutes(5),
        "15 min" => TimeSpan.FromMinutes(15),
        "Hourly" => TimeSpan.FromHours(1),
        "Daily" => TimeSpan.FromDays(1),
        _ => throw new ArgumentOutOfRangeException(nameof(frequency)),
    };

    private void Save()
    {
        var temporaryPath = statePath + ".tmp";
        System.IO.File.WriteAllText(temporaryPath, JsonSerializer.Serialize(state, JsonOptions));
        System.IO.File.Move(temporaryPath, statePath, overwrite: true);
    }

    private void AddFeedPosts(
        MonitoredPage page,
        IEnumerable<ScrapedPostData> posts,
        DateTimeOffset scrapedAt)
    {
        foreach (var post in posts)
        {
            var uniqueValue = post.Url ?? post.Description.Trim();
            if (string.IsNullOrWhiteSpace(uniqueValue)) continue;
            var id = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes($"{page.Id}:{uniqueValue}")));
            if (state.Posts.Any(existing => existing.Id == id)) continue;
            state.Posts.Add(new MonitoredPost
            {
                Id = id,
                PageId = page.Id,
                Source = page.Name,
                Url = post.Url,
                Title = post.Title,
                Description = post.Description,
                Media = page.IncludeImages ? post.Media : [],
                CreatedAt = scrapedAt,
                Tags = [.. page.Tags],
            });
        }
    }

    private sealed class StoreState
    {
        public List<MonitoredPage> Pages { get; set; } = [];
        public List<MonitoredPost> Posts { get; set; } = [];
    }
}

public sealed class ScrapeScheduler(
    ScoutlineStore store,
    IConfiguration configuration,
    IWebHostEnvironment environment,
    ILogger<ScrapeScheduler> logger) : BackgroundService
{
    private static readonly Regex ScriptFileNamePattern = new(
        @"^scrape-[a-z0-9-]+-[a-f0-9]{12}\.mjs$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                MonitoredPage? page;
                while ((page = store.TakeDuePage(DateTimeOffset.UtcNow)) is not null)
                {
                    try
                    {
                        var snapshot = await RunScriptAsync(page, stoppingToken);
                        store.CompleteRun(page.Id, snapshot.Posts, snapshot.ScrapedAt);
                        logger.LogInformation("Scraped {Count} posts for {PageName}", snapshot.Posts.Count, page.Name);
                    }
                    catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                    {
                        store.FailRun(page.Id, "The monitoring service stopped during this run.", DateTimeOffset.UtcNow);
                        return;
                    }
                    catch (Exception exception)
                    {
                        logger.LogWarning(exception, "Scheduled scrape failed for {PageName}", page.Name);
                        store.FailRun(page.Id, exception.Message, DateTimeOffset.UtcNow);
                    }
                }
                await timer.WaitForNextTickAsync(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
        }
    }

    private async Task<ScraperSnapshotData> RunScriptAsync(MonitoredPage page, CancellationToken stoppingToken)
    {
        if (!ScriptFileNamePattern.IsMatch(page.ScriptFileName))
            throw new InvalidOperationException("The approved scraper script is missing or invalid.");

        var scriptDirectory = ScoutlinePaths.FindRepositoryDirectory(environment.ContentRootPath);
        var scriptPath = Path.Combine(scriptDirectory, page.ScriptFileName);
        if (!System.IO.File.Exists(scriptPath))
            throw new FileNotFoundException("The approved scraper script was not found.");

        var script = await System.IO.File.ReadAllTextAsync(scriptPath, stoppingToken);
        var templatePath = Path.Combine(Directory.GetParent(scriptDirectory)!.FullName, "scrape-facebook.mjs");
        var template = await System.IO.File.ReadAllTextAsync(templatePath, stoppingToken);
        var expected = ScoutlinePaths.BuildScript(template, page.PageUrl, page.PostsPerRun);
        if (!string.Equals(script, expected, StringComparison.Ordinal))
            throw new InvalidOperationException("The saved script no longer matches its approved page settings.");

        var outputDirectory = Path.Combine(Path.GetTempPath(), "scoutline", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(outputDirectory);
        var outputPath = Path.Combine(outputDirectory, "posts.json");
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
        };
        process.StartInfo.ArgumentList.Add(scriptPath);
        process.StartInfo.Environment["SCRAPER_OUTPUT_DIR"] = outputDirectory;
        process.StartInfo.Environment["SCRAPER_OUTPUT_FILE"] = outputPath;

        try
        {
            process.Start();
            var stdoutTask = process.StandardOutput.ReadToEndAsync(stoppingToken);
            var stderrTask = process.StandardError.ReadToEndAsync(stoppingToken);
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(stoppingToken);
            timeout.CancelAfter(TimeSpan.FromMinutes(2));
            await process.WaitForExitAsync(timeout.Token);
            var stderr = await stderrTask;
            _ = await stdoutTask;
            if (process.ExitCode != 0)
                throw new InvalidOperationException(string.IsNullOrWhiteSpace(stderr)
                    ? "The scraper did not complete successfully."
                    : stderr.Trim());
            if (!System.IO.File.Exists(outputPath))
                throw new InvalidOperationException("The scraper completed without producing a post snapshot.");

            await using var stream = System.IO.File.OpenRead(outputPath);
            return await JsonSerializer.DeserializeAsync<ScraperSnapshotData>(
                       stream, new JsonSerializerOptions(JsonSerializerDefaults.Web), stoppingToken)
                   ?? throw new InvalidOperationException("The scraper returned an invalid snapshot.");
        }
        catch (OperationCanceledException)
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
            if (stoppingToken.IsCancellationRequested) throw;
            throw new TimeoutException("The scraper exceeded its two-minute limit.");
        }
        catch (System.ComponentModel.Win32Exception)
        {
            throw new InvalidOperationException("Node.js was not found. Install Node.js and frontend dependencies.");
        }
        finally
        {
            try { Directory.Delete(outputDirectory, recursive: true); }
            catch (IOException) { }
        }
    }
}

public sealed class ScraperSnapshotData
{
    public DateTimeOffset ScrapedAt { get; init; } = DateTimeOffset.UtcNow;
    public List<ScrapedPostData> Posts { get; init; } = [];
}

public sealed class ScrapedPostData
{
    public string? Url { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Description { get; init; } = string.Empty;
    public List<ScrapedMedia> Media { get; init; } = [];
}

public static class ScoutlinePaths
{
    public static string FindRepositoryDirectory(string contentRoot)
    {
        var current = new DirectoryInfo(contentRoot);
        while (current is not null)
        {
            var scripts = Path.Combine(current.FullName, "frontend", "agent", "scripts");
            if (System.IO.File.Exists(Path.Combine(scripts, "scrape-facebook.mjs")))
                return Path.Combine(scripts, "repository");
            current = current.Parent;
        }
        throw new InvalidOperationException("Could not find the frontend scraper scripts directory.");
    }

    public static string BuildScript(string template, string pageUrl, int maxPosts)
    {
        var withUrl = Regex.Replace(template, @"const PAGE_URL = .*?;",
            _ => $"const PAGE_URL = {JsonSerializer.Serialize(pageUrl).Replace(";", "\\u003B", StringComparison.Ordinal)};",
            RegexOptions.CultureInvariant);
        return Regex.Replace(withUrl, @"const MAX_POSTS = \d+;",
            _ => $"const MAX_POSTS = {maxPosts};", RegexOptions.CultureInvariant);
    }
}