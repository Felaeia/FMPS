namespace FPMS.Infrastructure.Scoutline;

public sealed class ScoutlineScriptDraftStore
{
    private readonly object gate = new();
    private readonly string draftDirectory;
    private readonly string repositoryDirectory;

    public ScoutlineScriptDraftStore(IWebHostEnvironment environment)
    {
        draftDirectory = Path.Combine(environment.ContentRootPath, "App_Data", "ScriptDrafts");
        repositoryDirectory = ScoutlinePaths.FindRepositoryDirectory(environment.ContentRootPath);
        Directory.CreateDirectory(draftDirectory);
    }

    public string Create(string script)
    {
        lock (gate)
        {
            var draftId = Guid.NewGuid().ToString("N");
            System.IO.File.WriteAllText(GetDraftPath(draftId), script);
            return draftId;
        }
    }

    public string Read(string draftId)
    {
        lock (gate)
        {
            var path = GetDraftPath(draftId);
            if (!System.IO.File.Exists(path))
                throw new FileNotFoundException("The generated script draft has expired or was discarded.");
            return System.IO.File.ReadAllText(path);
        }
    }

    public void Promote(string draftId, string scriptFileName)
    {
        lock (gate)
        {
            var draftPath = GetDraftPath(draftId);
            if (!System.IO.File.Exists(draftPath))
                throw new FileNotFoundException("The generated script draft has expired or was discarded.");
            var destinationPath = Path.GetFullPath(Path.Combine(repositoryDirectory, scriptFileName));
            var repositoryPrefix = Path.GetFullPath(repositoryDirectory).TrimEnd(Path.DirectorySeparatorChar)
                + Path.DirectorySeparatorChar;
            if (!destinationPath.StartsWith(repositoryPrefix, StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("The approved script path is outside the repository directory.");

            Directory.CreateDirectory(repositoryDirectory);
            System.IO.File.Move(draftPath, destinationPath);
        }
    }

    public void RollbackPromotion(string draftId, string scriptFileName)
    {
        lock (gate)
        {
            var draftPath = GetDraftPath(draftId);
            var promotedPath = Path.Combine(repositoryDirectory, scriptFileName);
            if (System.IO.File.Exists(promotedPath) && !System.IO.File.Exists(draftPath))
                System.IO.File.Move(promotedPath, draftPath);
        }
    }

    public bool Delete(string draftId)
    {
        lock (gate)
        {
            var path = GetDraftPath(draftId);
            if (!System.IO.File.Exists(path)) return false;
            System.IO.File.Delete(path);
            return true;
        }
    }

    public int CleanupExpired(TimeSpan maxAge)
    {
        lock (gate)
        {
            var cutoff = DateTime.UtcNow - maxAge;
            var removed = 0;
            foreach (var path in Directory.EnumerateFiles(draftDirectory, "*.mjs"))
            {
                if (System.IO.File.GetLastWriteTimeUtc(path) >= cutoff) continue;
                System.IO.File.Delete(path);
                removed++;
            }
            return removed;
        }
    }

    private string GetDraftPath(string draftId)
    {
        if (!Guid.TryParseExact(draftId, "N", out _))
            throw new ArgumentException("Invalid script draft ID.", nameof(draftId));
        return Path.Combine(draftDirectory, $"{draftId}.mjs");
    }
}